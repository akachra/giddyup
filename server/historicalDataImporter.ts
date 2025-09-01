import { googleDriveService } from './googleDrive';
import { HealthConnectImporter } from './healthConnectImporter';
import { storage } from './storage';

export class HistoricalDataImporter {
  private healthConnectImporter: HealthConnectImporter;

  constructor() {
    this.healthConnectImporter = new HealthConnectImporter();
  }

  /**
   * Import the single cumulative Health Connect zip file from Google Drive
   * This contains all historical health data in one file
   */
  async importAllHistoricalData(): Promise<{
    success: boolean;
    totalFilesProcessed: number;
    totalRecordsImported: number;
    dateRange: { earliest: string; latest: string } | null;
    error?: string;
  }> {
    try {
      console.log('Starting import of cumulative Health Connect data from Google Drive...');

      // Get the single Health Connect zip file from Google Drive
      const zipFiles = await googleDriveService.listHealthConnectFiles();
      console.log(`Found ${zipFiles.length} Health Connect zip files in Google Drive`);

      if (zipFiles.length === 0) {
        return {
          success: true,
          totalFilesProcessed: 0,
          totalRecordsImported: 0,
          dateRange: null,
          error: 'No Health Connect zip file found in Google Drive'
        };
      }

      if (zipFiles.length > 1) {
        console.warn(`Expected 1 Health Connect file but found ${zipFiles.length}. Processing the most recent one.`);
      }

      // Get the most recent file (should be the only one)
      const file = zipFiles.sort((a, b) => 
        new Date(b.modifiedTime || b.createdTime).getTime() - new Date(a.modifiedTime || a.createdTime).getTime()
      )[0];

      console.log(`Processing cumulative Health Connect file: ${file.name}`);
      
      // Download the zip file
      const zipBuffer = await googleDriveService.downloadFile(file.id);
      
      // Import data from this zip file
      const result = await this.healthConnectImporter.importFromZipFile(zipBuffer);
      
      console.log(`Health Connect import result:`, JSON.stringify(result, null, 2));
      
      if (result.success) {
        if (result.recordsImported > 0) {
          console.log(`Successfully imported ${result.recordsImported} records from ${file.name}`);
        } else {
          console.log(`Health Connect import completed successfully: No new records imported (data protected by freshness/priority system)`);
        }
        
        // Calculate date range from the file modification time
        const fileDate = new Date(file.modifiedTime || file.createdTime);
        const dateRange = {
          earliest: fileDate.toISOString().split('T')[0],
          latest: new Date().toISOString().split('T')[0]
        };

        return {
          success: true,
          totalFilesProcessed: 1,
          totalRecordsImported: result.recordsImported,
          dateRange
        };
      } else {
        return {
          success: false,
          totalFilesProcessed: 0,
          totalRecordsImported: 0,
          dateRange: null,
          error: result.error || 'Failed to import Health Connect data'
        };
      }

    } catch (error) {
      console.error('Historical data import failed:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
      return {
        success: false,
        totalFilesProcessed: 0,
        totalRecordsImported: 0,
        dateRange: null,
        error: error instanceof Error ? error.message : 'Unknown error during historical import'
      };
    }
  }

  /**
   * Get the latest import timestamp to enable incremental imports
   */
  async getLatestImportDate(): Promise<Date | null> {
    try {
      const latestDate = await storage.getLatestHealthMetricsDate('default-user');
      return latestDate || null;
    } catch (error) {
      console.error('Error getting latest import date:', error);
      return null;
    }
  }

  /**
   * Check if the cumulative Health Connect file has been updated since last import
   * If yes, re-import the entire file (upsert handles duplicates)
   */
  async importIncrementalData(sinceDate?: Date): Promise<{
    success: boolean;
    newFilesProcessed: number;
    newRecordsImported: number;
    error?: string;
  }> {
    try {
      const cutoffDate = sinceDate || await this.getLatestImportDate() || new Date(0);
      console.log(`Checking for Health Connect file updates since: ${cutoffDate.toISOString()}`);

      // Get the single Health Connect zip file from Google Drive
      const allFiles = await googleDriveService.listHealthConnectFiles();
      
      if (allFiles.length === 0) {
        return {
          success: true,
          newFilesProcessed: 0,
          newRecordsImported: 0
        };
      }

      if (allFiles.length > 1) {
        console.warn(`Expected 1 Health Connect file but found ${allFiles.length}. Processing the most recent one.`);
      }

      // Get the most recent file (should be the only one)
      const file = allFiles.sort((a, b) => 
        new Date(b.modifiedTime || b.createdTime).getTime() - new Date(a.modifiedTime || a.createdTime).getTime()
      )[0];

      const fileModifiedDate = new Date(file.modifiedTime || file.createdTime);
      
      // Check if the file has been updated since our cutoff date
      if (fileModifiedDate <= cutoffDate) {
        console.log(`Health Connect file ${file.name} has not been updated since last import`);
        return {
          success: true,
          newFilesProcessed: 0,
          newRecordsImported: 0
        };
      }

      console.log(`Health Connect file ${file.name} has been updated, re-importing...`);
      
      const zipBuffer = await googleDriveService.downloadFile(file.id);
      const result = await this.healthConnectImporter.importFromZipFile(zipBuffer);
      
      if (result.success) {
        console.log(`Successfully imported ${result.recordsImported} records from updated file ${file.name}`);
        return {
          success: true,
          newFilesProcessed: 1,
          newRecordsImported: result.recordsImported
        };
      } else {
        return {
          success: false,
          newFilesProcessed: 0,
          newRecordsImported: 0,
          error: result.error || 'Failed to import updated Health Connect file'
        };
      }

    } catch (error) {
      console.error('Incremental import failed:', error);
      return {
        success: false,
        newFilesProcessed: 0,
        newRecordsImported: 0,
        error: error instanceof Error ? error.message : 'Unknown error during incremental import'
      };
    }
  }

  /**
   * Clean up synthetic data added for testing purposes
   */
  async cleanupSyntheticData(): Promise<number> {
    try {
      console.log('Cleaning up synthetic test data...');
      
      // Remove synthetic data created after the Health Connect import timestamp
      const syntheticDataTimestamp = new Date('2025-08-06 21:35:59');
      
      // This would require a database method to delete records by timestamp
      // For now, we'll document this for manual cleanup if needed
      console.log('Synthetic data cleanup would require database-level deletion');
      
      return 0;
    } catch (error) {
      console.error('Error cleaning up synthetic data:', error);
      return 0;
    }
  }
}

export const historicalDataImporter = new HistoricalDataImporter();