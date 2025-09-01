-- Deployment-ready SQL migration
-- Creates all tables and indexes needed for production deployment

-- Create sessions table for Replit Auth
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar PRIMARY KEY NOT NULL,
  "sess" jsonb NOT NULL,
  "expire" timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar,
  "first_name" varchar,
  "last_name" varchar,
  "profile_image_url" varchar,
  "age" integer,
  "date_of_birth" timestamp,
  "gender" text,
  "height_cm" real,
  "target_weight_kg" real,
  "activity_level" text,
  "fitness_goals" json,
  "medical_conditions" json,
  "step_goal" integer DEFAULT 10000,
  "calorie_goal" integer DEFAULT 1000,
  "sleep_goal_minutes" integer DEFAULT 480,
  "units" text DEFAULT 'metric',
  "timezone" text DEFAULT 'UTC',
  "google_fit_tokens" json,
  "data_lock_date" timestamp,
  "data_lock_enabled" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create health_metrics table
CREATE TABLE IF NOT EXISTS "health_metrics" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL,
  "date" timestamp NOT NULL,
  "start_time" timestamp,
  "end_time" timestamp,
  "sleep_score" integer,
  "sleep_duration_minutes" integer,
  "deep_sleep_minutes" integer,
  "rem_sleep_minutes" integer,
  "light_sleep_minutes" integer,
  "recovery_score" integer,
  "strain_score" real,
  "resting_heart_rate" integer,
  "heart_rate_variability" integer,
  "metabolic_age" integer,
  "readiness_score" integer,
  "weight" real,
  "body_fat_percentage" real,
  "muscle_mass" real,
  "visceral_fat" integer,
  "bmr" integer,
  "bmi" real,
  "water_percentage" real,
  "bone_mass" real,
  "protein_percentage" real,
  "subcutaneous_fat" real,
  "lean_body_mass" real,
  "body_score" integer,
  "body_type" text,
  "blood_pressure_systolic" integer,
  "blood_pressure_diastolic" integer,
  "sleep_efficiency" real,
  "wake_events" integer,
  "fitness_age" integer,
  "steps" integer,
  "distance_km" real,
  "calories_burned" integer,
  "active_calories" integer,
  "activity_ring_completion" real,
  "vo2_max" real,
  "stress_level" integer,
  "skin_temperature" real,
  "oxygen_saturation" real,
  "respiratory_rate" integer,
  "sleep_debt_minutes" integer,
  "training_load" real,
  "healthspan_score" integer,
  "heart_rate_zone_data" json,
  "menstrual_cycle_day" integer,
  "cycle_phase" text,
  "field_metadata" json,
  "source" text,
  "imported_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create activities table
CREATE TABLE IF NOT EXISTS "activities" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "start_time" timestamp NOT NULL,
  "end_time" timestamp NOT NULL,
  "strain" real,
  "calories" integer,
  "active_calories" integer,
  "steps" integer,
  "distance" real,
  "average_heart_rate" integer,
  "max_heart_rate" integer,
  "created_at" timestamp DEFAULT now()
);

-- Create health_data_points table
CREATE TABLE IF NOT EXISTS "health_data_points" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL,
  "data_type" text NOT NULL,
  "start_time" timestamp NOT NULL,
  "end_time" timestamp,
  "value" real NOT NULL,
  "unit" text,
  "metadata" json,
  "source_app" text,
  "device_id" text,
  "created_at" timestamp DEFAULT now()
);

-- Create ai_conversations table
CREATE TABLE IF NOT EXISTS "ai_conversations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL,
  "messages" json NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Create ai_coaching_insights table
CREATE TABLE IF NOT EXISTS "ai_coaching_insights" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL,
  "date" timestamp NOT NULL,
  "time_recommendations" json,
  "recovery_workout" json,
  "daily_insights" json,
  "generated_at" timestamp DEFAULT now()
);

-- Create manual_heart_rate_data table
CREATE TABLE IF NOT EXISTS "manual_heart_rate_data" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL,
  "date" timestamp NOT NULL,
  "resting_hr" integer,
  "min_hr" integer,
  "avg_hr_sleeping" integer,
  "max_hr" integer,
  "avg_hr_awake" integer,
  "hrv" real,
  "calories" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Add foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'health_metrics_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'activities_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'health_data_points_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "health_data_points" ADD CONSTRAINT "health_data_points_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_conversations_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_coaching_insights_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "ai_coaching_insights" ADD CONSTRAINT "ai_coaching_insights_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'manual_heart_rate_data_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "manual_heart_rate_data" ADD CONSTRAINT "manual_heart_rate_data_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;