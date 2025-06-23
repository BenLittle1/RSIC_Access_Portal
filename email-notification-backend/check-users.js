const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkUsers() {
  try {
    console.log('👥 Checking users in database...');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }

    console.log(`\n📊 Found ${profiles.length} users in profiles table:`);
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. Email: ${profile.email || 'No email'}`);
      console.log(`   Name: ${profile.full_name || 'No name'}`);
      console.log(`   Status: ${profile.status || 'No status'}`);
      console.log(`   Email Processing: ${profile.email_processing_enabled ? 'Enabled' : 'Disabled'}`);
      console.log('');
    });

    // Check if benjamin.little@axl.vc exists
    const { data: benjaminUser, error: benjaminError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'benjamin.little@axl.vc')
      .single();

    if (benjaminError && benjaminError.code !== 'PGRST116') {
      console.error('❌ Error checking for benjamin.little@axl.vc:', benjaminError);
    } else if (benjaminUser) {
      console.log('✅ benjamin.little@axl.vc found in database!');
      console.log('   Status:', benjaminUser.status);
      console.log('   Email Processing:', benjaminUser.email_processing_enabled ? 'Enabled' : 'Disabled');
    } else {
      console.log('❌ benjamin.little@axl.vc NOT found in database');
      console.log('\n💡 To fix this, you need to either:');
      console.log('1. Sign up through the frontend at http://localhost:5173');
      console.log('2. Add the user directly to the database');
      console.log('3. Test with an existing user email');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 Supabase credentials might be missing!');
      console.log('Make sure you have SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
    }
  }
}

checkUsers(); 