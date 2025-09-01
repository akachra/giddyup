# Google OAuth Setup for Google Fit Integration

## Issue
The current Google OAuth app shows "Access blocked: Giddyup Fit Sync has not completed the Google verification process" with Error 403: access_denied.

## Solution Options

### Option 1: Add Test Users (Recommended for Development)

**Step-by-Step Instructions:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in the correct project (should show your project name in the top bar)
3. Navigate to "APIs & Services" → "OAuth consent screen"
4. You should see your app configuration page

**If you see "Publishing status: Testing":**
- Scroll down to find "Test users" section
- Click "ADD USERS" button
- Add your email: `akachra1@gmail.com`
- Click "Save"

**If you don't see a "Test users" section:**
- Look for "User Type" at the top - it might be set to "Internal"
- If it says "External" and "Publishing status: In production", click "BACK TO TESTING"
- This will reveal the "Test users" section

**Alternative locations to check:**
- Look for "Test users" tab at the top of the OAuth consent screen
- Check if there's a "Configure" or "Edit app" button that leads to test user settings

**If still not found:**
- Your app might be in "Internal" mode (which is actually better - no test users needed)
- Or the interface might have changed - look for any section about "allowed users" or "authorized users"

### Option 2: Configure OAuth Consent Screen Properly

1. **OAuth consent screen configuration:**
   - App name: "GiddyUp Health Tracker" 
   - User support email: Your email
   - App logo: Optional
   - Application home page: Your Replit app URL
   - Application privacy policy: Create a simple privacy policy
   - Application terms of service: Create simple terms

2. **Scopes configuration:**
   - Add these specific scopes:
     - `https://www.googleapis.com/auth/fitness.activity.read`
     - `https://www.googleapis.com/auth/fitness.body.read`
     - `https://www.googleapis.com/auth/fitness.heart_rate.read`
     - `https://www.googleapis.com/auth/fitness.sleep.read`

3. **Authorized redirect URIs:**
   - **IMPORTANT**: You need to add the correct redirect URI in Google Cloud Console
   - For development: `http://localhost:5000/api/google-fit/auth/callback` 
   - For Replit: Check your current Replit app URL and add: `https://[your-repl-url]/api/google-fit/auth/callback`
   
   **To find your Replit URL:**
   - Look at your browser address bar when viewing your app
   - Or check the "Webview" tab in Replit - the URL shown there
   - Example: `https://12345678-1234-1234-1234-123456789012-00-1a2b3c4d5e6f.pike.replit.dev`

### Option 3: Use Internal App Type

If this is for personal use only:
1. Set OAuth consent screen to "Internal" 
2. This bypasses the verification requirement
3. Only works if you have a Google Workspace account

## Current Status
- OAuth client ID is configured: `918565887799-rip62s24kdnjnvr1nfskjgsbln7shqeh.apps.googleusercontent.com`
- Redirect URI is correctly set to: `http://localhost:5000/api/google-fit/auth/callback`
- App is in testing mode but needs test users added

## Next Steps

**First, check what type of OAuth app you have:**
1. In Google Cloud Console → APIs & Services → OAuth consent screen
2. Look at "User Type" - is it "Internal" or "External"?

**If Internal:** You're all set! The app should work without adding test users.

**If External:** Look for the "Test users" section and add your email.

**Can't find Test users section?** Try these:
- Click "BACK TO TESTING" if the app is in production mode
- Look for tabs like "Test users" or "Allowed users"  
- Check if there's an "Edit app" or "Configure" button
- The UI might have changed - look for any user management section

**Still blocked?** We can create a new OAuth app with proper settings.