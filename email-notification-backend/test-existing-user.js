const axios = require('axios');

async function testWithExistingUser() {
  try {
    console.log('🧪 Testing with existing user: benlittle.dev@gmail.com');
    
    const testEmail = {
      from: 'benlittle.dev@gmail.com',  // This email exists in database
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

    console.log('📧 Test email from registered user');
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
    
    if (response.data.guest) {
      console.log('\n🎉 Guest created:');
      console.log('Name:', response.data.guest.name);
      console.log('Date:', response.data.guest.visit_date);
      console.log('Time:', response.data.guest.estimated_arrival);
      console.log('Organization:', response.data.guest.organization);
      console.log('Floor Access:', response.data.guest.floor_access);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testWithExistingUser(); 