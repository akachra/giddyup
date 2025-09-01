import type { InsertHealthMetrics, InsertHealthDataPoint } from '@shared/schema';

/**
 * Comprehensive field mapper to prevent data loss during imports
 * Maps any source record to our health metrics schema using all possible field variations
 */
export class ComprehensiveFieldMapper {
  
  /**
   * Convert any health record to comprehensive health metrics format
   * This prevents data loss by mapping ALL possible field variations
   */
  static mapToHealthMetrics(record: any, userId: string = 'default-user'): InsertHealthMetrics {
    const baseRecord: InsertHealthMetrics = {
      userId,
      date: this.extractDate(record)
    };

    // Extract optional start/end times for granular data
    const startTime = this.extractStartTime(record);
    const endTime = this.extractEndTime(record);
    if (startTime) baseRecord.startTime = startTime;
    if (endTime) baseRecord.endTime = endTime;

    // Apply comprehensive field mappings
    const fieldMappings = this.getComprehensiveFieldMappings();
    
    Object.entries(fieldMappings).forEach(([targetField, possibleNames]) => {
      const value = this.extractFieldValue(record, possibleNames, targetField);
      if (value !== undefined) {
        (baseRecord as any)[targetField] = value;
      }
    });

    return baseRecord;
  }

  /**
   * Extract date from various possible date field formats
   */
  private static extractDate(record: any): Date {
    const dateFields = [
      'date', 'Date', 'datetime', 'DateTime', 'timestamp', 'Timestamp',
      'startTime', 'start_time', 'time', 'Time', 'created_at', 'createdAt'
    ];
    
    for (const field of dateFields) {
      if (record[field]) {
        return new Date(record[field]);
      }
    }
    
    return new Date(); // fallback to current date
  }

  /**
   * Extract start time from various possible timestamp field formats
   */
  private static extractStartTime(record: any): Date | undefined {
    const startTimeFields = [
      'startTime', 'start_time', 'beginTime', 'begin_time', 
      'fromTime', 'from_time', 'epoch_millis', 'sample_time',
      'stage_start_time' // Health Connect sleep stages
    ];
    
    for (const field of startTimeFields) {
      if (record[field] !== undefined && record[field] !== null) {
        return new Date(record[field]);
      }
    }
    
    return undefined;
  }

  /**
   * Extract end time from various possible timestamp field formats
   */
  private static extractEndTime(record: any): Date | undefined {
    const endTimeFields = [
      'endTime', 'end_time', 'finishTime', 'finish_time',
      'toTime', 'to_time', 'until_time', 'stop_time',
      'stage_end_time' // Health Connect sleep stages
    ];
    
    for (const field of endTimeFields) {
      if (record[field] !== undefined && record[field] !== null) {
        return new Date(record[field]);
      }
    }
    
    return undefined;
  }

  /**
   * Extract field value handling different data types appropriately
   */
  private static extractFieldValue(record: any, possibleNames: string[], targetField: string): any {
    for (const name of possibleNames) {
      const value = record[name];
      if (value !== undefined && value !== null && value !== '') {
        // Handle text fields
        if (this.isTextField(targetField)) {
          return String(value);
        }
        
        // Handle numeric fields
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          // Fix BMI unit conversion - if BMI > 100, it was calculated with weight in grams
          if (targetField === 'bmi' && numValue > 100) {
            const correctedBMI = numValue / 1000; // Convert from grams-based to kg-based BMI
            return Math.round(correctedBMI * 10) / 10; // Round to 1 decimal place
          }
          
          // Round integer fields
          if (this.isIntegerField(targetField)) {
            return Math.round(numValue);
          }
          return numValue;
        }
      }
    }
    return undefined;
  }

  /**
   * Check if field should be stored as text
   */
  private static isTextField(fieldName: string): boolean {
    const textFields = ['cyclePhase', 'bodyType'];
    return textFields.includes(fieldName);
  }

  /**
   * Check if field should be stored as integer
   */
  private static isIntegerField(fieldName: string): boolean {
    const integerFields = [
      'sleepScore', 'sleepDuration', 'deepSleep', 'remSleep', 'lightSleep',
      'recoveryScore', 'readinessScore', 'restingHeartRate', 'heartRateVariability',
      'metabolicAge', 'fitnessAge', 'bmr', 'visceralFat', 'bloodPressureSystolic',
      'bloodPressureDiastolic', 'respiratoryRate', 'stressLevel', 'steps',
      'caloriesBurned', 'wakeEvents', 'sleepDebt', 'bodyScore', 'healthspan',
      'menstrualCycleDay'
    ];
    return integerFields.includes(fieldName);
  }

  /**
   * COMPREHENSIVE field mappings covering ALL schema fields
   * This is the single source of truth for field mapping across all importers
   */
  private static getComprehensiveFieldMappings(): Record<string, string[]> {
    return {
      // Sleep metrics
      sleepScore: ['sleepScore', 'sleep_score', 'SleepScore', 'sleep_performance_percentage'],
      sleepDuration: ['sleepDuration', 'sleep_duration', 'minutesAsleep', 'sleep_minutes', 'durationMinutes', 'duration_minutes', 'sleep_duration_minutes'],
      deepSleep: ['deepSleep', 'deep_sleep', 'deepSleepMinutes', 'deep_sleep_minutes', 'slow_wave_sleep_minutes', 'sws_minutes'],
      remSleep: ['remSleep', 'rem_sleep', 'remSleepMinutes', 'rem_sleep_minutes'],
      lightSleep: ['lightSleep', 'light_sleep', 'lightSleepMinutes', 'light_sleep_minutes'],
      sleepEfficiency: ['sleepEfficiency', 'sleep_efficiency', 'efficiency', 'sleep_efficiency_percentage'],
      wakeEvents: ['wakeEvents', 'wake_events', 'awakenings', 'interruptions', 'wake_count'],
      sleepDebt: ['sleepDebt', 'sleep_debt', 'debt_minutes', 'sleep_debt_minutes'],
      
      // Recovery & performance metrics  
      recoveryScore: ['recoveryScore', 'recovery_score', 'recovery', 'recovery_percentage'],
      strainScore: ['strainScore', 'strain_score', 'strain', 'strain_level'],
      readinessScore: ['readinessScore', 'readiness_score', 'readiness', 'readiness_percentage'],
      trainingLoad: ['trainingLoad', 'training_load', 'load', 'workout_load'],
      
      // Heart metrics
      restingHeartRate: ['restingHeartRate', 'resting_heart_rate', 'rhr', 'rest_heart_rate', 'beats_per_minute'],
      heartRateVariability: ['heartRateVariability', 'heart_rate_variability', 'hrv', 'hrv_rmssd', 'rmssd'],
      
      // Body composition - comprehensive RENPHO & smart scale support
      weight: ['weight', 'weightKg', 'weight_kg', 'body_weight', 'Weight', 'WeightKg'],
      bodyFatPercentage: ['bodyFatPercentage', 'body_fat_percentage', 'bodyFat', 'fat_percentage', 'body_fat', 'bodyfat', 'BodyFat'],
      muscleMass: ['muscleMass', 'muscle_mass', 'lean_mass', 'muscle_kg', 'muscle', 'MuscleMass'],
      bmi: ['bmi', 'BMI', 'body_mass_index', 'bodyMassIndex'],
      bmr: ['bmr', 'BMR', 'basal_metabolic_rate', 'basalMetabolicRate'],
      visceralFat: ['visceralFat', 'visceral_fat', 'VisceralFat', 'visceral'],
      waterPercentage: ['waterPercentage', 'water_percentage', 'body_water', 'WaterPercentage', 'water', 'water_percent'],
      boneMass: ['boneMass', 'bone_mass', 'BoneMass', 'bone_kg', 'bone', 'bone_weight'],
      proteinPercentage: ['proteinPercentage', 'protein_percentage', 'ProteinPercentage', 'protein', 'protein_percent'],
      subcutaneousFat: ['subcutaneousFat', 'subcutaneous_fat', 'SubcutaneousFat', 'subcutaneous', 'sfat'],
      leanBodyMass: ['leanBodyMass', 'lean_body_mass', 'LeanBodyMass', 'ffm', 'fat_free_mass', 'lean_mass_total'],
      bodyScore: ['bodyScore', 'body_score', 'BodyScore', 'rating', 'body_rating', 'score'],
      bodyType: ['bodyType', 'body_type', 'BodyType', 'type', 'Type'],
      
      // Vital signs
      bloodPressureSystolic: ['bloodPressureSystolic', 'blood_pressure_systolic', 'systolic', 'bp_systolic', 'sys', 'systolic_pressure'],
      bloodPressureDiastolic: ['bloodPressureDiastolic', 'blood_pressure_diastolic', 'diastolic', 'bp_diastolic', 'dia', 'diastolic_pressure'],
      oxygenSaturation: ['oxygenSaturation', 'oxygen_saturation', 'spo2', 'SpO2', 'oxygen', 'percentage'],
      skinTemperature: ['skinTemperature', 'skin_temperature', 'temp', 'temperature', 'skin_temp'],
      respiratoryRate: ['respiratoryRate', 'respiratory_rate', 'breathing_rate', 'breath_rate', 'respiration_rate'],
      stressLevel: ['stressLevel', 'stress_level', 'stress', 'stress_score'],
      
      // Activity metrics
      steps: ['steps', 'stepCount', 'daily_steps', 'step_count', 'Steps', 'count'],
      distance: ['distance', 'distanceKm', 'distance_km', 'total_distance', 'Distance'],
      caloriesBurned: ['caloriesBurned', 'calories', 'calories_burned', 'active_calories', 'cal', 'Calories'],
      activityRingCompletion: ['activityRingCompletion', 'activity_ring_completion', 'ring_completion', 'completion'],
      
      // Advanced metrics
      metabolicAge: ['metabolicAge', 'metabolic_age', 'MetabolicAge', 'meta_age'],
      fitnessAge: ['fitnessAge', 'fitness_age', 'FitnessAge', 'cardio_age'],
      vo2Max: ['vo2Max', 'vo2_max', 'VO2Max', 'vo2max', 'cardio_fitness', 'aerobic_capacity'],
      healthspan: ['healthspan', 'healthspan_score', 'biological_age', 'health_age'],
      
      // Women's health
      menstrualCycleDay: ['menstrualCycleDay', 'menstrual_cycle_day', 'cycle_day', 'day_of_cycle'],
      cyclePhase: ['cyclePhase', 'cycle_phase', 'menstrual_phase', 'phase']
    };
  }

  /**
   * Convert health record to granular health data point format
   * This preserves timestamp precision for time-sensitive data
   */
  static mapToHealthDataPoint(
    record: any, 
    dataType: string, 
    value: number, 
    userId: string = 'default-user'
  ): InsertHealthDataPoint {
    const startTime = this.extractStartTime(record) || this.extractDate(record);
    const endTime = this.extractEndTime(record);
    
    return {
      userId,
      dataType,
      startTime,
      endTime,
      value,
      unit: this.extractUnit(record, dataType),
      metadata: this.extractMetadata(record),
      sourceApp: record.source_app || record.sourceApp,
      deviceId: record.device_id || record.deviceId
    };
  }

  /**
   * Extract unit information based on data type
   */
  private static extractUnit(record: any, dataType: string): string | undefined {
    // Check for explicit unit fields first
    if (record.unit || record.Unit) {
      return record.unit || record.Unit;
    }

    // Default units based on data type
    const defaultUnits: Record<string, string> = {
      'steps': 'count',
      'heart_rate': 'bpm',
      'sleep_stage': 'minutes',
      'calories': 'kcal',
      'distance': 'meters',
      'oxygen_saturation': 'percentage',
      'weight': 'kg',
      'body_fat': 'percentage'
    };

    return defaultUnits[dataType];
  }

  /**
   * Extract metadata from record for additional context
   */
  private static extractMetadata(record: any): any {
    const metadata: any = {};
    
    // Extract sleep stage type
    if (record.stage || record.sleep_stage || record.stage_type) {
      metadata.stage = record.stage || record.sleep_stage || record.stage_type;
    }
    
    // Extract activity type
    if (record.activity_type || record.exerciseType) {
      metadata.activityType = record.activity_type || record.exerciseType;
    }
    
    // Extract confidence or accuracy if available
    if (record.confidence || record.accuracy) {
      metadata.confidence = record.confidence || record.accuracy;
    }
    
    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  /**
   * Merge multiple health records for the same date
   * Useful when importing from multiple sources
   */
  static mergeHealthRecords(existing: InsertHealthMetrics, newData: InsertHealthMetrics): InsertHealthMetrics {
    const merged = { ...existing };
    
    // Only update fields that have new non-null values
    Object.entries(newData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && key !== 'userId' && key !== 'date') {
        (merged as any)[key] = value;
      }
    });
    
    return merged;
  }
}

export default ComprehensiveFieldMapper;