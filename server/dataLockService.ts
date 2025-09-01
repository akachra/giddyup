import { storage } from './storage';

/**
 * Service to manage data locks - protecting historical data from overwrites
 */
export class DataLockService {
  
  /**
   * Set a data lock date - all data on or before this date will be protected from overwrites
   * Users can extend the lock to a later date to protect more data
   */
  async setDataLock(userId: string, lockDate: Date): Promise<{ success: boolean; message: string; protectedRecordsCount: number }> {
    try {
      console.log(`🔒 Setting data lock for user ${userId} up to ${lockDate.toISOString().split('T')[0]}`);
      
      // Check current lock status
      const user = await storage.getUser(userId);
      const currentLockDate = user?.dataLockDate;
      
      // Count how many records will be protected
      const protectedCount = await storage.getProtectedHealthMetricsCount(userId, lockDate);
      
      const result = await storage.updateUser(userId, {
        dataLockDate: lockDate,
        dataLockEnabled: true
      });

      if (result) {
        let message = `Data locked up to ${lockDate.toISOString().split('T')[0]}. ${protectedCount} health records are now protected from overwrites based on their recorded dates.`;
        
        if (currentLockDate && new Date(currentLockDate) < lockDate) {
          message = `Data lock extended to ${lockDate.toISOString().split('T')[0]}. ${protectedCount} health records are now protected from overwrites based on their recorded dates.`;
        }
        
        return {
          success: true,
          message,
          protectedRecordsCount: protectedCount
        };
      } else {
        return {
          success: false,
          message: 'Failed to set data lock',
          protectedRecordsCount: 0
        };
      }
    } catch (error) {
      console.error('Error setting data lock:', error);
      return {
        success: false,
        message: 'Error setting data lock',
        protectedRecordsCount: 0
      };
    }
  }

  /**
   * Remove data lock - allow all data to be overwritten again
   */
  async unlockAllData(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔓 Unlocking all data for user ${userId}`);
      
      const result = await storage.updateUser(userId, {
        dataLockEnabled: false,
        dataLockDate: null
      });

      if (result) {
        return {
          success: true,
          message: 'All data unlocked. Historical data can now be overwritten by imports.'
        };
      } else {
        return {
          success: false,
          message: 'Failed to unlock data'
        };
      }
    } catch (error) {
      console.error('Error unlocking data:', error);
      return {
        success: false,
        message: 'Error unlocking data'
      };
    }
  }

  /**
   * Get current data lock status
   */
  async getDataLockStatus(userId: string): Promise<{
    enabled: boolean;
    lockDate: Date | null;
    protectedRecordsCount?: number;
  }> {
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return { enabled: false, lockDate: null };
      }

      let protectedDataCount = 0;
      if (user.dataLockEnabled && user.dataLockDate) {
        // Count how many health metric records are protected
        protectedDataCount = await storage.getProtectedHealthMetricsCount(userId, user.dataLockDate);
      }

      return {
        enabled: user.dataLockEnabled || false,
        lockDate: user.dataLockDate,
        protectedRecordsCount: protectedDataCount
      };
    } catch (error) {
      console.error('Error getting data lock status:', error);
      return { enabled: false, lockDate: null };
    }
  }

  /**
   * Check if a specific date is protected by data lock
   */
  async isDateProtected(userId: string, date: Date): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.dataLockEnabled || !user?.dataLockDate) {
        return false;
      }

      // Convert to date only (no time) for comparison
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      
      const lockDate = new Date(user.dataLockDate);
      lockDate.setHours(0, 0, 0, 0);

      return dateOnly <= lockDate;
    } catch (error) {
      console.error('Error checking date protection:', error);
      return false;
    }
  }
}

export const dataLockService = new DataLockService();