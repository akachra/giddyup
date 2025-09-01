import { google } from 'googleapis';
import { storage } from './storage';
import { HealthConnectImporter } from './healthConnectImporter';
import { ImportLogger } from './importLogger';
import fs from 'fs';
import path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

export class GoogleDriveService {
  private drive: any;
  private auth: any;
  private oauthClient: any;
  private oauthDrive: any;

  constructor() {
    this.initializeAuth();
    this.initializeOAuth();
  }

  private async initializeAuth() {
    try {
      // Initialize Google Auth with service account
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
      if (!serviceAccountKey) {
        console.log('Google Drive service account key not configured - skipping Google Drive integration');
        return;
      }

      let credentials;
      try {
        // Try to parse the service account key as JSON
        credentials = JSON.parse(serviceAccountKey);
      } catch (parseError) {
        console.log('Google Drive service account key is not valid JSON - skipping Google Drive integration');
        console.log('Key format issue:', parseError instanceof Error ? parseError.message : 'Unknown parsing error');
        return;
      }

      // Validate required fields in the service account
      if (!credentials.client_email || !credentials.private_key) {
        console.log('Google Drive service account key missing required fields (client_email, private_key) - skipping Google Drive integration');
        return;
      }
      
      this.auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: SCOPES
      });

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      console.log('Google Drive service initialized successfully');
      
      // Test the authentication by making a simple API call
      await this.testConnection();
    } catch (error) {
      console.log('Google Drive service initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testConnection() {
    try {
      if (!this.drive) return;
      
      // Simple test to verify the authentication works
      await this.drive.files.list({ pageSize: 1 });
      console.log('Google Drive authentication test successful');
    } catch (error) {
      console.log('Google Drive authentication test failed:', error instanceof Error ? error.message : 'Unknown error');
      this.drive = null; // Disable service if auth test fails
    }
  }

  private async initializeOAuth() {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        console.log('Google OAuth credentials not configured - OAuth backup uploads disabled');
        return;
      }

      this.oauthClient = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'http://localhost:5000/auth/google/callback' // Not used for service uploads but required
      );

      // For backup uploads, we'll need to use stored refresh tokens from user authentication
      // This will be handled when we need to upload
      console.log('Google OAuth client initialized for backup uploads');
    } catch (error) {
      console.log('Google OAuth initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Upload file using OAuth authentication (for backup files)
   * This method uses the same OAuth credentials as the health data sync
   */
  async uploadFileWithOAuth(fileData: {
    name: string;
    content: Buffer;
    mimeType: string;
    description?: string;
    parents?: string[];
  }): Promise<{ id: string; name: string }> {
    try {
      if (!this.oauthClient) {
        throw new Error('OAuth client not initialized - cannot upload backup files');
      }

      // Try using shared drive approach with service account
      console.log('Attempting backup upload using service account to shared drive...');
      
      // Use existing service account method - it works for shared drives
      return await this.uploadFile(fileData);
    } catch (error) {
      console.error('Error uploading backup file with OAuth:', error);
      throw error;
    }
  }

  async listHealthConnectFiles(): Promise<any[]> {
    try {
      if (!this.drive) {
        console.log('Google Drive service not initialized');
        return [];
      }

      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (!folderId) {
        console.log('Google Drive folder ID not configured');
        return [];
      }

      // List only actual Health Connect zip files in the health data folder
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and ((name contains 'Health Connect' and name contains '.zip') or (name contains 'health_connect' and name contains '.zip') or (name contains 'healthconnect' and name contains '.zip')) and trashed = false`,
        fields: 'files(id, name, createdTime, modifiedTime, size)',
        orderBy: 'createdTime desc',
        pageSize: 100
      });

      const files = response.data.files || [];
      console.log(`Found ${files.length} Health Connect zip files in Google Drive:`);
      files.forEach((file: any) => {
        console.log(`- ${file.name} (${file.createdTime}) - ${Math.round((file.size || 0) / 1024)}KB`);
      });
      return files;
    } catch (error) {
      console.error('Error listing Health Connect files:', error);
      return [];
    }
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'arraybuffer' });

      return Buffer.from(response.data);
    } catch (error) {
      console.error(`Error downloading file ${fileId}:`, error);
      throw error;
    }
  }

  async listHealthFiles(): Promise<any[]> {
    try {
      if (!this.drive) {
        console.log('Google Drive service not initialized');
        return [];
      }

      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (!folderId) {
        console.log('Google Drive folder ID not configured');
        return [];
      }

      console.log(`Searching for health files in Google Drive folder: ${folderId}`);
      
      // First, let's verify we can access the folder
      try {
        const folderInfo = await this.drive.files.get({
          fileId: folderId,
          fields: 'id, name, mimeType'
        });
        console.log(`Folder info:`, folderInfo.data);
      } catch (folderError) {
        console.error(`Cannot access folder ${folderId}:`, folderError instanceof Error ? folderError.message : 'Unknown error');
        console.log('Possible solutions:');
        console.log('1. Verify the folder ID is correct');
        console.log('2. Share the folder with the service account email from the credentials');
        console.log('3. Make sure the folder exists and is accessible');
        return [];
      }
      
      // First, let's try to list all files in the folder to see what's there
      const allFilesResponse = await this.drive.files.list({
        q: `'${folderId}' in parents`,
        fields: 'files(id, name, modifiedTime, size, mimeType)',
        orderBy: 'modifiedTime desc'
      });
      
      const allFiles = allFilesResponse.data.files || [];
      console.log(`Found ${allFiles.length} total files in the folder:`, allFiles.map((f: any) => f.name));

      // Now search for health-related files including RENPHO
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and (name contains 'health' or name contains 'fitness' or name contains 'HealthConnect' or name contains 'whoop' or name contains 'fitbit' or name contains 'RENPHO' or name contains 'renpho')`,
        fields: 'files(id, name, modifiedTime, size, mimeType)',
        orderBy: 'modifiedTime desc'
      });

      const healthFiles = response.data.files || [];
      console.log(`Found ${healthFiles.length} health-related files:`, healthFiles.map((f: any) => f.name));

      return healthFiles;
    } catch (error) {
      console.error('Error listing health files:', error);
      return [];
    }
  }

  /**
   * Search broadly across Google Drive for all health-related files
   */
  async searchAllHealthFiles(): Promise<{
    folders: any[];
    zipFiles: any[];
    dbFiles: any[];
    otherFiles: any[];
  }> {
    try {
      // Search for all health-related files and folders across the entire drive
      const response = await this.drive.files.list({
        q: `(name contains 'health' or name contains 'Health' or name contains 'connect' or name contains 'Connect' or name contains 'export' or name contains '.zip' or name contains '.db' or name contains 'RENPHO' or name contains 'renpho') and trashed = false`,
        fields: 'files(id, name, createdTime, modifiedTime, size, parents, mimeType)',
        orderBy: 'createdTime desc',
        pageSize: 200
      });

      const files = response.data.files || [];
      console.log(`Found ${files.length} health-related files across Google Drive`);
      
      const folders = files.filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder');
      const zipFiles = files.filter((f: any) => f.name?.includes('.zip'));
      const dbFiles = files.filter((f: any) => f.name?.includes('.db'));
      const otherFiles = files.filter((f: any) => 
        f.mimeType !== 'application/vnd.google-apps.folder' && 
        !f.name?.includes('.zip') && 
        !f.name?.includes('.db')
      );

      console.log(`Categorized: ${folders.length} folders, ${zipFiles.length} zip files, ${dbFiles.length} db files, ${otherFiles.length} other files`);

      return {
        folders,
        zipFiles,
        dbFiles,
        otherFiles
      };
    } catch (error) {
      console.error('Error searching all health files:', error);
      return {
        folders: [],
        zipFiles: [],
        dbFiles: [],
        otherFiles: []
      };
    }
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(fileData: {
    name: string;
    content: Buffer;
    mimeType: string;
    description?: string;
    parents?: string[];
  }): Promise<{ id: string; name: string }> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      // Create a temporary file for the upload
      const tempDir = '/tmp';
      const tempFileName = `backup_${Date.now()}_${fileData.name}`;
      const tempFilePath = path.join(tempDir, tempFileName);
      
      // Write buffer to temporary file
      fs.writeFileSync(tempFilePath, fileData.content);
      
      try {
        const metadata = {
          name: fileData.name,
          description: fileData.description,
          parents: fileData.parents
        };

        const response = await this.drive.files.create({
          requestBody: metadata,
          media: {
            mimeType: fileData.mimeType,
            body: fs.createReadStream(tempFilePath)
          },
          fields: 'id, name'
        });

        console.log(`✅ File uploaded to Google Drive: ${response.data.name} (ID: ${response.data.id})`);
        
        return {
          id: response.data.id,
          name: response.data.name
        };
      } finally {
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary file:', tempFilePath);
        }
      }
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  /**
   * Find RENPHO files specifically and return the most recent one
   */
  async findRenphoFiles(): Promise<any[]> {
    try {
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (!folderId) {
        console.log('Google Drive folder ID not configured');
        return [];
      }

      console.log(`Searching for RENPHO files in Google Drive folder: ${folderId}`);
      
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and (name contains 'RENPHO' or name contains 'renpho') and trashed = false`,
        fields: 'files(id, name, createdTime, modifiedTime, size, mimeType)',
        orderBy: 'modifiedTime desc', // Most recent first
        pageSize: 10
      });

      const renphoFiles = response.data.files || [];
      console.log(`Found ${renphoFiles.length} RENPHO files:`);
      renphoFiles.forEach((file: any) => {
        console.log(`- ${file.name} (modified: ${file.modifiedTime}) - ${Math.round((file.size || 0) / 1024)}KB`);
      });

      return renphoFiles;
    } catch (error) {
      console.error('Error finding RENPHO files:', error);
      return [];
    }
  }

  async syncHealthDataFromDrive(): Promise<{ success: boolean; message: string; recordsImported: number; syncMethod: string; filesProcessed: number; errors: string[] }> {
    const logger = new ImportLogger('Health Connect');
    let totalRecordsImported = 0;
    const result = {
      success: true,
      filesProcessed: 0,
      errors: [] as string[]
    };

    try {
      logger.logInfo('Starting Health Connect sync from Google Drive', 'Checking for Health Connect zip files and RENPHO CSV files');
      
      // Process both Health Connect and RENPHO files
      const healthConnectFiles = await this.listHealthConnectFiles();
      const renphoFiles = await this.findRenphoFiles();
      
      console.log(`Found ${healthConnectFiles.length} Health Connect zip files and ${renphoFiles.length} RENPHO files in Google Drive`);
      logger.logInfo('Google Drive file search completed', `${healthConnectFiles.length} Health Connect files, ${renphoFiles.length} RENPHO files`);
      
      if (healthConnectFiles.length === 0 && renphoFiles.length === 0) {
        logger.logError('No health files found', '', 'No Health Connect zip files or RENPHO files found in Google Drive folder');
        await logger.saveToDB();
        return {
          success: false,
          message: 'No health files found in Google Drive',
          recordsImported: 0,
          syncMethod: 'Google Drive',
          filesProcessed: 0,
          errors: ['No Health Connect zip files or RENPHO files found in configured Google Drive folder']
        };
      }
      
      for (const file of healthConnectFiles) {
        try {
          console.log(`Processing Health Connect file: ${file.name}`);
          logger.logInfo(`Processing Health Connect file`, `${file.name} (${(file.size || 0) / 1024 / 1024}MB)`);
          
          const fileContent = await this.downloadFile(file.id);
          
          // Only process Health Connect zip files
          if (file.name.endsWith('.zip') || file.mimeType === 'application/zip' || file.mimeType === 'application/x-zip-compressed') {
            const healthConnectImporter = new HealthConnectImporter();
            const importResult = await healthConnectImporter.importFromZipFile(fileContent);
            
            if (importResult && importResult.success) {
              const recordsImported = importResult.recordsImported || 0;
              totalRecordsImported += recordsImported;
              console.log(`Successfully imported ${recordsImported} records from ${file.name}`);
              logger.logSuccess(`Health Connect import completed`, `${recordsImported} records from ${file.name}`);
            } else {
              const errorMsg = importResult ? (importResult.error || importResult.message || 'Import failed') : 'Import result was undefined';
              result.errors.push(`Failed to import ${file.name}: ${errorMsg}`);
              logger.logError(`Health Connect import failed`, '', `${file.name}: ${errorMsg}`);
            }
          } else {
            console.log(`Skipping non-zip file: ${file.name}`);
            logger.logInfo(`Skipping file`, `${file.name} (not a zip file)`);
            continue;
          }
          
          result.filesProcessed++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
          console.error(`Error processing ${file.name}:`, error);
          result.errors.push(`Failed to process ${file.name}: ${errorMessage}`);
          logger.logError(`File processing error`, '', `${file.name}: ${errorMessage}`);
          result.success = false;
        }
      }

      // Process RENPHO files (use most recent one only)
      if (renphoFiles.length > 0) {
        console.log(`\n=== RENPHO FILE SELECTION ===`);
        console.log(`Found ${renphoFiles.length} RENPHO file(s) in Google Drive:`);
        
        renphoFiles.forEach((file: any, index: number) => {
          const modifiedDate = file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : 'Unknown';
          const sizeKB = file.size ? Math.round(file.size / 1024) : 0;
          const isSelected = index === 0 ? ' ← SELECTED (most recent)' : '';
          console.log(`  ${index + 1}. ${file.name} (${modifiedDate}, ${sizeKB}KB)${isSelected}`);
        });
        
        const mostRecentRenpho = renphoFiles[0]; // Already sorted by modifiedTime desc
        console.log(`\nProcessing selected RENPHO file: ${mostRecentRenpho.name}`);
        console.log(`=== END RENPHO SELECTION ===\n`);
        
        try {
          const fileContent = await this.downloadFile(mostRecentRenpho.id);
          
          // Always treat RENPHO files as CSV regardless of extension or MIME type
          const { RenphoImporter } = await import('./renphoImporter');
          const renphoImporter = new RenphoImporter();
          
          // Force CSV processing by creating a fake file object with CSV properties
          const fakeFile = {
            name: mostRecentRenpho.name.includes('.csv') ? mostRecentRenpho.name : `${mostRecentRenpho.name}.csv`,
            mimeType: 'text/csv'
          };
          
          console.log(`Starting RENPHO CSV processing for file: ${mostRecentRenpho.name}`);
          const renphoResult = await renphoImporter.processRenphoFile(fileContent, fakeFile);
          
          if (renphoResult > 0) {
            totalRecordsImported += renphoResult;
            console.log(`✅ Successfully imported ${renphoResult} records from RENPHO file: ${mostRecentRenpho.name}`);
          } else {
            console.log(`⚠️  No records imported from RENPHO file: ${mostRecentRenpho.name}`);
          }
          
          result.filesProcessed++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
          console.error(`❌ Error processing RENPHO file ${mostRecentRenpho.name}:`, error);
          result.errors.push(`Failed to process RENPHO file ${mostRecentRenpho.name}: ${errorMessage}`);
        }
      } else {
        console.log('No RENPHO files found in Google Drive folder');
      }

      const success = result.errors.length === 0;
      const fileTypes = [];
      if (healthConnectFiles.length > 0) fileTypes.push(`${healthConnectFiles.length} Health Connect zip files`);
      if (renphoFiles.length > 0) fileTypes.push(`${renphoFiles.length > 0 ? 1 : 0} RENPHO file (most recent)`);
      
      const message = success 
        ? `Successfully synced ${totalRecordsImported} records from ${fileTypes.join(' and ')}`
        : `Synced ${totalRecordsImported} records from ${result.filesProcessed} files with ${result.errors.length} errors`;

      // Log final results
      if (success) {
        logger.logSuccess('Health Connect sync completed', `${totalRecordsImported} total records from ${result.filesProcessed} files`);
      } else {
        logger.logError('Health Connect sync completed with errors', '', `${result.errors.length} errors occurred`);
      }
      
      await logger.saveToDB();

      return {
        success,
        message,
        recordsImported: totalRecordsImported,
        syncMethod: 'Google Drive',
        filesProcessed: result.filesProcessed,
        errors: result.errors
      };
    } catch (error) {
      console.error('Error syncing health data from Drive:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.logError('Health Connect sync failed', '', errorMessage);
      await logger.saveToDB();
      
      return {
        success: false,
        message: `Google Drive sync failed: ${errorMessage}`,
        recordsImported: totalRecordsImported,
        syncMethod: 'Google Drive',
        filesProcessed: 0,
        errors: [errorMessage]
      };
    }
  }

  private async processHealthJSON(content: Buffer, fileName: string): Promise<void> {
    try {
      const data = JSON.parse(content.toString());
      
      // Handle different JSON formats
      if (fileName.toLowerCase().includes('healthconnect')) {
        await this.processHealthConnectData(data);
      } else if (fileName.toLowerCase().includes('whoop')) {
        await this.processWhoopData(data);
      } else {
        // Generic JSON format
        await this.processGenericHealthData(data);
      }
    } catch (error) {
      console.error('Error processing health JSON:', error);
      throw error;
    }
  }

  private async processHealthConnectData(data: any): Promise<void> {
    if (data.records) {
      for (const record of data.records) {
        const metrics = this.convertHealthConnectRecord(record);
        if (metrics) {
          await storage.upsertHealthMetrics(metrics);
        }
      }
    }
  }

  private async processWhoopData(data: any): Promise<void> {
    if (data.recovery) {
      for (const day of data.recovery) {
        const metrics = this.convertWhoopRecord(day);
        if (metrics) {
          await storage.upsertHealthMetrics(metrics);
        }
      }
    }
  }

  private async processGenericHealthData(data: any): Promise<void> {
    const records = Array.isArray(data) ? data : [data];
    
    for (const record of records) {
      const metrics = this.convertGenericRecord(record);
      if (metrics) {
        await storage.createHealthMetrics(metrics);
      }
    }
  }

  private async processHealthCSV(content: Buffer, fileName: string): Promise<void> {
    try {
      const lines = content.toString().split('\n').filter(line => line.trim());
      if (lines.length < 2) return;
      
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const record: any = {};
          
          headers.forEach((header, index) => {
            if (values[index]) {
              record[header] = values[index];
            }
          });
          
          const metrics = this.convertGenericRecord(record);
          if (metrics) {
            await storage.upsertHealthMetrics(metrics);
          }
        }
      }
    } catch (error) {
      console.error('Error processing health CSV:', error);
      throw error;
    }
  }

  private convertHealthConnectRecord(record: any): any {
    // Use comprehensive mapping to avoid data loss
    return this.convertGenericRecord({
      ...record,
      date: record.startTime || record.date,
      sleepDuration: record.durationMinutes,
      deepSleep: record.deepSleepMinutes,
      remSleep: record.remSleepMinutes,
      lightSleep: record.lightSleepMinutes,
      distance: record.distanceKm,
      caloriesBurned: record.calories,
      weight: record.weightKg,
      weightKg: record.weightKg
    });
  }

  private convertWhoopRecord(record: any): any {
    // Use comprehensive mapping to avoid data loss
    return this.convertGenericRecord({
      ...record,
      // Map Whoop-specific field names to generic names
      recoveryScore: record.recovery_score,
      sleepScore: record.sleep_performance_percentage,
      sleepDuration: record.sleep_duration_minutes,
      deepSleep: record.slow_wave_sleep_minutes,
      remSleep: record.rem_sleep_minutes,
      lightSleep: record.light_sleep_minutes,
      restingHeartRate: record.resting_heart_rate,
      heartRateVariability: record.hrv_rmssd,
      strainScore: record.strain_score
    });
  }

  private convertGenericRecord(record: any): any {
    const cleanRecord: any = {
      userId: 'default-user',
      date: new Date(record.date || record.Date || record.timestamp || new Date())
    };

    // COMPREHENSIVE field mappings - covers ALL schema fields to prevent data loss
    const fieldMappings = {
      // Sleep metrics
      sleepScore: ['sleepScore', 'sleep_score', 'SleepScore'],
      sleepDuration: ['sleepDuration', 'sleep_duration', 'minutesAsleep', 'sleep_minutes', 'durationMinutes'],
      deepSleep: ['deepSleep', 'deep_sleep', 'deepSleepMinutes', 'slow_wave_sleep_minutes'],
      remSleep: ['remSleep', 'rem_sleep', 'remSleepMinutes', 'rem_sleep_minutes'],
      lightSleep: ['lightSleep', 'light_sleep', 'lightSleepMinutes', 'light_sleep_minutes'],
      sleepEfficiency: ['sleepEfficiency', 'sleep_efficiency', 'efficiency'],
      wakeEvents: ['wakeEvents', 'wake_events', 'awakenings', 'interruptions'],
      sleepDebt: ['sleepDebt', 'sleep_debt', 'debt_minutes'],
      
      // Recovery & performance metrics
      recoveryScore: ['recoveryScore', 'recovery_score', 'recovery'],
      strainScore: ['strainScore', 'strain_score', 'strain'],
      readinessScore: ['readinessScore', 'readiness_score', 'readiness'],
      trainingLoad: ['trainingLoad', 'training_load', 'load'],
      
      // Heart metrics
      restingHeartRate: ['restingHeartRate', 'resting_heart_rate', 'rhr'],
      heartRateVariability: ['heartRateVariability', 'heart_rate_variability', 'hrv', 'hrv_rmssd'],
      
      // Body composition
      weight: ['weight', 'weightKg', 'weight_kg', 'body_weight'],
      bodyFatPercentage: ['bodyFatPercentage', 'body_fat_percentage', 'bodyFat', 'fat_percentage'],
      muscleMass: ['muscleMass', 'muscle_mass', 'lean_mass', 'muscle_kg'],
      bmi: ['bmi', 'BMI', 'body_mass_index'],
      bmr: ['bmr', 'BMR', 'basal_metabolic_rate'],
      visceralFat: ['visceralFat', 'visceral_fat', 'VisceralFat'],
      waterPercentage: ['waterPercentage', 'water_percentage', 'body_water', 'WaterPercentage'],
      boneMass: ['boneMass', 'bone_mass', 'BoneMass', 'bone_kg'],
      proteinPercentage: ['proteinPercentage', 'protein_percentage', 'ProteinPercentage'],
      subcutaneousFat: ['subcutaneousFat', 'subcutaneous_fat', 'SubcutaneousFat'],
      leanBodyMass: ['leanBodyMass', 'lean_body_mass', 'LeanBodyMass', 'ffm'],
      bodyScore: ['bodyScore', 'body_score', 'BodyScore', 'rating'],
      
      // Vital signs
      bloodPressureSystolic: ['bloodPressureSystolic', 'blood_pressure_systolic', 'systolic', 'bp_systolic'],
      bloodPressureDiastolic: ['bloodPressureDiastolic', 'blood_pressure_diastolic', 'diastolic', 'bp_diastolic'],
      oxygenSaturation: ['oxygenSaturation', 'oxygen_saturation', 'spo2', 'SpO2'],
      skinTemperature: ['skinTemperature', 'skin_temperature', 'temp', 'temperature'],
      respiratoryRate: ['respiratoryRate', 'respiratory_rate', 'breathing_rate'],
      stressLevel: ['stressLevel', 'stress_level', 'stress'],
      
      // Activity metrics
      steps: ['steps', 'stepCount', 'daily_steps', 'step_count'],
      distance: ['distance', 'distanceKm', 'distance_km'],
      caloriesBurned: ['caloriesBurned', 'calories', 'calories_burned', 'active_calories'],
      activityRingCompletion: ['activityRingCompletion', 'activity_ring_completion', 'ring_completion'],
      
      // Advanced metrics
      metabolicAge: ['metabolicAge', 'metabolic_age', 'MetabolicAge'],
      fitnessAge: ['fitnessAge', 'fitness_age', 'FitnessAge'],
      vo2Max: ['vo2Max', 'vo2_max', 'VO2Max', 'vo2max'],
      healthspan: ['healthspan', 'healthspan_score', 'biological_age'],
      
      // Women's health
      menstrualCycleDay: ['menstrualCycleDay', 'menstrual_cycle_day', 'cycle_day'],
      cyclePhase: ['cyclePhase', 'cycle_phase', 'menstrual_phase']
    };

    Object.entries(fieldMappings).forEach(([targetField, possibleNames]) => {
      for (const name of possibleNames) {
        if (record[name] !== undefined && record[name] !== null && record[name] !== '') {
          // Handle text fields (cyclePhase, bodyType)
          if (targetField === 'cyclePhase' || targetField === 'bodyType') {
            cleanRecord[targetField] = record[name];
            break;
          }
          
          // Handle numeric fields
          const value = parseFloat(record[name]) || parseInt(record[name]);
          if (!isNaN(value)) {
            cleanRecord[targetField] = value;
          }
          break;
        }
      }
    });
    
    // Handle bodyType separately if not caught above
    if (!cleanRecord.bodyType) {
      const bodyType = record.body_type || record.BodyType || record.type || record.Type;
      if (bodyType && typeof bodyType === 'string') {
        cleanRecord.bodyType = bodyType;
      }
    }

    const hasData = Object.keys(cleanRecord).some(key => 
      key !== 'userId' && key !== 'date' && cleanRecord[key] !== undefined
    );

    return hasData ? cleanRecord : null;
  }

  private async processHealthZip(content: Buffer, fileName: string): Promise<void> {
    try {
      const healthConnectImporter = new HealthConnectImporter();
      
      const results = await healthConnectImporter.importFromZipFile(content);
      
      if (Array.isArray(results)) {
        let totalRecords = 0;
        for (const result of results) {
          if (result.success) {
            totalRecords += result.recordsImported || 0;
          } else {
            console.error(`Error in batch import: ${result.error}`);
          }
        }
        console.log(`Processed ${totalRecords} total records from ${fileName}`);
      } else if (results.success) {
        console.log(`Processed ${results.recordsImported} records from ${fileName}`);
      } else {
        throw new Error(results.error || 'Failed to process zip file');
      }
    } catch (error) {
      console.error('Error processing health zip:', error);
      throw error;
    }
  }

  private async processHealthDatabase(content: Buffer, fileName: string): Promise<void> {
    try {
      const healthConnectImporter = new HealthConnectImporter();
      
      const result = await healthConnectImporter.importFromDatabase('temp_db_path');
      
      if (!result.success) {
        throw new Error('Failed to process database file');
      }
      
      console.log(`Processed ${result.recordsImported} records from ${fileName}`);
    } catch (error) {
      console.error('Error processing health database:', error);
      throw error;
    }
  }

  async getSyncStatus(): Promise<{ lastSync: Date | null; availableFiles: any[]; syncEnabled: boolean }> {
    try {
      const files = await this.listHealthFiles();
      return {
        lastSync: files.length > 0 ? new Date(files[0].modifiedTime) : null,
        availableFiles: files.slice(0, 10),
        syncEnabled: !!process.env.GOOGLE_DRIVE_FOLDER_ID && !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE
      };
    } catch (error) {
      return {
        lastSync: null,
        availableFiles: [],
        syncEnabled: false
      };
    }
  }
}

export const googleDriveService = new GoogleDriveService();