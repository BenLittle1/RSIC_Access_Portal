const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://rsic.netlify.app',
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Email transporter setup
const createEmailTransporter = () => {
  // Support multiple email providers
  if (process.env.EMAIL_PROVIDER === 'gmail') {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });
  } else if (process.env.EMAIL_PROVIDER === 'sendgrid') {
    return nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  } else {
    // Generic SMTP
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
};

// Email templates
const generateArrivalEmail = (guestData, inviterData) => {
  const subject = `Guest Arrival Notification - ${guestData.name}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Guest Arrival Notification</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px; 
            }
            .header { 
                background-color: #000; 
                color: white; 
                padding: 20px; 
                text-align: center; 
                margin-bottom: 20px;
            }
            .content { 
                background-color: #f9f9f9; 
                padding: 20px; 
                border: 1px solid #ddd;
                margin-bottom: 20px;
            }
            .info-row { 
                margin: 10px 0; 
                padding: 8px 0; 
                border-bottom: 1px solid #eee; 
            }
            .label { 
                font-weight: bold; 
                display: inline-block; 
                width: 150px; 
            }
            .footer { 
                text-align: center; 
                color: #666; 
                font-size: 12px; 
                margin-top: 20px; 
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>SRIC Access Portal</h1>
            <h2>Guest Arrival Notification</h2>
        </div>
        
        <div class="content">
            <p>Hello ${inviterData.full_name},</p>
            
            <p>This is to notify you that your invited guest has arrived at the facility.</p>
            
            <div class="info-row">
                <span class="label">Guest Name:</span>
                <span>${guestData.name}</span>
            </div>
            
            <div class="info-row">
                <span class="label">Visit Date:</span>
                <span>${new Date(guestData.visit_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
            </div>
            
            <div class="info-row">
                <span class="label">Estimated Arrival:</span>
                <span>${new Date(`1970-01-01T${guestData.estimated_arrival}`).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}</span>
            </div>
            
            <div class="info-row">
                <span class="label">Actual Arrival:</span>
                <span>${new Date().toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}</span>
            </div>
            
            <div class="info-row">
                <span class="label">Floor Access:</span>
                <span>${guestData.floor_access}</span>
            </div>
            
            <div class="info-row">
                <span class="label">Organization:</span>
                <span>${guestData.organization}</span>
            </div>
        </div>
        
        <p>Please note that your guest has been checked in by security and is now in the building.</p>
        
        <div class="footer">
            <p>This is an automated notification from the SRIC Access Portal.</p>
            <p>Please do not reply to this email.</p>
        </div>
    </body>
    </html>
  `;

  const text = `
SRIC Access Portal - Guest Arrival Notification

Hello ${inviterData.full_name},

This is to notify you that your invited guest has arrived at the facility.

Guest Details:
- Name: ${guestData.name}
- Visit Date: ${new Date(guestData.visit_date).toLocaleDateString()}
- Estimated Arrival: ${new Date(`1970-01-01T${guestData.estimated_arrival}`).toLocaleTimeString()}
- Actual Arrival: ${new Date().toLocaleTimeString()}
- Floor Access: ${guestData.floor_access}
- Organization: ${guestData.organization}

Please note that your guest has been checked in by security and is now in the building.

This is an automated notification from the SRIC Access Portal.
Please do not reply to this email.
  `;

  return { subject, html, text };
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'SRIC Email Notification Service'
  });
});

app.post('/api/notify-arrival', async (req, res) => {
  try {
    const { guestId, arrivalStatus } = req.body;

    // Validate request
    if (!guestId || typeof arrivalStatus !== 'boolean') {
      return res.status(400).json({ 
        error: 'Missing required fields: guestId and arrivalStatus' 
      });
    }

    // Only send email when guest arrives (status changes to true)
    if (!arrivalStatus) {
      return res.json({ 
        message: 'No email sent - guest departure noted', 
        guestId 
      });
    }

    // Fetch guest data from Supabase
    const { data: guestData, error: guestError } = await supabase
      .from('guests')
      .select('*')
      .eq('id', guestId)
      .single();

    if (guestError || !guestData) {
      console.error('Error fetching guest data:', guestError);
      return res.status(404).json({ error: 'Guest not found' });
    }

    // Fetch inviter profile data
    const { data: inviterData, error: inviterError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', guestData.inviter_id)
      .single();

    if (inviterError || !inviterData) {
      console.error('Error fetching inviter data:', inviterError);
      return res.status(404).json({ error: 'Inviter not found' });
    }

    // Check if inviter has an email
    if (!inviterData.email) {
      console.log('No email found for inviter:', inviterData.full_name);
      return res.status(400).json({ error: 'Inviter email not found' });
    }

    // Create email transporter
    const transporter = createEmailTransporter();

    // Generate email content
    const emailContent = generateArrivalEmail(guestData, inviterData);

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: inviterData.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: inviterData.email,
      guest: guestData.name,
      inviter: inviterData.full_name
    });

    res.json({ 
      message: 'Arrival notification sent successfully',
      guestId,
      emailSent: true,
      recipient: inviterData.email,
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending arrival notification:', error);
    res.status(500).json({ 
      error: 'Failed to send notification',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Email notification server running on port ${PORT}`);
  console.log(`📧 Email provider: ${process.env.EMAIL_PROVIDER || 'SMTP'}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; 