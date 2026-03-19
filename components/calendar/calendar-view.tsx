"use client";

import { useState, useCallback } from "react";
import { CalendarDays, LayoutGrid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarMonth } from "@/components/calendar/calendar-month";
import { CalendarWeek } from "@/components/calendar/calendar-week";
import { PostModal } from "@/components/post-modal/post-modal";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/database";

type ViewMode = "month" | "week";

interface CalendarViewProps {
  projectId: string;
  platform: "facebook" | "instagram" | "tiktok";
  initialPosts: Post[];
}

export function CalendarView({
  projectId,
  platform,
  initialPosts,
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  // Post modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [prefillDate, setPrefillDate] = useState<Date | null>(null);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedPost(null);
    setPrefillDate(date);
    setModalOpen(true);
  }, []);

  const handlePostClick = useCallback((post: Post) => {
    setSelectedPost(post);
    setPrefillDate(null);
    setModalOpen(true);
  }, []);

  const handleCreatePost = useCallback(() => {
    setSelectedPost(null);
    setPrefillDate(new Date());
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedPost(null);
    setPrefillDate(null);
  }, []);

  const handlePostSaved = useCallback((savedPost: Post) => {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === savedPost.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedPost;
        return next;
      }
      return [...prev, savedPost];
    });
    setModalOpen(false);
    setSelectedPost(null);
    setPrefillDate(null);
  }, []);

  const handlePostDeleted = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setModalOpen(false);
    setSelectedPost(null);
    setPrefillDate(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
          <Button
            variant={viewMode === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("month")}
            className={cn(
              "gap-1.5",
              viewMode === "month"
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : ""
            )}
          >
            <LayoutGrid className="size-3.5" />
            เดือน
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("week")}
            className={cn(
              "gap-1.5",
              viewMode === "week"
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : ""
            )}
          >
            <CalendarDays className="size-3.5" />
            สัปดาห์
          </Button>
        </div>

        {/* Create button */}
        <Button
          onClick={handleCreatePost}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="size-4" />
          สร้างโพสต์
        </Button>
      </div>

      {/* Calendar */}
      {viewMode === "month" ? (
        <CalendarMonth
          currentDate={currentDate}
          posts={posts}
          onDateChange={setCurrentDate}
          onDayClick={handleDayClick}
          onPostClick={handlePostClick}
        />
      ) : (
        <CalendarWeek
          currentDate={currentDate}
          posts={posts}
          onDateChange={setCurrentDate}
          onDayClick={handleDayClick}
          onPostClick={handlePostClick}
        />
      )}

      {/* Post Modal */}
      <PostModal
        open={modalOpen}
        onClose={handleModalClose}
        projectId={projectId}
        platform={platform}
        post={selectedPost}
        prefillDate={prefillDate}
        onSaved={handlePostSaved}
        onDeleted={handlePostDeleted}
      />
    </div>
  );
}
