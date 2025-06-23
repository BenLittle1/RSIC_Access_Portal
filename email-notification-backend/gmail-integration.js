const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

class GmailEmailProcessor {
  constructor() {
    this.gmail = null;
    this.auth = null;
    this.processedMessageIds = new Set();
    this.apiEndpoint = process.env.API_ENDPOINT || 'http://localhost:3001/api/process-email';
  }

  async initialize() {
    try {
      // OAuth2 client setup
      this.auth = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/oauth/callback'
      );

      // Set credentials if available
      if (process.env.GMAIL_REFRESH_TOKEN) {
        this.auth.setCredentials({
          refresh_token: process.env.GMAIL_REFRESH_TOKEN,
          access_token: process.env.GMAIL_ACCESS_TOKEN
        });
      }

      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      console.log('Gmail integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gmail integration:', error);
      throw error;
    }
  }

  async getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  async setAuthCode(code) {
    try {
      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);
      
      // 🔒 SECURE TOKEN MASKING - Never log full tokens!
      const maskToken = (token) => {
        if (!token) return 'NOT_PROVIDED';
        return token.substring(0, 8) + '...' + token.substring(token.length - 4) + ' (***MASKED***)';
      };
      
      console.log('✅ Gmail authentication successful');
      console.log('🔒 Security: Tokens safely stored (masked for security)');
      console.log(`🔑 Refresh Token: ${maskToken(tokens.refresh_token)}`);
      console.log(`🔑 Access Token:  ${maskToken(tokens.access_token)}`);
      console.log('\n📝 Note: Full tokens are securely stored in memory only');
      
      return tokens;
    } catch (error) {
      console.error('Failed to set auth code:', error);
      throw error;
    }
  }

  async checkForNewEmails() {
    try {
      // Search for unread emails with guest-related keywords
      const query = 'is:unread (guest OR visitor OR visit OR meeting OR appointment OR access)';
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10
      });

      const messages = response.data.messages || [];
      console.log(`Found ${messages.length} potential guest emails`);

      for (const message of messages) {
        await this.processMessage(message.id);
      }
    } catch (error) {
      console.error('Error checking for emails:', error);
    }
  }

  async processMessage(messageId) {
    try {
      if (this.processedMessageIds.has(messageId)) {
        return; // Already processed
      }

      const message = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const headers = message.data.payload.headers;
      const fromHeader = headers.find(h => h.name === 'From');
      const subjectHeader = headers.find(h => h.name === 'Subject');
      
      const from = fromHeader ? fromHeader.value : '';
      const subject = subjectHeader ? subjectHeader.value : '';

      // Extract email body
      const emailContent = this.extractEmailContent(message.data.payload);
      
      if (!emailContent) {
        console.log('Could not extract email content for message:', messageId);
        return;
      }

      console.log(`Processing email from: ${from}, subject: ${subject}`);

      // Send to email processing API
      const processResult = await this.sendToProcessor({
        from: from,
        subject: subject,
        text: emailContent.text,
        html: emailContent.html || emailContent.text
      });

      if (processResult.success) {
        // Mark as processed
        this.processedMessageIds.add(messageId);
        
        // Mark as read in Gmail
        await this.gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            removeLabelIds: ['UNREAD']
          }
        });

        console.log(`Successfully processed email ${messageId}`);
      }

    } catch (error) {
      console.error(`Error processing message ${messageId}:`, error);
    }
  }

  extractEmailContent(payload) {
    let text = '';
    let html = '';

    const extractFromPart = (part) => {
      if (part.mimeType === 'text/plain' && part.body.data) {
        text = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body.data) {
        html = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        part.parts.forEach(extractFromPart);
      }
    };

    if (payload.body && payload.body.data) {
      // Simple message
      if (payload.mimeType === 'text/plain') {
        text = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } else if (payload.mimeType === 'text/html') {
        html = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }
    } else if (payload.parts) {
      // Multipart message
      payload.parts.forEach(extractFromPart);
    }

    return { text: text || html, html };
  }

  async sendToProcessor(emailData) {
    try {
      const response = await axios.post(this.apiEndpoint, emailData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error sending to processor:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async startMonitoring(intervalMinutes = 5) {
    console.log(`Starting Gmail monitoring (checking every ${intervalMinutes} minutes)`);
    
    // Initial check
    await this.checkForNewEmails();
    
    // Set up interval checking
    setInterval(async () => {
      await this.checkForNewEmails();
    }, intervalMinutes * 60 * 1000);
  }
}

// Export for use as module
module.exports = GmailEmailProcessor;

// If run directly, start the monitoring service
if (require.main === module) {
  const processor = new GmailEmailProcessor();
  
  processor.initialize().then(async () => {
    if (!process.env.GMAIL_REFRESH_TOKEN) {
      console.log('Gmail authentication required.');
      console.log('Please visit this URL to authorize the application:');
      console.log(await processor.getAuthUrl());
      console.log('\nAfter authorization, you\'ll get a code. Run:');
      console.log('node gmail-integration.js --auth-code YOUR_CODE');
      return;
    }

    if (process.argv.includes('--auth-code')) {
      const codeIndex = process.argv.indexOf('--auth-code') + 1;
      const authCode = process.argv[codeIndex];
      
      if (authCode) {
        await processor.setAuthCode(authCode);
        return;
      }
    }

    // Start monitoring
    await processor.startMonitoring(0.5); // Check every 30 seconds
  }).catch(console.error);
} 