"use client";

import { useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  addWeeks,
  subWeeks,
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Post, PostTag } from "@/types/database";

const TAG_LABELS: Record<PostTag, string> = {
  promotion: "โปรโมชั่น",
  education: "ให้ความรู้",
  engagement: "สร้างปฏิสัมพันธ์",
  branding: "สร้างแบรนด์",
  seasonal: "ตามเทศกาล",
  testimonial: "รีวิว",
};

const TAG_COLORS: Record<PostTag, string> = {
  promotion: "bg-orange-50 text-orange-700 border-orange-200",
  education: "bg-green-50 text-green-700 border-green-200",
  engagement: "bg-violet-50 text-violet-700 border-violet-200",
  branding: "bg-amber-50 text-amber-700 border-amber-200",
  seasonal: "bg-red-50 text-red-700 border-red-200",
  testimonial: "bg-teal-50 text-teal-700 border-teal-200",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "แบบร่าง", className: "bg-gray-100 text-gray-600" },
  scheduled: { label: "ตั้งเวลาแล้ว", className: "bg-indigo-50 text-indigo-600" },
  publishing: { label: "กำลังโพสต์", className: "bg-yellow-50 text-yellow-700" },
  published: { label: "สำเร็จ", className: "bg-green-50 text-green-700" },
  failed: { label: "ล้มเหลว", className: "bg-red-50 text-red-700" },
  failed_final: { label: "ล้มเหลวถาวร", className: "bg-red-100 text-red-800" },
};

const WEEKDAY_LABELS_FULL = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

interface CalendarWeekProps {
  currentDate: Date;
  posts: Post[];
  onDateChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
  onPostClick: (post: Post) => void;
}

export function CalendarWeek({
  currentDate,
  posts,
  onDateChange,
  onDayClick,
  onPostClick,
}: CalendarWeekProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      const dateKey = post.scheduled_at
        ? format(new Date(post.scheduled_at), "yyyy-MM-dd")
        : format(new Date(post.created_at), "yyyy-MM-dd");
      if (dateKey) {
        const existing = map.get(dateKey) ?? [];
        existing.push(post);
        map.set(dateKey, existing);
      }
    }
    return map;
  }, [posts]);

  function handlePrevWeek() {
    onDateChange(subWeeks(currentDate, 1));
  }

  function handleNextWeek() {
    onDateChange(addWeeks(currentDate, 1));
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <Button variant="ghost" size="icon-sm" onClick={handlePrevWeek}>
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-base font-semibold text-gray-900">
          {format(weekStart, "d MMM", { locale: th })} -{" "}
          {format(weekEnd, "d MMM yyyy", { locale: th })}
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={handleNextWeek}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {days.map((day, idx) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDate.get(dateKey) ?? [];
          const today = isToday(day);

          return (
            <div
              key={dateKey}
              className={cn(
                "min-h-[200px] p-2",
                today && "bg-indigo-50/30"
              )}
            >
              {/* Day header */}
              <button
                type="button"
                onClick={() => {
                  if (dayPosts.length === 0) {
                    onDayClick(day);
                  }
                }}
                className="mb-2 w-full text-center"
              >
                <p className="text-xs text-gray-500">
                  {WEEKDAY_LABELS_FULL[idx]}
                </p>
                <p
                  className={cn(
                    "mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-medium",
                    today && "bg-indigo-600 text-white",
                    !today && "text-gray-900"
                  )}
                >
                  {format(day, "d")}
                </p>
              </button>

              {/* Post cards */}
              <div className="space-y-1.5">
                {dayPosts.map((post) => {
                  const primaryTag = (post.tags?.[0] as PostTag) ?? null;
                  const statusConfig = STATUS_LABELS[post.status] ?? { label: "แบบร่าง", className: "bg-gray-100 text-gray-600" };
                  const time = post.scheduled_at
                    ? format(new Date(post.scheduled_at), "HH:mm")
                    : null;

                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => onPostClick(post)}
                      className="w-full rounded-md border border-gray-200 bg-white p-2 text-left shadow-sm transition-shadow hover:shadow-md"
                    >
                      {/* Time + status */}
                      <div className="flex items-center justify-between gap-1">
                        {time && (
                          <span className="text-xs font-medium text-gray-600">
                            {time}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", statusConfig.className)}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>

                      {/* Title / content preview */}
                      <p className="mt-1 line-clamp-2 text-xs text-gray-900">
                        {post.title || post.content.slice(0, 60)}
                      </p>

                      {/* Tags */}
                      {primaryTag && (
                        <div className="mt-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              TAG_COLORS[primaryTag] ?? ""
                            )}
                          >
                            {TAG_LABELS[primaryTag] ?? primaryTag}
                          </Badge>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
