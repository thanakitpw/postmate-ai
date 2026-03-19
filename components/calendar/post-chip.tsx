"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Post, PostTag, PostStatus } from "@/types/database";

const TAG_COLORS: Record<PostTag, { bg: string; text: string; border: string }> = {
  promotion: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  education: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  engagement: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  branding: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  seasonal: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  testimonial: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
};

const DEFAULT_COLOR = { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };

/** Status-based style overrides for review workflow */
const STATUS_CHIP_STYLES: Partial<Record<PostStatus, string>> = {
  pending_review: "border-dashed border-amber-400 bg-amber-50/60 text-amber-700",
  rejected: "border-rose-300 bg-rose-50/60 text-rose-500 line-through",
};

interface PostChipProps {
  post: Post;
  onClick: (post: Post) => void;
  compact?: boolean;
}

export function PostChip({ post, onClick, compact = false }: PostChipProps) {
  const primaryTag = (post.tags?.[0] as PostTag) ?? null;
  const color = primaryTag ? TAG_COLORS[primaryTag] ?? DEFAULT_COLOR : DEFAULT_COLOR;
  const time = post.scheduled_at
    ? format(new Date(post.scheduled_at), "HH:mm")
    : null;
  const title = post.title || post.content.slice(0, 40);

  // Use status-based styling if applicable, otherwise fall back to tag color
  const statusStyle = STATUS_CHIP_STYLES[post.status];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(post);
      }}
      className={cn(
        "w-full rounded border px-1.5 py-0.5 text-left text-xs transition-colors hover:opacity-80",
        statusStyle
          ? statusStyle
          : cn(color.bg, color.text, color.border),
        compact ? "truncate" : ""
      )}
      title={title}
    >
      {time && (
        <span className="mr-1 font-medium">{time}</span>
      )}
      <span className="truncate">{compact ? title.slice(0, 20) : title}</span>
    </button>
  );
}
