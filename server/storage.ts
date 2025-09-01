import { type User, type InsertUser, type UpsertUser, type UpdateUserProfile, type HealthMetrics, type InsertHealthMetrics, type HealthDataPoint, type InsertHealthDataPoint, type Activity, type InsertActivity, type AIConversation, type InsertAIConversation, type UserSettings, type InsertUserSettings, type AICoachingInsights, type InsertAICoachingInsights, type ManualHeartRateData, type InsertManualHeartRateData, type ImportLog, type InsertImportLog } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, healthMetrics, healthDataPoints, activities, aiConversations, userSettings, aiCoachingInsights, manualHeartRateData, importLogs } from "@shared/schema";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: UpdateUserProfile): Promise<User>;
  
  getHealthMetrics(userId: string, days?: number): Promise<HealthMetrics[]>;
  getHealthMetricsForDate(userId: string, date: Date): Promise<HealthMetrics | undefined>;
  getHealthMetricsWithFallback(userId: string, date: Date): Promise<HealthMetrics | undefined>;
  getLatestHealthMetricsDate(userId: string): Promise<Date | null>;
  createHealthMetrics(metrics: InsertHealthMetrics): Promise<HealthMetrics>;
  updateHealthMetrics(id: string, metrics: Partial<HealthMetrics>): Promise<HealthMetrics>;
  upsertHealthMetrics(metrics: InsertHealthMetrics): Promise<HealthMetrics>;
  deleteHealthMetricsByDate(userId: string, date: string): Promise<void>;
  
  // Granular health data points operations
  createHealthDataPoint(dataPoint: InsertHealthDataPoint): Promise<HealthDataPoint>;
  upsertHealthDataPoint(dataPoint: InsertHealthDataPoint): Promise<HealthDataPoint>;
  getHealthDataPointsByDateRange(userId: string, startDate: Date, endDate: Date, dataType?: string): Promise<HealthDataPoint[]>;
  
  getActivities(userId: string, days?: number): Promise<Activity[]>;
  getActivitiesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: string, activity: Partial<Activity>): Promise<Activity>;
  deleteActivity(id: string): Promise<void>;
  
  getAIConversation(userId: string): Promise<AIConversation | undefined>;
  createOrUpdateAIConversation(conversation: InsertAIConversation): Promise<AIConversation>;
  
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  createOrUpdateUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  
  getAICoachingInsights(userId: string, date: Date): Promise<AICoachingInsights | undefined>;
  createOrUpdateAICoachingInsights(insights: InsertAICoachingInsights): Promise<AICoachingInsights>;
  
  // Data lock operations
  getProtectedHealthMetricsCount(userId: string, lockDate: Date): Promise<number>;
  
  // Manual heart rate operations
  getManualHeartRateData(userId: string, days?: number): Promise<ManualHeartRateData[]>;
  getManualHeartRateDataForDate(userId: string, date: Date): Promise<ManualHeartRateData | undefined>;
  createOrUpdateManualHeartRateData(data: InsertManualHeartRateData): Promise<ManualHeartRateData>;
  deleteManualHeartRateData(id: string): Promise<void>;

  // Import log operations
  createImportLog(log: InsertImportLog): Promise<ImportLog>;
  getImportLogs(userId: string, limit?: number): Promise<ImportLog[]>;
  
  // Dangerous operation - wipe all database data
  wipeAllDatabaseData(): Promise<{ tablesCleared: string[]; recordsDeleted: number }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private healthMetrics: Map<string, HealthMetrics>;
  private healthDataPoints: Map<string, HealthDataPoint>;
  private activities: Map<string, Activity>;
  private aiConversations: Map<string, AIConversation>;
  private userSettings: Map<string, UserSettings>;
  private aiCoachingInsights: Map<string, AICoachingInsights>;

  constructor() {
    this.users = new Map();
    this.healthMetrics = new Map();
    this.healthDataPoints = new Map();
    this.activities = new Map();
    this.aiConversations = new Map();
    this.userSettings = new Map();
    this.aiCoachingInsights = new Map();
    
    // Create a default user for single-user mode
    this.initializeDefaultUser();
  }

  private async initializeDefaultUser() {
    const defaultUser: User = {
      id: "default-user",
      username: "giddyup-user",
      password: "default",
      age: 30,
      firstName: null,
      lastName: null,
      email: null,
      dateOfBirth: new Date('1975-05-04'),
      gender: null,
      height: null,
      targetWeight: null,
      activityLevel: null,
      fitnessGoals: null,
      medicalConditions: null,
      stepGoal: 10000,
      calorieGoal: 1000,
      sleepGoal: 480,
      units: "metric",
      timezone: "UTC",
      dataLockDate: null,
      dataLockEnabled: false,
      updatedAt: null
    };
    this.users.set(defaultUser.id, defaultUser);
    
    // Create sample health metrics for the last 7 days
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const metrics: HealthMetrics = {
        id: randomUUID(),
        userId: defaultUser.id,
        date,
        sleepScore: Math.floor(Math.random() * 40) + 60, // 60-100
        sleepDuration: Math.floor(Math.random() * 120) + 360, // 6-8 hours in minutes
        deepSleep: Math.floor(Math.random() * 60) + 60, // 1-2 hours
        remSleep: Math.floor(Math.random() * 60) + 90, // 1.5-2.5 hours
        lightSleep: Math.floor(Math.random() * 120) + 180, // 3-5 hours
        recoveryScore: Math.floor(Math.random() * 50) + 50, // 50-100
        strainScore: Math.random() * 15 + 5, // 5-20
        restingHeartRate: Math.floor(Math.random() * 20) + 50, // 50-70
        heartRateVariability: Math.floor(Math.random() * 30) + 25, // 25-55
        metabolicAge: Math.floor(Math.random() * 10) + 20, // 20-30
        readinessScore: Math.floor(Math.random() * 40) + 60, // 60-100
        weight: Math.random() * 20 + 70, // 70-90 kg
        bodyFatPercentage: Math.random() * 10 + 10, // 10-20%
        muscleMass: Math.random() * 20 + 30, // 30-50 kg
        visceralFat: Math.floor(Math.random() * 10) + 5, // 5-15
        bmr: Math.floor(Math.random() * 500) + 1500, // 1500-2000
        bmi: Math.random() * 5 + 20, // 20-25 BMI
        bloodPressureSystolic: Math.floor(Math.random() * 20) + 110, // 110-130
        bloodPressureDiastolic: Math.floor(Math.random() * 15) + 70, // 70-85
        sleepEfficiency: Math.random() * 15 + 80, // 80-95%
        wakeEvents: Math.floor(Math.random() * 4) + 1, // 1-5 wake events
        fitnessAge: Math.floor(Math.random() * 8) + 22, // 22-30 fitness age
        steps: Math.floor(Math.random() * 5000) + 5000, // 5000-10000 steps
        distance: Math.random() * 5 + 3, // 3-8 km
        caloriesBurned: Math.floor(Math.random() * 800) + 1800, // 1800-2600 calories
        activityRingCompletion: Math.random() * 0.4 + 0.6, // 60-100% completion
        vo2Max: null, // Will be calculated from RHR and age
        stressLevel: null,
        skinTemperature: null,
        oxygenSaturation: null,
        respiratoryRate: null,
        sleepDebt: null,
        trainingLoad: null,
        healthspan: null,
        menstrualCycleDay: null,
        cyclePhase: null,
        waterPercentage: null,
        boneMass: null,
        proteinPercentage: null,
        subcutaneousFat: null,
        leanBodyMass: null,
        bodyScore: null,
        bodyType: null,
        createdAt: date
      };
      this.healthMetrics.set(metrics.id, metrics);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = insertUser.id || randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      age: insertUser.age || null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      email: insertUser.email || null,
      dateOfBirth: insertUser.dateOfBirth || null,
      gender: insertUser.gender || null,
      height: insertUser.height || null,
      targetWeight: insertUser.targetWeight || null,
      activityLevel: insertUser.activityLevel || null,
      fitnessGoals: insertUser.fitnessGoals || null,
      medicalConditions: insertUser.medicalConditions || null,
      stepGoal: insertUser.stepGoal || 10000,
      calorieGoal: insertUser.calorieGoal || 1000,
      sleepGoal: insertUser.sleepGoal || 480,
      units: insertUser.units || "metric",
      timezone: insertUser.timezone || "UTC",
      updatedAt: null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: UpdateUserProfile): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error(`User with id ${id} not found`);
    }
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async getHealthMetrics(userId: string, days = 7): Promise<HealthMetrics[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const metrics = Array.from(this.healthMetrics.values())
      .filter(metric => metric.userId === userId && metric.date >= cutoffDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Apply fallback logic to all metrics
    return await this.applyFallbackToMetrics(userId, metrics);
  }

  async createHealthMetrics(insertMetrics: InsertHealthMetrics): Promise<HealthMetrics> {
    const id = randomUUID();
    const metrics: HealthMetrics = { 
      ...insertMetrics, 
      id,
      createdAt: new Date(),
      startTime: insertMetrics.startTime ?? null,
      endTime: insertMetrics.endTime ?? null,
      sleepScore: insertMetrics.sleepScore ?? null,
      sleepDuration: insertMetrics.sleepDuration ?? null,
      deepSleep: insertMetrics.deepSleep ?? null,
      remSleep: insertMetrics.remSleep ?? null,
      lightSleep: insertMetrics.lightSleep ?? null,
      recoveryScore: insertMetrics.recoveryScore ?? null,
      strainScore: insertMetrics.strainScore ?? null,
      restingHeartRate: insertMetrics.restingHeartRate ?? null,
      heartRateVariability: insertMetrics.heartRateVariability ?? null,
      metabolicAge: insertMetrics.metabolicAge ?? null,
      readinessScore: insertMetrics.readinessScore ?? null,
      weight: insertMetrics.weight ?? null,
      bodyFatPercentage: insertMetrics.bodyFatPercentage ?? null,
      muscleMass: insertMetrics.muscleMass ?? null,
      visceralFat: insertMetrics.visceralFat ?? null,
      bmr: insertMetrics.bmr ?? null,
      bmi: insertMetrics.bmi ?? null,
      bloodPressureSystolic: insertMetrics.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: insertMetrics.bloodPressureDiastolic ?? null,
      sleepEfficiency: insertMetrics.sleepEfficiency ?? null,
      wakeEvents: insertMetrics.wakeEvents ?? null,
      fitnessAge: insertMetrics.fitnessAge ?? null,
      steps: insertMetrics.steps ?? null,
      distance: insertMetrics.distance ?? null,
      caloriesBurned: insertMetrics.caloriesBurned ?? null,
      activityRingCompletion: insertMetrics.activityRingCompletion ?? null,
      heartRateZoneData: insertMetrics.heartRateZoneData ?? null,
      vo2Max: insertMetrics.vo2Max ?? null,
      stressLevel: insertMetrics.stressLevel ?? null,
      skinTemperature: insertMetrics.skinTemperature ?? null,
      oxygenSaturation: insertMetrics.oxygenSaturation ?? null,
      respiratoryRate: insertMetrics.respiratoryRate ?? null,
      sleepDebt: insertMetrics.sleepDebt ?? null,
      trainingLoad: insertMetrics.trainingLoad ?? null,
      healthspan: insertMetrics.healthspan ?? null,
      menstrualCycleDay: insertMetrics.menstrualCycleDay ?? null,
      cyclePhase: insertMetrics.cyclePhase ?? null,
      waterPercentage: insertMetrics.waterPercentage ?? null,
      boneMass: insertMetrics.boneMass ?? null,
      proteinPercentage: insertMetrics.proteinPercentage ?? null,
      subcutaneousFat: insertMetrics.subcutaneousFat ?? null,
      leanBodyMass: insertMetrics.leanBodyMass ?? null,
      bodyScore: insertMetrics.bodyScore ?? null,
      bodyType: insertMetrics.bodyType ?? null
    };
    this.healthMetrics.set(id, metrics);
    return metrics;
  }

  async updateHealthMetrics(id: string, updates: Partial<HealthMetrics>): Promise<HealthMetrics> {
    const existing = this.healthMetrics.get(id);
    if (!existing) {
      throw new Error(`Health metrics with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    this.healthMetrics.set(id, updated);
    return updated;
  }

  async getHealthMetricsForDate(userId: string, date: Date): Promise<HealthMetrics | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.healthMetrics.values())
      .find(metrics => 
        metrics.userId === userId && 
        metrics.date >= startOfDay && 
        metrics.date <= endOfDay
      );
  }

  async getLatestHealthMetricsDate(userId: string): Promise<Date | null> {
    const userMetrics = Array.from(this.healthMetrics.values())
      .filter(metrics => metrics.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return userMetrics[0]?.date || null;
  }

  async getHealthMetricsWithFallback(userId: string, date: Date): Promise<HealthMetrics | undefined> {
    const metrics = await this.getHealthMetricsForDate(userId, date);
    if (!metrics) return undefined;
    
    return await this.applySingleFallback(userId, metrics, date);
  }

  private async applyFallbackToMetrics(userId: string, metrics: HealthMetrics[]): Promise<HealthMetrics[]> {
    const result: HealthMetrics[] = [];
    
    for (const metric of metrics) {
      const withFallback = await this.applySingleFallback(userId, metric, metric.date);
      result.push(withFallback);
    }
    
    return result;
  }

  private async applySingleFallback(userId: string, metrics: HealthMetrics, maxDate: Date): Promise<HealthMetrics> {
    // Health fields that need fallback (weight-related, fitness metrics, blood pressure, and RHR)
    const fallbackFields = ['weight', 'muscleMass', 'bodyFatPercentage', 'bmi', 'visceralFat', 'vo2Max', 'fitnessAge', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'restingHeartRate'] as const;
    
    const needsFallback = fallbackFields.some(field => !metrics[field]);
    
    if (!needsFallback) return metrics;
    
    // Get all user metrics up to maxDate, sorted by most recent first
    const allMetrics = Array.from(this.healthMetrics.values())
      .filter(m => m.userId === userId && m.date <= maxDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    const fallbackMetrics = { ...metrics };
    
    // Apply fallback for each missing weight-related field
    for (const recentMetric of allMetrics) {
      for (const field of fallbackFields) {
        if (!fallbackMetrics[field] && recentMetric[field]) {
          fallbackMetrics[field] = recentMetric[field];
        }
      }
      
      // Stop if we found all needed values
      if (fallbackFields.every(field => fallbackMetrics[field])) {
        break;
      }
    }
    
    return fallbackMetrics;
  }

  async upsertHealthMetrics(metrics: InsertHealthMetrics): Promise<HealthMetrics> {
    // First try to find existing metrics for this date
    const existing = await this.getHealthMetricsForDate(metrics.userId, metrics.date);
    
    if (existing) {
      // Intelligently merge new data with existing data
      // Only update fields that have new values, keep existing values for others
      const updateData: Partial<HealthMetrics> = {};
      Object.entries(metrics).forEach(([key, value]) => {
        if (value !== null && value !== undefined && key !== 'userId' && key !== 'date') {
          // Always update with new data if provided
          (updateData as any)[key] = value;
        }
      });
      
      // Only update if there's actually new data
      if (Object.keys(updateData).length > 0) {
        return await this.updateHealthMetrics(existing.id, updateData);
      } else {
        return existing; // No new data to update
      }
    } else {
      // Create new metrics
      return await this.createHealthMetrics(metrics);
    }
  }

  async getActivities(userId: string, days = 7): Promise<Activity[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return Array.from(this.activities.values())
      .filter(activity => activity.userId === userId && activity.startTime >= cutoffDate)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async getActivitiesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => 
        activity.userId === userId && 
        activity.startTime >= startDate && 
        activity.startTime <= endDate
      )
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async updateActivity(id: string, updates: Partial<Activity>): Promise<Activity> {
    const existing = this.activities.get(id);
    if (!existing) {
      throw new Error('Activity not found');
    }
    
    const updated: Activity = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date()
    };
    
    this.activities.set(id, updated);
    return updated;
  }

  async deleteActivity(id: string): Promise<void> {
    this.activities.delete(id);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = { 
      ...insertActivity, 
      id,
      createdAt: new Date(),
      strain: insertActivity.strain ?? null,
      calories: insertActivity.calories ?? null,
      steps: insertActivity.steps ?? null,
      distance: insertActivity.distance ?? null,
      averageHeartRate: insertActivity.averageHeartRate ?? null,
      maxHeartRate: insertActivity.maxHeartRate ?? null
    };
    this.activities.set(id, activity);
    return activity;
  }

  async getAIConversation(userId: string): Promise<AIConversation | undefined> {
    return Array.from(this.aiConversations.values())
      .find(conv => conv.userId === userId);
  }

  async createOrUpdateAIConversation(insertConversation: InsertAIConversation): Promise<AIConversation> {
    const existing = await this.getAIConversation(insertConversation.userId);
    
    if (existing) {
      const updated = { ...existing, ...insertConversation };
      this.aiConversations.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const conversation: AIConversation = { 
        ...insertConversation, 
        id,
        createdAt: new Date()
      };
      this.aiConversations.set(id, conversation);
      return conversation;
    }
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    return Array.from(this.userSettings.values())
      .find(settings => settings.userId === userId);
  }

  async createOrUpdateUserSettings(insertSettings: InsertUserSettings): Promise<UserSettings> {
    const existing = await this.getUserSettings(insertSettings.userId);
    
    if (existing) {
      const updated = { ...existing, ...insertSettings };
      this.userSettings.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const settings: UserSettings = { 
        ...insertSettings, 
        id,
        createdAt: new Date(),
        driveBackupEnabled: insertSettings.driveBackupEnabled ?? null,
        manualInputEnabled: insertSettings.manualInputEnabled ?? null,
        healthConnectEnabled: insertSettings.healthConnectEnabled ?? null,
        settings: insertSettings.settings ?? null
      };
      this.userSettings.set(id, settings);
      return settings;
    }
  }

  async getAICoachingInsights(userId: string, date: Date): Promise<AICoachingInsights | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.aiCoachingInsights.values())
      .find(insights => 
        insights.userId === userId && 
        insights.date >= startOfDay && 
        insights.date <= endOfDay
      );
  }

  async createOrUpdateAICoachingInsights(insertInsights: InsertAICoachingInsights): Promise<AICoachingInsights> {
    const existing = await this.getAICoachingInsights(insertInsights.userId, insertInsights.date);
    
    if (existing) {
      const updated = { ...existing, ...insertInsights, generatedAt: new Date() };
      this.aiCoachingInsights.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const insights: AICoachingInsights = { 
        ...insertInsights, 
        id,
        generatedAt: new Date()
      };
      this.aiCoachingInsights.set(id, insights);
      return insights;
    }
  }

  // Stub implementations for health data points (memory storage doesn't persist these)
  async createHealthDataPoint(dataPoint: InsertHealthDataPoint): Promise<HealthDataPoint> {
    const result = {
      id: randomUUID(),
      createdAt: new Date(),
      ...dataPoint
    };
    this.healthDataPoints.set(result.id, result);
    return result;
  }

  async upsertHealthDataPoint(dataPoint: InsertHealthDataPoint): Promise<HealthDataPoint> {
    return this.createHealthDataPoint(dataPoint);
  }

  async getHealthDataPointsByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date, 
    dataType?: string
  ): Promise<HealthDataPoint[]> {
    return []; // Stub implementation for memory storage
  }

  /**
   * DANGEROUS: Wipe all data from memory storage
   * This permanently deletes everything and ignores all data freshness restrictions
   */
  async getProtectedHealthMetricsCount(userId: string, lockDate: Date): Promise<number> {
    // For memory storage, get the user's data lock settings and count protected records
    const user = this.users.get(userId);
    if (!user?.dataLockEnabled || !user?.dataLockDate) {
      return 0;
    }

    let count = 0;
    for (const metrics of this.healthMetrics.values()) {
      if (metrics.userId === userId && metrics.date <= lockDate) {
        count++;
      }
    }
    return count;
  }

  async wipeAllDatabaseData(): Promise<{ tablesCleared: string[]; recordsDeleted: number }> {
    console.log('⚠️  DANGER: Starting complete memory storage wipe - this will delete ALL data permanently!');
    
    let totalRecordsDeleted = 0;
    const tablesCleared: string[] = [];
    
    const storageMap = [
      { storage: this.users, name: 'users' },
      { storage: this.healthMetrics, name: 'health_metrics' },
      { storage: this.activities, name: 'activities' },
      { storage: this.aiConversations, name: 'ai_conversations' },
      { storage: this.userSettings, name: 'user_settings' },
      { storage: this.aiCoachingInsights, name: 'ai_coaching_insights' },
      { storage: this.healthDataPoints, name: 'health_data_points' }
    ];

    for (const { storage, name } of storageMap) {
      const recordCount = storage.size;
      if (recordCount > 0) {
        storage.clear();
        totalRecordsDeleted += recordCount;
        tablesCleared.push(name);
        console.log(`✅ Cleared ${recordCount} records from ${name}`);
      } else {
        console.log(`ℹ️  Storage ${name} was already empty`);
      }
    }

    console.log(`🗑️  Memory storage wipe completed: ${totalRecordsDeleted} total records deleted from ${tablesCleared.length} storage maps`);
    
    return {
      tablesCleared,
      recordsDeleted: totalRecordsDeleted
    };
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // For Replit Auth, username lookups are not needed - users are identified by their Replit ID
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: UpdateUserProfile): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  private calculateAgeFromBirthdate(birthdate: Date): number {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  async getHealthMetrics(userId: string, days?: number): Promise<HealthMetrics[]> {
    let whereConditions = [eq(healthMetrics.userId, userId)];
    
    // Show data up to today if sleep data exists (indicating complete night)
    // Otherwise show up to yesterday to avoid incomplete daily data
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    whereConditions.push(lte(healthMetrics.date, today));
    
    if (days) {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);
      whereConditions.push(gte(healthMetrics.date, dateLimit));
    }
    
    const metrics = await db
      .select()
      .from(healthMetrics)
      .where(and(...whereConditions))
      .orderBy(desc(healthMetrics.date));
    
    // Calculate user age from birthdate
    const [user] = await db.select({ dateOfBirth: users.dateOfBirth }).from(users).where(eq(users.id, userId));
    const userAge = user?.dateOfBirth ? this.calculateAgeFromBirthdate(user.dateOfBirth) : null;
    
    // Add age to each metric
    const metricsWithAge = metrics.map(metric => ({
      ...metric,
      age: userAge
    }));
    
    // Apply fallback logic to all metrics
    return await this.applyFallbackToMetrics(userId, metricsWithAge);
  }

  async getHealthMetricsForDate(userId: string, date: Date): Promise<HealthMetrics | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [metrics] = await db
      .select()
      .from(healthMetrics)
      .where(and(
        eq(healthMetrics.userId, userId),
        gte(healthMetrics.date, startOfDay),
        lte(healthMetrics.date, endOfDay)
      ));
    
    if (!metrics) return undefined;
    
    // Calculate user age from birthdate
    const [user] = await db.select({ dateOfBirth: users.dateOfBirth }).from(users).where(eq(users.id, userId));
    const userAge = user?.dateOfBirth ? this.calculateAgeFromBirthdate(user.dateOfBirth) : null;
    
    // Add age to the metric
    return {
      ...metrics,
      age: userAge
    };
  }



  async getHealthMetricsWithFallback(userId: string, date: Date): Promise<HealthMetrics | undefined> {
    const metrics = await this.getHealthMetricsForDate(userId, date);
    if (!metrics) {
      // If no metrics exist for the specific date, create a base record with the requested date
      // and populate missing fields from the most recent available data
      const recentMetrics = await this.getMostRecentHealthMetrics(userId, date);
      if (!recentMetrics) return undefined;
      
      // Create a new record with the requested date but fallback data for missing fields
      const baseRecord: HealthMetrics = {
        ...recentMetrics,
        id: randomUUID(),
        date: date, // Use the requested date, not the fallback date
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return await this.applySingleFallback(userId, baseRecord, date);
    }
    
    return await this.applySingleFallback(userId, metrics, date);
  }

  // Get the most recent health metrics available before the given date
  private async getMostRecentHealthMetrics(userId: string, beforeDate: Date): Promise<HealthMetrics | undefined> {
    const [recentMetrics] = await db
      .select()
      .from(healthMetrics)
      .where(and(
        eq(healthMetrics.userId, userId),
        lte(healthMetrics.date, beforeDate)
      ))
      .orderBy(desc(healthMetrics.date))
      .limit(1);
    
    return recentMetrics;
  }

  private async applyFallbackToMetrics(userId: string, metrics: HealthMetrics[]): Promise<HealthMetrics[]> {
    const result: HealthMetrics[] = [];
    
    for (const metric of metrics) {
      const withFallback = await this.applySingleFallback(userId, metric, metric.date);
      result.push(withFallback);
    }
    
    return result;
  }

  private async applySingleFallback(userId: string, metrics: HealthMetrics, maxDate: Date): Promise<HealthMetrics> {
    // Health fields that need fallback (weight-related, fitness metrics, blood pressure, and RHR)
    const fallbackFields = ['weight', 'muscleMass', 'bodyFatPercentage', 'bmi', 'visceralFat', 'vo2Max', 'fitnessAge', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'restingHeartRate'] as const;
    
    const needsFallback = fallbackFields.some(field => !metrics[field]);
    
    if (!needsFallback) return metrics;
    
    // Get all user metrics up to maxDate, ordered by most recent first
    const recentMetrics = await db
      .select()
      .from(healthMetrics)
      .where(and(
        eq(healthMetrics.userId, userId),
        lte(healthMetrics.date, maxDate)
      ))
      .orderBy(desc(healthMetrics.date));
    
    const fallbackMetrics = { ...metrics };
    
    // Apply fallback for each missing weight-related field
    for (const recentMetric of recentMetrics) {
      for (const field of fallbackFields) {
        if (!fallbackMetrics[field] && recentMetric[field]) {
          fallbackMetrics[field] = recentMetric[field];
        }
      }
      
      // Stop if we found all needed values
      if (fallbackFields.every(field => fallbackMetrics[field])) {
        break;
      }
    }
    
    return fallbackMetrics;
  }

  async createHealthMetrics(metrics: InsertHealthMetrics): Promise<HealthMetrics> {
    const [created] = await db
      .insert(healthMetrics)
      .values(metrics)
      .returning();
    return created;
  }

  async updateHealthMetrics(id: string, metrics: Partial<HealthMetrics>): Promise<HealthMetrics> {
    const [updated] = await db
      .update(healthMetrics)
      .set(metrics)
      .where(eq(healthMetrics.id, id))
      .returning();
    return updated;
  }

  async getLatestHealthMetricsDate(userId: string): Promise<Date | null> {
    const [metrics] = await db.select({ date: healthMetrics.date })
      .from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .orderBy(desc(healthMetrics.date))
      .limit(1);
    
    return metrics?.date || null;
  }

  async upsertHealthMetrics(metrics: InsertHealthMetrics): Promise<HealthMetrics> {
    // First try to find existing metrics for this date
    const existing = await this.getHealthMetricsForDate(metrics.userId, metrics.date);
    
    if (existing) {
      // Intelligently merge new data with existing data
      // Only update fields that have new values, keep existing values for others
      const updateData: Partial<HealthMetrics> = {};
      Object.entries(metrics).forEach(([key, value]) => {
        if (value !== null && value !== undefined && key !== 'userId' && key !== 'date') {
          // Always update with new data if provided
          (updateData as any)[key] = value;
        }
      });
      
      // Only update if there's actually new data
      if (Object.keys(updateData).length > 0) {
        return await this.updateHealthMetrics(existing.id, updateData);
      } else {
        return existing; // No new data to update
      }
    } else {
      // Create new metrics
      return await this.createHealthMetrics(metrics);
    }
  }

  async getActivities(userId: string, days?: number): Promise<Activity[]> {
    let whereConditions = [eq(activities.userId, userId)];
    
    if (days) {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);
      whereConditions.push(gte(activities.startTime, dateLimit));
    }
    
    return await db
      .select()
      .from(activities)
      .where(and(...whereConditions))
      .orderBy(desc(activities.startTime));
  }

  async getActivitiesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.userId, userId),
        gte(activities.startTime, startDate),
        lte(activities.startTime, endDate)
      ))
      .orderBy(desc(activities.startTime));
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [created] = await db
      .insert(activities)
      .values(activity)
      .returning();
    return created;
  }

  async updateActivity(id: string, updates: Partial<Activity>): Promise<Activity> {
    const [updated] = await db
      .update(activities)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(activities.id, id))
      .returning();
    
    if (!updated) {
      throw new Error('Activity not found');
    }
    
    return updated;
  }

  async deleteActivity(id: string): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  // Granular health data points operations
  async createHealthDataPoint(dataPoint: InsertHealthDataPoint): Promise<HealthDataPoint> {
    const [point] = await db
      .insert(healthDataPoints)
      .values(dataPoint)
      .returning();
    return point;
  }

  async getHealthDataPointsByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date, 
    dataType?: string
  ): Promise<HealthDataPoint[]> {
    let whereConditions = [
      eq(healthDataPoints.userId, userId),
      gte(healthDataPoints.startTime, startDate),
      lte(healthDataPoints.startTime, endDate)
    ];

    if (dataType) {
      whereConditions.push(eq(healthDataPoints.dataType, dataType));
    }

    return await db
      .select()
      .from(healthDataPoints)
      .where(and(...whereConditions))
      .orderBy(desc(healthDataPoints.startTime));
  }

  async upsertHealthDataPoint(dataPoint: InsertHealthDataPoint): Promise<HealthDataPoint> {
    // For granular data points, we typically don't upsert but create new records
    // However, we can check for duplicates based on userId, dataType, startTime, and value
    const [existing] = await db
      .select()
      .from(healthDataPoints)
      .where(
        and(
          eq(healthDataPoints.userId, dataPoint.userId),
          eq(healthDataPoints.dataType, dataPoint.dataType),
          eq(healthDataPoints.startTime, dataPoint.startTime),
          eq(healthDataPoints.value, dataPoint.value)
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    return await this.createHealthDataPoint(dataPoint);
  }

  async getAIConversation(userId: string): Promise<AIConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId));
    return conversation || undefined;
  }

  async createOrUpdateAIConversation(conversation: InsertAIConversation): Promise<AIConversation> {
    const existing = await this.getAIConversation(conversation.userId);
    
    if (existing) {
      const [updated] = await db
        .update(aiConversations)
        .set(conversation)
        .where(eq(aiConversations.userId, conversation.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(aiConversations)
        .values(conversation)
        .returning();
      return created;
    }
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async createOrUpdateUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const existing = await this.getUserSettings(settings.userId);
    
    if (existing) {
      const [updated] = await db
        .update(userSettings)
        .set(settings)
        .where(eq(userSettings.userId, settings.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userSettings)
        .values(settings)
        .returning();
      return created;
    }
  }

  async getAICoachingInsights(userId: string, date: Date): Promise<AICoachingInsights | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [insights] = await db
      .select()
      .from(aiCoachingInsights)
      .where(and(
        eq(aiCoachingInsights.userId, userId),
        gte(aiCoachingInsights.date, startOfDay),
        lte(aiCoachingInsights.date, endOfDay)
      ));
    
    return insights || undefined;
  }

  async createOrUpdateAICoachingInsights(insertInsights: InsertAICoachingInsights): Promise<AICoachingInsights> {
    const existing = await this.getAICoachingInsights(insertInsights.userId, insertInsights.date);
    
    if (existing) {
      const [updated] = await db
        .update(aiCoachingInsights)
        .set({ 
          ...insertInsights,
          generatedAt: new Date()
        })
        .where(eq(aiCoachingInsights.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(aiCoachingInsights)
        .values({
          ...insertInsights,
          generatedAt: new Date()
        })
        .returning();
      return created;
    }
  }

  async deleteHealthMetricsByDate(userId: string, date: string): Promise<void> {
    const targetDate = new Date(date + 'T00:00:00');
    await db.delete(healthMetrics).where(
      and(
        eq(healthMetrics.userId, userId),
        eq(healthMetrics.date, targetDate)
      )
    );
  }

  /**
   * DANGEROUS: Wipe all data from all tables in the database
   * This permanently deletes everything and ignores all data freshness restrictions
   */
  async wipeAllDatabaseData(preserveManualHeartRate: boolean = false): Promise<{ tablesCleared: string[]; recordsDeleted: number }> {
    console.log('⚠️  DANGER: Starting complete database wipe - this will delete ALL data permanently!');
    
    let totalRecordsDeleted = 0;
    const tablesCleared: string[] = [];
    
    try {
      // Delete from all main data tables - but preserve the default user
      const tables = [
        { table: healthDataPoints, name: 'health_data_points' },
        { table: activities, name: 'activities' },
        { table: healthMetrics, name: 'health_metrics' },
        { table: aiConversations, name: 'ai_conversations' },
        { table: aiCoachingInsights, name: 'ai_coaching_insights' },
        { table: userSettings, name: 'user_settings' }
      ];

      // Add manual heart rate data table only if not preserving it
      if (!preserveManualHeartRate) {
        tables.push({ table: manualHeartRateData, name: 'manual_heart_rate_data' });
      } else {
        console.log('ℹ️  PRESERVING: Manual heart rate data will be kept during wipe');
      }

      for (const { table, name } of tables) {
        try {
          // Count records before deletion
          const countResult = await db.select().from(table);
          const recordCount = countResult.length;
          
          if (recordCount > 0) {
            // Delete all records from this table
            await db.delete(table);
            totalRecordsDeleted += recordCount;
            tablesCleared.push(name);
            console.log(`✅ Cleared ${recordCount} records from ${name} table`);
          } else {
            console.log(`ℹ️  Table ${name} was already empty`);
          }
        } catch (error) {
          console.error(`❌ Error clearing table ${name}:`, error);
          // Continue with other tables even if one fails
        }
      }

      // For users table, delete everything except the default user, then recreate it if it doesn't exist
      try {
        const userCountResult = await db.select().from(users);
        const userCount = userCountResult.length;
        
        if (userCount > 0) {
          // Delete all users
          await db.delete(users);
          totalRecordsDeleted += userCount;
          tablesCleared.push('users');
          console.log(`✅ Cleared ${userCount} records from users table`);
        }
        
        // Recreate the default user to ensure Health Connect imports work
        await db.insert(users).values({
          id: 'default-user',
          username: 'default',
          password: 'temp',
          age: 30,
          gender: 'male',
          heightCm: 175,
          targetWeightKg: 70,
          activityLevel: 'moderately_active',
          stepGoal: 10000,
          calorieGoal: 1000,
          sleepGoalMinutes: 480,
          units: 'metric',
          timezone: 'UTC',
          updatedAt: new Date()
        });
        console.log(`✅ Recreated default user for Health Connect imports`);
        
      } catch (userError) {
        console.error(`❌ Error handling users table:`, userError);
        // If user creation fails, try to ensure the default user exists anyway
        try {
          const existingUser = await db.select().from(users).where(eq(users.id, 'default-user')).limit(1);
          if (existingUser.length === 0) {
            await db.insert(users).values({
              id: 'default-user',
              username: 'default',
              password: 'temp',
              age: 30,
              gender: 'male',
              heightCm: 175,
              targetWeightKg: 70,
              activityLevel: 'moderately_active',
              stepGoal: 10000,
              calorieGoal: 1000,
              sleepGoalMinutes: 480,
              units: 'metric',
              timezone: 'UTC',
              updatedAt: new Date()
            });
            console.log(`✅ Ensured default user exists after wipe`);
          }
        } catch (fallbackError) {
          console.error(`❌ Failed to ensure default user exists:`, fallbackError);
        }
      }

      console.log(`🗑️  Database wipe completed: ${totalRecordsDeleted} total records deleted from ${tablesCleared.length} tables`);
      console.log(`✅ Default user preserved/recreated for Health Connect imports`);
      
      return {
        tablesCleared,
        recordsDeleted: totalRecordsDeleted
      };
      
    } catch (error) {
      console.error('💥 Critical error during database wipe:', error);
      throw error;
    }
  }

  async getProtectedHealthMetricsCount(userId: string, lockDate: Date): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql`count(*)` })
        .from(healthMetrics)
        .where(
          and(
            eq(healthMetrics.userId, userId),
            lte(healthMetrics.date, lockDate)
          )
        );
      return Number(result.count) || 0;
    } catch (error) {
      console.error('Error counting protected health metrics:', error);
      return 0;
    }
  }

  // Manual Heart Rate Data methods
  async getManualHeartRateData(userId: string, days?: number): Promise<ManualHeartRateData[]> {
    let whereConditions = [eq(manualHeartRateData.userId, userId)];
    
    if (days) {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);
      whereConditions.push(gte(manualHeartRateData.date, dateLimit));
    }
    
    return await db
      .select()
      .from(manualHeartRateData)
      .where(and(...whereConditions))
      .orderBy(desc(manualHeartRateData.date));
  }

  async getManualHeartRateDataForDate(userId: string, date: Date): Promise<ManualHeartRateData | undefined> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const [result] = await db
      .select()
      .from(manualHeartRateData)
      .where(
        and(
          eq(manualHeartRateData.userId, userId),
          eq(manualHeartRateData.date, targetDate)
        )
      );
    
    return result || undefined;
  }

  async createOrUpdateManualHeartRateData(data: InsertManualHeartRateData): Promise<ManualHeartRateData> {
    const targetDate = new Date(data.date);
    targetDate.setHours(0, 0, 0, 0);
    
    // Check if entry exists for this date
    const existing = await this.getManualHeartRateDataForDate(data.userId, targetDate);
    
    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(manualHeartRateData)
        .set({
          restingHR: data.restingHR,
          minHR: data.minHR,
          avgHRSleeping: data.avgHRSleeping,
          maxHR: data.maxHR,
          avgHRAwake: data.avgHRAwake,
          hrv: data.hrv,
          calories: data.calories,
          updatedAt: new Date()
        })
        .where(eq(manualHeartRateData.id, existing.id))
        .returning();
      
      return updated;
    } else {
      // Create new record
      const [created] = await db
        .insert(manualHeartRateData)
        .values({
          ...data,
          date: targetDate
        })
        .returning();
      
      return created;
    }
  }

  async deleteManualHeartRateData(id: string): Promise<void> {
    await db.delete(manualHeartRateData).where(eq(manualHeartRateData.id, id));
  }

  async createImportLog(log: InsertImportLog): Promise<ImportLog> {
    const [created] = await db
      .insert(importLogs)
      .values(log)
      .returning();
    return created;
  }

  async getImportLogs(userId: string, limit: number = 50): Promise<ImportLog[]> {
    return await db
      .select()
      .from(importLogs)
      .where(eq(importLogs.userId, userId))
      .orderBy(desc(importLogs.timestamp))
      .limit(limit);
  }
}

// Initialize database storage with sample data
async function initializeDatabaseStorage() {
  const dbStorage = new DatabaseStorage();
  
  // Check if default user exists
  let defaultUser = await dbStorage.getUser("default-user");
  
  if (!defaultUser) {
    try {
      // Create default user for development (this will be replaced by Replit Auth users)
      defaultUser = await dbStorage.createUser({
        id: "default-user",
        email: "giddyup@example.com",
        firstName: "GiddyUp",
        lastName: "User"
      });
      console.log("✅ Default user created successfully");
    } catch (error: any) {
      // If user already exists (race condition), try to get it
      if (error.code === '23505') { // Unique constraint violation
        console.log("ℹ️ Default user already exists, fetching existing user");
        defaultUser = await dbStorage.getUser("default-user");
      } else {
        throw error;
      }
    }
  }
  
  return dbStorage;
}

export const storage = new DatabaseStorage();
