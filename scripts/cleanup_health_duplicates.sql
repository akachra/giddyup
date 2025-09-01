-- Health Data Points Duplicate Cleanup Script
-- This script removes duplicate health data points based on recording timestamps (not import timestamps)
-- Preserves the most recent import when multiple identical time blocks exist

-- First, let's analyze the duplicates to understand the scope
SELECT 'DUPLICATE ANALYSIS - Before Cleanup' as analysis_phase;

SELECT 
    data_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT CONCAT(user_id, '|', data_type, '|', start_time, '|', COALESCE(end_time::text, 'null'))) as unique_time_blocks,
    COUNT(*) - COUNT(DISTINCT CONCAT(user_id, '|', data_type, '|', start_time, '|', COALESCE(end_time::text, 'null'))) as duplicate_records
FROM health_data_points 
GROUP BY data_type
ORDER BY duplicate_records DESC;

-- Create a temporary table to identify records to keep (most recent import for each unique time block)
CREATE TEMP TABLE records_to_keep AS
SELECT DISTINCT ON (user_id, data_type, start_time, COALESCE(end_time, start_time)) 
    id,
    user_id,
    data_type,
    start_time,
    end_time,
    created_at
FROM health_data_points
ORDER BY user_id, data_type, start_time, COALESCE(end_time, start_time), created_at DESC;

-- Show what we're about to clean up
SELECT 'CLEANUP PREVIEW - Records that will be DELETED' as cleanup_phase;

SELECT 
    hdp.data_type,
    COUNT(*) as records_to_delete,
    MIN(hdp.start_time) as earliest_time_block,
    MAX(hdp.start_time) as latest_time_block
FROM health_data_points hdp
LEFT JOIN records_to_keep rtk ON hdp.id = rtk.id
WHERE rtk.id IS NULL
GROUP BY hdp.data_type
ORDER BY records_to_delete DESC;

-- Show detailed examples of what's being removed (first 10 for each data type)
SELECT 'DETAILED CLEANUP PREVIEW - Sample records to be deleted' as details_phase;

WITH duplicates_to_delete AS (
    SELECT hdp.*, 
           ROW_NUMBER() OVER (PARTITION BY hdp.data_type ORDER BY hdp.start_time) as rn
    FROM health_data_points hdp
    LEFT JOIN records_to_keep rtk ON hdp.id = rtk.id
    WHERE rtk.id IS NULL
)
SELECT 
    data_type,
    start_time,
    end_time,
    created_at,
    source_app,
    substring(metadata, 1, 100) || '...' as metadata_preview
FROM duplicates_to_delete 
WHERE rn <= 3  -- Show first 3 examples per data type
ORDER BY data_type, start_time;

-- ⚠️  CRITICAL SAFETY CHECK ⚠️
-- Verify we're not deleting ALL records for any time period
SELECT 'SAFETY CHECK - Ensuring no complete data loss' as safety_phase;

WITH safety_check AS (
    SELECT 
        user_id,
        data_type,
        start_time::date as record_date,
        COUNT(*) as total_records,
        COUNT(CASE WHEN rtk.id IS NOT NULL THEN 1 END) as records_to_keep,
        COUNT(CASE WHEN rtk.id IS NULL THEN 1 END) as records_to_delete
    FROM health_data_points hdp
    LEFT JOIN records_to_keep rtk ON hdp.id = rtk.id
    GROUP BY user_id, data_type, start_time::date
    HAVING COUNT(CASE WHEN rtk.id IS NOT NULL THEN 1 END) = 0  -- No records being kept
)
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SAFE: No complete data loss detected'
        ELSE '⚠️  WARNING: ' || COUNT(*) || ' date/data-type combinations would lose ALL data'
    END as safety_status
FROM safety_check;

-- If safety check passes, show the final cleanup summary
SELECT 'FINAL CLEANUP SUMMARY' as summary_phase;

SELECT 
    (SELECT COUNT(*) FROM health_data_points) as total_current_records,
    (SELECT COUNT(*) FROM records_to_keep) as records_after_cleanup,
    (SELECT COUNT(*) FROM health_data_points) - (SELECT COUNT(*) FROM records_to_keep) as records_to_be_deleted,
    ROUND(
        ((SELECT COUNT(*) FROM records_to_keep)::float / (SELECT COUNT(*) FROM health_data_points)::float) * 100, 
        1
    ) as data_retention_percentage;

-- 🛑 EXECUTE CLEANUP ONLY AFTER MANUAL REVIEW 🛑
-- Uncomment the following lines ONLY after verifying the above analysis looks correct:

/*
-- ACTUAL CLEANUP - Remove duplicate records
DELETE FROM health_data_points 
WHERE id NOT IN (SELECT id FROM records_to_keep);

-- Verify cleanup results
SELECT 'POST-CLEANUP VERIFICATION' as verification_phase;

SELECT 
    data_type,
    COUNT(*) as remaining_records,
    COUNT(DISTINCT CONCAT(user_id, '|', data_type, '|', start_time, '|', COALESCE(end_time::text, 'null'))) as unique_time_blocks,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT CONCAT(user_id, '|', data_type, '|', start_time, '|', COALESCE(end_time::text, 'null'))) 
        THEN '✅ NO DUPLICATES' 
        ELSE '⚠️  STILL HAS DUPLICATES'
    END as duplicate_status
FROM health_data_points 
GROUP BY data_type
ORDER BY remaining_records DESC;

SELECT 'FINAL RECORD COUNT' as final_count;
SELECT COUNT(*) as total_health_data_points FROM health_data_points;
*/

-- Clean up temporary table
DROP TABLE IF EXISTS records_to_keep;