"use client";

import { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostChip } from "@/components/calendar/post-chip";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/database";

const WEEKDAY_LABELS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

interface CalendarMonthProps {
  currentDate: Date;
  posts: Post[];
  onDateChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
  onPostClick: (post: Post) => void;
}

export function CalendarMonth({
  currentDate,
  posts,
  onDateChange,
  onDayClick,
  onPostClick,
}: CalendarMonthProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  );

  // Group posts by date string
  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      const dateKey = post.scheduled_at
        ? format(new Date(post.scheduled_at), "yyyy-MM-dd")
        : null;
      if (dateKey) {
        const existing = map.get(dateKey) ?? [];
        existing.push(post);
        map.set(dateKey, existing);
      }
    }
    return map;
  }, [posts]);

  function handlePrevMonth() {
    onDateChange(subMonths(currentDate, 1));
  }

  function handleNextMonth() {
    onDateChange(addMonths(currentDate, 1));
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <Button variant="ghost" size="icon-sm" onClick={handlePrevMonth}>
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-base font-semibold text-gray-900">
          {format(currentDate, "MMMM yyyy", { locale: th })}
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={handleNextMonth}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-gray-500"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDate.get(dateKey) ?? [];
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <div
              key={dateKey}
              role="button"
              tabIndex={0}
              type="button"
              onClick={() => {
                if (dayPosts.length === 0) {
                  onDayClick(day);
                }
              }}
              className={cn(
                "group relative min-h-[100px] border-b border-r border-gray-100 p-1.5 text-left transition-colors hover:bg-gray-50",
                !inMonth && "bg-gray-50/50",
                "cursor-pointer"
              )}
            >
              {/* Day number */}
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  today && "bg-indigo-600 text-white",
                  !today && inMonth && "text-gray-900",
                  !today && !inMonth && "text-gray-400"
                )}
              >
                {format(day, "d")}
              </span>

              {/* Post chips */}
              <div className="mt-0.5 space-y-0.5">
                {dayPosts.slice(0, 3).map((post) => (
                  <PostChip
                    key={post.id}
                    post={post}
                    onClick={onPostClick}
                    compact
                  />
                ))}
                {dayPosts.length > 3 && (
                  <p className="px-1 text-[10px] text-gray-500">
                    +{dayPosts.length - 3} เพิ่มเติม
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
