const { google } = require('googleapis');
require('dotenv').config();

async function testOAuth() {
  try {
    console.log('Testing OAuth configuration...');
    console.log('Client ID:', process.env.GMAIL_CLIENT_ID);
    console.log('Client Secret:', process.env.GMAIL_CLIENT_SECRET ? 'Set' : 'Not set');
    console.log('Redirect URI:', process.env.GMAIL_REDIRECT_URI);
    
    const auth = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'http://localhost:3001/oauth/callback'  // Use the original redirect URI
    );

    // Test with the code you provided
    const authCode = '4/0AVMBsJiBlor2I719-Z92q_WkX8Ba1Yh6ol-bzr5rzvJNl1emGfbl1yVGhUvG1LEMcTJQZA';
    
    console.log('\nAttempting token exchange...');
    const { tokens } = await auth.getToken(authCode);
    
    console.log('✅ Success! Tokens received:');
    console.log('Refresh token:', tokens.refresh_token ? 'Received' : 'Not received');
    console.log('Access token:', tokens.access_token ? 'Received' : 'Not received');
    
    console.log('\nAdd these to your .env file:');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GMAIL_ACCESS_TOKEN=${tokens.access_token}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    
    if (error.message.includes('invalid_client')) {
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Verify your Google Cloud Console setup');
      console.log('2. Check that the OAuth consent screen is configured');
      console.log('3. Ensure the redirect URI matches exactly: http://localhost:3001/oauth/callback');
      console.log('4. If testing mode, add benjamin.little@axl.vc as a test user');
      console.log('5. The authorization code might have expired - try getting a new one');
    }
  }
}

testOAuth(); 