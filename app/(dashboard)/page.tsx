import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  FolderOpen,
  FileText,
  TrendingUp,
  Plus,
  ArrowRight,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Client, Project, Post } from "@/types/database";

// Platform badge color mapping
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

interface ClientWithStats extends Client {
  projects: Pick<Project, "id" | "platform">[];
  postCount: number;
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch clients with project count
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("*, projects(id, platform)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (clientsError) {
    throw new Error("ไม่สามารถโหลดข้อมูลลูกค้าได้");
  }

  // Fetch all projects for post counts
  const clientIds = (clients ?? []).map((c) => c.id);
  let totalPosts = 0;
  let publishedPosts = 0;
  const clientPostCounts: Record<string, number> = {};

  if (clientIds.length > 0) {
    // Get all project IDs for these clients
    const { data: allProjects } = await supabase
      .from("projects")
      .select("id, client_id")
      .in("client_id", clientIds);

    if (allProjects && allProjects.length > 0) {
      const projectIds = allProjects.map((p) => p.id);

      // Get post counts
      const { data: posts } = await supabase
        .from("posts")
        .select("id, project_id, status")
        .in("project_id", projectIds);

      if (posts) {
        totalPosts = posts.length;
        publishedPosts = posts.filter((p) => p.status === "published").length;

        // Map posts to clients
        const projectToClient: Record<string, string> = {};
        for (const proj of allProjects) {
          projectToClient[proj.id] = proj.client_id;
        }
        for (const post of posts) {
          const cid = projectToClient[post.project_id];
          if (cid) {
            clientPostCounts[cid] = (clientPostCounts[cid] ?? 0) + 1;
          }
        }
      }
    }
  }

  const totalProjects = (clients ?? []).reduce(
    (sum, c) => sum + (c.projects?.length ?? 0),
    0
  );
  const successRate =
    totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0;

  const clientsWithStats: ClientWithStats[] = (clients ?? []).map((c) => ({
    ...c,
    projects: c.projects ?? [],
    postCount: clientPostCounts[c.id] ?? 0,
  }));

  const stats = [
    {
      label: "ลูกค้าทั้งหมด",
      value: clientsWithStats.length,
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "โปรเจคทั้งหมด",
      value: totalProjects,
      icon: FolderOpen,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "โพสต์ทั้งหมด",
      value: totalPosts,
      icon: FileText,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "อัตราสำเร็จ",
      value: `${successRate}%`,
      icon: TrendingUp,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            ลูกค้า
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            จัดการลูกค้าและโปรเจคของคุณ
          </p>
        </div>
        <Link href="/clients/new">
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="size-4" />
            เพิ่มลูกค้า
          </Button>
        </Link>
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

      {/* Client Grid */}
      {clientsWithStats.length === 0 ? (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
              <Users className="size-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              ยังไม่มีลูกค้า
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              เริ่มต้นด้วยการเพิ่มลูกค้าคนแรกของคุณ
            </p>
            <Link href="/clients/new" className="mt-4">
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="size-4" />
                เพิ่มลูกค้า
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientsWithStats.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="group border-gray-200 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">
                          {client.name}
                        </h3>
                        {client.contact_name && (
                          <p className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="size-3" />
                            {client.contact_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-gray-300 transition-colors group-hover:text-indigo-400" />
                  </div>

                  {/* Contact info */}
                  <div className="mt-3 space-y-1">
                    {client.contact_email && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="size-3" />
                        {client.contact_email}
                      </p>
                    )}
                    {client.contact_phone && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="size-3" />
                        {client.contact_phone}
                      </p>
                    )}
                  </div>

                  {/* Platform badges */}
                  {client.projects.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Array.from(
                        new Set(client.projects.map((p) => p.platform))
                      ).map((platform) => (
                        <PlatformBadge key={platform} platform={platform} />
                      ))}
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <FolderOpen className="size-3" />
                      <span>
                        {client.projects.length} โปรเจค
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <FileText className="size-3" />
                      <span>
                        {client.postCount} โพสต์
                      </span>
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
