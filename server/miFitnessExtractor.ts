import fetch from 'node-fetch';
import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as yauzl from 'yauzl';

// Mi Fitness / Huami API Extractor
export class MiFitnessExtractor {
  private baseUrl: string;
  private appToken: string | null = null;
  private userId: string | null = null;

  constructor() {
    this.baseUrl = 'https://api-mifit-de2.huami.com';
  }

  // Method 1: GDPR Export - Official method
  async requestGDPRExport(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://account.xiaomi.com/api/gdpr/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          email: email,
          category: 'MI_FITNESS',
          language: 'en'
        })
      });

      if (response.ok) {
        return {
          success: true,
          message: 'GDPR export requested. Check your email within 30 minutes for the download link.'
        };
      } else {
        return {
          success: false,
          message: 'Failed to request GDPR export. Try alternative URLs or methods.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `GDPR export error: ${error.message}`
      };
    }
  }

  // Method 2: Huami API Authentication
  async authenticateWithCredentials(email: string, password: string): Promise<{ success: boolean; token?: string; message: string }> {
    try {
      // Step 1: Get access token
      const authResponse = await fetch(`https://api-user.huami.com/registrations/${encodeURIComponent(email)}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MiFit/4.6.0 (iPhone; iOS 14.0; Scale/2.00)'
        },
        body: new URLSearchParams({
          'state': 'REDIRECTION',
          'client_id': 'HuaMi',
          'redirect_uri': 'https://s3-us-west-2.amazonaws.com/hm-registration/successsignin.html',
          'token': 'access',
          'password': password
        }).toString()
      });

      const authData = await authResponse.json();
      
      if (!authData.access_token) {
        return {
          success: false,
          message: 'Authentication failed. Check your email and password.'
        };
      }

      // Step 2: Exchange for app token
      const loginResponse = await fetch('https://account.huami.com/v2/client/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MiFit/4.6.0 (iPhone; iOS 14.0; Scale/2.00)'
        },
        body: new URLSearchParams({
          'app_name': 'com.xiaomi.hm.health',
          'dn': 'account.huami.com,api-user.huami.com,api-watch.huami.com,api-mifit.huami.com',
          'device_id': this.generateDeviceId(),
          'device_model': 'android_phone',
          'app_version': '4.6.0',
          'grant_type': 'access_token',
          'country_code': 'US',
          'code': authData.access_token
        }).toString()
      });

      const loginData = await loginResponse.json();
      
      if (loginData.token_info?.app_token) {
        this.appToken = loginData.token_info.app_token;
        this.userId = loginData.token_info.user_id;
        
        return {
          success: true,
          token: this.appToken,
          message: 'Successfully authenticated with Mi Fitness API'
        };
      } else {
        return {
          success: false,
          message: 'Failed to get app token. Check credentials or try alternative methods.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Authentication error: ${error.message}`
      };
    }
  }

  // Method 3: Extract comprehensive health data
  async extractHealthData(startDate: string, endDate: string): Promise<any> {
    if (!this.appToken || !this.userId) {
      throw new Error('Not authenticated. Call authenticateWithCredentials first.');
    }

    const headers = {
      'apptoken': this.appToken,
      'Content-Type': 'application/json',
      'User-Agent': 'MiFit/4.6.0 (iPhone; iOS 14.0; Scale/2.00)'
    };

    try {
      // Extract various data types
      const [
        activityData,
        sleepData,
        heartRateData,
        workoutData,
        bodyData
      ] = await Promise.all([
        this.extractActivityData(startDate, endDate, headers),
        this.extractSleepData(startDate, endDate, headers),
        this.extractHeartRateData(startDate, endDate, headers),
        this.extractWorkoutData(startDate, endDate, headers),
        this.extractBodyData(startDate, endDate, headers)
      ]);

      return {
        activity: activityData,
        sleep: sleepData,
        heartRate: heartRateData,
        workouts: workoutData,
        body: bodyData,
        extractedAt: new Date().toISOString(),
        dateRange: { start: startDate, end: endDate }
      };
    } catch (error) {
      throw new Error(`Data extraction failed: ${error.message}`);
    }
  }

  // Extract daily activity data (steps, distance, calories)
  private async extractActivityData(startDate: string, endDate: string, headers: any): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/v1/data/band_data.json`, {
      method: 'GET',
      headers,
      // Add query parameters for date range and data type
    });

    if (!response.ok) {
      throw new Error(`Activity data extraction failed: ${response.statusText}`);
    }

    const data = await response.json();
    return this.processActivityData(data);
  }

  // Extract sleep data with detailed phases
  private async extractSleepData(startDate: string, endDate: string, headers: any): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/v1/data/sleep.json`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Sleep data extraction failed: ${response.statusText}`);
    }

    const data = await response.json();
    return this.processSleepData(data);
  }

  // Extract heart rate data with minute-level details
  private async extractHeartRateData(startDate: string, endDate: string, headers: any): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/v1/data/heartrate.json`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Heart rate data extraction failed: ${response.statusText}`);
    }

    const data = await response.json();
    return this.processHeartRateData(data);
  }

  // Extract workout/sport sessions
  private async extractWorkoutData(startDate: string, endDate: string, headers: any): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/v1/sport/run/history.json`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Workout data extraction failed: ${response.statusText}`);
    }

    const data = await response.json();
    return this.processWorkoutData(data);
  }

  // Extract body composition data (weight, BMI, body fat)
  private async extractBodyData(startDate: string, endDate: string, headers: any): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/v1/data/weight.json`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Body data extraction failed: ${response.statusText}`);
    }

    const data = await response.json();
    return this.processBodyData(data);
  }

  // Data processing methods
  private processActivityData(rawData: any): any[] {
    // Process and normalize activity data
    return rawData.data?.map((item: any) => ({
      date: new Date(item.date_time * 1000).toISOString().split('T')[0],
      steps: item.steps || 0,
      distance: item.distance || 0, // in meters
      calories: item.calories || 0,
      activeMinutes: item.active_time || 0,
      heartRateAvg: item.avg_heart_rate || null,
      heartRateMax: item.max_heart_rate || null,
      source: 'mi_fitness_api'
    })) || [];
  }

  private processSleepData(rawData: any): any[] {
    // Process detailed sleep data with phases
    return rawData.data?.map((item: any) => ({
      date: new Date(item.start_time * 1000).toISOString().split('T')[0],
      sleepStart: new Date(item.start_time * 1000).toISOString(),
      sleepEnd: new Date(item.end_time * 1000).toISOString(),
      totalSleep: item.total_sleep || 0,
      deepSleep: item.deep_sleep || 0,
      lightSleep: item.light_sleep || 0,
      remSleep: item.rem_sleep || 0,
      awakeTime: item.awake_time || 0,
      sleepScore: item.sleep_score || null,
      efficiency: item.efficiency || null,
      source: 'mi_fitness_api'
    })) || [];
  }

  private processHeartRateData(rawData: any): any[] {
    // Process minute-level heart rate data
    return rawData.data?.map((item: any) => ({
      timestamp: new Date(item.timestamp * 1000).toISOString(),
      heartRate: item.heart_rate,
      type: item.type || 'auto', // auto, manual, workout
      source: 'mi_fitness_api'
    })) || [];
  }

  private processWorkoutData(rawData: any): any[] {
    // Process workout sessions
    return rawData.data?.map((item: any) => ({
      id: item.trackid,
      date: new Date(item.start_time * 1000).toISOString().split('T')[0],
      startTime: new Date(item.start_time * 1000).toISOString(),
      endTime: new Date(item.end_time * 1000).toISOString(),
      duration: item.total_time || 0,
      type: item.type || 'unknown',
      calories: item.calories || 0,
      distance: item.distance || 0,
      avgHeartRate: item.avg_heart_rate || null,
      maxHeartRate: item.max_heart_rate || null,
      avgPace: item.avg_pace || null,
      source: 'mi_fitness_api'
    })) || [];
  }

  private processBodyData(rawData: any): any[] {
    // Process body composition data
    return rawData.data?.map((item: any) => ({
      date: new Date(item.timestamp * 1000).toISOString().split('T')[0],
      weight: item.weight || null,
      bmi: item.bmi || null,
      bodyFat: item.body_fat || null,
      muscleMass: item.muscle_mass || null,
      boneMass: item.bone_mass || null,
      waterPercentage: item.water_percentage || null,
      visceralFat: item.visceral_fat || null,
      basalMetabolism: item.basal_metabolism || null,
      source: 'mi_fitness_api'
    })) || [];
  }

  // Utility methods
  private generateDeviceId(): string {
    return randomBytes(6).toString('hex').replace(/(.{2})/g, '$1:').slice(0, -1);
  }

  // Method 4: Parse GDPR export ZIP file
  async parseGDPRExport(zipFilePath: string): Promise<any> {
    try {
      // Implementation for parsing the ZIP file from GDPR export
      // This would extract and process the CSV/JSON files in the export
      const extractedData = {
        activities: [],
        sleep: [],
        heartRate: [],
        workouts: [],
        body: []
      };

      // Parse various CSV files from the export
      // ACTIVITY/, SLEEP/, HEARTRATE/, SPORT/, BODY/ directories
      
      return extractedData;
    } catch (error) {
      throw new Error(`GDPR export parsing failed: ${error.message}`);
    }
  }

  // Method 5: Instructions for manual token extraction
  getManualTokenExtractionInstructions(): string {
    return `
    Manual Token Extraction Instructions:
    
    For Android (requires root or ADB):
    1. Root method: Extract token from /data/data/com.xiaomi.hm.health/shared_prefs/hm_id_sdk_android.xml
    2. ADB method: Use 'adb backup com.xiaomi.hm.health' to backup app data
    3. HTTP proxy method: Use Fiddler/HTTP Toolkit to capture API requests and extract 'apptoken' header
    
    For iOS:
    1. Use HTTP proxy tools to intercept Mi Fitness app requests
    2. Look for 'apptoken' header in API calls to api-mifit.huami.com
    3. Extract token from app keychain (requires jailbreak)
    
    Alternative: Use browser developer tools on web version of Mi Fitness (if available)
    `;
  }
}

// Export singleton instance
export const miFitnessExtractor = new MiFitnessExtractor();