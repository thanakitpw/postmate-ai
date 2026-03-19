import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectActiveToggle } from "@/components/projects/project-active-toggle";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";

function PlatformBadge({ platform }: { platform: string }) {
  const config: Record<string, { label: string; className: string }> = {
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
  const c = config[platform] ?? {
    label: platform,
    className: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

const toneLabels: Record<string, string> = {
  Professional: "มืออาชีพ",
  Friendly: "เป็นกันเอง",
  Humorous: "ตลกขบขัน",
  Inspirational: "สร้างแรงบันดาลใจ",
  Urgent: "เร่งด่วน",
};

const languageLabels: Record<string, string> = {
  TH: "ไทย",
  EN: "อังกฤษ",
  Both: "ไทย + อังกฤษ",
};

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch project with client info (verify ownership through client.owner_id)
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*, clients!inner(id, name, owner_id)")
    .eq("id", projectId)
    .single();

  if (
    projectError ||
    !project ||
    !project.clients ||
    (project.clients as { owner_id: string }).owner_id !== user?.id
  ) {
    notFound();
  }

  const clientData = project.clients as { id: string; name: string; owner_id: string };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link href={`/projects/${projectId}`}>
        <Button variant="ghost" className="gap-2 text-gray-600">
          <ArrowLeft className="size-4" />
          กลับไปปฏิทิน
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              ตั้งค่าโปรเจค
            </h1>
            <PlatformBadge platform={project.platform} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {project.project_name} &mdash; {clientData.name}
          </p>
        </div>
      </div>

      {/* Active toggle (Task 4.6) */}
      <ProjectActiveToggle
        projectId={project.id}
        isActive={project.is_active}
      />

      {/* Brand Profile form */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Brand Profile
          </CardTitle>
          <CardDescription className="text-gray-500">
            ข้อมูลนี้ใช้เป็นบริบทสำหรับ AI ในการสร้างเนื้อหา
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            clientId={clientData.id}
            initialData={project}
            mode="edit"
          />
        </CardContent>
      </Card>

      {/* AI Preview section */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Sparkles className="size-5 text-indigo-500" />
            AI มองเห็น Brand นี้อย่างไร
          </CardTitle>
          <CardDescription className="text-gray-500">
            ตัวอย่างข้อมูลที่ AI จะใช้ในการสร้างเนื้อหา
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 text-sm">
            <div className="space-y-3">
              <div>
                <span className="font-medium text-indigo-700">แพลตฟอร์ม</span>
                <p className="text-gray-700">
                  {project.platform === "facebook"
                    ? "Facebook"
                    : project.platform === "instagram"
                      ? "Instagram"
                      : "TikTok"}
                  {project.page_name && ` - ${project.page_name}`}
                </p>
              </div>
              {project.business_type && (
                <div>
                  <span className="font-medium text-indigo-700">ธุรกิจ</span>
                  <p className="text-gray-700">{project.business_type}</p>
                </div>
              )}
              {project.target_audience && (
                <div>
                  <span className="font-medium text-indigo-700">
                    กลุ่มเป้าหมาย
                  </span>
                  <p className="text-gray-700">{project.target_audience}</p>
                </div>
              )}
              {project.tone && (
                <div>
                  <span className="font-medium text-indigo-700">
                    โทนการสื่อสาร
                  </span>
                  <p className="text-gray-700">
                    {toneLabels[project.tone] ?? project.tone}
                  </p>
                </div>
              )}
              {project.brand_voice_notes && (
                <div>
                  <span className="font-medium text-indigo-700">
                    Brand Voice
                  </span>
                  <p className="text-gray-700">{project.brand_voice_notes}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-indigo-700">ภาษา</span>
                <p className="text-gray-700">
                  {languageLabels[project.language] ?? project.language}
                </p>
              </div>
              {project.website_url && (
                <div>
                  <span className="font-medium text-indigo-700">เว็บไซต์</span>
                  <p className="text-gray-700">{project.website_url}</p>
                </div>
              )}
            </div>
          </div>
          {!project.business_type &&
            !project.target_audience &&
            !project.tone && (
              <p className="mt-3 text-xs text-amber-600">
                กรอกข้อมูล Brand Profile เพิ่มเติมเพื่อให้ AI สร้างเนื้อหาที่ตรงกับแบรนด์มากขึ้น
              </p>
            )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-red-600">
            ส่วนอันตราย
          </CardTitle>
          <CardDescription className="text-gray-500">
            การลบโปรเจคจะลบข้อมูลทั้งหมดอย่างถาวร
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteProjectDialog
            projectId={project.id}
            projectName={project.project_name}
            clientId={clientData.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
