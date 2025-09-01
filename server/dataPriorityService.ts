import { storage } from './storage';

export enum DataSource {
  RENPHO = 'renpho',
  HEALTH_CONNECT = 'health_connect',
  GOOGLE_FIT = 'google_fit',
  MI_FITNESS = 'mi_fitness',
  MANUAL = 'manual'
}

export enum DataSourcePriority {
  MANUAL = 1,        // Manual entries - Highest priority (user's authentic input)
  SUPER_PRIMARY = 1.5, // Google Fit for specific fields (sleep) - Higher than standard primary
  PRIMARY = 2,       // RENPHO, Health Connect - High priority comprehensive data  
  SECONDARY = 3,     // Google Fit - Gap filler ONLY, cannot overwrite primary sources
  TERTIARY = 4       // Mi Fitness - Lowest priority
}

/**
 * Service to manage intelligent data prioritization
 * Default hierarchy: Manual > RENPHO/Health Connect > Google Fit (gap filler only) > Mi Fitness
 * 
 * Field-specific overrides:
 * - sleepDuration: Google Fit elevated to PRIMARY level (equal to Health Connect) due to more complete data
 * - steps: Google Fit elevated to PRIMARY level (equal to Health Connect) due to better granular tracking
 */
export class DataPriorityService {
  
  /**
   * Get the priority level for a data source, with optional field-specific overrides
   */
  getSourcePriority(source: DataSource, fieldName?: string): DataSourcePriority {
    // Field-specific priority overrides
    if (fieldName) {
      // For sleep data: Google Fit gets HIGHEST priority (better than Health Connect) due to more complete data
      if (fieldName === 'sleepDuration' && source === DataSource.GOOGLE_FIT) {
        return DataSourcePriority.SUPER_PRIMARY; // Higher priority than Health Connect to fix corrupted Health Connect data
      }
      
      // For step data: Google Fit disabled from SUPER_PRIMARY to prevent overwrites
      // Keeping it as gap-filler only (SECONDARY priority)
      // if (fieldName === 'steps' && source === DataSource.GOOGLE_FIT) {
      //   return DataSourcePriority.SUPER_PRIMARY; // Higher priority than Health Connect for steps
      // }
    }

    // Default priority hierarchy
    switch (source) {
      case DataSource.MANUAL:
        return DataSourcePriority.MANUAL;
      
      case DataSource.RENPHO:
      case DataSource.HEALTH_CONNECT:
        return DataSourcePriority.PRIMARY;
      
      case DataSource.GOOGLE_FIT:
        return DataSourcePriority.SECONDARY;
      
      case DataSource.MI_FITNESS:
        return DataSourcePriority.TERTIARY;
      
      default:
        return DataSourcePriority.TERTIARY;
    }
  }

  /**
   * Check if a data source should be allowed to overwrite existing data
   * Based on source priority and data freshness rules
   */
  async shouldAllowDataOverwrite(
    userId: string,
    fieldName: string,
    date: Date,
    newDataSource: DataSource,
    newDataRecordedAt: Date
  ): Promise<{
    allowed: boolean;
    reason: string;
    existingSource?: DataSource;
    existingRecordedAt?: Date;
  }> {
    try {
      // Get existing data for this field and date
      const existingMetrics = await storage.getHealthMetricsForDate(userId, date);
      
      if (!existingMetrics) {
        return {
          allowed: true,
          reason: 'No existing data for this date'
        };
      }

      // Check if field has existing data
      const fieldValue = (existingMetrics as any)[fieldName];
      if (fieldValue === null || fieldValue === undefined) {
        return {
          allowed: true,
          reason: 'No existing data for this field'
        };
      }

      // Get source priority first - needed for security checks  
      const newSourcePriority = this.getSourcePriority(newDataSource, fieldName);
      
      // Get existing field metadata
      const fieldMetadata = existingMetrics.fieldMetadata as any;
      const existingFieldMeta = fieldMetadata?.[fieldName];
      
      if (!existingFieldMeta) {
        // CRITICAL SECURITY FIX: Missing metadata means unknown source
        // Apply conservative protection - treat as PRIMARY source to prevent corruption
        // Secondary sources (Google Fit) should NEVER overwrite data of unknown origin
        if (newSourcePriority === DataSourcePriority.SECONDARY) {
          return {
            allowed: false,
            reason: `SECURITY: Google Fit blocked from overwriting data of unknown source - missing metadata indicates primary data`,
            existingSource: undefined,
            existingRecordedAt: existingMetrics.updatedAt || existingMetrics.createdAt || undefined
          };
        }
        
        // Only allow primary sources or manual entries to overwrite data with missing metadata
        if (newSourcePriority <= DataSourcePriority.PRIMARY) {
          return {
            allowed: true,
            reason: `Primary/Manual source (${newDataSource}) allowed to overwrite data with missing metadata`
          };
        }
        
        return {
          allowed: false,
          reason: `Lower priority source (${newDataSource}) blocked from overwriting data with missing metadata`
        };
      }

      const existingSource = existingFieldMeta.source as DataSource;
      const existingRecordedAt = new Date(existingFieldMeta.recordedAt);
      
      const existingSourcePriority = this.getSourcePriority(existingSource, fieldName);

      // Rule 1: Manual entries always take precedence over everything else
      if (newSourcePriority === DataSourcePriority.MANUAL && existingSourcePriority !== DataSourcePriority.MANUAL) {
        return {
          allowed: true,
          reason: `Manual entry (${newDataSource}) overriding automated source (${existingSource}) - user's authentic input takes priority`,
          existingSource,
          existingRecordedAt
        };
      }

      // Rule 2: Nothing can overwrite manual entries except newer manual entries
      if (existingSourcePriority === DataSourcePriority.MANUAL && newSourcePriority !== DataSourcePriority.MANUAL) {
        return {
          allowed: false,
          reason: `Cannot overwrite manual entry (${existingSource}) with automated source (${newDataSource}) - manual data is protected`,
          existingSource,
          existingRecordedAt
        };
      }

      // Rule 3: Primary sources (RENPHO/Health Connect) take precedence over secondary/tertiary
      if (newSourcePriority === DataSourcePriority.PRIMARY && existingSourcePriority > DataSourcePriority.PRIMARY) {
        return {
          allowed: true,
          reason: `Primary source (${newDataSource}) overriding lower priority source (${existingSource})`,
          existingSource,
          existingRecordedAt
        };
      }

      // Rule 3a: SUPER_PRIMARY sources (Google Fit for sleep/steps) override PRIMARY sources
      if (newSourcePriority === DataSourcePriority.SUPER_PRIMARY && existingSourcePriority === DataSourcePriority.PRIMARY) {
        return {
          allowed: true,
          reason: `SUPER_PRIMARY source (${newDataSource}) overriding PRIMARY source (${existingSource}) for field-specific priority`,
          existingSource,
          existingRecordedAt
        };
      }

      // Rule 3b: CRITICAL - Secondary sources (Google Fit) can NEVER overwrite primary sources
      if (newSourcePriority === DataSourcePriority.SECONDARY && existingSourcePriority === DataSourcePriority.PRIMARY) {
        return {
          allowed: false,
          reason: `Google Fit cannot overwrite primary source data (${existingSource}) - Google Fit is gap-filler only`,
          existingSource,
          existingRecordedAt
        };
      }

      // Rule 4: Same priority sources - use data creation timestamps (not import timestamps)
      if (newSourcePriority === existingSourcePriority) {
        // For primary sources, be conservative with overwrites
        if (newSourcePriority === DataSourcePriority.PRIMARY) {
          const timeDiffHours = Math.abs(newDataRecordedAt.getTime() - existingRecordedAt.getTime()) / (1000 * 60 * 60);
          
          // Same exact source should always be allowed (upsert behavior)
          if (newDataSource === existingSource) {
            return {
              allowed: true,
              reason: `Same source upsert: ${newDataSource} updating existing data`,
              existingSource,
              existingRecordedAt
            };
          }
          
          // Different sources with same priority require meaningful time difference (>2 hours)
          const allowed = newDataRecordedAt > existingRecordedAt && timeDiffHours > 2;
          return {
            allowed,
            reason: allowed 
              ? `Primary source data overwrite: ${newDataSource} data created ${timeDiffHours.toFixed(1)}h after ${existingSource}`
              : `Primary source data protected: ${existingSource} creation time too recent (${timeDiffHours.toFixed(1)}h ago) to overwrite with ${newDataSource}`,
            existingSource,
            existingRecordedAt
          };
        }
        
        // For non-primary sources, use normal timestamp comparison
        const allowed = newDataRecordedAt > existingRecordedAt;
        return {
          allowed,
          reason: allowed 
            ? `Newer data creation time from same priority source (${newDataSource})`
            : `Existing ${existingSource} data has newer creation time`,
          existingSource,
          existingRecordedAt
        };
      }

      // Rule 5: Higher priority sources always override lower priority (for same date/field)
      if (newSourcePriority < existingSourcePriority) {
        return {
          allowed: true,
          reason: `Higher priority source (${newDataSource}) overriding lower priority source (${existingSource})`,
          existingSource,
          existingRecordedAt
        };
      }

      // Rule 6: Lower priority cannot overwrite higher priority (for same date/field)
      return {
        allowed: false,
        reason: `Cannot overwrite higher priority source (${existingSource}) with lower priority (${newDataSource})`,
        existingSource,
        existingRecordedAt
      };

    } catch (error) {
      console.error('Error checking data overwrite permission:', error);
      return {
        allowed: true,
        reason: 'Error checking permissions - defaulting to allow'
      };
    }
  }

  /**
   * Get metrics that need primary source updates (data older than 2 days)
   */
  async getStaleMetricsNeedingPrimaryUpdate(userId: string): Promise<{
    fieldName: string;
    lastUpdated: Date;
    source: DataSource;
    daysSinceUpdate: number;
  }[]> {
    const staleMetrics: {
      fieldName: string;
      lastUpdated: Date;
      source: DataSource;
      daysSinceUpdate: number;
    }[] = [];

    try {
      // Check last 7 days for stale primary source data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const metrics = await storage.getHealthMetricsForDate(userId, new Date(d));
        if (!metrics) continue;

        const fieldMetadata = metrics.fieldMetadata as any;
        if (!fieldMetadata) continue;

        Object.keys(fieldMetadata).forEach(fieldName => {
          const meta = fieldMetadata[fieldName];
          const source = meta.source as DataSource;
          const recordedAt = new Date(meta.recordedAt);
          const sourcePriority = this.getSourcePriority(source, fieldName);
          
          // Only track manual and primary sources (not secondary gap-fillers like Google Fit)
          if (sourcePriority === DataSourcePriority.MANUAL || sourcePriority === DataSourcePriority.PRIMARY) {
            const daysSinceUpdate = Math.floor((Date.now() - recordedAt.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysSinceUpdate >= 2) {
              staleMetrics.push({
                fieldName,
                lastUpdated: recordedAt,
                source,
                daysSinceUpdate
              });
            }
          }
        });
      }

      return staleMetrics;
    } catch (error) {
      console.error('Error checking stale metrics:', error);
      return [];
    }
  }
}

export const dataPriorityService = new DataPriorityService();