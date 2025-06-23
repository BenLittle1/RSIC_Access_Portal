const { google } = require('googleapis');
require('dotenv').config();

async function debugGmail() {
  try {
    console.log('🔍 Debugging Gmail integration...');
    
    const auth = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    auth.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      access_token: process.env.GMAIL_ACCESS_TOKEN
    });

    const gmail = google.gmail({ version: 'v1', auth });
    
    console.log('✅ Gmail API connection established');
    
    // Check all recent unread emails first
    console.log('\n📧 Checking ALL unread emails...');
    const allUnread = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 10
    });
    
    const allUnreadMessages = allUnread.data.messages || [];
    console.log(`Found ${allUnreadMessages.length} total unread emails`);
    
    // Show subjects of all unread emails
    for (const message of allUnreadMessages.slice(0, 5)) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'metadata'
      });
      
      const headers = msg.data.payload.headers;
      const subjectHeader = headers.find(h => h.name === 'Subject');
      const fromHeader = headers.find(h => h.name === 'From');
      
      console.log(`  - Subject: "${subjectHeader ? subjectHeader.value : 'No subject'}"`);
      console.log(`    From: ${fromHeader ? fromHeader.value : 'Unknown'}`);
    }
    
    // Now check the specific guest-related query
    console.log('\n🎯 Checking guest-related emails...');
    const guestQuery = 'is:unread (guest OR visitor OR visit OR meeting OR appointment OR access)';
    console.log(`Query: ${guestQuery}`);
    
    const guestResponse = await gmail.users.messages.list({
      userId: 'me',
      q: guestQuery,
      maxResults: 10
    });

    const guestMessages = guestResponse.data.messages || [];
    console.log(`Found ${guestMessages.length} guest-related unread emails`);
    
    if (guestMessages.length > 0) {
      console.log('\n📝 Guest email details:');
      
      for (const message of guestMessages) {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });
        
        const headers = msg.data.payload.headers;
        const subjectHeader = headers.find(h => h.name === 'Subject');
        const fromHeader = headers.find(h => h.name === 'From');
        
        console.log(`\n  📧 Email ID: ${message.id}`);
        console.log(`     Subject: "${subjectHeader ? subjectHeader.value : 'No subject'}"`);
        console.log(`     From: ${fromHeader ? fromHeader.value : 'Unknown'}`);
        
        // Try to extract email body
        let emailBody = '';
        const extractBody = (part) => {
          if (part.mimeType === 'text/plain' && part.body.data) {
            emailBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
          } else if (part.parts) {
            part.parts.forEach(extractBody);
          }
        };
        
        if (msg.data.payload.body && msg.data.payload.body.data) {
          emailBody = Buffer.from(msg.data.payload.body.data, 'base64').toString('utf-8');
        } else if (msg.data.payload.parts) {
          msg.data.payload.parts.forEach(extractBody);
        }
        
        console.log(`     Body preview: "${emailBody.substring(0, 100)}..."`);
      }
    } else {
      console.log('\n❌ No guest-related emails found');
      console.log('This could mean:');
      console.log('1. The email doesn\'t contain keywords: guest, visitor, visit, meeting, appointment, access');
      console.log('2. The email is already marked as read');
      console.log('3. The email is in a different folder (spam, promotions, etc.)');
    }
    
    // Test a broader search
    console.log('\n🔎 Testing broader search...');
    const broadQuery = 'is:unread newer_than:1h';
    const broadResponse = await gmail.users.messages.list({
      userId: 'me',
      q: broadQuery,
      maxResults: 5
    });
    
    const broadMessages = broadResponse.data.messages || [];
    console.log(`Found ${broadMessages.length} unread emails from the last hour`);
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    if (error.message.includes('invalid_grant')) {
      console.log('Token might be expired, try refreshing...');
    }
  }
}

debugGmail(); 