-- ─────────────────────────────────────────
-- PostMate AI — Initial Schema Migration
-- ─────────────────────────────────────────

-- ─────────────────────────────────────────
-- USER PROFILES
-- ─────────────────────────────────────────
CREATE TABLE user_profiles (
  id         uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name  text,
  role       text NOT NULL DEFAULT 'editor'
             CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ─────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────
CREATE TABLE clients (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          text NOT NULL,
  contact_name  text,
  contact_email text,
  contact_phone text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their clients"
  ON clients FOR ALL
  USING (auth.uid() = owner_id);


-- ─────────────────────────────────────────
-- PROJECTS (1 project = 1 page/account)
-- ─────────────────────────────────────────
CREATE TABLE projects (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id          uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  project_name       text NOT NULL,
  platform           text NOT NULL
                     CHECK (platform IN ('facebook', 'instagram', 'tiktok')),
  page_name          text,
  page_id            text,
  business_type      text,
  target_audience    text,
  tone               text
                     CHECK (tone IN ('Professional', 'Friendly', 'Humorous', 'Inspirational', 'Urgent')),
  brand_voice_notes  text,
  language           text DEFAULT 'TH'
                     CHECK (language IN ('TH', 'EN', 'Both')),
  website_url        text,
  is_active          boolean DEFAULT true,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage projects of their clients"
  ON projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = projects.client_id
      AND clients.owner_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────
-- PROJECT SESSIONS (Playwright cookies)
-- ─────────────────────────────────────────
CREATE TABLE project_sessions (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id          uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  platform            text NOT NULL
                      CHECK (platform IN ('facebook', 'instagram', 'tiktok')),
  cookies_encrypted   text NOT NULL,   -- AES-256-GCM encrypted JSON string
  expires_at          timestamptz,
  status              text DEFAULT 'active'
                      CHECK (status IN ('active', 'expired', 'revoked')),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE project_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sessions of their projects"
  ON project_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = project_sessions.project_id
      AND clients.owner_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────
-- MONTHLY PLAN CONFIGS
-- ─────────────────────────────────────────
CREATE TABLE monthly_plan_configs (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id            uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  plan_month            date NOT NULL,       -- first day of month e.g. 2026-04-01
  active_days           int[] NOT NULL,      -- [1,3,5,6] = Mon,Wed,Fri,Sat (0=Sun,1=Mon,...,6=Sat)
  default_posts_per_day int DEFAULT 1,
  day_overrides         jsonb DEFAULT '{}',  -- {"6": 2} = Saturday 2 posts
  slot_types            jsonb DEFAULT '{}',  -- {"6_2": "article_share"}
  theme                 text,
  status                text DEFAULT 'draft'
                        CHECK (status IN ('draft', 'generated', 'saved')),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE (project_id, plan_month)
);

ALTER TABLE monthly_plan_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage monthly plans of their projects"
  ON monthly_plan_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = monthly_plan_configs.project_id
      AND clients.owner_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────
-- AI SERIES
-- ─────────────────────────────────────────
CREATE TABLE ai_series (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id       uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  monthly_plan_id  uuid REFERENCES monthly_plan_configs(id) ON DELETE SET NULL,
  topic            text,
  brief            text,
  total_posts      int DEFAULT 1,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE ai_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage ai_series of their projects"
  ON ai_series FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = ai_series.project_id
      AND clients.owner_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────
-- POSTS
-- ─────────────────────────────────────────
CREATE TABLE posts (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id        uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  ai_series_id      uuid REFERENCES ai_series(id) ON DELETE SET NULL,
  monthly_plan_id   uuid REFERENCES monthly_plan_configs(id) ON DELETE SET NULL,

  -- Content
  title             text,
  content           text NOT NULL,
  hashtags          text[] DEFAULT '{}',
  media_urls        text[] DEFAULT '{}',      -- Supabase Storage URLs (user upload)
  article_url       text,                     -- for article_share type

  -- AI Image
  image_prompt_th   text,                     -- Thai prompt for AI image gen
  image_prompt_en   text,                     -- English prompt for AI image gen
  image_ratio       text DEFAULT '1:1',       -- 1:1 | 4:5 | 16:9 | 9:16

  -- Classification
  tags              text[] DEFAULT '{}',
                    -- promotion|education|engagement|branding|seasonal|testimonial
  content_type      text DEFAULT 'regular_post'
                    CHECK (content_type IN (
                      'regular_post', 'article_share',
                      'promotion', 'engagement', 'repost'
                    )),

  -- Scheduling
  scheduled_at      timestamptz,
  status            text DEFAULT 'draft'
                    CHECK (status IN (
                      'draft', 'scheduled', 'publishing',
                      'published', 'failed', 'failed_final'
                    )),

  -- Metadata
  created_by        text DEFAULT 'manual'
                    CHECK (created_by IN ('manual', 'ai', 'ai_monthly_plan')),
  retry_count       int DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage posts of their projects"
  ON posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.id = posts.project_id
      AND clients.owner_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_posts_scheduled   ON posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_posts_project_date ON posts(project_id, scheduled_at);
CREATE INDEX idx_posts_status       ON posts(status);
CREATE INDEX idx_posts_monthly_plan ON posts(monthly_plan_id);


-- ─────────────────────────────────────────
-- POST RESULTS
-- ─────────────────────────────────────────
CREATE TABLE post_results (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id          uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  platform         text NOT NULL,
  status           text NOT NULL CHECK (status IN ('success', 'failed')),
  error_message    text,
  platform_post_id text,     -- actual post ID on the platform
  screenshot_url   text,     -- screenshot on failure (Supabase Storage)
  posted_at        timestamptz DEFAULT now()
);

ALTER TABLE post_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view results of their posts"
  ON post_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      JOIN projects ON projects.id = posts.project_id
      JOIN clients ON clients.id = projects.client_id
      WHERE posts.id = post_results.post_id
      AND clients.owner_id = auth.uid()
    )
  );

-- Service role for VPS Playwright insert results
CREATE POLICY "Service role can insert results"
  ON post_results FOR INSERT
  WITH CHECK (true);  -- restricted by service_role key


-- ─────────────────────────────────────────
-- HELPER: auto-update updated_at
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON project_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON monthly_plan_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
