# PostMate AI — Playwright Service

Express + Playwright service for auto-posting to Facebook, Instagram, and TikTok.

Runs locally on macOS during development. Can be deployed to a VPS later with PM2 + Nginx.

## Setup

```bash
# 1. Install dependencies
cd playwright-service
npm install

# 2. Install Chromium browser for Playwright
npm run setup

# 3. Create .env file
cp .env.example .env
# Edit .env with your actual values
```

### Environment Variables

| Variable                   | Description                                            |
|---------------------------|--------------------------------------------------------|
| `PORT`                    | Server port (default: 4000)                            |
| `API_SECRET`              | API key — must match `VPS_API_SECRET` in Next.js app   |
| `SUPABASE_URL`            | Supabase project URL                                   |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key                            |
| `SESSION_ENCRYPTION_KEY`  | 64 hex chars — must match Next.js app                  |
| `HEADLESS`                | `true` for headless, `false` to see the browser        |

## Running

```bash
# Development (with file watching)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:4000`.

## API Endpoints

### GET /api/health

Health check. No authentication required.

```bash
curl http://localhost:4000/api/health
```

### POST /api/post

Execute a post on a social media platform. Requires authentication.

```bash
curl -X POST http://localhost:4000/api/post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -d '{
    "postId": "uuid",
    "projectId": "uuid",
    "platform": "facebook",
    "content": "Hello World!",
    "title": null,
    "hashtags": ["marketing", "social"],
    "mediaUrls": [],
    "articleUrl": null,
    "contentType": "regular",
    "cookies": "{decrypted cookies JSON}"
  }'
```

### POST /api/connect

Open a browser for manual login and capture session cookies.

```bash
curl -X POST http://localhost:4000/api/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -d '{
    "platform": "facebook",
    "projectId": "uuid"
  }'
```

This opens a visible browser window. Log in manually, and the service will capture and encrypt the cookies automatically.

## Architecture

```
src/
├── server.ts              # Express server + routes
├── middleware/
│   └── auth.ts            # API key authentication
├── executors/
│   ├── facebook.ts        # Facebook posting logic
│   ├── instagram.ts       # Instagram posting logic
│   └── tiktok.ts          # TikTok posting logic
├── lib/
│   ├── human-like.ts      # Random delays, slow typing, natural mouse movement
│   ├── screenshot.ts      # Screenshot capture + Supabase Storage upload
│   └── supabase.ts        # Supabase client for post results
└── types.ts               # Shared TypeScript types
```

## Platform Selectors

Social media platforms frequently change their DOM structure. If posting fails, check and update the CSS selectors in the executor files. Key areas marked with `TODO` comments.

## Integration with Next.js App

The Next.js app calls this service via:
- `VPS_API_URL` env var (e.g., `http://localhost:4000`)
- `VPS_API_SECRET` env var for authentication

The cron job at `/api/cron/check-schedule` and manual execute at `/api/posts/execute` both call `POST /api/post` on this service.

## Moving to VPS

When ready for production:

1. Deploy this service to a VPS
2. Set up PM2 for process management
3. Configure Nginx as reverse proxy with SSL
4. Update `VPS_API_URL` in the Next.js app to point to the VPS
5. Set `HEADLESS=true` on the VPS
