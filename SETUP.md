# Calendar App Setup Instructions

## Google Calendar OAuth Setup

To enable Google Calendar integration, you'll need to set up OAuth credentials:

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in required fields (app name, user support email, developer contact)
   - Add scopes: `calendar.readonly`, `calendar.events`, `userinfo.email`
   - Add test users during development
4. Create OAuth client ID:
   - Application type: "Web application"
   - Name: "Calendar App"
   - Authorized redirect URIs: 
     - Development: `http://localhost:3000/api/auth/google/callback`
     - Production: `https://yourdomain.com/api/auth/google/callback`

### 3. Add Environment Variables

Add these variables to your Vercel project or `.env.local`:

\`\`\`env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
\`\`\`

**Important**: 
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` starts with `NEXT_PUBLIC_` (used in browser)
- `GOOGLE_CLIENT_SECRET` should NEVER be exposed to the browser
- Update `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` for production deployments

### 4. Deploy and Test

1. Deploy your app to Vercel
2. Update the OAuth redirect URI in Google Cloud Console with your production URL
3. Test the connection from Settings > Integrations

## Security Notes

- OAuth tokens are stored server-side in Supabase with RLS protection
- Access tokens are automatically refreshed when expired
- Users can disconnect at any time from the Settings page
- The integration uses OAuth 2.0 with PKCE for secure authentication

## Features

- Bidirectional sync with Google Calendar
- Automatic token refresh
- Support for multiple Google accounts
- Read and write Google Calendar events
- Reconnect flow for expired permissions
