const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function addNewUser() {
  try {
    console.log('👤 Adding sricaccessportal@gmail.com to database...');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Add the new user to profiles table
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          email: 'sricaccessportal@gmail.com',
          full_name: 'SRIC Access Portal',
          organization: 'AXL',
          status: 'approved',
          email_processing_enabled: true,
          max_daily_email_processing: 10
        }
      ])
      .select();

    if (error) {
      console.error('❌ Error adding user:', error);
      return;
    }

    console.log('✅ Successfully added user to database!');
    console.log('User details:', JSON.stringify(data[0], null, 2));
    
    // Verify the user was added
    const { data: verification, error: verificationError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'sricaccessportal@gmail.com')
      .single();

    if (verificationError) {
      console.error('❌ Error verifying user:', verificationError);
    } else {
      console.log('\n🔍 Verification - User found in database:');
      console.log('Email:', verification.email);
      console.log('Name:', verification.full_name);
      console.log('Organization:', verification.organization);
      console.log('Email Processing:', verification.email_processing_enabled ? 'Enabled' : 'Disabled');
      console.log('Daily Limit:', verification.max_daily_email_processing);
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

addNewUser(); 