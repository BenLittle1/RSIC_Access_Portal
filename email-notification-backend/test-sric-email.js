const axios = require('axios');

async function testSricEmail() {
  try {
    console.log('🧪 Testing email processing with SRIC Gmail account...');
    
    // Test email from the new SRIC Gmail account
    const testEmail = {
      from: 'sricaccessportal@gmail.com',
      subject: 'Guest Visit Request',
      text: `Hi,

I need to add a guest:
- Mike Chen from TechCorp  
- Tomorrow at 3:00 PM
- Needs access to 2nd floor for client meeting

Thanks!`,
      html: `<p>Hi,</p>
<p>I need to add a guest:</p>
<ul>
<li>Mike Chen from TechCorp</li>
<li>Tomorrow at 3:00 PM</li>
<li>Needs access to 2nd floor for client meeting</li>
</ul>
<p>Thanks!</p>`
    };

    console.log('📧 Test email from SRIC Gmail account:');
    console.log('From:', testEmail.from);
    console.log('Subject:', testEmail.subject);
    
    console.log('\n🚀 Processing with AI...');
    
    const response = await axios.post('http://localhost:3001/api/process-email', testEmail, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ SUCCESS! Email processed successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      
      if (error.response.data.message === 'Unauthorized sender') {
        console.log('\n💡 The SRIC Gmail account needs to be added to the database first.');
        console.log('   You can either:');
        console.log('   1. Sign up at http://localhost:5174 with sricaccessportal@gmail.com');
        console.log('   2. Test with benjamin.little@axl.vc (which is already in the database)');
      }
    }
  }
}

testSricEmail(); 