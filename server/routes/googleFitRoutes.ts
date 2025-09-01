/**
 * Google Fit API Routes for real-time health data synchronization
 */
import { Router, Request, Response } from 'express';
console.log('🚨🚨🚨 LOADING GOOGLE FIT ROUTES MODULE 🚨🚨🚨');
import { GoogleFitService, googleFitService } from '../googleFitService';
import { storage } from '../storage';
import { dataFreshnessService } from '../dataFreshnessService';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { ImportLogger, ImportLogManager } from '../importLogger';
import { GoogleFitImporter } from '../googleFitImporter';

interface SessionRequest extends Request {
  session: any;
}

const router = Router();

/**
 * Get Google Fit authorization URL
 */
router.get('/auth-url', (req, res) => {
  try {
    const authUrl = googleFitService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Google Fit auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * Handle Google Fit OAuth callback (GET request from Google)
 */
router.get('/auth/callback', async (req: SessionRequest, res: Response) => {
  try {
    const { code, error } = req.query;
    
    console.log('OAuth callback received:', { code: !!code, error });
    
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect('/#/google-fit-sync?error=' + encodeURIComponent(error as string));
    }
    
    if (!code) {
      console.error('No authorization code received');
      return res.redirect('/#/google-fit-sync?error=no_code');
    }

    console.log('Getting tokens from code...');
    const tokens = await googleFitService.getTokensFromCode(code as string);
    console.log('Tokens received:', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token });
    
    // Store tokens securely in session
    if (!req.session) {
      console.error('Session not available');
      return res.redirect('/#/google-fit-sync?error=session_error');
    }
    
    // Store tokens in both session and database for persistence
    req.session.googleFitTokens = tokens;
    
    // Store in database for persistence across server restarts (direct SQL to bypass type issues)
    try {
      await db.execute(sql`UPDATE users SET google_fit_tokens = ${JSON.stringify(tokens)} WHERE id = 'default-user'`);
      console.log('Tokens stored in session and database via direct SQL');
    } catch (error) {
      console.warn('Database token storage failed:', error);
    }

    // Redirect back to the Google Fit sync page with success
    res.redirect('/#/google-fit-sync?success=true');
  } catch (error) {
    console.error('Error handling Google Fit auth callback:', error);
    res.redirect('/#/google-fit-sync?error=auth_failed');
  }
});

/**
 * Handle Google Fit OAuth callback (POST request for API calls)
 */
router.post('/auth/callback', async (req: SessionRequest, res: Response) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    const tokens = await googleFitService.getTokensFromCode(code);
    
    // Store tokens securely in both session and database
    if (req.session) {
      req.session.googleFitTokens = tokens;
    }
    
    // Store in database for persistence across server restarts (direct SQL to bypass type issues)
    try {
      await db.execute(sql`UPDATE users SET google_fit_tokens = ${JSON.stringify(tokens)} WHERE id = 'default-user'`);
      console.log('Tokens stored in database via direct SQL');
    } catch (error) {
      console.warn('Database token storage failed:', error);
    }

    res.json({ 
      success: true, 
      message: 'Google Fit successfully connected',
      hasRefreshToken: !!tokens.refresh_token
    });
  } catch (error) {
    console.error('Error handling Google Fit auth callback:', error);
    res.status(500).json({ error: 'Failed to authenticate with Google Fit' });
  }
});

/**
 * Import granular time-blocked data from Google Fit with directional protection
 */
router.post('/import-granular', async (req: SessionRequest, res: Response) => {
  try {
    // CRITICAL: Apply directional protection for granular imports too
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      console.log('🚫 PRODUCTION: Google Fit granular import blocked to protect primary data');
      return res.status(403).json({
        error: 'Google Fit import disabled in production',
        reason: 'Google Fit is a gap-filler only. Use development environment for data corrections.',
        recommendation: 'Use RENPHO, Health Connect, or manual entry for production data'
      });
    }
    
    console.log('✅ DEVELOPMENT: Google Fit granular import allowed for gap-filling only');
    
    const { accessToken, days = 30 } = req.body;
    
    // Use provided token or session token
    const sessionTokens = req.session?.googleFitTokens;
    const token = accessToken || sessionTokens?.access_token;
    
    if (!token) {
      return res.status(400).json({ message: "Access token is required" });
    }

    console.log('Starting Google Fit granular data import...');
    const { googleFitImporter } = await import('../googleFitImporter');
    
    const results = await googleFitImporter.importGoogleFitData(token, days);
    
    res.json({
      success: true,
      message: `Google Fit import completed: ${results.stepsImported} daily records, ${results.granularStepsImported} granular step points, ${results.heartRateImported} heart rate records, ${results.sleepImported} sleep records, ${results.bloodPressureImported} blood pressure records`,
      ...results
    });
    
  } catch (error) {
    console.error('Google Fit granular import error:', error);
    res.status(500).json({
      success: false,
      message: 'Google Fit import failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Sync health data from Google Fit (daily aggregates) with directional protection
 */
router.post('/sync', async (req: SessionRequest, res: Response) => {
  console.log('🚨🚨🚨 ROUTE ENTRY: /sync called 🚨🚨🚨');
  const logger = new ImportLogger('Google Fit');
  
  try {
    // CRITICAL: Apply directional protection
    // Google Fit is SECONDARY priority - can only fill gaps, never overwrite primary data
    // In production: Block Google sync completely to prevent corrupting good data
    // In development: Allow gap-filling only
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      console.log('🚫 PRODUCTION: Google Fit sync blocked to protect primary data sources');
      return res.status(403).json({
        error: 'Google Fit sync disabled in production',
        reason: 'Google Fit is a gap-filler only. Use development environment for data corrections.',
        recommendation: 'Use RENPHO, Health Connect, or manual entry for production data'
      });
    }
    
    console.log('✅ DEVELOPMENT: Google Fit sync allowed for gap-filling only');
    
    const { maxDays = 7, accessToken, refreshToken } = req.body;
    
    // Use provided tokens, session tokens, or database tokens
    const sessionTokens = req.session?.googleFitTokens;
    let tokens = (accessToken && refreshToken) ? 
      { access_token: accessToken, refresh_token: refreshToken } : 
      sessionTokens;
      
    // Fallback to database tokens if session tokens not available (direct SQL to avoid type issues)
    if (!tokens?.access_token) {
      try {
        const result = await db.execute(sql`SELECT google_fit_tokens FROM users WHERE id = 'default-user'`);
        const dbTokens = (result.rows[0] as any)?.google_fit_tokens;
        if (dbTokens) {
          tokens = typeof dbTokens === 'string' ? JSON.parse(dbTokens) : dbTokens;
          console.log('Sync request - using database tokens:', !!tokens?.access_token);
        }
      } catch (error) {
        console.warn('Failed to fetch database tokens:', error);
      }
    }
    
    console.log('Sync request - session exists:', !!req.session);
    console.log('Sync request - session tokens exist:', !!sessionTokens);
    console.log('Sync request - using tokens:', !!tokens?.access_token);
    
    // Save session immediately to prevent loss during long requests
    if (req.session && sessionTokens) {
      req.session.save((err: any) => {
        if (err) console.warn('Session save warning:', err);
      });
    }
    
    if (!tokens || !tokens.access_token) {
      return res.status(401).json({ 
        error: 'Google Fit not authenticated. Please connect your account first.',
        needsAuth: true
      });
    }

    // Initialize Google Fit service and refresh tokens if needed
    const googleFitService = new GoogleFitService();
    
    // Initialize dependencies for database operations
    googleFitService.initializeDependencies(storage, dataFreshnessService, 'default-user');
    
    // Refresh tokens if needed before import
    const validTokens = await googleFitService.ensureValidTokens(tokens);
    console.log('🔄 Token refresh completed, expiry:', new Date(validTokens.expiry_date || 0).toISOString());
    
    // Update database with refreshed tokens if they changed
    if (JSON.stringify(validTokens) !== JSON.stringify(tokens)) {
      console.log('🔄 Updating database with refreshed tokens...');
      await db.execute(sql`
        UPDATE users 
        SET google_fit_tokens = ${JSON.stringify(validTokens)} 
        WHERE id = 'default-user'
      `);
      
      // Update session tokens if they exist
      if (req.session && sessionTokens) {
        req.session.googleFitTokens = validTokens;
      }
    }

    // Set end date to end of today in EST to capture full current day data
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // End of today
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - maxDays);
    
    console.log(`🔍 DEBUG: Google Fit date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    console.log('🔍 DEBUG: Using COMPREHENSIVE Google Fit importer with refreshed tokens');
    
    // Use refreshed tokens for API calls  
    googleFitService.setAccessToken(validTokens.access_token, validTokens.refresh_token);
    
    // 🚨 FIXED: Use the REAL importer that actually stores data to database
    console.log('🔄 Using GoogleFitImporter to actually IMPORT data (not just fetch)');
    const googleFitImporter = new GoogleFitImporter();
    const importerResults = await googleFitImporter.importGoogleFitData(validTokens.access_token, maxDays, logger);
    console.log('🚨🚨🚨 ROUTE: REAL Import method completed 🚨🚨🚨');
    
    console.log('🔍 DEBUG: DIRECT SERVICE import completed:', importerResults);
    
    // Calculate total imported records from service results
    const importedRecords = importerResults.stepsImported + 
                           importerResults.heartRateImported + 
                           importerResults.sleepImported + 
                           importerResults.weightImported +
                           importerResults.oxygenSaturationImported +
                           importerResults.bloodPressureImported +
                           importerResults.bodyFatImported +
                           importerResults.caloriesImported +
                           importerResults.distanceImported +
                           importerResults.activeMinutesImported;
    
    // Get final summary for response - comprehensive importer handles all skip logic internally  
    const skippedRecords = 0;

    // Complete the import session and save to database
    await logger.saveToDB();

    res.json({
      success: true,
      message: `Google Fit sync complete: ${importedRecords} imported, ${skippedRecords} skipped`,
      recordsImported: importedRecords,
      recordsSkipped: skippedRecords,
      daysChecked: maxDays,
      syncMethod: 'google_fit_direct_service',
      dataTypes: importerResults,
      logSummary: logger.getSummary()
    });

  } catch (error: any) {
    // Log the failed import session
    await logger.saveToDB();
    console.error('Google Fit sync error in route:', error?.message);
    
    console.error('Error syncing Google Fit data:', error);
    
    if (error?.message?.includes('invalid_grant') || error?.message?.includes('unauthorized')) {
      res.status(401).json({ 
        error: 'Google Fit authentication expired. Please reconnect your account.',
        needsAuth: true
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to sync Google Fit data',
        details: error?.message
      });
    }
  }
});

/**
 * Check Google Fit connection status
 */
router.get('/status', async (req: SessionRequest, res: Response) => {
  try {
    let tokens = req.session?.googleFitTokens;
    
    // Fallback to database tokens if session tokens not available (direct SQL to avoid type issues)
    if (!tokens?.access_token) {
      try {
        const result = await db.execute(sql`SELECT google_fit_tokens FROM users WHERE id = 'default-user'`);
        const dbTokens = (result.rows[0] as any)?.google_fit_tokens;
        if (dbTokens) {
          tokens = typeof dbTokens === 'string' ? JSON.parse(dbTokens) : dbTokens;
          console.log('Status check - using database tokens:', !!tokens?.access_token);
        }
      } catch (error) {
        console.warn('Failed to fetch database tokens:', error);
      }
    }
    
    console.log('Status check - session exists:', !!req.session);
    console.log('Status check - tokens exist:', !!tokens);
    console.log('Status check - access token exists:', !!tokens?.access_token);
    
    res.json({
      connected: !!tokens?.access_token,
      hasRefreshToken: !!tokens?.refresh_token,
      lastSync: req.session?.lastGoogleFitSync || null
    });
  } catch (error: any) {
    console.error('Error getting Google Fit status:', error);
    res.status(500).json({ error: 'Failed to get connection status' });
  }
});

/**
 * Disconnect Google Fit
 */
router.post('/disconnect', async (req: SessionRequest, res: Response) => {
  try {
    // Clear session tokens
    if (req.session) {
      delete req.session.googleFitTokens;
      delete req.session.lastGoogleFitSync;
    }
    
    // Clear database tokens
    try {
      await db.execute(sql`UPDATE users SET google_fit_tokens = NULL WHERE id = 'default-user'`);
      console.log('Google Fit tokens cleared from database');
    } catch (error) {
      console.warn('Database token clearing failed:', error);
    }
    
    console.log('Google Fit successfully disconnected');
    res.json({
      success: true,
      message: 'Google Fit disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Google Fit:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Fit' });
  }
});

export default router;
