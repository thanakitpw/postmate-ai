"use client";

import { useState } from "react";
import {
  Save,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  ImageIcon,
  Hash,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { MonthlyPlanGeneratedPost } from "@/lib/ai/monthly-plan";
import type { InsertDto } from "@/types/database";

// ─── Constants ─────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
  promotion: "bg-orange-50 text-orange-700 border-orange-200",
  education: "bg-green-50 text-green-700 border-green-200",
  engagement: "bg-violet-50 text-violet-700 border-violet-200",
  branding: "bg-amber-50 text-amber-700 border-amber-200",
  seasonal: "bg-red-50 text-red-700 border-red-200",
  testimonial: "bg-teal-50 text-teal-700 border-teal-200",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  regular_post: "โพสต์ปกติ",
  article_share: "แชร์บทความ",
  promotion: "โปรโมชั่น",
  engagement: "สร้างปฏิสัมพันธ์",
  repost: "รีโพสต์",
};

// ─── Types ─────────────────────────────────────────────

interface PlanPreviewProps {
  posts: MonthlyPlanGeneratedPost[];
  projectId: string;
  planMonth: string;
  onPostsChange: (posts: MonthlyPlanGeneratedPost[]) => void;
  onRegeneratePost: (index: number) => void;
  regeneratingIndex: number | null;
  onSaved: () => void;
}

// ─── Component ─────────────────────────────────────────

export function PlanPreview({
  posts,
  projectId,
  planMonth,
  onPostsChange,
  onRegeneratePost,
  regeneratingIndex,
  onSaved,
}: PlanPreviewProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  // ─── Toggle card expansion ────────────────────────────

  function toggleCard(index: number) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  // ─── Edit caption ─────────────────────────────────────

  function updateCaption(index: number, newCaption: string) {
    const updated = [...posts];
    const existing = updated[index];
    if (existing) {
      updated[index] = { ...existing, caption: newCaption };
      onPostsChange(updated);
    }
  }

  // ─── Copy to clipboard ────────────────────────────────

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Silently fail
    }
  }

  // ─── Save all to calendar ─────────────────────────────

  async function handleSaveAll() {
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Create monthly plan config record
      const [yearStr, monthStr] = planMonth.split("-");
      const planMonthDate = `${yearStr}-${monthStr}-01`;

      const { data: planConfig, error: configError } = await supabase
        .from("monthly_plan_configs")
        .upsert(
          {
            project_id: projectId,
            plan_month: planMonthDate,
            active_days: [],
            default_posts_per_day: 1,
            status: "saved" as const,
          },
          { onConflict: "project_id,plan_month" }
        )
        .select()
        .single();

      if (configError) throw new Error(configError.message);

      // Bulk insert posts
      const postInserts: InsertDto<"posts">[] = posts.map((post) => ({
        project_id: projectId,
        monthly_plan_id: planConfig?.id ?? null,
        title: post.title || null,
        content: post.caption,
        hashtags: post.hashtags,
        tags: post.tags,
        content_type: post.content_type as InsertDto<"posts">["content_type"],
        image_prompt_th: post.image_prompt_th,
        image_prompt_en: post.image_prompt_en,
        image_ratio: post.image_ratio,
        scheduled_at: new Date(`${post.date}T09:00:00`).toISOString(),
        status: "draft" as const,
        created_by: "ai_monthly_plan" as const,
      }));

      const { error: insertError } = await supabase
        .from("posts")
        .insert(postInserts);

      if (insertError) throw new Error(insertError.message);

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกล้มเหลว");
    } finally {
      setSaving(false);
    }
  }

  // ─── Group posts by date ──────────────────────────────

  const postsByDate = posts.reduce<Record<string, { post: MonthlyPlanGeneratedPost; originalIndex: number }[]>>(
    (acc, post, idx) => {
      if (!acc[post.date]) acc[post.date] = [];
      acc[post.date]!.push({ post, originalIndex: idx });
      return acc;
    },
    {}
  );

  const sortedDates = Object.keys(postsByDate).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-green-50">
            <Calendar className="size-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              ตัวอย่างแผนรายเดือน
            </h2>
            <p className="text-sm text-gray-500">
              {posts.length} โพสต์ใน {sortedDates.length} วัน
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSaveAll}
          disabled={saving || posts.length === 0}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? "กำลังบันทึก..." : "บันทึกทั้งหมดลงปฏิทิน"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Posts grouped by date */}
      {sortedDates.map((date) => {
        const dateObj = new Date(date + "T00:00:00");
        const dateLabel = dateObj.toLocaleDateString("th-TH", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });

        return (
          <div key={date} className="space-y-3">
            {/* Date header */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-sm font-medium text-gray-500">
                {dateLabel}
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Slot cards */}
            {(postsByDate[date] ?? []).map(({ post, originalIndex }) => {
              const isExpanded = expandedCards.has(originalIndex);
              const isRegenerating = regeneratingIndex === originalIndex;

              return (
                <div
                  key={originalIndex}
                  className={cn(
                    "rounded-xl border border-gray-200 bg-white transition-shadow",
                    isExpanded && "shadow-md"
                  )}
                >
                  {/* Card header - always visible */}
                  <button
                    type="button"
                    onClick={() => toggleCard(originalIndex)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="shrink-0 text-xs font-medium text-gray-400">
                        #{originalIndex + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {post.title || post.caption.slice(0, 60)}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge
                            variant="outline"
                            className="text-xs"
                          >
                            {CONTENT_TYPE_LABELS[post.content_type] ?? post.content_type}
                          </Badge>
                          {post.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className={cn("text-xs", TAG_COLORS[tag])}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="size-4 shrink-0 text-gray-400" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0 text-gray-400" />
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-4">
                      {/* Editable caption */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500">
                          เนื้อหา
                        </label>
                        <Textarea
                          value={post.caption}
                          onChange={(e) =>
                            updateCaption(
                              originalIndex,
                              (e.target as HTMLTextAreaElement).value
                            )
                          }
                          className="min-h-[100px] text-sm"
                        />
                      </div>

                      {/* Hashtags */}
                      {post.hashtags.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Hash className="size-3.5 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500">
                              แฮชแท็ก
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {post.hashtags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="bg-indigo-50 text-indigo-700 text-xs"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Image Prompt */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="size-3.5 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">
                            Image Prompt
                          </span>
                        </div>

                        {/* Thai */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">TH</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() =>
                                copyToClipboard(
                                  post.image_prompt_th,
                                  `th_${originalIndex}`
                                )
                              }
                            >
                              {copiedField === `th_${originalIndex}` ? (
                                <Check className="size-3 text-green-500" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </Button>
                          </div>
                          <p className="rounded-md bg-gray-50 p-2 text-xs text-gray-700">
                            {post.image_prompt_th}
                          </p>
                        </div>

                        {/* English */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">EN</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() =>
                                copyToClipboard(
                                  post.image_prompt_en,
                                  `en_${originalIndex}`
                                )
                              }
                            >
                              {copiedField === `en_${originalIndex}` ? (
                                <Check className="size-3 text-green-500" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </Button>
                          </div>
                          <p className="rounded-md bg-gray-50 p-2 text-xs text-gray-700">
                            {post.image_prompt_en}
                          </p>
                        </div>

                        {/* Image Ratio */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            สัดส่วนรูปภาพ
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {post.image_ratio}
                          </Badge>
                        </div>
                      </div>

                      <Separator />

                      {/* Actions */}
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onRegeneratePost(originalIndex)}
                          disabled={isRegenerating}
                          className="gap-1.5"
                        >
                          {isRegenerating ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="size-3.5" />
                          )}
                          สร้างใหม่
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
