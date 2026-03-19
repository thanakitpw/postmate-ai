import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConnectClient } from "./connect-client";
import type { ProjectSession, Platform } from "@/types/database";

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

export default async function ConnectPage({ params }: { params: Promise<{ projectId: string }> }) {
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

  // Fetch sessions for this project
  const { data: sessions } = await supabase
    .from("project_sessions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">เชื่อมต่อ Platform</h1>
            <Badge variant="outline" className={platformConfig.className}>
              {platformConfig.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            เชื่อมต่อ session สำหรับ auto-post (ไม่เก็บรหัสผ่าน)
          </p>
        </div>
      </div>

      {/* Client component */}
      <ConnectClient
        projectId={projectId}
        platform={project.platform as Platform}
        pageName={project.page_name}
        sessions={(sessions ?? []) as ProjectSession[]}
      />
    </div>
  );
}
