import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/notifications
 * Returns recent notification-worthy events for the current user:
 * - Failed posts
 * - Recently published posts
 * - Sessions expiring soon
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications: NotificationItem[] = [];

  try {
    // Get failed posts (recent 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: failedPosts } = await supabase
      .from("posts")
      .select(`
        id,
        title,
        status,
        updated_at,
        projects!inner (
          id,
          project_name,
          platform,
          clients!inner (
            id,
            owner_id
          )
        )
      `)
      .in("status", ["failed", "failed_final"])
      .gte("updated_at", sevenDaysAgo)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (failedPosts) {
      for (const post of failedPosts) {
        const project = post.projects as unknown as {
          id: string;
          project_name: string;
          platform: string;
          clients: { id: string; owner_id: string };
        };

        notifications.push({
          id: `post-fail-${post.id}`,
          type: "post_failed",
          title: `โพสต์ล้มเหลว`,
          message: `"${post.title ?? "Untitled"}" ใน ${project.project_name}`,
          projectId: project.id,
          postId: post.id,
          platform: project.platform,
          severity: post.status === "failed_final" ? "error" : "warning",
          createdAt: post.updated_at,
        });
      }
    }

    // Get recently published posts (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: publishedPosts } = await supabase
      .from("posts")
      .select(`
        id,
        title,
        updated_at,
        projects!inner (
          id,
          project_name,
          platform,
          clients!inner (
            id,
            owner_id
          )
        )
      `)
      .eq("status", "published")
      .gte("updated_at", oneDayAgo)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (publishedPosts) {
      for (const post of publishedPosts) {
        const project = post.projects as unknown as {
          id: string;
          project_name: string;
          platform: string;
          clients: { id: string; owner_id: string };
        };

        notifications.push({
          id: `post-pub-${post.id}`,
          type: "post_published",
          title: `โพสต์สำเร็จ`,
          message: `"${post.title ?? "Untitled"}" ใน ${project.project_name}`,
          projectId: project.id,
          postId: post.id,
          platform: project.platform,
          severity: "success",
          createdAt: post.updated_at,
        });
      }
    }

    // Get sessions expiring within 7 days
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: expiringSessions } = await supabase
      .from("project_sessions")
      .select(`
        id,
        platform,
        expires_at,
        projects!inner (
          id,
          project_name,
          clients!inner (
            id,
            owner_id
          )
        )
      `)
      .eq("status", "active")
      .not("expires_at", "is", null)
      .lte("expires_at", sevenDaysFromNow)
      .gte("expires_at", now);

    if (expiringSessions) {
      for (const session of expiringSessions) {
        const project = session.projects as unknown as {
          id: string;
          project_name: string;
          clients: { id: string; owner_id: string };
        };

        const expiryDate = new Date(session.expires_at as string);
        const daysLeft = Math.ceil(
          (expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );

        notifications.push({
          id: `session-exp-${session.id}`,
          type: "session_expiring",
          title: `Session ใกล้หมดอายุ`,
          message: `${project.project_name} (${session.platform}) — เหลืออีก ${daysLeft} วัน`,
          projectId: project.id,
          platform: session.platform,
          severity: daysLeft <= 2 ? "error" : "warning",
          createdAt: session.expires_at as string,
        });
      }
    }

    // Sort by date descending
    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Count unread (for badge) — all are considered "unread" in this basic version
    const unreadCount = notifications.filter(
      (n) => n.severity === "error" || n.severity === "warning"
    ).length;

    return NextResponse.json({
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Notifications] Error:", message);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// Type for notification items
interface NotificationItem {
  id: string;
  type: "post_failed" | "post_published" | "session_expiring";
  title: string;
  message: string;
  projectId: string;
  postId?: string;
  platform: string;
  severity: "success" | "warning" | "error";
  createdAt: string;
}
