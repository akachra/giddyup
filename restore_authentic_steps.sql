-- Restore authentic step data corrupted by Google Fit overwrites
-- This script restores Health Connect/RENPHO step data for Aug 14-15, 2025

-- Aug 14, 2025: Restore authentic steps (7,768 from Health Connect/RENPHO)
UPDATE health_metrics 
SET 
  steps = 7768,
  field_metadata = jsonb_set(
    COALESCE(field_metadata, '{}'),
    '{steps}',
    '{"recordedAt": "2025-08-14T23:59:59Z", "source": "health_connect", "deviceId": "primary"}'
  ),
  updated_at = NOW()
WHERE user_id = 'default-user' 
  AND date = '2025-08-14'
  AND steps != 7768;

-- Aug 15, 2025: Restore authentic steps (10,183 from Health Connect/RENPHO)  
UPDATE health_metrics 
SET 
  steps = 10183,
  field_metadata = jsonb_set(
    COALESCE(field_metadata, '{}'),
    '{steps}',
    '{"recordedAt": "2025-08-15T23:59:59Z", "source": "health_connect", "deviceId": "primary"}'
  ),
  updated_at = NOW()
WHERE user_id = 'default-user' 
  AND date = '2025-08-15'  
  AND steps != 10183;

-- Verify the restoration
SELECT 
  date,
  steps,
  field_metadata->>'steps' as steps_metadata,
  updated_at
FROM health_metrics 
WHERE user_id = 'default-user' 
  AND date IN ('2025-08-14', '2025-08-15')
ORDER BY date;