# SRIC Email Notification Backend

A Node.js/Express backend service that sends email notifications when guests arrive at the SRIC facility.

## 🚀 Quick Railway Deployment

### Step 1: Deploy to Railway

1. **Option A: Railway Dashboard**
   - Go to [Railway](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Connect this repository
   - Select the `email-notification-backend` folder

2. **Option B: Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```

### Step 2: Set Environment Variables in Railway

Go to your Railway dashboard → Project → Variables and add:

```
NODE_ENV=production
FRONTEND_URL=https://axlguestlistwebsite-production-5c19.up.railway.app
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-google-app-password
EMAIL_FROM=SRIC Access Portal <your-email@gmail.com>
```

### Step 3: Set Up Gmail App Password

1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account Settings → Security → 2-Step Verification
3. Click "App passwords" at the bottom
4. Generate a new app password for "Mail"
5. Use this 16-character password as `EMAIL_APP_PASSWORD`

### Step 4: Update Frontend

Add to your frontend `.env`:
```
VITE_BACKEND_URL=https://your-railway-backend-url.railway.app
```

## 📧 What It Does

When someone checks the arrival checkbox in your SRIC Access Portal:

1. Updates the guest's arrival status in Supabase
2. Calls this backend service
3. Sends a beautiful email to the person who invited the guest
4. Email includes all guest details and arrival time

## 🎨 Email Template

The service sends professional emails with:
- Black & white design matching your app
- Guest details (name, dates, floor access)
- Responsive design for all devices
- SRIC Access Portal branding

## 🔧 API Endpoints

- `GET /api/health` - Health check
- `POST /api/notify-arrival` - Send arrival notification

## 🔒 Security

- Rate limiting (100 requests per 15 minutes)
- CORS protection for your frontend domain
- Input validation and error handling
- Secure email handling

## 📊 Monitoring

After deployment, test your service:
```bash
curl https://your-backend.railway.app/api/health
```

## 🐛 Troubleshooting

- **Email not sending**: Check Gmail app password
- **Database errors**: Verify Supabase credentials
- **CORS errors**: Check FRONTEND_URL variable

Your backend is ready to deploy! 🎉 