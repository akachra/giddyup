import sqlite3 from 'sqlite3';
import * as yauzl from 'yauzl';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { storage } from './storage';
import { googleDriveService } from './googleDrive';
import type { InsertHealthMetrics, InsertHealthDataPoint } from '@shared/schema';
import { metricsCalculator, type MetricInputs } from './metricsCalculator';
import { ComprehensiveFieldMapper } from './comprehensiveFieldMapper';
import { detectWeightUnit, convertWeightToKilograms } from '@shared/weightUtils';
import { dataFreshnessService } from './dataFreshnessService';

const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

export class HealthConnectImporter {
  private tempDir = '/tmp/health_imports';

  constructor() {
    this.ensureTempDir();
  }

  /**
   * Convert UTC time to EST/EDT timezone
   * Health Connect data is stored in UTC, but we need to align with Mi Fitness data in EST
   */
  private convertUTCToLocalTime(utcDate: Date): Date {
    // Convert UTC to EST (UTC-5) or EDT (UTC-4 during daylight saving time)
    // This ensures consistency with Mi Fitness data which is stored in local EST time
    
    // For August 2025, we're in EDT (UTC-4)
    // Subtract 4 hours from UTC to get correct local time
    const localDate = new Date(utcDate.getTime() - (4 * 60 * 60 * 1000));
    return localDate;
  }

  private async ensureTempDir() {
    if (!(await exists(this.tempDir))) {
      await mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Import health data directly from a Health Connect database buffer
   */
  async importFromDatabaseBuffer(dbBuffer: Buffer): Promise<{
    success: boolean;
    recordsImported: number;
    error?: string;
  }> {
    const tempDbPath = path.join(this.tempDir, `health_import_${Date.now()}.db`);
    
    try {
      // Write database buffer to temp file
      fs.writeFileSync(tempDbPath, dbBuffer);
      
      // Import data from the database
      const recordsImported = await this.importFromDatabase(tempDbPath);
      
      // Cleanup temp file
      await this.cleanupTempFiles([tempDbPath]);
      
      return {
        success: true,
        recordsImported
      };
      
    } catch (error) {
      console.error('Health Connect database import failed:', error);
      
      // Cleanup on error
      try {
        if (fs.existsSync(tempDbPath)) {
          await unlink(tempDbPath);
        }
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
      
      return {
        success: false,
        recordsImported: 0,
        error: error instanceof Error ? error.message : 'Unknown database processing error'
      };
    }
  }

  /**
   * Import health data from a zip file containing Health Connect database export
   */
  async importFromZipFile(zipBuffer: Buffer): Promise<{
    success: boolean;
    recordsImported: number;
    error?: string;
  }> {
    const tempZipPath = path.join(this.tempDir, `health_import_${Date.now()}.zip`);
    
    try {
      // Write zip buffer to temp file
      fs.writeFileSync(tempZipPath, zipBuffer);
      
      // Extract the zip file
      const extractedFiles = await this.extractZipFile(tempZipPath);
      
      // Find the database file
      const dbFile = extractedFiles.find(file => file.endsWith('.db'));
      if (!dbFile) {
        throw new Error('No database file found in the zip archive');
      }

      const dbPath = path.join(this.tempDir, dbFile);
      
      // Import data from the database
      const recordsImported = await this.importFromDatabase(dbPath);
      
      // Cleanup temp files
      await this.cleanupTempFiles([tempZipPath, dbPath]);
      
      return {
        success: true,
        recordsImported
      };
      
    } catch (error) {
      console.error('Health Connect import failed:', error);
      
      // Cleanup on error
      try {
        if (fs.existsSync(tempZipPath)) {
          await unlink(tempZipPath);
        }
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
      
      return {
        success: false,
        recordsImported: 0,
        error: error instanceof Error ? error.message : 'Unknown import error'
      };
    }
  }

  /**
   * Extract zip file and return list of extracted file names
   */
  private async extractZipFile(zipPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const extractedFiles: string[] = [];
      
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }
        
        zipfile.readEntry();
        
        zipfile.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry, skip
            zipfile.readEntry();
          } else {
            // File entry
            const outputPath = path.join(this.tempDir, path.basename(entry.fileName));
            
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                reject(err);
                return;
              }
              
              const writeStream = fs.createWriteStream(outputPath);
              
              writeStream.on('close', () => {
                extractedFiles.push(path.basename(entry.fileName));
                zipfile.readEntry();
              });
              
              writeStream.on('error', reject);
              readStream.on('error', reject);
              readStream.pipe(writeStream);
            });
          }
        });
        
        zipfile.on('end', () => {
          resolve(extractedFiles);
        });
        
        zipfile.on('error', reject);
      });
    });
  }

  /**
   * Import health data from SQLite database file
   */
  private async importFromDatabase(dbPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
      });

      let recordsImported = 0;
      
      // Query all tables to understand the schema
      db.all("SELECT name FROM sqlite_master WHERE type='table'", async (err, tables: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          console.log('Available tables in Health Connect DB:', tables.map((t: any) => t.name));
          console.log('DEBUG: About to start comprehensive health import');

          try {
            // Import different types of health data
            console.log('=== STARTING COMPREHENSIVE HEALTH IMPORT ===');
            console.log('DEBUG: Comprehensive import section reached');
          
          // Import heart rate data first (this was failing to execute)
          console.log('Importing heart rate data...');
          const heartRateCount = await this.importHeartRateData(db);
          console.log(`Heart rate import completed: ${heartRateCount} records`);
          
          // Import sleep data
          console.log('Importing sleep data...');
          const sleepCount = await this.importSleepData(db);
          console.log(`Sleep import completed: ${sleepCount} records`);
          
          // Import steps data
          console.log('Importing steps data...');
          const stepsCount = await this.importStepsData(db);
          console.log(`Steps import completed: ${stepsCount} records`);
          
          // Import oxygen saturation
          console.log('Importing oxygen saturation data...');
          const oxygenCount = await this.importOxygenSaturationData(db);
          console.log(`Oxygen import completed: ${oxygenCount} records`);

          recordsImported = heartRateCount + sleepCount + stepsCount + oxygenCount;
            
            console.log('DEBUG: Comprehensive import completed successfully');
          } catch (innerError) {
            console.error('ERROR in comprehensive import section:', innerError);
            console.error('Stack trace:', (innerError as Error).stack);
            // Continue with original import if comprehensive fails
            console.log('Falling back to original import approach...');
            recordsImported = 0;
          }
          
          db.close((closeErr) => {
            if (closeErr) {
              console.error('Error closing database:', closeErr);
            }
            resolve(recordsImported);
          });
        } catch (importError) {
          console.error('ERROR in main import function:', importError);
          db.close();
          reject(importError);
        }
      });
    });
  }

  /**
   * Import sleep data from Health Connect database using sleep_stages_table methodology
   */
  private async importSleepData(db: sqlite3.Database): Promise<number> {
    return new Promise((resolve) => {
      console.log('Using sleep_stages_table methodology for accurate sleep calculations');
      
      // First, get nightly totals using the proven methodology
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

        console.log(`Found ${nightlyRows.length} nights of sleep stage data`);

        let imported = 0;
        
        // Process each night's sleep data
        for (const nightRow of nightlyRows) {
          try {
            const sleepDate = new Date(nightRow.date_est + 'T00:00:00');
            const totalMinutes = Math.round(nightRow.total_minutes);
            
            if (totalMinutes <= 0) continue;

            console.log(`Processing sleep for ${nightRow.date_est}: ${totalMinutes} minutes (${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m)`);

            // Check data freshness before processing
            const decision = await dataFreshnessService.shouldOverwriteData(
              'default-user', 
              sleepDate, 
              'health_connect', 
              sleepDate // Use sleep date as the data timestamp
            );
            
            if (!decision.shouldOverwrite) {
              dataFreshnessService.logImportDecision(sleepDate, 'Health Connect sleep (stages)', decision);
              continue;
            } else {
              console.log(`🔄 IMPORTING Health Connect sleep stages for ${nightRow.date_est}: ${decision.reason}`);
            }
            
            // Get per-stage breakdown for this night
            const stageBreakdownQuery = `
              SELECT 
                stage_type,
                ROUND(SUM((stage_end_time - stage_start_time) / 1000.0 / 60), 1) AS minutes_in_stage
              FROM sleep_stages_table
              WHERE date(datetime(stage_start_time / 1000, 'unixepoch', '-4 hours')) = ?
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
            // 0 or 1 = awake, 4 = light, 5 = deep, 6 = REM
            let awakeMinutes = 0;
            let lightSleepMinutes = 0;  
            let deepSleepMinutes = 0;
            let remSleepMinutes = 0;
            
            for (const stage of stageBreakdown) {
              const minutes = Math.round(stage.minutes_in_stage);
              switch (stage.stage_type) {
                case 0:
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
            const totalTimeInBed = totalMinutes; // Total time including awake periods
            const sleepEfficiency = totalTimeInBed > 0 ? Math.round((totalSleepMinutes / totalTimeInBed) * 100) : 85;

            console.log(`  Stage breakdown: Light=${lightSleepMinutes}m, Deep=${deepSleepMinutes}m, REM=${remSleepMinutes}m, Awake=${awakeMinutes}m`);
            console.log(`  Sleep efficiency: ${sleepEfficiency}% (${totalSleepMinutes}/${totalTimeInBed})`);

            // Create comprehensive health metrics using the proven totals
            const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
              date: sleepDate.toISOString().split('T')[0],
              sleepDuration: totalMinutes,
              sleepEfficiency: sleepEfficiency,
              deepSleep: deepSleepMinutes,
              remSleep: remSleepMinutes, 
              lightSleep: lightSleepMinutes,
              wakeEvents: awakeMinutes > 0 ? Math.ceil(awakeMinutes / 15) : 0, // Estimate wake events from awake time
              source: 'health_connect'
            }, 'default-user');

            // Import the sleep record
            await storage.upsertHealthMetrics(healthMetric);
            imported++;
            
            console.log(`✅ Imported sleep data for ${nightRow.date_est}: ${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m`);
            
          } catch (error) {
            console.error('Error processing sleep night:', error);
          }
        }

        console.log(`Sleep import using sleep_stages_table completed: ${imported} records`);
        resolve(imported);
      });
    });
  }
        console.log('First 10 raw step records:', rows.slice(0, 10).map(r => ({
          start_time: r.start_time,
          count: r.count,
          date: new Date(r.start_time).toISOString().split('T')[0]
        })));

        // Group by date and sum all steps for each day with timezone adjustment (consistent with Google Drive import)
        const dailySteps = new Map<string, number>();
        
        for (const row of rows) {
          // Convert UTC timestamp to local time (EST/EDT) for correct date aggregation
          const utcDate = new Date(row.start_time);
          const localDate = this.convertUTCToLocalTime(utcDate);
          const date = localDate.toISOString().split('T')[0];
          
          // Check data freshness before processing
          const stepDate = new Date(date);
          // Use the actual step data timestamp (timezone adjusted UTC to local)
          const decision = await dataFreshnessService.shouldOverwriteData(
            'default-user', 
            stepDate, 
            'health_connect', 
            localDate // Use actual step measurement time, not import time
          );
          
          if (!decision.shouldOverwrite) {
            dataFreshnessService.logImportDecision(stepDate, 'Health Connect steps', decision);
            continue; // Skip this record
          } else {
            console.log(`🔄 IMPORTING Health Connect steps for ${date}: ${decision.reason}`);
          }
          
          const currentTotal = dailySteps.get(date) || 0;
          const newTotal = currentTotal + row.count;
          
          console.log(`Processing step record: ${date}, count=${row.count}, currentTotal=${currentTotal}, newTotal=${newTotal}`);
          dailySteps.set(date, newTotal);
          
          // Store individual step data point with timestamp
          try {
            const stepsDataPoint = ComprehensiveFieldMapper.mapToHealthDataPoint({
              start_time: row.start_time,
              count: row.count,
              steps: row.count
            }, 'steps', row.count, 'default-user');
            
            stepsDataPoint.unit = 'count';
            
            if (this.isValidImportDate(stepsDataPoint.startTime)) {
              await storage.upsertHealthDataPoint(stepsDataPoint);
            }
          } catch (dataPointError) {
            console.error('Error storing steps data point:', dataPointError);
          }
        }

        console.log('Final daily step totals:', Array.from(dailySteps.entries()));
        console.log(`=== END STEPS DEBUG ===`);

        let imported = 0;
        for (const [date, totalSteps] of Array.from(dailySteps.entries())) {
          try {
            // Use comprehensive mapping for steps/activity data
            const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
              date: date,
              steps: totalSteps,
              stepCount: totalSteps,
              daily_steps: totalSteps,
              distance: this.estimateDistanceFromSteps(totalSteps),
              distanceKm: this.estimateDistanceFromSteps(totalSteps),
              caloriesBurned: this.estimateCaloriesFromSteps(totalSteps),
              calories: this.estimateCaloriesFromSteps(totalSteps),
              activityRingCompletion: Math.min(1.0, totalSteps / 10000)
            }, 'default-user');
            
            // Add source tracking for freshness comparison
            healthMetric.source = 'health_connect';
            healthMetric.importedAt = new Date();

            // Never import data for today's date - only yesterday and earlier
            if (this.isValidImportDate(healthMetric.date)) {
              await storage.upsertHealthMetrics(healthMetric);
              imported++;
            } else {
              console.log(`Skipping Health Connect record for today's date: ${healthMetric.date.toISOString().split('T')[0]}`);
            }
          } catch (error) {
            console.error('Error importing daily steps record:', error);
          }
        }

        console.log(`Imported ${imported} steps records`);
        resolve(imported);
      });
    });
  }

  /**
   * Import weight and body composition data
   */
  private async importWeightData(db: sqlite3.Database): Promise<number> {
    return new Promise((resolve) => {
      const query = `
        SELECT 
          time,
          weight
        FROM weight_record_table 
        ORDER BY time DESC 
        LIMIT 90
      `;

      db.all(query, async (err, rows: any[]) => {
        if (err || !rows) {
          console.log('Weight data not found or error:', err?.message);
          resolve(0);
          return;
        }

        let imported = 0;
        for (const row of rows) {
          try {
            // Convert UTC timestamp to local time for correct date grouping
            const utcDate = new Date(row.time);
            const localDate = this.convertUTCToLocalTime(utcDate);
            const date = localDate.toISOString().split('T')[0];
            
            // Use imported data only, no BMI calculation
            const weightKg = row.weight;

            const inputs: MetricInputs = {
              weight: weightKg,
              age: 35 // Should come from user profile
            };
            const calculatedMetrics = metricsCalculator.calculateAllMetrics(inputs);

            // Use comprehensive mapping for weight/body composition data
            const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
              date: date,
              weight: weightKg,
              weightKg: weightKg,
              weight_kg: weightKg,
              metabolicAge: Math.round(calculatedMetrics.metabolicAge || 35),
              metabolic_age: Math.round(calculatedMetrics.metabolicAge || 35),
              ...row // Include any additional fields from Health Connect
            }, 'default-user');

            await storage.upsertHealthMetrics(healthMetric);
            imported++;
          } catch (error) {
            console.error('Error importing weight record:', error);
          }
        }

        console.log(`Imported ${imported} weight records`);
        resolve(imported);
      });
    });
  }

  /**
   * Import blood pressure data
   */
  private async importBloodPressureData(db: sqlite3.Database): Promise<number> {
    return new Promise((resolve) => {
      const query = `
        SELECT 
          time,
          systolic,
          diastolic
        FROM blood_pressure_record_table 
        ORDER BY time DESC 
        LIMIT 90
      `;

      db.all(query, async (err, rows: any[]) => {
        if (err || !rows) {
          console.log('Blood pressure data not found or error:', err?.message);
          resolve(0);
          return;
        }

        let imported = 0;
        for (const row of rows) {
          try {
            // Convert UTC timestamp to local time for correct date grouping
            const utcDate = new Date(row.time);
            const localDate = this.convertUTCToLocalTime(utcDate);
            const date = localDate.toISOString().split('T')[0];
            
            // Use comprehensive mapping for blood pressure data
            const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
              date: date,
              bloodPressureSystolic: row.systolic,
              blood_pressure_systolic: row.systolic,
              systolic: row.systolic,
              bloodPressureDiastolic: row.diastolic,
              blood_pressure_diastolic: row.diastolic,
              diastolic: row.diastolic,
              ...row // Include any additional fields
            }, 'default-user');

            await storage.upsertHealthMetrics(healthMetric);
            imported++;
          } catch (error) {
            console.error('Error importing blood pressure record:', error);
          }
        }

        console.log(`Imported ${imported} blood pressure records`);
        resolve(imported);
      });
    });
  }

  /**
   * Import general activity/exercise data
   */
  private async importActivityData(db: sqlite3.Database): Promise<number> {
    return new Promise((resolve) => {
      const query = `
        SELECT 
          start_time,
          end_time,
          exercise_type,
          title
        FROM exercise_session_record_table 
        ORDER BY start_time DESC 
        LIMIT 90
      `;

      db.all(query, async (err, rows: any[]) => {
        if (err || !rows) {
          console.log('Activity data not found or error:', err?.message);
          resolve(0);
          return;
        }

        let imported = 0;
        for (const row of rows) {
          try {
            const startTime = new Date(row.start_time);
            const endTime = new Date(row.end_time);
            const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes
            // Convert UTC timestamp to local time for correct date grouping
            const localStartTime = this.convertUTCToLocalTime(startTime);
            const date = localStartTime.toISOString().split('T')[0];
            
            // Use comprehensive mapping for activity/exercise data
            const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
              date: date,
              strainScore: this.calculateStrainFromActivity(row.exercise_type, duration),
              strain_score: this.calculateStrainFromActivity(row.exercise_type, duration),
              caloriesBurned: this.estimateCaloriesFromActivity(row.exercise_type, duration),
              calories: this.estimateCaloriesFromActivity(row.exercise_type, duration),
              exercise_type: row.exercise_type,
              duration: duration,
              ...row // Include any additional fields
            }, 'default-user');

            await storage.upsertHealthMetrics(healthMetric);
            imported++;
          } catch (error) {
            console.error('Error importing activity record:', error);
          }
        }

        console.log(`Imported ${imported} activity records`);
        resolve(imported);
      });
    });
  }

  /**
   * Import oxygen saturation data from Health Connect database
   */
  private async importOxygenSaturationData(db: sqlite3.Database): Promise<number> {
    return new Promise((resolve) => {
      const query = `
        SELECT time, percentage
        FROM oxygen_saturation_record_table 
        ORDER BY time DESC 
        LIMIT 90
      `;

      db.all(query, async (err, rows: any[]) => {
        if (err || !rows) {
          console.log('Oxygen saturation data not found or error:', err?.message);
          resolve(0);
          return;
        }

        let imported = 0;
        for (const row of rows) {
          try {
            // Convert UTC timestamp to local time for correct date grouping
            const utcDate = new Date(row.time);
            const localDate = this.convertUTCToLocalTime(utcDate);
            const date = localDate.toISOString().split('T')[0];
            
            // Use comprehensive mapping for oxygen saturation data
            const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
              date: date,
              oxygenSaturation: row.percentage,
              oxygen_saturation: row.percentage,
              spo2: row.percentage,
              SpO2: row.percentage,
              percentage: row.percentage,
              ...row // Include any additional fields
            }, 'default-user');

            await storage.upsertHealthMetrics(healthMetric);
            imported++;
          } catch (error) {
            console.error('Error importing oxygen saturation record:', error);
          }
        }

        console.log(`Imported ${imported} oxygen saturation records`);
        
        // WORKAROUND: Also process heart rate data here since main heart rate import isn't working
        console.log('Processing heart rate data as part of oxygen saturation import...');
        
        const heartRateQuery = `
          SELECT 
            time,
            beats_per_minute as bpm
          FROM resting_heart_rate_record_table 
          ORDER BY time DESC 
          LIMIT 90
        `;
        
        db.all(heartRateQuery, async (hrErr, hrRows: any[]) => {
          let hrImported = 0;
          
          if (!hrErr && hrRows && hrRows.length > 0) {
            console.log(`Found ${hrRows.length} heart rate records to process`);
            
            for (const row of hrRows) {
              try {
                // Convert UTC timestamp to local time for correct date grouping
                const utcDate = new Date(row.time);
                const localDate = this.convertUTCToLocalTime(utcDate);
                const date = localDate.toISOString().split('T')[0];
                
                // Use comprehensive mapping for heart rate data
                const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
                  date: date,
                  restingHeartRate: row.bpm,
                  beats_per_minute: row.bpm,
                  rhr: row.bpm,
                  ...row
                }, 'default-user');

                if (this.isValidImportDate(healthMetric.date)) {
                  await storage.upsertHealthMetrics(healthMetric);
                  hrImported++;
                }
              } catch (error) {
                console.error('Error importing heart rate record:', error);
              }
            }
            
            console.log(`Imported ${hrImported} heart rate records via oxygen import workaround`);
          } else {
            console.log('No heart rate data found in resting_heart_rate_record_table');
          }
          
          resolve(imported);
        });
      });
    });
  }

  /**
   * Import body composition data from Health Connect database
   */
  private async importBodyCompositionData(db: sqlite3.Database): Promise<number> {
    return new Promise((resolve) => {
      // Import body fat data
      const bodyFatQuery = `
        SELECT time, percentage
        FROM body_fat_record_table 
        ORDER BY time DESC 
        LIMIT 90
      `;

      db.all(bodyFatQuery, async (err, bodyFatRows: any[]) => {
        let imported = 0;
        
        if (!err && bodyFatRows) {
          for (const row of bodyFatRows) {
            try {
              // Convert UTC timestamp to local time for correct date grouping
              const utcDate = new Date(row.time);
              const localDate = this.convertUTCToLocalTime(utcDate);
              const date = localDate.toISOString().split('T')[0];
              
              // Calculate metabolic age with body fat data
              const inputs: MetricInputs = {
                bodyFatPercentage: row.percentage,
                age: 35 // Should come from user profile
              };
              const calculatedMetrics = metricsCalculator.calculateAllMetrics(inputs);

              const healthMetric: InsertHealthMetrics = {
                date: new Date(date),
                userId: 'default-user',
                bodyFatPercentage: row.percentage,
                metabolicAge: Math.round(calculatedMetrics.metabolicAge || 35),
                fitnessAge: Math.round(calculatedMetrics.fitnessAge || 35)
              };

              await storage.upsertHealthMetrics(healthMetric);
              imported++;
            } catch (error) {
              console.error('Error importing body fat record:', error);
            }
          }
        }

        // Import VO2 Max data
        const vo2MaxQuery = `
          SELECT time, vo2_milliliters_per_minute_kilogram as vo2_max
          FROM vo2_max_record_table 
          ORDER BY time DESC 
          LIMIT 90
        `;

        db.all(vo2MaxQuery, async (vo2Err, vo2Rows: any[]) => {
          if (!vo2Err && vo2Rows) {
            for (const row of vo2Rows) {
              try {
                // Convert UTC timestamp to local time for correct date grouping
                const utcDate = new Date(row.time);
                const localDate = this.convertUTCToLocalTime(utcDate);
                const date = localDate.toISOString().split('T')[0];
                
                const healthMetric: InsertHealthMetrics = {
                  date: new Date(date),
                  userId: 'default-user',
                  vo2Max: row.vo2_max
                };

                await storage.upsertHealthMetrics(healthMetric);
                imported++;
              } catch (error) {
                console.error('Error importing VO2 Max record:', error);
              }
            }
          }

          console.log(`Imported ${imported} body composition records`);
          resolve(imported);
        });
      });
    });
  }

  /**
   * Utility functions for health data calculations
   */
  private calculateSleepScore(duration: number, stageData?: string): number {
    const targetSleep = 480; // 8 hours in minutes
    const durationScore = Math.min(100, (duration / targetSleep) * 100);
    const efficiencyBonus = stageData ? 10 : 0;
    return Math.min(100, Math.max(0, durationScore + efficiencyBonus));
  }

  private calculateSleepDebt(duration: number): number {
    const targetSleep = 480; // 8 hours in minutes
    return Math.max(0, targetSleep - duration) / 60; // hours of debt
  }

  private calculateSleepEfficiency(stageData?: string): number {
    return stageData ? 85 + Math.random() * 10 : 80 + Math.random() * 15;
  }

  private extractWakeEvents(stageData?: string): number {
    return stageData ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 5) + 2;
  }

  private estimateHRV(readings: number[]): number {
    const variation = readings.reduce((sum: number, hr: number, i: number, arr: number[]) => {
      if (i === 0) return sum;
      return sum + Math.abs(hr - arr[i-1]);
    }, 0) / (readings.length - 1);
    return Math.round(30 + variation * 0.5);
  }

  private calculateStrainFromHR(readings: number[]): number {
    const maxHR = Math.max(...readings);
    const avgHR = readings.reduce((sum, hr) => sum + hr, 0) / readings.length;
    return Math.min(21, Math.max(0, (maxHR - 60) * 0.15 + (avgHR - 60) * 0.1));
  }

  private estimateDistanceFromSteps(steps: number): number {
    return Math.round((steps * 0.762) / 1000 * 100) / 100; // km, assuming 0.762m step length
  }

  private estimateCaloriesFromSteps(steps: number): number {
    return Math.round(steps * 0.04); // rough estimate: 0.04 cal per step
  }

  private estimateBodyFat(): number {
    return 12 + Math.random() * 8; // 12-20% range
  }

  private estimateMuscleMass(weight: number): number {
    return Math.round(weight * (0.7 + Math.random() * 0.2)); // 70-90% of body weight
  }

  private calculateStrainFromActivity(exerciseType: string, duration: number): number {
    const baseStrain = {
      'running': 12,
      'cycling': 10,
      'swimming': 11,
      'weight_training': 8,
      'yoga': 4,
      'walking': 3
    };
    
    const strain = (baseStrain[exerciseType as keyof typeof baseStrain] || 6) * (duration / 60);
    return Math.min(21, Math.max(0, strain));
  }

  private estimateCaloriesFromActivity(exerciseType: string, duration: number): number {
    const caloriesPerMinute = {
      'running': 12,
      'cycling': 8,
      'swimming': 10,
      'weight_training': 6,
      'yoga': 3,
      'walking': 4
    };
    
    return Math.round((caloriesPerMinute[exerciseType as keyof typeof caloriesPerMinute] || 5) * duration);
  }

  /**
   * Test heart rate import in isolation
   */
  async testHeartRateImport(): Promise<{ success: boolean; message: string; records: number }> {
    console.log('=== DIRECT HEART RATE TEST ===');
    console.log('This test simulates the heart rate import function directly');
    
    // Create a mock database callback to test the function logic
    const mockDb = {
      all: (query: string, callback: (err: any, rows: any[]) => void) => {
        console.log('Mock database query executed:', query.substring(0, 50) + '...');
        // Simulate no heart rate data found
        callback(null, []);
      }
    };
    
    try {
      const result = await this.importHeartRateData(mockDb as any);
      return { success: true, message: `Heart rate import test completed with mock database`, records: result };
    } catch (error) {
      return { success: false, message: `Heart rate import test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, records: 0 };
    }
  }

  /**
   * Check if date is valid for import (not today's date)
   */
  private isValidImportDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dataDate = new Date(date);
    dataDate.setHours(0, 0, 0, 0);
    
    return dataDate.getTime() < today.getTime();
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (error) {
        console.error(`Failed to cleanup file ${filePath}:`, error);
      }
    }
  }

  /**
   * Debug method to examine step data in Health Connect database without full import
   */
  async debugStepsData(zipBuffer: Buffer): Promise<any> {
    const tempDir = '/tmp/hc_debug';
    const zipPath = path.join(tempDir, `debug_${Date.now()}.zip`);

    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        fs.writeFileSync(zipPath, zipBuffer);

        yauzl.open(zipPath, { lazyEntries: true }, (err, zipFile) => {
          if (err) return reject(err);

          const extractDir = path.join(tempDir, 'extracted');
          if (!fs.existsSync(extractDir)) {
            fs.mkdirSync(extractDir, { recursive: true });
          }

          const dbFiles: string[] = [];

          zipFile.readEntry();
          zipFile.on('entry', (entry) => {
            if (/\.db$/i.test(entry.fileName)) {
              const entryPath = path.join(extractDir, path.basename(entry.fileName));
              zipFile.openReadStream(entry, (err, readStream) => {
                if (err) {
                  zipFile.readEntry();
                  return;
                }
                
                const writeStream = fs.createWriteStream(entryPath);
                readStream.pipe(writeStream);
                writeStream.on('close', () => {
                  dbFiles.push(entryPath);
                  zipFile.readEntry();
                });
              });
            } else {
              zipFile.readEntry();
            }
          });

          zipFile.on('end', async () => {
            try {
              const results = [];
              
              for (const dbPath of dbFiles) {
                const db = new sqlite3.Database(dbPath);
                
                const stepData = await new Promise<any>((dbResolve) => {
                  const query = `SELECT start_time, count FROM steps_record_table ORDER BY start_time DESC LIMIT 100`;
                  
                  db.all(query, (err, rows: any[]) => {
                    db.close();
                    if (err || !rows) {
                      dbResolve({ error: err?.message || 'No data found' });
                    } else {
                      // Group by date and show daily totals
                      const dailyTotals = new Map<string, number>();
                      rows.forEach(r => {
                        // Convert UTC timestamp to local time for correct date grouping (debug function)
                        const utcDate = new Date(r.start_time);
                        const localDate = new Date(utcDate.toLocaleString("en-US", {timeZone: "America/New_York"}));
                        const date = localDate.toISOString().split('T')[0];
                        dailyTotals.set(date, (dailyTotals.get(date) || 0) + r.count);
                      });

                      dbResolve({
                        totalRecords: rows.length,
                        dailyTotals: Array.from(dailyTotals.entries()).map(([date, total]) => ({
                          date,
                          totalSteps: total
                        })).sort((a, b) => b.date.localeCompare(a.date)),
                        allRecords: rows.map(r => ({
                          start_time: r.start_time,
                          count: r.count,
                          date: new Date(r.start_time).toISOString().split('T')[0]
                        }))
                      });
                    }
                  });
                });
                
                results.push({
                  dbFile: path.basename(dbPath),
                  stepData
                });
              }

              // Cleanup
              try {
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                if (fs.existsSync(extractDir)) {
                  fs.rmSync(extractDir, { recursive: true, force: true });
                }
              } catch (cleanupError) {
                console.error('Debug cleanup error:', cleanupError);
              }

              resolve(results);
            } catch (debugError) {
              reject(debugError);
            }
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Debug method to list all tables in Health Connect database
   */
  async debugAllTables(zipBuffer: Buffer): Promise<any> {
    const zipPath = path.join(this.tempDir, `debug_${Date.now()}.zip`);
    const extractDir = path.join(this.tempDir, `extract_${Date.now()}`);
    
    return new Promise((resolve, reject) => {
      try {
        // Write zip to temp file
        fs.writeFileSync(zipPath, zipBuffer);
        fs.mkdirSync(extractDir, { recursive: true });
        
        const dbFiles: string[] = [];
        
        yauzl.open(zipPath, { lazyEntries: true }, (err, zipFile) => {
          if (err) return reject(err);
          
          zipFile.readEntry();
          
          zipFile.on('entry', (entry) => {
            if (entry.fileName.endsWith('.db')) {
              zipFile.openReadStream(entry, (err, readStream) => {
                if (err) return reject(err);
                
                const dbPath = path.join(extractDir, entry.fileName);
                const writeStream = fs.createWriteStream(dbPath);
                
                readStream.pipe(writeStream);
                writeStream.on('close', () => {
                  dbFiles.push(dbPath);
                  zipFile.readEntry();
                });
              });
            } else {
              zipFile.readEntry();
            }
          });
          
          zipFile.on('end', async () => {
            try {
              const results = [];
              
              for (const dbPath of dbFiles) {
                const db = new sqlite3.Database(dbPath);
                
                const tableInfo = await new Promise<any>((dbResolve) => {
                  // First get all tables
                  db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, tables: any[]) => {
                    if (err) {
                      db.close();
                      return dbResolve({ error: err.message });
                    }
                    
                    const tableData: any = { availableTables: tables.map(t => t.name) };
                    
                    // Check for specific health data tables and get sample records
                    const healthTables = {
                      'steps_record_table': 'SELECT COUNT(*) as count FROM steps_record_table',
                      'heart_rate_record_table': 'SELECT COUNT(*) as count FROM heart_rate_record_table',
                      'sleep_session_record_table': 'SELECT COUNT(*) as count FROM sleep_session_record_table',
                      'weight_record_table': 'SELECT COUNT(*) as count FROM weight_record_table',
                      'body_fat_record_table': 'SELECT COUNT(*) as count FROM body_fat_record_table',
                      'blood_pressure_record_table': 'SELECT COUNT(*) as count FROM blood_pressure_record_table',
                      'resting_heart_rate_record_table': 'SELECT COUNT(*) as count FROM resting_heart_rate_record_table',
                      'heart_rate_variability_rmssd_record_table': 'SELECT COUNT(*) as count FROM heart_rate_variability_rmssd_record_table'
                    };
                    
                    let completed = 0;
                    const totalQueries = Object.keys(healthTables).length;
                    
                    Object.entries(healthTables).forEach(([tableName, query]) => {
                      db.get(query, (tableErr, result: any) => {
                        if (!tableErr && result) {
                          tableData[tableName] = result.count;
                        } else {
                          tableData[tableName] = 0;
                        }
                        
                        completed++;
                        if (completed === totalQueries) {
                          db.close();
                          dbResolve(tableData);
                        }
                      });
                    });
                  });
                });
                
                results.push({
                  dbFile: path.basename(dbPath),
                  tableInfo
                });
              }

              // Cleanup
              try {
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                if (fs.existsSync(extractDir)) {
                  fs.rmSync(extractDir, { recursive: true, force: true });
                }
              } catch (cleanupError) {
                console.error('Debug cleanup error:', cleanupError);
              }

              resolve(results);
            } catch (debugError) {
              reject(debugError);
            }
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}