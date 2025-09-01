import { exec } from 'child_process';
import { promisify } from 'util';
import { GoogleDriveService } from './googleDrive';
import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import zlib from 'zlib';

const execAsync = promisify(exec);


export class DatabaseBackupService {
  private googleDriveService: GoogleDriveService;
  private backupDir: string;

  constructor() {
    this.googleDriveService = new GoogleDriveService();
    this.backupDir = path.join(process.cwd(), 'backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a comprehensive database backup
   */
  async createDatabaseBackup(): Promise<{
    success: boolean;
    backupFile?: string;
    googleDriveFileId?: string;
    error?: string;
  }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '');
    const backupFileName = `giddyup_backup_${timestamp}.sql`;
    const compressedFileName = `giddyup_backup_${timestamp}.sql.gz`;
    const backupPath = path.join(this.backupDir, backupFileName);
    const compressedPath = path.join(this.backupDir, compressedFileName);

    try {
      console.log(`🗄️ Starting database backup at ${new Date().toISOString()}`);

      // Create database dump using pg_dump
      const dumpCommand = `pg_dump "${process.env.DATABASE_URL}" --clean --if-exists --create --verbose > "${backupPath}"`;
      
      console.log('📊 Creating database dump...');
      await execAsync(dumpCommand);
      
      // Verify backup file was created and has content
      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }
      
      console.log(`✅ Database dump created: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Compress the backup file
      console.log('🗜️ Compressing backup file...');
      await this.compressFile(backupPath, compressedPath);
      
      const compressedStats = fs.statSync(compressedPath);
      console.log(`✅ Backup compressed: ${(compressedStats.size / 1024 / 1024).toFixed(2)} MB`);

      // Try to upload to Google Drive
      console.log('☁️ Uploading to Google Drive...');
      let googleDriveFileId: string | undefined;
      let uploadSuccess = false;
      
      try {
        googleDriveFileId = await this.uploadToGoogleDrive(compressedPath, compressedFileName);
        console.log(`✅ Backup uploaded to Google Drive with ID: ${googleDriveFileId}`);
        uploadSuccess = true;
      } catch (uploadError) {
        const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
        console.error('❌ Google Drive upload failed:', errorMessage);
        
        // Handle service account quota limitation gracefully
        if (errorMessage.includes('Service Accounts do not have storage quota')) {
          console.log('💾 Google Drive service account has no storage quota - keeping local backup only');
        } else {
          console.log('💾 Keeping local backup due to upload failure');
        }
      }

      // Clean up local files (keep compressed backup locally for 7 days)
      fs.unlinkSync(backupPath); // Remove uncompressed version
      this.cleanupOldBackups();

      return {
        success: true,
        backupFile: compressedFileName,
        googleDriveFileId
      };

    } catch (error) {
      console.error('❌ Database backup failed:', error);
      
      // Clean up any partial files
      try {
        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
        if (fs.existsSync(compressedPath)) fs.unlinkSync(compressedPath);
      } catch (cleanupError) {
        console.error('Error cleaning up backup files:', cleanupError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Compress a file using gzip
   */
  private async compressFile(inputPath: string, outputPath: string): Promise<void> {
    const readStream = fs.createReadStream(inputPath);
    const writeStream = fs.createWriteStream(outputPath);
    const gzipStream = zlib.createGzip({ level: 9 }); // Maximum compression

    await pipeline(readStream, gzipStream, writeStream);
  }

  /**
   * Upload backup file to Google Drive using OAuth authentication
   */
  private async uploadToGoogleDrive(filePath: string, fileName: string): Promise<string> {
    const fileContent = fs.readFileSync(filePath);
    
    // Try OAuth method first, fall back to service account if needed
    try {
      const result = await this.googleDriveService.uploadFileWithOAuth({
        name: fileName,
        content: fileContent,
        mimeType: 'application/gzip',
        description: `GiddyUp Health App Database Backup - ${new Date().toISOString()}`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!]
      });

      return result.id;
    } catch (oauthError) {
      console.log('OAuth upload failed, trying service account method:', oauthError instanceof Error ? oauthError.message : 'Unknown error');
      
      // Fall back to original service account method
      const result = await this.googleDriveService.uploadFile({
        name: fileName,
        content: fileContent,
        mimeType: 'application/gzip',
        description: `GiddyUp Health App Database Backup - ${new Date().toISOString()}`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!]
      });

      return result.id;
    }
  }

  /**
   * Clean up old backup files (keep only last 7 days locally)
   */
  private cleanupOldBackups(): void {
    try {
      const files = fs.readdirSync(this.backupDir);
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (file.startsWith('giddyup_backup_') && file.endsWith('.sql.gz')) {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime.getTime() < sevenDaysAgo) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Cleaned up old backup: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  /**
   * Test the backup system
   */
  async testBackup(): Promise<void> {
    console.log('🧪 Testing database backup system...');
    const result = await this.createDatabaseBackup();
    
    if (result.success) {
      console.log('✅ Backup test successful!');
      console.log(`   - Backup file: ${result.backupFile}`);
      if (result.googleDriveFileId) {
        console.log(`   - Google Drive ID: ${result.googleDriveFileId}`);
      } else {
        console.log(`   - Local backup only (Google Drive upload failed)`);
      }
    } else {
      console.log('❌ Backup test failed:', result.error);
      throw new Error(`Backup test failed: ${result.error}`);
    }
  }

  /**
   * Create a one-time backup for immediate use
   */
  async createManualBackup(): Promise<{
    success: boolean;
    message: string;
    backupFile?: string;
    googleDriveFileId?: string;
  }> {
    console.log('📋 Creating manual database backup...');
    const result = await this.createDatabaseBackup();
    
    if (result.success) {
      return {
        success: true,
        message: `Database backup created successfully`,
        backupFile: result.backupFile,
        googleDriveFileId: result.googleDriveFileId
      };
    } else {
      return {
        success: false,
        message: `Backup failed: ${result.error}`
      };
    }
  }
}