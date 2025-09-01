-- Production Database Sync Script
-- Syncs CORRECTED sleep overlap data and new manual heart rate entries from development to production
-- CRITICAL: This applies the simple overlap logic fixes (keep longer periods, remove shorter ones)
-- Created: August 16, 2025

-- Apply corrected sleep overlap logic to production
-- Aug 13: 358 minutes (5h 58m) - corrected from overlapping periods using simple logic
-- Aug 14: 352 minutes (5h 52m) - corrected from overlapping periods using simple logic

UPDATE health_metrics SET 
  sleep_duration_minutes = 358,
  source = 'health_connect',
  updated_at = now()
WHERE user_id = 'default-user' AND date = '2025-08-13';

UPDATE health_metrics SET 
  sleep_duration_minutes = 352,
  source = 'google_fit',
  updated_at = now()
WHERE user_id = 'default-user' AND date = '2025-08-14';

-- Sync ALL authentic step counts (production has significantly lower values)
UPDATE health_metrics SET 
  steps = 7516,  -- Production has 12 (99.8% missing)
  source = 'health_connect',
  updated_at = now()
WHERE user_id = 'default-user' AND date = '2025-08-13';

UPDATE health_metrics SET 
  steps = 7390,  -- Production missing this date
  source = 'google_fit',
  updated_at = now()
WHERE user_id = 'default-user' AND date = '2025-08-14';

UPDATE health_metrics SET 
  steps = 7305,  -- Production missing this date
  source = 'google_fit',
  updated_at = now()
WHERE user_id = 'default-user' AND date = '2025-08-15';

UPDATE health_metrics SET 
  steps = 10421,  -- Production has 7759 (2,662 steps missing)
  source = 'google_fit',
  updated_at = now()
WHERE user_id = 'default-user' AND date = '2025-08-12';

UPDATE health_metrics SET 
  steps = 8605,  -- Production has 6345 (2,260 steps missing)
  source = 'google_fit',
  updated_at = now()
WHERE user_id = 'default-user' AND date = '2025-08-11';

UPDATE health_metrics SET 
  steps = 10012,  -- Production has 6486 (3,526 steps missing)
  source = 'health_connect',
  updated_at = now()
WHERE user_id = 'default-user' AND date = '2025-08-10';

-- Sync recent weight data (production missing some recent weights)
UPDATE health_metrics SET 
  weight = 198.1,
  source = 'google_fit',
  updated_at = now()
WHERE user_id = 'default-user' AND date = '2025-08-14';

UPDATE health_metrics SET 
  weight = 200.3,
  source = 'health_connect',
  updated_at = now()
WHERE user_id = 'default-user' AND date = '2025-08-13';

UPDATE health_metrics SET 
  weight = 201.2,
  source = 'google_fit',
  updated_at = now()
WHERE user_id = 'default-user' AND date = '2025-08-12';

-- Add missing manual heart rate entries from development
INSERT INTO manual_heart_rate_data (id, user_id, date, resting_hr, min_hr, avg_hr_sleeping, max_hr, avg_hr_awake, hrv, calories, created_at, updated_at) VALUES
('4dae2ba2-3c3a-4d94-a096-64a94100a97e', 'default-user', '2025-08-16', 53, 49, 53, NULL, NULL, 26, NULL, '2025-08-16 14:40:43.538386', now()),
('684f77e0-a723-4717-b9b0-91ae0366f363', 'default-user', '2025-08-15', 53, 53, 58, 170, 64, 16, 817, '2025-08-16 03:07:19.228974', now()),
('ac7f3699-2c0e-4112-b261-9a7cb9e655d0', 'default-user', '2025-08-14', 56, 53, 60, 148, 74, 36, 1083, '2025-08-14 12:28:13.445936', now()),
('1fd48363-dc10-4894-aa20-10cded0757de', 'default-user', '2025-08-13', 56, 52, 59, 170, 77, 22, 1271, '2025-08-14 02:32:46.909494', now())
ON CONFLICT (id) DO UPDATE SET 
  resting_hr = EXCLUDED.resting_hr,
  hrv = EXCLUDED.hrv,
  calories = EXCLUDED.calories,
  updated_at = now();

