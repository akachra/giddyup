# GiddyUp Health & Fitness Tracking Application

## Overview

GiddyUp is a comprehensive health and fitness tracking application designed to monitor and analyze personal wellness metrics. It provides users with detailed insights into sleep patterns, recovery scores, physical activity, and overall health through an AI-powered coaching system. The application features a modern, mobile-first interface with real-time data visualization and personalized recommendations. Its business vision is to empower users with authentic, data-driven insights to improve their longevity and well-being.

## User Preferences

Preferred communication style: Simple, everyday language.

**CRITICAL DATA INTEGRITY RULE**: 
- NEVER create, insert, or generate synthetic/fake health data entries under any circumstances
- NEVER create manual health_metrics, manual_heart_rate, or any health data records with made-up values
- Missing data must be handled gracefully in the UI, not filled with artificial entries
- Only authentic imported data from external sources (Health Connect, RENPHO, Google Fit) is permitted
- This rule applies regardless of display issues, incomplete datasets, or functionality gaps
- Violation of this rule undermines the entire health tracking system's authenticity

## System Architecture

### Frontend Architecture

The client is built using React with TypeScript, employing a component-based architecture. It uses `shadcn/ui` components (new-york style, dark theme) built on Radix UI, `TanStack Query` for server state management, and `Wouter` for lightweight client-side routing. Styling is managed with `Tailwind CSS` and custom CSS variables, supporting both light and dark modes. The design is mobile-first, featuring a bottom navigation pattern and responsive components.

### Backend Architecture

The server uses Express.js with TypeScript in a REST API architecture, providing endpoints for health metrics, activities, AI coaching, and user settings. It includes an abstract storage interface (IStorage) and integrates with the OpenAI API for personalized coaching. Development is streamlined with Vite for hot module replacement.

### Data Storage

The application utilizes PostgreSQL as its primary database, managed with `Drizzle ORM` for type-safe schema definitions and migrations. The schema is normalized, including comprehensive health metrics, activities, AI conversations, and user settings, with UUID primary keys.

### Core Features and Design Decisions

- **AI Coaching System**: Features time-of-day recommendations and recovery-based exercise suggestions, adapting to daily rhythms and recovery states. It includes cost-optimized AI coaching with smart caching and authentic data use, displaying import prompts when no real data is available. Activity estimation uses GPT-3.5-turbo with mathematical fallbacks.
- **Metabolic Age Visual**: Sophisticated space-themed visual with constellation backgrounds and dynamic text effects.
- **Navigation Structure**: Hierarchical navigation with 6 main tabs (Dashboard, Sleep, Strain, Vitals, Metabolic, Coach) and detailed sub-screens, with universal date navigation controls (TabHeader component) consistently placed in the top-right corner of every tab.
- **Health Metrics Implementation**: Comprehensive tracking of BMI, blood pressure, sleep efficiency, wake events, fitness age, body composition, and activity tracking (steps, distance, calories). All metrics use authentic data from the backend.
- **Heart Rate Zones**: Age-based heart rate zone calculations (220 - age formula) with 5 zones, using activity data fallback and RHR-based estimation.
- **Sleep Debt & Training Load Management**: Comprehensive sleep debt analysis with color-coded severity and recovery planning, alongside a training load management system using Acute:Chronic Load Ratio. System dynamically calculates strain scores (0-21 scale) from authentic step and calorie data, with week-over-week progression tracking and timezone-aware date parsing.
- **Unified Strain Calculation**: Consistent strain methodology across all features using "Strain = 100 - Recovery Score" formula. Activity logging system automatically calculates strain from steps/calories data using inverted activity scoring.
- **Data Integrity**: Strict policy of "zero fake data" ensuring all displayed metrics and AI recommendations are based on authentic user data, with robust handling for missing data. Walking activities are automatically generated from authentic step count data with heart rate estimates. Smart data freshness system prevents overwrites of newer data with older imports.
- **Health Connect Sync Optimization**: Incremental syncing with upsert functionality to prevent data duplication and ensure efficient updates.
- **Advanced Data Freshness System**: Field-level timestamp tracking with UTC normalization, ensuring precise data comparison. Meaningful value validation prevents null/zero/empty values from receiving timestamps. Manual entries override automatic imports. Each field maintains independent freshness metadata with source tracking.
- **Comprehensive Timezone Handling**: Fixed UTC to local time (EST/EDT) conversion for all Health Connect data imports to prevent incorrect date aggregation.
- **Granular Time-Blocked Data Storage**: Implemented comprehensive storage of all individual time-blocked entries for sleep stages, steps, and heart rate data, properly converted to EST timezone.
- **Health Connect Sleep Overlap Correction**: Automatic overlap detection and removal for Health Connect sleep stage data, keeping the longer period to eliminate double-counting.
- **Complete Sleep Data Recovery**: Recovered missing sleep data using Health Connect database with full sleep stage breakdowns.
- **Data Lock Protection System**: Complete data lock feature to protect historical health data from accidental overwrites during imports. Users can set a lock date through Settings UI.
- **Enhanced Trend Visualization**: Comprehensive trend charts across all health metric displays using authentic historical data.
- **Mi Fitness Data Extraction**: Comprehensive screen scraper and API integration for extracting data from Mi Fitness app, including GDPR export method and automated data import.
- **Google Fit Sync Stability**: Fixed all Google Fit sync stability issues including timestamp errors and storage parameter mismatches, enhancing timestamp validation and resolving field-level data freshness logic flaws.
- **Intelligent Data Prioritization System**: Implemented comprehensive data source hierarchy with Manual entries (Priority 1) > RENPHO/Health Connect (Priority 2) > Google Fit gap-filler (Priority 3) > Mi Fitness (Priority 4). Manual entries are protected.
- **Stress Score Display Fix**: Resolved stress score display issues where frontend calculations were overriding API values and fixed stress level categorization text.
- **Enhanced RENPHO File Processing**: Updated Google Drive sync to specifically search for files containing "RENPHO" and process the most recent CSV.
- **Complete Active Calories & BMR Fallback System with Manual Priority**: Implemented comprehensive active calories calculation with manual input priority. Dashboard calories display: (1) Manual calories + BMR when manual input exists, or (2) BMR + calculated active calories from device data/steps as fallback.
- **Comprehensive Timezone Handling Standardization**: Implemented unified timezone utility functions (`timezoneUtils.ts`) to ensure all importers use consistent EST timezone for import logic, fixing conversion issues.
- **Premium Features**: Includes enhanced Sleep Debt Tracker, Heart Rate Zones Training, AI Recovery Prediction, Advanced Trend Analysis, and enhanced Coaching Chat.
- **Replit Auth Integration**: Complete authentication system with OpenID Connect, secure session management, protected routes, and email whitelist security. Users can sign in using Google, GitHub, Apple, Email, or X (Twitter). Includes professional landing page for unauthenticated users and persistent login sessions.
- **Database Constraint Optimization**: Fixed overly restrictive unique constraint on `health_data_points` table to allow multiple readings with same values at granular time intervals while preventing true duplicates.
- **Production Session Storage Fix**: Application now exclusively uses PostgreSQL session storage (`connect-pg-simple`) for production deployment with secure cookies and proper TTL settings.
- **Smart Directional Database Synchronization System**: Comprehensive automated database sync with intelligent directional flow: DEV→PROD allows corrections, while PROD→DEV only allows gap filling. Combines deployment-time sync + regular background sync (hourly quick sync, 6-hour full sync). Includes manual sync trigger endpoint.
- **Comprehensive Import Logging System**: Advanced logging infrastructure providing detailed visibility into all data imports, tracking imported vs skipped data with reasons, storing detailed import sessions in the database, and providing API endpoints for log viewing and summary reports.
- **Critical Data Source Fraud Detection & Correction**: Fixed data source mislabeling, restored authentic Mi Fitness step counts, and improved error handling in data freshness service to prevent overwrites.
- **Google Fit Priority System Fix**: Elevated Google Fit to SUPER_PRIMARY priority (1.5) for steps and sleep data, ensuring it properly overrides Health Connect data.
- **Google Fit Sleep Stage Display Bug Fix**: Resolved critical bug where Google Fit sleep stages showed impossible durations, fixing nanosecond timestamp calculation and implementing granular sleep stage storage.
- **Export-Time-Based Import Filtering**: Implemented sophisticated solution to prevent Health Connect partial day overwrites by extracting ZIP file creation timestamp and only importing data from the day prior and earlier, skipping current-day data to preserve complete daily data from higher-priority sources.
- **Health Connect Partial Day Corruption Fix**: Enhanced data integrity protection to prevent future partial day overwrites by Health Connect exports while maintaining authentic complete daily data.

## External Dependencies

- **Database**: PostgreSQL (with Neon Database serverless adapter)
- **ORM**: Drizzle ORM
- **AI Services**: OpenAI API
- **UI Components**: shadcn/ui (built on Radix UI primitives)
- **Styling**: Tailwind CSS, PostCSS
- **Development Tools**: Vite, TypeScript, ESBuild
- **Session Management**: Connect-pg-simple (for PostgreSQL session storage with Express sessions)
- **Validation**: Zod
- **Date Handling**: date-fns
- **Icons**: Lucide React