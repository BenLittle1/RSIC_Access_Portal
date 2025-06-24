const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setEmailLimits(email, dailyLimit) {
  try {
    console.log(`Setting email processing limit for ${email} to ${dailyLimit} emails per day...`);
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        max_daily_email_processing: dailyLimit,
        organization: 'Security' // Also set to Security for higher privileges
      })
      .eq('email', email)
      .select();

    if (error) {
      console.error('❌ Error updating limits:', error);
      return false;
    }

    if (data && data.length > 0) {
      console.log('✅ Successfully updated email limits:');
      console.log(`   Email: ${data[0].email}`);
      console.log(`   Daily Limit: ${data[0].max_daily_email_processing}`);
      console.log(`   Organization: ${data[0].organization}`);
      return true;
    } else {
      console.log('❌ No user found with that email address');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to update limits:', error.message);
    return false;
  }
}

async function getCurrentLimits(email) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, max_daily_email_processing, organization')
      .eq('email', email)
      .single();

    if (error) {
      console.error('❌ Error fetching user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Failed to fetch user:', error.message);
    return null;
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📧 Email Processing Limits Configuration Tool

Usage:
  node set-email-limits.js check <email>           - Check current limits
  node set-email-limits.js set <email> <limit>     - Set daily email limit
  node set-email-limits.js unlimited <email>       - Remove daily limits (set to 999)

Examples:
  node set-email-limits.js check sricaccessportal@gmail.com
  node set-email-limits.js set sricaccessportal@gmail.com 100
  node set-email-limits.js unlimited sricaccessportal@gmail.com
`);
    return;
  }

  const command = args[0];
  const email = args[1];

  if (command === 'check') {
    if (!email) {
      console.log('❌ Please provide an email address');
      return;
    }

    const user = await getCurrentLimits(email);
    if (user) {
      console.log('📊 Current Email Processing Limits:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Daily Limit: ${user.max_daily_email_processing || 'Default (50)'}`);
      console.log(`   Organization: ${user.organization || 'Unknown'}`);
    }
  } else if (command === 'set') {
    const limit = parseInt(args[2]);
    
    if (!email || !limit || limit < 1) {
      console.log('❌ Please provide a valid email and limit number');
      console.log('   Example: node set-email-limits.js set user@example.com 100');
      return;
    }

    await setEmailLimits(email, limit);
  } else if (command === 'unlimited') {
    if (!email) {
      console.log('❌ Please provide an email address');
      return;
    }

    await setEmailLimits(email, 999);
  } else {
    console.log('❌ Unknown command. Use check, set, or unlimited');
  }
}

main().catch(console.error); 