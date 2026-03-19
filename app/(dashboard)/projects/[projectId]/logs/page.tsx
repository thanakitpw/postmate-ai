import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogsClient } from "./logs-client";
import type { Platform } from "@/types/database";

const PLATFORM_CONFIG: Record<string, { label: string; className: string }> = {
  facebook: {
    label: "Facebook",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  instagram: {
    label: "Instagram",
    className: "bg-pink-50 text-pink-700 border-pink-200",
  },
  tiktok: {
    label: "TikTok",
    className: "bg-gray-900 text-white border-gray-900",
  },
};

// Type for post_results joined with posts
interface PostResultWithPost {
  id: string;
  post_id: string;
  platform: string;
  status: "success" | "failed";
  error_message: string | null;
  platform_post_id: string | null;
  screenshot_url: string | null;
  posted_at: string;
  posts: {
    id: string;
    title: string | null;
    content: string;
    retry_count: number;
    status: string;
  } | null;
}

export default async function LogsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch project with ownership check
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*, clients!inner(owner_id)")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    notFound();
  }

  const clientData = project.clients as unknown as { owner_id: string };
  if (clientData.owner_id !== user?.id) {
    notFound();
  }

  // Fetch post_results joined with posts for this project
  const { data: results } = await supabase
    .from("post_results")
    .select("*, posts!inner(id, title, content, retry_count, status)")
    .eq("posts.project_id", projectId)
    .order("posted_at", { ascending: false });

  const typedResults = (results ?? []) as unknown as PostResultWithPost[];

  // Compute stats
  const successCount = typedResults.filter((r) => r.status === "success").length;
  const failedCount = typedResults.filter((r) => r.status === "failed").length;
  const totalCount = typedResults.length;
  const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : "0.0";
  const totalRetries = typedResults.reduce((sum, r) => sum + (r.posts?.retry_count ?? 0), 0);

  const platformConfig = PLATFORM_CONFIG[project.platform] ?? {
    label: project.platform,
    className: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      {/* Back link */}
      <Link href={`/projects/${projectId}`}>
        <Button variant="ghost" className="gap-2 text-gray-600">
          <ArrowLeft className="size-4" />
          กลับไปปฏิทิน
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">ผลการโพสต์</h1>
            <Badge variant="outline" className={platformConfig.className}>
              {platformConfig.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">ดูสถานะการโพสต์จริงบน {platformConfig.label}</p>
        </div>
      </div>

      {/* Client component with data */}
      <LogsClient
        projectId={projectId}
        platform={project.platform as Platform}
        initialResults={typedResults}
        stats={{
          successCount,
          failedCount,
          successRate,
          totalRetries,
        }}
      />
    </div>
  );
}
