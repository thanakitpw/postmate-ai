# CLAUDE.md — PostMate AI

## โปรเจคคืออะไร

**PostMate AI** คือ SaaS สำหรับเอเจนซี่และ SME วางแผน สร้าง และตั้งเวลาโพสต์ Social Media แบบ multi-client มี AI ช่วยสร้าง content และ auto-post ผ่าน Playwright บน VPS

**Owner:** Best Solutions Corp  
**Stack:** Next.js 14 App Router + TypeScript + Tailwind + Supabase + Claude API  
**Docs:** ดู `docs/prd.md` สำหรับ requirement ทั้งหมด

---

## Tech Stack

| Layer     | Technology                                           |
| --------- | ---------------------------------------------------- |
| Frontend  | Next.js 14 App Router, TypeScript, Tailwind CSS      |
| Auth      | Supabase Auth (email/password)                       |
| Database  | Supabase (PostgreSQL)                                |
| Storage   | Supabase Storage (media uploads)                     |
| AI        | Claude API (Anthropic direct)                        |
| Auto-Post | Playwright (Node.js) — local Mac หรือ VPS            |
| Scheduler | Vercel Cron Job                                      |
| Email     | Brevo (SMTP)                                         |
| Hosting   | Vercel (frontend) + Local/VPS (Playwright service)   |

---

## Folder Structure

```
postmate-ai/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                       # dashboard layout + auth check
│   │   ├── page.tsx                         # Home — client list
│   │   ├── clients/
│   │   │   ├── new/page.tsx
│   │   │   └── [clientId]/
│   │   │       ├── page.tsx                 # Client dashboard
│   │   │       └── projects/new/page.tsx
│   │   └── projects/
│   │       └── [projectId]/
│   │           ├── page.tsx                 # Calendar view (default)
│   │           ├── monthly-plan/page.tsx    # AI Monthly Plan
│   │           ├── posts/page.tsx           # Post list + filter
│   │           ├── connect/page.tsx         # Platform session connect
│   │           ├── logs/page.tsx            # Post result logs
│   │           └── settings/page.tsx        # Brand profile edit
│   └── api/
│       ├── ai/
│       │   ├── generate/route.ts            # Single/Series post generate
│       │   └── monthly-plan/route.ts        # Monthly plan generate
│       ├── posts/
│       │   └── execute/route.ts             # Trigger Playwright on VPS
│       └── cron/
│           └── check-schedule/route.ts      # Vercel Cron — check due posts
├── components/
│   ├── auth/                                # LoginForm, ForgotPasswordForm
│   ├── calendar/                            # CalendarMonth, CalendarWeek, PostChip
│   ├── monthly-plan/                        # PlanConfig, PlanPreview, SlotCard
│   ├── post-modal/                          # PostModal, ManualEditor, AIPanel
│   ├── clients/                             # ClientCard, ClientForm
│   ├── projects/                            # ProjectCard, ProjectForm, BrandProfileForm
│   └── ui/                                  # shadcn/ui components
├── lib/
│   ├── supabase/
│   │   ├── client.ts                        # browser client
│   │   ├── server.ts                        # server client (cookies)
│   │   └── middleware.ts
│   ├── ai/
│   │   ├── prompts.ts                       # system prompt builders
│   │   ├── generate.ts                      # single/series generator
│   │   └── monthly-plan.ts                  # monthly plan generator
│   ├── encryption.ts                        # AES-256-GCM encrypt/decrypt
│   └── utils.ts
├── types/
│   └── database.ts                          # TypeScript types จาก Supabase schema
├── docs/
│   ├── prd.md                               # PRD เต็ม
│   ├── schema.md                            # SQL schema
│   ├── tasks.md                             # Task list + progress
│   └── api.md                               # API routes reference
├── middleware.ts                            # Auth middleware (protect routes)
├── .env.example
└── CLAUDE.md                                # ไฟล์นี้
```

---

## คำสั่งที่ใช้บ่อย

```bash
# Dev
npm run dev           # รัน Next.js development server

# Build & Deploy
npm run build         # build production
npm run start         # รัน production locally

# Type Check
npm run typecheck     # tsc --noEmit

# Lint
npm run lint          # ESLint

# Supabase
npx supabase start    # รัน Supabase local
npx supabase db push  # push schema changes
npx supabase gen types typescript --local > types/database.ts  # regenerate types
```

---

## Environment Variables

ดูไฟล์ `.env.example` สำหรับทุก key ที่ต้องมี  
**ห้าม hardcode key ใดๆ ในโค้ดทุกกรณี**

Key หลักที่ต้องมีก่อนเริ่ม:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `SESSION_ENCRYPTION_KEY`
- `VPS_API_URL`
- `VPS_API_SECRET`

---

## Business Rules — ห้ามลืม

### Project Structure

- **1 Project = 1 Platform Page/Account เท่านั้น**
- Client 1 เจ้า มีได้หลาย Project
- Platform ที่รองรับ: `facebook` | `instagram` | `tiktok`

### Post Status Flow

```
draft → scheduled → publishing → published
                              ↘ failed → retry (max 3) → published | failed_final
```

### Session Security

- **ห้ามเก็บ password ของลูกค้าทุกกรณี**
- ใช้ Session Cookies เข้ารหัส AES-256-GCM เท่านั้น
- เก็บใน `project_sessions.cookies_encrypted`

### AI Output

- ทุก AI generate ต้องมี `image_prompt` (TH + EN) ควบคู่เสมอ
- Parse response เป็น JSON เสมอ — ถ้า parse ไม่ได้ให้ retry ไม่เกิน 2 ครั้ง
- Model: ใช้ Claude ผ่าน OpenRouter

### Auto-Post

- Vercel Cron เรียกทุก 1 นาที → trigger VPS Playwright service
- อัปเดต status เป็น `publishing` ก่อน trigger เสมอ (ป้องกัน duplicate)
- Retry max 3 ครั้ง exponential backoff

---

## Auth & RLS

- ทุก route ใน `(dashboard)` ต้องมี auth check ผ่าน middleware
- Supabase RLS เปิดทุก table — user เห็นเฉพาะข้อมูลของตัวเอง
- `owner_id` ใน `clients` table ผูกกับ `auth.users.id`

---

## Language

- ตอบและสื่อสารเป็น **ภาษาไทย** เสมอ
- Comment ในโค้ดใช้ภาษาอังกฤษได้

---

## UI Rules

- **ห้ามใช้ Emoji** ทุกกรณี — ใช้ SVG icon หรือ Lucide icon แทนเสมอ
- **ห้ามใช้เครื่องหมาย ":"** ใน label, heading, หรือ UI text — เช่น ใช้ "ผู้ติดต่อ" ไม่ใช่ "ผู้ติดต่อ:"

---

## Coding Conventions

- ใช้ TypeScript strict mode เสมอ — ห้าม `any`
- Component ใช้ `'use client'` เฉพาะเมื่อจำเป็น (มี state/event)
- Server Actions หรือ API Routes สำหรับ mutation ทั้งหมด
- Error handling ทุก async function ด้วย try/catch
- ตั้งชื่อ function เป็น camelCase, component เป็น PascalCase
- ไฟล์ component 1 ไฟล์ต่อ 1 component หลัก

---

## Testing — ทดสอบทุกครั้งที่มีการเปลี่ยนแปลง

**กฎ: ทุกครั้งที่เขียนโค้ดหรือแก้ไขโค้ดเสร็จ ต้องรัน test ก่อนถือว่าเสร็จ**

### Test Agents

| Agent          | หน้าที่                                                                      | ไฟล์                             |
| -------------- | ---------------------------------------------------------------------------- | -------------------------------- |
| `test-ui`      | ทดสอบ UI ด้วย Playwright — layout, user flow, responsive, accessibility      | `.claude/agents/test-ui.md`      |
| `test-backend` | ทดสอบ Backend & Database — API routes, RLS, CRUD, business logic, encryption | `.claude/agents/test-backend.md` |

### เมื่อไหร่ต้องรัน Test Agent ไหน

| เปลี่ยนแปลงอะไร                 | Agent ที่ต้องรัน                         |
| ------------------------------- | ---------------------------------------- |
| แก้ไข component / page / CSS    | `test-ui`                                |
| แก้ไข API route / server action | `test-backend`                           |
| แก้ไข database query / schema   | `test-backend`                           |
| แก้ไข lib/ utilities            | `test-backend` + `test-ui` (ถ้ากระทบ UI) |
| เพิ่ม feature ใหม่ทั้ง stack    | `test-ui` + `test-backend` ทั้งคู่       |

### วิธีเรียกใช้ Test Agent

```
# ทดสอบ UI
ใช้ agent test-ui ทดสอบหน้า [ชื่อหน้า]

# ทดสอบ Backend
ใช้ agent test-backend ทดสอบ [ชื่อ feature]
```

### Playwright Setup (ครั้งแรก)

```bash
cd .claude/skills/playwright-skill && npm run setup
```

---

## Skills ที่ติดตั้ง

Skills อยู่ที่ `.claude/skills/` — ใช้ได้เฉพาะโปรเจคนี้

### Core Development

| Skill                        | เรื่อง                              |
| ---------------------------- | ----------------------------------- |
| `nextjs-app-router-patterns` | Next.js 14 App Router patterns      |
| `nextjs-best-practices`      | Next.js best practices              |
| `nextjs-supabase-auth`       | Supabase Auth + Next.js integration |
| `react-best-practices`       | React performance + patterns        |
| `react-ui-patterns`          | Loading, error, async UI patterns   |
| `typescript-expert`          | TypeScript advanced patterns        |
| `shadcn`                     | shadcn/ui components                |
| `tailwind-patterns`          | Tailwind CSS v4 patterns            |

### Database & API

| Skill                     | เรื่อง                     |
| ------------------------- | -------------------------- |
| `postgres-best-practices` | PostgreSQL optimization    |
| `postgresql`              | PostgreSQL schema design   |
| `api-endpoint-builder`    | REST API endpoint patterns |
| `zod-validation-expert`   | Zod validation patterns    |
| `zustand-store-ts`        | Zustand state management   |

### AI & Product

| Skill                | เรื่อง                          |
| -------------------- | ------------------------------- |
| `ai-wrapper-product` | AI API wrapper product patterns |

### Testing & Quality

| Skill                  | เรื่อง                        |
| ---------------------- | ----------------------------- |
| `playwright-skill`     | Playwright browser automation |
| `testing-patterns`     | Jest + testing patterns       |
| `systematic-debugging` | Debugging methodology         |
| `security-auditor`     | Security review               |
| `vercel-deployment`    | Vercel deployment             |

### UX/UI Design

| Skill                                          | เรื่อง                                              |
| ---------------------------------------------- | --------------------------------------------------- |
| `ui-ux-pro-max`                                | UI/UX design intelligence — styles, palettes, fonts |
| `ui-ux-designer`                               | UI/UX design principles                             |
| `product-design`                               | Product design methodology                          |
| `frontend-design`                              | Frontend design patterns                            |
| `web-design-guidelines`                        | Web design best practices                           |
| `mobile-design`                                | Mobile-first design                                 |
| `stitch-ui-design`                             | UI design system                                    |
| `accessibility-compliance-accessibility-audit` | Accessibility audit (WCAG)                          |

### Content Marketing

| Skill                  | เรื่อง                     |
| ---------------------- | -------------------------- |
| `content-creator`      | Content creation           |
| `content-marketer`     | Content marketing strategy |
| `copywriting`          | Copywriting techniques     |
| `social-content`       | Social media content       |
| `social-orchestrator`  | Social media orchestration |
| `seo-content-writer`   | SEO content writing        |
| `seo-content-planner`  | SEO content planning       |
| `marketing-ideas`      | Marketing ideation         |
| `marketing-psychology` | Marketing psychology       |
| `brand-guidelines`     | Brand guideline creation   |
| `instagram`            | Instagram strategy         |

---

## References

| ไฟล์             | เนื้อหา                                        |
| ---------------- | ---------------------------------------------- |
| `docs/prd.md`    | PRD เต็ม — features, personas, architecture    |
| `docs/schema.md` | SQL schema ทุก table พร้อม RLS                 |
| `docs/tasks.md`  | Task list แบ่ง phase — อัปเดต `[x]` เมื่อเสร็จ |
| `docs/api.md`    | API routes ทั้งหมด + request/response format   |
