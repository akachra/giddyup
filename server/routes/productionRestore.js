// Emergency production data restoration endpoint
const express = require('express');
const { Pool } = require('@neondatabase/serverless');

const router = express.Router();

// Direct production database connection
const productionPool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

router.post('/emergency-restore-steps', async (req, res) => {
  try {
    console.log('🚨 EMERGENCY: Restoring production step data...');
    
    // Check current state
    const beforeQuery = `
      SELECT date, steps, field_metadata->>'steps' as metadata
      FROM health_metrics 
      WHERE user_id = 'default-user' 
        AND date IN ('2025-08-14', '2025-08-15')
      ORDER BY date
    `;
    
    const beforeResult = await productionPool.query(beforeQuery);
    console.log('Before restoration:', beforeResult.rows);
    
    // Restore Aug 14
    await productionPool.query(`
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
        AND date = '2025-08-14'
    `);
    
    // Restore Aug 15
    await productionPool.query(`
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
        AND date = '2025-08-15'
    `);
    
    // Verify restoration
    const afterResult = await productionPool.query(beforeQuery);
    console.log('After restoration:', afterResult.rows);
    
    res.json({
      success: true,
      message: 'Production step data restored successfully',
      before: beforeResult.rows,
      after: afterResult.rows
    });
    
  } catch (error) {
    console.error('Emergency restoration failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;