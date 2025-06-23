const axios = require('axios');

async function testManualProcessing() {
  try {
    console.log('🧪 Testing manual email processing...');
    
    // Simulate the email you just sent
    const testEmail = {
      from: 'benjamin.little@axl.vc',
      subject: 'Guest Visit Request',
      text: `Hi,

I need to add a guest:
- Sarah Johnson from TechCorp  
- Tomorrow at 2:30 PM
- Needs access to 3rd floor for project meeting

Thanks!`,
      html: `<p>Hi,</p>
<p>I need to add a guest:</p>
<ul>
<li>Sarah Johnson from TechCorp</li>
<li>Tomorrow at 2:30 PM</li>
<li>Needs access to 3rd floor for project meeting</li>
</ul>
<p>Thanks!</p>`
    };

    console.log('📧 Test email content:');
    console.log('From:', testEmail.from);
    console.log('Subject:', testEmail.subject);
    console.log('Body:', testEmail.text);
    
    console.log('\n🚀 Sending to processing API...');
    
    const response = await axios.post('http://localhost:3001/api/process-email', testEmail, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Processing successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Processing error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 The backend server might not be running!');
      console.log('Try running: npm start');
    }
  }
}

testManualProcessing(); 