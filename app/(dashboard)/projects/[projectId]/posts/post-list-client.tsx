"use client";

import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Trash2,
  ArrowUpDown,
  Loader2,
  FileText,
  CheckSquare,
  Square,
  MinusSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { PostModal } from "@/components/post-modal/post-modal";
import type { Post, PostStatus, PostTag, ContentType } from "@/types/database";

// ─── Constants ─────────────────────────────────────────

const STATUS_CONFIG: Record<PostStatus, { label: string; className: string }> = {
  draft: { label: "แบบร่าง", className: "bg-gray-100 text-gray-700" },
  pending_review: { label: "รอตรวจสอบ", className: "bg-amber-100 text-amber-700" },
  approved: { label: "อนุมัติแล้ว", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "ไม่อนุมัติ", className: "bg-rose-100 text-rose-700" },
  scheduled: { label: "ตั้งเวลา", className: "bg-blue-100 text-blue-700" },
  publishing: { label: "กำลังโพสต์", className: "bg-yellow-100 text-yellow-700" },
  published: { label: "โพสต์แล้ว", className: "bg-green-100 text-green-700" },
  failed: { label: "ล้มเหลว", className: "bg-red-100 text-red-700" },
  failed_final: { label: "ล้มเหลวถาวร", className: "bg-red-200 text-red-800" },
};

const TAG_COLORS: Record<string, string> = {
  promotion: "bg-orange-50 text-orange-700 border-orange-200",
  education: "bg-green-50 text-green-700 border-green-200",
  engagement: "bg-violet-50 text-violet-700 border-violet-200",
  branding: "bg-amber-50 text-amber-700 border-amber-200",
  seasonal: "bg-red-50 text-red-700 border-red-200",
  testimonial: "bg-teal-50 text-teal-700 border-teal-200",
};

const TAG_LABELS: Record<string, string> = {
  promotion: "โปรโมชั่น",
  education: "ให้ความรู้",
  engagement: "สร้างปฏิสัมพันธ์",
  branding: "สร้างแบรนด์",
  seasonal: "ตามเทศกาล",
  testimonial: "รีวิว",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  regular_post: "โพสต์ปกติ",
  article_share: "แชร์บทความ",
  promotion: "โปรโมชั่น",
  engagement: "สร้างปฏิสัมพันธ์",
  repost: "รีโพสต์",
};

const ALL_STATUSES: PostStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "failed_final",
];

const ALL_TAGS: PostTag[] = [
  "promotion",
  "education",
  "engagement",
  "branding",
  "seasonal",
  "testimonial",
];

const ALL_CONTENT_TYPES: ContentType[] = [
  "regular_post",
  "article_share",
  "promotion",
  "engagement",
  "repost",
];

// ─── Types ─────────────────────────────────────────────

interface PostListClientProps {
  projectId: string;
  platform: "facebook" | "instagram" | "tiktok";
  initialPosts: Post[];
}

// ─── Component ─────────────────────────────────────────

export function PostListClient({
  projectId,
  platform,
  initialPosts,
}: PostListClientProps) {
  // Data state
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterContentType, setFilterContentType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // UI state
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Review state
  const [reviewingPostId, setReviewingPostId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectPostId, setRejectPostId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewUpdating, setReviewUpdating] = useState(false);

  // ─── Filtered posts ───────────────────────────────────

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchCaption = post.content.toLowerCase().includes(query);
        const matchTitle = post.title?.toLowerCase().includes(query);
        if (!matchCaption && !matchTitle) return false;
      }

      // Status filter
      if (filterStatus !== "all" && post.status !== filterStatus) return false;

      // Tag filter
      if (filterTag !== "all" && !post.tags.includes(filterTag)) return false;

      // Content type filter
      if (filterContentType !== "all" && post.content_type !== filterContentType) {
        return false;
      }

      // Date range filter
      if (filterDateFrom && post.scheduled_at) {
        const postDate = new Date(post.scheduled_at);
        const fromDate = new Date(filterDateFrom);
        if (postDate < fromDate) return false;
      }
      if (filterDateTo && post.scheduled_at) {
        const postDate = new Date(post.scheduled_at);
        const toDate = new Date(filterDateTo + "T23:59:59");
        if (postDate > toDate) return false;
      }

      return true;
    });
  }, [posts, searchQuery, filterStatus, filterTag, filterContentType, filterDateFrom, filterDateTo]);

  // ─── Selection helpers ────────────────────────────────

  const allSelected =
    filteredPosts.length > 0 &&
    filteredPosts.every((p) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPosts.map((p) => p.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ─── Bulk status change ───────────────────────────────

  async function handleBulkStatusChange(newStatus: PostStatus) {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    setError(null);

    try {
      const supabase = createClient();
      const ids = Array.from(selectedIds);

      const { error: updateError } = await supabase
        .from("posts")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in("id", ids);

      if (updateError) throw new Error(updateError.message);

      setPosts((prev) =>
        prev.map((p) =>
          selectedIds.has(p.id) ? { ...p, status: newStatus } : p
        )
      );
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปเดตล้มเหลว");
    } finally {
      setBulkUpdating(false);
    }
  }

  // ─── Bulk delete ──────────────────────────────────────

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    setError(null);

    try {
      const supabase = createClient();
      const ids = Array.from(selectedIds);

      const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .in("id", ids);

      if (deleteError) throw new Error(deleteError.message);

      setPosts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบล้มเหลว");
    } finally {
      setBulkDeleting(false);
    }
  }

  // ─── Approve / Reject handlers ──────────────────────

  async function handleApprove(postId: string) {
    setReviewUpdating(true);
    setReviewingPostId(postId);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("posts")
        .update({
          status: "approved",
          reject_reason: null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message);

      setPosts((prev) =>
        prev.map((p) => (p.id === postId && data ? (data as Post) : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "อนุมัติล้มเหลว");
    } finally {
      setReviewUpdating(false);
      setReviewingPostId(null);
    }
  }

  function openRejectDialog(postId: string) {
    setRejectPostId(postId);
    setRejectReason("");
    setShowRejectDialog(true);
  }

  async function handleReject() {
    if (!rejectPostId) return;
    setReviewUpdating(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("posts")
        .update({
          status: "rejected",
          reject_reason: rejectReason.trim() || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", rejectPostId)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message);

      setPosts((prev) =>
        prev.map((p) => (p.id === rejectPostId && data ? (data as Post) : p))
      );
      setShowRejectDialog(false);
      setRejectPostId(null);
      setRejectReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ปฏิเสธล้มเหลว");
    } finally {
      setReviewUpdating(false);
    }
  }

  // ─── Modal handlers ──────────────────────────────────

  function handlePostClick(post: Post) {
    setEditingPost(post);
    setShowModal(true);
  }

  const handleSaved = useCallback((savedPost: Post) => {
    setPosts((prev) => {
      const exists = prev.find((p) => p.id === savedPost.id);
      if (exists) {
        return prev.map((p) => (p.id === savedPost.id ? savedPost : p));
      }
      return [savedPost, ...prev];
    });
    setShowModal(false);
    setEditingPost(null);
  }, []);

  const handleDeleted = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setShowModal(false);
    setEditingPost(null);
  }, []);

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="space-y-4 overflow-hidden">
      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-end">
        {/* Search */}
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-gray-500">ค้นหา</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="ค้นหาตามเนื้อหา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Status filter */}
        <div className="w-full space-y-1.5 sm:w-36">
          <label className="text-xs font-medium text-gray-500">สถานะ</label>
          <Select value={filterStatus} onValueChange={(val) => { if (val) setFilterStatus(val); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tag filter */}
        <div className="w-full space-y-1.5 sm:w-36">
          <label className="text-xs font-medium text-gray-500">แท็ก</label>
          <Select value={filterTag} onValueChange={(val) => { if (val) setFilterTag(val); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {ALL_TAGS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TAG_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content type filter */}
        <div className="w-full space-y-1.5 sm:w-40">
          <label className="text-xs font-medium text-gray-500">ประเภท</label>
          <Select value={filterContentType} onValueChange={(val) => { if (val) setFilterContentType(val); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {ALL_CONTENT_TYPES.map((ct) => (
                <SelectItem key={ct} value={ct}>
                  {CONTENT_TYPE_LABELS[ct]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date range */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">ตั้งแต่</label>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom((e.target as HTMLInputElement).value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">ถึง</label>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo((e.target as HTMLInputElement).value)}
            className="w-40"
          />
        </div>
        {(filterDateFrom || filterDateTo || filterStatus !== "all" || filterTag !== "all" || filterContentType !== "all" || searchQuery) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setFilterStatus("all");
              setFilterTag("all");
              setFilterContentType("all");
              setFilterDateFrom("");
              setFilterDateTo("");
            }}
            className="text-gray-500"
          >
            ล้างตัวกรอง
          </Button>
        )}
      </div>

      {/* Bulk actions */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
          <span className="text-sm font-medium text-indigo-700">
            เลือก {selectedIds.size} รายการ
          </span>
          <div className="flex gap-2">
            <Select
              value=""
              onValueChange={(val) => handleBulkStatusChange(val as PostStatus)}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="เปลี่ยนสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">แบบร่าง</SelectItem>
                <SelectItem value="pending_review">รอตรวจสอบ</SelectItem>
                <SelectItem value="approved">อนุมัติ</SelectItem>
                <SelectItem value="scheduled">ตั้งเวลา</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={bulkDeleting}
              className="gap-1.5"
            >
              <Trash2 className="size-3.5" />
              ลบ
            </Button>
          </div>

          {bulkUpdating && (
            <Loader2 className="size-4 animate-spin text-indigo-500" />
          )}
        </div>
      )}

      {/* Post table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="min-w-[640px]">
        {/* Table header */}
        <div className="grid grid-cols-[40px_1fr_120px_120px_140px_80px_100px] items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500">
          <button type="button" onClick={toggleSelectAll} className="flex justify-center">
            {allSelected ? (
              <CheckSquare className="size-4 text-indigo-600" />
            ) : someSelected ? (
              <MinusSquare className="size-4 text-indigo-600" />
            ) : (
              <Square className="size-4 text-gray-400" />
            )}
          </button>
          <span>เนื้อหา</span>
          <span>แท็ก</span>
          <span>ประเภท</span>
          <span className="flex items-center gap-1">
            <ArrowUpDown className="size-3" />
            วันที่
          </span>
          <span>สถานะ</span>
          <span>ดำเนินการ</span>
        </div>

        {/* Table body */}
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="size-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">ไม่พบโพสต์</p>
            <p className="text-xs text-gray-400">
              ลองเปลี่ยนตัวกรองหรือค้นหาใหม่
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isSelected = selectedIds.has(post.id);
            const statusConfig = STATUS_CONFIG[post.status];

            return (
              <div
                key={post.id}
                className={cn(
                  "grid grid-cols-[40px_1fr_120px_120px_140px_80px_100px] items-center gap-2 border-b border-gray-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-gray-50",
                  isSelected && "bg-indigo-50/50"
                )}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(post.id);
                  }}
                  className="flex justify-center"
                >
                  {isSelected ? (
                    <CheckSquare className="size-4 text-indigo-600" />
                  ) : (
                    <Square className="size-4 text-gray-300" />
                  )}
                </button>

                {/* Content */}
                <button
                  type="button"
                  onClick={() => handlePostClick(post)}
                  className="min-w-0 text-left"
                >
                  <p className="truncate text-sm font-medium text-gray-900">
                    {post.title || post.content.slice(0, 60)}
                  </p>
                  {post.title && (
                    <p className="truncate text-xs text-gray-500">
                      {post.content.slice(0, 80)}
                    </p>
                  )}
                  {/* Show reject reason inline */}
                  {post.status === "rejected" && post.reject_reason && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-rose-600">
                      <MessageSquare className="inline size-3 shrink-0" />
                      {post.reject_reason}
                    </p>
                  )}
                </button>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {post.tags.slice(0, 2).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0", TAG_COLORS[tag])}
                    >
                      {TAG_LABELS[tag] ?? tag}
                    </Badge>
                  ))}
                  {post.tags.length > 2 && (
                    <span className="text-[10px] text-gray-400">
                      +{post.tags.length - 2}
                    </span>
                  )}
                </div>

                {/* Content Type */}
                <span className="text-xs text-gray-600">
                  {CONTENT_TYPE_LABELS[post.content_type] ?? post.content_type}
                </span>

                {/* Date */}
                <span className="text-xs text-gray-500">
                  {post.scheduled_at
                    ? format(new Date(post.scheduled_at), "dd/MM/yyyy HH:mm")
                    : "-"}
                </span>

                {/* Status */}
                <Badge
                  className={cn(
                    "justify-center text-[10px] font-medium",
                    statusConfig.className
                  )}
                >
                  {statusConfig.label}
                </Badge>

                {/* Actions */}
                <div className="flex gap-1">
                  {post.status === "pending_review" && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(post.id);
                        }}
                        disabled={reviewUpdating && reviewingPostId === post.id}
                        className="rounded p-1 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                        title="อนุมัติ"
                      >
                        {reviewUpdating && reviewingPostId === post.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRejectDialog(post.id);
                        }}
                        disabled={reviewUpdating}
                        className="rounded p-1 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
                        title="ไม่อนุมัติ"
                      >
                        <XCircle className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400">
        แสดง {filteredPosts.length} จาก {posts.length} โพสต์
      </p>

      {/* Post modal */}
      {showModal && (
        <PostModal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingPost(null);
          }}
          projectId={projectId}
          platform={platform}
          post={editingPost}
          prefillDate={null}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(isOpen) => {
          if (!isOpen) setShowDeleteConfirm(false);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              ยืนยันการลบ
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            คุณต้องการลบ {selectedIds.size} โพสต์ที่เลือกหรือไม่
            การดำเนินการนี้ไม่สามารถยกเลิกได้
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="gap-1.5"
            >
              {bulkDeleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              ลบ {selectedIds.size} โพสต์
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject confirmation dialog */}
      <Dialog
        open={showRejectDialog}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setShowRejectDialog(false);
            setRejectPostId(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="size-5 text-rose-500" />
              ไม่อนุมัติโพสต์
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              ระบุเหตุผลที่ไม่อนุมัติ (ไม่บังคับ)
            </p>
            <Textarea
              placeholder="เหตุผลที่ไม่อนุมัติ..."
              value={rejectReason}
              onChange={(e) => setRejectReason((e.target as HTMLTextAreaElement).value)}
              className="min-h-[80px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectPostId(null);
                setRejectReason("");
              }}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleReject}
              disabled={reviewUpdating}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700"
            >
              {reviewUpdating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <XCircle className="size-3.5" />
              )}
              ไม่อนุมัติ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
