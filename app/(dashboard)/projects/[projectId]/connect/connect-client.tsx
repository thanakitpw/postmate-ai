"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Lock,
  Link as LinkIcon,
  RefreshCw,
  ShieldOff,
  AlertTriangle,
  Check,
  X,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type { ProjectSession, Platform } from "@/types/database";

// Platform visual config
const PLATFORM_VISUAL: Record<
  Platform,
  { label: string; bgColor: string; textColor: string; icon: React.ReactNode }
> = {
  facebook: {
    label: "Facebook Page",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  instagram: {
    label: "Instagram",
    bgColor: "bg-pink-50",
    textColor: "text-pink-600",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    bgColor: "bg-teal-50",
    textColor: "text-teal-600",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.16 8.16 0 005.58 2.19V12a4.85 4.85 0 01-5.58-2.19V6.69h5.58z" />
      </svg>
    ),
  },
};

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr);
  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays < 7;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

interface ConnectClientProps {
  projectId: string;
  platform: Platform;
  pageName: string | null;
  sessions: ProjectSession[];
}

export function ConnectClient({
  projectId,
  platform,
  pageName,
  sessions: initialSessions,
}: ConnectClientProps) {
  const [sessions, setSessions] = useState<ProjectSession[]>(initialSessions);
  const [revokeTarget, setRevokeTarget] = useState<ProjectSession | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Find the session for this project's platform
  const currentSession = sessions.find((s) => s.platform === platform && s.status !== "revoked");

  const platformVisual = PLATFORM_VISUAL[platform];

  // Determine effective status
  const getEffectiveStatus = useCallback(
    (session: ProjectSession | undefined): "active" | "expired" | "not_connected" => {
      if (!session) return "not_connected";
      if (session.status === "expired" || isExpired(session.expires_at)) return "expired";
      if (session.status === "active") return "active";
      return "not_connected";
    },
    []
  );

  const effectiveStatus = getEffectiveStatus(currentSession);

  const handleConnect = useCallback(() => {
    toast.info("กำลังเชื่อมต่อ...", {
      description: "ฟีเจอร์นี้จะพร้อมใช้งานเมื่อเชื่อมต่อ VPS แล้ว",
    });
  }, []);

  const handleRevoke = useCallback(async () => {
    if (!revokeTarget) return;
    setRevoking(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("project_sessions")
        .update({
          status: "revoked" as const,
          updated_at: new Date().toISOString(),
        })
        .eq("id", revokeTarget.id);

      if (error) {
        throw error;
      }

      // Update local state
      setSessions((prev) =>
        prev.map((s) => (s.id === revokeTarget.id ? { ...s, status: "revoked" as const } : s))
      );

      toast.success("Revoke session เรียบร้อย");
    } catch (err) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast.error("ไม่สามารถ revoke session ได้", { description: message });
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  }, [revokeTarget]);

  return (
    <div className="max-w-2xl space-y-4">
      {/* Security info banner */}
      <div className="flex gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
          <Lock className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-indigo-900">ปลอดภัย - ไม่เก็บรหัสผ่าน</p>
          <p className="mt-0.5 text-sm text-indigo-700">
            ระบบจะเปิด browser ให้คุณ login เอง แล้วจับเฉพาะ session cookies เข้ารหัส AES-256-GCM
            คุณสามารถ revoke ได้ตลอดเวลา
          </p>
        </div>
      </div>

      {/* Session card */}
      <div
        className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
          effectiveStatus === "expired"
            ? "border-red-300 bg-red-50/30"
            : effectiveStatus === "not_connected"
              ? "border-dashed border-gray-300"
              : "border-gray-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${platformVisual.bgColor} ${platformVisual.textColor}`}
          >
            {platformVisual.icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{platformVisual.label}</h4>
            <p className="text-xs text-gray-500">
              {effectiveStatus === "not_connected" ? "ยังไม่ได้เชื่อมต่อ" : (pageName ?? projectId)}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              {effectiveStatus === "active" && (
                <>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <Check className="size-3" />
                    Active
                  </span>
                  {currentSession?.expires_at && (
                    <span className="text-xs text-gray-500">
                      {isExpiringSoon(currentSession.expires_at) && (
                        <span className="mr-1 inline-flex items-center gap-0.5 text-amber-600">
                          <AlertTriangle className="size-3" />
                          ใกล้หมดอายุ
                        </span>
                      )}
                      หมดอายุ {formatThaiDate(currentSession.expires_at)}
                    </span>
                  )}
                </>
              )}
              {effectiveStatus === "expired" && (
                <>
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    <Clock className="size-3" />
                    Expired
                  </span>
                  {currentSession?.expires_at && (
                    <span className="text-xs text-red-600">
                      หมดอายุเมื่อ {formatThaiDate(currentSession.expires_at)}
                    </span>
                  )}
                </>
              )}
              {effectiveStatus === "not_connected" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  <X className="size-3" />
                  Not Connected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 gap-2">
          {effectiveStatus === "active" && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleConnect}>
                <RefreshCw className="size-3.5" />
                Reconnect
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setRevokeTarget(currentSession ?? null)}
              >
                <ShieldOff className="size-3.5" />
                Revoke
              </Button>
            </>
          )}
          {effectiveStatus === "expired" && (
            <Button size="sm" className="gap-1.5" onClick={handleConnect}>
              <LinkIcon className="size-3.5" />
              Reconnect
            </Button>
          )}
          {effectiveStatus === "not_connected" && (
            <Button size="sm" className="gap-1.5" onClick={handleConnect}>
              <LinkIcon className="size-3.5" />
              Connect
            </Button>
          )}
        </div>
      </div>

      {/* Revoked sessions history */}
      {sessions.filter((s) => s.status === "revoked").length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500">Session ที่ถูก revoke</h3>
          {sessions
            .filter((s) => s.status === "revoked")
            .map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    Revoked
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatThaiDate(session.updated_at)}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Revoke confirmation dialog */}
      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการ Revoke Session</DialogTitle>
            <DialogDescription>
              เมื่อ revoke แล้ว ระบบจะไม่สามารถ auto-post ได้จนกว่าจะเชื่อมต่อใหม่
              คุณต้องการดำเนินการต่อหรือไม่
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" disabled={revoking}>
                  ยกเลิก
                </Button>
              }
            />
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revoking}
              className="gap-1.5"
            >
              {revoking ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <ShieldOff className="size-3.5" />
              )}
              {revoking ? "กำลัง Revoke..." : "ยืนยัน Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
