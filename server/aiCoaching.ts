import OpenAI from "openai";
import { format, isWeekend, getHours } from "date-fns";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

// Coaching cache to minimize API calls
interface CoachingCache {
  lastDataUpdate: Date;
  timeRecommendations?: any;
  recoveryWorkout?: any;
  dailyInsights?: any;
  generatedAt: Date;
}

const coachingCache = new Map<string, CoachingCache>();

interface HealthMetrics {
  sleepScore?: number;
  sleepDuration?: number;
  recoveryScore?: number;
  strainScore?: number;
  restingHeartRate?: number;
  heartRateVariability?: number;
  readinessScore?: number;
  weight?: number;
  bodyFatPercentage?: number;
  steps?: number;
  date: Date;
}

interface CoachingContext {
  currentTime: Date;
  recentMetrics: HealthMetrics[];
  todaysMetrics?: HealthMetrics;
  weeklyTrend: string;
  userGoals?: string[];
}

export class EnhancedAICoach {
  private storage: any;

  constructor(storage: any) {
    this.storage = storage;
  }

  private getUserCacheKey(userId: string): string {
    return `coaching_${userId}`;
  }

  // Get manual HRV data with priority over automatic sources
  private async getManualHRV(date: Date): Promise<number | null> {
    try {
      const manualData = await this.storage.getManualHealthData('DEFAULT_USER_ID', date);
      return manualData?.heartRateVariability || null;
    } catch (error) {
      console.log('No manual HRV data found for date:', date);
      return null;
    }
  }

  // Get manual RHR data with priority over automatic sources  
  private async getManualRHR(date: Date): Promise<number | null> {
    try {
      const manualData = await this.storage.getManualHealthData('DEFAULT_USER_ID', date);
      return manualData?.restingHeartRate || null;
    } catch (error) {
      console.log('No manual RHR data found for date:', date);
      return null;
    }
  }

  private shouldRegenerateCoaching(userId: string, lastDataUpdate: Date, forceRefresh: boolean = false): boolean {
    if (forceRefresh) return true;
    
    const cacheKey = this.getUserCacheKey(userId);
    const cached = coachingCache.get(cacheKey);
    
    if (!cached) return true;
    
    // Regenerate if data was updated after last coaching generation
    return lastDataUpdate > cached.lastDataUpdate;
  }

  private getCachedCoaching(userId: string, type: 'time' | 'workout' | 'insights'): any {
    const cacheKey = this.getUserCacheKey(userId);
    const cached = coachingCache.get(cacheKey);
    
    if (!cached) return null;
    
    switch (type) {
      case 'time': return cached.timeRecommendations;
      case 'workout': return cached.recoveryWorkout;
      case 'insights': return cached.dailyInsights;
      default: return null;
    }
  }

  private setCachedCoaching(userId: string, lastDataUpdate: Date, type: 'time' | 'workout' | 'insights', data: any): void {
    const cacheKey = this.getUserCacheKey(userId);
    let cached = coachingCache.get(cacheKey);
    
    if (!cached) {
      cached = {
        lastDataUpdate,
        generatedAt: new Date()
      };
    }
    
    switch (type) {
      case 'time': cached.timeRecommendations = data; break;
      case 'workout': cached.recoveryWorkout = data; break;
      case 'insights': cached.dailyInsights = data; break;
    }
    
    cached.generatedAt = new Date();
    coachingCache.set(cacheKey, cached);
  }

  /**
   * Generate time-of-day specific recommendations with caching
   */
  async getTimeBasedRecommendations(context: CoachingContext, userId: string = 'default', forceRefresh: boolean = false): Promise<string> {
    // Check cache first unless force refresh requested
    const lastDataUpdate = context.recentMetrics[0]?.date || new Date();
    
    if (!this.shouldRegenerateCoaching(userId, lastDataUpdate, forceRefresh)) {
      const cached = this.getCachedCoaching(userId, 'time');
      if (cached) return JSON.stringify(cached);
    }

    const hour = getHours(context.currentTime);
    const timeOfDay = this.getTimeOfDay(hour);
    const todaysMetrics = context.todaysMetrics;
    
    const prompt = `You are an expert health and fitness coach. Based on the current time (${timeOfDay}) and today's health metrics, provide personalized recommendations.

Current Time: ${format(context.currentTime, 'HH:mm')} (${timeOfDay})
Today's Metrics:
- Sleep Score: ${todaysMetrics?.sleepScore || 'N/A'}/100
- Recovery Score: ${todaysMetrics?.recoveryScore || 'N/A'}/100
- Readiness Score: ${todaysMetrics?.readinessScore || 'N/A'}/100
- Resting Heart Rate: ${todaysMetrics?.restingHeartRate || 'N/A'} bpm
- HRV: ${todaysMetrics?.heartRateVariability || 'N/A'} ms
- Steps so far: ${todaysMetrics?.steps || 0}
- Calories Burned: ${todaysMetrics?.caloriesBurned || 'N/A'}

Weekly Trend: ${context.weeklyTrend}

Provide 3-4 specific, actionable recommendations for this time of day. Consider:
- Optimal timing for activities based on circadian rhythms
- Current recovery state and readiness
- Appropriate intensity levels
- Nutrition and hydration timing
- Sleep optimization for tonight

Format as JSON with this structure:
{
  "timeOfDay": "${timeOfDay}",
  "primaryRecommendation": "Main action to take now",
  "recommendations": [
    {
      "category": "Exercise/Nutrition/Recovery/Sleep",
      "action": "Specific action",
      "reasoning": "Why this is optimal now",
      "timing": "When to do this"
    }
  ],
  "recoveryInsight": "How today's metrics affect recommendations"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      return response.choices[0].message.content || "Unable to generate recommendations";
    } catch (error) {
      console.error('Error generating time-based recommendations:', error);
      return this.getFallbackRecommendations(timeOfDay, todaysMetrics);
    }
  }

  /**
   * Generate recovery-based exercise suggestions with caching
   */
  async getRecoveryBasedWorkout(context: CoachingContext, userId: string = 'default', forceRefresh: boolean = false): Promise<string> {
    // Check cache first unless force refresh requested
    const lastDataUpdate = context.recentMetrics[0]?.date || new Date();
    
    if (!this.shouldRegenerateCoaching(userId, lastDataUpdate, forceRefresh)) {
      const cached = this.getCachedCoaching(userId, 'workout');
      if (cached) return JSON.stringify(cached);
    }

    const todaysMetrics = context.todaysMetrics;
    const recentMetrics = context.recentMetrics.slice(0, 7); // Last 7 days
    
    const avgRecovery = this.calculateAverage(recentMetrics, 'recoveryScore');
    const avgHRV = this.calculateAverage(recentMetrics, 'heartRateVariability');
    const avgSleep = this.calculateAverage(recentMetrics, 'sleepScore');
    
    const prompt = `You are a certified fitness coach specializing in recovery-based training. Design a workout based on current recovery metrics.

Current Recovery State:
- Today's Recovery Score: ${todaysMetrics?.recoveryScore || 'N/A'}/100
- 7-day Average Recovery: ${avgRecovery.toFixed(1)}/100
- Today's HRV: ${todaysMetrics?.heartRateVariability || 'N/A'} ms
- 7-day Average HRV: ${avgHRV.toFixed(1)} ms
- Sleep Quality: ${todaysMetrics?.sleepScore || 'N/A'}/100
- 7-day Average Sleep: ${avgSleep.toFixed(1)}/100
- Resting Heart Rate: ${todaysMetrics?.restingHeartRate || 'N/A'} bpm

Recovery Level Assessment:
- High Recovery (>80): Ready for high-intensity training
- Moderate Recovery (60-80): Moderate intensity, focus on skill/technique
- Low Recovery (<60): Active recovery, light movement only

Provide a personalized workout recommendation as JSON:
{
  "recoveryLevel": "High/Moderate/Low",
  "recommendedIntensity": "High/Moderate/Low/Recovery",
  "workoutType": "Strength/Cardio/HIIT/Recovery/Flexibility",
  "duration": "Duration in minutes",
  "exercises": [
    {
      "name": "Exercise name",
      "sets": "Number of sets or duration",
      "intensity": "RPE 1-10 or heart rate zone",
      "notes": "Form cues or modifications"
    }
  ],
  "heartRateZones": {
    "target": "Recommended HR zone",
    "maxHR": "Maximum recommended HR"
  },
  "recoveryFocus": "What to prioritize for recovery",
  "progressionNotes": "How to adjust based on response"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      return response.choices[0].message.content || "Unable to generate workout";
    } catch (error) {
      console.error('Error generating recovery-based workout:', error);
      return this.getFallbackWorkout(todaysMetrics);
    }
  }

  /**
   * Generate comprehensive daily insights with caching
   */
  async getDailyInsights(context: CoachingContext, userId: string = 'default', forceRefresh: boolean = false): Promise<string> {
    // Check cache first unless force refresh requested
    const lastDataUpdate = context.recentMetrics[0]?.date || new Date();
    
    if (!this.shouldRegenerateCoaching(userId, lastDataUpdate, forceRefresh)) {
      const cached = this.getCachedCoaching(userId, 'insights');
      if (cached) return JSON.stringify(cached);
    }

    return this.getDailyCoachingInsights(context);
  }

  /**
   * Generate comprehensive daily coaching insights
   */
  async getDailyCoachingInsights(context: CoachingContext): Promise<string> {
    const recentMetrics = context.recentMetrics.slice(0, 30); // Use 30 days for HRV baseline
    const todaysMetrics = context.todaysMetrics;
    
    // Get manual HRV data (priority over automatic data)
    const manualHRV = await this.getManualHRV(todaysMetrics?.date || new Date());
    const currentHRV = manualHRV || todaysMetrics?.heartRateVariability;
    
    // Calculate HRV as % of 30-day average
    const past30DaysHRV = recentMetrics.filter(m => m.heartRateVariability).map(m => m.heartRateVariability!);
    const baselineHRV = past30DaysHRV.length > 0 ? past30DaysHRV.reduce((a, b) => a + b, 0) / past30DaysHRV.length : null;
    const hrvDelta = baselineHRV && currentHRV ? Math.round(((currentHRV - baselineHRV) / baselineHRV) * 100) : null;
    
    // Get manual RHR data (priority over automatic data)
    const manualRHR = await this.getManualRHR(todaysMetrics?.date || new Date());
    const currentRHR = manualRHR || todaysMetrics?.restingHeartRate;
    
    // Calculate strain metrics
    const todaysStrain = todaysMetrics?.strainScore || 0;
    const past7DaysMetrics = context.recentMetrics.slice(0, 7);
    const weeklyTotalStrain = past7DaysMetrics.reduce((sum, m) => sum + (m.strainScore || 0), 0);
    const tsb = (weeklyTotalStrain / 120).toFixed(2); // TSB as decimal ratio
    
    // Format sleep duration
    const sleepDurationFormatted = todaysMetrics?.sleepDuration ? 
      `${Math.floor(todaysMetrics.sleepDuration / 60)}h ${String(todaysMetrics.sleepDuration % 60).padStart(2, '0')}m` : 'N/A';
    
    // Format sleep debt
    const sleepDebtFormatted = todaysMetrics?.sleepDebt ? 
      `${Math.floor(todaysMetrics.sleepDebt / 60)}h ${String(todaysMetrics.sleepDebt % 60).padStart(2, '0')}m` : 'N/A';
    
    const prompt = `You are a high-performance health coach for an advanced user who is tracking recovery, sleep, metabolic health, HRV and training load. Based on the following daily metrics, give one short actionable recommendation (1–2 sentences) that will help improve the user's recovery and long-term health.

Inputs:
• HRV: ${currentHRV || 'N/A'} ms${hrvDelta !== null ? ` (vs. baseline ${hrvDelta > 0 ? '+' : ''}${hrvDelta}%)` : ''}
• Sleep Score: ${todaysMetrics?.sleepScore || 'N/A'}% – Sleep Duration: ${sleepDurationFormatted}
• Strain: ${todaysStrain} (weekly load ${weeklyTotalStrain}/120, TSB ${tsb})
• Body Composition: Body Fat ${todaysMetrics?.bodyFatPercentage || 'N/A'}%, Metabolic Age: ${todaysMetrics?.metabolicAge || 'N/A'}
• Other metrics: Resting HR ${currentRHR || 'N/A'} bpm, Steps ${todaysMetrics?.steps || 0}, VO₂max ${todaysMetrics?.vo2Max || 'N/A'}, Sleep Debt ${sleepDebtFormatted}

Your output:
• One short recommendation written in direct second-person (e.g. "Increase…" "Try…")
• Do not exceed 2 sentences
• Focus on today – not general advice
• Use a performance/recovery tone, not generic wellness

Provide your response as a simple JSON object:
{
  "dailyFocus": "Brief focus area (e.g., 'Recovery', 'Active Recovery', 'Training')",
  "recommendation": "Your 1-2 sentence direct recommendation"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      return response.choices[0].message.content || "Unable to generate insights";
    } catch (error) {
      console.error('Error generating daily insights:', error);
      return this.getFallbackInsights();
    }
  }

  /**
   * Helper methods
   */
  private getTimeOfDay(hour: number): string {
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 21) return "Evening";
    return "Night";
  }

  private calculateAverage(metrics: HealthMetrics[], field: keyof HealthMetrics): number {
    const values = metrics
      .map(m => m[field])
      .filter(v => typeof v === 'number') as number[];
    
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private analyzeTrends(metrics: HealthMetrics[]): string {
    const fields = ['sleepScore', 'recoveryScore', 'readinessScore', 'steps'] as const;
    const trends = fields.map(field => {
      const values = metrics.map(m => m[field]).filter(v => typeof v === 'number') as number[];
      if (values.length < 2) return `${field}: insufficient data`;
      
      const recent = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      const older = values.slice(3, 6).reduce((a, b) => a + b, 0) / 3;
      const trend = recent > older ? 'improving' : recent < older ? 'declining' : 'stable';
      
      return `${field}: ${trend} (${recent.toFixed(1)} vs ${older.toFixed(1)})`;
    });
    
    return trends.join('\n');
  }

  private getFallbackRecommendations(timeOfDay: string, metrics?: HealthMetrics): string {
    const recovery = metrics?.recoveryScore || 75;
    
    const fallback = {
      timeOfDay,
      primaryRecommendation: recovery > 80 ? 
        "Your recovery is excellent - perfect time for a challenging workout" :
        "Focus on gentle movement and recovery today",
      recommendations: [
        {
          category: "Exercise",
          action: recovery > 80 ? "30-45 min moderate to high intensity workout" : "20-30 min gentle movement or yoga",
          reasoning: `Recovery score of ${recovery}/100 indicates your body's readiness`,
          timing: "Within the next 2 hours"
        }
      ],
      recoveryInsight: `Based on your ${recovery}/100 recovery score, ${recovery > 80 ? 'you\'re ready for more intense training' : 'prioritize recovery and gentle movement'}`
    };
    
    return JSON.stringify(fallback);
  }

  private getFallbackWorkout(metrics?: HealthMetrics): string {
    const recovery = metrics?.recoveryScore || 75;
    
    const fallback = {
      recoveryLevel: recovery > 80 ? "High" : recovery > 60 ? "Moderate" : "Low",
      recommendedIntensity: recovery > 80 ? "High" : recovery > 60 ? "Moderate" : "Recovery",
      workoutType: recovery > 80 ? "HIIT" : recovery > 60 ? "Strength" : "Recovery",
      duration: recovery > 80 ? "45" : recovery > 60 ? "30" : "20",
      exercises: [
        {
          name: recovery > 80 ? "Burpees" : recovery > 60 ? "Bodyweight squats" : "Gentle walking",
          sets: recovery > 80 ? "4 sets of 10" : recovery > 60 ? "3 sets of 15" : "20 minutes",
          intensity: recovery > 80 ? "RPE 8-9" : recovery > 60 ? "RPE 6-7" : "RPE 3-4",
          notes: "Listen to your body and adjust as needed"
        }
      ],
      heartRateZones: {
        target: recovery > 80 ? "Zone 4-5" : recovery > 60 ? "Zone 2-3" : "Zone 1-2",
        maxHR: "Stay below 85% max heart rate"
      },
      recoveryFocus: "Prioritize sleep and hydration post-workout",
      progressionNotes: "Increase intensity only when recovery scores consistently improve"
    };
    
    return JSON.stringify(fallback);
  }

  private getFallbackInsights(): string {
    return JSON.stringify({
      dailyFocus: "Maintain consistent healthy habits",
      energyLevel: "Moderate",
      keyInsights: [
        {
          category: "General",
          insight: "Consistency in sleep and exercise drives long-term results",
          action: "Focus on maintaining your daily routines"
        }
      ],
      priorityActions: [
        "Get 7-9 hours of quality sleep",
        "Move your body for at least 30 minutes",
        "Stay hydrated throughout the day"
      ],
      adaptiveRecommendations: {
        ifEnergyHigh: "Take advantage with a challenging workout",
        ifEnergyLow: "Prioritize rest and gentle movement",
        nutritionTiming: "Eat balanced meals every 3-4 hours"
      },
      tomorrowPrep: "Prepare for quality sleep by winding down early",
      motivationalMessage: "Every day is an opportunity to invest in your health!"
    });
  }
}

export default EnhancedAICoach;