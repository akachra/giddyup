import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, json, index, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  age: integer("age"),
  // Extended profile information
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"), // male, female, other
  height: real("height_cm"), // in centimeters
  targetWeight: real("target_weight_kg"), // in kilograms
  activityLevel: text("activity_level"), // sedentary, lightly_active, moderately_active, very_active, extra_active
  fitnessGoals: json("fitness_goals"), // array of goals like weight_loss, muscle_gain, endurance, etc
  medicalConditions: json("medical_conditions"), // array of conditions
  // Daily targets
  stepGoal: integer("step_goal").default(10000),
  calorieGoal: integer("calorie_goal").default(1000),
  sleepGoal: integer("sleep_goal_minutes").default(480), // 8 hours
  // Preferences
  units: text("units").default('metric'), // metric or imperial
  timezone: text("timezone").default('UTC'),
  // Google Fit integration tokens
  googleFitTokens: json("google_fit_tokens"), // Store access/refresh tokens for Google Fit API
  // Data lock settings
  dataLockDate: timestamp("data_lock_date"), // Protect all data before this date from overwrites
  dataLockEnabled: boolean("data_lock_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;

export const healthMetrics = pgTable("health_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  // Optional granular timing for specific metrics
  startTime: timestamp("start_time"), // When this health metric period started
  endTime: timestamp("end_time"), // When this health metric period ended
  sleepScore: integer("sleep_score"),
  sleepDuration: integer("sleep_duration_minutes"),
  deepSleep: integer("deep_sleep_minutes"),
  remSleep: integer("rem_sleep_minutes"),
  lightSleep: integer("light_sleep_minutes"),
  recoveryScore: integer("recovery_score"),
  strainScore: real("strain_score"),
  restingHeartRate: integer("resting_heart_rate"),
  heartRateVariability: integer("heart_rate_variability"),
  metabolicAge: integer("metabolic_age"),
  readinessScore: integer("readiness_score"),
  weight: real("weight"),
  bodyFatPercentage: real("body_fat_percentage"),
  muscleMass: real("muscle_mass"),
  visceralFat: integer("visceral_fat"),
  bmr: integer("bmr"),
  bmi: real("bmi"),
  // Additional body composition fields (RENPHO & smart scale data)
  waterPercentage: real("water_percentage"),
  boneMass: real("bone_mass"),
  proteinPercentage: real("protein_percentage"),
  subcutaneousFat: real("subcutaneous_fat"),
  leanBodyMass: real("lean_body_mass"),
  bodyScore: integer("body_score"), // Overall composition score
  bodyType: text("body_type"), // e.g. "balanced", "athletic", etc.
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  sleepEfficiency: real("sleep_efficiency"),
  wakeEvents: integer("wake_events"),
  fitnessAge: integer("fitness_age"),
  steps: integer("steps"),
  distance: real("distance_km"),
  caloriesBurned: integer("calories_burned"),
  activeCalories: integer("active_calories"),
  activityRingCompletion: real("activity_ring_completion"),
  // Advanced Whoop-inspired metrics
  vo2Max: real("vo2_max"),
  stressLevel: integer("stress_level"), // 1-100 scale
  skinTemperature: real("skin_temperature"),
  oxygenSaturation: real("oxygen_saturation"),
  respiratoryRate: integer("respiratory_rate"),
  sleepDebt: integer("sleep_debt_minutes"),
  trainingLoad: real("training_load"),
  healthspan: integer("healthspan_score"), // biological vs chronological age
  // Heart Rate Zone Data (JSON format: [{zone: 1, minutes: 30, percentage: 25}, ...])
  heartRateZoneData: json("heart_rate_zone_data"),
  // Women's health tracking
  menstrualCycleDay: integer("menstrual_cycle_day"),
  cyclePhase: text("cycle_phase"), // follicular, ovulation, luteal, menstrual
  // Field-level metadata for data freshness tracking
  // Each field can have its own recorded timestamp and source
  fieldMetadata: json("field_metadata"), // Store metadata per field: {steps: {recordedAt: "2023-08-08T10:00:00Z", source: "health_connect"}}
  // Data source tracking for freshness comparison
  source: text("source"), // 'mi_fitness', 'health_connect', 'manual', 'renpho'
  importedAt: timestamp("imported_at"), // When this data was last imported/updated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  strain: real("strain"),
  calories: integer("calories"),
  activeCalories: integer("active_calories"),
  steps: integer("steps"),
  distance: real("distance"),
  averageHeartRate: integer("average_heart_rate"),
  maxHeartRate: integer("max_heart_rate"),
  createdAt: timestamp("created_at").defaultNow(),
});

// New table for granular health data with timestamps
export const healthDataPoints = pgTable("health_data_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  dataType: text("data_type").notNull(), // 'steps', 'heart_rate', 'sleep_stage', 'calories', etc.
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"), // Optional - some data points only have start time
  value: real("value").notNull(), // The numeric value (steps count, BPM, etc.)
  unit: text("unit"), // 'count', 'bpm', 'minutes', 'kcal', etc.
  metadata: json("metadata"), // Additional context (sleep stage type, activity type, etc.)
  sourceApp: text("source_app"), // Which app generated this data
  deviceId: text("device_id"), // Device identifier if available
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate health data points
  // Handle NULL end_time values properly by using COALESCE or separate constraints
  uniqueHealthDataPoint: unique().on(table.userId, table.dataType, table.startTime, table.sourceApp),
}));

export const nutritionData = pgTable("nutrition_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  calories: integer("calories"),
  protein: real("protein_grams"),
  carbs: real("carbs_grams"),
  fat: real("fat_grams"),
  fiber: real("fiber_grams"),
  sodium: real("sodium_mg"),
  water: real("water_liters"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const weeklySummary = pgTable("weekly_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  avgSleepScore: real("avg_sleep_score"),
  avgRecoveryScore: real("avg_recovery_score"),
  avgStrainScore: real("avg_strain_score"),
  avgHeartRateVariability: real("avg_heart_rate_variability"),
  avgRestingHeartRate: real("avg_resting_heart_rate"),
  avgBloodPressure: text("avg_blood_pressure"),
  weightChange: real("weight_change"),
  totalSteps: integer("total_steps"),
  totalDistance: real("total_distance"),
  totalCalories: integer("total_calories"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  messages: json("messages").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  driveBackupEnabled: boolean("drive_backup_enabled").default(false),
  manualInputEnabled: boolean("manual_input_enabled").default(false),
  healthConnectEnabled: boolean("health_connect_enabled").default(true),
  settings: json("settings"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiCoachingInsights = pgTable("ai_coaching_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(), // The date these insights are for
  timeRecommendations: json("time_recommendations"), // Time-based recommendations
  recoveryWorkout: json("recovery_workout"), // Recovery-based workout
  dailyInsights: json("daily_insights"), // Daily insights and analysis
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const manualHeartRateData = pgTable("manual_heart_rate_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  restingHR: integer("resting_hr"),
  minHR: integer("min_hr"),
  avgHRSleeping: integer("avg_hr_sleeping"),
  maxHR: integer("max_hr"),
  avgHRAwake: integer("avg_hr_awake"),
  hrv: real("hrv"), // HRV (RMSSD) in milliseconds
  calories: integer("calories"), // Daily calories burned
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Import Logs table for tracking all import/sync operations
export const importLogs = pgTable("import_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  type: varchar("type").notNull(), // 'health-connect', 'google-fit', 'google-drive', 'renpho'
  operation: varchar("operation").notNull(), // 'import', 'sync'
  status: varchar("status").notNull(), // 'success', 'error', 'partial'
  recordsImported: integer("records_imported").default(0).notNull(),
  recordsSkipped: integer("records_skipped").default(0).notNull(),
  recordsErrors: integer("records_errors").default(0).notNull(),
  message: text("message").notNull(),
  details: text("details").array(), // Array of detailed log messages
  error: text("error"), // Error message if any
  userId: varchar("user_id").default("default-user").notNull()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertUserProfileSchema = createInsertSchema(users).omit({
  id: true,
  username: true,
  password: true,
});

export const updateUserProfileSchema = createInsertSchema(users).omit({
  id: true,
  username: true,
  password: true,
}).partial();

export const insertHealthMetricsSchema = createInsertSchema(healthMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertHealthDataPointSchema = createInsertSchema(healthDataPoints).omit({
  id: true,
  createdAt: true,
});

export const insertAIConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
});

export const insertNutritionDataSchema = createInsertSchema(nutritionData).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklySummarySchema = createInsertSchema(weeklySummary).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
});

export const insertAICoachingInsightsSchema = createInsertSchema(aiCoachingInsights).omit({
  id: true,
  generatedAt: true,
});

export const insertManualHeartRateDataSchema = createInsertSchema(manualHeartRateData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertImportLogSchema = createInsertSchema(importLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type HealthMetrics = typeof healthMetrics.$inferSelect;
export type InsertHealthMetrics = z.infer<typeof insertHealthMetricsSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type HealthDataPoint = typeof healthDataPoints.$inferSelect;
export type InsertHealthDataPoint = z.infer<typeof insertHealthDataPointSchema>;
export type NutritionData = typeof nutritionData.$inferSelect;
export type InsertNutritionData = z.infer<typeof insertNutritionDataSchema>;
export type WeeklySummary = typeof weeklySummary.$inferSelect;
export type InsertWeeklySummary = z.infer<typeof insertWeeklySummarySchema>;
export type AIConversation = typeof aiConversations.$inferSelect;
export type InsertAIConversation = z.infer<typeof insertAIConversationSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type AICoachingInsights = typeof aiCoachingInsights.$inferSelect;
export type InsertAICoachingInsights = z.infer<typeof insertAICoachingInsightsSchema>;
export type ManualHeartRateData = typeof manualHeartRateData.$inferSelect;
export type InsertManualHeartRateData = z.infer<typeof insertManualHeartRateDataSchema>;
export type ImportLog = typeof importLogs.$inferSelect;
export type InsertImportLog = z.infer<typeof insertImportLogSchema>;
