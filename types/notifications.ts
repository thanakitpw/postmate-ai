/**
 * Notification types for in-app notification system.
 */

export interface NotificationItem {
  id: string;
  type: "post_failed" | "post_published" | "session_expiring" | "post_pending_review";
  title: string;
  message: string;
  projectId: string;
  postId?: string;
  platform: string;
  severity: "success" | "warning" | "error";
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
}
