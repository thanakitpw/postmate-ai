"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Hash,
  ImageIcon,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Post, InsertDto } from "@/types/database";

// ─── Types ─────────────────────────────────────────────

interface GeneratedPost {
  title: string;
  caption: string;
  hashtags: string[];
  tags: string[];
  image_prompt_th: string;
  image_prompt_en: string;
  image_ratio: string;
  content_type: string;
}

interface AiPanelProps {
  projectId: string;
  platform: "facebook" | "instagram" | "tiktok";
  prefillDate: Date | null;
  onSaved: (post: Post) => void;
  onClose: () => void;
}

// ─── Constants ─────────────────────────────────────────

const SERIES_OPTIONS = [
  { value: "single", label: "โพสต์เดี่ยว" },
  { value: "3", label: "Series 3 วัน" },
  { value: "5", label: "Series 5 วัน" },
  { value: "7", label: "Series 7 วัน" },
];

const LANGUAGE_OPTIONS = [
  { value: "default", label: "ตามโปรเจค" },
  { value: "TH", label: "ไทย" },
  { value: "EN", label: "อังกฤษ" },
  { value: "Both", label: "ทั้งสองภาษา" },
];

const TAG_COLORS: Record<string, string> = {
  promotion: "bg-orange-50 text-orange-700 border-orange-200",
  education: "bg-green-50 text-green-700 border-green-200",
  engagement: "bg-violet-50 text-violet-700 border-violet-200",
  branding: "bg-amber-50 text-amber-700 border-amber-200",
  seasonal: "bg-red-50 text-red-700 border-red-200",
  testimonial: "bg-teal-50 text-teal-700 border-teal-200",
};

// ─── Component ─────────────────────────────────────────

export function AiPanel({
  projectId,
  platform,
  prefillDate,
  onSaved,
  onClose,
}: AiPanelProps) {
  // Input state
  const [topic, setTopic] = useState("");
  const [type, setType] = useState<string>("single");
  const [language, setLanguage] = useState("default");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // ─── Generate ─────────────────────────────────────────

  async function handleGenerate() {
    if (!topic.trim()) {
      setError("กรุณากรอกหัวข้อหรือ brief");
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedPosts([]);

    try {
      const isSeries = type !== "single";
      const seriesCount = isSeries ? parseInt(type, 10) : undefined;

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          topic: topic.trim(),
          type: isSeries ? "series" : "single",
          seriesCount,
          language: language === "default" ? undefined : language,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error || "Failed to generate");
      }

      const data = (await response.json()) as { posts: GeneratedPost[] };
      setGeneratedPosts(data.posts);

      // Auto-expand first post
      if (data.posts.length > 0) {
        setExpandedIndex(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setGenerating(false);
    }
  }

  // ─── Regenerate ───────────────────────────────────────

  async function handleRegenerate() {
    await handleGenerate();
  }

  // ─── Edit caption ─────────────────────────────────────

  function updateCaption(index: number, newCaption: string) {
    const updated = [...generatedPosts];
    const existing = updated[index];
    if (existing) {
      updated[index] = { ...existing, caption: newCaption };
      setGeneratedPosts(updated);
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

  // ─── Save single post ────────────────────────────────

  async function handleSavePost(index: number) {
    const post = generatedPosts[index];
    if (!post) return;
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const scheduledAt = prefillDate
        ? new Date(
            `${prefillDate.getFullYear()}-${String(prefillDate.getMonth() + 1).padStart(2, "0")}-${String(prefillDate.getDate()).padStart(2, "0")}T09:00:00`
          ).toISOString()
        : null;

      const insertData: InsertDto<"posts"> = {
        project_id: projectId,
        title: post.title ?? null,
        content: post.caption,
        hashtags: post.hashtags,
        tags: post.tags,
        content_type: post.content_type as InsertDto<"posts">["content_type"],
        image_prompt_th: post.image_prompt_th,
        image_prompt_en: post.image_prompt_en,
        image_ratio: post.image_ratio,
        scheduled_at: scheduledAt,
        status: "draft",
        created_by: "ai",
      };

      const { data, error: insertError } = await supabase
        .from("posts")
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);
      if (data) onSaved(data as Post);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกล้มเหลว");
    } finally {
      setSaving(false);
    }
  }

  // ─── Save all series ──────────────────────────────────

  async function handleSaveAll() {
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Create ai_series record
      const { data: seriesRecord, error: seriesError } = await supabase
        .from("ai_series")
        .insert({
          project_id: projectId,
          topic,
          brief: topic,
          total_posts: generatedPosts.length,
        })
        .select()
        .single();

      if (seriesError) throw new Error(seriesError.message);

      // Bulk insert posts
      const baseDate = prefillDate ?? new Date();
      const postInserts: InsertDto<"posts">[] = generatedPosts.map(
        (post, idx) => {
          const postDate = new Date(baseDate);
          postDate.setDate(postDate.getDate() + idx);

          return {
            project_id: projectId,
            ai_series_id: seriesRecord?.id ?? null,
            title: post.title ?? null,
            content: post.caption,
            hashtags: post.hashtags,
            tags: post.tags,
            content_type: post.content_type as InsertDto<"posts">["content_type"],
            image_prompt_th: post.image_prompt_th,
            image_prompt_en: post.image_prompt_en,
            image_ratio: post.image_ratio,
            scheduled_at: postDate.toISOString(),
            status: "draft" as const,
            created_by: "ai" as const,
          };
        }
      );

      const { data: savedPosts, error: insertError } = await supabase
        .from("posts")
        .insert(postInserts)
        .select();

      if (insertError) throw new Error(insertError.message);

      // Return first post for callback
      if (savedPosts && savedPosts.length > 0) {
        onSaved(savedPosts[0] as Post);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกล้มเหลว");
    } finally {
      setSaving(false);
    }
  }

  // ─── Render: Input Form ───────────────────────────────

  if (generatedPosts.length === 0) {
    return (
      <div className="space-y-5">
        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Topic */}
        <div className="space-y-1.5">
          <Label htmlFor="ai-topic">หัวข้อ / Brief</Label>
          <Textarea
            id="ai-topic"
            placeholder="เช่น โปรโมชั่นส่งท้ายปี, เคล็ดลับดูแลผิวหน้าฤดูร้อน..."
            value={topic}
            onChange={(e) => setTopic((e.target as HTMLTextAreaElement).value)}
            className="min-h-[80px]"
          />
        </div>

        {/* Type selector */}
        <div className="space-y-1.5">
          <Label>รูปแบบ</Label>
          <div className="flex flex-wrap gap-1.5">
            {SERIES_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={type === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setType(opt.value)}
                className={cn(
                  type === opt.value
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : ""
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Language override */}
        <div className="space-y-1.5">
          <Label>ภาษา</Label>
          <Select value={language} onValueChange={(val) => { if (val) setLanguage(val); }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Generate button */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={generating || !topic.trim()}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {generating ? "กำลังสร้าง..." : "สร้างด้วย AI"}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Render: Results ──────────────────────────────────

  const isSeries = generatedPosts.length > 1;

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          {isSeries
            ? `สร้าง ${generatedPosts.length} โพสต์สำเร็จ`
            : "สร้างโพสต์สำเร็จ"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={generating}
          className="gap-1.5"
        >
          {generating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          สร้างใหม่
        </Button>
      </div>

      {/* Post cards */}
      {generatedPosts.map((post, index) => {
        const isExpanded = expandedIndex === index;
        return (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white"
          >
            {/* Card header */}
            <button
              type="button"
              onClick={() =>
                setExpandedIndex(isExpanded ? null : index)
              }
              className="flex w-full items-center justify-between p-3 text-left"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {isSeries && (
                  <span className="shrink-0 text-xs font-medium text-gray-400">
                    #{index + 1}
                  </span>
                )}
                <p className="truncate text-sm font-medium text-gray-900">
                  {post.title || post.caption.slice(0, 50)}
                </p>
              </div>
              {isExpanded ? (
                <ChevronUp className="size-4 shrink-0 text-gray-400" />
              ) : (
                <ChevronDown className="size-4 shrink-0 text-gray-400" />
              )}
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-gray-100 p-3 space-y-3">
                {/* Editable caption */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">
                    เนื้อหา
                  </label>
                  <Textarea
                    value={post.caption}
                    onChange={(e) =>
                      updateCaption(
                        index,
                        (e.target as HTMLTextAreaElement).value
                      )
                    }
                    className="min-h-[100px] text-sm"
                  />
                </div>

                {/* Hashtags */}
                {post.hashtags.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Hash className="size-3 text-gray-400" />
                      <span className="text-xs text-gray-500">แฮชแท็ก</span>
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

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {post.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className={cn("text-xs", TAG_COLORS[tag])}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Image Prompt */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <ImageIcon className="size-3 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">
                      Image Prompt
                    </span>
                  </div>

                  {/* TH */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">TH</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1"
                        onClick={() =>
                          copyToClipboard(
                            post.image_prompt_th,
                            `th_${index}`
                          )
                        }
                      >
                        {copiedField === `th_${index}` ? (
                          <Check className="size-3 text-green-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>
                    <p className="rounded bg-gray-50 p-2 text-xs text-gray-700">
                      {post.image_prompt_th}
                    </p>
                  </div>

                  {/* EN */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">EN</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1"
                        onClick={() =>
                          copyToClipboard(
                            post.image_prompt_en,
                            `en_${index}`
                          )
                        }
                      >
                        {copiedField === `en_${index}` ? (
                          <Check className="size-3 text-green-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>
                    <p className="rounded bg-gray-50 p-2 text-xs text-gray-700">
                      {post.image_prompt_en}
                    </p>
                  </div>

                  {/* Ratio */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">สัดส่วน</span>
                    <Badge variant="outline" className="text-xs">
                      {post.image_ratio}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Save single */}
                {!isSeries && (
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onClose}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSavePost(index)}
                      disabled={saving}
                      className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                    >
                      {saving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Save className="size-3.5" />
                      )}
                      บันทึกโพสต์
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Series save all */}
      {isSeries && (
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveAll}
            disabled={saving}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            บันทึกทั้ง {generatedPosts.length} โพสต์
          </Button>
        </div>
      )}
    </div>
  );
}
