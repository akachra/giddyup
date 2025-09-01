--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.activities (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    strain real,
    calories integer,
    steps integer,
    distance real,
    average_heart_rate integer,
    max_heart_rate integer,
    created_at timestamp without time zone DEFAULT now(),
    active_calories integer
);


ALTER TABLE public.activities OWNER TO neondb_owner;

--
-- Name: ai_coaching_insights; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_coaching_insights (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    date timestamp without time zone NOT NULL,
    time_recommendations json,
    recovery_workout json,
    daily_insights json,
    generated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ai_coaching_insights OWNER TO neondb_owner;

--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_conversations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    messages json NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ai_conversations OWNER TO neondb_owner;

--
-- Name: health_data_points; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.health_data_points (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    data_type text NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    value real NOT NULL,
    unit text,
    metadata json,
    source_app text,
    device_id text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.health_data_points OWNER TO neondb_owner;

--
-- Name: health_metrics; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.health_metrics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    date timestamp without time zone NOT NULL,
    sleep_score integer,
    sleep_duration_minutes integer,
    deep_sleep_minutes integer,
    rem_sleep_minutes integer,
    light_sleep_minutes integer,
    recovery_score integer,
    strain_score real,
    resting_heart_rate integer,
    heart_rate_variability integer,
    metabolic_age integer,
    readiness_score integer,
    weight real,
    body_fat_percentage real,
    muscle_mass real,
    visceral_fat integer,
    bmr integer,
    bmi real,
    blood_pressure_systolic integer,
    blood_pressure_diastolic integer,
    sleep_efficiency real,
    wake_events integer,
    fitness_age integer,
    steps integer,
    distance_km real,
    calories_burned integer,
    activity_ring_completion real,
    vo2_max real,
    stress_level integer,
    skin_temperature real,
    oxygen_saturation real,
    respiratory_rate integer,
    sleep_debt_minutes integer,
    training_load real,
    healthspan_score integer,
    menstrual_cycle_day integer,
    cycle_phase text,
    created_at timestamp without time zone DEFAULT now(),
    water_percentage real,
    bone_mass real,
    protein_percentage real,
    subcutaneous_fat real,
    lean_body_mass real,
    body_score integer,
    body_type text,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    heart_rate_zone_data json,
    source text,
    imported_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    field_metadata json,
    active_calories integer
);


ALTER TABLE public.health_metrics OWNER TO neondb_owner;

--
-- Name: nutrition_data; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.nutrition_data (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    date timestamp without time zone NOT NULL,
    calories integer,
    protein_grams real,
    carbs_grams real,
    fat_grams real,
    fiber_grams real,
    sodium_mg real,
    water_liters real,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.nutrition_data OWNER TO neondb_owner;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    drive_backup_enabled boolean DEFAULT false,
    manual_input_enabled boolean DEFAULT false,
    health_connect_enabled boolean DEFAULT true,
    settings json,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_settings OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    age integer,
    first_name text,
    last_name text,
    email text,
    date_of_birth timestamp without time zone,
    gender text,
    height_cm real,
    target_weight_kg real,
    activity_level text,
    fitness_goals json,
    medical_conditions json,
    step_goal integer DEFAULT 10000,
    calorie_goal integer DEFAULT 1000,
    sleep_goal_minutes integer DEFAULT 480,
    units text DEFAULT 'metric'::text,
    timezone text DEFAULT 'UTC'::text,
    updated_at timestamp without time zone DEFAULT now(),
    google_fit_tokens json,
    data_lock_date timestamp without time zone,
    data_lock_enabled boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: weekly_summary; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.weekly_summary (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    week_start_date timestamp without time zone NOT NULL,
    avg_sleep_score real,
    avg_recovery_score real,
    avg_strain_score real,
    avg_heart_rate_variability real,
    avg_resting_heart_rate real,
    avg_blood_pressure text,
    weight_change real,
    total_steps integer,
    total_distance real,
    total_calories integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.weekly_summary OWNER TO neondb_owner;

--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: ai_coaching_insights ai_coaching_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_coaching_insights
    ADD CONSTRAINT ai_coaching_insights_pkey PRIMARY KEY (id);


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: health_data_points health_data_points_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.health_data_points
    ADD CONSTRAINT health_data_points_pkey PRIMARY KEY (id);


--
-- Name: health_metrics health_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.health_metrics
    ADD CONSTRAINT health_metrics_pkey PRIMARY KEY (id);


--
-- Name: nutrition_data nutrition_data_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nutrition_data
    ADD CONSTRAINT nutrition_data_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: weekly_summary weekly_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.weekly_summary
    ADD CONSTRAINT weekly_summary_pkey PRIMARY KEY (id);


--
-- Name: activities activities_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ai_coaching_insights ai_coaching_insights_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_coaching_insights
    ADD CONSTRAINT ai_coaching_insights_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ai_conversations ai_conversations_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: health_data_points health_data_points_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.health_data_points
    ADD CONSTRAINT health_data_points_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: health_metrics health_metrics_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.health_metrics
    ADD CONSTRAINT health_metrics_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: nutrition_data nutrition_data_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.nutrition_data
    ADD CONSTRAINT nutrition_data_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_settings user_settings_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: weekly_summary weekly_summary_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.weekly_summary
    ADD CONSTRAINT weekly_summary_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

