const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Extract guest information from email content using Gemini AI
 */
async function extractGuestDataFromEmail(emailContent, senderEmail) {
  try {
    const prompt = `
You are a guest information extraction system for the SRIC Access Portal. 
Extract guest details from the provided email and return ONLY a valid JSON response.

IMPORTANT RULES:
1. Return ONLY valid JSON - no additional text or explanations
2. If no clear guest information is found, return an empty array
3. Be conservative with confidence scores (0.0 to 1.0)
4. Use reasonable defaults for missing information
5. Convert dates to YYYY-MM-DD format
6. Convert times to HH:MM format (24-hour)

Expected JSON format:
{
  "guests": [
    {
      "name": "Full Name",
      "visit_date": "YYYY-MM-DD",
      "estimated_arrival": "HH:MM",
      "organization": "Organization Name",
      "floor_access": "Floor X" or "Floors X, Y",
      "purpose": "Meeting purpose",
      "notes": "Additional notes"
    }
  ],
  "confidence_score": 0.85,
  "processing_notes": "Brief explanation of extraction"
}

EMAIL CONTENT TO PROCESS:
${emailContent}

SENDER EMAIL: ${senderEmail}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up the response text (remove any markdown formatting)
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const extractedData = JSON.parse(cleanedText);
    
    // Validate and sanitize the extracted data
    const validatedData = validateExtractedData(extractedData);
    
    return validatedData;

  } catch (error) {
    console.error('Error extracting guest data:', error);
    return {
      guests: [],
      confidence_score: 0.0,
      processing_notes: `Error processing email: ${error.message}`,
      errors: [error.message]
    };
  }
}

/**
 * Validate and sanitize extracted guest data
 */
function validateExtractedData(data) {
  try {
    const validated = {
      guests: [],
      confidence_score: Math.max(0, Math.min(1, data.confidence_score || 0)),
      processing_notes: data.processing_notes || '',
      errors: []
    };

    if (!data.guests || !Array.isArray(data.guests)) {
      validated.errors.push('No valid guest array found');
      return validated;
    }

    for (const guest of data.guests) {
      const validatedGuest = {
        name: (guest.name || '').trim(),
        visit_date: validateDate(guest.visit_date),
        estimated_arrival: validateTime(guest.estimated_arrival),
        organization: (guest.organization || 'Unknown').trim(),
        floor_access: (guest.floor_access || 'Floor 1').trim(),
        purpose: (guest.purpose || '').trim(),
        notes: (guest.notes || '').trim()
      };

      // Only include guests with required fields
      if (validatedGuest.name && validatedGuest.visit_date && validatedGuest.estimated_arrival) {
        validated.guests.push(validatedGuest);
      } else {
        validated.errors.push(`Incomplete guest data for: ${guest.name || 'Unknown'}`);
      }
    }

    return validated;
  } catch (error) {
    return {
      guests: [],
      confidence_score: 0.0,
      processing_notes: 'Data validation failed',
      errors: [error.message]
    };
  }
}

/**
 * Validate and format date
 */
function validateDate(dateStr) {
  if (!dateStr) return null;

  try {
    // Handle common date formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Try parsing relative dates
      const today = new Date();
      const lowerDate = dateStr.toLowerCase();
      
      if (lowerDate.includes('today')) {
        return today.toISOString().split('T')[0];
      } else if (lowerDate.includes('tomorrow')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      }
      
      return null;
    }
    
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/**
 * Validate and format time
 */
function validateTime(timeStr) {
  if (!timeStr) return null;

  try {
    // Handle various time formats
    const timeRegex = /(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i;
    const match = timeStr.match(timeRegex);
    
    if (!match) return null;
    
    let hours = parseInt(match[1]);
    let minutes = parseInt(match[2] || '0');
    const ampm = match[3] ? match[3].toLowerCase() : null;
    
    // Convert to 24-hour format
    if (ampm === 'pm' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'am' && hours === 12) {
      hours = 0;
    }
    
    // Validate ranges
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch {
    return null;
  }
}

/**
 * Extract email address from "Name <email@domain.com>" format
 */
function extractEmailAddress(emailString) {
  if (!emailString) return '';
  
  // Match email in angle brackets or just the email itself
  const emailMatch = emailString.match(/<([^>]+)>/) || emailString.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return emailMatch ? emailMatch[1] : emailString.trim();
}

/**
 * Verify that email sender is a registered user
 */
async function verifySenderEmail(senderEmail) {
  try {
    // Extract just the email address from the sender string
    const cleanEmail = extractEmailAddress(senderEmail);
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, organization, email_processing_enabled, max_daily_email_processing')
      .eq('email', cleanEmail)
      .eq('authentication_status', 'Approved')
      .single();

    if (error || !profile) {
      return {
        valid: false,
        error: 'Email not found or user not approved'
      };
    }

    if (!profile.email_processing_enabled) {
      return {
        valid: false,
        error: 'Email processing disabled for this user'
      };
    }

    return {
      valid: true,
      user: profile
    };
  } catch (error) {
    return {
      valid: false,
      error: `Database error: ${error.message}`
    };
  }
}

/**
 * Check daily email processing limits
 */
async function checkProcessingLimits(userId, maxDaily = 10) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { count, error } = await supabase
      .from('email_processed_guests')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`);

    if (error) {
      throw error;
    }

    return {
      canProcess: count < maxDaily,
      currentCount: count,
      dailyLimit: maxDaily,
      remaining: Math.max(0, maxDaily - count)
    };
  } catch (error) {
    return {
      canProcess: false,
      error: error.message
    };
  }
}

/**
 * Save processed email to database
 */
async function saveProcessedEmail(userData, emailSubject, emailContent, extractedData) {
  try {
    const { data, error } = await supabase
      .from('email_processed_guests')
      .insert({
        user_id: userData.user_id,
        sender_email: userData.email || '',
        email_subject: emailSubject,
        original_email_content: emailContent,
        extracted_data: extractedData,
        confidence_score: extractedData.confidence_score,
        processing_errors: extractedData.errors || null,
        ai_model_used: 'gemini-1.5-flash',
        processing_status: 'pending'  // Will be updated to 'approved' after guest creation
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      record: data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main email processing function
 */
async function processIncomingEmail(senderEmail, emailSubject, emailContent) {
  const result = {
    success: false,
    message: '',
    data: null,
    errors: []
  };

  try {
    // 1. Verify sender
    const senderCheck = await verifySenderEmail(senderEmail);
    if (!senderCheck.valid) {
      result.errors.push(senderCheck.error);
      result.message = 'Unauthorized sender';
      return result;
    }

    const userData = senderCheck.user;

    // 2. Check processing limits
    const limitCheck = await checkProcessingLimits(userData.user_id, userData.max_daily_email_processing);
    if (!limitCheck.canProcess) {
      result.errors.push(limitCheck.error || 'Daily processing limit exceeded');
      result.message = `Daily limit reached (${limitCheck.currentCount}/${limitCheck.dailyLimit})`;
      return result;
    }

    // 3. Extract guest data using Gemini AI
    const extractedData = await extractGuestDataFromEmail(emailContent, senderEmail);

    if (extractedData.guests.length === 0) {
      result.errors.push('No valid guest information found in email');
      result.message = 'Unable to extract guest details';
      return result;
    }

    // 4. Automatically create guests (no approval needed)
    const createdGuests = [];
    
    for (const guestData of extractedData.guests) {
      try {
        const { data: newGuest, error: guestError } = await supabase
          .from('guests')
          .insert({
            name: guestData.name,
            visit_date: guestData.visit_date,
            estimated_arrival: guestData.estimated_arrival,
            arrival_status: false,
            floor_access: guestData.floor_access,
            inviter_id: userData.user_id,
            organization: guestData.organization,
            requester_email: senderEmail
          })
          .select()
          .single();

        if (guestError) {
          console.error('❌ Error creating guest:', guestError);
          result.errors.push(`Failed to create guest: ${guestData.name} - ${guestError.message}`);
          continue;
        }

        createdGuests.push(newGuest);
        console.log(`✅ Guest created: ${newGuest.name} (ID: ${newGuest.id})`);
      } catch (error) {
        console.error('❌ Unexpected error creating guest:', error);
        result.errors.push(`Unexpected error for guest: ${guestData.name}`);
      }
    }

    if (createdGuests.length === 0) {
      result.message = 'Failed to create any guests';
      return result;
    }

    // 5. Save audit log to email_processed_guests table
    const auditResult = await saveProcessedEmail(userData, emailSubject, emailContent, extractedData);
    if (auditResult.success && createdGuests.length > 0) {
      // Update the audit record to link to the created guest and mark as auto-approved
      const { error: updateError } = await supabase
        .from('email_processed_guests')
        .update({ 
          processing_status: 'approved',
          guest_id: createdGuests[0].id,
          processed_at: new Date().toISOString()
        })
        .eq('id', auditResult.record.id);

      if (updateError) {
        console.warn('⚠️  Warning: Failed to update audit log:', updateError);
      }
    }

    // 6. Success
    result.success = true;
    result.message = `Successfully created ${createdGuests.length} guest(s) from email with ${(extractedData.confidence_score * 100).toFixed(1)}% confidence`;
    result.data = {
      record_id: auditResult.success ? auditResult.record.id : null,
      created_guests: createdGuests,
      extracted_guests: extractedData.guests,
      confidence_score: extractedData.confidence_score,
      processing_notes: extractedData.processing_notes,
      user_info: {
        name: userData.full_name,
        organization: userData.organization,
        remaining_daily: limitCheck.remaining - 1
      }
    };

    return result;

  } catch (error) {
    result.errors.push(error.message);
    result.message = 'Unexpected processing error';
    return result;
  }
}

module.exports = {
  processIncomingEmail,
  extractGuestDataFromEmail,
  verifySenderEmail,
  checkProcessingLimits,
  saveProcessedEmail
}; 