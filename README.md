# Modern Calendar Web Application

A full-stack calendar application built with Next.js, React, Tailwind CSS, and Supabase. This application provides a comprehensive calendar management system with Google Calendar integration, multiple views, and intelligent features.

## Features

### Core Functionality

- **User Authentication**
  - Secure email/password authentication via Supabase Auth
  - Email verification workflow
  - Protected routes with middleware

- **Calendar Views**
  - Month view: Traditional calendar grid with event previews
  - Week view: Hourly time slots for the entire week
  - Day view: Detailed daily schedule with hour-by-hour breakdown
  - Seamless navigation between views

- **Event Management**
  - Create, edit, and delete events
  - All-day events support
  - Event descriptions and locations
  - Customizable reminders (0 mins to 1 day before)
  - Color-coded calendars for organization
  - Drag-and-drop time selection (click any time slot to create)

### Advanced Features

- **Google Calendar Integration**
  - OAuth 2.0 authentication
  - Bidirectional sync with Google Calendar
  - Automatic token refresh
  - Support for multiple Google accounts
  - Sync on-demand or automatic
  - Disconnect anytime from settings

- **Quality-of-Life Features**
  - **Event Conflict Detection**: Automatic warnings when scheduling overlapping events
  - **Natural Language Event Creation**: Parse events from text like "Meeting tomorrow at 3pm"
  - **Search & Filter**: Search events by title, description, or location
  - **Time Zone Auto-Detection**: Automatically detects and uses your local timezone
  - **Dark Mode**: Full dark mode support with system preference detection
  - **Audit Logs**: Track all calendar changes for security and history

### User Interface

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Modern UI**: Built with shadcn/ui components
- **Accessible**: ARIA labels and keyboard navigation support
- **Performance**: Optimized database queries with Row Level Security

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **External APIs**: Google Calendar API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account
- (Optional) Google Cloud Console account for Google Calendar integration

### Installation

1. **Clone or download the project**

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - The database schema will be created automatically when you run the SQL scripts
   - Go to Settings > API to get your project URL and anon key

4. **Configure environment variables**
   
   The following environment variables are already configured in your v0 project:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - And other Supabase credentials

   For Google Calendar integration, add these variables in the Vercel dashboard or v0 settings:
   \`\`\`env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   \`\`\`

5. **Run database migrations**
   
   In the v0 interface, execute the SQL scripts in order:
   - `scripts/001_initial_schema.sql`
   - `scripts/002_profile_trigger.sql`

6. **Start the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Google Calendar Setup

To enable Google Calendar integration, follow the detailed instructions in [SETUP.md](./SETUP.md).

Quick summary:
1. Create a Google Cloud project
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Add environment variables
5. Configure redirect URIs

## Database Schema

The application uses the following main tables:

- **profiles**: Extended user information
- **calendars**: User's calendars with colors and providers
- **events**: Calendar events with all details
- **oauth_connections**: Secure OAuth token storage
- **audit_logs**: Change tracking for security

All tables use Row Level Security (RLS) to ensure users can only access their own data.

## Project Structure

\`\`\`
app/
├── api/                      # API routes
│   ├── auth/google/         # Google OAuth endpoints
│   └── google/              # Google Calendar sync
├── auth/                    # Authentication pages
│   ├── login/
│   ├── sign-up/
│   └── error/
├── dashboard/               # Main application
│   ├── settings/           # Settings page
│   └── page.tsx            # Calendar dashboard
├── layout.tsx              # Root layout
└── globals.css             # Global styles

components/
├── calendar/               # Calendar view components
│   ├── calendar-header.tsx
│   ├── month-view.tsx
│   ├── week-view.tsx
│   ├── day-view.tsx
│   ├── calendar-sidebar.tsx
│   └── search-filter.tsx
├── events/                 # Event management
│   ├── event-dialog.tsx
│   ├── event-details-dialog.tsx
│   └── calendar-dialog.tsx
├── integrations/           # External integrations
│   └── google-calendar-connect.tsx
└── ui/                     # shadcn/ui components

lib/
├── google/                 # Google Calendar API
│   ├── oauth.ts
│   └── calendar-api.ts
├── hooks/                  # React hooks
│   └── use-calendar.ts
├── supabase/              # Supabase clients
│   ├── client.ts
│   ├── server.ts
│   └── proxy.ts
├── types/                  # TypeScript types
│   └── database.ts
└── utils/                  # Utility functions
    ├── date-utils.ts
    ├── conflict-detection.ts
    ├── natural-language.ts
    └── timezone.ts

scripts/                    # Database migration scripts
├── 001_initial_schema.sql
└── 002_profile_trigger.sql
\`\`\`

## Usage Guide

### Creating Events

1. **Quick Create**: Click the "New Event" button in the header
2. **Date Click**: Click any date in month view
3. **Time Slot Click**: Click any time slot in week/day view
4. **Natural Language**: Use the quick create field with phrases like:
   - "Meeting tomorrow at 3pm"
   - "Lunch on Friday"
   - "Dentist next Monday at 2:30pm"

### Managing Calendars

1. Create multiple calendars for different purposes (Work, Personal, etc.)
2. Toggle calendars on/off in the sidebar
3. Assign custom colors to each calendar
4. Events inherit their calendar's color

### Google Calendar Sync

1. Go to Settings from the dashboard
2. Click "Connect Google Calendar"
3. Authorize the application
4. Click "Sync Now" to pull events from Google
5. Changes sync bidirectionally

### Searching and Filtering

1. Use the search bar to find events by title, description, or location
2. Click the filter icon to filter by specific calendars
3. Results update in real-time

## Security Features

- **Row Level Security (RLS)**: All database tables are protected with RLS policies
- **Server-Side Auth**: Authentication checks happen on the server
- **Encrypted Tokens**: OAuth tokens are stored securely in the database
- **Automatic Token Refresh**: Expired tokens are refreshed automatically
- **Audit Logging**: All event changes are logged for security
- **CSRF Protection**: OAuth state parameter prevents CSRF attacks

## Deployment

### Deploying to Vercel

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Post-Deployment

1. Update Google OAuth redirect URIs with your production URL
2. Update `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` environment variable
3. Test the Google Calendar integration
4. Run the SQL scripts in your Supabase project if not already done

## Future Enhancements

The application is architected to support these future features:

- **iCloud/CalDAV Support**: Backend is structured for additional providers
- **Event Recurrence**: Database schema supports recurring events
- **Notifications**: Reminder system ready for push notifications
- **Offline Mode**: Service worker can be added for offline access
- **Team Calendars**: Sharing infrastructure in place
- **Mobile Apps**: API-first design enables native mobile apps

## Troubleshooting

### Database Connection Issues

- Verify Supabase environment variables are correct
- Check that RLS policies are enabled
- Ensure SQL scripts have been executed

### Google Calendar Not Connecting

- Verify OAuth credentials in Google Cloud Console
- Check redirect URI matches exactly
- Ensure Google Calendar API is enabled
- Check browser console for errors

### Events Not Appearing

- Check that calendars are toggled on in the sidebar
- Verify date range includes the events
- Check search/filter settings
- Confirm events exist in the database

## Contributing

This is a v0 generated project. To modify:

1. Use v0's editing capabilities to modify the code
2. Test changes in the v0 preview
3. Export and deploy when ready

## License

This project was created with v0 by Vercel.

## Support

For issues related to:
- **v0**: Visit [vercel.com/help](https://vercel.com/help)
- **Supabase**: Check [supabase.com/docs](https://supabase.com/docs)
- **Google Calendar API**: See [developers.google.com/calendar](https://developers.google.com/calendar)

## Acknowledgments

- Built with [v0](https://v0.dev) by Vercel
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Database and auth by [Supabase](https://supabase.com)
- Icons from [Lucide](https://lucide.dev)
"# CalendarAI" 
#   C a l e n d a r A I  
 