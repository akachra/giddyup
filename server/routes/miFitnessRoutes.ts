import { Router } from 'express';
import { miFitnessExtractor } from '../miFitnessExtractor';
import { storage } from '../storage';
import { ComprehensiveFieldMapper } from '../comprehensiveFieldMapper';

const router = Router();

// Route 1: Request GDPR export
router.post('/mi-fitness/gdpr-export', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await miFitnessExtractor.requestGDPRExport(email);
    res.json(result);
  } catch (error) {
    console.error('GDPR export request error:', error);
    res.status(500).json({ error: 'Failed to request GDPR export' });
  }
});

// Route 2: Authenticate with Mi Fitness credentials
router.post('/mi-fitness/authenticate', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await miFitnessExtractor.authenticateWithCredentials(email, password);
    
    if (result.success) {
      // Store the token securely for future requests
      res.json({
        success: true,
        message: result.message,
        hasToken: !!result.token
      });
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Mi Fitness authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Route 3: Extract and import Mi Fitness data
router.post('/mi-fitness/extract-data', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required (YYYY-MM-DD format)' 
      });
    }

    // Extract data from Mi Fitness API
    const extractedData = await miFitnessExtractor.extractHealthData(startDate, endDate);
    
    // Process and import the data into our system
    const importResults = await processMiFitnessData(extractedData);
    
    res.json({
      success: true,
      message: 'Mi Fitness data extracted and imported successfully',
      summary: importResults,
      dataTypes: Object.keys(extractedData),
      dateRange: extractedData.dateRange
    });
  } catch (error) {
    console.error('Mi Fitness data extraction error:', error);
    res.status(500).json({ 
      error: 'Data extraction failed', 
      details: error.message 
    });
  }
});

// Route 4: Get manual extraction instructions
router.get('/mi-fitness/manual-instructions', async (req, res) => {
  try {
    const instructions = miFitnessExtractor.getManualTokenExtractionInstructions();
    res.json({
      instructions,
      gdprAlternatives: [
        'https://account.xiaomi.com/',
        'https://mifit.huami.com/t/account_mifit',
        'https://api-mifit.huami.com/t/account_mifit'
      ],
      tips: [
        'GDPR export is the safest and most comprehensive method',
        'API extraction provides real-time data but requires credentials',
        'Manual token extraction gives full API access but requires technical skills',
        'Consider using Gadgetbridge as an open-source alternative'
      ]
    });
  } catch (error) {
    console.error('Instructions request error:', error);
    res.status(500).json({ error: 'Failed to get instructions' });
  }
});

// Route 5: Upload and parse GDPR export file
router.post('/mi-fitness/upload-gdpr', async (req, res) => {
  try {
    // This would handle file upload for GDPR export ZIP
    // Implementation depends on multer or similar file upload middleware
    
    res.json({
      message: 'GDPR file upload endpoint - implementation pending',
      note: 'This will parse the ZIP file from GDPR export and import all data'
    });
  } catch (error) {
    console.error('GDPR file upload error:', error);
    res.status(500).json({ error: 'Failed to process GDPR export file' });
  }
});

// Route 6: Check Mi Fitness extraction status
router.get('/mi-fitness/status', async (req, res) => {
  try {
    // Check if we have any Mi Fitness data imported
    const recentData = await storage.getHealthMetrics('default-user');
    const miFitnessData = recentData.filter(metric => 
      (metric as any).source === 'mi_fitness_api' ||
      (metric as any).importMethod === 'mi_fitness'
    );

    res.json({
      hasMiFitnessData: miFitnessData.length > 0,
      lastImport: miFitnessData.length > 0 ? miFitnessData[0].date : null,
      totalRecords: miFitnessData.length,
      availableMethods: [
        'GDPR Export (Recommended)',
        'API Authentication',
        'Manual Token Extraction',
        'File Upload'
      ]
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Helper function to process and import Mi Fitness data
async function processMiFitnessData(extractedData: any): Promise<any> {
  const results = {
    healthMetrics: 0,
    activities: 0,
    errors: []
  };

  try {
    // Process activity data and create health metrics
    for (const activity of extractedData.activity || []) {
      try {
        // Map Mi Fitness activity data to our health metrics format
        const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
          date: activity.date,
          steps: activity.steps,
          distance: activity.distance,
          caloriesBurned: activity.calories,
          restingHeartRate: activity.heartRateAvg,
          source: 'mi_fitness_api',
          importMethod: 'mi_fitness_extraction'
        });

        await storage.upsertHealthMetrics('default-user', healthMetric);
        results.healthMetrics++;
      } catch (error) {
        results.errors.push(`Activity import error: ${error.message}`);
      }
    }

    // Process sleep data
    for (const sleep of extractedData.sleep || []) {
      try {
        const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
          date: sleep.date,
          sleepDuration: sleep.totalSleep,
          sleepScore: sleep.sleepScore,
          deepSleepDuration: sleep.deepSleep,
          lightSleepDuration: sleep.lightSleep,
          remSleepDuration: sleep.remSleep,
          sleepEfficiency: sleep.efficiency,
          source: 'mi_fitness_api',
          importMethod: 'mi_fitness_extraction'
        });

        await storage.upsertHealthMetrics('default-user', healthMetric);
        results.healthMetrics++;
      } catch (error) {
        results.errors.push(`Sleep import error: ${error.message}`);
      }
    }

    // Process body composition data
    for (const body of extractedData.body || []) {
      try {
        const healthMetric = ComprehensiveFieldMapper.mapToHealthMetrics({
          date: body.date,
          weight: body.weight,
          bmi: body.bmi,
          bodyFatPercentage: body.bodyFat,
          muscleMass: body.muscleMass,
          visceralFat: body.visceralFat,
          basalMetabolicRate: body.basalMetabolism,
          source: 'mi_fitness_api',
          importMethod: 'mi_fitness_extraction'
        });

        await storage.upsertHealthMetrics('default-user', healthMetric);
        results.healthMetrics++;
      } catch (error) {
        results.errors.push(`Body data import error: ${error.message}`);
      }
    }

    // Process workout data as activities
    for (const workout of extractedData.workouts || []) {
      try {
        // Create activity record for workout
        const activity = {
          id: `mi-fitness-${workout.id}`,
          userId: 'default-user',
          date: workout.date,
          type: workout.type,
          duration: workout.duration,
          distance: workout.distance,
          caloriesBurned: workout.calories,
          averageHeartRate: workout.avgHeartRate,
          maxHeartRate: workout.maxHeartRate,
          source: 'mi_fitness_api'
        };

        await storage.createActivity(activity);
        results.activities++;
      } catch (error) {
        results.errors.push(`Workout import error: ${error.message}`);
      }
    }

    return results;
  } catch (error) {
    results.errors.push(`Processing error: ${error.message}`);
    return results;
  }
}

export default router;