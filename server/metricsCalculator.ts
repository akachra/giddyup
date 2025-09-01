/**
 * Health Metrics Calculator
 * Implements calculations according to the detailed metrics specification
 */

import type { HealthMetrics } from "@shared/schema";
import { formatWeightInPounds, detectWeightUnit, convertWeightToKilograms } from "@shared/weightUtils";

// Heart Rate Zone Type Definition
export interface HeartRateZone {
  zone: number;
  name: string;
  minHR: number;
  maxHR: number;
  minutes: number;
  percentage: number;
  color: string;
}

export interface MetricInputs {
  // Basic vitals
  restingHeartRate?: number;
  heartRateVariability?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  
  // Body composition
  weight?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  visceralFat?: number;
  bmr?: number;
  bmi?: number;
  
  // Sleep data
  sleepDurationMinutes?: number;
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
  lightSleepMinutes?: number;
  wakeEvents?: number;
  sleepEfficiency?: number;
  
  // Activity data
  steps?: number;
  activeMinutes?: number;
  heartRateZoneData?: number[];
  previousStrainScore?: number;
  caloriesBurned?: number;
  activeCalories?: number;
  
  // Historical data for trends
  weeklyData?: HealthMetrics[];
  
  // Logged activities for strain calculation
  dailyActivities?: Array<{
    strain?: number;
    duration?: number;
    name?: string;
  }>;
  
  // User profile
  age?: number;
  chronologicalAge?: number;
}

export class HealthMetricsCalculator {
  
  /**
   * 1. Metabolic Age Calculation
   * Base: BMR, BMI, Body Fat %, Visceral Fat, adjusted by activity/sleep
   * Enhanced: includes BP deviation from 120/80 norm
   */
  calculateMetabolicAge(inputs: MetricInputs): number | null {
    const { 
      weight, bodyFatPercentage, bmr, bmi, 
      bloodPressureSystolic, bloodPressureDiastolic,
      sleepDurationMinutes, steps, age = 50 
    } = inputs;

    if (!weight || !bodyFatPercentage) return null;

    // Base metabolic age from body composition
    let metabolicAge = age;
    
    // BMI adjustment (optimal range: 18.5-24.9)
    if (bmi) {
      if (bmi < 18.5) metabolicAge += 2;
      else if (bmi > 24.9 && bmi < 30) metabolicAge += 3;
      else if (bmi >= 30) metabolicAge += 5;
    }
    
    // Body fat adjustment (varies by gender, using general ranges)
    if (bodyFatPercentage > 25) metabolicAge += 3;
    else if (bodyFatPercentage < 10) metabolicAge += 2;
    
    // Activity adjustment
    if (steps) {
      if (steps < 5000) metabolicAge += 2;
      else if (steps > 10000) metabolicAge -= 1;
    }
    
    // Sleep adjustment
    if (sleepDurationMinutes) {
      const sleepHours = sleepDurationMinutes / 60;
      if (sleepHours < 6) metabolicAge += 3;
      else if (sleepHours > 8.5) metabolicAge += 1;
      else if (sleepHours >= 7 && sleepHours <= 8) metabolicAge -= 1;
    }
    
    // BP enhancement - penalty/bonus based on deviation from 120/80
    if (bloodPressureSystolic && bloodPressureDiastolic) {
      const systolicDev = Math.abs(bloodPressureSystolic - 120);
      const diastolicDev = Math.abs(bloodPressureDiastolic - 80);
      const bpPenalty = (systolicDev + diastolicDev) / 20;
      metabolicAge += bpPenalty;
    }
    
    return Math.max(18, Math.min(80, Math.round(metabolicAge)));
  }

  /**
   * 2. Sleep Quality Score (0-100)
   * Time asleep + deep sleep quality - interruptions penalty
   */
  calculateSleepScore(inputs: MetricInputs): number | null {
    const { 
      sleepDurationMinutes, deepSleepMinutes, wakeEvents, sleepEfficiency,
      bloodPressureSystolic 
    } = inputs;

    if (!sleepDurationMinutes) return null;

    let score = 0;
    
    // Duration score (target: 7-9 hours)
    const sleepHours = sleepDurationMinutes / 60;
    if (sleepHours >= 7 && sleepHours <= 9) {
      score += 40;
    } else {
      const deviation = Math.min(Math.abs(sleepHours - 8), 3);
      score += 40 - (deviation * 10);
    }
    
    // Deep sleep bonus
    if (deepSleepMinutes) {
      const deepSleepRatio = deepSleepMinutes / sleepDurationMinutes;
      score += deepSleepRatio * 30; // Up to 30 points for good deep sleep
    } else {
      score += 20; // Default if no stage data
    }
    
    // Sleep efficiency
    if (sleepEfficiency) {
      score += (sleepEfficiency - 80) * 0.5; // Bonus/penalty from 80% baseline
    }
    
    // Wake events penalty
    if (wakeEvents) {
      score -= Math.min(wakeEvents * 5, 20); // Max 20 point penalty
    }
    
    // BP enhancement - morning BP as recovery indicator
    if (bloodPressureSystolic && bloodPressureSystolic > 140) {
      score -= 10; // Penalty for high morning BP
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 3. Strain Score (0-21, WHOOP-style)
   * Cumulative exertion from activity and HR zones
   * Prioritizes manual calories input over device data
   */
  calculateStrainScore(inputs: MetricInputs & { manualCalories?: number }): number | null {
    const { 
      steps, activeMinutes, heartRateZoneData, 
      bloodPressureSystolic, weeklyData, dailyActivities,
      manualCalories, activeCalories 
    } = inputs;

    let strain = 0;
    let hasActivityData = false;
    
    // Priority 1: Use logged activities strain if available (excluding auto-generated walking)
    if (dailyActivities && dailyActivities.length > 0) {
      const loggedActivityStrain = dailyActivities
        .filter(activity => activity.name && activity.name !== 'Daily Walking')
        .reduce((sum, activity) => sum + (activity.strain || 0), 0);
      
      if (loggedActivityStrain > 0) {
        strain = loggedActivityStrain;
        hasActivityData = true;
        
        // Add baseline strain from steps if still available
        if (steps && steps > 5000) {
          strain += Math.min((steps - 5000) / 3000, 3); // Up to 3 bonus from high step count
        }
        
        return Math.max(0, Math.min(21, Math.round(strain * 10) / 10));
      }
    }

    // Fallback: Calculate strain from biometric data when no logged activities
    if (!steps && !activeMinutes && !manualCalories && !activeCalories) return null;
    
    // Base strain from steps
    if (steps) {
      strain += Math.min(steps / 2000, 8); // Up to 8 from steps (16k steps max)
    }
    
    // Active minutes contribution
    if (activeMinutes) {
      strain += Math.min(activeMinutes / 15, 8); // Up to 8 from active minutes
    }
    
    // Calories contribution - prioritize manual input
    const caloriesToUse = manualCalories && manualCalories > 0 ? manualCalories : activeCalories;
    if (caloriesToUse) {
      // Scale calories to strain (similar to activity score but for strain)
      const calorieStrain = Math.min(caloriesToUse / 100, 6); // Up to 6 from calories (600+ cal max)
      strain += calorieStrain;
    }
    
    // HR zone data (if available)
    if (heartRateZoneData && heartRateZoneData.length > 0) {
      const hrStrain = heartRateZoneData.reduce((sum, zoneTime, index) => {
        const multiplier = [0.5, 1, 2, 3, 4][index] || 1; // Zone multipliers
        return sum + (zoneTime * multiplier / 60); // Convert to hours
      }, 0);
      strain += Math.min(hrStrain, 10);
    }
    
    // Compare to personal 7-day average
    if (weeklyData && weeklyData.length > 0) {
      const avgStrain = weeklyData
        .filter(d => d.strainScore)
        .reduce((sum, d) => sum + (d.strainScore || 0), 0) / weeklyData.length;
      
      if (strain > avgStrain * 1.2) strain += 2; // Bonus for exceeding average
    }
    
    // BP enhancement - post-workout hypertension risk
    if (bloodPressureSystolic && bloodPressureSystolic > 160 && strain > 12) {
      strain += 2; // Additional strain for BP spikes during high activity
    }
    
    return Math.max(0, Math.min(21, Math.round(strain)));
  }

  /**
   * 4. Recovery Score (0-100)
   * HRV (40%) + RHR (20%) + Sleep (20%) + Strain (10%) + BP (10%)
   * When HRV is empty: Sleep (50%) + Activity (30%) + RHR Adjustment (20%)
   */
  calculateRecoveryScore(inputs: MetricInputs & { manualCalories?: number }): number | null {
    const {
      heartRateVariability, restingHeartRate, sleepDurationMinutes,
      deepSleepMinutes, remSleepMinutes, previousStrainScore, 
      bloodPressureSystolic, bloodPressureDiastolic,
      steps, caloriesBurned, weeklyData, age = 35, manualCalories
    } = inputs;

    // Use new formula when HRV is empty
    if (!heartRateVariability) {
      return this.calculateRecoveryScoreWithoutHRV({
        sleepDurationMinutes,
        deepSleepMinutes,
        remSleepMinutes,
        restingHeartRate,
        steps,
        activeCalories: inputs.activeCalories,
        manualCalories,
        weeklyData
      });
    }

    // Original HRV-based formula
    let totalWeight = 0;
    let weightedScore = 0;

    // HRV component (40% weight)
    if (heartRateVariability) {
      // Age-adjusted HRV scoring
      const expectedHRV = Math.max(20, 60 - (age - 25) * 0.5);
      const hrvScore = Math.min(100, (heartRateVariability / expectedHRV) * 100);
      weightedScore += hrvScore * 0.4;
      totalWeight += 0.4;
    }

    // RHR component (20% weight)
    if (restingHeartRate) {
      // Age-adjusted RHR scoring (lower is better)
      const expectedRHR = 65 + (age - 25) * 0.2;
      const rhrScore = Math.max(0, Math.min(100, 100 - (restingHeartRate - expectedRHR) * 2));
      weightedScore += rhrScore * 0.2;
      totalWeight += 0.2;
    }

    // Sleep component (20% weight)
    if (sleepDurationMinutes) {
      const sleepScore = this.calculateSleepScore({ sleepDurationMinutes, bloodPressureSystolic }) || 70;
      weightedScore += sleepScore * 0.2;
      totalWeight += 0.2;
    }

    // Previous strain component (10% weight) - lower strain aids recovery
    if (previousStrainScore !== undefined) {
      const strainRecoveryScore = Math.max(0, 100 - (previousStrainScore * 4));
      weightedScore += strainRecoveryScore * 0.1;
      totalWeight += 0.1;
    }

    // BP component (10% weight)
    if (bloodPressureSystolic && bloodPressureDiastolic) {
      const systolicScore = Math.max(0, 100 - Math.abs(bloodPressureSystolic - 120) * 2);
      const diastolicScore = Math.max(0, 100 - Math.abs(bloodPressureDiastolic - 80) * 2);
      const bpScore = (systolicScore + diastolicScore) / 2;
      weightedScore += bpScore * 0.1;
      totalWeight += 0.1;
    }

    // If we don't have enough data, return null
    if (totalWeight < 0.3) return null;

    // Normalize by actual weight used
    const finalScore = weightedScore / totalWeight;
    
    return Math.max(0, Math.min(100, Math.round(finalScore)));
  }

  /**
   * 5. Activity Ring Completion (0-1 or 0-100%)
   * Steps or calories vs daily goal
   */
  calculateActivityRingCompletion(inputs: MetricInputs): number {
    const { steps } = inputs;
    const dailyStepGoal = 10000; // Default goal
    
    if (!steps) return 0;
    
    return Math.min(1, steps / dailyStepGoal);
  }

  /**
   * 7. VO₂ Max Calculation
   * Estimate VO₂ Max from RHR and age using the formula: VO₂ max ≈ 15.3 × (HRmax / RHR)
   * Where HRmax ≈ 220 − age
   */
  calculateVO2Max(inputs: MetricInputs): number | null {
    const { restingHeartRate, age = 50 } = inputs;
    
    if (!restingHeartRate || !age) return null;
    
    const hrMax = 220 - age;
    const vo2Max = 15.3 * (hrMax / restingHeartRate);
    
    return Math.round(vo2Max * 10) / 10; // Round to 1 decimal place
  }

  /**
   * 8. Fitness Age Calculation
   * Estimate based on VO2max approximation using RHR, weight, and activity
   */
  calculateFitnessAge(inputs: MetricInputs): number | null {
    const { 
      restingHeartRate, weight, steps, age = 50,
      bloodPressureSystolic 
    } = inputs;

    if (!restingHeartRate || !weight) return null;

    // Use the dedicated VO2Max calculation
    let estimatedVO2Max = this.calculateVO2Max(inputs);
    if (!estimatedVO2Max) return null;
    
    // Activity adjustment
    if (steps) {
      if (steps > 12000) estimatedVO2Max *= 1.1;
      else if (steps < 5000) estimatedVO2Max *= 0.9;
    }
    
    // Age-adjusted VO2max norms to estimate fitness age
    let fitnessAge = age;
    const expectedVO2Max = 50 - (age - 20) * 0.5; // Rough age decline
    
    const vo2Ratio = estimatedVO2Max / expectedVO2Max;
    if (vo2Ratio > 1.1) fitnessAge -= 5;
    else if (vo2Ratio > 1.05) fitnessAge -= 2;
    else if (vo2Ratio < 0.9) fitnessAge += 5;
    else if (vo2Ratio < 0.95) fitnessAge += 2;
    
    // BP age adjustment
    if (bloodPressureSystolic) {
      if (bloodPressureSystolic > 140) fitnessAge += 5;
      else if (bloodPressureSystolic < 120) fitnessAge -= 2;
    }
    
    return Math.max(18, Math.min(80, Math.round(fitnessAge)));
  }

  /**
   * Recovery Score calculation when HRV is empty
   * Formula: Sleep (50%) + Activity (30%) + RHR Adjustment (20%)
   */
  private calculateRecoveryScoreWithoutHRV(inputs: {
    sleepDurationMinutes?: number;
    deepSleepMinutes?: number;
    remSleepMinutes?: number;
    restingHeartRate?: number;
    steps?: number;
    activeCalories?: number;
    manualCalories?: number;
    weeklyData?: HealthMetrics[];
  }): number | null {
    const {
      sleepDurationMinutes, deepSleepMinutes, remSleepMinutes,
      restingHeartRate, steps, activeCalories, manualCalories, weeklyData
    } = inputs;

    // Calculate Sleep Score (50% weight)
    const sleepScore = this.calculateEnhancedSleepScore({
      sleepDurationMinutes,
      deepSleepMinutes,
      remSleepMinutes
    });
    if (!sleepScore) return null;

    // Calculate Activity Score (30% weight) - prioritize manual calories input
    const activityScore = this.calculateActivityScore(steps, activeCalories, manualCalories);

    // Calculate RHR Adjustment (20% weight)
    const rhrAdjustment = this.calculateRHRAdjustment(restingHeartRate, weeklyData);

    // Final recovery score
    const recoveryScore = (
      sleepScore * 0.5 +
      activityScore * 0.3 +
      rhrAdjustment * 0.2
    );

    return Math.max(0, Math.min(100, Math.round(recoveryScore)));
  }

  /**
   * Enhanced Sleep Score calculation for recovery formula
   * Based on sleep duration (60%) and sleep quality (40%)
   */
  private calculateEnhancedSleepScore(inputs: {
    sleepDurationMinutes?: number;
    deepSleepMinutes?: number;
    remSleepMinutes?: number;
  }): number | null {
    const { sleepDurationMinutes, deepSleepMinutes, remSleepMinutes } = inputs;
    
    if (!sleepDurationMinutes) return null;

    // Sleep Duration Score (target: 8 hours = 480 minutes)
    const sleepDurationScore = Math.min((sleepDurationMinutes / 480) * 100, 100);

    // Sleep Quality Score (based on deep + REM sleep)
    let sleepQualityScore = 70; // Default if no stage data
    if (deepSleepMinutes !== undefined && remSleepMinutes !== undefined) {
      const deepREMMinutes = deepSleepMinutes + remSleepMinutes;
      sleepQualityScore = Math.min((deepREMMinutes / sleepDurationMinutes) * 100, 100);
    }

    // Final sleep score: 60% duration + 40% quality
    const sleepScore = (sleepDurationScore * 0.6) + (sleepQualityScore * 0.4);
    
    return Math.max(0, Math.min(100, sleepScore));
  }

  /**
   * Activity Score calculation (50% steps + 50% calories)
   * Prioritizes manual calories input over device data
   */
  private calculateActivityScore(steps?: number, calories?: number, manualCalories?: number): number {
    let stepsScore = 50; // Default if no steps data
    let caloriesScore = 50; // Default if no calories data
    
    // Calculate steps component (50% weight)
    if (steps !== null && steps !== undefined) {
      if (steps < 3000) {
        stepsScore = 100;
      } else if (steps > 12000) {
        stepsScore = 50;
      } else {
        stepsScore = 100 - ((steps - 3000) / 9000) * 50;
      }
    }
    
    // Calculate active calories component (50% weight) - prioritize manual input
    const caloriesToUse = manualCalories && manualCalories > 0 ? manualCalories : calories;
    // Adjusted ranges for active calories (42-451 in your data)
    if (caloriesToUse !== null && caloriesToUse !== undefined) {
      if (caloriesToUse < 100) {
        caloriesScore = 100; // Very low activity/rest day
      } else if (caloriesToUse > 500) {
        caloriesScore = 50; // Very high activity
      } else {
        caloriesScore = 100 - ((caloriesToUse - 100) / 400) * 50;
      }
    }
    
    // Final score: 50% steps + 50% calories
    return Math.round((stepsScore * 0.5) + (caloriesScore * 0.5));
  }

  /**
   * RHR Adjustment calculation based on 7-day baseline
   */
  private calculateRHRAdjustment(currentRHR?: number, weeklyData?: HealthMetrics[]): number {
    if (!currentRHR) return 75; // Default if no RHR data
    
    // Calculate 7-day RHR baseline
    let rhrBaseline = currentRHR; // Fallback to current if no historical data
    
    if (weeklyData && weeklyData.length > 0) {
      const rhrValues = weeklyData
        .filter(d => d.restingHeartRate && d.restingHeartRate > 0)
        .map(d => d.restingHeartRate!);
      
      if (rhrValues.length > 0) {
        rhrBaseline = rhrValues.reduce((sum, rhr) => sum + rhr, 0) / rhrValues.length;
      }
    }

    // Calculate RHR adjustment
    if (currentRHR < rhrBaseline) {
      return 100;
    } else if (currentRHR > rhrBaseline + 10) {
      return 50;
    } else {
      return 100 - ((currentRHR - rhrBaseline) / 10) * 50;
    }
  }

  /**
   * Calculate Heart Rate Zones based on age
   * Uses formula: max HR = 220 - age
   * Zone 1: 50-60%, Zone 2: 60-70%, Zone 3: 70-80%, Zone 4: 80-90%, Zone 5: 90-100%
   */
  calculateHeartRateZones(age: number): Array<{ zone: number; name: string; minHR: number; maxHR: number; color: string }> {
    const maxHR = 220 - age;
    
    return [
      {
        zone: 1,
        name: 'Zone 1',
        minHR: Math.round(maxHR * 0.5),
        maxHR: Math.round(maxHR * 0.6),
        color: '#666666' // Gray
      },
      {
        zone: 2,
        name: 'Zone 2',
        minHR: Math.round(maxHR * 0.6),
        maxHR: Math.round(maxHR * 0.7),
        color: '#00D570' // Green
      },
      {
        zone: 3,
        name: 'Zone 3',
        minHR: Math.round(maxHR * 0.7),
        maxHR: Math.round(maxHR * 0.8),
        color: '#4A9EFF' // Blue
      },
      {
        zone: 4,
        name: 'Zone 4',
        minHR: Math.round(maxHR * 0.8),
        maxHR: Math.round(maxHR * 0.9),
        color: '#FF8C42' // Orange
      },
      {
        zone: 5,
        name: 'Zone 5',
        minHR: Math.round(maxHR * 0.9),
        maxHR: Math.round(maxHR * 1.0),
        color: '#FF4444' // Red
      }
    ];
  }

  /**
   * Calculate time in heart rate zones from heart rate data points
   */
  calculateTimeInHeartRateZones(heartRateData: Array<{ value: number; timestamp: Date }>, age: number): HeartRateZone[] {
    const zones = this.calculateHeartRateZones(age);
    
    // Initialize zone minutes
    const zoneMinutes = zones.map(zone => ({
      ...zone,
      minutes: 0,
      percentage: 0
    }));

    if (!heartRateData || heartRateData.length === 0) {
      return zoneMinutes;
    }

    // Calculate time spent in each zone (assuming each data point represents 1 minute)
    heartRateData.forEach(dataPoint => {
      const hr = dataPoint.value;
      
      for (const zone of zoneMinutes) {
        if (hr >= zone.minHR && hr < zone.maxHR) {
          zone.minutes += 1;
          break;
        }
      }
    });

    // Calculate percentages
    const totalMinutes = heartRateData.length;
    if (totalMinutes > 0) {
      zoneMinutes.forEach(zone => {
        zone.percentage = Math.round((zone.minutes / totalMinutes) * 100);
      });
    }

    return zoneMinutes;
  }

  /**
   * 8. Stress Level Score (1-100)
   * Composite score based on HRV, RHR, sleep quality, and strain
   */
  calculateStressLevel(inputs: MetricInputs): number | null {
    const {
      heartRateVariability,
      restingHeartRate,
      sleepDurationMinutes,
      sleepEfficiency,
      wakeEvents,
      strainScore,
      bloodPressureSystolic,
      age = 50
    } = inputs;

    // Need at least some data to calculate stress
    if (!restingHeartRate && !sleepDurationMinutes) return null;

    let stressScore = 50; // Start with moderate baseline

    // RHR component (30% weight) - higher RHR indicates more stress
    if (restingHeartRate) {
      const expectedRHR = 65 + (age - 25) * 0.2; // Age-adjusted baseline
      const rhrDeviation = restingHeartRate - expectedRHR;
      stressScore += Math.min(Math.max(rhrDeviation * 1.5, -20), 30); // Scale deviation
    }

    // HRV component (25% weight) - lower HRV indicates more stress
    if (heartRateVariability) {
      const expectedHRV = Math.max(20, 60 - (age - 25) * 0.5);
      const hrvRatio = heartRateVariability / expectedHRV;
      stressScore -= (hrvRatio - 1) * 25; // Higher HRV reduces stress
    }

    // Sleep quality component (25% weight) - poor sleep increases stress
    if (sleepDurationMinutes) {
      const sleepHours = sleepDurationMinutes / 60;
      if (sleepHours < 6) {
        stressScore += 20; // Severe sleep deprivation
      } else if (sleepHours < 7) {
        stressScore += 10; // Mild sleep deprivation
      } else if (sleepHours > 9) {
        stressScore += 5; // Excessive sleep can indicate stress
      } else {
        stressScore -= 10; // Good sleep reduces stress
      }
    }

    // Sleep disruption component
    if (sleepEfficiency && sleepEfficiency < 80) {
      stressScore += (80 - sleepEfficiency) * 0.5; // Poor efficiency increases stress
    }

    if (wakeEvents && wakeEvents > 3) {
      stressScore += Math.min((wakeEvents - 3) * 3, 15); // Frequent wakings increase stress
    }

    // Physical strain component (10% weight)
    if (strainScore && strainScore > 15) {
      stressScore += Math.min((strainScore - 15) * 2, 10); // High strain increases stress
    }

    // Blood pressure component (10% weight)
    if (bloodPressureSystolic) {
      if (bloodPressureSystolic > 130) {
        stressScore += Math.min((bloodPressureSystolic - 130) * 0.5, 15);
      } else if (bloodPressureSystolic < 110) {
        stressScore -= 5; // Low BP might indicate good recovery
      }
    }

    return Math.max(1, Math.min(100, Math.round(stressScore)));
  }

  /**
   * Calculate all metrics for a given set of inputs
   */
  calculateAllMetrics(inputs: MetricInputs) {
    return {
      metabolicAge: this.calculateMetabolicAge(inputs),
      sleepScore: this.calculateSleepScore(inputs),
      strainScore: this.calculateStrainScore(inputs),
      recoveryScore: this.calculateRecoveryScore(inputs),
      stressLevel: this.calculateStressLevel(inputs),
      activityRingCompletion: this.calculateActivityRingCompletion(inputs),
      vo2Max: this.calculateVO2Max(inputs),
      fitnessAge: this.calculateFitnessAge(inputs)
    };
  }
}

export const metricsCalculator = new HealthMetricsCalculator();