const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const emailProcessor = require('./emailProcessor');
const { body, param, validationResult } = require('express-validator');
const GmailEmailProcessor = require('./gmail-integration');
require('dotenv').config();

// Async error wrapper utility
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error logging utility
const logError = (context, error, additionalInfo = {}) => {
  console.error(`❌ Error in ${context}:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  });
};

const app = express();
const PORT = process.env.PORT || 3001;

// 🔒 VALIDATION FEATURE FLAG - Set to 'false' to disable all validation
const ENABLE_VALIDATION = process.env.ENABLE_VALIDATION !== 'false';

console.log(`🛡️ Input validation: ${ENABLE_VALIDATION ? 'ENABLED' : 'DISABLED'}`);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Service role client for system operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🛡️ Validation Rules (Conservative - won't break existing functionality)
const arrivalValidation = [
  body('guestId')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Guest ID must be 1-100 characters'),
  body('arrivalStatus')
    .optional()
    .isBoolean()
    .withMessage('Arrival status must be true or false')
];

const emailValidation = [
  body('from')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('From field too long (max 500 chars)')
    .matches(/^[^{}]*$/)
    .withMessage('From field contains dangerous characters'),
  body('subject')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Subject too long (max 500 chars)'),
  body('text')
    .optional()
    .isLength({ max: 100000 })
    .withMessage('Email text too long (max 100KB)'),
  body('html')
    .optional()
    .isLength({ max: 200000 })
    .withMessage('Email HTML too long (max 200KB)')
];

// 🛡️ Validation Middleware (Conditional based on feature flag)
const validateRequest = (validationRules) => {
  return [
    ...validationRules,
    (req, res, next) => {
      // Skip validation if disabled
      if (!ENABLE_VALIDATION) {
        return next();
      }
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log(`❌ Validation failed for ${req.method} ${req.path}:`, errors.array());
        return res.status(400).json({
          error: 'Input validation failed',
          details: errors.array(),
          note: 'Set ENABLE_VALIDATION=false in .env to disable validation'
        });
      }
      next();
    }
  ];
};

// JWT Authentication Middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized: Missing or invalid authorization header' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid or expired token' 
      });
    }

    // Get user profile for additional checks
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ 
        error: 'Unauthorized: User profile not found' 
      });
    }

    // Check if user is approved
    if (profile.authentication_status !== 'Approved') {
      return res.status(403).json({ 
        error: 'Forbidden: User account not approved' 
      });
    }

    // Add user info to request for use in route handlers
    req.user = user;
    req.profile = profile;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      error: 'Unauthorized: Authentication failed' 
    });
  }
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://rsic.netlify.app',
    'http://localhost:5173',
    'http://localhost:5177',
    'http://localhost:5174'
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

// Email transporter setup with error handling
const createEmailTransporter = () => {
  try {
    let transporterConfig;
    
    // Support multiple email providers
    if (process.env.EMAIL_PROVIDER === 'gmail') {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        throw new Error('Gmail configuration missing: EMAIL_USER and EMAIL_APP_PASSWORD required');
      }
      
      transporterConfig = {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD
        }
      };
    } else if (process.env.EMAIL_PROVIDER === 'sendgrid') {
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SendGrid configuration missing: SENDGRID_API_KEY required');
      }
      
      transporterConfig = {
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      };
    } else {
      // Generic SMTP
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('SMTP configuration missing: SMTP_HOST, SMTP_USER, and SMTP_PASS required');
      }
      
      transporterConfig = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };
    }

    const transporter = nodemailer.createTransport(transporterConfig);
    
    // Verify transporter configuration
    transporter.verify((error, success) => {
      if (error) {
        logError('Email Transporter Verification', error, { provider: process.env.EMAIL_PROVIDER });
      } else {
        console.log('✅ Email transporter verified successfully');
      }
    });

    return transporter;
  } catch (error) {
    logError('Email Transporter Creation', error, { provider: process.env.EMAIL_PROVIDER });
    throw error;
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

// Secure admin verification endpoint
app.post('/api/verify-admin', authenticateUser, async (req, res) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'AXL';
    
    if (password === adminPassword) {
      // Double-check user is actually Security role
      if (req.profile.organization !== 'Security') {
        return res.status(403).json({ error: 'Insufficient privileges' });
      }
      
      res.json({ verified: true });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/notify-arrival', validateRequest(arrivalValidation), authenticateUser, asyncHandler(async (req, res) => {
  const { guestId, arrivalStatus } = req.body;

  // Validate request
  if (!guestId || typeof arrivalStatus !== 'boolean') {
    return res.status(400).json({ 
      error: 'Missing required fields: guestId and arrivalStatus',
      received: { guestId: typeof guestId, arrivalStatus: typeof arrivalStatus }
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

  if (guestError) {
    logError('Fetch Guest Data', guestError, { guestId, userId: req.user.id });
    if (guestError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Guest not found', guestId });
    }
    throw guestError;
  }

  if (!guestData) {
    return res.status(404).json({ error: 'Guest not found', guestId });
  }

  // Fetch inviter profile data
  const { data: inviterData, error: inviterError } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', guestData.inviter_id)
    .single();

  if (inviterError) {
    logError('Fetch Inviter Data', inviterError, { inviterId: guestData.inviter_id, guestId });
    if (inviterError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Inviter profile not found' });
    }
    throw inviterError;
  }

  if (!inviterData || !inviterData.email) {
    logError('Missing Inviter Email', new Error('No email found'), { 
      inviter: inviterData?.full_name, 
      inviterId: guestData.inviter_id 
    });
    return res.status(400).json({ 
      error: 'Inviter email not configured',
      details: 'The person who invited this guest does not have an email address on file'
    });
  }

  // Create email transporter with error handling
  let transporter;
  try {
    transporter = createEmailTransporter();
  } catch (transporterError) {
    logError('Email Transporter Creation', transporterError);
    return res.status(503).json({ 
      error: 'Email service unavailable',
      details: 'Unable to configure email delivery system'
    });
  }

  // Generate email content
  const emailContent = generateArrivalEmail(guestData, inviterData);

  // Send email with retry logic
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: inviterData.email,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html
  };

  let emailInfo;
  try {
    emailInfo = await transporter.sendMail(mailOptions);
  } catch (emailError) {
    logError('Email Send', emailError, { 
      recipient: inviterData.email, 
      guestId, 
      guestName: guestData.name 
    });
    
    // Return a partial success - guest status updated but email failed
    return res.status(207).json({ 
      message: 'Guest arrival noted, but email notification failed',
      guestId,
      emailSent: false,
      error: 'Email delivery failed',
      details: 'Please contact the inviter manually'
    });
  }
  
  console.log('✅ Email sent successfully:', {
    messageId: emailInfo.messageId,
    to: inviterData.email,
    guest: guestData.name,
    inviter: inviterData.full_name,
    timestamp: new Date().toISOString()
  });

  res.json({ 
    message: 'Arrival notification sent successfully',
    guestId,
    emailSent: true,
    recipient: inviterData.email,
    messageId: emailInfo.messageId,
    timestamp: new Date().toISOString()
  });
}));

// Email Processing API Routes

// Webhook endpoint for incoming emails (from email service providers)
app.post('/api/process-email', validateRequest(emailValidation), async (req, res) => {
  try {
    const { from, subject, text, html } = req.body;
    
    // Use text content if available, otherwise HTML
    const emailContent = text || html || '';
    
    if (!from || !emailContent) {
      return res.status(400).json({ 
        error: 'Missing required fields: from, and email content' 
      });
    }

    console.log(`📧 Processing email from: ${from}, subject: ${subject}`);

    // Process the email using our email processor
    const result = await emailProcessor.processIncomingEmail(from, subject, emailContent);

    if (result.success) {
      console.log(`✅ Email processed successfully for ${from}:`, result.message);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      console.log(`❌ Email processing failed for ${from}:`, result.message);
      res.status(400).json({
        success: false,
        message: result.message,
        errors: result.errors
      });
    }

  } catch (error) {
    console.error('Error in email processing endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get pending email-processed guests for a user (PROTECTED)
app.get('/api/email-guests/pending/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Security: Users can only access their own data unless they're Security
    if (req.user.id !== userId && req.profile.organization !== 'Security') {
      return res.status(403).json({ 
        error: 'Forbidden: Access denied to this user data' 
      });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const { data, error } = await supabase
      .from('email_processed_guests')
      .select('*')
      .eq('user_id', userId)
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      pending_guests: data || [],
      count: data ? data.length : 0
    });

  } catch (error) {
    console.error('Error fetching pending email guests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending guests',
      details: error.message 
    });
  }
});

// Approve an email-processed guest and create actual guest record (PROTECTED)
app.post('/api/email-guests/approve/:recordId', authenticateUser, async (req, res) => {
  try {
    const { recordId } = req.params;
    const { guestData: requestGuestData, userId } = req.body;

    // Security: Users can only approve their own records unless they're Security
    if (req.user.id !== userId && req.profile.organization !== 'Security') {
      return res.status(403).json({ 
        error: 'Forbidden: Access denied to this user data' 
      });
    }

    if (!recordId || !requestGuestData || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: recordId, guestData, userId' 
      });
    }

    // Get the email record
    const { data: emailRecord, error: fetchError } = await supabase
      .from('email_processed_guests')
      .select('*')
      .eq('id', recordId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !emailRecord) {
      return res.status(404).json({ error: 'Email record not found' });
    }

    if (emailRecord.processing_status !== 'pending') {
      return res.status(400).json({ error: 'Record already processed' });
    }

    // Create guest in database using admin client (bypasses RLS)
    const { data: newGuestData, error: newGuestError } = await supabaseAdmin
      .from('guests')
      .insert([{
        name: requestGuestData.name,
        visit_date: requestGuestData.visit_date,
        estimated_arrival: requestGuestData.estimated_arrival,
        floor_access: requestGuestData.floor_access,
        organization: requestGuestData.organization,
        inviter_id: requestGuestData.inviter_id,
        requester_email: emailRecord.sender_email
      }])
      .select()
      .single();

    if (newGuestError) {
      throw newGuestError;
    }

    // Update email record status
    const { error: updateError } = await supabase
      .from('email_processed_guests')
      .update({ 
        processing_status: 'approved',
        guest_id: newGuestData.id
      })
      .eq('id', recordId);

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      message: 'Guest approved and created successfully',
      guest: newGuestData
    });

  } catch (error) {
    console.error('Error approving email guest:', error);
    res.status(500).json({ 
      error: 'Failed to approve guest',
      details: error.message 
    });
  }
});

// Reject an email-processed guest (PROTECTED)
app.post('/api/email-guests/reject/:recordId', authenticateUser, async (req, res) => {
  try {
    const { recordId } = req.params;
    const { userId, reason } = req.body;

    // Security: Users can only reject their own records unless they're Security
    if (req.user.id !== userId && req.profile.organization !== 'Security') {
      return res.status(403).json({ 
        error: 'Forbidden: Access denied to this user data' 
      });
    }

    if (!recordId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: recordId, userId' 
      });
    }

    // Update email record status
    const { error } = await supabase
      .from('email_processed_guests')
      .update({ 
        processing_status: 'rejected',
        rejected_reason: reason || 'Rejected by user'
      })
      .eq('id', recordId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Guest request rejected'
    });

  } catch (error) {
    console.error('Error rejecting email guest:', error);
    res.status(500).json({ 
      error: 'Failed to reject guest',
      details: error.message 
    });
  }
});

// Get email processing statistics for a user
app.get('/api/email-guests/stats/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Security: Users can only access their own stats unless they're Security
    if (req.user.id !== userId && req.profile.organization !== 'Security') {
      return res.status(403).json({ 
        error: 'Forbidden: Access denied to this user data' 
      });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const { data, error } = await supabase
      .from('email_processing_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no stats found, return zeros
      if (error.code === 'PGRST116') {
        return res.json({
          success: true,
          stats: {
            total_emails_processed: 0,
            pending_count: 0,
            approved_count: 0,
            rejected_count: 0,
            error_count: 0,
            avg_confidence_score: 0,
            last_email_processed: null
          }
        });
      }
      throw error;
    }

    res.json({
      success: true,
      stats: data
    });

  } catch (error) {
    console.error('Error fetching email processing stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      details: error.message 
    });
  }
});

// Test endpoint for email processing (for development/testing)
app.post('/api/test-email-processing', async (req, res) => {
  try {
    const { senderEmail, subject, content } = req.body;

    if (!senderEmail || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: senderEmail, content' 
      });
    }

    const result = await emailProcessor.processIncomingEmail(
      senderEmail, 
      subject || 'Test Email', 
      content
    );

    res.json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error('Error in test email processing:', error);
    res.status(500).json({ 
      error: 'Test processing failed',
      details: error.message 
    });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  // Log the full error for debugging
  console.error('🚨 Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Don't expose stack traces in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.message,
      ...(isDevelopment && { stack: err.stack })
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication failed',
      details: 'Invalid or expired token'
    });
  }
  
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service unavailable',
      details: 'Database connection failed'
    });
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal server error',
    details: isDevelopment ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server with comprehensive error handling
const startServer = async () => {
  try {
    // Validate critical environment variables
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Test email configuration
    try {
      const testTransporter = createEmailTransporter();
      console.log('✅ Email configuration validated');
    } catch (emailConfigError) {
      console.warn('⚠️  Email configuration issues detected:', emailConfigError.message);
      console.warn('📧 Email notifications may not work properly');
    }

    // Start the server
    const server = app.listen(PORT, async () => {
      console.log(`🚀 Email notification server running on port ${PORT}`);
      console.log(`📧 Email provider: ${process.env.EMAIL_PROVIDER || 'SMTP'}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Input validation: ${process.env.ENABLE_VALIDATION !== 'false' ? 'ENABLED' : 'DISABLED'}`);
      
      // Initialize and start Gmail monitoring
      if (process.env.GMAIL_REFRESH_TOKEN) {
        try {
          console.log('📬 Initializing Gmail monitoring...');
          const gmailProcessor = new GmailEmailProcessor();
          await gmailProcessor.initialize();
          await gmailProcessor.startMonitoring(0.5); // Check every 30 seconds
          console.log('✅ Gmail monitoring started successfully');
        } catch (gmailError) {
          logError('Gmail Monitoring Initialization', gmailError);
          console.log('📝 Note: Gmail monitoring failed but server will continue without it.');
        }
      } else {
        console.log('📭 Gmail monitoring disabled (GMAIL_REFRESH_TOKEN not configured)');
      }
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      server.close((err) => {
        if (err) {
          logError('Server Shutdown', err);
          process.exit(1);
        }
        console.log('✅ Server shut down gracefully');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logError('Uncaught Exception', error);
      console.log('🚨 Uncaught exception detected. Shutting down...');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logError('Unhandled Promise Rejection', new Error(String(reason)), { promise });
      console.log('🚨 Unhandled promise rejection detected.');
    });

  } catch (startupError) {
    logError('Server Startup', startupError);
    console.error('💥 Failed to start server:', startupError.message);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app; 