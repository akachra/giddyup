import * as cron from 'node-cron';
import { googleDriveService } from './googleDrive';

const DEFAULT_USER_ID = "default-user";

/**
 * Scheduled task to automatically import Health Connect data from Google Drive
 * Runs daily at 6:00 AM
 */
export function setupHealthImportScheduler(storage: any) {
  // Run daily at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('Starting scheduled Health Connect import...');
    
    try {
      // Use the existing Google Drive service
      const result = await googleDriveService.syncHealthDataFromDrive();
      
      if (result.success && result.filesProcessed > 0) {
        console.log(`Successfully imported ${result.filesProcessed} files from Google Drive`);
      } else {
        console.log('No new health data files found or sync failed');
      }
      
    } catch (error) {
      console.error('Scheduled health import failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/New_York" // Adjust to your timezone
  });
  
  console.log('Health Connect import scheduler started - runs daily at 6:00 AM');
}

/**
 * Manual trigger for immediate import (for testing)
 */
export async function triggerManualImport(storage: any): Promise<{ imported: number; message: string }> {
  try {
    const result = await googleDriveService.syncHealthDataFromDrive();
    
    return { 
      imported: result.filesProcessed, 
      message: result.success ? 
        `Successfully imported ${result.filesProcessed} files` : 
        `Import failed: ${result.errors.join(', ')}`
    };
    
  } catch (error) {
    console.error('Manual health import failed:', error);
    throw error;
  }
}