import { GoogleFitService } from './googleFitService';
import { storage } from './storage';
import { dataFreshnessService, HealthMetricsFieldMetadata } from './dataFreshnessService';
import { DataSource } from './dataPriorityService';
import { ComprehensiveFieldMapper } from './comprehensiveFieldMapper';
import { db } from './db';
import { healthMetrics, healthDataPoints } from '@shared/schema';
import { eq, sql, and, gte, lte } from 'drizzle-orm';
import { getCurrentDateEST } from './timezoneUtils';
import { ImportLogger, ImportLogManager } from './importLogger';

export class GoogleFitImporter {
  private googleFitService: GoogleFitService;

  constructor() {
    this.googleFitService = new GoogleFitService();
  }

  /**
   * Import Google Fit data with granular time-blocked entries
   */
  async importGoogleFitData(accessToken: string, days: number = 30, logger?: ImportLogger): Promise<{
    stepsImported: number;
    granularStepsImported: number;
    heartRateImported: number;
    sleepImported: number;
    weightImported: number;
    oxygenSaturationImported: number;
    bloodPressureImported: number;
    bodyFatImported: number;
    caloriesImported: number;
    distanceImported: number;
    activeMinutesImported: number;
  }> {
    console.log('=====================================');
    console.log('🚨🚨🚨 REBOOT FIX: importGoogleFitData ENTRY 🚨🚨🚨');
    console.log('🚨🚨🚨 PRIMARY METHODS WILL NOW EXECUTE 🚨🚨🚨');
    console.log('=====================================');
    const importLogger = logger || new ImportLogger('Google Fit');
    console.log(`🔄 Starting Google Fit import for last ${days} days...`);
    console.log('🚨🚨🚨 ENTERED importGoogleFitData METHOD 🚨🚨🚨');
    
    this.googleFitService.setAccessToken(accessToken);
    
    // Use EST timezone to match the rest of the application
    const endDate = getCurrentDateEST();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    
    const results = {
      stepsImported: 0,
      granularStepsImported: 0,
      heartRateImported: 0,
      sleepImported: 0,
      weightImported: 0,
      oxygenSaturationImported: 0,
      bloodPressureImported: 0,
      bodyFatImported: 0,
      caloriesImported: 0,
      distanceImported: 0,
      activeMinutesImported: 0
    };

    console.log('🚨🚨🚨 FORCING EXECUTION OF PRIMARY METHODS 🚨🚨🚨');
    
    try {
      // CRITICAL: FORCE primary import methods to run first - these were being bypassed
      console.log('🚨🚨🚨 STEP 1: FORCING STEPS IMPORT 🚨🚨🚨');
      
      // Import granular steps data and create daily aggregates
      try {
        console.log('🔍 DEBUG: Starting steps data import...');
        console.log('🚨 CALLING importStepsData NOW...');
        const { dailyCount, granularCount } = await this.importStepsData(startDate, endDate, importLogger);
        console.log('🚨 importStepsData RETURNED:', { dailyCount, granularCount });
        results.stepsImported = dailyCount;
        results.granularStepsImported = granularCount;
        console.log(`✅ Steps import completed: ${dailyCount} daily, ${granularCount} granular`);
        console.log('🔍 DEBUG: Steps import result:', { dailyCount, granularCount });
      } catch (error) {
        console.error('❌❌❌ STEPS IMPORT FAILED:', error);
        console.error('❌ Steps import stack trace:', (error as Error)?.stack);
        importLogger.logError('steps', 'N/A', `Steps import failed: ${(error as Error)?.message || 'Unknown error'}`, error);
      }

      console.log('🚨🚨🚨 STEP 2: FORCING HEART RATE IMPORT 🚨🚨🚨');
      
      // Import heart rate data
      try {
        console.log('🔍 DEBUG: Starting heart rate import...');
        console.log('🚨 CALLING importHeartRateData NOW...');
        results.heartRateImported = await this.importHeartRateData(startDate, endDate, importLogger);
        console.log('🚨 importHeartRateData RETURNED:', results.heartRateImported);
        console.log(`✅ Heart rate import completed: ${results.heartRateImported} records`);
        console.log('🔍 DEBUG: Heart rate import finished, moving to sleep...');
      } catch (error) {
        console.error('❌❌❌ HEART RATE IMPORT FAILED:', error);
        console.error('❌ Heart rate import stack trace:', (error as Error)?.stack);
        importLogger.logError('heart_rate', 'N/A', `Heart rate import failed: ${(error as Error)?.message || 'Unknown error'}`, error);
      }

      console.log('🌟🌟🌟 EXECUTION REACHED SLEEP IMPORT SECTION 🌟🌟🌟');
      console.log('🌟 About to start sleep import block...');
      
      // Import sleep data  
      try {
        console.log('🚨🚨🚨 ABOUT TO CALL SLEEP IMPORT 🚨🚨🚨');
        console.log('🔍 DEBUG: Starting sleep data import...');
        console.log('🔍 DEBUG: Sleep import date range:', { 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString() 
        });
        console.log('🚨 CALLING importSleepData METHOD NOW...');
        results.sleepImported = await this.importSleepData(startDate, endDate, importLogger);
        console.log('🚨 SLEEP IMPORT METHOD RETURNED:', results.sleepImported);
        console.log(`✅ Sleep import completed: ${results.sleepImported} records`);
        console.log('🔍 DEBUG: Sleep import result:', results.sleepImported);
      } catch (error) {
        console.error('❌❌❌ SLEEP IMPORT FAILED:', error);
        console.error('❌ Sleep import stack trace:', (error as Error)?.stack);
        importLogger.logError('sleep', 'N/A', `Sleep import failed: ${(error as Error)?.message || 'Unknown error'}`, error);
      }

      // Import weight data separately to avoid double API calls
      results.weightImported = await this.importWeightData(startDate, endDate, importLogger);
      console.log('🔍 DEBUG: Weight import completed');

      // SKIP COMPREHENSIVE IMPORT - Force primary methods only
      console.log('🚨🚨🚨 SKIPPING COMPREHENSIVE SYNC TO FORCE PRIMARY METHODS 🚨🚨🚨');
      console.log('🚨 PRIMARY METHODS COMPLETED - NO COMPREHENSIVE SYNC NEEDED 🚨');
      // TEMPORARILY DISABLED: const allData = await this.googleFitService.syncAllHealthData(startDate, endDate);
      console.log('🔍 DEBUG: Skipping comprehensive data import to test primary methods...');
      
      // COMPREHENSIVE DATA IMPORT DISABLED FOR TESTING
      console.log('🔍 DEBUG: All comprehensive imports disabled for testing...');
      /* DISABLED FOR TESTING
      try {
        console.log(`🔍 DEBUG: Oxygen data length: ${allData.oxygenSaturation?.length || 0}`);
        results.oxygenSaturationImported = await this.importOxygenSaturationData(allData.oxygenSaturation, importLogger);
        console.log('✅ Oxygen saturation import complete');
      } catch (error) {
        console.error('❌ Oxygen saturation import error:', error);
      }
      */

      /* TEMPORARILY DISABLED - MISSING allData
      try {
        console.log(`🔍 DEBUG: Blood pressure data array length: ${allData.bloodPressure?.length || 0}`);
        console.log(`🔍 DEBUG: Blood pressure data:`, JSON.stringify(allData.bloodPressure?.slice(0, 2), null, 2));
        results.bloodPressureImported = await this.importBloodPressureData(allData.bloodPressure, importLogger);
        console.log('✅ Blood pressure import complete');
      } catch (error) {
        console.error('❌ Blood pressure import error:', error);
      }

      try {
        results.bodyFatImported = await this.importBodyFatData(allData.bodyFat, importLogger);
        console.log('✅ Body fat import complete');
      } catch (error) {
        console.error('❌ Body fat import error:', error);
      }

      try {
        results.caloriesImported = await this.importCaloriesData(allData.calories, importLogger);
        results.distanceImported = await this.importDistanceData(allData.distance, importLogger);
        results.activeMinutesImported = await this.importActiveMinutesData(allData.activeMinutes, importLogger);
        console.log('✅ Additional metrics import complete');
      } catch (error) {
        console.error('❌ Additional metrics import error:', error);
      }
      */

      // Save comprehensive logs and print summary
      await importLogger.saveToDB();
      importLogger.printSummary();

      console.log(`✅ COMPREHENSIVE Google Fit import completed:`, results);
      return results;

    } catch (error: any) {
      importLogger.logError('general', 'N/A', `Import failed: ${error?.message}`, error);
      await importLogger.saveToDB();
      importLogger.printSummary();
      
      console.error('Comprehensive Google Fit import error:', error);
      throw error;
    }
  }

  /**
   * Import steps data with granular time-blocked storage
   */
  private async importStepsData(startDate: Date, endDate: Date, logger: ImportLogger): Promise<{
    dailyCount: number;
    granularCount: number;
  }> {
    console.log('📊 Importing steps data from Google Fit...');
    console.log('🔍 DEBUG: importStepsData method ENTRY - this should show first');
    
    try {
      console.log('🔍 DEBUG: About to call Google Fit service methods...');
      
      // ALSO try daily aggregated steps data from Google Fit
      console.log('🚶 TESTING: Trying Google Fit DAILY TOTALS API...');
      const dailyStepsData = await this.googleFitService.getStepsData(startDate, endDate);
      console.log(`🚶 DAILY TOTALS: Found ${dailyStepsData.length} daily step records`);
      
      for (const dayData of dailyStepsData) {
        console.log(`🚶 DAILY TOTALS: ${dayData.date} = ${dayData.steps} steps`);
      }
      
      // Get granular step data points
      const granularStepsData = await this.googleFitService.getGranularStepsData(startDate, endDate);
      console.log(`Found ${granularStepsData.length} granular step data points`);
      
      if (granularStepsData.length === 0) {
        logger.logSkipped('steps', 'N/A', 'No step data available from Google Fit API');
        console.log('ℹ️ No step data returned from Google Fit API for date range');
      }
      
      let granularPointsImported = 0;
      const dailyTotals = new Map<string, { steps: number, recordedAt: Date }>();
      
      // Store each granular step data point
      for (const stepData of granularStepsData) {
        try {
          // Check for existing step data point to prevent duplicates based on measurement timestamp
          const existingPoint = await storage.getHealthDataPointsByDateRange(
            'default-user',
            stepData.localStartTime,
            stepData.localStartTime,
            'steps'
          );
          
          // Skip if exact measurement timestamp and step count already exists
          if (existingPoint.some(p => 
            p.value === stepData.steps && 
            p.startTime.getTime() === stepData.localStartTime.getTime()
          )) {
            continue;
          }

          await storage.upsertHealthDataPoint({
            userId: 'default-user',
            dataType: 'steps',
            startTime: stepData.localStartTime, // Already converted to EST/EDT
            endTime: stepData.localEndTime,
            value: stepData.steps,
            unit: 'count',
            sourceApp: 'google_fit',
            metadata: {
              originalUtcStartTime: stepData.startTime.toISOString(),
              originalUtcEndTime: stepData.endTime.toISOString(),
              convertedToLocalTime: true,
              timezone: 'America/New_York'
            }
          });
          granularPointsImported++;

          // Aggregate for daily totals
          const dateKey = stepData.localStartTime.toISOString().split('T')[0];
          const existing = dailyTotals.get(dateKey);
          if (existing) {
            const newTotal = existing.steps + stepData.steps;
            console.log(`🚶 AGGREGATE DEBUG: Adding ${stepData.steps} steps to ${dateKey}, new total: ${newTotal}`);
            existing.steps += stepData.steps;
            if (stepData.localStartTime > existing.recordedAt) {
              existing.recordedAt = stepData.localStartTime;
            }
          } else {
            console.log(`🚶 AGGREGATE DEBUG: Starting new daily total for ${dateKey}: ${stepData.steps} steps`);
            dailyTotals.set(dateKey, { 
              steps: stepData.steps, 
              recordedAt: stepData.localStartTime 
            });
          }
        } catch (error) {
          console.error('Error storing granular step data point:', error);
        }
      }

      console.log(`✅ Stored ${granularPointsImported} granular step data points`);

      // Create/update daily health metrics with step totals
      let dailyRecordsImported = 0;
      for (const [dateStr, data] of Array.from(dailyTotals)) {
        try {
          const date = new Date(dateStr);
          
          // Check data lock protection before importing - using data CREATION timestamp, not import timestamp
          const shouldOverwrite = await dataFreshnessService.shouldOverwriteField(
            'default-user', 'steps', date, data.recordedAt, 'google_fit', data.steps
          );

          if (!shouldOverwrite.shouldOverwrite) {
            logger.logSkipped('steps', dateStr, shouldOverwrite.reason, 'existing_data_preserved', data.steps);
            continue;
          }
          
          console.log(`⚠️ ALLOWED: Google Fit steps for ${dateStr}: ${data.steps} steps`);
          console.log(`   └── Reason: ${shouldOverwrite.reason}`);

          const existingMetrics = await storage.getHealthMetricsForDate('default-user', date);
          const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};

          // Create field metadata for steps with actual recording time
          const stepsFieldMetadata = dataFreshnessService.createFieldMetadata(data.recordedAt, 'google_fit');
          const newFieldMetadata: HealthMetricsFieldMetadata = {
            ...existingFieldMetadata,
            steps: stepsFieldMetadata
          };

          // Create health metrics with steps data
          const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
            date: dateStr,
            steps: data.steps,
            source: 'google_fit'
          }, 'default-user');

          healthMetric.fieldMetadata = newFieldMetadata;
          
          await storage.upsertHealthMetrics(healthMetric);
          dailyRecordsImported++;
          
          logger.logImported('steps', dateStr, data.steps, existingMetrics?.steps || null, `${data.steps.toLocaleString()} steps from ${granularStepsData.length} data points`);
        } catch (error) {
          console.error(`Error creating daily steps record for ${dateStr}:`, error);
        }
      }

      return {
        dailyCount: dailyRecordsImported,
        granularCount: granularPointsImported
      };

    } catch (error: any) {
      console.error('❌ CRITICAL ERROR in importStepsData:', error);
      console.error('❌ Stack trace:', error?.stack);
      console.error('❌ Error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code
      });
      
      // Log the error properly and return zero counts
      logger.logError('steps', 'N/A', `Steps import failed: ${error?.message}`, error);
      return { dailyCount: 0, granularCount: 0 };
    }
  }

  /**
   * Import heart rate data from Google Fit with granular time-blocked storage
   */
  private async importHeartRateData(startDate: Date, endDate: Date, logger: ImportLogger): Promise<number> {
    console.log('❤️ Importing heart rate data from Google Fit...');
    
    try {
      // First, get granular heart rate data points
      const granularHeartRateData = await this.googleFitService.getGranularHeartRateData(startDate, endDate);
      console.log(`Found ${granularHeartRateData.length} granular heart rate data points`);
      
      let granularPointsImported = 0;
      const dailyHeartRateData = new Map<string, {
        readings: number[];
        timestamps: Date[];
        minHR: number;
        maxHR: number;
        avgHR: number;
        latestTimestamp: Date;
      }>();

      // Store each granular heart rate data point
      for (const hrPoint of granularHeartRateData) {
        try {
          // Skip invalid heart rate values
          if (!hrPoint.heartRate || hrPoint.heartRate <= 0 || hrPoint.heartRate > 250) continue;

          // Check for existing heart rate data point to prevent duplicates based on measurement timestamp
          const existingHRPoint = await storage.getHealthDataPointsByDateRange(
            'default-user',
            hrPoint.localStartTime,
            hrPoint.localStartTime,
            'heart_rate'
          );
          
          // Skip if exact measurement timestamp and heart rate value already exists
          if (existingHRPoint.some(p => 
            p.value === hrPoint.heartRate && 
            p.startTime.getTime() === hrPoint.localStartTime.getTime()
          )) {
            continue;
          }

          await storage.upsertHealthDataPoint({
            userId: 'default-user',
            dataType: 'heart_rate',
            startTime: hrPoint.localStartTime, // Already in America/New_York timezone
            endTime: hrPoint.localEndTime,
            value: hrPoint.heartRate,
            unit: 'bpm',
            sourceApp: 'google_fit',
            metadata: {
              originalUtcStartTime: hrPoint.startTime.toISOString(),
              originalUtcEndTime: hrPoint.endTime.toISOString(),
              convertedToLocalTime: true,
              timezone: 'America/New_York',
              heartRateType: 'measurement'
            }
          });
          granularPointsImported++;

          // Build daily aggregates
          const dateKey = hrPoint.localStartTime.toISOString().split('T')[0];
          const existing = dailyHeartRateData.get(dateKey);
          if (existing) {
            existing.readings.push(hrPoint.heartRate);
            existing.timestamps.push(hrPoint.startTime);
            existing.minHR = Math.min(existing.minHR, hrPoint.heartRate);
            existing.maxHR = Math.max(existing.maxHR, hrPoint.heartRate);
            if (hrPoint.startTime > existing.latestTimestamp) {
              existing.latestTimestamp = hrPoint.startTime;
            }
          } else {
            dailyHeartRateData.set(dateKey, {
              readings: [hrPoint.heartRate],
              timestamps: [hrPoint.startTime],
              minHR: hrPoint.heartRate,
              maxHR: hrPoint.heartRate,
              avgHR: hrPoint.heartRate,
              latestTimestamp: hrPoint.startTime
            });
          }
        } catch (error) {
          console.error('Error storing granular heart rate data point:', error);
        }
      }

      console.log(`✅ Stored ${granularPointsImported} granular heart rate data points`);

      // Also import legacy heart rate aggregates (for backward compatibility)
      const heartRateData = await this.googleFitService.getHeartRateData(startDate, endDate);
      let legacyImported = 0;

      for (const hrData of heartRateData) {
        try {
          const dateKey = hrData.date;
          const existing = dailyHeartRateData.get(dateKey);
          
          // If we don't have granular data for this day, use the legacy aggregate
          if (!existing) {
            const date = new Date(hrData.date);
            const existingMetrics = await storage.getHealthMetricsForDate('default-user', date);
            const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};

            // Create field metadata for heart rate
            const hrFieldMetadata = dataFreshnessService.createFieldMetadata(hrData.timestamp, 'google_fit');
            const fieldName = hrData.type === 'resting' ? 'restingHeartRate' : 'averageHeartRate';
            const newFieldMetadata: HealthMetricsFieldMetadata = {
              ...existingFieldMetadata,
              [fieldName]: hrFieldMetadata
            };

            // Map heart rate data
            const healthData: any = {
              date: hrData.date,
              source: 'google_fit'
            };
            healthData[fieldName] = hrData.heartRate;

            const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics(healthData, 'default-user');
            healthMetric.fieldMetadata = newFieldMetadata;
            
            await storage.upsertHealthMetrics(healthMetric);
            legacyImported++;
            
            console.log(`✅ Imported legacy ${hrData.type} heart rate for ${hrData.date}: ${hrData.heartRate} bpm`);
          }
        } catch (error) {
          console.error(`Error importing legacy heart rate for ${hrData.date}:`, error);
        }
      }

      // Create daily health metrics with heart rate aggregates from granular data
      let dailyRecordsImported = 0;
      for (const [dateStr, data] of Array.from(dailyHeartRateData)) {
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
          const heartRateFieldMetadata = dataFreshnessService.createFieldMetadata(data.latestTimestamp, 'google_fit');
          const newFieldMetadata: HealthMetricsFieldMetadata = {
            ...existingFieldMetadata,
            restingHeartRate: heartRateFieldMetadata,
            averageHeartRate: heartRateFieldMetadata,
            maxHeartRate: heartRateFieldMetadata
          };

          // Check priority-based data freshness for heart rate fields
          const lockCheckDate = new Date(dateStr);
          const shouldOverwriteRHR = await dataFreshnessService.shouldOverwriteFieldWithPriority(
            'default-user', 'restingHeartRate', lockCheckDate, restingHR, DataSource.GOOGLE_FIT, data.latestTimestamp
          );

          if (!shouldOverwriteRHR.shouldOverwrite) {
            console.log(`🔄 SKIPPED heart rate for ${dateStr}: ${shouldOverwriteRHR.reason}`);
            continue;
          }

          // Create health metrics with heart rate data
          const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
            date: dateStr,
            restingHeartRate: restingHR,
            averageHeartRate: avgHR,
            maxHeartRate: data.maxHR,
            source: 'google_fit'
          }, 'default-user');

          healthMetric.fieldMetadata = newFieldMetadata;
          
          await storage.upsertHealthMetrics(healthMetric);
          dailyRecordsImported++;
          
          console.log(`✅ Imported calculated heart rate for ${dateStr}: RHR ${restingHR}, Avg ${avgHR}, Max ${data.maxHR} bpm (${data.readings.length} readings)`);
        } catch (error) {
          console.error(`Error creating daily heart rate record for ${dateStr}:`, error);
        }
      }

      return granularPointsImported + legacyImported + dailyRecordsImported;
    } catch (error) {
      console.error('Heart rate import error:', error);
      return 0;
    }
  }

  /**
   * Import sleep data from Google Fit
   */
  private async importSleepData(startDate: Date, endDate: Date, logger: ImportLogger): Promise<number> {
    console.log('🔥🔥🔥 SLEEP IMPORT METHOD CALLED 🔥🔥🔥');
    console.log('😴 Importing sleep data from Google Fit...');
    console.log('🔍 DEBUG: Sleep import date range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });
    
    try {
      console.log('🔍 DEBUG: Calling googleFitService.getSleepData...');
      const sleepData = await this.googleFitService.getSleepData(startDate, endDate);
      console.log(`🔥 CRITICAL DEBUG: Found ${sleepData.length} sleep records from Google Fit`);
      console.log('🔥 CRITICAL DEBUG: Sleep data sample:', sleepData.slice(0, 2));
      
      if (sleepData.length === 0) {
        logger.logSkipped('sleep', 'N/A', 'No sleep data available from Google Fit API');
        console.log('ℹ️ No sleep data returned from Google Fit API for date range');
        return 0;
      }
      
      let imported = 0;

      for (const sleepRecord of sleepData) {
        try {
          const date = new Date(sleepRecord.date);
          
          // DEBUG: Log the actual Google Fit sleep duration being processed
          console.log(`🔍 DEBUG: Google Fit sleep session for ${sleepRecord.date}: ${sleepRecord.sleepMinutes} minutes (${Math.floor(sleepRecord.sleepMinutes/60)}h ${sleepRecord.sleepMinutes%60}m)`);
          
          // Check priority-based data freshness for sleep data
          const shouldOverwrite = await dataFreshnessService.shouldOverwriteFieldWithPriority(
            'default-user', 'sleepDuration', date, sleepRecord.sleepMinutes, DataSource.GOOGLE_FIT, sleepRecord.timestamp
          );

          if (!shouldOverwrite.shouldOverwrite) {
            console.log(`🔄 SKIPPED sleep for ${sleepRecord.date}: ${shouldOverwrite.reason}`);
            console.log(`🔍 DEBUG: Current sleep duration: 339 min, Google Fit providing: ${sleepRecord.sleepMinutes} min`);
            continue;
          }

          const existingMetrics = await storage.getHealthMetricsForDate('default-user', date);
          const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};

          // Create field metadata for comprehensive sleep data
          const sleepFieldMetadata = dataFreshnessService.createFieldMetadata(sleepRecord.timestamp, 'google_fit');
          const newFieldMetadata: HealthMetricsFieldMetadata = {
            ...existingFieldMetadata,
            sleepDuration: sleepFieldMetadata,
            sleepEfficiency: sleepFieldMetadata
          };

          // Add metadata for sleep stages if available
          if (sleepRecord.sleepStages) {
            newFieldMetadata.deepSleepMinutes = sleepFieldMetadata;
            newFieldMetadata.lightSleepMinutes = sleepFieldMetadata;
            newFieldMetadata.remSleepMinutes = sleepFieldMetadata;
            newFieldMetadata.awakeDuringNight = sleepFieldMetadata;
          }

          if (sleepRecord.wakeEvents !== undefined) {
            newFieldMetadata.wakeEvents = sleepFieldMetadata;
          }

          // Map comprehensive sleep data including stages if available
          const sleepMapping: any = {
            date: sleepRecord.date,
            sleepDuration: sleepRecord.sleepMinutes,
            sleepEfficiency: sleepRecord.sleepEfficiency,
            source: 'google_fit'
          };

          // Add sleep stage data if available from Google Fit
          if (sleepRecord.sleepStages) {
            sleepMapping.deepSleepMinutes = sleepRecord.sleepStages.deep;
            sleepMapping.lightSleepMinutes = sleepRecord.sleepStages.light;
            sleepMapping.remSleepMinutes = sleepRecord.sleepStages.rem;
            sleepMapping.awakeDuringNight = sleepRecord.sleepStages.awake;
          }

          if (sleepRecord.wakeEvents !== undefined) {
            sleepMapping.wakeEvents = sleepRecord.wakeEvents;
          }

          const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics(sleepMapping, 'default-user');

          healthMetric.fieldMetadata = newFieldMetadata;
          
          await storage.upsertHealthMetrics(healthMetric);
          imported++;
          
          const stagesInfo = sleepRecord.sleepStages 
            ? ` (Deep: ${sleepRecord.sleepStages.deep}m, Light: ${sleepRecord.sleepStages.light}m, REM: ${sleepRecord.sleepStages.rem}m, Awake: ${sleepRecord.sleepStages.awake}m, Wake events: ${sleepRecord.wakeEvents || 0})`
            : ' (basic duration only)';
          
          console.log(`✅ Imported comprehensive sleep for ${sleepRecord.date}: ${Math.floor(sleepRecord.sleepMinutes/60)}h ${sleepRecord.sleepMinutes%60}m, efficiency ${sleepRecord.sleepEfficiency}%${stagesInfo}`);
        } catch (error) {
          console.error(`Error importing sleep for ${sleepRecord.date}:`, error);
        }
      }

      return imported;
    } catch (error) {
      console.error('Sleep import error:', error);
      return 0;
    }
  }

  /**
   * Import oxygen saturation data with optimized batch processing
   */
  private async importOxygenSaturationData(oxygenData: Array<{
    date: string;
    oxygenSaturation: number;
    timestamp: Date;
  }>, logger?: ImportLogger): Promise<number> {
    console.log(`🫁 Importing oxygen saturation data from Google Fit... (${oxygenData.length} records)`);
    
    let imported = 0;
    let skipped = 0;
    const maxProcessingTime = 30000; // 30 seconds max processing time
    const startTime = Date.now();
    
    // Limit processing to prevent hangs
    const limitedData = oxygenData.slice(0, 100); // Process max 100 records per sync
    
    for (const record of limitedData) {
      // Exit early if taking too long
      if (Date.now() - startTime > maxProcessingTime) {
        console.log(`⏰ Oxygen saturation import timed out after ${maxProcessingTime}ms. Processed ${imported} records.`);
        break;
      }
      
      try {
        const date = new Date(record.date);
        
        // Check data lock protection before importing oxygen saturation
        const shouldOverwrite = await dataFreshnessService.shouldOverwriteField(
          'default-user', 'oxygenSaturation', date, record.timestamp, 'google_fit', record.oxygenSaturation
        );

        if (!shouldOverwrite.shouldOverwrite) {
          skipped++;
          // Log to ImportLogger for tracking
          logger?.logSkipped('oxygen_saturation', record.date, shouldOverwrite.reason);
          
          // Only log first few skips to prevent spam
          if (skipped <= 3) {
            console.log(`🔒 SKIPPED oxygen saturation for ${record.date}: ${shouldOverwrite.reason}`);
          } else if (skipped === 4) {
            console.log(`🔒 ... (suppressing further skip logs, total skipped: ${skipped})`);
          }
          continue;
        }

        const existingMetrics = await storage.getHealthMetricsForDate('default-user', date);
        const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};

        const fieldMetadata = dataFreshnessService.createFieldMetadata(record.timestamp, 'google_fit');
        const newFieldMetadata: HealthMetricsFieldMetadata = {
          ...existingFieldMetadata,
          oxygenSaturation: fieldMetadata
        };

        const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
          date: record.date,
          oxygenSaturation: record.oxygenSaturation,
          source: 'google_fit'
        }, 'default-user');

        healthMetric.fieldMetadata = newFieldMetadata;
        await storage.upsertHealthMetrics(healthMetric);
        imported++;
        
        // Log to ImportLogger for tracking
        logger?.logImported('oxygen_saturation', record.date, record.oxygenSaturation, undefined, `${record.oxygenSaturation}%`);
        
        // Only log first few imports to prevent spam
        if (imported <= 3) {
          console.log(`✅ Imported oxygen saturation for ${record.date}: ${record.oxygenSaturation}%`);
        }
      } catch (error) {
        console.error(`Error importing oxygen saturation for ${record.date}:`, error);
      }
    }
    
    console.log(`🫁 Oxygen saturation import complete: ${imported} imported, ${skipped} skipped`);
    return imported;
  }

  /**
   * Import blood pressure data
   */
  private async importBloodPressureData(bpData: Array<{
    date: string;
    systolic: number;
    diastolic: number;
    timestamp: Date;
  }>, logger?: ImportLogger): Promise<number> {
    console.log(`🩸 Importing blood pressure data from Google Fit... (${bpData?.length || 0} records)`);
    
    if (!bpData || bpData.length === 0) {
      console.log('⚠️ No blood pressure data to import');
      return 0;
    }
    
    let imported = 0;
    for (const record of bpData) {
      try {
        const date = new Date(record.date);
        
        // Check data lock protection before importing blood pressure
        const shouldOverwrite = await dataFreshnessService.shouldOverwriteField(
          'default-user', 'bloodPressureSystolic', date, record.timestamp, 'google_fit', record.systolic
        );

        if (!shouldOverwrite.shouldOverwrite) {
          logger?.logSkipped('blood_pressure', record.date, shouldOverwrite.reason);
          console.log(`🔒 SKIPPED blood pressure for ${record.date}: ${shouldOverwrite.reason}`);
          continue;
        }

        const existingMetrics = await storage.getHealthMetricsForDate('default-user', date);
        const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};

        const fieldMetadata = dataFreshnessService.createFieldMetadata(record.timestamp, 'google_fit');
        const newFieldMetadata: HealthMetricsFieldMetadata = {
          ...existingFieldMetadata,
          bloodPressureSystolic: fieldMetadata,
          bloodPressureDiastolic: fieldMetadata
        };

        const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
          date: record.date,
          bloodPressureSystolic: record.systolic,
          bloodPressureDiastolic: record.diastolic,
          source: 'google_fit'
        }, 'default-user');

        healthMetric.fieldMetadata = newFieldMetadata;
        await storage.upsertHealthMetrics(healthMetric);
        imported++;
        
        logger?.logImported('blood_pressure', record.date, `${record.systolic}/${record.diastolic}`, existingMetrics?.bloodPressureSystolic ? `${existingMetrics.bloodPressureSystolic}/${existingMetrics.bloodPressureDiastolic}` : null, `${record.systolic}/${record.diastolic} mmHg`);
        console.log(`✅ Imported blood pressure for ${record.date}: ${record.systolic}/${record.diastolic} mmHg`);
      } catch (error) {
        console.error(`Error importing blood pressure for ${record.date}:`, error);
      }
    }

    return imported;
  }

  /**
   * Import body fat data with optimized processing
   */
  private async importBodyFatData(bodyFatData: Array<{
    date: string;
    bodyFatPercentage: number;
    timestamp: Date;
  }>, logger?: ImportLogger): Promise<number> {
    console.log(`📊 Importing body fat data from Google Fit... (${bodyFatData.length} records)`);
    
    let imported = 0;
    let skipped = 0;
    const limitedData = bodyFatData.slice(0, 50); // Limit to prevent hangs
    
    for (const record of limitedData) {
      try {
        const date = new Date(record.date);
        
        // Check data lock protection before importing body fat
        const shouldOverwrite = await dataFreshnessService.shouldOverwriteField(
          'default-user', 'bodyFatPercentage', date, record.timestamp, 'google_fit', record.bodyFatPercentage
        );

        if (!shouldOverwrite.shouldOverwrite) {
          skipped++;
          logger?.logSkipped('body_fat', record.date, shouldOverwrite.reason);
          if (skipped <= 3) {
            console.log(`🔒 SKIPPED body fat for ${record.date}: ${shouldOverwrite.reason}`);
          }
          continue;
        }

        const existingMetrics = await storage.getHealthMetricsForDate('default-user', date);
        const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};

        const fieldMetadata = dataFreshnessService.createFieldMetadata(record.timestamp, 'google_fit');
        const newFieldMetadata: HealthMetricsFieldMetadata = {
          ...existingFieldMetadata,
          bodyFatPercentage: fieldMetadata
        };

        const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
          date: record.date,
          bodyFatPercentage: record.bodyFatPercentage,
          source: 'google_fit'
        }, 'default-user');

        healthMetric.fieldMetadata = newFieldMetadata;
        await storage.upsertHealthMetrics(healthMetric);
        imported++;
        
        logger?.logImported('body_fat', record.date, record.bodyFatPercentage, existingMetrics?.bodyFatPercentage || null, `${record.bodyFatPercentage}%`);
        if (imported <= 3) {
          console.log(`✅ Imported body fat for ${record.date}: ${record.bodyFatPercentage}%`);
        }
      } catch (error) {
        console.error(`Error importing body fat for ${record.date}:`, error);
      }
    }
    
    console.log(`📊 Body fat import complete: ${imported} imported, ${skipped} skipped`);
    return imported;
  }

  /**
   * Import calories data
   */
  private async importCaloriesData(caloriesData: Array<{
    date: string;
    calories: number;
    timestamp: Date;
  }>, logger?: ImportLogger): Promise<number> {
    console.log('🔥 Importing calories data from Google Fit...');
    
    let imported = 0;
    let skipped = 0;
    for (const record of caloriesData) {
      try {
        const date = new Date(record.date);
        
        // Check data lock protection before importing calories
        const shouldOverwrite = await dataFreshnessService.shouldOverwriteField(
          'default-user', 'caloriesBurned', date, record.timestamp, 'google_fit', record.calories
        );

        if (!shouldOverwrite.shouldOverwrite) {
          skipped++;
          logger?.logSkipped('calories', record.date, shouldOverwrite.reason);
          console.log(`🔒 SKIPPED calories for ${record.date}: ${shouldOverwrite.reason}`);
          continue;
        }

        const existingMetrics = await storage.getHealthMetricsForDate('default-user', date);
        const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};

        const fieldMetadata = dataFreshnessService.createFieldMetadata(record.timestamp, 'google_fit');
        const newFieldMetadata: HealthMetricsFieldMetadata = {
          ...existingFieldMetadata,
          caloriesBurned: fieldMetadata
        };

        const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
          date: record.date,
          caloriesBurned: record.calories,
          source: 'google_fit'
        }, 'default-user');

        healthMetric.fieldMetadata = newFieldMetadata;
        await storage.upsertHealthMetrics(healthMetric);
        imported++;
        
        logger?.logImported('calories', record.date, record.calories, undefined, `${record.calories} kcal`);
        console.log(`✅ Imported calories for ${record.date}: ${record.calories} kcal`);
      } catch (error) {
        console.error(`Error importing calories for ${record.date}:`, error);
      }
    }

    return imported;
  }

  /**
   * Import distance data
   */
  private async importDistanceData(distanceData: Array<{
    date: string;
    distance: number;
    timestamp: Date;
  }>, logger?: ImportLogger): Promise<number> {
    console.log('🏃 Importing distance data from Google Fit...');
    
    let imported = 0;
    let skipped = 0;
    for (const record of distanceData) {
      try {
        const date = new Date(record.date);
        
        // Convert meters to miles for consistency with app
        const distanceInMiles = record.distance * 0.000621371;
        
        // Check data lock protection before importing distance
        const shouldOverwrite = await dataFreshnessService.shouldOverwriteField(
          'default-user', 'distanceTraveled', date, record.timestamp, 'google_fit', distanceInMiles
        );

        if (!shouldOverwrite.shouldOverwrite) {
          skipped++;
          logger?.logSkipped('distance', record.date, shouldOverwrite.reason);
          console.log(`🔒 SKIPPED distance for ${record.date}: ${shouldOverwrite.reason}`);
          continue;
        }

        const existingMetrics = await storage.getHealthMetricsForDate('default-user', date);
        const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};

        const fieldMetadata = dataFreshnessService.createFieldMetadata(record.timestamp, 'google_fit');
        const newFieldMetadata: HealthMetricsFieldMetadata = {
          ...existingFieldMetadata,
          distanceTraveled: fieldMetadata
        };

        const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
          date: record.date,
          distanceTraveled: distanceInMiles,
          source: 'google_fit'
        }, 'default-user');

        healthMetric.fieldMetadata = newFieldMetadata;
        await storage.upsertHealthMetrics(healthMetric);
        imported++;
        
        logger?.logImported('distance', record.date, distanceInMiles, undefined, `${distanceInMiles.toFixed(2)} miles`);
        console.log(`✅ Imported distance for ${record.date}: ${distanceInMiles.toFixed(2)} miles`);
      } catch (error) {
        console.error(`Error importing distance for ${record.date}:`, error);
      }
    }

    return imported;
  }

  /**
   * Import active minutes data
   */
  private async importActiveMinutesData(activeMinutesData: Array<{
    date: string;
    activeMinutes: number;
    timestamp: Date;
  }>, logger?: ImportLogger): Promise<number> {
    console.log('⏱️ Importing active minutes data from Google Fit...');
    
    let imported = 0;
    let skipped = 0;
    for (const record of activeMinutesData) {
      try {
        const date = new Date(record.date);
        
        // Check data lock protection before importing active minutes
        const shouldOverwrite = await dataFreshnessService.shouldOverwriteField(
          'default-user', 'activeMinutes', date, record.timestamp, 'google_fit', record.activeMinutes
        );

        if (!shouldOverwrite.shouldOverwrite) {
          skipped++;
          logger?.logSkipped('active_minutes', record.date, shouldOverwrite.reason);
          console.log(`🔒 SKIPPED active minutes for ${record.date}: ${shouldOverwrite.reason}`);
          continue;
        }

        const existingMetrics = await storage.getHealthMetricsForDate('default-user', date);
        const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};

        const fieldMetadata = dataFreshnessService.createFieldMetadata(record.timestamp, 'google_fit');
        const newFieldMetadata: HealthMetricsFieldMetadata = {
          ...existingFieldMetadata,
          activeMinutes: fieldMetadata
        };

        const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
          date: record.date,
          activeMinutes: record.activeMinutes,
          source: 'google_fit'
        }, 'default-user');

        healthMetric.fieldMetadata = newFieldMetadata;
        await storage.upsertHealthMetrics(healthMetric);
        imported++;
        
        logger?.logImported('active_minutes', record.date, record.activeMinutes, undefined, `${record.activeMinutes} min`);
        console.log(`✅ Imported active minutes for ${record.date}: ${record.activeMinutes} min`);
      } catch (error) {
        console.error(`Error importing active minutes for ${record.date}:`, error);
      }
    }

    return imported;
  }

  /**
   * Import weight data
   */
  private async importWeightData(startDate: Date, endDate: Date, logger: ImportLogger): Promise<number> {
    console.log('⚖️ Importing weight data from Google Fit...');
    
    try {
      const weightData = await this.googleFitService.getWeightData(startDate, endDate);
      let imported = 0;

      for (const weightRecord of weightData) {
        try {
          const date = new Date(weightRecord.date);
          
          // Check data lock protection before importing weight
          const shouldOverwrite = await dataFreshnessService.shouldOverwriteField(
            'default-user', 'weight', date, weightRecord.timestamp, 'google_fit', weightRecord.weight
          );

          if (!shouldOverwrite.shouldOverwrite) {
            console.log(`🔒 SKIPPED weight for ${weightRecord.date}: ${shouldOverwrite.reason}`);
            continue;
          }

          const existingMetrics = await storage.getHealthMetricsForDate('default-user', date);
          const existingFieldMetadata = (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata) || {};

          const fieldMetadata = dataFreshnessService.createFieldMetadata(weightRecord.timestamp, 'google_fit');
          const newFieldMetadata: HealthMetricsFieldMetadata = {
            ...existingFieldMetadata,
            weight: fieldMetadata
          };

          const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
            date: weightRecord.date,
            weight: weightRecord.weight,
            source: 'google_fit'
          }, 'default-user');

          healthMetric.fieldMetadata = newFieldMetadata;
          
          await storage.upsertHealthMetrics(healthMetric);
          imported++;
          
          console.log(`✅ Imported weight for ${weightRecord.date}: ${weightRecord.weight} lbs`);
        } catch (error) {
          console.error(`Error importing weight for ${weightRecord.date}:`, error);
        }
      }

      return imported;
    } catch (error) {
      console.error('Weight import error:', error);
      return 0;
    }
  }
}

export const googleFitImporter = new GoogleFitImporter();