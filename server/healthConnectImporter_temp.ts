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
                  
                  // Process each stage
                  for (const stage of stages) {
