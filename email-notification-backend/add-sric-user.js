const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function addSricUser() {
  try {
    console.log('👤 Adding sricaccessportal@gmail.com to database...');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Get an existing user as a template
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'benjamin.little@axl.vc')
      .single();

    if (fetchError) {
      console.error('❌ Error fetching existing user:', fetchError);
      return;
    }

    console.log('📋 Using existing user as template...');

    // Create new user based on existing structure
    const newUser = {
      ...existingUser,
      id: undefined, // Let database generate new ID
      user_id: existingUser.user_id, // Use same user_id structure
      email: 'sricaccessportal@gmail.com',
      full_name: 'SRIC Access Portal',
      organization: 'AXL',
      created_at: undefined, // Let database set current time
      updated_at: undefined,
      email_processing_enabled: true,
      max_daily_email_processing: 10
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert([newUser])
      .select();

    if (error) {
      console.error('❌ Error adding user:', error);
      return;
    }

    console.log('✅ Successfully added SRIC user to database!');
    console.log('User details:', JSON.stringify(data[0], null, 2));
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

addSricUser(); 