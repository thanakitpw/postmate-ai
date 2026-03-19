import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarView } from "@/components/calendar/calendar-view";
import type { Post } from "@/types/database";

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

export default async function ProjectCalendarPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch project with client info to verify ownership (middleware guarantees auth)
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*, clients!inner(owner_id)")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // Verify ownership via client
  const clientData = project.clients as unknown as { owner_id: string };
  if (clientData.owner_id !== user?.id) {
    notFound();
  }

  // Fetch all posts for this project
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("project_id", projectId)
    .order("scheduled_at", { ascending: true });

  const platformConfig = PLATFORM_CONFIG[project.platform] ?? {
    label: project.platform,
    className: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href={`/clients/${project.client_id}`}>
        <Button variant="ghost" className="gap-2 text-gray-600">
          <ArrowLeft className="size-4" />
          กลับไปหน้าลูกค้า
        </Button>
      </Link>

      {/* Project header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {project.project_name}
            </h1>
            <Badge variant="outline" className={platformConfig.className}>
              {platformConfig.label}
            </Badge>
          </div>
          {project.page_name && (
            <p className="mt-1 text-sm text-gray-500">{project.page_name}</p>
          )}
        </div>
      </div>

      {/* Calendar View */}
      <CalendarView
        projectId={projectId}
        platform={project.platform}
        initialPosts={(posts ?? []) as Post[]}
      />
    </div>
  );
}
