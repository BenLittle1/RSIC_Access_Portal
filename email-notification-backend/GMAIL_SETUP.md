# Gmail Integration Setup Guide

## Overview
This guide will help you set up Gmail integration with your email processing system using your existing Gmail account `benjamin.little@axl.vc`.

## Setup Steps

### 1. Google Cloud Console Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** (or use existing):
   - Project name: "SRIC Email Processing"
   - Note your project ID

3. **Enable Gmail API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

4. **Create OAuth2 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Configure OAuth consent screen if prompted:
     - User type: External
     - App name: "SRIC Email Processing"
     - User support email: `benjamin.little@axl.vc`
     - Developer contact: `benjamin.little@axl.vc`
   - Application type: "Web application"
   - Name: "SRIC Email Processor"
   - Authorized redirect URIs: `http://localhost:3001/oauth/callback`
   - Download the JSON file

### 2. Environment Configuration

Add these variables to your `.env` file:

```env
# Gmail API Configuration
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3001/oauth/callback
GMAIL_REFRESH_TOKEN=will_be_generated
GMAIL_ACCESS_TOKEN=will_be_generated

# API Configuration
API_ENDPOINT=http://localhost:3001/api/process-email
```

### 3. OAuth Authorization

1. **Start the authorization process**:
   ```bash
   node gmail-integration.js
   ```

2. **Visit the authorization URL** displayed in the console

3. **Authorize the application** using your `benjamin.little@axl.vc` account

4. **Copy the authorization code** from the redirect URL

5. **Complete authorization**:
   ```bash
   node gmail-integration.js --auth-code YOUR_AUTHORIZATION_CODE
   ```

6. **Copy the generated tokens** to your `.env` file

### 4. Start Gmail Monitoring

Once configured, start the Gmail monitoring service:

```bash
# Monitor Gmail every 5 minutes
node gmail-integration.js

# Or run as background service
pm2 start gmail-integration.js --name "gmail-processor"
```

## How It Works

### Email Detection
The system monitors your Gmail for unread emails containing keywords:
- guest
- visitor  
- visit
- meeting
- appointment
- access

### Processing Flow
1. **Email Detection**: System finds unread emails with guest-related content
2. **Content Extraction**: Extracts email body and headers
3. **AI Processing**: Sends content to Gemini AI for guest data extraction
4. **Guest Creation**: Automatically creates guest entry in database
5. **Email Marking**: Marks processed emails as read

### Example Email Formats

**Simple Format**:
```
Subject: Guest Visit Request

Hi,

I need to add a guest:
- John Smith from TechCorp
- Tomorrow at 2pm
- Needs access to 3rd floor

Thanks!
```

**Natural Language**:
```
Subject: Visitor for Monday

Can you please add my guest Sarah Johnson? She's coming Monday 
at 10:30 AM for a project review. She works at InnovateCorp 
and will need access to floors 2 and 3.
```

**Meeting Invitation Forward**:
```
Subject: Fwd: Meeting with External Partners

I'm forwarding this meeting - can you add the external attendees 
as guests?

From: external@company.com
We'll have 3 people visiting:
- Mike Chen (CEO)  
- Lisa Wang (CTO)
- David Park (Developer)

Meeting: Tuesday 3pm in Conference Room A
```

## Security Features

- **OAuth2 Authentication**: Secure Google account integration
- **Read-Only Access**: Only reads emails, doesn't modify account settings
- **Keyword Filtering**: Only processes emails with guest-related content
- **Rate Limiting**: Respects Gmail API limits
- **User Verification**: Only processes emails from registered users

## Monitoring and Logs

The system logs all activity:
- Email detection and processing
- AI extraction results  
- Guest creation status
- Error handling

Monitor logs with:
```bash
# Real-time logs
tail -f logs/gmail-processor.log

# PM2 logs (if using PM2)
pm2 logs gmail-processor
```

## Alternative: Email Forwarding

If you prefer not to give API access to your Gmail, you can:

1. **Set up email forwarding** in Gmail:
   - Settings > Forwarding and POP/IMAP
   - Add forwarding address pointing to a webhook service

2. **Use services like**:
   - Zapier (connect Gmail to webhook)
   - IFTTT (Gmail trigger to webhook)
   - SendGrid Inbound Parse
   - Mailgun Routes

3. **Forward to processing endpoint**: `http://your-server.com:3001/api/process-email`

## Testing

Test the integration:

```bash
# Send a test email to yourself
echo "Please add guest John Smith for tomorrow at 2pm" | mail -s "Guest Request" benjamin.little@axl.vc

# Check processing logs
tail -f logs/gmail-processor.log
```

## Troubleshooting

**Common Issues:**

1. **Authorization Failed**
   - Check client ID/secret in .env
   - Verify redirect URI matches Google Console
   - Ensure Gmail API is enabled

2. **No Emails Detected**
   - Check keyword filtering
   - Verify emails are unread
   - Check API quotas

3. **Processing Errors**
   - Verify backend server is running (port 3001)
   - Check Gemini API key is valid
   - Review email content for AI processing

**Getting Help:**
- Check logs in console output
- Verify all environment variables are set
- Test with simple email content first

## Production Considerations

For production deployment:
- Use HTTPS redirect URIs
- Implement proper error handling
- Set up log rotation
- Monitor API quotas
- Consider using service accounts for automation 