import { storage } from './storage';
import { DataPriorityService, DataSource } from './dataPriorityService';

export interface FieldMetadata {
  recordedAt: string; // ISO timestamp when the data was actually recorded
  source: string; // Source that provided this data (health_connect, mi_fitness, manual, etc.)
  deviceId?: string; // Optional device identifier
}

export interface HealthMetricsFieldMetadata {
  [fieldName: string]: FieldMetadata;
}

/**
 * Service to manage data freshness using field-level timestamps based on when data was actually recorded
 */
export class DataFreshnessService {
  private dataPriorityService: DataPriorityService;

  constructor() {
    this.dataPriorityService = new DataPriorityService();
  }
  
  /**
   * Check if data is locked (protected from overwrites) for a specific date
   * IMPORTANT: This protects data based on the RECORDED DATE (when health event occurred),
   * NOT the import timestamp. This prevents historical data corruption during imports.
   */
  async isDataLocked(userId: string, date: Date): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.dataLockEnabled || !user?.dataLockDate) {
        return false;
      }

      // Convert date to start of day for comparison
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      
      const lockDate = new Date(user.dataLockDate);
      lockDate.setHours(0, 0, 0, 0);

      // Data is locked if the date is on or before the lock date
      // Lock protects historical data UP TO the lock date from overwrites
      return dateOnly <= lockDate;
    } catch (error) {
      console.error('Error checking data lock status:', error);
      return false;
    }
  }

  /**
   * Get the recorded timestamp for a specific field and date
   */
  async getFieldRecordedTimestamp(userId: string, fieldName: string, date: Date): Promise<Date | null> {
    try {
      // First check if data is locked - locked data blocks all overwrites based on RECORDED DATE
      if (await this.isDataLocked(userId, date)) {
        console.log(`🔒 DATA LOCKED: Field ${fieldName} for ${date.toISOString().split('T')[0]} is protected by data lock (protects recorded dates, not import dates)`);
        return new Date('2099-12-31'); // Return future date to block overwrites
      }

      const existingMetrics = await storage.getHealthMetricsForDate(userId, date);
      if (!existingMetrics) return null;

      // Check if field has metadata with recorded timestamp
      const fieldMetadata = existingMetrics.fieldMetadata as HealthMetricsFieldMetadata;
      if (fieldMetadata && fieldMetadata[fieldName] && fieldMetadata[fieldName].recordedAt) {
        return new Date(fieldMetadata[fieldName].recordedAt);
      }

      // If no field metadata, check if the field has a value - if null, return null (no timestamp protection)
      const fieldValue = (existingMetrics as any)[fieldName];
      if (fieldValue === null || fieldValue === undefined) {
        return null; // Null fields don't block new data
      }

      // Fallback to legacy timestamps for backwards compatibility
      return existingMetrics.importedAt || existingMetrics.updatedAt || existingMetrics.createdAt || null;
    } catch (error) {
      console.error('Error getting field recorded timestamp:', error);
      return null;
    }
  }

  /**
   * Get the latest timestamp for a specific data type and date (DEPRECATED - use field-level timestamps)
   */
  async getLatestDataTimestamp(userId: string, dataType: string, date: Date): Promise<Date | null> {
    try {
      // Get existing health metrics for the date
      const existingMetrics = await storage.getHealthMetricsForDate(userId, date);
      if (!existingMetrics) return null;

      // Get the import timestamp from metadata or created_at
      return existingMetrics.updatedAt || existingMetrics.createdAt || null;
    } catch (error) {
      console.error('Error getting latest data timestamp:', error);
      return null;
    }
  }

  /**
   * Check if Health Connect data is newer than existing imported data (DEPRECATED - use shouldOverwriteField)
   */
  async isHealthConnectDataNewer(userId: string, date: Date, healthConnectTimestamp: Date): Promise<boolean> {
    try {
      const existingTimestamp = await this.getLatestDataTimestamp(userId, 'health_metrics', date);
      
      if (!existingTimestamp) {
        // No existing data, Health Connect data is new
        return true;
      }

      // Compare timestamps - Health Connect is newer if its timestamp is later
      const isNewer = healthConnectTimestamp > existingTimestamp;
      
      console.log(`Data freshness check for ${date.toDateString()}:`);
      console.log(`  Existing data: ${existingTimestamp.toISOString()}`);
      console.log(`  Health Connect: ${healthConnectTimestamp.toISOString()}`);
      console.log(`  Health Connect is newer: ${isNewer}`);
      
      return isNewer;
    } catch (error) {
      console.error('Error checking data freshness:', error);
      // FAIL-SAFE: Default to protecting existing data if we can't determine freshness
      return false;
    }
  }

  /**
   * Check if field should be overwritten based on data source priority and freshness
   * This is the NEW method that implements the intelligent data prioritization
   */
  async shouldOverwriteFieldWithPriority(
    userId: string,
    fieldName: string,
    date: Date,
    newValue: any,
    newSource: DataSource,
    newRecordedAt: Date
  ): Promise<{
    shouldOverwrite: boolean;
    reason: string;
    skipReason?: string;
  }> {
    try {
      // First check if data is locked
      if (await this.isDataLocked(userId, date)) {
        return {
          shouldOverwrite: false,
          reason: `Field ${fieldName} is protected by data lock for ${date.toISOString().split('T')[0]}`,
          skipReason: 'data_locked'
        };
      }

      // Check if new value is meaningful
      if (!this.isMeaningfulValue(newValue)) {
        return {
          shouldOverwrite: false,
          reason: `New value for ${fieldName} is not meaningful: ${newValue}`,
          skipReason: 'meaningless_value'
        };
      }

      // Use priority service to check overwrite permission
      const priorityCheck = await this.dataPriorityService.shouldAllowDataOverwrite(
        userId,
        fieldName,
        date,
        newSource,
        newRecordedAt
      );

      return {
        shouldOverwrite: priorityCheck.allowed,
        reason: priorityCheck.reason,
        skipReason: priorityCheck.allowed ? undefined : 'priority_blocked'
      };

    } catch (error) {
      console.error('Error checking field overwrite with priority:', error);
      return {
        shouldOverwrite: false,
        reason: 'Error during priority check - protecting existing data',
        skipReason: 'priority_check_error'
      };
    }
  }

  /**
   * Check if a value is meaningful (not null, undefined, zero, or empty)
   */
  private isMeaningfulValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number' && value === 0) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }

  /**
   * Get the value of a specific field from health metrics
   */
  private getFieldValue(healthMetrics: any, fieldName: string): any {
    if (!healthMetrics) return null;
    return healthMetrics[fieldName];
  }

  /**
   * Normalize timestamp for consistent comparison (most sources already in correct timezone)
   * Only Health Connect needs UTC conversion - other sources are already local time
   */
  private normalizeTimestamp(timestamp: Date, source?: string): Date {
    // Health Connect stores in UTC and needs conversion to EST
    if (source === 'health_connect') {
      // Health Connect specific UTC to EST conversion is handled in healthConnectImporter
      return timestamp;
    }
    // RENPHO, Mi Fitness, Google Fit are already in local timezone
    return timestamp;
  }

  /**
   * Check if new data should overwrite existing data for a specific field using field-level timestamps
   */
  async shouldOverwriteField(
    userId: string,
    fieldName: string,
    date: Date,
    newDataTimestamp: Date,
    newSource: string,
    newValue?: any
  ): Promise<{ 
    shouldOverwrite: boolean; 
    reason: string;
    existingSource?: string;
    existingTimestamp?: Date;
    sourceAttempted?: string;
  }> {
    try {
      // CRITICAL: Check data lock FIRST - nothing can bypass this protection
      if (await this.isDataLocked(userId, date)) {
        return { 
          shouldOverwrite: false, 
          reason: `Data is protected by data lock (protects recorded dates, not import dates)`,
          sourceAttempted: newSource
        };
      }

      // Don't import meaningless values (null, 0, empty) - they get lowest priority
      if (!this.isMeaningfulValue(newValue)) {
        return { 
          shouldOverwrite: false, 
          reason: `Skipping meaningless value (${newValue}) - null/zero/empty values are not imported`,
          sourceAttempted: newSource
        };
      }

      // Get existing health metrics to check the specific field value
      const existingMetrics = await storage.getHealthMetricsForDate(userId, date);
      const existingFieldValue = this.getFieldValue(existingMetrics, fieldName);
      
      // If the specific field is null/empty, always allow import regardless of record existence
      if (!this.isMeaningfulValue(existingFieldValue)) {
        return { 
          shouldOverwrite: true, 
          reason: `No existing data for field '${fieldName}' (value: ${existingFieldValue})`,
          sourceAttempted: newSource
        };
      }
      
      const existingTimestamp = await this.getFieldRecordedTimestamp(userId, fieldName, date);
      
      // If no existing timestamp (should not happen if field has value), allow import
      if (!existingTimestamp) {
        return { 
          shouldOverwrite: true, 
          reason: 'No existing data timestamp found despite field having value',
          sourceAttempted: newSource
        };
      }

      const existingSource = existingMetrics?.source || 
        (existingMetrics?.fieldMetadata as HealthMetricsFieldMetadata)?.[fieldName]?.source || 
        'unknown';
      
      // Normalize timestamps for proper comparison (timezone handling per source)
      const normalizedNewTimestamp = this.normalizeTimestamp(newDataTimestamp, newSource);
      const normalizedExistingTimestamp = this.normalizeTimestamp(existingTimestamp);
      
      // Check if existing data is meaningful - authentic data always wins over null data regardless of timestamp
      const existingIsMeaningful = this.isMeaningfulValue(existingFieldValue);
      
      // Authentic data always wins over null/empty data regardless of timestamp
      if (this.isMeaningfulValue(newValue) && !existingIsMeaningful) {
        return { 
          shouldOverwrite: true, 
          reason: `Authentic data overriding null/empty existing data (${newValue} > ${existingFieldValue})`,
          existingSource,
          existingTimestamp: normalizedExistingTimestamp,
          sourceAttempted: newSource
        };
      }
      
      // CRITICAL: Apply data priority hierarchy BEFORE any timestamp logic
      const priorityCheck = await this.dataPriorityService.shouldAllowDataOverwrite(
        userId,
        fieldName,
        date,
        this.mapSourceToDataSource(newSource),
        normalizedNewTimestamp
      );
      
      if (!priorityCheck.allowed) {
        return {
          shouldOverwrite: false,
          reason: `PRIORITY PROTECTION: ${priorityCheck.reason} (${existingSource} blocks ${newSource})`,
          existingSource,
          existingTimestamp: normalizedExistingTimestamp,
          sourceAttempted: newSource
        };
      }
      
      // If both are meaningful, newer wins by timestamp
      if (normalizedNewTimestamp > normalizedExistingTimestamp) {
        return { 
          shouldOverwrite: true, 
          reason: `Newer recorded timestamp (${normalizedNewTimestamp.toISOString()} > ${normalizedExistingTimestamp.toISOString()})`,
          existingSource,
          existingTimestamp: normalizedExistingTimestamp,
          sourceAttempted: newSource
        };
      }
      
      // Manual entries always override automatic imports (if they have meaningful values)
      if (newSource === 'manual') {
        return {
          shouldOverwrite: true,
          reason: 'Manual entry overrides automatic import',
          existingSource,
          existingTimestamp: normalizedExistingTimestamp,
          sourceAttempted: newSource
        };
      }
      
      return { 
        shouldOverwrite: false, 
        reason: `Existing field data is newer (${normalizedExistingTimestamp.toISOString()} >= ${normalizedNewTimestamp.toISOString()})`,
        existingSource,
        existingTimestamp: normalizedExistingTimestamp,
        sourceAttempted: newSource
      };
    } catch (error) {
      console.error('Error checking field freshness:', error);
      return { 
        shouldOverwrite: true, 
        reason: 'Error checking existing data - allowing import',
        sourceAttempted: newSource
      };
    }
  }

  /**
   * Create field metadata for a specific field 
   */
  createFieldMetadata(recordedAt: Date, source: string, deviceId?: string): FieldMetadata {
    // Store timestamp as-is since sources provide correct local time (except Health Connect which is pre-converted)
    return {
      recordedAt: recordedAt.toISOString(),
      source,
      deviceId
    };
  }

  /**
   * Map string source names to DataSource enum for priority service
   */
  private mapSourceToDataSource(source: string): any {
    switch (source.toLowerCase()) {
      case 'manual':
        return 'manual';
      case 'renpho':
        return 'renpho';
      case 'health_connect':
        return 'health_connect';
      case 'google_fit':
        return 'google_fit';
      case 'mi_fitness':
        return 'mi_fitness';
      default:
        return 'google_fit'; // Default to lowest non-manual priority
    }
  }

  /**
   * Get source priority for data conflict resolution (DEPRECATED - use timestamp comparison instead)
   * This method is kept for backwards compatibility but should not be used for new imports
   */
  getSourcePriority(source: 'mi_fitness' | 'health_connect' | 'manual' | 'google_fit'): number {
    const priorities = {
      'manual': 3,        // Highest priority - user manually entered
      'google_fit': 2,    // High priority - real-time Google API data
      'health_connect': 2, // Medium priority - real-time phone data
      'mi_fitness': 1     // Lower priority - exported app data
    };
    return priorities[source] || 0;
  }

  /**
   * Determine if we should overwrite existing data based on actual data timestamps
   */
  async shouldOverwriteData(
    userId: string, 
    date: Date, 
    newSource: 'mi_fitness' | 'health_connect' | 'manual' | 'google_fit',
    newDataTimestamp: Date,
    newDataContext?: any
  ): Promise<{ 
    shouldOverwrite: boolean; 
    reason: string;
    existingSource?: string;
    existingTimestamp?: Date;
    sourceAttempted?: string;
  }> {
    try {
      // Validate input dates
      if (!date || isNaN(date.getTime())) {
        console.warn('Invalid date provided to shouldOverwriteData:', date);
        return { 
          shouldOverwrite: false, 
          reason: 'Invalid date provided',
          sourceAttempted: newSource
        };
      }
      
      if (!newDataTimestamp || isNaN(newDataTimestamp.getTime())) {
        console.warn('Invalid timestamp provided to shouldOverwriteData:', newDataTimestamp);
        return { 
          shouldOverwrite: false, 
          reason: 'Invalid timestamp provided',
          sourceAttempted: newSource
        };
      }
      
      const existingMetrics = await storage.getHealthMetricsForDate(userId, date);
      
      if (!existingMetrics) {
        return { 
          shouldOverwrite: true, 
          reason: 'No existing data found',
          sourceAttempted: newSource
        };
      }

      const existingSource = existingMetrics.source || 'unknown';
      
      // Special handling for Google Fit: Allow re-sync from same source unless data is much newer
      if (newSource === 'google_fit' && existingSource === 'google_fit') {
        // For Google Fit re-syncs, only block if the existing import is very recent (last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingImportTime = existingMetrics.importedAt || existingMetrics.updatedAt || existingMetrics.createdAt;
        
        if (existingImportTime && new Date(existingImportTime) > fiveMinutesAgo) {
          return { 
            shouldOverwrite: false, 
            reason: `Recent Google Fit import (${new Date(existingImportTime).toISOString()} >= ${fiveMinutesAgo.toISOString()})`,
            existingSource,
            existingTimestamp: new Date(existingImportTime),
            sourceAttempted: newSource
          };
        } else {
          return { 
            shouldOverwrite: true, 
            reason: 'Allowing Google Fit re-sync (no recent import found)',
            existingSource,
            sourceAttempted: newSource
          };
        }
      }
      
      // Get the actual data timestamp from field metadata, not import timestamp
      let existingDataTimestamp: Date;
      
      // Try to get the most recent actual recording timestamp from field metadata
      const fieldMetadata = existingMetrics.fieldMetadata as HealthMetricsFieldMetadata;
      if (fieldMetadata) {
        const recordingTimestamps: Date[] = [];
        Object.values(fieldMetadata).forEach(metadata => {
          if (metadata.recordedAt) {
            const parsedDate = new Date(metadata.recordedAt);
            // Only add valid timestamps
            if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > 0) {
              recordingTimestamps.push(parsedDate);
            } else {
              console.warn('Invalid recordedAt timestamp in field metadata:', metadata.recordedAt);
            }
          }
        });
        
        if (recordingTimestamps.length > 0) {
          // Use the most recent recording timestamp from the field metadata
          existingDataTimestamp = new Date(Math.max(...recordingTimestamps.map(d => d.getTime())));
        } else if (existingMetrics.importedAt) {
          const importedDate = new Date(existingMetrics.importedAt);
          existingDataTimestamp = !isNaN(importedDate.getTime()) ? importedDate : new Date();
        } else if (existingMetrics.updatedAt) {
          const updatedDate = new Date(existingMetrics.updatedAt);
          existingDataTimestamp = !isNaN(updatedDate.getTime()) ? updatedDate : new Date();
        } else {
          const createdDate = new Date(existingMetrics.createdAt || new Date());
          existingDataTimestamp = !isNaN(createdDate.getTime()) ? createdDate : new Date();
        }
      } else if (existingMetrics.importedAt) {
        const importedDate = new Date(existingMetrics.importedAt);
        existingDataTimestamp = !isNaN(importedDate.getTime()) ? importedDate : new Date();
      } else if (existingMetrics.updatedAt) {
        const updatedDate = new Date(existingMetrics.updatedAt);
        existingDataTimestamp = !isNaN(updatedDate.getTime()) ? updatedDate : new Date();
      } else {
        const createdDate = new Date(existingMetrics.createdAt || new Date());
        existingDataTimestamp = !isNaN(createdDate.getTime()) ? createdDate : new Date();
      }
      
      // Compare actual data timestamps - newer wins regardless of source
      if (newDataTimestamp > existingDataTimestamp) {
        return { 
          shouldOverwrite: true, 
          reason: `Newer data timestamp (${newDataTimestamp.toISOString()} > ${existingDataTimestamp.toISOString()})`,
          existingSource,
          existingTimestamp: existingDataTimestamp,
          sourceAttempted: newSource
        };
      }
      
      // Special case: Manual entries always override automatic imports
      if (newSource === 'manual') {
        return {
          shouldOverwrite: true,
          reason: 'Manual entry overrides automatic import',
          existingSource,
          existingTimestamp: existingDataTimestamp,
          sourceAttempted: newSource
        };
      }
      
      return { 
        shouldOverwrite: false, 
        reason: `Existing data is newer (${existingDataTimestamp.toISOString()} >= ${newDataTimestamp.toISOString()})`,
        existingSource,
        existingTimestamp: existingDataTimestamp,
        sourceAttempted: newSource
      };
      
    } catch (error) {
      console.error('Error determining data overwrite decision:', error);
      return { 
        shouldOverwrite: false, 
        reason: 'Error during freshness check',
        sourceAttempted: newSource
      };
    }
  }

  /**
   * Log data import decision for debugging
   */
  logImportDecision(
    date: Date, 
    source: string, 
    decision: { 
      shouldOverwrite: boolean; 
      reason: string;
      existingSource?: string;
      existingTimestamp?: Date;
      sourceAttempted?: string;
    },
    dataPreview?: any
  ) {
    const action = decision.shouldOverwrite ? 'IMPORTING' : 'SKIPPING';
    const dateStr = date.toISOString().split('T')[0];
    
    console.log(`🔄 DATA FRESHNESS: ${source} for ${dateStr} - ${action} (${decision.reason})`);
    
    if (!decision.shouldOverwrite && decision.existingSource && decision.existingTimestamp) {
      console.log(`   → Protecting ${decision.existingSource} data (${decision.existingTimestamp.toISOString()}) from ${decision.sourceAttempted} overwrite`);
    }
    
    if (dataPreview && decision.shouldOverwrite) {
      console.log(`  Data preview:`, JSON.stringify(dataPreview, null, 2).substring(0, 200) + '...');
    }
  }
}

export const dataFreshnessService = new DataFreshnessService();