const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function addNewUser() {
  try {
    console.log('👤 Adding sricaccessportal@gmail.com to database...');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // First check what columns exist
    const { data: existingUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching profiles:', fetchError);
      return;
    }

    console.log('📊 Available columns:', Object.keys(existingUsers[0] || {}));

    // Add the new user with minimal required fields
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          email: 'sricaccessportal@gmail.com',
          full_name: 'SRIC Access Portal',
          organization: 'AXL',
          email_processing_enabled: true,
          max_daily_email_processing: 10
        }
      ])
      .select();

    if (error) {
      console.error('❌ Error adding user:', error);
      
      // Try with even fewer fields
      console.log('\n🔄 Trying with minimal fields...');
      const { data: simpleData, error: simpleError } = await supabase
        .from('profiles')
        .insert([
          {
            email: 'sricaccessportal@gmail.com',
            full_name: 'SRIC Access Portal'
          }
        ])
        .select();

      if (simpleError) {
        console.error('❌ Simple insert also failed:', simpleError);
        return;
      }

      console.log('✅ Added user with minimal fields!');
      console.log('User details:', JSON.stringify(simpleData[0], null, 2));
      return;
    }

    console.log('✅ Successfully added user to database!');
    console.log('User details:', JSON.stringify(data[0], null, 2));
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

addNewUser(); 