# Ascend Backend

Backend server for handling Google OAuth with refresh tokens.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create a `.env` file with the following variables:
```
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
REDIRECT_URI=http://localhost:4000/auth/google/callback

# Supabase
SUPABASE_URL=https://hmnbdkwjgmwchuyhtmqh.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# App
FRONTEND_URL=http://localhost:3000
PORT=4000

# Security - Generate a strong random key for production
ENCRYPTION_KEY=change-this-to-a-secure-32-char-key
```

3. Run the development server:
```bash
npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/google?userId=...` | GET | Start OAuth flow |
| `/auth/google/callback` | GET | OAuth callback (handled by Google) |
| `/auth/google/status` | GET | Check if Google is connected |
| `/auth/google/token` | GET | Get valid access token |
| `/auth/google/disconnect` | POST | Disconnect Google account |

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select your project
3. Go to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI: `http://localhost:4000/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

