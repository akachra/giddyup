// Extended metrics interface for comprehensive recommendations
interface ExtendedMetricInputs {
  age?: number;
  weight?: number;
  bodyFatPercentage?: number;
  bmr?: number;
  bmi?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  sleepDurationMinutes?: number;
  steps?: number;
  heartRateVariability?: number;
  restingHeartRate?: number;
  vo2Max?: number;
}

export interface MetabolicRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'Body Composition' | 'Cardiovascular' | 'Sleep' | 'Recovery' | 'Activity';
  title: string;
  description: string;
  currentValue: string;
  targetValue: string;
  potentialImprovement: string;
  actionSteps: string[];
  timeframe: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
}

export interface PersonalizedMetabolicAdvice {
  currentMetabolicAge: number;
  actualAge: number;
  potentialImprovement: number;
  priorityRecommendations: MetabolicRecommendation[];
  secondaryRecommendations: MetabolicRecommendation[];
  strengthsToMaintain: string[];
  overallStrategy: string;
}

/**
 * Generate personalized metabolic age recommendations based on current metrics
 */
export function generatePersonalizedMetabolicAdvice(
  metrics: ExtendedMetricInputs,
  currentMetabolicAge: number,
  actualAge: number
): PersonalizedMetabolicAdvice {
  console.log('🔍 Metabolic Analysis Inputs:', {
    bodyFat: metrics.bodyFatPercentage,
    rhr: metrics.restingHeartRate,
    vo2Max: metrics.vo2Max,
    sleep: metrics.sleepDurationMinutes ? Math.round(metrics.sleepDurationMinutes / 60 * 10) / 10 : null,
    steps: metrics.steps,
    hrv: metrics.heartRateVariability
  });
  
  const recommendations: MetabolicRecommendation[] = [];
  const strengthsToMaintain: string[] = [];

  // Analyze each metric and generate specific recommendations
  
  // Body Composition Analysis
  console.log('🔍 Body Fat Analysis:', metrics.bodyFatPercentage, '> 25?', metrics.bodyFatPercentage > 25);
  if (metrics.bodyFatPercentage && metrics.bodyFatPercentage > 25) {
    const targetBodyFat = actualAge < 40 ? 15 : 18;
    const currentBF = metrics.bodyFatPercentage;
    const potentialYearsReduction = Math.round(((currentBF - targetBodyFat) / 5) * 2.25);
    
    recommendations.push({
      priority: 'HIGH',
      category: 'Body Composition',
      title: 'Reduce Body Fat Percentage',
      description: `Your body fat of ${currentBF.toFixed(1)}% is adding approximately ${Math.round((currentBF - 25) / 5 * 2.25)} years to your metabolic age. This is your biggest opportunity for improvement.`,
      currentValue: `${currentBF.toFixed(1)}%`,
      targetValue: `${targetBodyFat}%`,
      potentialImprovement: `${potentialYearsReduction} years younger`,
      actionSteps: [
        'Increase protein intake to 1.2g per kg body weight to preserve muscle during fat loss',
        'Add 2-3 resistance training sessions per week focusing on compound movements',
        'Create a moderate caloric deficit (300-500 calories) through portion control',
        'Incorporate 20-30 minutes of moderate cardio 4-5 times per week',
        'Track body composition weekly using your smart scale'
      ],
      timeframe: '3-6 months for significant improvement',
      difficulty: 'Moderate'
    });
  } else if (metrics.bodyFatPercentage && metrics.bodyFatPercentage <= 20) {
    strengthsToMaintain.push(`Excellent body composition at ${metrics.bodyFatPercentage.toFixed(1)}% body fat`);
  }

  // Cardiovascular Health Analysis
  if (metrics.restingHeartRate && metrics.restingHeartRate > 55) {
    const currentRHR = metrics.restingHeartRate;
    const targetRHR = 52;
    const potentialYearsReduction = Math.round((currentRHR - targetRHR) / 10);
    
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Cardiovascular',
      title: 'Improve Cardiovascular Fitness',
      description: `Your resting heart rate of ${currentRHR} bpm suggests room for cardiovascular improvement. Lower RHR indicates better heart efficiency.`,
      currentValue: `${currentRHR} bpm`,
      targetValue: `${targetRHR} bpm`,
      potentialImprovement: `${potentialYearsReduction} year younger`,
      actionSteps: [
        'Add 2-3 interval training sessions per week (30 seconds high intensity, 90 seconds recovery)',
        'Include one long, steady-state cardio session (45-60 minutes) weekly',
        'Take stairs instead of elevators when possible',
        'Aim for 10,000+ steps daily with brisk walking pace',
        'Monitor progress with your manual heart rate tracking'
      ],
      timeframe: '6-8 weeks for noticeable RHR improvement',
      difficulty: 'Easy'
    });
  } else if (metrics.restingHeartRate && metrics.restingHeartRate <= 55) {
    strengthsToMaintain.push(`Excellent cardiovascular fitness with RHR of ${metrics.restingHeartRate} bpm`);
  }

  // Recovery & HRV Analysis
  if (metrics.heartRateVariability && metrics.heartRateVariability < 35) {
    const currentHRV = metrics.heartRateVariability;
    const targetHRV = 40;
    
    recommendations.push({
      priority: 'HIGH',
      category: 'Recovery',
      title: 'Enhance Recovery & Stress Management',
      description: `Your HRV of ${currentHRV}ms indicates elevated stress or poor recovery. Improving HRV can significantly impact metabolic age.`,
      currentValue: `${currentHRV}ms`,
      targetValue: `${targetHRV}ms+`,
      potentialImprovement: '2-3 years younger',
      actionSteps: [
        'Implement daily 10-15 minute meditation or breathing exercises',
        'Ensure 7-8 hours of quality sleep nightly',
        'Schedule 1-2 complete rest days per week from intense exercise',
        'Consider cold exposure therapy (cold showers, ice baths)',
        'Reduce alcohol consumption and manage stress triggers'
      ],
      timeframe: '4-6 weeks for HRV improvement',
      difficulty: 'Moderate'
    });
  } else if (metrics.heartRateVariability && metrics.heartRateVariability >= 35) {
    strengthsToMaintain.push(`Good stress management with HRV of ${metrics.heartRateVariability}ms`);
  }

  // Sleep Quality Analysis
  if (metrics.sleepDurationMinutes && metrics.sleepDurationMinutes < 420) { // Less than 7 hours
    const currentSleep = Math.round(metrics.sleepDurationMinutes / 60 * 10) / 10;
    
    recommendations.push({
      priority: 'HIGH',
      category: 'Sleep',
      title: 'Optimize Sleep Duration',
      description: `You're getting ${currentSleep} hours of sleep. Insufficient sleep significantly accelerates metabolic aging through hormonal disruption.`,
      currentValue: `${currentSleep} hours`,
      targetValue: '7.5-8.5 hours',
      potentialImprovement: '2-4 years younger',
      actionSteps: [
        'Set a consistent bedtime and wake time, even on weekends',
        'Create a 1-hour wind-down routine before bed (no screens)',
        'Keep bedroom temperature between 65-68°F (18-20°C)',
        'Use blackout curtains and consider a white noise machine',
        'Avoid caffeine after 2 PM and alcohol 3 hours before bed'
      ],
      timeframe: '2-3 weeks for sleep pattern establishment',
      difficulty: 'Easy'
    });
  } else if (metrics.sleepDurationMinutes && metrics.sleepDurationMinutes >= 420) {
    strengthsToMaintain.push(`Excellent sleep duration averaging ${Math.round(metrics.sleepDurationMinutes / 60 * 10) / 10} hours`);
  }

  // Activity Level Analysis
  if (metrics.steps && metrics.steps < 8000) {
    const currentSteps = metrics.steps;
    
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Activity',
      title: 'Increase Daily Movement',
      description: `Your current activity level of ${currentSteps.toLocaleString()} steps suggests opportunities for more movement throughout the day.`,
      currentValue: `${currentSteps.toLocaleString()} steps`,
      targetValue: '10,000+ steps',
      potentialImprovement: '1-2 years younger',
      actionSteps: [
        'Take 2-3 walking breaks during work hours (10 minutes each)',
        'Park farther away from entrances when running errands',
        'Use a standing desk for part of your workday',
        'Take phone calls while walking when possible',
        'Set hourly movement reminders on your smartwatch'
      ],
      timeframe: '1-2 weeks to establish new movement habits',
      difficulty: 'Easy'
    });
  } else if (metrics.steps && metrics.steps >= 10000) {
    strengthsToMaintain.push(`Excellent daily activity with ${metrics.steps.toLocaleString()} steps`);
  }

  // VO2 Max Analysis (if available)
  if (metrics.vo2Max && metrics.vo2Max < 40) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Cardiovascular',
      title: 'Boost Aerobic Capacity',
      description: `Your VO2 Max of ${metrics.vo2Max} suggests room for cardiovascular improvement. Higher aerobic capacity is strongly linked to longevity.`,
      currentValue: `${metrics.vo2Max} ml/kg/min`,
      targetValue: '45+ ml/kg/min',
      potentialImprovement: '2-3 years younger',
      actionSteps: [
        'Add high-intensity interval training (HIIT) 2x per week',
        'Include one tempo run or bike ride weekly (comfortably hard pace)',
        'Cross-train with swimming, rowing, or cycling for variety',
        'Gradually increase workout intensity over 4-6 week cycles',
        'Track improvements with fitness assessments monthly'
      ],
      timeframe: '8-12 weeks for measurable VO2 Max improvement',
      difficulty: 'Challenging'
    });
  } else if (metrics.vo2Max && metrics.vo2Max >= 45) {
    strengthsToMaintain.push(`Outstanding aerobic fitness with VO2 Max of ${metrics.vo2Max}`);
  }

  // Sort recommendations by priority
  const priorityRecommendations = recommendations.filter(r => r.priority === 'HIGH');
  const secondaryRecommendations = recommendations.filter(r => r.priority === 'MEDIUM' || r.priority === 'LOW');
  
  console.log('📊 Generated Recommendations:', {
    total: recommendations.length,
    high: priorityRecommendations.length,
    medium: secondaryRecommendations.length,
    recommendations: recommendations.map(r => `${r.priority}: ${r.title}`)
  });

  // Calculate potential improvement by summing up the actual potential years from recommendations
  let potentialImprovement = 0;
  
  // Extract potential years from each recommendation's potentialImprovement string
  recommendations.forEach(rec => {
    const match = rec.potentialImprovement.match(/(\d+(?:-\d+)?)\s*years?\s*younger/);
    if (match) {
      const years = match[1].includes('-') 
        ? parseInt(match[1].split('-')[1]) // Take the higher end of the range
        : parseInt(match[1]);
      potentialImprovement += years;
    }
  });
  
  // Cap at reasonable maximum
  potentialImprovement = Math.min(potentialImprovement, 10);

  // Generate overall strategy
  let overallStrategy = '';
  if (priorityRecommendations.length === 0) {
    overallStrategy = `Excellent metabolic health! Focus on maintaining your current habits while fine-tuning the areas with medium priority. Your metabolic age of ${currentMetabolicAge} is very close to your chronological age of ${actualAge}.`;
  } else if (priorityRecommendations.length === 1) {
    overallStrategy = `You have one key area to focus on: ${priorityRecommendations[0].category.toLowerCase()}. Addressing this could reduce your metabolic age by 2-4 years. Start with the highest-impact actions and track your progress weekly.`;
  } else {
    overallStrategy = `You have ${priorityRecommendations.length} high-priority areas for improvement. Start with the easiest changes first to build momentum, then tackle the more challenging ones. Focus on one category per month for sustainable progress.`;
  }

  return {
    currentMetabolicAge,
    actualAge,
    potentialImprovement,
    priorityRecommendations,
    secondaryRecommendations,
    strengthsToMaintain,
    overallStrategy
  };
}

/**
 * Get a quick summary of the most impactful recommendation
 */
export function getTopRecommendation(advice: PersonalizedMetabolicAdvice): string {
  if (advice.priorityRecommendations.length === 0) {
    return "Maintain your excellent metabolic health with consistent healthy habits.";
  }
  
  const topRec = advice.priorityRecommendations[0];
  return `Priority focus: ${topRec.title}. ${topRec.potentialImprovement} potential improvement.`;
}