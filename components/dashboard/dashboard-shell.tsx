"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  FolderOpen,
  Calendar,
  FileText,
  Settings,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  BarChart3,
  HelpCircle,
  MessageSquare,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  icon: React.ElementType;
}

const generalNav: NavItem[] = [
  { label: "หน้าหลัก", href: "/", icon: Home },
  { label: "ลูกค้า", href: "/clients", icon: Users },
];

const toolsNav: NavItem[] = [
  { label: "ปฏิทิน", href: "/calendar", icon: Calendar },
  { label: "โพสต์", href: "/posts", icon: FileText },
  { label: "รายงาน", href: "/reports", icon: BarChart3 },
  { label: "AI สร้างเนื้อหา", href: "/ai-generate", icon: Zap },
];

const supportNav: NavItem[] = [
  { label: "ตั้งค่า", href: "/settings", icon: Settings },
  { label: "ช่วยเหลือ", href: "/help", icon: HelpCircle },
  { label: "ส่งข้อเสนอแนะ", href: "/feedback", icon: MessageSquare },
];

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
    <div className="space-y-1">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      {items.map((item) => {
        const isActive =
          item.href === "/"
            ? currentPath === "/"
            : currentPath.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Icon className="size-4" />
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

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600">
          <Zap className="size-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-900">
          PostMate AI
        </span>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <NavSection title="ทั่วไป" items={generalNav} currentPath={pathname} />
        <NavSection title="เครื่องมือ" items={toolsNav} currentPath={pathname} />
        <NavSection title="สนับสนุน" items={supportNav} currentPath={pathname} />
      </nav>

      <Separator />

      {/* User section */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50">
          <div className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium text-gray-900">
              {user.fullName}
            </p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleSignOut}
            aria-label="ออกจากระบบ"
          >
            <LogOut className="size-4 text-gray-400" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-gray-200 bg-white lg:flex">
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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute right-2 top-4">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-sm lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="ค้นหาลูกค้า, โปรเจค..."
              className="h-9 pl-9 bg-gray-50 border-gray-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-4 text-gray-500" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
