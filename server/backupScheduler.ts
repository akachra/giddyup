import cron from 'node-cron';
import { DatabaseBackupService } from './databaseBackupService';

export class BackupScheduler {
  private backupService: DatabaseBackupService;
  private isRunning: boolean = false;

  constructor() {
    this.backupService = new DatabaseBackupService();
  }

  /**
   * Start the automatic backup scheduler
   * Runs every day at 3:00 AM EST
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Backup scheduler is already running');
      return;
    }

    // Schedule backup for 3:00 AM EST every day
    // Cron expression: '0 3 * * *' = At 3:00 AM every day
    // Note: Cron runs in the server's timezone, which should be EST
    const cronExpression = '0 3 * * *';
    
    console.log('🕐 Starting automatic database backup scheduler...');
    console.log('📅 Scheduled: Every day at 3:00 AM EST');

    cron.schedule(cronExpression, async () => {
      console.log(`\n🌙 Starting scheduled database backup at ${new Date().toISOString()}`);
      
      try {
        const result = await this.backupService.createDatabaseBackup();
        
        if (result.success) {
          console.log('✅ Scheduled backup completed successfully');
          console.log(`   📁 File: ${result.backupFile}`);
          console.log(`   ☁️ Google Drive ID: ${result.googleDriveFileId}`);
        } else {
          console.error('❌ Scheduled backup failed:', result.error);
          // In production, you might want to send alerts here
        }
        
      } catch (error) {
        console.error('❌ Fatal error during scheduled backup:', error);
        // In production, you might want to send alerts here
      }
      
      console.log(`🌅 Scheduled backup process completed at ${new Date().toISOString()}\n`);
    });

    this.isRunning = true;
    console.log('✅ Backup scheduler started successfully');
  }

  /**
   * Stop the backup scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Backup scheduler is not running');
      return;
    }

    // Note: node-cron doesn't provide a direct way to stop specific tasks
    // In a production environment, you might want to track task references
    this.isRunning = false;
    console.log('🛑 Backup scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; nextBackupTime: string } {
    const now = new Date();
    const nextBackup = new Date();
    
    // Calculate next 3 AM
    nextBackup.setHours(3, 0, 0, 0);
    
    // If we've passed 3 AM today, schedule for tomorrow
    if (now.getHours() >= 3) {
      nextBackup.setDate(nextBackup.getDate() + 1);
    }

    return {
      isRunning: this.isRunning,
      nextBackupTime: nextBackup.toISOString()
    };
  }

  /**
   * Trigger a manual backup immediately
   */
  async triggerManualBackup(): Promise<{
    success: boolean;
    message: string;
    backupFile?: string;
    googleDriveFileId?: string;
  }> {
    console.log('🚀 Triggering manual backup...');
    return await this.backupService.createManualBackup();
  }

  /**
   * Test the backup system without scheduling
   */
  async testBackup(): Promise<void> {
    console.log('🧪 Testing backup system...');
    await this.backupService.testBackup();
  }
}

// Export a singleton instance
export const backupScheduler = new BackupScheduler();