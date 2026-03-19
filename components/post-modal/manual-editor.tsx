"use client";

import { useState, useCallback, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { format } from "date-fns";
import {
  Upload,
  X,
  Copy,
  Check,
  ImageIcon,
  Link2,
  Hash,
  Trash2,
  Loader2,
  Send,
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
import type {
  Post,
  ContentType,
  PostTag,
  PostStatus,
  ImageRatio,
  InsertDto,
  UpdateDto,
} from "@/types/database";

// ─── Constants ─────────────────────────────────────────

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: "regular_post", label: "โพสต์ปกติ" },
  { value: "article_share", label: "แชร์บทความ" },
  { value: "promotion", label: "โปรโมชั่น" },
  { value: "engagement", label: "สร้างปฏิสัมพันธ์" },
  { value: "repost", label: "รีโพสต์" },
];

const TAG_OPTIONS: { value: PostTag; label: string; color: string }[] = [
  { value: "promotion", label: "โปรโมชั่น", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "education", label: "ให้ความรู้", color: "bg-green-50 text-green-700 border-green-200" },
  { value: "engagement", label: "สร้างปฏิสัมพันธ์", color: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "branding", label: "สร้างแบรนด์", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "seasonal", label: "ตามเทศกาล", color: "bg-red-50 text-red-700 border-red-200" },
  { value: "testimonial", label: "รีวิว", color: "bg-teal-50 text-teal-700 border-teal-200" },
];

const IMAGE_RATIO_OPTIONS: { value: ImageRatio; label: string; platforms: string[] }[] = [
  { value: "1:1", label: "1:1 (สี่เหลี่ยมจัตุรัส)", platforms: ["facebook", "instagram", "tiktok"] },
  { value: "4:5", label: "4:5 (แนวตั้ง)", platforms: ["instagram", "facebook"] },
  { value: "16:9", label: "16:9 (แนวนอน)", platforms: ["facebook", "tiktok"] },
  { value: "9:16", label: "9:16 (Story/Reels)", platforms: ["instagram", "tiktok"] },
];

const PLATFORM_DEFAULT_RATIO: Record<string, ImageRatio> = {
  facebook: "16:9",
  instagram: "1:1",
  tiktok: "9:16",
};

const MAX_CAPTION_LENGTH = 2200;

// ─── Types ─────────────────────────────────────────────

interface ManualEditorProps {
  projectId: string;
  platform: "facebook" | "instagram" | "tiktok";
  post: Post | null;
  prefillDate: Date | null;
  onSaved: (post: Post) => void;
  onDeleted: (postId: string) => void;
  onClose: () => void;
}

// ─── Component ─────────────────────────────────────────

export function ManualEditor({
  projectId,
  platform,
  post,
  prefillDate,
  onSaved,
  onDeleted,
  onClose,
}: ManualEditorProps) {
  const isEditing = !!post;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [content, setContent] = useState(post?.content ?? "");
  const [title, setTitle] = useState(post?.title ?? "");
  const [contentType, setContentType] = useState<ContentType>(
    post?.content_type ?? "regular_post"
  );
  const [articleUrl, setArticleUrl] = useState(post?.article_url ?? "");
  const [scheduledDate, setScheduledDate] = useState(
    post?.scheduled_at
      ? format(new Date(post.scheduled_at), "yyyy-MM-dd")
      : prefillDate
        ? format(prefillDate, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd")
  );
  const [scheduledTime, setScheduledTime] = useState(
    post?.scheduled_at
      ? format(new Date(post.scheduled_at), "HH:mm")
      : "09:00"
  );
  const [status, setStatus] = useState<"draft" | "scheduled">(
    post?.status === "scheduled" ? "scheduled" : "draft"
  );
  const [tags, setTags] = useState<PostTag[]>(
    (post?.tags as PostTag[]) ?? []
  );
  const [hashtags, setHashtags] = useState<string[]>(post?.hashtags ?? []);
  const [hashtagInput, setHashtagInput] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>(post?.media_urls ?? []);
  const [imageRatio, setImageRatio] = useState<ImageRatio>(
    (post?.image_ratio as ImageRatio) ?? PLATFORM_DEFAULT_RATIO[platform] ?? "1:1"
  );

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Tag toggling ──────────────────────────────────────

  function toggleTag(tag: PostTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  // ─── Hashtag management ────────────────────────────────

  function addHashtag() {
    const cleaned = hashtagInput.trim().replace(/^#/, "");
    if (cleaned && !hashtags.includes(cleaned)) {
      setHashtags((prev) => [...prev, cleaned]);
    }
    setHashtagInput("");
  }

  function removeHashtag(tag: string) {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  }

  function handleHashtagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addHashtag();
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

  // ─── Media upload ──────────────────────────────────────

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const newUrls: string[] = [];

      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(path, file);

        if (uploadError) {
          throw new Error(`อัปโหลดไฟล์ล้มเหลว: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from("media")
          .getPublicUrl(path);

        newUrls.push(urlData.publicUrl);
      }

      setMediaUrls((prev) => [...prev, ...newUrls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดไฟล์ล้มเหลว");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function removeMedia(url: string) {
    setMediaUrls((prev) => prev.filter((u) => u !== url));
  }

  // ─── Save ──────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      setError("กรุณากรอกเนื้อหาโพสต์");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const scheduledAt =
        status === "scheduled"
          ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
          : null;

      if (isEditing && post) {
        const updateData: UpdateDto<"posts"> = {
          title: title || null,
          content,
          content_type: contentType,
          article_url: contentType === "article_share" ? articleUrl || null : null,
          scheduled_at: scheduledAt,
          status,
          tags,
          hashtags,
          media_urls: mediaUrls,
          image_ratio: imageRatio,
          updated_at: new Date().toISOString(),
        };

        const { data, error: updateError } = await supabase
          .from("posts")
          .update(updateData)
          .eq("id", post.id)
          .select()
          .single();

        if (updateError) throw new Error(updateError.message);
        if (data) onSaved(data as Post);
      } else {
        const insertData: InsertDto<"posts"> = {
          project_id: projectId,
          title: title || null,
          content,
          content_type: contentType,
          article_url: contentType === "article_share" ? articleUrl || null : null,
          scheduled_at: scheduledAt,
          status,
          tags,
          hashtags,
          media_urls: mediaUrls,
          image_ratio: imageRatio,
          created_by: "manual",
        };

        const { data, error: insertError } = await supabase
          .from("posts")
          .insert(insertData)
          .select()
          .single();

        if (insertError) throw new Error(insertError.message);
        if (data) onSaved(data as Post);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกล้มเหลว");
    } finally {
      setSaving(false);
    }
  }, [
    content,
    title,
    contentType,
    articleUrl,
    scheduledDate,
    scheduledTime,
    status,
    tags,
    hashtags,
    mediaUrls,
    imageRatio,
    isEditing,
    post,
    projectId,
    onSaved,
  ]);

  // ─── Submit for review ─────────────────────────────────

  const handleSubmitForReview = useCallback(async () => {
    if (!content.trim()) {
      setError("กรุณากรอกเนื้อหาโพสต์");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const scheduledAt = scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
        : null;

      if (isEditing && post) {
        const updateData: UpdateDto<"posts"> = {
          title: title || null,
          content,
          content_type: contentType,
          article_url: contentType === "article_share" ? articleUrl || null : null,
          scheduled_at: scheduledAt,
          status: "pending_review",
          tags,
          hashtags,
          media_urls: mediaUrls,
          image_ratio: imageRatio,
          reject_reason: null,
          updated_at: new Date().toISOString(),
        };

        const { data, error: updateError } = await supabase
          .from("posts")
          .update(updateData)
          .eq("id", post.id)
          .select()
          .single();

        if (updateError) throw new Error(updateError.message);
        if (data) onSaved(data as Post);
      } else {
        const insertData: InsertDto<"posts"> = {
          project_id: projectId,
          title: title || null,
          content,
          content_type: contentType,
          article_url: contentType === "article_share" ? articleUrl || null : null,
          scheduled_at: scheduledAt,
          status: "pending_review",
          tags,
          hashtags,
          media_urls: mediaUrls,
          image_ratio: imageRatio,
          created_by: "manual",
        };

        const { data, error: insertError } = await supabase
          .from("posts")
          .insert(insertData)
          .select()
          .single();

        if (insertError) throw new Error(insertError.message);
        if (data) onSaved(data as Post);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่งตรวจสอบล้มเหลว");
    } finally {
      setSaving(false);
    }
  }, [
    content,
    title,
    contentType,
    articleUrl,
    scheduledDate,
    scheduledTime,
    tags,
    hashtags,
    mediaUrls,
    imageRatio,
    isEditing,
    post,
    projectId,
    onSaved,
  ]);

  // ─── Delete ────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!post) return;

    setDeleting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (deleteError) throw new Error(deleteError.message);
      onDeleted(post.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบโพสต์ล้มเหลว");
    } finally {
      setDeleting(false);
    }
  }, [post, onDeleted]);

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="post-title">หัวข้อ</Label>
        <Input
          id="post-title"
          placeholder="หัวข้อโพสต์ (ไม่บังคับ)"
          value={title}
          onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
        />
      </div>

      {/* Caption */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="post-content">เนื้อหา</Label>
          <span
            className={cn(
              "text-xs",
              content.length > MAX_CAPTION_LENGTH
                ? "text-red-500"
                : "text-gray-400"
            )}
          >
            {content.length}/{MAX_CAPTION_LENGTH}
          </span>
        </div>
        <Textarea
          id="post-content"
          placeholder="เขียนเนื้อหาโพสต์..."
          value={content}
          onChange={(e) => setContent((e.target as HTMLTextAreaElement).value)}
          className="min-h-[120px]"
        />
      </div>

      {/* Content Type */}
      <div className="space-y-1.5">
        <Label>ประเภทเนื้อหา</Label>
        <Select value={contentType} onValueChange={(val) => setContentType(val as ContentType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Article URL (shown only for article_share) */}
      {contentType === "article_share" && (
        <div className="space-y-1.5">
          <Label htmlFor="article-url">
            <Link2 className="mr-1 inline size-3.5" />
            URL บทความ
          </Label>
          <Input
            id="article-url"
            type="url"
            placeholder="https://..."
            value={articleUrl}
            onChange={(e) => setArticleUrl((e.target as HTMLInputElement).value)}
          />
        </div>
      )}

      <Separator />

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="schedule-date">วันที่</Label>
          <Input
            id="schedule-date"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate((e.target as HTMLInputElement).value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="schedule-time">เวลา</Label>
          <Input
            id="schedule-time"
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime((e.target as HTMLInputElement).value)}
          />
        </div>
      </div>

      {/* Status toggle */}
      <div className="space-y-1.5">
        <Label>สถานะ</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={status === "draft" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus("draft")}
            className={cn(
              status === "draft"
                ? "bg-gray-700 hover:bg-gray-800"
                : ""
            )}
          >
            แบบร่าง
          </Button>
          <Button
            type="button"
            variant={status === "scheduled" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus("scheduled")}
            className={cn(
              status === "scheduled"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : ""
            )}
          >
            ตั้งเวลาโพสต์
          </Button>
        </div>
      </div>

      <Separator />

      {/* Tags */}
      <div className="space-y-1.5">
        <Label>แท็ก</Label>
        <div className="flex flex-wrap gap-1.5">
          {TAG_OPTIONS.map((opt) => {
            const selected = tags.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleTag(opt.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  selected
                    ? opt.color
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hashtags */}
      <div className="space-y-1.5">
        <Label>
          <Hash className="mr-1 inline size-3.5" />
          แฮชแท็ก
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="พิมพ์แฮชแท็กแล้วกด Enter"
            value={hashtagInput}
            onChange={(e) => setHashtagInput((e.target as HTMLInputElement).value)}
            onKeyDown={handleHashtagKeyDown}
          />
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={addHashtag}
            disabled={!hashtagInput.trim()}
          >
            เพิ่ม
          </Button>
        </div>
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {hashtags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 bg-indigo-50 text-indigo-700"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeHashtag(tag)}
                  className="ml-0.5 rounded-full hover:bg-indigo-100"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Media upload */}
      <div className="space-y-1.5">
        <Label>
          <ImageIcon className="mr-1 inline size-3.5" />
          สื่อ
        </Label>
        <div
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-6 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30",
            uploading && "pointer-events-none opacity-60"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files.length > 0 && fileInputRef.current) {
              fileInputRef.current.files = e.dataTransfer.files;
              const changeEvent = new Event("change", { bubbles: true });
              fileInputRef.current.dispatchEvent(changeEvent);
            }
          }}
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-indigo-400" />
          ) : (
            <Upload className="size-6 text-gray-400" />
          )}
          <p className="mt-2 text-sm text-gray-500">
            {uploading ? "กำลังอัปโหลด..." : "คลิกหรือลากไฟล์มาที่นี่"}
          </p>
          <p className="text-xs text-gray-400">
            JPG, PNG, MP4, MOV
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,video/mp4,video/quicktime"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Media preview */}
        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            {mediaUrls.map((url) => (
              <div key={url} className="group relative">
                <img
                  src={url}
                  alt="Media preview"
                  className="aspect-square w-full rounded-lg border border-gray-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeMedia(url)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Ratio */}
      <div className="space-y-1.5">
        <Label>สัดส่วนรูปภาพ</Label>
        <div className="flex flex-wrap gap-1.5">
          {IMAGE_RATIO_OPTIONS.filter((opt) =>
            opt.platforms.includes(platform)
          ).map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={imageRatio === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setImageRatio(opt.value)}
              className={cn(
                imageRatio === opt.value
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : ""
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Image Prompt display (read-only, shown when post has image_prompt) */}
      {post?.image_prompt_th && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label>Image Prompt</Label>

            {/* Thai */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">TH</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    copyToClipboard(post.image_prompt_th ?? "", "prompt_th")
                  }
                >
                  {copiedField === "prompt_th" ? (
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
            {post.image_prompt_en && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">EN</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      copyToClipboard(post.image_prompt_en ?? "", "prompt_en")
                    }
                  >
                    {copiedField === "prompt_en" ? (
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
            )}
          </div>
        </>
      )}

      {/* Reject reason display */}
      {post?.status === "rejected" && post.reject_reason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <p className="text-xs font-medium text-rose-800">เหตุผลที่ไม่อนุมัติ</p>
          <p className="mt-0.5">{post.reject_reason}</p>
        </div>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        {isEditing ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="gap-1.5"
          >
            {deleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            ลบโพสต์
          </Button>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSubmitForReview}
            disabled={saving || !content.trim()}
            className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            ส่งตรวจสอบ
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {isEditing ? "บันทึก" : "บันทึกแบบร่าง"}
          </Button>
        </div>
      </div>
    </div>
  );
}
