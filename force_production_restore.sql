-- CRITICAL: Force production database restoration
-- This directly updates production to restore authentic step data

-- Check current production state
SELECT 'BEFORE RESTORE' as status, date, steps, field_metadata->>'steps' as metadata
FROM health_metrics 
WHERE user_id = 'default-user' 
  AND date IN ('2025-08-14', '2025-08-15')
ORDER BY date;

-- Force restore Aug 14, 2025: 7,768 steps (authentic Health Connect/RENPHO)
UPDATE health_metrics 
SET 
  steps = 7768,
  field_metadata = jsonb_set(
    COALESCE(field_metadata, '{}'),
    '{steps}',
    '{"recordedAt": "2025-08-14T23:59:59Z", "source": "health_connect", "deviceId": "primary", "restored": true}'
  ),
  updated_at = NOW()
WHERE user_id = 'default-user' 
  AND date = '2025-08-14';

-- Force restore Aug 15, 2025: 10,183 steps (authentic Health Connect/RENPHO)  
UPDATE health_metrics 
SET 
  steps = 10183,
  field_metadata = jsonb_set(
    COALESCE(field_metadata, '{}'),
    '{steps}',
    '{"recordedAt": "2025-08-15T23:59:59Z", "source": "health_connect", "deviceId": "primary", "restored": true}'
  ),
  updated_at = NOW()
WHERE user_id = 'default-user' 
  AND date = '2025-08-15';

-- Verify restoration
SELECT 'AFTER RESTORE' as status, date, steps, field_metadata->>'steps' as metadata
FROM health_metrics 
WHERE user_id = 'default-user' 
  AND date IN ('2025-08-14', '2025-08-15')
ORDER BY date;