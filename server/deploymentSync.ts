import { databaseSyncService } from "./databaseSyncService";
import cron from "node-cron";

/**
 * Database synchronization system with multiple triggers:
 * 1. On server startup (deployment time)
 * 2. Scheduled sync every 6 hours
 * 3. Manual trigger capability
 */
export class DeploymentSyncManager {
  
  /**
   * Initialize all sync processes
   * Called during server startup
   */
  async initializeSyncSystem(): Promise<void> {
    console.log("🔄 Initializing database sync system...");
    
    // 1. Run full sync on startup (deployment time)
    await this.runStartupSync();
    
    // 2. Schedule regular syncs
    this.scheduleRegularSync();
    
    console.log("✅ Database sync system initialized");
  }

  /**
   * Run comprehensive sync on server startup
   * This ensures production is aligned immediately after deployment
   */
  private async runStartupSync(): Promise<void> {
    console.log("🚀 Running deployment-time database sync...");
    
    try {
      const result = await databaseSyncService.performFullSync();
      
      if (result.success) {
        console.log(`✅ Deployment sync successful: ${result.message}`);
      } else {
        console.error(`❌ Deployment sync failed: ${result.message}`);
      }
    } catch (error) {
      console.error("💥 Critical error during deployment sync:", error);
    }
  }

  /**
   * Schedule regular database sync for live data updates
   * More frequent syncing to keep production data fresh
   */
  private scheduleRegularSync(): void {
    // Full sync every 2 hours for live data updates
    cron.schedule('0 */2 * * *', async () => {
      console.log("⏰ Running scheduled database sync...");
      
      try {
        const result = await databaseSyncService.performFullSync();
        console.log(`📊 Scheduled sync result: ${result.message}`);
      } catch (error) {
        console.error("⚠️  Scheduled sync error:", error);
      }
    });

    // Quick sync check every 30 minutes for faster updates
    cron.schedule('*/30 * * * *', async () => {
      try {
        const result = await databaseSyncService.performQuickSync();
        if (result.changesApplied > 0) {
          console.log(`🔧 Quick sync applied ${result.changesApplied} fixes`);
        }
      } catch (error) {
        console.error("⚠️  Quick sync error:", error);
      }
    });

    // Auto-fix step aggregation every 15 minutes to prevent Google Fit corruption
    cron.schedule('*/15 * * * *', async () => {
      try {
        console.log("🔧 Running automatic step aggregation fix...");
        
        // Get recent dates that might have aggregation issues
        const today = new Date();
        const dates = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
        
        // Use internal fix logic
        const response = await fetch('http://localhost:5000/api/fix-step-aggregation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dates })
        });
        
        if (response.ok) {
          const result = await response.json();
          const fixedDates = result.fixes?.filter((f: any) => f.status === 'fixed').length || 0;
          if (fixedDates > 0) {
            console.log(`✅ Auto-fixed step aggregation for ${fixedDates} dates`);
          }
        }
      } catch (error) {
        console.error("⚠️  Auto-fix step aggregation error:", error);
      }
    });

    console.log("📅 Scheduled syncs configured:");
    console.log("   • Full sync: Every 2 hours");
    console.log("   • Quick sync: Every 30 minutes");
  }

  /**
   * Manual sync trigger for API endpoint
   */
  async triggerManualSync(): Promise<any> {
    console.log("🔄 Manual database sync triggered...");
    return await databaseSyncService.performFullSync();
  }
}

export const deploymentSyncManager = new DeploymentSyncManager();