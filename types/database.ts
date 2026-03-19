/**
 * PostMate AI — Supabase Database Types
 *
 * Hand-written to match docs/schema.md
 * Regenerate from live DB with:
 *   npx supabase gen types typescript --local > types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: "owner" | "editor" | "viewer";
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: "owner" | "editor" | "viewer";
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: "owner" | "editor" | "viewer";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          client_id: string;
          project_name: string;
          platform: "facebook" | "instagram" | "tiktok";
          page_name: string | null;
          page_id: string | null;
          business_type: string | null;
          target_audience: string | null;
          tone:
            | "Professional"
            | "Friendly"
            | "Humorous"
            | "Inspirational"
            | "Urgent"
            | null;
          brand_voice_notes: string | null;
          language: "TH" | "EN" | "Both";
          website_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          project_name: string;
          platform: "facebook" | "instagram" | "tiktok";
          page_name?: string | null;
          page_id?: string | null;
          business_type?: string | null;
          target_audience?: string | null;
          tone?:
            | "Professional"
            | "Friendly"
            | "Humorous"
            | "Inspirational"
            | "Urgent"
            | null;
          brand_voice_notes?: string | null;
          language?: "TH" | "EN" | "Both";
          website_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          project_name?: string;
          platform?: "facebook" | "instagram" | "tiktok";
          page_name?: string | null;
          page_id?: string | null;
          business_type?: string | null;
          target_audience?: string | null;
          tone?:
            | "Professional"
            | "Friendly"
            | "Humorous"
            | "Inspirational"
            | "Urgent"
            | null;
          brand_voice_notes?: string | null;
          language?: "TH" | "EN" | "Both";
          website_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      project_sessions: {
        Row: {
          id: string;
          project_id: string;
          platform: "facebook" | "instagram" | "tiktok";
          cookies_encrypted: string;
          expires_at: string | null;
          status: "active" | "expired" | "revoked";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          platform: "facebook" | "instagram" | "tiktok";
          cookies_encrypted: string;
          expires_at?: string | null;
          status?: "active" | "expired" | "revoked";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          platform?: "facebook" | "instagram" | "tiktok";
          cookies_encrypted?: string;
          expires_at?: string | null;
          status?: "active" | "expired" | "revoked";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_sessions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_plan_configs: {
        Row: {
          id: string;
          project_id: string;
          plan_month: string;
          active_days: number[];
          default_posts_per_day: number;
          day_overrides: Json;
          slot_types: Json;
          theme: string | null;
          status: "draft" | "generated" | "saved";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          plan_month: string;
          active_days: number[];
          default_posts_per_day?: number;
          day_overrides?: Json;
          slot_types?: Json;
          theme?: string | null;
          status?: "draft" | "generated" | "saved";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          plan_month?: string;
          active_days?: number[];
          default_posts_per_day?: number;
          day_overrides?: Json;
          slot_types?: Json;
          theme?: string | null;
          status?: "draft" | "generated" | "saved";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_plan_configs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_series: {
        Row: {
          id: string;
          project_id: string;
          monthly_plan_id: string | null;
          topic: string | null;
          brief: string | null;
          total_posts: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          monthly_plan_id?: string | null;
          topic?: string | null;
          brief?: string | null;
          total_posts?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          monthly_plan_id?: string | null;
          topic?: string | null;
          brief?: string | null;
          total_posts?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_series_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_series_monthly_plan_id_fkey";
            columns: ["monthly_plan_id"];
            isOneToOne: false;
            referencedRelation: "monthly_plan_configs";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          id: string;
          project_id: string;
          ai_series_id: string | null;
          monthly_plan_id: string | null;
          title: string | null;
          content: string;
          hashtags: string[];
          media_urls: string[];
          article_url: string | null;
          image_prompt_th: string | null;
          image_prompt_en: string | null;
          image_ratio: string;
          tags: string[];
          content_type:
            | "regular_post"
            | "article_share"
            | "promotion"
            | "engagement"
            | "repost";
          scheduled_at: string | null;
          reject_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status:
            | "draft"
            | "pending_review"
            | "approved"
            | "rejected"
            | "scheduled"
            | "publishing"
            | "published"
            | "failed"
            | "failed_final";
          created_by: "manual" | "ai" | "ai_monthly_plan";
          retry_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          ai_series_id?: string | null;
          monthly_plan_id?: string | null;
          title?: string | null;
          content: string;
          hashtags?: string[];
          media_urls?: string[];
          article_url?: string | null;
          image_prompt_th?: string | null;
          image_prompt_en?: string | null;
          image_ratio?: string;
          tags?: string[];
          content_type?:
            | "regular_post"
            | "article_share"
            | "promotion"
            | "engagement"
            | "repost";
          scheduled_at?: string | null;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?:
            | "draft"
            | "pending_review"
            | "approved"
            | "rejected"
            | "scheduled"
            | "publishing"
            | "published"
            | "failed"
            | "failed_final";
          created_by?: "manual" | "ai" | "ai_monthly_plan";
          retry_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          ai_series_id?: string | null;
          monthly_plan_id?: string | null;
          title?: string | null;
          content?: string;
          hashtags?: string[];
          media_urls?: string[];
          article_url?: string | null;
          image_prompt_th?: string | null;
          image_prompt_en?: string | null;
          image_ratio?: string;
          tags?: string[];
          content_type?:
            | "regular_post"
            | "article_share"
            | "promotion"
            | "engagement"
            | "repost";
          scheduled_at?: string | null;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?:
            | "draft"
            | "pending_review"
            | "approved"
            | "rejected"
            | "scheduled"
            | "publishing"
            | "published"
            | "failed"
            | "failed_final";
          created_by?: "manual" | "ai" | "ai_monthly_plan";
          retry_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_ai_series_id_fkey";
            columns: ["ai_series_id"];
            isOneToOne: false;
            referencedRelation: "ai_series";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_monthly_plan_id_fkey";
            columns: ["monthly_plan_id"];
            isOneToOne: false;
            referencedRelation: "monthly_plan_configs";
            referencedColumns: ["id"];
          },
        ];
      };
      post_results: {
        Row: {
          id: string;
          post_id: string;
          platform: string;
          status: "success" | "failed";
          error_message: string | null;
          platform_post_id: string | null;
          screenshot_url: string | null;
          posted_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          platform: string;
          status: "success" | "failed";
          error_message?: string | null;
          platform_post_id?: string | null;
          screenshot_url?: string | null;
          posted_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          platform?: string;
          status?: "success" | "failed";
          error_message?: string | null;
          platform_post_id?: string | null;
          screenshot_url?: string | null;
          posted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_results_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ─── Convenience aliases ──────────────────────────────

type PublicSchema = Database["public"];

export type Tables<
  T extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][T]["Row"];

export type InsertDto<
  T extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][T]["Insert"];

export type UpdateDto<
  T extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][T]["Update"];

// ─── Per-table row type shortcuts ─────────────────────

export type UserProfile = Tables<"user_profiles">;
export type Client = Tables<"clients">;
export type Project = Tables<"projects">;
export type ProjectSession = Tables<"project_sessions">;
export type MonthlyPlanConfig = Tables<"monthly_plan_configs">;
export type AiSeries = Tables<"ai_series">;
export type Post = Tables<"posts">;
export type PostResult = Tables<"post_results">;

// ─── Enum-like constants ──────────────────────────────

export const USER_ROLES = ["owner", "editor", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PLATFORMS = ["facebook", "instagram", "tiktok"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const TONES = [
  "Professional",
  "Friendly",
  "Humorous",
  "Inspirational",
  "Urgent",
] as const;
export type Tone = (typeof TONES)[number];

export const LANGUAGES = ["TH", "EN", "Both"] as const;
export type Language = (typeof LANGUAGES)[number];

export const SESSION_STATUSES = ["active", "expired", "revoked"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const PLAN_STATUSES = ["draft", "generated", "saved"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const CONTENT_TYPES = [
  "regular_post",
  "article_share",
  "promotion",
  "engagement",
  "repost",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const POST_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "failed_final",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const CREATED_BY = ["manual", "ai", "ai_monthly_plan"] as const;
export type CreatedBy = (typeof CREATED_BY)[number];

export const POST_TAGS = [
  "promotion",
  "education",
  "engagement",
  "branding",
  "seasonal",
  "testimonial",
] as const;
export type PostTag = (typeof POST_TAGS)[number];

export const IMAGE_RATIOS = ["1:1", "4:5", "16:9", "9:16"] as const;
export type ImageRatio = (typeof IMAGE_RATIOS)[number];

export const RESULT_STATUSES = ["success", "failed"] as const;
export type ResultStatus = (typeof RESULT_STATUSES)[number];
