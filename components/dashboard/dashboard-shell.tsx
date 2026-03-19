"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface DashboardUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface DashboardShellProps {
  user: DashboardUser;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  iconPath: React.ReactNode;
}

// Extract projectId from current pathname (if inside /projects/[id]/...)
function getProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([a-f0-9-]+)/);
  return match?.[1] ?? null;
}

const generalNavBase: NavItem[] = [
  {
    label: "แดชบอร์ด",
    href: "/",
    iconPath: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
];

// Project-scoped nav items -- these use the projectId prefix
const projectCalendarNav = {
  label: "ปฏิทิน",
  suffix: "",
  iconPath: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
};

const projectPostsNav = {
  label: "รายการโพสต์",
  suffix: "/posts",
  iconPath: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </>
  ),
};

const projectToolsNavDefs = [
  {
    label: "AI แผนรายเดือน",
    suffix: "/monthly-plan",
    iconPath: (
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    ),
  },
  {
    label: "เชื่อมต่อ Platform",
    suffix: "/connect",
    iconPath: (
      <>
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </>
    ),
  },
  {
    label: "ผลการโพสต์",
    suffix: "/logs",
    iconPath: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  },
];

const projectSettingsNavDef = {
  label: "ตั้งค่า",
  suffix: "/settings",
  iconPath: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>
  ),
};

function buildProjectNav(projectId: string) {
  const prefix = `/projects/${projectId}`;
  const generalNav: NavItem[] = [
    ...generalNavBase,
    { ...projectCalendarNav, href: prefix + projectCalendarNav.suffix },
    { ...projectPostsNav, href: prefix + projectPostsNav.suffix },
  ];
  const toolsNav: NavItem[] = projectToolsNavDefs.map((d) => ({
    label: d.label,
    href: prefix + d.suffix,
    iconPath: d.iconPath,
  }));
  const supportNav: NavItem[] = [
    { ...projectSettingsNavDef, href: prefix + projectSettingsNavDef.suffix },
  ];
  return { generalNav, toolsNav, supportNav };
}

// Default nav when no project is active (only dashboard link)
function buildDefaultNav() {
  const generalNav: NavItem[] = [...generalNavBase];
  const toolsNav: NavItem[] = [];
  const supportNav: NavItem[] = [];
  return { generalNav, toolsNav, supportNav };
}

function SidebarIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="size-[18px] shrink-0 opacity-65"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function NavSection({
  title,
  items,
  currentPath,
}: {
  title: string;
  items: NavItem[];
  currentPath: string;
}) {
  return (
    <div className="px-3 pb-1 pt-3">
      <div className="mb-1 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#94a3b8]">
        {title}
      </div>
      {items.map((item) => {
        const isActive =
          item.href === "/"
            ? currentPath === "/"
            : currentPath === item.href || currentPath.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "mb-px flex items-center gap-[0.65rem] rounded-lg px-3 py-[0.55rem] text-[0.8125rem] font-medium no-underline transition-all",
              isActive
                ? "bg-[#eef2ff] font-semibold text-[#6366f1] [&_svg]:opacity-100"
                : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#1e293b] hover:[&_svg]:opacity-85"
            )}
          >
            <SidebarIcon>{item.iconPath}</SidebarIcon>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Determine if we are inside a project context
  const currentProjectId = getProjectIdFromPath(pathname);
  const { generalNav, toolsNav, supportNav } = currentProjectId
    ? buildProjectNav(currentProjectId)
    : buildDefaultNav();

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      // Silently handle sign out errors
    }
  }

  const roleLabel =
    user.role === "owner" ? "ผู้ดูแลระบบ" : user.role === "admin" ? "แอดมิน" : "สมาชิก";

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-[#f1f5f9] px-5 py-5">
        <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#6366f1] text-white">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <h1 className="text-[1.125rem] font-bold tracking-tight text-[#1e293b]">PostMate AI</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <NavSection title="GENERAL" items={generalNav} currentPath={pathname} />
        {toolsNav.length > 0 && (
          <NavSection title="TOOLS" items={toolsNav} currentPath={pathname} />
        )}
        {supportNav.length > 0 && (
          <NavSection title="SUPPORT" items={supportNav} currentPath={pathname} />
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#f1f5f9] p-3">
        {/* Team switcher */}
        <div className="flex cursor-pointer items-center gap-[0.65rem] rounded-lg px-[0.65rem] py-2 transition-colors hover:bg-[#f8fafc]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#818cf8] text-[0.7rem] font-semibold text-white">
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
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.775rem] font-semibold text-[#1e293b]">
              BestSolution Team
            </div>
            <div className="text-[0.675rem] text-[#94a3b8]">แพ็คเกจ Pro</div>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-[#94a3b8]"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Upgrade button */}
        <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366f1] px-4 py-[0.55rem] text-[0.775rem] font-semibold text-white transition-colors hover:bg-[#4f46e5]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          อัปเกรดแพ็คเกจ
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[260px] flex-col border-r border-[#e5e7eb] bg-white lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-white shadow-lg transition-transform duration-300 lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="ml-0 flex min-w-0 flex-1 flex-col overflow-hidden lg:ml-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-[#f1f5f9] bg-white px-6">
          <div className="flex items-center gap-4">
            {/* Hamburger - mobile only */}
            <button
              className="rounded-lg p-2 text-[#64748b] lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Search bar */}
            <div className="hidden items-center gap-2 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-[0.4rem] transition-all focus-within:border-[#6366f1] focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] hover:border-[#d1d5db] md:flex md:min-w-[240px]">
              <svg
                className="shrink-0 text-[#94a3b8]"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="ค้นหา..."
                className="w-full border-none bg-transparent text-[0.8125rem] text-[#1e293b] placeholder-[#94a3b8] outline-none"
              />
              <span className="inline-flex items-center gap-[0.15rem] whitespace-nowrap rounded border border-[#e5e7eb] bg-white px-[0.4rem] py-[0.1rem] text-[0.65rem] font-medium text-[#94a3b8]">
                Cmd+F
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Grid icon */}
            <button className="flex size-9 items-center justify-center rounded-lg text-[#64748b] transition-all hover:bg-[#f8fafc] hover:text-[#1e293b]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>

            {/* Bell icon with red dot */}
            <button className="relative flex size-9 items-center justify-center rounded-lg text-[#64748b] transition-all hover:bg-[#f8fafc] hover:text-[#1e293b]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span className="absolute right-2 top-2 size-[7px] rounded-full border-[1.5px] border-white bg-[#ef4444]" />
            </button>

            {/* Help icon */}
            <button className="flex size-9 items-center justify-center rounded-lg text-[#64748b] transition-all hover:bg-[#f8fafc] hover:text-[#1e293b]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>

            {/* Divider */}
            <div className="mx-2 h-6 w-px bg-[#e5e7eb]" />

            {/* User */}
            <button
              onClick={handleSignOut}
              className="flex cursor-pointer items-center gap-[0.65rem] rounded-lg px-2 py-[0.35rem] transition-colors hover:bg-[#f8fafc]"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#818cf8] text-[0.75rem] font-semibold text-white">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden flex-col md:flex">
                <span className="text-[0.775rem] font-semibold leading-tight text-[#1e293b]">
                  {user.fullName}
                </span>
                <span className="text-[0.65rem] leading-tight text-[#94a3b8]">{roleLabel}</span>
              </div>
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-7 lg:max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
