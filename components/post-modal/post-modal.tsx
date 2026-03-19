"use client";

import { useState } from "react";
import { PenLine, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ManualEditor } from "@/components/post-modal/manual-editor";
import { AiPanel } from "@/components/post-modal/ai-panel";
import type { Post } from "@/types/database";

type ModalTab = "manual" | "ai";

interface PostModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  platform: "facebook" | "instagram" | "tiktok";
  post: Post | null;
  prefillDate: Date | null;
  onSaved: (post: Post) => void;
  onDeleted: (postId: string) => void;
}

export function PostModal({
  open,
  onClose,
  projectId,
  platform,
  post,
  prefillDate,
  onSaved,
  onDeleted,
}: PostModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>("manual");
  const isEditing = !!post;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "แก้ไขโพสต์" : "สร้างโพสต์ใหม่"}
          </DialogTitle>
        </DialogHeader>

        {/* Tab toggle */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === "manual"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <PenLine className="size-3.5" />
            Manual
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === "ai"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Sparkles className="size-3.5" />
            AI Generate
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "manual" ? (
          <ManualEditor
            projectId={projectId}
            platform={platform}
            post={post}
            prefillDate={prefillDate}
            onSaved={onSaved}
            onDeleted={onDeleted}
            onClose={onClose}
          />
        ) : (
          <AiPanel />
        )}
      </DialogContent>
    </Dialog>
  );
}
