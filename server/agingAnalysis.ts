interface AgingAnalysisInputs {
  age?: number;
  bodyFatPercentage?: number;
  restingHeartRate?: number;
  vo2Max?: number;
  sleepDurationMinutes?: number;
  recoveryScore?: number;
  heartRateVariability?: number;
  steps?: number;
  weight?: number;
  bmi?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
}

export interface PersonalizedAgingInsights {
  agingPaceScore: number; // 0-150%, where 100% = normal aging rate
  agingPaceCategory: 'Exceptional' | 'Excellent' | 'Good' | 'Average' | 'Concerning';
  primaryFactors: {
    positive: string[];
    negative: string[];
  };
  personalizedSummary: string;
  keyContributors: Array<{
    metric: string;
    value: string;
    impact: 'positive' | 'negative' | 'neutral';
    explanation: string;
  }>;
  improvementPotential: string;
  comparison: string;
}

/**
 * Generate personalized aging pace analysis based on health metrics
 */
export function generatePersonalizedAgingAnalysis(
  metrics: AgingAnalysisInputs,
  actualAge: number = 50
): PersonalizedAgingInsights {
  console.log('🔍 Aging Analysis Inputs:', {
    bodyFat: metrics.bodyFatPercentage,
    rhr: metrics.restingHeartRate,
    vo2Max: metrics.vo2Max,
    sleep: metrics.sleepDurationMinutes ? Math.round(metrics.sleepDurationMinutes / 60 * 10) / 10 : null,
    recovery: metrics.recoveryScore,
    hrv: metrics.heartRateVariability,
    steps: metrics.steps
  });

  let agingPaceScore = 100; // Start at normal (100%)
  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];
  const keyContributors: Array<{
    metric: string;
    value: string;
    impact: 'positive' | 'negative' | 'neutral';
    explanation: string;
  }> = [];

  // Cardiovascular Health Analysis (RHR)
  if (metrics.restingHeartRate) {
    const rhr = metrics.restingHeartRate;
    if (rhr <= 55) {
      agingPaceScore -= 15; // Excellent cardiovascular fitness
      positiveFactors.push('Excellent cardiovascular fitness');
      keyContributors.push({
        metric: 'Resting Heart Rate',
        value: `${rhr} bpm`,
        impact: 'positive',
        explanation: 'Elite-level cardiovascular efficiency significantly slows aging'
      });
    } else if (rhr <= 65) {
      agingPaceScore -= 8; // Good cardiovascular fitness
      positiveFactors.push('Good cardiovascular fitness');
      keyContributors.push({
        metric: 'Resting Heart Rate',
        value: `${rhr} bpm`,
        impact: 'positive',
        explanation: 'Good heart efficiency provides anti-aging benefits'
      });
    } else if (rhr <= 75) {
      agingPaceScore += 5; // Slightly elevated
      negativeFactors.push('Elevated resting heart rate');
      keyContributors.push({
        metric: 'Resting Heart Rate',
        value: `${rhr} bpm`,
        impact: 'negative',
        explanation: 'Elevated RHR suggests increased cardiovascular stress'
      });
    } else {
      agingPaceScore += 15; // High RHR
      negativeFactors.push('High resting heart rate');
      keyContributors.push({
        metric: 'Resting Heart Rate',
        value: `${rhr} bpm`,
        impact: 'negative',
        explanation: 'High RHR indicates cardiovascular strain and accelerated aging'
      });
    }
  }

  // Body Composition Analysis
  if (metrics.bodyFatPercentage) {
    const bf = metrics.bodyFatPercentage;
    if (bf <= 15) {
      agingPaceScore -= 12; // Excellent body composition
      positiveFactors.push('Optimal body composition');
      keyContributors.push({
        metric: 'Body Fat',
        value: `${bf.toFixed(1)}%`,
        impact: 'positive',
        explanation: 'Low body fat reduces inflammation and aging acceleration'
      });
    } else if (bf <= 20) {
      agingPaceScore -= 6; // Good body composition
      positiveFactors.push('Good body composition');
      keyContributors.push({
        metric: 'Body Fat',
        value: `${bf.toFixed(1)}%`,
        impact: 'positive',
        explanation: 'Healthy body fat percentage supports longevity'
      });
    } else if (bf <= 25) {
      // Neutral - no change to aging pace
      keyContributors.push({
        metric: 'Body Fat',
        value: `${bf.toFixed(1)}%`,
        impact: 'neutral',
        explanation: 'Body fat is within acceptable range for your age'
      });
    } else if (bf <= 30) {
      agingPaceScore += 8; // Elevated body fat
      negativeFactors.push('Elevated body fat percentage');
      keyContributors.push({
        metric: 'Body Fat',
        value: `${bf.toFixed(1)}%`,
        impact: 'negative',
        explanation: 'Excess body fat increases inflammation and accelerates aging'
      });
    } else {
      agingPaceScore += 18; // High body fat
      negativeFactors.push('High body fat percentage');
      keyContributors.push({
        metric: 'Body Fat',
        value: `${bf.toFixed(1)}%`,
        impact: 'negative',
        explanation: 'High body fat significantly accelerates biological aging'
      });
    }
  }

  // Aerobic Fitness Analysis (VO2 Max)
  if (metrics.vo2Max) {
    const vo2 = metrics.vo2Max;
    if (vo2 >= 50) {
      agingPaceScore -= 15; // Excellent aerobic fitness
      positiveFactors.push('Outstanding aerobic fitness');
      keyContributors.push({
        metric: 'VO2 Max',
        value: `${vo2} ml/kg/min`,
        impact: 'positive',
        explanation: 'Elite VO2 Max provides exceptional longevity benefits'
      });
    } else if (vo2 >= 40) {
      agingPaceScore -= 8; // Good aerobic fitness
      positiveFactors.push('Good aerobic fitness');
      keyContributors.push({
        metric: 'VO2 Max',
        value: `${vo2} ml/kg/min`,
        impact: 'positive',
        explanation: 'Good aerobic capacity supports healthy aging'
      });
    } else if (vo2 >= 30) {
      agingPaceScore += 5; // Below average
      negativeFactors.push('Below-average aerobic fitness');
      keyContributors.push({
        metric: 'VO2 Max',
        value: `${vo2} ml/kg/min`,
        impact: 'negative',
        explanation: 'Low aerobic fitness accelerates aging processes'
      });
    }
  }

  // Sleep Quality Analysis
  if (metrics.sleepDurationMinutes) {
    const sleepHours = metrics.sleepDurationMinutes / 60;
    if (sleepHours >= 7.5 && sleepHours <= 8.5) {
      agingPaceScore -= 8; // Optimal sleep
      positiveFactors.push('Optimal sleep duration');
      keyContributors.push({
        metric: 'Sleep Duration',
        value: `${sleepHours.toFixed(1)} hours`,
        impact: 'positive',
        explanation: 'Optimal sleep promotes cellular repair and longevity'
      });
    } else if (sleepHours >= 7 && sleepHours <= 9) {
      agingPaceScore -= 4; // Good sleep
      positiveFactors.push('Good sleep duration');
      keyContributors.push({
        metric: 'Sleep Duration',
        value: `${sleepHours.toFixed(1)} hours`,
        impact: 'positive',
        explanation: 'Adequate sleep supports healthy aging'
      });
    } else if (sleepHours < 6.5 || sleepHours > 9.5) {
      agingPaceScore += 12; // Poor sleep
      negativeFactors.push('Suboptimal sleep duration');
      keyContributors.push({
        metric: 'Sleep Duration',
        value: `${sleepHours.toFixed(1)} hours`,
        impact: 'negative',
        explanation: 'Poor sleep disrupts cellular repair and accelerates aging'
      });
    }
  }

  // Recovery Analysis
  if (metrics.recoveryScore) {
    const recovery = metrics.recoveryScore;
    if (recovery >= 80) {
      agingPaceScore -= 10; // Excellent recovery
      positiveFactors.push('Excellent recovery capacity');
      keyContributors.push({
        metric: 'Recovery Score',
        value: `${recovery}%`,
        impact: 'positive',
        explanation: 'Superior recovery indicates optimal physiological function'
      });
    } else if (recovery >= 65) {
      agingPaceScore -= 5; // Good recovery
      positiveFactors.push('Good recovery capacity');
      keyContributors.push({
        metric: 'Recovery Score',
        value: `${recovery}%`,
        impact: 'positive',
        explanation: 'Good recovery supports healthy aging processes'
      });
    } else if (recovery < 50) {
      agingPaceScore += 10; // Poor recovery
      negativeFactors.push('Poor recovery capacity');
      keyContributors.push({
        metric: 'Recovery Score',
        value: `${recovery}%`,
        impact: 'negative',
        explanation: 'Poor recovery indicates accelerated wear and aging'
      });
    }
  }

  // Activity Level Analysis
  if (metrics.steps) {
    const steps = metrics.steps;
    if (steps >= 10000) {
      agingPaceScore -= 6; // Excellent activity
      positiveFactors.push('High daily activity');
      keyContributors.push({
        metric: 'Daily Steps',
        value: `${steps.toLocaleString()}`,
        impact: 'positive',
        explanation: 'High activity level promotes longevity and cellular health'
      });
    } else if (steps >= 6000) {
      agingPaceScore -= 3; // Moderate activity
      positiveFactors.push('Moderate daily activity');
      keyContributors.push({
        metric: 'Daily Steps',
        value: `${steps.toLocaleString()}`,
        impact: 'positive',
        explanation: 'Moderate activity supports healthy aging'
      });
    } else if (steps < 4000) {
      agingPaceScore += 8; // Low activity
      negativeFactors.push('Low daily activity');
      keyContributors.push({
        metric: 'Daily Steps',
        value: `${steps.toLocaleString()}`,
        impact: 'negative',
        explanation: 'Sedentary lifestyle accelerates aging processes'
      });
    }
  }

  // HRV Analysis (if available)
  if (metrics.heartRateVariability) {
    const hrv = metrics.heartRateVariability;
    if (hrv >= 40) {
      agingPaceScore -= 8; // Excellent autonomic function
      positiveFactors.push('Excellent stress resilience');
      keyContributors.push({
        metric: 'Heart Rate Variability',
        value: `${hrv}ms`,
        impact: 'positive',
        explanation: 'High HRV indicates excellent autonomic function and stress resilience'
      });
    } else if (hrv >= 25) {
      agingPaceScore -= 4; // Good autonomic function
      positiveFactors.push('Good stress resilience');
      keyContributors.push({
        metric: 'Heart Rate Variability',
        value: `${hrv}ms`,
        impact: 'positive',
        explanation: 'Good HRV supports healthy aging and stress management'
      });
    } else if (hrv < 20) {
      agingPaceScore += 10; // Poor autonomic function
      negativeFactors.push('Poor stress resilience');
      keyContributors.push({
        metric: 'Heart Rate Variability',
        value: `${hrv}ms`,
        impact: 'negative',
        explanation: 'Low HRV indicates chronic stress and accelerated aging'
      });
    }
  }

  // Ensure score stays within reasonable bounds
  agingPaceScore = Math.max(60, Math.min(150, agingPaceScore));

  // Determine category
  let agingPaceCategory: 'Exceptional' | 'Excellent' | 'Good' | 'Average' | 'Concerning';
  if (agingPaceScore <= 75) agingPaceCategory = 'Exceptional';
  else if (agingPaceScore <= 85) agingPaceCategory = 'Excellent';
  else if (agingPaceScore <= 95) agingPaceCategory = 'Good';
  else if (agingPaceScore <= 110) agingPaceCategory = 'Average';
  else agingPaceCategory = 'Concerning';

  // Generate personalized summary
  const personalizedSummary = generatePersonalizedSummary(
    agingPaceScore, 
    agingPaceCategory, 
    positiveFactors, 
    negativeFactors,
    actualAge
  );

  // Generate improvement potential
  const improvementPotential = generateImprovementPotential(negativeFactors, agingPaceScore);

  // Generate comparison
  const comparison = generateComparison(agingPaceScore, actualAge);

  console.log('📊 Aging Analysis Results:', {
    score: agingPaceScore,
    category: agingPaceCategory,
    positiveFactors: positiveFactors.length,
    negativeFactors: negativeFactors.length
  });

  return {
    agingPaceScore,
    agingPaceCategory,
    primaryFactors: {
      positive: positiveFactors,
      negative: negativeFactors
    },
    personalizedSummary,
    keyContributors,
    improvementPotential,
    comparison
  };
}

function generatePersonalizedSummary(
  score: number, 
  category: string, 
  positiveFactors: string[], 
  negativeFactors: string[],
  actualAge: number
): string {
  if (category === 'Exceptional') {
    return `Your biological aging rate is exceptional at ${score}% of normal pace. Your ${positiveFactors.join(', ').toLowerCase()} are keeping you significantly younger than your chronological age of ${actualAge}.`;
  } else if (category === 'Excellent') {
    return `You're aging at an excellent rate of ${score}% compared to average. Your ${positiveFactors.slice(0, 2).join(' and ').toLowerCase()} are major contributing factors to this success.`;
  } else if (category === 'Good') {
    return `Your aging rate of ${score}% is good for your age. ${positiveFactors.length > 0 ? `Your ${positiveFactors[0].toLowerCase()} is helping, but ` : ''}${negativeFactors.length > 0 ? `addressing your ${negativeFactors[0].toLowerCase()} could provide significant benefits.` : 'maintaining current habits will serve you well.'}`;
  } else if (category === 'Average') {
    return `You're aging at ${score}% of the normal rate. ${negativeFactors.length > 0 ? `Focus on improving your ${negativeFactors.slice(0, 2).join(' and ').toLowerCase()} ` : ''}to slow your biological aging process.`;
  } else {
    return `Your aging rate of ${score}% needs attention. ${negativeFactors.length > 0 ? `Your ${negativeFactors.slice(0, 2).join(' and ').toLowerCase()} are ` : 'Several factors are '}accelerating your biological age beyond your chronological age.`;
  }
}

function generateImprovementPotential(negativeFactors: string[], currentScore: number): string {
  if (negativeFactors.length === 0) {
    return "Maintain your excellent habits to preserve your exceptional aging rate.";
  } else if (negativeFactors.length === 1) {
    const potentialImprovement = Math.min(15, Math.floor((currentScore - 85) / 2));
    return `Addressing your ${negativeFactors[0].toLowerCase()} could reduce your aging rate by ${potentialImprovement}-${potentialImprovement + 5} percentage points.`;
  } else {
    const potentialImprovement = Math.min(25, Math.floor((currentScore - 80) / 1.5));
    return `Improving your ${negativeFactors.slice(0, 2).join(' and ').toLowerCase()} could reduce your aging rate by ${potentialImprovement}-${potentialImprovement + 10} percentage points.`;
  }
}

function generateComparison(score: number, actualAge: number): string {
  if (score <= 80) {
    return `You're aging like someone 5-8 years younger than your chronological age of ${actualAge}.`;
  } else if (score <= 90) {
    return `You're aging like someone 2-4 years younger than your chronological age of ${actualAge}.`;
  } else if (score <= 100) {
    return `You're aging at about the same rate as your chronological age of ${actualAge}.`;
  } else if (score <= 115) {
    return `You're aging like someone 2-5 years older than your chronological age of ${actualAge}.`;
  } else {
    return `You're aging like someone 5-10 years older than your chronological age of ${actualAge}.`;
  }
}