import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Client, Project } from "@/types/database";

// Platform badge component matching demo
function PlatformBadge({ platform }: { platform: string }) {
  const config: Record<
    string,
    { label: string; bg: string; color: string; icon: React.ReactNode }
  > = {
    facebook: {
      label: "Facebook",
      bg: "#eff6ff",
      color: "#2563eb",
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="align-middle"
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    instagram: {
      label: "Instagram",
      bg: "#fdf2f8",
      color: "#db2777",
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="align-middle"
        >
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
    tiktok: {
      label: "TikTok",
      bg: "#f0fdfa",
      color: "#0d9488",
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="align-middle"
        >
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.16 8.16 0 005.58 2.19V12a4.85 4.85 0 01-5.58-2.19V6.69h5.58z" />
        </svg>
      ),
    },
  };
  const c = config[platform];
  if (!c) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-2 py-[0.15rem] text-[0.675rem] font-medium"
      style={{ background: c.bg, color: c.color }}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

interface ClientWithStats extends Client {
  projects: Pick<Project, "id" | "platform">[];
  postCount: number;
  scheduledCount: number;
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
  const clientScheduledCounts: Record<string, number> = {};

  if (clientIds.length > 0) {
    const { data: allProjects } = await supabase
      .from("projects")
      .select("id, client_id")
      .in("client_id", clientIds);

    if (allProjects && allProjects.length > 0) {
      const projectIds = allProjects.map((p) => p.id);

      const { data: posts } = await supabase
        .from("posts")
        .select("id, project_id, status")
        .in("project_id", projectIds);

      if (posts) {
        totalPosts = posts.length;
        publishedPosts = posts.filter((p) => p.status === "published").length;

        const projectToClient: Record<string, string> = {};
        for (const proj of allProjects) {
          projectToClient[proj.id] = proj.client_id;
        }
        for (const post of posts) {
          const cid = projectToClient[post.project_id];
          if (cid) {
            clientPostCounts[cid] = (clientPostCounts[cid] ?? 0) + 1;
            if (post.status === "scheduled") {
              clientScheduledCounts[cid] = (clientScheduledCounts[cid] ?? 0) + 1;
            }
          }
        }
      }
    }
  }

  const totalProjects = (clients ?? []).reduce((sum, c) => sum + (c.projects?.length ?? 0), 0);
  const successRate = totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0;

  const clientsWithStats: ClientWithStats[] = (clients ?? []).map((c) => ({
    ...c,
    projects: c.projects ?? [],
    postCount: clientPostCounts[c.id] ?? 0,
    scheduledCount: clientScheduledCounts[c.id] ?? 0,
  }));

  return (
    <div>
      {/* Page Header */}
      <div className="mb-7 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1e293b]">แดชบอร์ด</h2>
          <p className="mt-1 text-[0.8125rem] text-[#94a3b8]">
            ภาพรวมการจัดการ Social Media ทั้งหมด
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-[0.8125rem] font-medium text-white shadow-[0_1px_2px_rgba(99,102,241,0.2)] transition-all hover:bg-[#4f46e5] hover:shadow-[0_2px_4px_rgba(99,102,241,0.3)]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          เพิ่มลูกค้า
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Stat 1: Clients */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#eef2ff] text-[#6366f1]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <span className="text-[0.775rem] font-medium text-[#64748b]">ลูกค้าทั้งหมด</span>
          </div>
          <div className="text-[1.75rem] font-bold leading-tight tracking-tight text-[#1e293b]">
            {clientsWithStats.length}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-2 py-[0.15rem] text-[0.7rem] font-semibold text-[#059669]">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
            +1 เดือนนี้
          </div>
        </div>

        {/* Stat 2: Projects */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#eff6ff] text-[#3b82f6]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
            </div>
            <span className="text-[0.775rem] font-medium text-[#64748b]">โปรเจคที่ใช้งาน</span>
          </div>
          <div className="text-[1.75rem] font-bold leading-tight tracking-tight text-[#1e293b]">
            {totalProjects}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-2 py-[0.15rem] text-[0.7rem] font-semibold text-[#059669]">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
            +2 เดือนนี้
          </div>
        </div>

        {/* Stat 3: Posts */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#fffbeb] text-[#f59e0b]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <span className="text-[0.775rem] font-medium text-[#64748b]">โพสต์ทั้งหมด</span>
          </div>
          <div className="text-[1.75rem] font-bold leading-tight tracking-tight text-[#1e293b]">
            {totalPosts}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-2 py-[0.15rem] text-[0.7rem] font-semibold text-[#059669]">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
            +23 เดือนนี้
          </div>
        </div>

        {/* Stat 4: Success rate */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#10b981]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-[0.775rem] font-medium text-[#64748b]">อัตราโพสต์สำเร็จ</span>
          </div>
          <div className="text-[1.75rem] font-bold leading-tight tracking-tight text-[#1e293b]">
            {successRate}%
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-2 py-[0.15rem] text-[0.7rem] font-semibold text-[#059669]">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
            +3% จากเดือนก่อน
          </div>
        </div>
      </div>

      {/* Client list header */}
      <div className="mb-7 flex items-start justify-between">
        <div>
          <h2 className="text-[1.15rem] font-semibold text-[#1e293b]">ลูกค้าของฉัน</h2>
          <p className="mt-1 text-[0.8125rem] text-[#94a3b8]">จัดการลูกค้าและโปรเจคทั้งหมด</p>
        </div>
      </div>

      {/* Client Grid */}
      {clientsWithStats.length === 0 ? (
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 opacity-30">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto text-[#94a3b8]"
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <p className="text-[0.875rem] text-[#94a3b8]">
            ยังไม่มีลูกค้า เริ่มต้นด้วยการเพิ่มลูกค้าคนแรก
          </p>
          <Link
            href="/clients/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-[0.8125rem] font-medium text-white transition-all hover:bg-[#4f46e5]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            เพิ่มลูกค้า
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientsWithStats.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="block rounded-xl border border-[#e5e7eb] bg-white p-6 no-underline shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-[1.05rem] font-semibold text-[#1e293b]">{client.name}</h3>
                  {client.contact_name && (
                    <p className="text-[0.8rem] text-[#94a3b8]">ผู้ติดต่อ {client.contact_name}</p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-2.5 py-[0.2rem] text-[0.675rem] font-semibold text-[#059669]">
                  Active
                </span>
              </div>

              {client.projects.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {Array.from(new Set(client.projects.map((p) => p.platform))).map((platform) => (
                    <PlatformBadge key={platform} platform={platform} />
                  ))}
                </div>
              )}

              <div className="flex gap-6 text-[0.8rem] text-[#94a3b8]">
                <span>{client.projects.length} โปรเจค</span>
                <span>{client.postCount} โพสต์</span>
                <span>{client.scheduledCount} รอโพสต์</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
