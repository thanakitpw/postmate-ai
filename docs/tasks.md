# PostMate AI — Task List

**Version:** 1.0  
**Updated:** มีนาคม 2026

## สัญลักษณ์

- `[ ]` ยังไม่เริ่ม
- `[~]` กำลังทำ
- `[x]` เสร็จแล้ว
- 🔴 Critical path — ต้องเสร็จก่อน task ถัดไป
- 🟡 Important — ทำในรอบนี้
- 🟢 Nice to have — ทำทีหลังได้

---

## PHASE 1 — MVP (สัปดาห์ที่ 1–7)

### 🔐 TASK 1 — Authentication

- [x] 🔴 1.1 เปิด Supabase Auth (Email provider)
- [x] 🔴 1.2 สร้าง table `user_profiles` + RLS + trigger auto-create
- [x] 🔴 1.3 หน้า Login `/login` (email + password form)
- [x] 🔴 1.4 Middleware ป้องกัน routes ที่ต้อง login (`middleware.ts`)
- [x] 🔴 1.5 Logout + clear session
- [x] 🟡 1.6 หน้า Forgot Password + Reset Password flow
- [ ] 🟡 1.7 ตั้ง Supabase Auth email template ผ่าน Brevo SMTP

---

### 🗄️ TASK 2 — Supabase Setup

- [x] 🔴 2.1 สร้าง Supabase project
- [x] 🔴 2.2 รัน schema ทั้งหมดจาก `docs/schema.md`
- [x] 🔴 2.3 ตรวจสอบ RLS ทุก table
- [x] 🔴 2.4 สร้าง Storage bucket `media` (public read, auth write)
- [x] 🔴 2.5 สร้าง Storage bucket `screenshots` (private — VPS เขียน)
- [ ] 🟡 2.6 Seed mock data (2 clients, 4 projects, 10 posts)
- [x] 🟡 2.7 Generate TypeScript types → `types/database.ts`

---

### 🏗️ TASK 3 — Next.js Project Setup

- [x] 🔴 3.1 สร้าง Next.js 14 project (App Router + TypeScript + Tailwind)
- [x] 🔴 3.2 ติดตั้ง `@supabase/supabase-js` `@supabase/ssr`
- [x] 🔴 3.3 ติดตั้ง `shadcn/ui` + config
- [x] 🔴 3.4 ติดตั้ง `lucide-react` `date-fns` `zod` `zustand`
- [x] 🔴 3.5 สร้าง `.env.local` จาก `.env.example`
- [x] 🔴 3.6 สร้าง Supabase client helper (`lib/supabase/client.ts` + `server.ts`)
- [x] 🔴 3.7 ตั้ง folder structure ตาม `CLAUDE.md`
- [x] 🟡 3.8 ตั้ง ESLint + Prettier config
- [x] 🟡 3.9 ตั้ง `tsconfig.json` strict mode

---

### 👥 TASK 4 — Client & Project Management

- [x] 🔴 4.1 Home page `/` — client grid + empty state
- [x] 🔴 4.2 Form สร้าง Client ใหม่ (validate ด้วย zod)
- [x] 🔴 4.3 Client Dashboard `/clients/[id]` — project grid + stats
- [x] 🔴 4.4 Form สร้าง Project ใหม่ (เลือก platform + Brand Profile)
- [x] 🟡 4.5 Brand Profile edit page `/projects/[id]/settings`
- [x] 🟡 4.6 Toggle `is_active` สำหรับ Project
- [x] 🟡 4.7 Delete client + confirmation dialog

---

### 📅 TASK 5 — Calendar View

- [x] 🔴 5.1 Calendar Month View component
- [x] 🔴 5.2 Post Chip component (สีตาม tag + content type icon + เวลา)
- [x] 🔴 5.3 คลิกวันว่าง → เปิด Post Modal (pre-fill date)
- [x] 🔴 5.4 คลิก Post Chip → เปิด Post Modal (edit mode)
- [x] 🟡 5.5 Calendar Week View component
- [x] 🟡 5.6 Toggle Month / Week
- [ ] 🟢 5.7 Drag & drop โพสต์ระหว่างวัน (`@dnd-kit/core`)

---

### ✍️ TASK 6 — Post Modal (Manual Mode)

- [x] 🔴 6.1 Post Modal component (overlay/drawer)
- [x] 🔴 6.2 Toggle Manual mode / AI Generate mode
- [x] 🔴 6.3 Caption textarea
- [x] 🔴 6.4 Content type selector (regular / article_share / promotion / engagement / repost)
- [x] 🔴 6.5 Article URL input (แสดงเมื่อเลือก `article_share`)
- [x] 🔴 6.6 Date + Time picker
- [x] 🔴 6.7 Status selector (Draft / Scheduled)
- [x] 🔴 6.8 Tag multi-select (Promotion, Education ฯลฯ)
- [x] 🔴 6.9 Save (create/update) + Delete
- [x] 🟡 6.10 Hashtag tag input
- [x] 🟡 6.11 Media upload (jpg, png, mp4, mov → Supabase Storage)
- [x] 🟡 6.12 แสดง `image_prompt` (TH + EN) พร้อมปุ่ม Copy
- [x] 🟡 6.13 แสดง `image_ratio` แนะนำตาม platform

---

### 🗓️ TASK 7 — AI Monthly Plan

- [x] 🔴 7.1 Monthly Plan page `/projects/[id]/monthly-plan`
- [x] 🔴 7.2 Month picker (เลือกเดือน + ปี)
- [x] 🔴 7.3 Checkbox เลือกวันโพสต์ต่อสัปดาห์ (จ–อา)
- [x] 🔴 7.4 Input จำนวนโพสต์ default ต่อวัน
- [x] 🔴 7.5 Override จำนวนโพสต์แต่ละวัน (เช่น เสาร์ = 2)
- [x] 🔴 7.6 เลือก content type ต่อแต่ละ slot
- [x] 🔴 7.7 Input theme ของเดือน
- [x] 🔴 7.8 API route `POST /api/ai/monthly-plan`
- [x] 🔴 7.9 สร้าง system prompt จาก config + Brand Profile
- [x] 🔴 7.10 Parse + validate JSON response จาก Claude API
- [x] 🔴 7.11 Calendar Preview — แสดงแผนทั้งเดือน
- [x] 🔴 7.12 ปุ่ม "Save All to Calendar" → bulk insert posts
- [x] 🟡 7.13 แก้ไข caption แต่ละโพสต์ใน preview ก่อน save
- [x] 🟡 7.14 Regenerate โพสต์รายตัว
- [x] 🟡 7.15 แสดง `image_prompt` + `image_ratio` ต่อ slot พร้อมปุ่ม Copy
- [x] 🟡 7.16 บันทึก config ใน `monthly_plan_configs`

---

### 🤖 TASK 8 — AI Generate Mode (Single / Series)

- [x] 🔴 8.1 AI Generate panel ใน Post Modal
- [x] 🔴 8.2 Topic / Brief input
- [x] 🔴 8.3 เลือก Single post หรือ Series (3 / 5 / 7 วัน)
- [x] 🔴 8.4 API route `POST /api/ai/generate`
- [x] 🔴 8.5 สร้าง system prompt ดึง Brand Profile อัตโนมัติ
- [x] 🔴 8.6 Parse + validate JSON response
- [x] 🔴 8.7 แสดง caption + hashtag + image_prompt
- [x] 🟡 8.8 Language override selector
- [x] 🟡 8.9 Regenerate button
- [x] 🟡 8.10 แก้ไข caption ก่อน save
- [x] 🟡 8.11 Save series → bulk insert + `ai_series` record

---

### 📋 TASK 9 — Post List & Filter

- [x] 🟡 9.1 Post List page `/projects/[id]/posts` (table view)
- [x] 🟡 9.2 Filter: tag, status, content type, date range
- [x] 🟡 9.3 Search by caption text
- [x] 🟡 9.4 Bulk action: เปลี่ยน status
- [x] 🟡 9.5 Bulk delete + confirmation
- [ ] 🟢 9.6 Export post list เป็น CSV

---

## PHASE 2 — Auto-Post Playwright (สัปดาห์ที่ 8–11)

### 🔗 TASK 10 — Platform Connect (Session)

- [ ] 🔴 10.1 Platform Connect page `/projects/[id]/connect`
- [ ] 🔴 10.2 แสดง session status ต่อ platform (active / expired / not connected)
- [ ] 🔴 10.3 ปุ่ม Connect → เรียก VPS เปิด browser ให้ลูกค้า login
- [ ] 🔴 10.4 VPS จับ cookies + ส่งกลับ Next.js
- [ ] 🔴 10.5 AES-256-GCM encrypt (`lib/encryption.ts`)
- [ ] 🔴 10.6 บันทึกใน `project_sessions`
- [ ] 🟡 10.7 แจ้งเตือน session ใกล้หมดอายุ (7 วันล่วงหน้า — email Brevo)
- [ ] 🟡 10.8 ปุ่ม Revoke session

---

### ⚙️ TASK 11 — Playwright Service (VPS)

- [ ] 🔴 11.1 ติดตั้ง Node.js 20 + Playwright + Chromium บน VPS
- [ ] 🔴 11.2 ติดตั้ง PM2 + Nginx + SSL (Let's Encrypt)
- [ ] 🔴 11.3 Express API server พร้อม API key auth
- [ ] 🔴 11.4 Playwright executor — Facebook Page
- [ ] 🔴 11.5 Playwright executor — Instagram
- [ ] 🔴 11.6 Playwright executor — TikTok
- [ ] 🔴 11.7 Human-like behavior (random delay 800–3000ms, slow typing)
- [ ] 🟡 11.8 Article share handler (เปิด URL + share)
- [ ] 🟡 11.9 Media upload handler (attach รูป/วิดีโอ)
- [ ] 🟡 11.10 Error handling + screenshot on failure → Supabase Storage
- [ ] 🔴 11.11 บันทึกผลใน `post_results` ผ่าน Supabase service role

---

### ⏰ TASK 12 — Scheduler (Vercel Cron)

- [ ] 🔴 12.1 Cron route `GET /api/cron/check-schedule`
- [ ] 🔴 12.2 Query posts ที่ `scheduled_at <= now()` และ `status = 'scheduled'`
- [ ] 🔴 12.3 อัปเดต status → `publishing` ก่อน trigger (ป้องกัน duplicate)
- [ ] 🔴 12.4 Trigger Playwright service บน VPS ต่อโพสต์
- [ ] 🔴 12.5 Retry logic (max 3 ครั้ง, exponential backoff)
- [ ] 🔴 12.6 อัปเดต status → `published` หรือ `failed_final`
- [ ] 🟡 12.7 ตั้ง `vercel.json` cron schedule (`"*/1 * * * *"`)

---

### 📊 TASK 13 — Post Result Log

- [ ] 🟡 13.1 Log page `/projects/[id]/logs`
- [ ] 🟡 13.2 แสดง status, error message, retry count, posted_at
- [ ] 🟡 13.3 ปุ่ม Retry manual
- [ ] 🟡 13.4 Link ไปโพสต์จริงบน platform (platform_post_id)
- [ ] 🟢 13.5 Export log เป็น CSV

---

### 🔔 TASK 14 — Notifications

- [ ] 🟡 14.1 Email แจ้งเตือนเมื่อโพสต์สำเร็จ / ล้มเหลว (Brevo)
- [ ] 🟡 14.2 Email แจ้งเตือน session ใกล้หมดอายุ
- [ ] 🟢 14.3 In-app notification bell

---

## PHASE 3 — Production (สัปดาห์ที่ 12–17)

### 🚀 TASK 15 — Production Ready

- [ ] 15.1 Role management (Owner / Editor / Viewer)
- [ ] 15.2 Team invite flow (email invite → join workspace)
- [ ] 15.3 Meta API integration หลังผ่าน App Review
- [ ] 15.4 Analytics dashboard (post count, schedule rate, error rate)
- [ ] 15.5 Export calendar เป็น PDF
- [ ] 15.6 Export calendar เป็น Excel
- [ ] 15.7 White-label / custom domain
- [ ] 15.8 Billing integration (Stripe หรือ Omise)
- [ ] 15.9 Onboarding flow สำหรับ SaaS user ใหม่
- [ ] 15.10 AI Image Generation API (DALL-E 3 / SD) ใช้ image_prompt ที่มีอยู่

---

## Progress Summary

| Phase                | Tasks  | Done   | In Progress | Remaining |
| -------------------- | ------ | ------ | ----------- | --------- |
| Phase 1 — MVP        | 57     | 54     | 0           | 3         |
| Phase 2 — Auto-Post  | 28     | 0      | 0           | 28        |
| Phase 3 — Production | 10     | 0      | 0           | 10        |
| **Total**            | **95** | **54** | **0**       | **41**    |

---

_PostMate AI • tasks.md v1.0 • มีนาคม 2026_
