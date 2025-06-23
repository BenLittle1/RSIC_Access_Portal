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
    
    // 🔒 SECURE TOKEN MASKING - Never log full tokens!
    const maskToken = (token) => {
      if (!token) return 'NOT_PROVIDED';
      return token.substring(0, 8) + '...' + token.substring(token.length - 4) + ' (***MASKED***)';
    };

    console.log('\n✅ Authorization successful!');
    console.log('🔒 Security: Tokens generated and masked for safety');
    console.log('=====================================');
    console.log(`🔑 Refresh Token: ${maskToken(tokens.refresh_token)}`);
    console.log(`🔑 Access Token:  ${maskToken(tokens.access_token)}`);
    console.log('=====================================');
    
    // Write tokens to temporary secure file instead of terminal
    const fs = require('fs');
    const path = require('path');
    const tokenFile = path.join(__dirname, '.oauth_tokens_temp.txt');
    
    const tokenContent = `# OAuth Tokens - DELETE THIS FILE AFTER COPYING TO .env
# Generated: ${new Date().toISOString()}
GMAIL_REFRESH_TOKEN=${tokens.refresh_token}
GMAIL_ACCESS_TOKEN=${tokens.access_token}

# SECURITY WARNING: Delete this file immediately after copying to .env!
# Do not commit this file to version control!
`;

    fs.writeFileSync(tokenFile, tokenContent, { mode: 0o600 }); // Read-only for owner
    
    console.log('\n🔐 SECURE TOKEN STORAGE:');
    console.log(`📁 Tokens written to: ${tokenFile}`);
    console.log('📝 Steps:');
    console.log('1. Copy tokens from the file to your .env');
    console.log('2. DELETE the temporary file immediately');
    console.log('3. Run: node gmail-integration.js');
    console.log('\n⚠️  SECURITY: Temporary file will auto-delete in 5 minutes for safety');
    
    // Auto-delete the file after 5 minutes for security
    setTimeout(() => {
      try {
        if (fs.existsSync(tokenFile)) {
          fs.unlinkSync(tokenFile);
          console.log('🔒 Security: Temporary token file auto-deleted');
        }
      } catch (error) {
        console.error('Warning: Could not auto-delete token file:', error.message);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
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