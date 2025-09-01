/**
 * Google Fit API Service for real-time health data synchronization
 * Provides fresh data when Health Connect is unreliable
 */
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { convertToEST } from './timezoneUtils';

interface GoogleFitDataPoint {
  startTimeNanos: string;
  endTimeNanos: string;
  value: Array<{
    intVal?: number;
    fpVal?: number;
    stringVal?: string;
  }>;
  dataTypeName: string;
  originDataSourceId: string;
}

interface GoogleFitDataSet {
  dataSourceId: string;
  maxEndTimeNs: string;
  minStartTimeNs: string;
  point: GoogleFitDataPoint[];
}

export class GoogleFitService {
  private oauth2Client: OAuth2Client;
  private fitness: any;
  private storage: any;
  private userId: string;
  private dataPriorityService: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 
        (process.env.REPLIT_DOMAINS 
          ? `https://${process.env.REPLIT_DOMAINS}/api/google-fit/auth/callback`
          : 'http://localhost:5000/api/google-fit/auth/callback')
    );
    
    this.fitness = google.fitness({ version: 'v1', auth: this.oauth2Client });
    this.userId = 'default-user'; // Default user ID
  }

  /**
   * Initialize service dependencies for database operations
   */
  initializeDependencies(storage: any, dataPriorityService: any, userId: string = 'default-user') {
    this.storage = storage;
    this.dataPriorityService = dataPriorityService;
    this.userId = userId;
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(accessToken: string, refreshToken?: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });
  }

  /**
   * Get authorization URL for Google Fit access
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.body.read',
      'https://www.googleapis.com/auth/fitness.heart_rate.read',
      'https://www.googleapis.com/auth/fitness.sleep.read',
      'https://www.googleapis.com/auth/fitness.location.read',
      'https://www.googleapis.com/auth/fitness.blood_pressure.read',
      'https://www.googleapis.com/auth/fitness.blood_glucose.read',
      'https://www.googleapis.com/auth/fitness.body_temperature.read',
      'https://www.googleapis.com/auth/fitness.oxygen_saturation.read',
      'https://www.googleapis.com/auth/fitness.nutrition.read'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  /**
   * Automatically refresh access token if needed
   */
  async refreshTokenIfNeeded(currentTokens: any): Promise<any> {
    try {
      // Check if token is expired or will expire soon (within 5 minutes)
      const expiryTime = currentTokens.expiry_date;
      const now = Date.now();
      const fiveMinutesFromNow = now + (5 * 60 * 1000);

      if (!expiryTime || expiryTime <= fiveMinutesFromNow) {
        console.log('🔄 Access token expired or expiring soon, refreshing...');
        
        // Set the current tokens (including refresh token)
        this.oauth2Client.setCredentials(currentTokens);
        
        // Refresh the access token
        const { credentials: newTokens } = await this.oauth2Client.refreshAccessToken();
        
        console.log('✅ Successfully refreshed Google Fit access token');
        
        // Merge new tokens with existing ones (preserve refresh token if not returned)
        const refreshedTokens = {
          ...currentTokens,
          ...newTokens,
          // Ensure we keep the refresh token
          refresh_token: newTokens.refresh_token || currentTokens.refresh_token
        };
        
        return refreshedTokens;
      }
      
      // Token is still valid
      return currentTokens;
    } catch (error) {
      console.error('❌ Failed to refresh Google Fit token:', error);
      throw new Error('Token refresh failed - user needs to re-authenticate');
    }
  }

  /**
   * Ensure tokens are valid and refresh if needed
   */
  async ensureValidTokens(tokens: any): Promise<any> {
    const validTokens = await this.refreshTokenIfNeeded(tokens);
    this.oauth2Client.setCredentials(validTokens);
    return validTokens;
  }

  /**
   * Convert nanoseconds to Date object
   */
  private nanosToDate(nanos: string): Date | null {
    if (!nanos || nanos === '0') {
      console.warn('Invalid nanos timestamp:', nanos);
      return null; // Return null instead of fallback
    }
    
    const timestamp = parseInt(nanos) / 1000000;
    if (isNaN(timestamp)) {
      console.warn('Invalid timestamp after parsing nanos:', nanos);
      return null;
    }
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date created from timestamp:', timestamp);
      return null;
    }
    
    return date;
  }

  /**
   * Convert Date to nanoseconds
   */
  private dateToNanos(date: Date): string {
    if (!date || isNaN(date.getTime())) {
      console.warn('Invalid date for nanos conversion:', date);
      return '0';
    }
    return (date.getTime() * 1000000).toString();
  }

  /**
   * Get granular step data points from Google Fit
   * Note: This retrieves detailed time-series data for comprehensive analysis
   */
  async getGranularStepsData(startDate: Date, endDate: Date, userTimezone: string = 'America/New_York'): Promise<Array<{
    startTime: Date;
    endTime: Date;
    steps: number;
    localStartTime: Date;
    localEndTime: Date;
  }>> {
    console.log(`🚶 GRANULAR DEBUG: Starting getGranularStepsData for range ${startDate.toISOString()} to ${endDate.toISOString()}`);
    try {
      // Get raw dataset instead of aggregated for granular data
      const response = await this.fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
        datasetId: `${this.dateToNanos(startDate)}-${this.dateToNanos(endDate)}`
      });

      console.log(`🚶 GRANULAR DEBUG: Found ${response.data.point?.length || 0} granular step data points`);
      
      const granularData = [];
      for (const point of response.data.point || []) {
        const utcStartTime = this.nanosToDate(point.startTimeNanos);
        const utcEndTime = this.nanosToDate(point.endTimeNanos);
        const stepCount = point.value[0]?.intVal || 0;

        if (stepCount > 0 && utcStartTime && utcEndTime) {
          // FIXED: Proper timezone conversion using Intl.DateTimeFormat
          // This prevents the timezone duplication that caused 7305 → 7484 corruption
          const localStartTimeStr = new Intl.DateTimeFormat('sv-SE', {
            timeZone: userTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }).format(utcStartTime);
          
          const localEndTimeStr = new Intl.DateTimeFormat('sv-SE', {
            timeZone: userTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }).format(utcEndTime);
          
          const localStartTime = new Date(localStartTimeStr);
          const localEndTime = new Date(localEndTimeStr);
          
          granularData.push({
            startTime: utcStartTime,
            endTime: utcEndTime,
            steps: stepCount,
            localStartTime,
            localEndTime
          });
        }
      }

      return granularData;
    } catch (error) {
      console.error('Error fetching granular Google Fit steps data:', error);
      return [];
    }
  }

  /**
   * Get step count data from Google Fit (daily aggregates)
   * Note: Google Fit stores all data as UTC timestamps, but we need to convert 
   * to user's local timezone for proper date attribution
   */
  async getStepsData(startDate: Date, endDate: Date, userTimezone: string = 'America/New_York'): Promise<Array<{
    date: string;
    steps: number;
    timestamp: Date;
    originalUtcTimestamp: Date;
  }>> {
    console.log(`🚶 DEBUG: Starting getStepsData for range ${startDate.toISOString()} to ${endDate.toISOString()}`);
    try {
      const response = await this.fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.step_count.delta',
            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
          }],
          bucketByTime: { durationMillis: 86400000 }, // 1 day buckets
          startTimeMillis: startDate.getTime(),
          endTimeMillis: endDate.getTime()
        }
      });

      console.log(`🚶 DEBUG: Steps API response status: ${response.status}, bucket count: ${response.data.bucket?.length || 0}`);
      
      const stepsData = [];
      console.log(`🚶 DEBUG: Processing ${response.data.bucket?.length || 0} step data buckets`);
      
      for (const bucket of response.data.bucket || []) {
        const utcStartTime = new Date(parseInt(bucket.startTimeMillis));
        
        // Convert UTC time to user's timezone for proper date attribution
        const localDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: userTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(utcStartTime);
        
        const dataset = bucket.dataset[0];
        
        if (dataset && dataset.point && dataset.point.length > 0) {
          const totalSteps = dataset.point.reduce((sum: number, point: any) => {
            return sum + (point.value[0]?.intVal || 0);
          }, 0);

          console.log(`🚶 DEBUG: Steps for ${localDate}: ${totalSteps} steps`);

          stepsData.push({
            date: localDate, // Now properly timezone-adjusted
            steps: totalSteps,
            timestamp: utcStartTime,
            originalUtcTimestamp: utcStartTime
          });
        } else {
          console.log(`🚶 DEBUG: No step data for bucket starting ${localDate}`);
        }
      }

      return stepsData;
    } catch (error) {
      console.error('Error fetching Google Fit steps data:', error);
      throw error;
    }
  }

  /**
   * Get heart rate data from Google Fit
   */
  async getHeartRateData(startDate: Date, endDate: Date): Promise<Array<{
    date: string;
    heartRate: number;
    timestamp: Date;
    type: 'resting' | 'average' | 'max';
  }>> {
    try {
      const response = await this.fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.heart_rate.bpm'
          }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startDate.getTime(),
          endTimeMillis: endDate.getTime()
        }
      });

      const heartRateData = [];
      for (const bucket of response.data.bucket || []) {
        const startTime = new Date(parseInt(bucket.startTimeMillis));
        const dataset = bucket.dataset[0];
        
        if (dataset && dataset.point && dataset.point.length > 0) {
          // Calculate average heart rate for the day
          const heartRates = dataset.point.map((point: any) => point.value[0]?.fpVal || 0);
          const averageHR = heartRates.reduce((sum: number, hr: number) => sum + hr, 0) / heartRates.length;

          heartRateData.push({
            date: startTime.toISOString().split('T')[0],
            heartRate: Math.round(averageHR),
            timestamp: startTime,
            type: 'average' as const
          });
        }
      }

      return heartRateData;
    } catch (error) {
      console.error('Error fetching Google Fit heart rate data:', error);
      throw error;
    }
  }

  /**
   * Get granular heart rate data points from Google Fit
   */
  async getGranularHeartRateData(startDate: Date, endDate: Date): Promise<Array<{
    startTime: Date;
    endTime: Date;
    localStartTime: Date;
    localEndTime: Date;
    heartRate: number;
  }>> {
    try {
      const response = await this.fitness.users.dataset.get({
        userId: 'me',
        datasetId: `${startDate.getTime()}000000-${endDate.getTime()}000000`,
        dataSourceId: 'derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm'
      });

      const heartRatePoints = [];
      for (const point of response.data.point || []) {
        if (point.value && point.value[0] && point.value[0].fpVal) {
          const startTime = new Date(parseInt(point.startTimeNanos!) / 1000000);
          const endTime = new Date(parseInt(point.endTimeNanos!) / 1000000);
          
          // FIXED: Proper timezone conversion to EST/EDT
          const localStartTimeStr = new Intl.DateTimeFormat('sv-SE', {
            timeZone: "America/New_York",
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }).format(startTime);
          
          const localEndTimeStr = new Intl.DateTimeFormat('sv-SE', {
            timeZone: "America/New_York",
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }).format(endTime);
          
          const localStartTime = new Date(localStartTimeStr);
          const localEndTime = new Date(localEndTimeStr);
          
          heartRatePoints.push({
            startTime,
            endTime,
            localStartTime,
            localEndTime,
            heartRate: Math.round(point.value[0].fpVal)
          });
        }
      }

      return heartRatePoints;
    } catch (error) {
      console.error('Error fetching granular Google Fit heart rate data:', error);
      // Return empty array instead of throwing to allow graceful fallback
      return [];
    }
  }

  /**
   * Get comprehensive sleep data from Google Fit including stages and segments
   */
  async getSleepData(startDate: Date, endDate: Date): Promise<Array<{
    date: string;
    sleepMinutes: number;
    sleepEfficiency: number;
    timestamp: Date;
    sleepStages?: {
      deep: number;
      light: number;
      rem: number;
      awake: number;
    };
    wakeEvents?: number;
  }>> {
    try {
      console.log(`🌙 DEBUG: Fetching Google Fit sleep data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Get basic sleep sessions first
      const sessionsResponse = await this.fitness.users.sessions.list({
        userId: 'me',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        activityType: 72 // Sleep activity type
      });

      console.log(`🌙 DEBUG: Found ${sessionsResponse.data.session?.length || 0} sleep sessions`);
      
      if (sessionsResponse.data.session?.length === 0) {
        console.log(`🌙 DEBUG: No sleep sessions found in date range ${startDate.toISOString()} to ${endDate.toISOString()}`);
      }
      
      if (sessionsResponse.data.session?.length > 0) {
        console.log(`🌙 DEBUG: First session details:`, {
          startTime: sessionsResponse.data.session[0].startTimeMillis,
          endTime: sessionsResponse.data.session[0].endTimeMillis,
          id: sessionsResponse.data.session[0].id,
          name: sessionsResponse.data.session[0].name
        });
      }

      const sleepData = [];
      
      for (const session of sessionsResponse.data.session || []) {
        const startTime = new Date(parseInt(session.startTimeMillis));
        const endTime = new Date(parseInt(session.endTimeMillis));
        const sleepMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

        console.log(`🌙 DEBUG: Sleep session - Start: ${startTime.toISOString()}, End: ${endTime.toISOString()}, Duration: ${sleepMinutes}min`);

        // Attribute sleep to the correct "sleep night"
        let sleepNightDate: Date;
        if (startTime.getHours() >= 18) {
          sleepNightDate = new Date(startTime);
          sleepNightDate.setDate(sleepNightDate.getDate() + 1);
        } else {
          sleepNightDate = startTime;
        }
        
        console.log(`🌙 DEBUG: Sleep attributed to date: ${sleepNightDate.toISOString().split('T')[0]}, startHour: ${startTime.getHours()}`);

        // Try to get detailed sleep stages data for this session
        let sleepStages = undefined;
        let wakeEvents = 0;
        let actualEfficiency = 85; // default
        let correctedSleepMinutes = sleepMinutes; // Default to session duration

        try {
          console.log(`🌙 DEBUG: Looking for sleep stages for session ${session.id}`);
          
          // Get sleep segment data (stages) from Google Fit
          const stagesResponse = await this.fitness.users.dataSources.datasets.get({
            userId: 'me',
            dataSourceId: 'derived:com.google.sleep.segment:com.google.android.gms:merged',
            datasetId: `${this.dateToNanos(startTime)}-${this.dateToNanos(endTime)}`
          });
          
          console.log(`🌙 DEBUG: Found ${stagesResponse.data.point?.length || 0} sleep stage points`);

          if (stagesResponse.data.point && stagesResponse.data.point.length > 0) {
            const stages = { deep: 0, light: 0, rem: 0, awake: 0 };
            
            for (const point of stagesResponse.data.point) {
              const stageValue = point.value[0]?.intVal || 0;
              const startNanos = parseInt(point.startTimeNanos!);
              const endNanos = parseInt(point.endTimeNanos!);
              // Converting nanoseconds to minutes: divide by 1000000000 (to seconds) then by 60 (to minutes)
              const duration = (endNanos - startNanos) / (1000000000 * 60); // nanoseconds to minutes
              
              console.log(`🔍 Sleep stage debug: stage=${stageValue}, startNanos=${point.startTimeNanos}, endNanos=${point.endTimeNanos}, duration=${duration.toFixed(2)}min`);
              
              // Validate duration is reasonable (skip negative durations only)
              if (duration < 0 || duration > 180) {
                console.log(`🔍 Skipping unusual sleep stage duration: ${duration.toFixed(2)} minutes for stage ${stageValue}`);
                continue;
              }
              
              // Convert nanosecond timestamps to JavaScript Date objects in EST
              const startTime = new Date(startNanos / 1000000); // Convert nanoseconds to milliseconds
              const endTime = new Date(endNanos / 1000000);
              
              // Convert to EST timezone
              const estStartTime = convertToEST(startTime);
              const estEndTime = convertToEST(endTime);
              
              // Store individual granular sleep stage entry
              let stageType = '';
              let stageNumber = stageValue;
              
              // Google Fit sleep stage values:
              // 1 = Awake, 2 = Sleep (generic), 3 = Out of bed, 4 = Light sleep, 5 = Deep sleep, 6 = REM sleep
              switch (stageValue) {
                case 1: // Awake during sleep
                  stageType = 'awake';
                  stages.awake += duration;
                  wakeEvents++;
                  break;
                case 4: // Light sleep
                  stageType = 'light';
                  stages.light += duration;
                  break;
                case 5: // Deep sleep
                  stageType = 'deep';
                  stages.deep += duration;
                  break;
                case 6: // REM sleep
                  stageType = 'rem';
                  stages.rem += duration;
                  break;
                default:
                  continue; // Skip unknown stage types
              }

              // Store granular sleep stage data point
              try {
                await this.storage.upsertHealthDataPoint({
                  userId: this.userId,
                  dataType: 'sleep_stages',
                  startTime: estStartTime,
                  endTime: estEndTime, // TypeScript knows this is Date, not undefined
                  value: Math.round(duration),
                  unit: 'minutes',
                  sourceApp: 'google_fit',
                  metadata: {
                    stage: stageValue.toString(),
                    stageType,
                    stageNumber,
                    originalUtcStartTime: startTime.toISOString(),
                    originalUtcEndTime: endTime.toISOString(),
                    convertedToEst: true,
                    sleepNightDate: sleepNightDate.toISOString().split('T')[0]
                  }
                });
                console.log(`✅ Stored sleep stage: ${stageType} for ${duration.toFixed(2)} minutes`);
              } catch (error) {
                console.error(`❌ Error storing sleep stage data:`, error);
                throw error; // Re-throw to trigger outer catch
              }
            }
            
            sleepStages = {
              deep: Math.round(stages.deep),
              light: Math.round(stages.light),
              rem: Math.round(stages.rem),
              awake: Math.round(stages.awake)
            };
            
            // Calculate real efficiency based on stages
            const totalSleepTime = stages.deep + stages.light + stages.rem;
            if (totalSleepTime > 0) {
              actualEfficiency = Math.round((totalSleepTime / (totalSleepTime + stages.awake)) * 100);
            }
            
            // Smart sleep duration correction: use stages total if significantly higher than session
            // This handles cases where user woke up and fell back asleep after Google ended the session
            const stagesDurationMinutes = Math.round(totalSleepTime);
            if (stagesDurationMinutes > sleepMinutes * 1.3) { // If stages show 30%+ more sleep
              console.log(`🔄 SLEEP CORRECTION: Session showed ${sleepMinutes}min, but stages total ${stagesDurationMinutes}min. Using stages total (likely interrupted sleep).`);
              correctedSleepMinutes = stagesDurationMinutes; // Use stages total instead of session duration
            } else {
              correctedSleepMinutes = sleepMinutes; // Use original session duration
            }
          }
        } catch (stagesError) {
          console.log(`No detailed sleep stages available for session ${session.id}, using basic data`);
        }

        sleepData.push({
          date: sleepNightDate.toISOString().split('T')[0],
          sleepMinutes: correctedSleepMinutes,
          sleepEfficiency: actualEfficiency,
          timestamp: startTime,
          sleepStages,
          wakeEvents
        });
      }

      return sleepData;
    } catch (error) {
      console.error('Error fetching Google Fit sleep data:', error);
      throw error;
    }
  }

  /**
   * Get weight data from Google Fit
   */
  async getWeightData(startDate: Date, endDate: Date): Promise<Array<{
    date: string;
    weight: number;
    timestamp: Date;
  }>> {
    try {
      const response = await this.fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: 'derived:com.google.weight:com.google.android.gms:merge_weight',
        datasetId: `${this.dateToNanos(startDate)}-${this.dateToNanos(endDate)}`
      });

      const weightData = [];
      for (const point of response.data.point || []) {
        const timestamp = this.nanosToDate(point.startTimeNanos);
        const weight = point.value[0]?.fpVal || 0;

        // Validate timestamp before using it
        if (weight > 0 && timestamp && !isNaN(timestamp.getTime())) {
          weightData.push({
            date: timestamp.toISOString().split('T')[0],
            weight: parseFloat((weight * 2.20462).toFixed(1)), // Convert kg to lbs with 1 decimal precision
            timestamp
          });
        } else if (weight > 0) {
          console.warn('Skipping weight data with invalid timestamp:', point.startTimeNanos);
        }
      }

      return weightData;
    } catch (error) {
      console.error('Error fetching Google Fit weight data:', error);
      throw error;
    }
  }

  /**
   * Get blood oxygen saturation data
   */
  async getOxygenSaturationData(startDate: Date, endDate: Date): Promise<Array<{
    date: string;
    oxygenSaturation: number;
    timestamp: Date;
  }>> {
    try {
      const response = await this.fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: 'derived:com.google.oxygen_saturation:com.google.android.gms:merged',
        datasetId: `${this.dateToNanos(startDate)}-${this.dateToNanos(endDate)}`
      });

      const oxygenData = [];
      for (const point of response.data.point || []) {
        const timestamp = this.nanosToDate(point.startTimeNanos);
        const saturation = point.value[0]?.fpVal || 0;

        if (saturation > 0 && timestamp && !isNaN(timestamp.getTime())) {
          oxygenData.push({
            date: timestamp.toISOString().split('T')[0],
            oxygenSaturation: Math.round(saturation),
            timestamp
          });
        }
      }

      return oxygenData;
    } catch (error) {
      console.error('Error fetching Google Fit oxygen saturation data:', error);
      return [];
    }
  }

  /**
   * Get blood pressure data
   */
  async getBloodPressureData(startDate: Date, endDate: Date): Promise<Array<{
    date: string;
    systolic: number;
    diastolic: number;
    timestamp: Date;
  }>> {
    try {
      const response = await this.fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: 'derived:com.google.blood_pressure:com.google.android.gms:merged',
        datasetId: `${this.dateToNanos(startDate)}-${this.dateToNanos(endDate)}`
      });

      const bpData = [];
      for (const point of response.data.point || []) {
        const timestamp = this.nanosToDate(point.startTimeNanos);
        const systolic = point.value[0]?.fpVal || 0;
        const diastolic = point.value[1]?.fpVal || 0;

        if (systolic > 0 && diastolic > 0 && timestamp && !isNaN(timestamp.getTime())) {
          bpData.push({
            date: timestamp.toISOString().split('T')[0],
            systolic: Math.round(systolic),
            diastolic: Math.round(diastolic),
            timestamp
          });
        }
      }

      return bpData;
    } catch (error) {
      console.error('Error fetching Google Fit blood pressure data:', error);
      return [];
    }
  }

  /**
   * Get body fat percentage data
   */
  async getBodyFatData(startDate: Date, endDate: Date): Promise<Array<{
    date: string;
    bodyFatPercentage: number;
    timestamp: Date;
  }>> {
    try {
      const response = await this.fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: 'derived:com.google.body.fat.percentage:com.google.android.gms:merged',
        datasetId: `${this.dateToNanos(startDate)}-${this.dateToNanos(endDate)}`
      });

      const bodyFatData = [];
      for (const point of response.data.point || []) {
        const timestamp = this.nanosToDate(point.startTimeNanos);
        const bodyFat = point.value[0]?.fpVal || 0;

        if (bodyFat > 0 && timestamp && !isNaN(timestamp.getTime())) {
          // Google Fit returns body fat as a decimal (0.282 = 28.2%)
          // Only multiply by 100 if the value is less than 1 (indicating it's a decimal)
          const bodyFatPercentage = bodyFat < 1 ? Math.round(bodyFat * 100 * 10) / 10 : Math.round(bodyFat * 10) / 10;
          
          bodyFatData.push({
            date: timestamp.toISOString().split('T')[0],
            bodyFatPercentage,
            timestamp
          });
        }
      }

      return bodyFatData;
    } catch (error) {
      console.error('Error fetching Google Fit body fat data:', error);
      return [];
    }
  }

  /**
   * Get calories burned data
   */
  async getCaloriesData(startDate: Date, endDate: Date): Promise<Array<{
    date: string;
    calories: number;
    timestamp: Date;
  }>> {
    try {
      const response = await this.fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.calories.expended'
          }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startDate.getTime(),
          endTimeMillis: endDate.getTime()
        }
      });

      const caloriesData = [];
      for (const bucket of response.data.bucket || []) {
        const startTime = new Date(parseInt(bucket.startTimeMillis));
        const dataset = bucket.dataset[0];
        
        if (dataset && dataset.point && dataset.point.length > 0) {
          const totalCalories = dataset.point.reduce((sum: number, point: any) => {
            return sum + (point.value[0]?.fpVal || 0);
          }, 0);

          if (totalCalories > 0) {
            caloriesData.push({
              date: startTime.toISOString().split('T')[0],
              calories: Math.round(totalCalories),
              timestamp: startTime
            });
          }
        }
      }

      return caloriesData;
    } catch (error) {
      console.error('Error fetching Google Fit calories data:', error);
      return [];
    }
  }

  /**
   * Get distance data
   */
  async getDistanceData(startDate: Date, endDate: Date): Promise<Array<{
    date: string;
    distance: number;
    timestamp: Date;
  }>> {
    try {
      const response = await this.fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.distance.delta'
          }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startDate.getTime(),
          endTimeMillis: endDate.getTime()
        }
      });

      const distanceData = [];
      for (const bucket of response.data.bucket || []) {
        const startTime = new Date(parseInt(bucket.startTimeMillis));
        const dataset = bucket.dataset[0];
        
        if (dataset && dataset.point && dataset.point.length > 0) {
          const totalDistance = dataset.point.reduce((sum: number, point: any) => {
            return sum + (point.value[0]?.fpVal || 0);
          }, 0);

          if (totalDistance > 0) {
            distanceData.push({
              date: startTime.toISOString().split('T')[0],
              distance: totalDistance, // in meters
              timestamp: startTime
            });
          }
        }
      }

      return distanceData;
    } catch (error) {
      console.error('Error fetching Google Fit distance data:', error);
      return [];
    }
  }

  /**
   * Get active minutes data
   */
  async getActiveMinutesData(startDate: Date, endDate: Date): Promise<Array<{
    date: string;
    activeMinutes: number;
    timestamp: Date;
  }>> {
    try {
      const response = await this.fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.active_minutes'
          }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startDate.getTime(),
          endTimeMillis: endDate.getTime()
        }
      });

      const activeMinutesData = [];
      for (const bucket of response.data.bucket || []) {
        const startTime = new Date(parseInt(bucket.startTimeMillis));
        const dataset = bucket.dataset[0];
        
        if (dataset && dataset.point && dataset.point.length > 0) {
          const totalMinutes = dataset.point.reduce((sum: number, point: any) => {
            return sum + (point.value[0]?.intVal || 0);
          }, 0);

          if (totalMinutes > 0) {
            activeMinutesData.push({
              date: startTime.toISOString().split('T')[0],
              activeMinutes: totalMinutes,
              timestamp: startTime
            });
          }
        }
      }

      return activeMinutesData;
    } catch (error) {
      console.error('Error fetching Google Fit active minutes data:', error);
      return [];
    }
  }

  /**
   * Comprehensive sync method to get all available health data
   */
  async syncAllHealthData(startDate: Date, endDate: Date) {
    try {
      console.log(`🔄 Starting COMPREHENSIVE Google Fit sync from ${startDate.toDateString()} to ${endDate.toDateString()}`);
      
      const [
        stepsData, 
        heartRateData, 
        sleepData, 
        weightData,
        oxygenSaturationData,
        bloodPressureData,
        bodyFatData,
        caloriesData,
        distanceData,
        activeMinutesData
      ] = await Promise.all([
        this.getStepsData(startDate, endDate).catch(err => {
          console.warn('Steps data unavailable:', err.message);
          return [];
        }),
        this.getHeartRateData(startDate, endDate).catch(err => {
          console.warn('Heart rate data unavailable:', err.message);
          return [];
        }),
        this.getSleepData(startDate, endDate).catch(err => {
          console.warn('Sleep data unavailable:', err.message);
          return [];
        }),
        this.getWeightData(startDate, endDate).catch(err => {
          console.warn('Weight data unavailable:', err.message);
          return [];
        }),
        this.getOxygenSaturationData(startDate, endDate).catch(err => {
          console.warn('Oxygen saturation data unavailable:', err.message);
          return [];
        }),
        this.getBloodPressureData(startDate, endDate).catch(err => {
          console.warn('Blood pressure data unavailable:', err.message);
          return [];
        }),
        this.getBodyFatData(startDate, endDate).catch(err => {
          console.warn('Body fat data unavailable:', err.message);
          return [];
        }),
        this.getCaloriesData(startDate, endDate).catch(err => {
          console.warn('Calories data unavailable:', err.message);
          return [];
        }),
        this.getDistanceData(startDate, endDate).catch(err => {
          console.warn('Distance data unavailable:', err.message);
          return [];
        }),
        this.getActiveMinutesData(startDate, endDate).catch(err => {
          console.warn('Active minutes data unavailable:', err.message);
          return [];
        })
      ]);

      console.log(`✅ COMPREHENSIVE Google Fit sync complete:
        - Steps: ${stepsData.length} days
        - Heart Rate: ${heartRateData.length} days  
        - Sleep: ${sleepData.length} days
        - Weight: ${weightData.length} measurements
        - Oxygen Saturation: ${oxygenSaturationData.length} measurements
        - Blood Pressure: ${bloodPressureData.length} measurements
        - Body Fat: ${bodyFatData.length} measurements
        - Calories: ${caloriesData.length} days
        - Distance: ${distanceData.length} days
        - Active Minutes: ${activeMinutesData.length} days`);

      return {
        steps: stepsData,
        heartRate: heartRateData,
        sleep: sleepData,
        weight: weightData,
        oxygenSaturation: oxygenSaturationData,
        bloodPressure: bloodPressureData,
        bodyFat: bodyFatData,
        calories: caloriesData,
        distance: distanceData,
        activeMinutes: activeMinutesData
      };
    } catch (error) {
      console.error('Error during comprehensive Google Fit sync:', error);
      throw error;
    }
  }
}

export const googleFitService = new GoogleFitService();