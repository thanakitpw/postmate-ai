# PostMate AI -- API Routes Reference

**Updated:** March 2026

---

## Authentication

All API routes (except `/api/cron/check-schedule`) require an authenticated Supabase session via cookies. The cron route uses a `CRON_SECRET` Bearer token instead.

---

## POST /api/ai/generate

Generate a single post or a series of posts using AI.

### Request

```json
{
  "projectId": "uuid",
  "topic": "string (1-500 chars)",
  "type": "single | series",
  "seriesCount": 3,
  "language": "TH"
}
```

| Field        | Type   | Required | Description                            |
| ------------ | ------ | -------- | -------------------------------------- |
| projectId    | string | Yes      | UUID of the project                    |
| topic        | string | Yes      | Topic or brief for AI generation       |
| type         | string | Yes      | "single" or "series"                   |
| seriesCount  | number | No       | Number of posts in series (2-10)       |
| language     | string | No       | Override language (TH, EN, Both)       |

### Response (200)

```json
{
  "posts": [
    {
      "title": "string",
      "content": "string",
      "hashtags": ["string"],
      "image_prompt_th": "string",
      "image_prompt_en": "string",
      "image_ratio": "1:1",
      "tags": ["string"],
      "content_type": "regular_post"
    }
  ]
}
```

### Errors

| Status | Description                        |
| ------ | ---------------------------------- |
| 400    | Validation failed (Zod)           |
| 401    | Unauthorized                       |
| 403    | Not project owner                  |
| 404    | Project not found                  |
| 500    | AI generation error                |

---

## POST /api/ai/monthly-plan

Generate a full month of posts based on configuration.

### Request

```json
{
  "projectId": "uuid",
  "month": "2026-04",
  "activeDays": [1, 2, 3, 4, 5],
  "defaultPostsPerDay": 1,
  "dayOverrides": { "6": 2 },
  "slotTypes": { "6_0": "promotion" },
  "theme": "Summer campaign"
}
```

| Field              | Type            | Required | Description                                |
| ------------------ | --------------- | -------- | ------------------------------------------ |
| projectId          | string          | Yes      | UUID of the project                        |
| month              | string          | Yes      | Format YYYY-MM                             |
| activeDays         | number[]        | Yes      | Days of week (0=Sun, 6=Sat), min 1         |
| defaultPostsPerDay | number          | No       | Default 1, range 1-5                       |
| dayOverrides       | Record<string, number> | No | Override post count per day of week  |
| slotTypes          | Record<string, string> | No | Content type per slot (key: dayIndex_slotIndex) |
| theme              | string or null  | No       | Monthly theme                              |

### Response (200)

```json
{
  "posts": [
    {
      "date": "2026-04-01",
      "title": "string",
      "content": "string",
      "hashtags": ["string"],
      "image_prompt_th": "string",
      "image_prompt_en": "string",
      "image_ratio": "1:1",
      "tags": ["string"],
      "content_type": "regular_post"
    }
  ]
}
```

### Errors

| Status | Description                        |
| ------ | ---------------------------------- |
| 400    | Validation failed (Zod)           |
| 401    | Unauthorized                       |
| 403    | Not project owner                  |
| 404    | Project not found                  |
| 500    | AI generation error                |

---

## POST /api/ai/analyze-brand

Analyze a brand from a Facebook page or website URL using AI.

### Request

```json
{
  "url": "https://facebook.com/example",
  "type": "facebook | website"
}
```

| Field | Type   | Required | Description                          |
| ----- | ------ | -------- | ------------------------------------ |
| url   | string | Yes      | Valid URL to analyze                 |
| type  | string | Yes      | "facebook" or "website"              |

### Response (200)

```json
{
  "result": {
    "businessType": "string",
    "targetAudience": "string",
    "tone": "string",
    "brandVoiceNotes": "string",
    "suggestedHashtags": ["string"]
  }
}
```

### Errors

| Status | Description                        |
| ------ | ---------------------------------- |
| 400    | Missing fields or invalid URL      |
| 401    | Unauthorized                       |
| 500    | Analysis error                     |

---

## GET /api/cron/check-schedule

Vercel Cron job that checks for due posts and triggers VPS Playwright service.

### Authentication

Requires `CRON_SECRET` Bearer token in Authorization header.

```
Authorization: Bearer <CRON_SECRET>
```

### Response (200)

```json
{
  "message": "Cron run complete",
  "processed": 5,
  "published": 3,
  "failed": 1,
  "skipped": 1,
  "errors": ["string"]
}
```

### Behavior

1. Queries posts with `status = 'scheduled'` and `scheduled_at <= now()`
2. Updates each post to `publishing` status (race condition guard)
3. Checks session expiry before triggering VPS
4. If VPS not configured, reverts post to `scheduled` and skips
5. In production, validates VPS_API_URL uses HTTPS
6. On success, marks post as `published`
7. On failure, retries with exponential backoff (max 3 retries)
8. After max retries, marks as `failed_final`
9. Sends email notifications on success/failure

### Errors

| Status | Description                        |
| ------ | ---------------------------------- |
| 401    | Invalid CRON_SECRET                |
| 500    | CRON_SECRET not configured or DB error |

---

## POST /api/posts/execute

Manually trigger VPS Playwright for a single post. Used for manual retry or immediate publish.

### Request

```json
{
  "postId": "uuid"
}
```

| Field  | Type   | Required | Description              |
| ------ | ------ | -------- | ------------------------ |
| postId | string | Yes      | UUID of the post         |

### Response (200)

```json
{
  "message": "Post published successfully",
  "postId": "uuid",
  "status": "published",
  "platformPostId": "string"
}
```

### Errors

| Status | Description                          |
| ------ | ------------------------------------ |
| 400    | Invalid body or disallowed status    |
| 401    | Unauthorized                         |
| 404    | Post not found                       |
| 500    | Status update failed                 |
| 502    | VPS trigger failed                   |

---

## GET /api/notifications

Returns recent notification-worthy events for the current user.

### Response (200)

```json
{
  "notifications": [
    {
      "id": "string",
      "type": "post_failed | post_published | post_pending_review | session_expiring",
      "title": "string",
      "message": "string",
      "projectId": "uuid",
      "postId": "uuid (optional)",
      "platform": "string",
      "severity": "success | warning | error",
      "createdAt": "ISO datetime"
    }
  ],
  "unreadCount": 3,
  "total": 10
}
```

### Notification Types

| Type                 | Description                           |
| -------------------- | ------------------------------------- |
| post_failed          | Post failed or reached max retries    |
| post_published       | Post published in last 24 hours       |
| post_pending_review  | Post awaiting review                  |
| session_expiring     | Session expires within 7 days         |

### Errors

| Status | Description                        |
| ------ | ---------------------------------- |
| 401    | Unauthorized                       |
| 500    | Fetch error                        |

---

_PostMate AI -- api.md v1.0 -- March 2026_
