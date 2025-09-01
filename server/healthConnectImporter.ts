import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import yauzl from 'yauzl';
import { storage } from './storage';
import { ComprehensiveFieldMapper } from './comprehensiveFieldMapper';
import { dataFreshnessService, type HealthMetricsFieldMetadata } from './dataFreshnessService';
import { ImportLogger } from './importLogger';
import { type DataSource } from './dataPriorityService';
import { isBeforeToday, convertToEST, getCurrentDateEST } from './timezoneUtils';

/**
 * Health Connect Importer - handles importing health data from Health Connect SQLite databases
 * Uses proven sleep_stages_table methodology for accurate sleep calculations
 */
export class HealthConnectImporter {
  private logger: ImportLogger;

  constructor() {
    this.logger = new ImportLogger('Health Connect');
  }

  /**
   * Get Eastern Time offset in milliseconds (EST/EDT handling)
   */
  private getEasternTimeOffset(utcDate: Date): number {
    // EST is UTC-5, EDT is UTC-4
    // Roughly: DST starts second Sunday in March, ends first Sunday in November
    const year = utcDate.getFullYear();
    const month = utcDate.getMonth(); // 0-based
    
    // Simple DST approximation - between March and November use EDT (-4 hours)
    if (month >= 2 && month <= 10) { // March through November
      return -4 * 60 * 60 * 1000; // EDT: UTC-4
    } else {
      return -5 * 60 * 60 * 1000; // EST: UTC-5
    }
  }
  
  /**
   * Import sleep data from Health Connect database using sleep_stages_table methodology
   * This is the proven approach that calculates accurate nightly totals
   */
  private async importSleepData(db: sqlite3.Database, cutoffDate?: Date): Promise<number> {
    return new Promise((resolve) => {
      console.log('Using sleep_stages_table methodology for accurate sleep calculations');
      
      // Get nightly totals using the proven methodology
      const nightlyTotalsQuery = `
        SELECT 
          date(datetime(stage_start_time / 1000, 'unixepoch', '-4 hours')) AS date_est,
          ROUND(SUM((stage_end_time - stage_start_time) / 1000.0 / 60), 1) AS total_minutes
        FROM sleep_stages_table
        GROUP BY date_est
        ORDER BY date_est DESC
        LIMIT 30
      `;
      
      db.all(nightlyTotalsQuery, async (err, nightlyRows: any[]) => {
        if (err || !nightlyRows) {
          console.log('Sleep stages data not found or error:', err?.message);
          resolve(0);
          return;
        }

        this.logger.logInfo(`Found ${nightlyRows.length} nights of sleep stage data in Health Connect database`);
        console.log(`Found ${nightlyRows.length} nights of sleep stage data`);
        let imported = 0;
        
        // Process each night's sleep data
        for (const nightRow of nightlyRows) {
          try {
            const sleepDate = new Date(nightRow.date_est + 'T00:00:00');
            
            // Skip data on or after cutoff date to prevent partial day overwrites
            // Note: sleepDate is already in EST format from the database query (date_est)
            if (cutoffDate && sleepDate >= cutoffDate) {
              this.logger.logSkip('sleep', nightRow.date_est, `Export-time filtering: Skipping ${nightRow.date_est} (export cutoff protection - prevents partial day overwrites)`);
              console.log(`⏭️ Skipping sleep data for ${nightRow.date_est} (export cutoff protection - EST timezone)`);
              continue;
            }
            
            const totalMinutes = Math.round(nightRow.total_minutes);
            const sleepHours = Math.floor(totalMinutes / 60);
            const sleepMins = totalMinutes % 60;
            const sleepDuration = `${sleepHours}h ${sleepMins}m`;
            
            // Skip meaningless sleep durations
            if (!totalMinutes || totalMinutes <= 0) {
              this.logger.logSkipped('sleep', nightRow.date_est, 'Invalid sleep duration', null, `${totalMinutes} minutes`);
              console.log(`Skipping zero/invalid sleep duration for ${nightRow.date_est}`);
              continue;
            }

            console.log(`Processing sleep for ${nightRow.date_est}: ${totalMinutes} minutes (${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m)`);

            // Use timezone-aware sleep start time for more accurate recorded timestamp
            const sleepStartQuery = `
              SELECT MIN(stage_start_time) as earliest_start
              FROM sleep_stages_table
              WHERE date(datetime(stage_start_time / 1000, 'unixepoch', '-4 hours')) = ?
            `;
            
            const sleepStartResult = await new Promise<any>((startResolve) => {
              db.get(sleepStartQuery, [nightRow.date_est], (startErr, startRow: any) => {
                if (startErr || !startRow) {
                  startResolve({ earliest_start: sleepDate.getTime() });
                } else {
                  startResolve(startRow);
                }
              });
            });

            const actualSleepStartTime = new Date(sleepStartResult.earliest_start);
            
            // Get per-stage breakdown for this night with deduplication and overlap removal
            const stageBreakdownQuery = `
              WITH deduplicated_stages AS (
                -- First remove exact duplicates by keeping only distinct entries
                SELECT DISTINCT
                  stage_type,
                  stage_start_time,
                  stage_end_time,
                  (stage_end_time - stage_start_time) as duration_ms
                FROM sleep_stages_table
                WHERE date(datetime(stage_start_time / 1000, 'unixepoch', '-4 hours')) = ?
              ),
              all_stages AS (
                SELECT 
                  stage_type,
                  stage_start_time,
                  stage_end_time,
                  duration_ms,
                  ROW_NUMBER() OVER (ORDER BY stage_start_time, stage_end_time) as row_num
                FROM deduplicated_stages
              ),
              non_overlapping AS (
                SELECT 
                  a.stage_type,
                  a.stage_start_time,
                  a.stage_end_time,
                  a.duration_ms
                FROM all_stages a
                WHERE NOT EXISTS (
                  -- Remove this period if it overlaps with a longer period
                  SELECT 1 FROM all_stages b 
                  WHERE b.row_num != a.row_num
                    AND (
                      -- Check for any overlap
                      (b.stage_start_time < a.stage_end_time AND b.stage_end_time > a.stage_start_time)
                    )
                    AND b.duration_ms > a.duration_ms  -- Keep the longer period
                )
              )
              SELECT 
                stage_type,
                ROUND(SUM((stage_end_time - stage_start_time) / 1000.0 / 60), 1) AS minutes_in_stage
              FROM non_overlapping
              GROUP BY stage_type
              ORDER BY stage_type
            `;
            
            const stageBreakdown = await new Promise<any[]>((stageResolve) => {
              db.all(stageBreakdownQuery, [nightRow.date_est], (stageErr, stageRows: any[]) => {
                if (stageErr || !stageRows) {
                  console.log('Error getting stage breakdown:', stageErr?.message);
                  stageResolve([]);
                } else {
                  stageResolve(stageRows);
                }
              });
            });

            // Calculate stage totals using the stage_type mapping
            // For the current dataset: stage_type 0 = total sleep time
            // Standard mapping: 1 = awake, 4 = light, 5 = deep, 6 = REM
            let awakeMinutes = 0;
            let lightSleepMinutes = 0;  
            let deepSleepMinutes = 0;
            let remSleepMinutes = 0;
            
            for (const stage of stageBreakdown) {
              const minutes = Math.round(stage.minutes_in_stage);
              switch (stage.stage_type) {
                case 0:
                  // Stage 0 appears to represent total sleep time in current dataset
                  // Without detailed breakdown, estimate sleep stage distribution
                  lightSleepMinutes += Math.round(minutes * 0.55); // ~55% light sleep
                  deepSleepMinutes += Math.round(minutes * 0.25);  // ~25% deep sleep  
                  remSleepMinutes += Math.round(minutes * 0.20);   // ~20% REM sleep
                  console.log(`  Estimated stages from total sleep (${minutes}m): Light=${Math.round(minutes * 0.55)}m, Deep=${Math.round(minutes * 0.25)}m, REM=${Math.round(minutes * 0.20)}m`);
                  break;
                case 1:
                  awakeMinutes += minutes;
                  break;
                case 4:
                  lightSleepMinutes += minutes;
                  break;
                case 5:
                  deepSleepMinutes += minutes;
                  break;
                case 6:
                  remSleepMinutes += minutes;
                  break;
              }
            }

            // Calculate sleep efficiency 
            const totalSleepMinutes = lightSleepMinutes + deepSleepMinutes + remSleepMinutes;
            const totalTimeInBed = totalMinutes;
            const sleepEfficiency = totalTimeInBed > 0 ? Math.round((totalSleepMinutes / totalTimeInBed) * 100) : 85;

            console.log(`  Stage breakdown: Light=${lightSleepMinutes}m, Deep=${deepSleepMinutes}m, REM=${remSleepMinutes}m, Awake=${awakeMinutes}m`);
            console.log(`  Sleep efficiency: ${sleepEfficiency}% (${totalSleepMinutes}/${totalTimeInBed})`);

            // Get existing health metrics to preserve other fields and check values
            const existingMetrics = await storage.getHealthMetricsForDate('default-user', sleepDate);
            
            // Check field-level data freshness with priority system for sleep
            const sleepDecision = await dataFreshnessService.shouldOverwriteFieldWithPriority(
              'default-user',
              'sleepDuration',
              sleepDate,
              totalSleepMinutes,
              'health_connect' as DataSource,
              actualSleepStartTime // Use actual sleep start timestamp
            );
            
            if (!sleepDecision.shouldOverwrite) {
              const existingSleepDuration = existingMetrics?.sleepDuration;
              const existingSleepDisplay = existingSleepDuration ? `${Math.floor(existingSleepDuration/60)}h ${existingSleepDuration%60}m` : 'No existing sleep';
              const newSleepDisplay = `${Math.floor(totalSleepMinutes/60)}h ${totalSleepMinutes%60}m`;
              
              this.logger.logSkipped('sleep', nightRow.date_est, sleepDecision.reason, existingSleepDisplay, newSleepDisplay);
              dataFreshnessService.logImportDecision(sleepDate, 'Health Connect sleep', sleepDecision);
              continue;
            }

            console.log(`🔄 IMPORTING Health Connect sleep for ${nightRow.date_est}: ${Math.floor(totalSleepMinutes/60)}h ${totalSleepMinutes%60}m (recorded: ${actualSleepStartTime.toISOString()})`);
            
            const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};
            
            // Update field metadata for sleep-related fields using actual sleep start time
            const sleepFieldMetadata = dataFreshnessService.createFieldMetadata(actualSleepStartTime, 'health_connect');
            const newFieldMetadata: HealthMetricsFieldMetadata = {
              ...existingFieldMetadata,
              sleepDuration: sleepFieldMetadata,
              sleepEfficiency: sleepFieldMetadata,
              deepSleep: sleepFieldMetadata,
              remSleep: sleepFieldMetadata, 
              lightSleep: sleepFieldMetadata,
              wakeEvents: sleepFieldMetadata
            };

            // Create comprehensive health metrics using the proven totals
            const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
              date: sleepDate.toISOString().split('T')[0],
              sleepDuration: totalSleepMinutes, // FIX: Use actual sleep time, not time in bed
              sleepEfficiency: sleepEfficiency,
              deepSleep: deepSleepMinutes,
              remSleep: remSleepMinutes, 
              lightSleep: lightSleepMinutes,
              wakeEvents: awakeMinutes > 0 ? Math.ceil(awakeMinutes / 15) : 0,
              source: 'health_connect'
            }, 'default-user');
            
            // Add field metadata
            healthMetric.fieldMetadata = newFieldMetadata;

            // Import the sleep record
            await storage.upsertHealthMetrics(healthMetric);
            imported++;
            
            // Build detailed import message similar to RENPHO
            const sleepDetails = [];
            sleepDetails.push(`Duration: ${Math.floor(totalSleepMinutes/60)}h ${totalSleepMinutes%60}m`);
            sleepDetails.push(`Efficiency: ${sleepEfficiency}%`);
            if (lightSleepMinutes > 0) sleepDetails.push(`Light: ${lightSleepMinutes}m`);
            if (deepSleepMinutes > 0) sleepDetails.push(`Deep: ${deepSleepMinutes}m`);
            if (remSleepMinutes > 0) sleepDetails.push(`REM: ${remSleepMinutes}m`);
            if (awakeMinutes > 0) sleepDetails.push(`Awake: ${awakeMinutes}m`);
            
            const sleepDescription = sleepDetails.join(', ');
            const existingSleepDisplay = existingMetrics?.sleepDuration ? `${Math.floor(existingMetrics.sleepDuration/60)}h ${existingMetrics.sleepDuration%60}m` : null;
            this.logger.logImported('sleep', nightRow.date_est, sleepDescription, existingSleepDisplay);
            
            // Also import all granular sleep stage data points
            await this.importGranularSleepStages(db, nightRow.date_est, sleepDate, actualSleepStartTime);
            
            console.log(`✅ Imported sleep data for ${nightRow.date_est}: ${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m`);
            
          } catch (error) {
            console.error('Error processing sleep night:', error);
          }
        }

        this.logger.logInfo(`Sleep import using sleep_stages_table completed: ${imported} records imported from ${nightlyRows.length} nights processed`);
        console.log(`Sleep import using sleep_stages_table completed: ${imported} records`);
        resolve(imported);
      });
    });
  }

  /**
   * Import granular sleep stage data points for a specific night
   */
  private async importGranularSleepStages(db: sqlite3.Database, dateEst: string, sleepDate: Date, sleepStartTime: Date): Promise<void> {
    return new Promise((resolve) => {
      const query = `
        SELECT stage_start_time, stage_end_time, stage_type
        FROM sleep_stages_table
        WHERE date(datetime(stage_start_time / 1000, 'unixepoch', '-4 hours')) = ?
        ORDER BY stage_start_time ASC
      `;
      
      db.all(query, [dateEst], async (err, rows: any[]) => {
        if (err || !rows) {
          console.log(`No granular sleep stages found for ${dateEst}`);
          resolve();
          return;
        }
        
        console.log(`  📊 Storing ${rows.length} granular sleep stage blocks for ${dateEst}`);
        let granularPointsImported = 0;
        
        for (const row of rows) {
          try {
            // Convert UTC timestamps to EST
            const utcStartTime = new Date(row.stage_start_time);
            const utcEndTime = new Date(row.stage_end_time);
            
            const easternOffsetStart = this.getEasternTimeOffset(utcStartTime);
            const easternOffsetEnd = this.getEasternTimeOffset(utcEndTime);
            
            const localStartTime = new Date(utcStartTime.getTime() + easternOffsetStart);
            const localEndTime = new Date(utcEndTime.getTime() + easternOffsetEnd);
            
            // Duration in minutes for this sleep stage block
            const durationMinutes = Math.round((utcEndTime.getTime() - utcStartTime.getTime()) / (1000 * 60));
            
            // Map Health Connect sleep stage numbers to readable names
            // Health Connect uses different stage codes than expected
            const stageNames: Record<number, string> = {
              0: 'sleep', // Total sleep time (appears to be the main stage in current data)
              1: 'awake',
              2: 'rem',
              3: 'light', 
              4: 'deep',
              5: 'light', // Map unknown stage 5 to light sleep for aggregation
              6: 'rem'    // Map unknown stage 6 to REM sleep for aggregation
            };
            
            // Check for existing sleep stage data point to prevent duplicates
            // Use exact start time, end time, and value for duplicate detection (measurement timestamp, not import timestamp)
            const existingPoint = await storage.getHealthDataPointsByDateRange(
              'default-user',
              localStartTime,
              localEndTime,
              'sleep_stages'
            );
            
            // Skip ONLY if exact duplicate exists (same start, end, value, stage type)
            // Multiple sleep stages can legitimately occur at same timestamp with different values
            if (existingPoint.some(p => 
              p.value === durationMinutes && 
              p.startTime.getTime() === localStartTime.getTime() &&
              p.endTime?.getTime() === localEndTime.getTime() &&
              (p.metadata as any)?.stage === row.stage_type.toString()
            )) {
              continue; // Only skip if truly identical sleep stage entry
            }

            await storage.createHealthDataPoint({
              userId: 'default-user',
              dataType: 'sleep_stages', // Match Dashboard query expectation
              startTime: localStartTime, // EST time
              endTime: localEndTime, // EST time
              value: durationMinutes,
              unit: 'minutes',
              sourceApp: 'health_connect',
              metadata: {
                stage: row.stage_type.toString(), // Dashboard expects 'stage' field for processing
                stageType: stageNames[row.stage_type] || 'unknown',
                stageNumber: row.stage_type,
                originalUtcStartTime: utcStartTime.toISOString(),
                originalUtcEndTime: utcEndTime.toISOString(),
                convertedToEst: true,
                sleepNightDate: dateEst
              }
            });
            granularPointsImported++;
            
          } catch (error) {
            console.error(`Error storing sleep stage data point:`, error);
          }
        }
        
        console.log(`  ✅ Stored ${granularPointsImported} granular sleep stage blocks in EST`);
        resolve();
      });
    });
  }

  /**
   * Import steps data from Health Connect database
   */
  private async importStepsData(db: sqlite3.Database, cutoffDate?: Date): Promise<number> {
    return new Promise((resolve) => {
      // Use deduplication query to remove exact duplicates (same timestamp + same count)
      const query = `
        WITH deduplicated_steps AS (
          SELECT DISTINCT start_time, count
          FROM steps_record_table 
          WHERE count > 0
        )
        SELECT start_time, count 
        FROM deduplicated_steps
        ORDER BY start_time DESC 
        LIMIT 500
      `;
      
      db.all(query, async (err, rows: any[]) => {
        if (err || !rows) {
          console.log('Steps data not found or error:', err?.message);
          resolve(0);
          return;
        }

        this.logger.logInfo(`Found ${rows.length} step records in Health Connect database (after removing exact duplicates)`);
        console.log(`Found ${rows.length} step records (after removing exact duplicates)`);
        
        // Store all granular step entries AND create daily aggregates
        const dailySteps = new Map<string, {total: number, recordedAt: Date}>();
        let granularPointsImported = 0;
        
        for (const row of rows) {
          // Skip meaningless step counts
          if (!row.count || row.count <= 0) continue;
          
          // Convert UTC to Eastern Time (EST/EDT) - Health Connect stores in UTC
          const utcStartTime = new Date(row.start_time);
          const easternOffset = this.getEasternTimeOffset(utcStartTime);
          const localStartTime = new Date(utcStartTime.getTime() + easternOffset);
          const dateKey = localStartTime.toISOString().split('T')[0];
          
          // Skip data on or after cutoff date to prevent partial day overwrites
          // Note: dateKey is already in EST format from timezone conversion above
          const dataDate = new Date(dateKey + 'T00:00:00');
          if (cutoffDate && dataDate >= cutoffDate) {
            this.logger.logSkip('steps', dateKey, `Export-time filtering: Skipping steps for ${dateKey} (export cutoff protection - prevents partial day overwrites)`);
            console.log(`⏭️ Skipping steps data for ${dateKey} (export cutoff protection - EST timezone)`);
            continue;
          }
          
          // Check for existing granular data point with same measurement timestamp to prevent duplicates
          const existingPoint = await storage.getHealthDataPointsByDateRange(
            'default-user',
            localStartTime,
            localStartTime,
            'steps'
          );
          
          // Skip ONLY if exact duplicate exists (same timestamp, same step count)
          // Note: Steps are less likely to have legitimate duplicates at same timestamp
          if (existingPoint.some(p => 
            p.value === row.count && 
            p.startTime.getTime() === localStartTime.getTime()
          )) {
            continue; // Skip truly identical step measurement
          }
          
          // Store granular step data point (each individual time block)
          try {
            await storage.createHealthDataPoint({
              userId: 'default-user',
              dataType: 'steps',
              startTime: localStartTime, // EST time
              value: row.count,
              unit: 'count',
              sourceApp: 'health_connect',
              metadata: {
                originalUtcTime: utcStartTime.toISOString(),
                convertedToEst: true,
                easternOffset: easternOffset
              }
            });
            granularPointsImported++;
          } catch (error) {
            console.error(`Error storing granular step data point:`, error);
          }
          
          // Also maintain daily totals for aggregate records
          const existing = dailySteps.get(dateKey);
          if (existing) {
            existing.total += row.count;
            // Keep the latest recorded timestamp for the day
            if (utcStartTime > existing.recordedAt) {
              existing.recordedAt = utcStartTime;
            }
          } else {
            dailySteps.set(dateKey, {total: row.count, recordedAt: utcStartTime});
          }
        }
        
        console.log(`✅ Stored ${granularPointsImported} granular step data points in EST`);

        let imported = 0;
        for (const [date, stepData] of Array.from(dailySteps.entries())) {
          try {
            const healthDate = new Date(date + 'T00:00:00');
            
            // Skip meaningless step counts
            if (!stepData.total || stepData.total <= 0) {
              this.logger.logSkipped('steps', date, 'Zero or invalid step count', null, stepData.total.toString());
              console.log(`Skipping zero steps for ${date}`);
              continue;
            }
            
            // Get existing health metrics to preserve other fields and check values
            const existingMetrics = await storage.getHealthMetricsForDate('default-user', healthDate);
            
            // Check field-level data freshness with priority system for steps
            const decision = await dataFreshnessService.shouldOverwriteFieldWithPriority(
              'default-user',
              'steps',
              healthDate,
              stepData.total,
              'health_connect' as DataSource,
              stepData.recordedAt // Use actual recorded timestamp, not date
            );
            
            if (!decision.shouldOverwrite) {
              this.logger.logSkipped('steps', date, decision.reason, existingMetrics?.steps?.toString() || 'No existing steps', stepData.total.toString());
              dataFreshnessService.logImportDecision(healthDate, 'Health Connect steps', decision);
              continue;
            }

            console.log(`🔄 IMPORTING Health Connect steps for ${date}: ${stepData.total} steps (recorded: ${stepData.recordedAt.toISOString()})`);
            const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};
            
            // Update field metadata for steps using actual recorded timestamp
            const newFieldMetadata: HealthMetricsFieldMetadata = {
              ...existingFieldMetadata,
              steps: dataFreshnessService.createFieldMetadata(stepData.recordedAt, 'health_connect')
            };

            const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
              date,
              steps: stepData.total,
              source: 'health_connect'
            }, 'default-user');
            
            // Ensure user ID is correctly set
            if (!healthMetric.userId) {
              healthMetric.userId = 'default-user';
            }
            
            // Add field metadata
            healthMetric.fieldMetadata = newFieldMetadata;

            await storage.upsertHealthMetrics(healthMetric);
            imported++;
            
            // Log the successful import with details
            this.logger.logImported('steps', date, `${stepData.total} steps`, existingMetrics?.steps?.toString() || null);
            
          } catch (error) {
            this.logger.logError('steps', date, `Error importing steps: ${error instanceof Error ? error.message : String(error)}`);
            console.error('Error importing steps data:', error);
          }
        }

        this.logger.logInfo(`Steps import completed: ${imported} records imported from ${dailySteps.size} daily aggregates, ${granularPointsImported} granular points stored`);
        console.log(`Steps import completed: ${imported} records`);
        resolve(imported);
      });
    });
  }

  /**
   * Import heart rate data from Health Connect database with granular time-blocked storage
   */
  private async importHeartRateData(db: sqlite3.Database, cutoffDate?: Date): Promise<number> {
    return new Promise((resolve) => {
      const query = `
        SELECT epoch_millis, beats_per_minute
        FROM heart_rate_record_series_table
        ORDER BY epoch_millis DESC 
        LIMIT 5000
      `;

      db.all(query, async (err, rows: any[]) => {
        if (err || !rows) {
          console.log('Heart rate data not found or error:', err?.message);
          resolve(0);
          return;
        }

        this.logger.logInfo(`Found ${rows.length} heart rate records in Health Connect database`);
        console.log(`Found ${rows.length} heart rate records`);
        let granularPointsImported = 0;
        const dailyHeartRateData = new Map<string, {
          readings: number[];
          timestamps: Date[];
          minHR: number;
          maxHR: number;
          avgHR: number;
          latestTimestamp: Date;
        }>();
        
        // Store each granular heart rate data point and build daily aggregates
        for (const row of rows) {
          try {
            // Skip meaningless heart rate values
            if (!row.beats_per_minute || row.beats_per_minute <= 0 || row.beats_per_minute > 250) continue;
            
            // Convert UTC to Eastern Time (EST/EDT) - Health Connect stores in UTC
            const utcTimestamp = new Date(row.epoch_millis);
            const easternOffset = this.getEasternTimeOffset(utcTimestamp);
            const localTimestamp = new Date(utcTimestamp.getTime() + easternOffset);
            const dateKey = localTimestamp.toISOString().split('T')[0];
            
            // Skip data on or after cutoff date to prevent partial day overwrites
            // Note: dateKey is already in EST format from timezone conversion above
            const dataDate = new Date(dateKey + 'T00:00:00');
            if (cutoffDate && dataDate >= cutoffDate) {
              this.logger.logSkip('heart_rate', dateKey, `Export-time filtering: Skipping heart rate for ${dateKey} (export cutoff protection - prevents partial day overwrites)`);
              console.log(`⏭️ Skipping heart rate data for ${dateKey} (export cutoff protection - EST timezone)`);
              continue;
            }
            
            // Check for existing heart rate data point to prevent duplicates
            // Use exact measurement timestamp and value for duplicate detection (not import timestamp)
            const existingHRPoint = await storage.getHealthDataPointsByDateRange(
              'default-user',
              localTimestamp,
              localTimestamp,
              'heart_rate'
            );
            
            // Skip ONLY if exact duplicate exists (same timestamp, same heart rate value)
            // Note: Heart rate duplicates are less common but we should still be precise
            if (existingHRPoint.some(p => 
              p.value === row.beats_per_minute && 
              p.startTime.getTime() === localTimestamp.getTime()
            )) {
              continue; // Skip truly identical heart rate measurement
            }

            // Store granular heart rate data point
            await storage.createHealthDataPoint({
              userId: 'default-user',
              dataType: 'heart_rate',
              startTime: localTimestamp, // EST time
              value: row.beats_per_minute,
              unit: 'bpm',
              sourceApp: 'health_connect',
              metadata: {
                originalUtcTime: utcTimestamp.toISOString(),
                convertedToEst: true,
                easternOffset: easternOffset,
                heartRateType: 'measurement'
              }
            });
            granularPointsImported++;
            
            // Build daily aggregates
            const existing = dailyHeartRateData.get(dateKey);
            if (existing) {
              existing.readings.push(row.beats_per_minute);
              existing.timestamps.push(utcTimestamp);
              existing.minHR = Math.min(existing.minHR, row.beats_per_minute);
              existing.maxHR = Math.max(existing.maxHR, row.beats_per_minute);
              if (utcTimestamp > existing.latestTimestamp) {
                existing.latestTimestamp = utcTimestamp;
              }
            } else {
              dailyHeartRateData.set(dateKey, {
                readings: [row.beats_per_minute],
                timestamps: [utcTimestamp],
                minHR: row.beats_per_minute,
                maxHR: row.beats_per_minute,
                avgHR: row.beats_per_minute,
                latestTimestamp: utcTimestamp
              });
            }
            
          } catch (error) {
            console.error('Error importing granular heart rate data:', error);
          }
        }

        console.log(`✅ Stored ${granularPointsImported} granular heart rate data points in EST`);
        
        // Create daily health metrics with heart rate aggregates
        let dailyRecordsImported = 0;
        for (const [dateStr, data] of Array.from(dailyHeartRateData.entries())) {
          try {
            // Calculate resting heart rate (lowest 10% of readings for the day)
            const sortedReadings = data.readings.sort((a: number, b: number) => a - b);
            const restingCount = Math.max(1, Math.floor(sortedReadings.length * 0.1));
            const restingHR = Math.round(sortedReadings.slice(0, restingCount).reduce((sum: number, hr: number) => sum + hr, 0) / restingCount);
            
            // Calculate average heart rate
            const avgHR = Math.round(data.readings.reduce((sum: number, hr: number) => sum + hr, 0) / data.readings.length);
            data.avgHR = avgHR;
            
            const date = new Date(dateStr);
            const existingMetrics = await storage.getHealthMetricsForDate('default-user', date);
            const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};

            // Create field metadata for heart rate fields using the latest recording time
            const heartRateFieldMetadata = dataFreshnessService.createFieldMetadata(data.latestTimestamp, 'health_connect');
            const newFieldMetadata: HealthMetricsFieldMetadata = {
              ...existingFieldMetadata,
              restingHeartRate: heartRateFieldMetadata,
              averageHeartRate: heartRateFieldMetadata,
              maxHeartRate: heartRateFieldMetadata
            };

            // Create health metrics with heart rate data
            const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
              date: dateStr,
              restingHeartRate: restingHR,
              averageHeartRate: avgHR,
              maxHeartRate: data.maxHR,
              source: 'health_connect'
            }, 'default-user');

            healthMetric.fieldMetadata = newFieldMetadata;
            
            await storage.upsertHealthMetrics(healthMetric);
            dailyRecordsImported++;
            
            console.log(`✅ Imported heart rate for ${dateStr}: RHR ${restingHR}, Avg ${avgHR}, Max ${data.maxHR} bpm (${data.readings.length} readings)`);
          } catch (error) {
            console.error(`Error creating daily heart rate record for ${dateStr}:`, error);
          }
        }

        console.log(`Heart rate import completed: ${granularPointsImported} granular points, ${dailyRecordsImported} daily records`);
        resolve(granularPointsImported + dailyRecordsImported);
      });
    });
  }

  /**
   * Convert UTC time to local timezone
   */
  private convertUTCToLocalTime(utcDate: Date): Date {
    // EST/EDT conversion (UTC-5 or UTC-4)
    const offsetHours = 4; // EDT offset
    return new Date(utcDate.getTime() - (offsetHours * 60 * 60 * 1000));
  }

  /**
   * Check if date is valid for import (not today)
   */
  private isValidImportDate(date: Date | string): boolean {
    const importDate = new Date(date);
    return isBeforeToday(importDate);
  }

  /**
   * Import comprehensive health data from Health Connect database
   */
  async importFromDatabase(dbPath: string, cutoffDate?: Date): Promise<{
    success: boolean;
    recordsImported: number;
    sleepRecords: number;
    stepsRecords: number;
    heartRateRecords: number;
  }> {
    return new Promise((resolve, reject) => {
      // Reset logger for each database import
      this.logger = new ImportLogger('Health Connect');
      
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          this.logger.logError('database', 'N/A', `Failed to open Health Connect database: ${err.message}`);
          reject(err);
          return;
        }
      });

      this.logger.logInfo(`Starting Health Connect database import from ${path.basename(dbPath)}`);

      Promise.all([
        this.importSleepData(db, cutoffDate),
        this.importStepsData(db, cutoffDate), 
        this.importHeartRateData(db, cutoffDate)
      ]).then(async ([sleepRecords, stepsRecords, heartRateRecords]) => {
        db.close();
        const totalRecords = sleepRecords + stepsRecords + heartRateRecords;
        
        // Create comprehensive summary like RENPHO
        const dataBreakdown = [];
        if (sleepRecords > 0) dataBreakdown.push(`Sleep: ${sleepRecords} nights`);
        if (stepsRecords > 0) dataBreakdown.push(`Steps: ${stepsRecords} days`);
        if (heartRateRecords > 0) dataBreakdown.push(`Heart Rate: ${heartRateRecords} days`);
        
        if (totalRecords > 0) {
          this.logger.logInfo(`Health Connect import completed successfully: ${dataBreakdown.join(', ')} | Total: ${totalRecords} records`);
        } else {
          this.logger.logInfo('Health Connect import completed: No new records imported (data protected by freshness/priority system)');
        }
        
        // Save detailed logs to database
        try {
          await this.logger.saveToDB();
        } catch (logError) {
          console.error('Error saving import logs:', logError);
        }
        
        resolve({
          success: true, // Always successful if no errors occurred
          recordsImported: totalRecords,
          sleepRecords,
          stepsRecords,
          heartRateRecords
        });
      }).catch(async (error) => {
        db.close();
        console.error('Health Connect import error details:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
        this.logger.logError('import', 'N/A', `Health Connect import failed: ${error instanceof Error ? error.message : String(error)}`);
        
        // Save error logs to database
        try {
          await this.logger.saveToDB();
        } catch (logError) {
          console.error('Error saving error logs:', logError);
        }
        
        reject(error);
      });
    });
  }

  /**
   * Extract and import from Health Connect ZIP file
   */
  /**
   * Import from a database buffer (direct .db file upload)
   */
  async importFromDatabaseBuffer(buffer: Buffer): Promise<{
    sleepRecords: number;
    stepsRecords: number; 
    heartRateRecords: number;
  }> {
    return new Promise(async (resolve, reject) => {
      const tempDir = '/tmp';
      const tempDbPath = path.join(tempDir, `health_connect_${Date.now()}.db`);
      
      try {
        // Write buffer to temporary file
        fs.writeFileSync(tempDbPath, buffer);
        
        // Import from the temporary database file (no cutoff date for direct database uploads)
        const result = await this.importFromDatabase(tempDbPath);
        
        // Cleanup temporary file
        try {
          if (fs.existsSync(tempDbPath)) {
            fs.unlinkSync(tempDbPath);
          }
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
        
        resolve(result);
      } catch (error) {
        // Cleanup on error
        try {
          if (fs.existsSync(tempDbPath)) {
            fs.unlinkSync(tempDbPath);
          }
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
        reject(error);
      }
    });
  }

  async importFromZipFile(zipPath: string | Buffer): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let zipPathStr: string;
      let tempFile = false;
      let zipCreationDate: Date | null = null;
      
      // Handle Buffer input by creating a temporary file
      if (zipPath instanceof Buffer) {
        const tempDir = '/tmp';
        zipPathStr = path.join(tempDir, `health_connect_${Date.now()}.zip`);
        try {
          fs.writeFileSync(zipPathStr, zipPath);
          tempFile = true;
          // For uploaded files, use current time as creation time
          zipCreationDate = new Date();
        } catch (error) {
          reject(new Error(`Failed to create temporary file: ${error}`));
          return;
        }
      } else {
        zipPathStr = zipPath;
        // Get file creation/modification time for existing files
        try {
          const stats = fs.statSync(zipPathStr);
          zipCreationDate = stats.mtime; // Use modification time as proxy for creation
        } catch (error) {
          console.error('Could not get ZIP file timestamp:', error);
          zipCreationDate = new Date(); // Fallback to current time
        }
      }
      
      const extractDir = path.join(path.dirname(zipPathStr), 'health_connect_extracted');
      
      // Calculate cutoff date for safe imports using EST timezone (only import data from days before the export)
      const zipCreationEST = convertToEST(zipCreationDate);
      const cutoffDate = new Date(zipCreationEST);
      cutoffDate.setHours(0, 0, 0, 0); // Start of the export day in EST
      
      // Also get current EST date for comparison logging
      const currentEST = getCurrentDateEST();
      
      console.log(`📅 ZIP export timestamp (original): ${zipCreationDate.toISOString()}`);
      console.log(`📅 ZIP export timestamp (EST): ${zipCreationEST.toISOString()}`);
      console.log(`📅 Current date (EST): ${currentEST.toISOString()}`);
      console.log(`📅 Data cutoff: Only importing data before ${cutoffDate.toISOString().split('T')[0]} EST to avoid partial day overwrites`);
      
      yauzl.open(zipPathStr, { lazyEntries: true }, (err, zipFile) => {
        if (err) {
          reject(err);
          return;
        }

        if (!fs.existsSync(extractDir)) {
          fs.mkdirSync(extractDir, { recursive: true });
        }

        const dbFiles: string[] = [];
        
        zipFile!.readEntry();
        zipFile!.on('entry', (entry) => {
          if (/\.db$/.test(entry.fileName)) {
            const entryPath = path.join(extractDir, path.basename(entry.fileName));
            
            zipFile!.openReadStream(entry, (err, readStream) => {
              if (err) {
                console.error('Error reading ZIP entry:', err);
                zipFile!.readEntry();
                return;
              }
              
              const writeStream = fs.createWriteStream(entryPath);
              readStream!.pipe(writeStream);
              writeStream.on('close', () => {
                dbFiles.push(entryPath);
                zipFile!.readEntry();
              });
            });
          } else {
            zipFile!.readEntry();
          }
        });

        zipFile!.on('end', async () => {
          try {
            const results = [];
            let totalRecordsImported = 0;
            let hasErrors = false;
            
            for (const dbPath of dbFiles) {
              console.log(`Processing Health Connect database: ${dbPath}`);
              const result = await this.importFromDatabase(dbPath, cutoffDate);
              results.push(result);
              if (result.success) {
                totalRecordsImported += result.recordsImported || 0;
              } else {
                hasErrors = true;
              }
            }
            
            // Cleanup extracted files and temp zip if created
            try {
              if (fs.existsSync(extractDir)) {
                fs.rmSync(extractDir, { recursive: true, force: true });
              }
              if (tempFile && fs.existsSync(zipPathStr)) {
                fs.unlinkSync(zipPathStr);
              }
            } catch (cleanupError) {
              console.error('Cleanup error:', cleanupError);
            }

            // Return aggregated result
            resolve({
              success: !hasErrors, // Success if no errors, regardless of records imported
              recordsImported: totalRecordsImported,
              results: results,
              message: `Processed ${results.length} database files, imported ${totalRecordsImported} total records`
            });
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  }
}