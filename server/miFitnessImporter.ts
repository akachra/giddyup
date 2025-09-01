import { storage } from './storage';
import { DataSource } from './dataPriorityService';
import { dataFreshnessService } from './dataFreshnessService';

export interface MiFitnessStepData {
  date: string;
  steps: number;
}

export class MiFitnessImporter {
  
  /**
   * Import Mi Fitness step data from user-provided array
   */
  async importStepData(stepDataArray: MiFitnessStepData[], userId: string = 'default-user') {
    let importedCount = 0;
    let skippedCount = 0;
    const results = [];

    for (const dayData of stepDataArray) {
      try {
        const date = new Date(dayData.date);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date in Mi Fitness data:', dayData.date);
          continue;
        }

        const recordedAt = new Date(); // Current timestamp for manual import
        
        // Check if we should overwrite existing data using priority system
        const decision = await dataFreshnessService.shouldOverwriteFieldWithPriority(
          userId,
          'steps',
          date,
          dayData.steps,
          DataSource.MI_FITNESS,
          recordedAt
        );

        if (decision.shouldOverwrite) {
          await storage.upsertHealthMetrics({
            userId,
            date,
            steps: dayData.steps,
            fieldMetadata: {
              steps: {
                recordedAt: recordedAt.toISOString(),
                source: DataSource.MI_FITNESS,
                importMethod: 'manual_entry'
              }
            }
          });
          
          results.push({
            date: dayData.date,
            steps: dayData.steps,
            status: 'imported',
            reason: 'Mi Fitness data imported successfully'
          });
          importedCount++;
        } else {
          results.push({
            date: dayData.date,
            steps: dayData.steps,
            status: 'skipped',
            reason: decision.reason
          });
          skippedCount++;
        }
      } catch (error) {
        console.error('Error importing Mi Fitness data for date:', dayData.date, error);
        results.push({
          date: dayData.date,
          steps: dayData.steps,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
        skippedCount++;
      }
    }

    return {
      imported: importedCount,
      skipped: skippedCount,
      results
    };
  }
}

export const miFitnessImporter = new MiFitnessImporter();