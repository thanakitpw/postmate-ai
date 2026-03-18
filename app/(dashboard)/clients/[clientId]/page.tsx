import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  FolderOpen,
  FileText,
  Clock,
  CheckCircle2,
  User,
  Mail,
  Phone,
  ArrowRight,
  Pencil,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteClientDialog } from "@/components/clients/delete-client-dialog";
import type { Project } from "@/types/database";

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

interface ProjectWithStats extends Project {
  totalPosts: number;
  scheduledPosts: number;
  publishedPosts: number;
}

export default async function ClientDashboardPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch client
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("owner_id", user.id)
    .single();

  if (clientError || !client) {
    notFound();
  }

  // Fetch projects for this client
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  // Fetch post stats for each project
  const projectIds = (projects ?? []).map((p) => p.id);
  const postStats: Record<
    string,
    { total: number; scheduled: number; published: number }
  > = {};

  if (projectIds.length > 0) {
    const { data: posts } = await supabase
      .from("posts")
      .select("id, project_id, status")
      .in("project_id", projectIds);

    if (posts) {
      for (const post of posts) {
        const pid = post.project_id;
        if (!postStats[pid]) {
          postStats[pid] = {
            total: 0,
            scheduled: 0,
            published: 0,
          };
        }
        const stat = postStats[pid];
        stat.total++;
        if (post.status === "scheduled") {
          stat.scheduled++;
        }
        if (post.status === "published") {
          stat.published++;
        }
      }
    }
  }

  const projectsWithStats: ProjectWithStats[] = (projects ?? []).map((p) => ({
    ...p,
    totalPosts: postStats[p.id]?.total ?? 0,
    scheduledPosts: postStats[p.id]?.scheduled ?? 0,
    publishedPosts: postStats[p.id]?.published ?? 0,
  }));

  const totalPosts = projectsWithStats.reduce(
    (sum, p) => sum + p.totalPosts,
    0
  );
  const totalScheduled = projectsWithStats.reduce(
    (sum, p) => sum + p.scheduledPosts,
    0
  );
  const totalPublished = projectsWithStats.reduce(
    (sum, p) => sum + p.publishedPosts,
    0
  );

  const stats = [
    {
      label: "โปรเจค",
      value: projectsWithStats.length,
      icon: FolderOpen,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "โพสต์ทั้งหมด",
      value: totalPosts,
      icon: FileText,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "รอโพสต์",
      value: totalScheduled,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "โพสต์สำเร็จ",
      value: totalPublished,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/">
        <Button variant="ghost" className="gap-2 text-gray-600">
          <ArrowLeft className="size-4" />
          กลับไปหน้าหลัก
        </Button>
      </Link>

      {/* Client header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-14 items-center justify-center rounded-xl bg-indigo-50 text-xl font-bold text-indigo-600">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {client.name}
            </h1>
            <div className="mt-2 space-y-1">
              {client.contact_name && (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <User className="size-3.5" />
                  {client.contact_name}
                </p>
              )}
              {client.contact_email && (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="size-3.5" />
                  {client.contact_email}
                </p>
              )}
              {client.contact_phone && (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="size-3.5" />
                  {client.contact_phone}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/clients/${client.id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Pencil className="size-4" />
              แก้ไข
            </Button>
          </Link>
          <DeleteClientDialog
            clientId={client.id}
            clientName={client.name}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-gray-200 shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <Icon className={`size-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Projects section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">โปรเจค</h2>
        <Link href={`/clients/${client.id}/projects/new`}>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="size-4" />
            สร้างโปรเจค
          </Button>
        </Link>
      </div>

      {projectsWithStats.length === 0 ? (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
              <FolderOpen className="size-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              ยังไม่มีโปรเจค
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              สร้างโปรเจคแรกเพื่อเริ่มจัดการโซเชียลมีเดีย
            </p>
            <Link href={`/clients/${client.id}/projects/new`} className="mt-4">
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="size-4" />
                สร้างโปรเจค
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectsWithStats.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
            >
              <Card className="group border-gray-200 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">
                          {project.project_name}
                        </h3>
                        {!project.is_active && (
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 text-gray-500"
                          >
                            ปิดใช้งาน
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <PlatformBadge platform={project.platform} />
                        {project.page_name && (
                          <span className="text-xs text-gray-500">
                            {project.page_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-gray-300 transition-colors group-hover:text-indigo-400" />
                  </div>

                  {/* Post stats */}
                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900">
                        {project.totalPosts}
                      </p>
                      <p className="text-xs text-gray-500">ทั้งหมด</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-amber-600">
                        {project.scheduledPosts}
                      </p>
                      <p className="text-xs text-gray-500">รอโพสต์</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-600">
                        {project.publishedPosts}
                      </p>
                      <p className="text-xs text-gray-500">สำเร็จ</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
