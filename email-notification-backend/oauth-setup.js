const { google } = require('googleapis');
require('dotenv').config();

async function setupOAuth() {
  try {
    console.log('Setting up Gmail OAuth...');
    
    // Check if we have the required environment variables
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
      console.error('Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in .env file');
      console.log('Please add these to your .env file:');
      console.log('GMAIL_CLIENT_ID=your_gmail_client_id_here');
      console.log('GMAIL_CLIENT_SECRET=your_gmail_client_secret_here');
      return;
    }

    // Create OAuth2 client
    const auth = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/oauth/callback'
    );

    // Check if we already have tokens
    if (process.env.GMAIL_REFRESH_TOKEN) {
      console.log('✅ OAuth tokens already configured');
      console.log('You can now run: node gmail-integration.js');
      return;
    }

    // Generate authorization URL
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    const authUrl = auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    console.log('\n🔐 Gmail Authorization Required');
    console.log('=================================');
    console.log('1. Visit this URL in your browser:');
    console.log('\n' + authUrl + '\n');
    console.log('2. Sign in with your Gmail account: benjamin.little@axl.vc');
    console.log('3. Grant the permissions');
    console.log('4. Copy the authorization code from the URL');
    console.log('5. Run: node oauth-setup.js --code YOUR_CODE');
    console.log('\nNote: The redirect page might show an error, but check the URL for the code parameter.');

  } catch (error) {
    console.error('Setup error:', error);
  }
}

async function exchangeCode(authCode) {
  try {
    console.log('Exchanging authorization code for tokens...');
    
    const auth = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/oauth/callback'
    );

    const { tokens } = await auth.getToken(authCode);
    
    console.log('\n✅ Authorization successful!');
    console.log('Add these lines to your .env file:');
    console.log('=====================================');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GMAIL_ACCESS_TOKEN=${tokens.access_token}`);
    console.log('=====================================');
    console.log('\nAfter updating .env, you can run: node gmail-integration.js');
    
  } catch (error) {
    console.error('Token exchange error:', error.message);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const codeIndex = args.indexOf('--code');

if (codeIndex !== -1 && args[codeIndex + 1]) {
  const authCode = args[codeIndex + 1];
  exchangeCode(authCode);
} else {
  setupOAuth();
} 