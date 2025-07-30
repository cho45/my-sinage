# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digital signage web application for displaying Google Calendar events on 1920x1280 screens. Built with:
- Backend: Node.js + Express + TypeScript  
- Frontend: Vue 3 + TypeScript + Vite
- Authentication: Google OAuth 2.0
- Deployment: Docker (targeting QNAP servers)

## Development Commands

### Initial Setup
```bash
# Install all dependencies (root, server, and client)
npm run install:all

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your Google OAuth credentials and settings
```

### Development
```bash
# Run both frontend and backend in development mode
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3124

# Run only server
npm run server:dev

# Run only client  
npm run client:dev

# Preview production build
cd client && npm run preview

# Type checking
npm run typecheck  # Run all type checks
# Or separately:
cd server && npm run typecheck
cd client && npm run typecheck
```

### Building
```bash
# Build both frontend and backend
npm run build

# Build separately
npm run client:build
npm run server:build
```

### Production
```bash
# Start production server (requires built files)
npm start
```

## Architecture Overview

### Authentication Flow
1. Initial access redirects to `/setup` if no OAuth token exists
2. User authenticates via Google OAuth 2.0
3. Tokens stored in `data/tokens/token.json`
4. Automatic token refresh using refresh tokens
5. All calendar API requests require authentication via `requireGoogleAuth` middleware

### Key Components

**Backend (`/server/src/`)**
- `auth/oauth.ts`: OAuth manager with lazy initialization to handle environment variables
- `calendar/calendarService.ts`: Google Calendar API integration
- `middleware/auth.ts`: Authentication middleware for protected routes
- `routes/auth.ts`: OAuth flow endpoints
- `index.ts`: Express server setup with dotenv configuration

**Frontend (`/client/src/`)**
- `components/CalendarView.vue`: Main signage display (1920x1280 optimized)
- `components/SetupPage.vue`: OAuth setup interface
- `components/AdminPage.vue`: Configuration management UI
- `composables/useCalendar.ts`: Calendar data fetching and formatting
- `composables/useAutoRefresh.ts`: 10-minute auto-refresh logic

### API Endpoints
- `GET /api/calendar`: Fetch calendar events (requires auth)
- `GET /api/calendars`: List available calendars (admin only)
- `GET/POST /api/config`: Manage calendar configuration (admin only)
- `GET /auth/login`: Start OAuth flow
- `GET /auth/callback`: OAuth callback handler
- `GET /auth/status`: Check authentication status
- `GET /api/status`: Health check endpoint (used by Docker)

### Configuration

**Environment Variables (`.env`)**
- `GOOGLE_CLIENT_ID`: OAuth client ID
- `GOOGLE_CLIENT_SECRET`: OAuth client secret  
- `GOOGLE_REDIRECT_URI`: OAuth callback URL (default: http://localhost:3124/auth/callback)
- `PORT`: Server port (default: 3124)
- `ADMIN_PASSWORD`: Password for admin UI access
- `NODE_ENV`: Environment mode (development/production)
- `DATA_DIR`: Data directory path (default: ./app-data, /app/data in Docker)
- `LOG_LEVEL`: Logging level (default: info)

**Calendar Configuration (`config/calendars.json`)**
```json
{
  "calendars": [
    {
      "id": "calendar-id",
      "name": "Display Name",
      "color": "#4285F4",
      "isHoliday": false
    }
  ],
  "display": {
    "weekStart": 0,
    "language": "ja-JP", 
    "timezone": "Asia/Tokyo"
  }
}
```

## Important Implementation Notes

1. **Port Configuration**: Default port is 3124 for both development and Docker deployment
2. **Environment Variables**: Uses dotenv with explicit path loading due to ESM module constraints
3. **OAuth Manager**: Implements lazy initialization pattern to ensure env vars are loaded before instantiation
4. **Display Constraints**: CalendarView component is specifically designed for 1920x1280 displays, while admin pages are responsive
5. **Auto-refresh**: Calendar data refreshes every 10 minutes automatically
6. **Today Highlighting**: Current date is highlighted with blue border and background
7. **Calendar List**: Admin UI includes calendar list fetching to help find calendar IDs
8. **Testing/Linting**: No test suite or linting configured. Type checking available via `npm run typecheck`

## Docker Deployment
```bash
# Build Docker image
docker build -t signage-app .

# Run with docker-compose
docker-compose up -d
```

The application uses a single persistent volume:
- `./app-data:/app/data`: Contains OAuth tokens (`tokens/token.json`) and calendar configuration (`calendars.json`)

Logs are output to console only (use `docker-compose logs` to view)