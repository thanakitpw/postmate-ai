# Product Requirements Document (PRD)
# PostMate AI

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Draft |
| **Owner** | Best Solutions Corp |
| **Product** | PostMate AI |
| **Updated** | มีนาคม 2026 |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Personas](#3-user-personas)
4. [Core Concept & Project Structure](#4-core-concept--project-structure)
5. [Features](#5-features)
6. [Platform Support](#6-platform-support)
7. [Auto-Post Architecture](#7-auto-post-architecture)
8. [Data Model](#8-data-model)
9. [Tech Stack](#9-tech-stack)
10. [Screen & Navigation Map](#10-screen--navigation-map)
11. [AI Content System](#11-ai-content-system)
12. [Security & Compliance](#12-security--compliance)
13. [Meta API Roadmap](#13-meta-api-roadmap)
14. [Build Phases](#14-build-phases)
15. [Task List](#15-task-list)
16. [Open Questions](#16-open-questions)
17. [Infrastructure — VPS](#17-infrastructure--vps)

---

## 1. Overview

**PostMate AI** คือแพลตฟอร์ม SaaS สำหรับเอเจนซี่และ SME ในการวางแผน สร้าง และตั้งเวลาโพสต์ Social Media แบบ multi-client โดยมี AI ช่วยสร้าง content พร้อมวางแผนรายเดือนอัตโนมัติ และระบบ auto-post ผ่าน Playwright บน VPS ส่วนตัว

### Problem Statement

เอเจนซี่ดิจิทัลและ SME ที่ดูแลหลาย Facebook Page / Instagram / TikTok พร้อมกัน ต้องเสียเวลาสลับแอปและจัดการ content แบบกระจัดกระจาย ทำให้ posting ไม่สม่ำเสมอ content ไม่สอดคล้องกับ brand voice และเสียเวลา manual มาก

### Solution

ระบบเดียวที่รวม content planning, AI monthly plan generation, scheduling และ auto-posting ไว้ในที่เดียว โดยแยก project ต่อ page และมีระบบ login สำหรับ multi-user

---

## 2. Goals & Success Metrics

### Business Goals

| Goal | Metric | Target (Phase 1) |
|---|---|---|
| ลด manual work ของ agency | เวลาต่อ client/สัปดาห์ | ลดจาก 5h → 1h |
| เพิ่ม posting consistency | % โพสต์ที่ตรงเวลา | > 95% |
| รองรับ multi-client | จำนวน active projects | 10–20 projects |
| ใช้ AI ช่วย content | % โพสต์ที่ใช้ AI generate | > 60% |

### Phase Goals

| Phase | Goal |
|---|---|
| Phase 1 (0–3 เดือน) | ใช้ภายใน Best Solutions ได้จริง รับลูกค้า 3–5 ราย |
| Phase 2 (3–6 เดือน) | ขาย SaaS ให้เอเจนซี่อื่น / SME มี MRR > 0 |
| Phase 3 (6–12 เดือน) | White-label, marketplace, MRR > 50,000 บาท |

---

## 3. User Personas

### Persona 1 — Agency Owner (Primary)

- **Pain point:** ดูแลลูกค้า 5–15 เจ้า แต่ละเจ้ามีหลาย page ต้องสลับ account ทุกวัน
- **ต้องการ:** ระบบเดียว dashboard เดียว login ครั้งเดียวจัดการได้ทั้งหมด
- **Tech level:** ปานกลาง ใช้ Meta Business Suite เป็น

### Persona 2 — Social Media Manager (Secondary)

- **Pain point:** เขียน caption ซ้ำๆ ทุกวัน ไม่มีระบบ approve ก่อนโพสต์
- **ต้องการ:** AI ช่วยวางแผน content รายเดือน มี calendar ภาพรวม
- **Tech level:** ต่ำ-ปานกลาง ต้องการ UI ที่ใช้งานง่าย

### Persona 3 — SME Owner (Future)

- **Pain point:** ไม่มีเวลาคิด content ทุกวัน ไม่รู้จะโพสต์อะไร
- **ต้องการ:** AI วางแผนทั้งเดือน กด approve แล้วปล่อยระบบทำงานเอง
- **Tech level:** ต่ำ ต้องการ flow ที่ง่ายมาก

---

## 4. Core Concept & Project Structure

### กฎหลัก: 1 Project = 1 Page/Account

แต่ละ Project ผูกกับ Social Media Page หรือ Account เพียง 1 อัน เช่น

```
Client: ร้านอาหาร ABC
├── Project 1 → Facebook Page: ABC สาขาสยาม
├── Project 2 → Facebook Page: ABC สาขาอโศก
├── Project 3 → Instagram: @abc_restaurant
└── Project 4 → TikTok: @abcfood

Client: คลินิกความงาม XYZ
├── Project 1 → Facebook Page: XYZ Clinic
└── Project 2 → Instagram: @xyzclinic
```

### ทำไมถึงแยก Project ต่อ Page

- **Brand Voice แยก:** แต่ละ platform และสาขามี tone ต่างกัน AI generate ได้ตรงกว่า
- **Calendar แยก:** จัดการ schedule อิสระจากกัน ไม่ปนกัน
- **Session แยก:** เชื่อม account แต่ละ platform แยกกัน ปลอดภัยกว่า
- **Analytics แยก:** วัด performance ต่อ page ได้ชัดเจน
- **Flexibility:** หยุด/เริ่ม project ใดก็ได้โดยไม่กระทบอื่น

---

## 5. Features

### 5.1 Authentication & User Management

ระบบ login สำหรับ agency owner และทีมงาน ใช้ Supabase Auth

**Login Flow:**
```
เปิด app → หน้า Login (email + password)
    ↓ สำเร็จ
Home Dashboard (เห็นเฉพาะ client/project ของตัวเอง)
```

**Roles:**

| Role | สิทธิ์ |
|---|---|
| Owner | เข้าถึงทุกอย่าง, จัดการ user, billing |
| Editor | สร้าง/แก้ไข/ลบ post, จัดการ project |
| Viewer | ดูอย่างเดียว ไม่สามารถแก้ไขได้ |

**Features:**
- Login ด้วย email + password
- Forgot password / reset password ผ่าน email
- Session คงอยู่จนกว่าจะ logout
- Owner invite Editor/Viewer เข้าทีมได้

---

### 5.2 Client Management

- สร้าง Client (ชื่อบริษัท, ผู้ติดต่อ, email, เบอร์โทร)
- Client Dashboard: รายการทุก Project พร้อมสถานะโพสต์รวม
- ดูภาพรวมทุก client ใน Home Dashboard

### 5.3 Project Management

- สร้าง Project ใต้ Client เลือก platform และกรอก Brand Profile
- แก้ไข Brand Profile ได้ตลอด
- เปิด/ปิด Project ได้ (is_active)
- ดู Project Dashboard: calendar + สถิติ

### 5.4 Brand Profile (ต่อ Project)

| Field | Type | รายละเอียด |
|---|---|---|
| project_name | text | เช่น "ABC สาขาสยาม — Facebook" |
| platform | enum | facebook / instagram / tiktok |
| page_name | text | ชื่อเพจจริง |
| business_type | text | ร้านอาหาร / คลินิก / โรงแรม / ฯลฯ |
| target_audience | text | เช่น "วัยทำงาน 25–35 ปี กรุงเทพฯ" |
| tone | enum | Professional / Friendly / Humorous / Inspirational / Urgent |
| brand_voice_notes | text | freetext อธิบาย brand เพิ่มเติม |
| language | enum | TH / EN / Both |
| website_url | text | URL เว็บไซต์ของลูกค้า (สำหรับแชร์บทความ) |

---

### 5.5 Content Calendar

- **Month View:** ภาพรวม 1 เดือน chip โพสต์แต่ละวัน
- **Week View:** รายละเอียดรายสัปดาห์ แสดง time slot
- **Chip สี:** แยกสีตาม tag (Promotion = ส้ม, Education = เขียว ฯลฯ)
- **คลิกวันว่าง:** เปิด modal สร้างโพสต์ใหม่ pre-fill วันที่
- **คลิกโพสต์:** เปิด modal แก้ไข
- **Drag & drop:** ย้ายโพสต์ระหว่างวันได้

---

### 5.6 AI Monthly Content Plan

ฟีเจอร์หลักที่ช่วยวางแผน content ทั้งเดือนอัตโนมัติ

#### Setup ก่อน Generate

ผู้ใช้กำหนดค่าต่อไปนี้ก่อน generate แผนรายเดือน:

| Setting | รายละเอียด | ตัวอย่าง |
|---|---|---|
| เดือนที่ต้องการวางแผน | เลือกเดือน + ปี | เมษายน 2026 |
| วันที่จะโพสต์ต่อสัปดาห์ | checkbox เลือกวัน (จ–อา) | จันทร์, พุธ, ศุกร์, เสาร์ |
| จำนวนโพสต์ต่อวัน (default) | ตัวเลข | 1 โพสต์/วัน |
| Override จำนวนโพสต์บางวัน | ระบุเฉพาะวัน | เสาร์ = 2 โพสต์ |
| ประเภทโพสต์ต่อ slot | เลือก content type | โพสต์ปกติ / แชร์บทความ / โปรโมชั่น |
| Theme ของเดือน | brief ภาพรวมเดือน | "เดือนสงกรานต์ เน้นความสนุก" |

#### ตัวอย่าง Schedule Config

```
สัปดาห์นี้:
  จันทร์   → 1 โพสต์ (Education)
  พุธ      → 1 โพสต์ (Engagement)
  ศุกร์    → 2 โพสต์ (Branding + แชร์บทความจากเว็บ)
  เสาร์    → 1 โพสต์ (Promotion)
  อาทิตย์  → ไม่โพสต์
```

#### AI Generate Flow

```
1. ผู้ใช้กรอก schedule config + theme ของเดือน
2. กด "Generate Monthly Plan"
3. AI วิเคราะห์ Brand Profile + config
4. AI สร้างแผนทั้งเดือน:
   - แต่ละวันมี: topic, content type, draft caption, hashtag
   - วันที่มี "แชร์บทความ": AI แนะนำ URL หรือ topic จากเว็บไซต์ลูกค้า
5. แสดงผลใน Calendar Preview (ดูภาพรวมก่อน save)
6. ผู้ใช้แก้ไข/ปรับแต่งแต่ละโพสต์ได้
7. กด "Save All to Calendar" → สร้าง posts ทั้งหมดใน Supabase
```

#### Output ของ AI Monthly Plan

แต่ละ slot ใน plan ประกอบด้วย:

```json
{
  "date": "2026-04-07",
  "slot": 1,
  "content_type": "article_share",
  "tag": "education",
  "topic": "5 เมนูอาหารไทยยอดนิยมช่วงสงกรานต์",
  "draft_caption": "...",
  "hashtags": ["#สงกรานต์", "#อาหารไทย"],
  "article_url": "https://client-website.com/blog/...",
  "posting_time": "10:00",
  "image_prompt": {
    "th": "คำอธิบายรูปภาษาไทยสำหรับ AI image generator",
    "en": "Image description in English for AI image generator"
  },
  "image_ratio": "1:1"
}
```

#### Content Types ต่อ Slot

| Type | ความหมาย | รายละเอียดเพิ่มเติม |
|---|---|---|
| `regular_post` | โพสต์รูป + caption ปกติ | - |
| `article_share` | แชร์บทความจากเว็บไซต์ลูกค้า | ต้องมี website_url ใน Brand Profile |
| `promotion` | โพสต์โปรโมชั่น/ส่วนลด | ใส่ details โปรโมชั่น |
| `engagement` | โพสต์กระตุ้น interaction | คำถาม, poll, quiz |
| `repost` | repost content เก่าที่ดี | เลือกจาก published posts |

---

### 5.7 Post Editor — 2 Modes

#### ✍️ Manual Mode

- เขียน caption เอง (textarea)
- แนบรูป/วิดีโอ (upload ด้วยตัวเอง — รองรับ jpg, png, mp4, mov)
- ใส่ URL บทความ (สำหรับ article_share)
- เพิ่ม hashtag เอง (tag input)
- ตั้งวันเวลาโพสต์ (date + time picker)
- เลือก tag: Promotion / Education / Engagement / Branding / Seasonal / Testimonial
- เลือก content type: regular / article_share / promotion / engagement / repost
- เลือก status: Draft หรือ Scheduled

#### 🤖 AI Generate Mode (Single/Series)

- กรอก Topic / Brief (textarea)
- เลือก: Single Post หรือ Content Series (3 / 5 / 7 วัน)
- Override ภาษาได้ (ดึงจาก Brand Profile เป็น default)
- กด Generate → แสดง caption + hashtag พร้อมใช้
- แก้ไขได้ก่อน save
- กด Regenerate ถ้าไม่พอใจ
- กด Save → ถ้าเป็น series สร้างหลายโพสต์ใส่ calendar พร้อมกัน

---

### 5.8 Tagging & Filtering

| Tag | สี | ความหมาย |
|---|---|---|
| Promotion | ส้ม `#F97316` | โพสต์ส่งเสริมการขาย |
| Education | เขียว `#10B981` | ให้ความรู้ / How-to |
| Engagement | ม่วง `#8B5CF6` | กระตุ้น interaction |
| Branding | เหลือง `#F59E0B` | สร้าง brand awareness |
| Seasonal | แดง `#EF4444` | เทศกาล / วันสำคัญ |
| Testimonial | เขียวเข้ม `#059669` | รีวิว / ความคิดเห็นลูกค้า |

**Filter ใน Post List:**
- Platform, Tag, Status, Content Type, Date range
- Bulk action: เปลี่ยน status, ลบ


### 5.8.5 Image & Media Handling

#### Phase 1 — User Upload (ปัจจุบัน)

- ผู้ใช้ upload รูป/วิดีโอเอง (jpg, png, mp4, mov)
- ไฟล์เก็บใน Supabase Storage
- ระบบ generate **Image Prompt** ให้สำหรับโพสต์ที่ต้องการรูป เพื่อให้ผู้ใช้นำไป generate รูปเองจาก Midjourney / DALL-E / Leonardo ฯลฯ

#### Image Prompt Generation

เมื่อสร้างโพสต์ด้วย AI (ทั้ง single, series และ monthly plan) ระบบจะ generate **Image Prompt** ควบคู่มาด้วยทุกครั้ง

**ตัวอย่าง Output:**

```json
{
  "caption": "สงกรานต์นี้มาเติมความสดชื่น...",
  "hashtags": ["#สงกรานต์", "#อาหารไทย"],
  "image_prompt": {
    "th": "ภาพอาหารไทยสีสันสดใส จานเต็ม บรรยากาศเทศกาลสงกรานต์ น้ำสาดเบา ๆ ฉากหลังร้านอาหารไทยสวยงาม แสงธรรมชาติ สไตล์ food photography",
    "en": "Vibrant Thai food photography, colorful dishes on wooden table, Songkran festival atmosphere, soft water splash, warm natural lighting, shallow depth of field, professional food photo style"
  },
  "image_ratio": "1:1",
  "image_style_note": "เหมาะสำหรับ: Midjourney / DALL-E 3 / Leonardo AI"
}
```

**Image Ratio แนะนำตาม Platform:**

| Platform | Post | Story/Reel |
|---|---|---|
| Facebook | 1:1 หรือ 16:9 | 9:16 |
| Instagram Feed | 1:1 หรือ 4:5 | 9:16 |
| TikTok | 9:16 | 9:16 |

#### Phase 2 — AI Image Generation API (อนาคต)

- เชื่อม API เช่น DALL-E 3, Midjourney API, Stable Diffusion
- กด "Generate Image" จาก prompt ที่ AI สร้างไว้
- รูปที่ได้แนบกับโพสต์ได้เลยโดยไม่ต้อง upload เอง
- เก็บ generated images ใน Supabase Storage เช่นกัน

### 5.9 Post Status Flow

```
[draft] ──── user กด Schedule ──→ [scheduled]
                                       │
                              Cron trigger ถึงเวลา
                                       │
                                  [publishing]
                                  /          \
                           สำเร็จ              ล้มเหลว
                              │                   │
                         [published]          [failed]
                                               │
                                          retry (max 3 ครั้ง)
                                               │
                                       [published] หรือ [failed_final]
```

### 5.10 Post Result Log

- ดูผลการโพสต์แต่ละครั้ง (platform_post_id, posted_at)
- Error message ถ้าล้มเหลว
- ปุ่ม Retry manual
- Export log เป็น CSV

---

## 6. Platform Support

| Platform | MVP Method | Phase 3 Method | ข้อจำกัด |
|---|---|---|---|
| 📘 Facebook Page | Playwright + Session Cookies | Meta Graph API | เฉพาะ Business Page |
| 📷 Instagram | Playwright + Session Cookies | Meta Graph API | ต้องเชื่อมกับ FB Page |
| 🎵 TikTok | Playwright + Session Cookies | TikTok Content API | Official API รับแค่วิดีโอ |

> **⚠️ Risk Note:** การใช้ Playwright โพสต์ผิด ToS ของแต่ละ platform ความเสี่ยงต่ำเมื่อโพสต์ 1–5 ครั้ง/วัน/account และใช้ session จริงของ user แนะนำยื่น Meta App Review คู่ขนาน

> **LINE OA:** ตัดออกจาก MVP — อาจเพิ่มกลับใน Phase 3

---

## 7. Auto-Post Architecture

### Flow ภาพรวม

```
Next.js App (Vercel)
    │ ผู้ใช้ login + สร้างโพสต์ + ตั้งเวลา
    ▼
Supabase (posts table, status = 'scheduled')
    │
    ▼
Vercel Cron Job (ทุก 1 นาที)
    │ ตรวจ posts ที่ scheduled_at <= now()
    │ เรียก API ไปที่ VPS
    ▼
Playwright Service (VPS ส่วนตัว)
    │ โหลด session cookies ของ project
    │ เปิด Chromium เบื้องหลัง
    │ โพสต์ content จริง
    ▼
post_results table (บันทึกผล)
    │
    ▼
Supabase Realtime → Next.js UI อัปเดตทันที
    │
    ▼
Email notification (Brevo)
```

### Session Management Flow

```
1. ผู้ใช้กด "Connect [Platform]" ใน app
2. App เปิด Chromium window บน VPS (headful mode)
3. Forward display ไปหาผู้ใช้ผ่าน noVNC หรือ screenshot stream
4. ผู้ใช้ login เอง — app ไม่เห็น password
5. หลัง login สำเร็จ → Playwright จับ cookies
6. Encrypt ด้วย AES-256-GCM
7. เก็บใน project_sessions table
8. ใช้ cookies นี้โพสต์โดยไม่ต้อง login ใหม่
9. Session หมดอายุ → แจ้งเตือน reconnect
```

### Detection Mitigation

- Random delay ระหว่าง action (800–3000ms)
- Simulate human-like typing (พิมพ์ทีละตัว ไม่ใช่ fill ทันที)
- ใช้ session จริงของ user ที่ logged-in ใน browser จริง
- โพสต์ไม่เกิน 5 ครั้ง/วัน/account
- ใช้ residential IP ของ VPS (ไม่ใช่ datacenter IP ถ้าเป็นไปได้)

---

## 8. Data Model

### Supabase Schema

```sql
-- Users (จัดการโดย Supabase Auth)
-- auth.users table (built-in)

-- User profiles
CREATE TABLE user_profiles (
  id         uuid REFERENCES auth.users(id) PRIMARY KEY,
  full_name  text,
  role       text DEFAULT 'editor' CHECK (role IN ('owner','editor','viewer')),
  created_at timestamptz DEFAULT now()
);

-- ลูกค้า
CREATE TABLE clients (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id      uuid REFERENCES auth.users(id),  -- owner ของ client นี้
  name          text NOT NULL,
  contact_name  text,
  contact_email text,
  contact_phone text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- โปรเจค (1 project = 1 page/account)
CREATE TABLE projects (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id          uuid REFERENCES clients(id) ON DELETE CASCADE,
  project_name       text NOT NULL,
  platform           text NOT NULL CHECK (platform IN ('facebook','instagram','tiktok')),
  page_name          text,
  page_id            text,
  business_type      text,
  target_audience    text,
  tone               text,
  brand_voice_notes  text,
  language           text DEFAULT 'TH',
  website_url        text,   -- สำหรับ article_share content type
  is_active          boolean DEFAULT true,
  created_at         timestamptz DEFAULT now()
);

-- Session สำหรับ auto-post
CREATE TABLE project_sessions (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id          uuid REFERENCES projects(id) ON DELETE CASCADE,
  platform            text NOT NULL,
  cookies_encrypted   text NOT NULL,   -- AES-256-GCM encrypted JSON
  expires_at          timestamptz,
  status              text DEFAULT 'active' CHECK (status IN ('active','expired','revoked')),
  created_at          timestamptz DEFAULT now()
);

-- AI Monthly Plan Config
CREATE TABLE monthly_plan_configs (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id       uuid REFERENCES projects(id) ON DELETE CASCADE,
  plan_month       date NOT NULL,         -- first day of month e.g. 2026-04-01
  active_days      int[] NOT NULL,        -- [1,3,5,6] = จันทร์,พุธ,ศุกร์,เสาร์ (0=อา,1=จ,...,6=ส)
  default_posts_per_day int DEFAULT 1,
  day_overrides    jsonb,                 -- {"6": 2} = เสาร์ = 2 โพสต์
  slot_types       jsonb,                 -- {"6_2": "article_share"} = เสาร์ slot 2 = article
  theme            text,                  -- theme ของเดือน
  status           text DEFAULT 'draft' CHECK (status IN ('draft','generated','saved')),
  created_at       timestamptz DEFAULT now()
);

-- AI Content Series
CREATE TABLE ai_series (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id       uuid REFERENCES projects(id) ON DELETE CASCADE,
  monthly_plan_id  uuid REFERENCES monthly_plan_configs(id),
  topic            text,
  brief            text,
  total_posts      int,
  created_at       timestamptz DEFAULT now()
);

-- โพสต์
CREATE TABLE posts (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id       uuid REFERENCES projects(id) ON DELETE CASCADE,
  ai_series_id     uuid REFERENCES ai_series(id),
  monthly_plan_id  uuid REFERENCES monthly_plan_configs(id),
  title            text,
  content          text NOT NULL,
  hashtags         text[],
  media_urls         text[],
  article_url        text,               -- สำหรับ article_share
  image_prompt_th    text,               -- prompt ภาษาไทยสำหรับ AI image gen
  image_prompt_en    text,               -- prompt ภาษาอังกฤษสำหรับ AI image gen
  image_ratio        text DEFAULT '1:1', -- 1:1, 4:5, 16:9, 9:16
  tags             text[],             -- promotion|education|engagement|branding|seasonal|testimonial
  content_type     text DEFAULT 'regular_post'
                   CHECK (content_type IN ('regular_post','article_share','promotion','engagement','repost')),
  scheduled_at     timestamptz,
  status           text DEFAULT 'draft'
                   CHECK (status IN ('draft','scheduled','publishing','published','failed','failed_final')),
  created_by       text DEFAULT 'manual' CHECK (created_by IN ('manual','ai','ai_monthly_plan')),
  retry_count      int DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ผลการโพสต์
CREATE TABLE post_results (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id          uuid REFERENCES posts(id) ON DELETE CASCADE,
  platform         text,
  status           text CHECK (status IN ('success','failed')),
  error_message    text,
  platform_post_id text,
  posted_at        timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_posts_scheduled   ON posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_posts_project      ON posts(project_id, scheduled_at);
CREATE INDEX idx_posts_status       ON posts(status);
CREATE INDEX idx_monthly_plan_proj  ON monthly_plan_configs(project_id, plan_month);
```

---

## 9. Tech Stack

| Layer | Technology | เหตุผล |
|---|---|---|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind | Stack หลักของ Best Solutions |
| Auth | Supabase Auth (built-in) | Email/password, session, RLS ในที่เดียว |
| Backend / DB | Supabase | DB, Realtime, Storage |
| AI Engine | Claude API via OpenRouter | Content generation, monthly plan |
| Auto-Post | Playwright (Node.js) | รัน browser จริง บน VPS |
| Scheduler | Vercel Cron Job | ฟรี, integrate กับ Next.js ตรง |
| Media Storage | Supabase Storage | เก็บไฟล์ที่ user upload เอง (Phase 1) |
| Encryption | Node.js `crypto` AES-256-GCM | Built-in |
| Hosting Frontend | Vercel | Deploy อัตโนมัติ |
| Hosting Playwright | VPS ส่วนตัว (มีอยู่แล้ว) | รัน Playwright + Chromium |
| Email | Brevo | Notification + password reset |

### Folder Structure

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx                         # Home — client list
│   │   ├── clients/
│   │   │   ├── new/page.tsx
│   │   │   └── [clientId]/
│   │   │       ├── page.tsx                 # Client dashboard
│   │   │       └── projects/new/page.tsx
│   │   └── projects/
│   │       └── [projectId]/
│   │           ├── page.tsx                 # Calendar view
│   │           ├── monthly-plan/page.tsx    # AI Monthly Plan setup
│   │           ├── posts/page.tsx           # Post list
│   │           ├── connect/page.tsx         # Platform connect
│   │           ├── logs/page.tsx            # Post result log
│   │           └── settings/page.tsx        # Brand profile
│   └── api/
│       ├── ai/
│       │   ├── generate/route.ts            # Single/Series generate
│       │   └── monthly-plan/route.ts        # Monthly plan generate
│       ├── posts/execute/route.ts           # Playwright trigger
│       └── cron/check-schedule/route.ts
├── components/
│   ├── auth/
│   ├── calendar/
│   ├── monthly-plan/
│   ├── post-modal/
│   ├── ai-panel/
│   └── ui/
├── lib/
│   ├── supabase/
│   ├── ai/
│   │   ├── prompts.ts
│   │   └── monthly-plan.ts
│   ├── playwright/
│   └── encryption.ts
└── types/
    └── database.ts
```

---

## 10. Screen & Navigation Map

```
/login  (public)
    ↓ login สำเร็จ
/ (Home — client list)
└── /clients/new
└── /clients/[id]  (Client Dashboard)
    └── /clients/[id]/projects/new
    └── /projects/[id]  (Calendar View)
        ├── Post Modal (overlay)
        │   └── AI Generate Panel
        ├── /projects/[id]/monthly-plan  (AI Monthly Plan)
        ├── /projects/[id]/posts         (Post List)
        ├── /projects/[id]/connect       (Platform Connect)
        ├── /projects/[id]/logs          (Result Log)
        └── /projects/[id]/settings      (Brand Profile)
```

| # | หน้า | Path | รายละเอียด |
|---|---|---|---|
| 0 | Login | `/login` | Email + password login |
| 1 | Home | `/` | Client grid + stats รวม |
| 2 | New Client | `/clients/new` | Form สร้าง client |
| 3 | Client Dashboard | `/clients/[id]` | Project grid + stats |
| 4 | New Project | `/clients/[id]/projects/new` | Platform + Brand Profile |
| 5 | Calendar | `/projects/[id]` | Month/Week view |
| 6 | Post Modal | (overlay) | Manual / AI generate |
| 7 | AI Monthly Plan | `/projects/[id]/monthly-plan` | Config + generate + preview |
| 8 | Post List | `/projects/[id]/posts` | Table + filter |
| 9 | Platform Connect | `/projects/[id]/connect` | Login session |
| 10 | Result Log | `/projects/[id]/logs` | Post results |
| 11 | Settings | `/projects/[id]/settings` | Brand profile edit |

---

## 11. AI Content System

### System Prompt — Single/Series Post

```
You are a social media content creator for {business_type}.

Brand Profile:
- Target Audience: {target_audience}
- Tone: {tone}
- Brand Voice: {brand_voice_notes}
- Language: {language}
- Platform: {platform}

Platform Guidelines:
{platform_specific_guidelines}

Task:
Generate {count} social media post(s) about: {topic}
{series_instruction}

Also generate an image_prompt for each post — a visual description suitable for AI image generators (Midjourney / DALL-E 3).

Output ONLY valid JSON (no markdown, no preamble):
{
  "posts": [
    {
      "caption": "...",
      "hashtags": ["..."],
      "posting_note": "...",
      "image_prompt": {
        "th": "คำอธิบายรูปภาษาไทยสำหรับ AI image generator",
        "en": "Image description in English for Midjourney / DALL-E"
      },
      "image_ratio": "1:1"
    }
  ]
}
```

### System Prompt — Monthly Plan

```
You are a social media content strategist for {business_type}.

Brand Profile:
- Target Audience: {target_audience}
- Tone: {tone}
- Brand Voice: {brand_voice_notes}
- Language: {language}
- Platform: {platform}
- Website: {website_url}

Monthly Theme: {theme}
Month: {month_name} {year}

Schedule Config:
{schedule_config_json}

Task:
Create a complete monthly content plan. For each post slot, provide:
- A specific topic relevant to the business and season
- A draft caption matching brand voice
- Relevant hashtags for the platform
- For article_share slots: suggest a URL path or blog topic from {website_url}

Output ONLY valid JSON array — one object per post slot:
[
  {
    "date": "YYYY-MM-DD",
    "slot": 1,
    "content_type": "regular_post|article_share|promotion|engagement|repost",
    "tag": "promotion|education|engagement|branding|seasonal|testimonial",
    "topic": "...",
    "draft_caption": "...",
    "hashtags": ["..."],
    "article_url": "... or null",
    "posting_time": "HH:MM",
    "image_prompt": {
      "th": "คำอธิบายรูปภาษาไทยสำหรับ AI image generator",
      "en": "Image description in English for Midjourney / DALL-E"
    },
    "image_ratio": "1:1"
  }
]
```

### Platform Caption Guidelines

| Platform | Caption length | Hashtags | Style |
|---|---|---|---|
| Facebook | 100–300 คำ | 3–5 tags | Storytelling, CTA ชัดเจน |
| Instagram | 50–150 คำ | 10–15 tags | Hook บรรทัดแรก, emoji, line break |
| TikTok | 50–100 คำ | 5–8 tags | Hook 3 วิแรก, casual, กระชับ |

---

## 12. Security & Compliance

### Authentication (Supabase Auth)

- Email + password login
- JWT token จัดการโดย Supabase อัตโนมัติ
- RLS (Row Level Security) ทุก table — user เห็นเฉพาะข้อมูลของตัวเอง
- Password reset ผ่าน email

### Session Security (Playwright Cookies)

| วิธี | Security | แนะนำ |
|---|---|---|
| เก็บ Password | ❌ อันตราย | ❌ ห้ามทำ |
| Session Cookies (AES-256-GCM) | ✅ | ✅ MVP |
| Meta Official OAuth | ✅✅ | Phase 3 |

```typescript
// AES-256-GCM encryption
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.SESSION_ENCRYPTION_KEY!, 'hex') // 32 bytes

export function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    tag: authTag.toString('hex')
  })
}
```

### PDPA Compliance

- เก็บเฉพาะ session token ไม่เก็บ credential
- ลูกค้า login เองผ่าน browser จริง
- มี consent ก่อน connect แต่ละ platform
- ลูกค้า revoke session ได้ตลอดเวลา
- Right to Erasure: ลบ client/project ลบข้อมูลทั้งหมด (CASCADE)

---

## 13. Meta API Roadmap

ยื่น Meta App Review คู่ขนานตั้งแต่ Phase 1 (ใช้เวลา 2–6 สัปดาห์)

| Permission | ใช้ทำอะไร |
|---|---|
| `pages_manage_posts` | โพสต์ไปยัง Facebook Page |
| `pages_read_engagement` | อ่านข้อมูล engagement |
| `instagram_basic` | เข้าถึง Instagram Business Account |
| `instagram_content_publish` | โพสต์รูป/วิดีโอไปยัง Instagram |

### App Review Checklist

- [ ] สร้าง Meta Developer Account
- [ ] สร้าง Meta App (Business type)
- [ ] อัดวิดีโอ demo การทำงานจริงต่อแต่ละ permission
- [ ] เขียน use case description
- [ ] Submit for review
- [ ] หลังผ่าน → migrate FB + IG ออกจาก Playwright

---

## 14. Build Phases

### Phase 1 — MVP (สัปดาห์ที่ 1–7)

| สัปดาห์ | งาน |
|---|---|
| 1 | Supabase setup + Auth, Next.js project, TypeScript types |
| 2 | Login/logout flow, Client/Project CRUD |
| 3 | Calendar View (Month + Week) + Post chip |
| 4 | Post Modal — Manual mode, Media upload |
| 5 | AI Generate mode (single/series) |
| 6 | AI Monthly Plan — config UI + generate + preview |
| 7 | Post List + Filter, Bug fix, Deploy |

### Phase 2 — Auto-Post Playwright (สัปดาห์ที่ 8–11)

| สัปดาห์ | งาน |
|---|---|
| 8 | Playwright service setup บน VPS |
| 9 | Session login flow, AES-256 encryption |
| 10 | Executor: Facebook, Instagram, TikTok |
| 11 | Vercel Cron scheduler, Result logging, Retry |

### Phase 3 — Production (สัปดาห์ที่ 12–17)

| สัปดาห์ | งาน |
|---|---|
| 12 | Role management (Owner/Editor/Viewer), Team invite |
| 13 | Meta API integration (หลังผ่าน review) |
| 14 | Analytics dashboard |
| 15 | Export calendar (PDF/Excel) |
| 16 | White-label / custom domain |
| 17 | Billing (Stripe/Omise), Launch |

---

## 15. Task List

### 🔐 TASK 1 — Authentication

- [ ] 1.1 เปิด Supabase Auth (Email provider)
- [ ] 1.2 สร้าง table `user_profiles` + RLS
- [ ] 1.3 หน้า Login (`/login`) — email + password form
- [ ] 1.4 หน้า Forgot Password + Reset Password flow
- [ ] 1.5 Middleware ป้องกัน routes ที่ต้อง login
- [ ] 1.6 Logout button + clear session
- [ ] 1.7 ตั้ง Supabase Auth email template (Brevo SMTP)

---

### 🗄️ TASK 2 — Supabase Setup

- [ ] 2.1 สร้าง Supabase project
- [ ] 2.2 สร้าง tables ทั้งหมดตาม schema
- [ ] 2.3 ตั้ง RLS policies ทุก table
- [ ] 2.4 สร้าง indexes
- [ ] 2.5 สร้าง Supabase Storage bucket (media — สำหรับ user upload)
- [ ] 2.6 Seed mock data (2 clients, 4 projects, 10 posts)

---

### 🏗️ TASK 3 — Next.js Project Setup

- [ ] 3.1 สร้าง Next.js 14 project (App Router + TypeScript + Tailwind)
- [ ] 3.2 ติดตั้ง dependencies: `@supabase/supabase-js`, `@supabase/ssr`
- [ ] 3.3 ติดตั้ง UI: `shadcn/ui`, `lucide-react`
- [ ] 3.4 ติดตั้ง utilities: `date-fns`, `zustand`, `zod`
- [ ] 3.5 ตั้ง `.env.local` (Supabase, OpenRouter, Encryption key)
- [ ] 3.6 สร้าง Supabase client helper (server + client)
- [ ] 3.7 สร้าง TypeScript types จาก schema
- [ ] 3.8 ตั้ง folder structure
- [ ] 3.9 ตั้ง ESLint + Prettier

---

### 👥 TASK 4 — Client & Project Management

- [ ] 4.1 Home page — client grid
- [ ] 4.2 Form สร้าง Client ใหม่
- [ ] 4.3 Client Dashboard — project grid + stats
- [ ] 4.4 Form สร้าง Project ใหม่ (platform + Brand Profile)
- [ ] 4.5 Brand Profile edit page
- [ ] 4.6 Toggle is_active สำหรับ Project

---

### 📅 TASK 5 — Calendar View

- [ ] 5.1 Calendar Month View component
- [ ] 5.2 Calendar Week View component
- [ ] 5.3 Toggle Month/Week
- [ ] 5.4 Post Chip (สีตาม tag, แสดงเวลา + content type icon)
- [ ] 5.5 คลิกวันว่าง → Post Modal (pre-fill date)
- [ ] 5.6 คลิก Post Chip → Post Modal (edit mode)
- [ ] 5.7 Drag & drop โพสต์ระหว่างวัน

---

### 🗓️ TASK 6 — AI Monthly Plan

- [ ] 6.1 Monthly Plan page (`/projects/[id]/monthly-plan`)
- [ ] 6.2 เลือกเดือนที่ต้องการวางแผน (month picker)
- [ ] 6.3 Checkbox เลือกวันที่จะโพสต์ต่อสัปดาห์ (จ–อา)
- [ ] 6.4 Input จำนวนโพสต์ default ต่อวัน
- [ ] 6.5 Override จำนวนโพสต์แต่ละวัน (เช่น เสาร์ = 2 โพสต์)
- [ ] 6.6 เลือก content type ต่อแต่ละ slot (regular/article_share/promotion/engagement)
- [ ] 6.7 Input theme ของเดือน
- [ ] 6.8 ปุ่ม "Generate Monthly Plan" → เรียก `/api/ai/monthly-plan`
- [ ] 6.9 API route สร้าง system prompt จาก config + Brand Profile
- [ ] 6.10 Parse JSON response จาก Claude API
- [ ] 6.11 Calendar Preview — แสดงแผนทั้งเดือนก่อน save
- [ ] 6.12 แก้ไข caption แต่ละโพสต์ใน preview ได้
- [ ] 6.13 Regenerate โพสต์รายตัวได้
- [ ] 6.14 ปุ่ม "Save All to Calendar" → bulk insert posts
- [ ] 6.15 บันทึก config ใน `monthly_plan_configs`
- [ ] 6.16 แสดง image_prompt ต่อโพสต์ใน preview พร้อมปุ่ม Copy prompt
- [ ] 6.17 แสดง image_ratio แนะนำตาม platform

---

### ✍️ TASK 7 — Post Modal (Manual Mode)

- [ ] 7.1 Post Modal component (overlay)
- [ ] 7.2 Toggle Manual / AI mode
- [ ] 7.3 Caption textarea
- [ ] 7.4 Content type selector (regular/article_share/promotion/engagement/repost)
- [ ] 7.5 Article URL input (แสดงเมื่อเลือก article_share)
- [ ] 7.6 Media upload — user อัปโหลดเอง (jpg, png, mp4, mov → Supabase Storage)
- [ ] 7.6.1 แสดง image_prompt (ถ้ามี) พร้อมปุ่ม Copy — ให้ user ไป generate รูปเอง
- [ ] 7.7 Hashtag tag input
- [ ] 7.8 Tag selector
- [ ] 7.9 Date + Time picker
- [ ] 7.10 Status selector (Draft / Scheduled)
- [ ] 7.11 Save + Delete

---

### 🤖 TASK 8 — AI Generate Mode (Single/Series)

- [ ] 8.1 AI Generate panel ใน Post Modal
- [ ] 8.2 Topic / Brief input
- [ ] 8.3 เลือก Single / Series (3/5/7 วัน)
- [ ] 8.4 Language override
- [ ] 8.5 API route `/api/ai/generate`
- [ ] 8.6 System prompt ดึง Brand Profile อัตโนมัติ
- [ ] 8.7 แสดง caption + hashtag
- [ ] 8.8 Regenerate button
- [ ] 8.9 แก้ไขก่อน save
- [ ] 8.10 Save series → bulk insert + ai_series record
- [ ] 8.11 แสดง image_prompt พร้อมปุ่ม Copy prompt
- [ ] 8.12 แสดง image_ratio แนะนำ

---

### 📋 TASK 9 — Post List & Filter

- [ ] 9.1 Post List page
- [ ] 9.2 Filter: tag, status, content type, date range
- [ ] 9.3 Search by caption
- [ ] 9.4 Bulk status change
- [ ] 9.5 Bulk delete
- [ ] 9.6 Export CSV

---

### 🔗 TASK 10 — Platform Connect (Session)

- [ ] 10.1 Platform Connect page
- [ ] 10.2 แสดง session status (active/expired/not connected)
- [ ] 10.3 ปุ่ม Connect → trigger Playwright บน VPS เปิด browser
- [ ] 10.4 จับ cookies หลัง login
- [ ] 10.5 AES-256-GCM encrypt
- [ ] 10.6 บันทึกใน `project_sessions`
- [ ] 10.7 แจ้งเตือน session ใกล้หมดอายุ (7 วันล่วงหน้า)
- [ ] 10.8 Revoke session

---

### ⚙️ TASK 11 — Playwright Service (VPS)

- [ ] 11.1 ติดตั้ง Node.js + Playwright + Chromium บน VPS
- [ ] 11.2 ติดตั้ง PM2 สำหรับ process management
- [ ] 11.3 Express API server รับ request จาก Vercel
- [ ] 11.4 Playwright executor — Facebook Page
- [ ] 11.5 Playwright executor — Instagram
- [ ] 11.6 Playwright executor — TikTok
- [ ] 11.7 Human-like behavior (random delay, slow typing)
- [ ] 11.8 Article share handler (open URL + share)
- [ ] 11.9 Media upload handler
- [ ] 11.10 Error handling + screenshot on failure
- [ ] 11.11 บันทึกผลใน `post_results`
- [ ] 11.12 ตั้ง HTTPS + API key auth สำหรับ endpoint

---

### ⏰ TASK 12 — Scheduler (Vercel Cron)

- [ ] 12.1 Cron route `/api/cron/check-schedule`
- [ ] 12.2 Query posts `scheduled_at <= now()` และ `status = 'scheduled'`
- [ ] 12.3 อัปเดต status → `publishing`
- [ ] 12.4 Trigger Playwright service บน VPS
- [ ] 12.5 Retry logic (max 3 ครั้ง, exponential backoff)
- [ ] 12.6 อัปเดต status → `published` หรือ `failed_final`

---

### 📊 TASK 13 — Post Result Log

- [ ] 13.1 Log page
- [ ] 13.2 แสดง error message + retry count
- [ ] 13.3 Retry manual button
- [ ] 13.4 Link ไปโพสต์จริงบน platform (platform_post_id)
- [ ] 13.5 Export CSV

---

### 🔔 TASK 14 — Notifications

- [ ] 14.1 Email แจ้งเตือนโพสต์สำเร็จ/ล้มเหลว (Brevo)
- [ ] 14.2 Email แจ้งเตือน session ใกล้หมดอายุ
- [ ] 14.3 In-app notification bell (optional)

---

### 🚀 TASK 15 — Phase 3 (Production)

- [ ] 15.1 Role management (Owner/Editor/Viewer)
- [ ] 15.2 Team invite flow
- [ ] 15.3 Meta API integration (post-review)
- [ ] 15.4 Analytics dashboard
- [ ] 15.5 Export calendar PDF/Excel
- [ ] 15.6 White-label / custom domain
- [ ] 15.7 Billing (Stripe หรือ Omise)
- [ ] 15.8 Onboarding flow
- [ ] 15.9 Phase 2 AI Image Gen — เชื่อม DALL-E 3 / SD API ใช้ image_prompt ที่มีอยู่แล้ว

---

## 16. Open Questions

| # | หัวข้อ | ตัวเลือก | ผลกระทบ |
|---|---|---|---|
| 1 | ราคา SaaS | Per project / Per post / Monthly flat | Revenue model |
| 2 | Media storage limit | Supabase Storage free 1GB / Cloudinary | Cost + CDN |
| 9 | AI Image Generation API | DALL-E 3 / Midjourney API / Stable Diffusion | Phase 2 scope |
| 3 | Analytics | Built-in / Meta Insights API | Phase 3 scope |
| 4 | TikTok long-term | ต่อใช้ Playwright / ยื่น API | Risk + roadmap |
| 5 | Offline/schedule miss | โพสต์ช้าหรือข้ามถ้า VPS down | Reliability |
| 6 | LINE OA | เพิ่มกลับใน Phase 3 หรือไม่ | Scope |
| 7 | noVNC สำหรับ session login | ใช้ noVNC / screenshot stream / อื่น | UX complexity |
| 8 | Monthly plan re-generate | generate ใหม่ทับ draft ได้หรือไม่ | UX flow |

---

## 17. Infrastructure — VPS

มี VPS อยู่แล้ว — ใช้สำหรับ Playwright Service โดยเฉพาะ

### Services ที่รันบน VPS

```
VPS
├── Playwright Service (Node.js + Express)
│   ├── รับ request จาก Vercel Cron
│   ├── รัน Chromium headless/headful
│   └── จัดการ session cookies
├── PM2 (process manager)
│   └── auto-restart on crash
└── Nginx (reverse proxy)
    └── HTTPS + API key auth
```

### Setup Checklist (VPS)

- [ ] ติดตั้ง Node.js 20 LTS
- [ ] ติดตั้ง Playwright + Chromium dependencies
- [ ] ติดตั้ง PM2
- [ ] ติดตั้ง Nginx
- [ ] ตั้ง SSL (Let's Encrypt)
- [ ] ตั้ง API key สำหรับ auth ระหว่าง Vercel ↔ VPS
- [ ] ตั้ง firewall (เปิดเฉพาะ port 443)
- [ ] ตั้ง log rotation

### Environment Variables (VPS)

```env
PORT=3001
API_SECRET_KEY=...          # shared กับ Vercel
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=... # สำหรับ update post status
SESSION_ENCRYPTION_KEY=...  # 32 bytes hex (same กับ Vercel)
```

### Vercel → VPS Communication

```typescript
// Vercel Cron เรียก VPS
await fetch(`https://vps-domain.com/api/execute`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.VPS_API_SECRET}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ post_id: post.id })
})
```

---

*Best Solutions Corp • PostMate AI PRD v1.0 • มีนาคม 2026*
