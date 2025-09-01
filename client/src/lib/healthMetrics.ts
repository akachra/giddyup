import { HealthMetrics } from "@shared/schema";

export class HealthMetricsCalculator {
  // Sleep Score calculation (0-100)
  static calculateSleepScore(
    sleepDuration: number, // in minutes
    deepSleep: number,
    remSleep: number,
    lightSleep: number,
    wakeEvents?: number
  ): number {
    // Optimal sleep duration: 7-9 hours (420-540 minutes)
    const durationScore = Math.min(100, Math.max(0, 
      100 - Math.abs(sleepDuration - 480) / 5 // 8 hours optimal
    ));

    // Sleep stage distribution score
    const totalSleep = deepSleep + remSleep + lightSleep;
    const deepPercentage = (deepSleep / totalSleep) * 100;
    const remPercentage = (remSleep / totalSleep) * 100;
    
    // Optimal: 15-20% deep, 20-25% REM
    const stageScore = Math.min(100,
      (deepPercentage >= 15 && deepPercentage <= 20 ? 50 : Math.max(0, 50 - Math.abs(deepPercentage - 17.5) * 2)) +
      (remPercentage >= 20 && remPercentage <= 25 ? 50 : Math.max(0, 50 - Math.abs(remPercentage - 22.5) * 2))
    );

    // Wake events penalty
    const wakeScore = Math.max(0, 100 - (wakeEvents || 0) * 10);

    return Math.round((durationScore * 0.4 + stageScore * 0.4 + wakeScore * 0.2));
  }

  // Recovery Score calculation (0-100)
  static calculateRecoveryScore(
    hrv: number,
    restingHR: number,
    sleepScore: number,
    previousStrain: number,
    hrvBaseline: number = 35,
    rhrBaseline: number = 60
  ): number {
    // HRV component (40% weight)
    const hrvScore = Math.min(100, Math.max(0, (hrv / hrvBaseline) * 100));
    
    // RHR component (20% weight) - lower is better
    const rhrScore = Math.min(100, Math.max(0, 100 - ((restingHR - rhrBaseline) * 2)));
    
    // Sleep component (20% weight)
    const sleepComponent = sleepScore;
    
    // Strain penalty (10% weight) - high strain reduces recovery
    const strainPenalty = Math.max(0, 100 - (previousStrain - 10) * 5);
    
    // Consistency bonus (10% weight)
    const consistencyBonus = 100; // Could be enhanced with historical data

    return Math.round(
      hrvScore * 0.4 + 
      rhrScore * 0.2 + 
      sleepComponent * 0.2 + 
      strainPenalty * 0.1 + 
      consistencyBonus * 0.1
    );
  }

  // Strain Score calculation (similar to WHOOP's 0-21 scale)
  static calculateStrainScore(
    activeMinutes: number,
    avgHeartRate: number,
    maxHeartRate: number,
    userMaxHR: number = 190
  ): number {
    // Heart rate zones calculation
    const zone1Threshold = userMaxHR * 0.6;  // 60%
    const zone2Threshold = userMaxHR * 0.7;  // 70%
    const zone3Threshold = userMaxHR * 0.8;  // 80%
    const zone4Threshold = userMaxHR * 0.9;  // 90%

    // Estimate time in each zone (simplified)
    let zonePoints = 0;
    if (avgHeartRate > zone4Threshold) zonePoints = 4;
    else if (avgHeartRate > zone3Threshold) zonePoints = 3;
    else if (avgHeartRate > zone2Threshold) zonePoints = 2;
    else if (avgHeartRate > zone1Threshold) zonePoints = 1;

    // Duration factor
    const durationFactor = Math.min(2, activeMinutes / 60); // Max 2x for duration

    // Intensity factor based on max HR achieved
    const intensityFactor = Math.min(1.5, maxHeartRate / userMaxHR);

    return Math.min(21, zonePoints * durationFactor * intensityFactor);
  }

  // Metabolic Age calculation
  static calculateMetabolicAge(
    chronologicalAge: number,
    restingHR: number,
    hrv: number,
    bodyFatPercentage: number,
    bmr: number,
    weight: number
  ): number {
    let metabolicAge = chronologicalAge;

    // RHR adjustment (every 5 bpm difference = 1 year)
    const avgRHRForAge = 60 + (chronologicalAge - 25) * 0.5;
    metabolicAge += (restingHR - avgRHRForAge) / 5;

    // HRV adjustment (higher HRV = younger)
    const avgHRVForAge = 40 - (chronologicalAge - 25) * 0.5;
    metabolicAge -= (hrv - avgHRVForAge) / 3;

    // Body fat adjustment
    const idealBodyFat = chronologicalAge < 30 ? 12 : 15;
    metabolicAge += (bodyFatPercentage - idealBodyFat) / 2;

    // BMR adjustment
    const expectedBMR = weight * 22; // Simplified
    metabolicAge -= (bmr - expectedBMR) / 100;

    return Math.max(18, Math.min(80, Math.round(metabolicAge)));
  }

  // Readiness Index (composite score)
  static calculateReadinessScore(
    recoveryScore: number,
    sleepScore: number,
    strainScore: number,
    subjectiveEnergy?: number // 1-10 scale
  ): number {
    // Base calculation from objective metrics
    const objectiveScore = (
      recoveryScore * 0.4 +
      sleepScore * 0.3 +
      Math.max(0, 100 - strainScore * 5) * 0.2 // Lower strain = higher readiness
    );

    // Subjective energy adjustment (10% weight)
    const subjectiveAdjustment = subjectiveEnergy ? (subjectiveEnergy / 10) * 100 * 0.1 : 0;

    return Math.round(Math.min(100, objectiveScore + subjectiveAdjustment));
  }
}
