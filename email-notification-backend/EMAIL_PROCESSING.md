# Email Processing Feature Documentation

## Overview
The email processing feature allows users to send emails with guest information that gets automatically extracted using AI and converted into guest entries.

## Setup Requirements

### 1. Environment Variables
Add to your `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Database Migration
Apply the email processing migration to your Supabase database:
```sql
-- Run the contents of database/migrations/add_email_processing.sql
```

## How It Works

### 1. Email Format
Users can send natural language emails like:
```
Subject: Guest Visit Request

Hi,

I need to schedule a guest visit for:
- Name: John Smith from TechCorp
- Date: Tomorrow
- Time: 2:30 PM
- Purpose: Project review meeting
- Floors: Need access to 3rd and 5th floors

Thanks!
```

### 2. Processing Flow
1. **Email Received** → API endpoint `/api/process-email`
2. **User Verification** → Check if sender is registered and approved
3. **AI Extraction** → Gemini AI extracts structured guest data
4. **Validation** → Data sanitization and validation
5. **Database Storage** → Save as pending email-processed guest
6. **User Notification** → Frontend shows pending guest for review

### 3. User Review
1. User sees notification of processed email
2. Reviews extracted guest information
3. Can approve (creates guest) or reject
4. Original email content preserved for reference

## API Endpoints

### Process Email (Webhook)
```bash
POST /api/process-email
{
  "from": "user@example.com",
  "subject": "Guest Request",
  "text": "Email content...",
  "html": "<p>Email content...</p>"
}
```

### Get Pending Guests
```bash
GET /api/email-guests/pending/:userId
```

### Approve Guest
```bash
POST /api/email-guests/approve/:recordId
{
  "userId": "user-uuid",
  "guestData": {
    "name": "John Smith",
    "visit_date": "2024-12-25",
    "estimated_arrival": "14:30",
    "organization": "TechCorp",
    "floor_access": "Floors 3, 5"
  }
}
```

### Test Processing
```bash
POST /api/test-email-processing
{
  "senderEmail": "user@example.com",
  "subject": "Test",
  "content": "I need to add John Smith for tomorrow at 2pm"
}
```

## Email Service Integration

### Option 1: SendGrid Inbound Parse
1. Set up SendGrid account
2. Configure Inbound Parse webhook to point to `/api/process-email`
3. Set up email address (e.g., guests@yourdomain.com)

### Option 2: Mailgun
1. Set up Mailgun account
2. Configure webhook for incoming emails
3. Point to your `/api/process-email` endpoint

### Option 3: Manual Testing
Use the test endpoint for development and testing.

## Security Features

- **User Authentication** - Only registered users can send emails
- **Rate Limiting** - 10 emails per day per user (configurable)
- **Data Validation** - All extracted data is sanitized
- **Audit Trail** - Complete email processing history
- **Error Handling** - Graceful failure with detailed logging

## Next Steps

1. **Setup Email Service** - Configure SendGrid/Mailgun webhook
2. **Frontend Integration** - Add email guest notifications to dashboard
3. **Testing** - Test email processing flow
4. **Production Deployment** - Deploy backend with email processing

## Configuration

### Email Processing Settings (per user)
- `email_processing_enabled` - Enable/disable email processing
- `max_daily_email_processing` - Daily processing limit (default: 10)

### AI Model Settings
- Model: Gemini 1.5 Flash (configurable)
- Optimized for structured data extraction
- JSON response parsing with error handling

## Troubleshooting

### Common Issues
1. **"Unauthorized sender"** - User email not registered or not approved
2. **"Daily limit exceeded"** - User has reached processing limit
3. **"Low confidence score"** - AI couldn't extract clear guest information
4. **"Invalid date/time format"** - AI couldn't parse date/time from email

### Logs
Check server logs for detailed processing information:
- Email processing attempts
- AI extraction results
- Database operation status
- Error details 