"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Check, X, Activity, RefreshCw, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Platform } from "@/types/database";

interface PostResultWithPost {
  id: string;
  post_id: string;
  platform: string;
  status: "success" | "failed";
  error_message: string | null;
  platform_post_id: string | null;
  screenshot_url: string | null;
  posted_at: string;
  posts: {
    id: string;
    title: string | null;
    content: string;
    retry_count: number;
    status: string;
  } | null;
}

interface LogsClientProps {
  projectId: string;
  platform: Platform;
  initialResults: PostResultWithPost[];
  stats: {
    successCount: number;
    failedCount: number;
    successRate: string;
    totalRetries: number;
  };
}

const PLATFORM_POST_URL: Record<Platform, (postId: string) => string> = {
  facebook: (id) => `https://www.facebook.com/${id}`,
  instagram: (id) => `https://www.instagram.com/p/${id}`,
  tiktok: (id) => `https://www.tiktok.com/@user/video/${id}`,
};

function formatThaiDateTime(dateStr: string): string {
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
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

export function LogsClient({
  projectId: _projectId,
  platform,
  initialResults,
  stats: initialStats,
}: LogsClientProps) {
  const [results, setResults] = useState<PostResultWithPost[]>(initialResults);
  const [stats] = useState(initialStats);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = useCallback(async (result: PostResultWithPost) => {
    if (!result.posts) return;
    const retryCount = result.posts.retry_count;

    if (retryCount >= 3) {
      toast.error("ไม่สามารถ retry ได้", {
        description: "ถึงจำนวน retry สูงสุดแล้ว (3 ครั้ง)",
      });
      return;
    }

    setRetryingId(result.id);

    try {
      const supabase = createClient();

      // Update post status back to 'scheduled' and reset retry_count
      const { error } = await supabase
        .from("posts")
        .update({
          status: "scheduled" as const,
          updated_at: new Date().toISOString(),
        })
        .eq("id", result.post_id);

      if (error) {
        throw error;
      }

      // Update local state
      setResults((prev) =>
        prev.map((r) =>
          r.id === result.id
            ? {
                ...r,
                posts: r.posts ? { ...r.posts, status: "scheduled" } : r.posts,
              }
            : r
        )
      );

      toast.success("ตั้งค่า retry เรียบร้อย", {
        description: "โพสต์จะถูกโพสต์ใหม่ในรอบถัดไป",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast.error("ไม่สามารถ retry ได้", { description: message });
    } finally {
      setRetryingId(null);
    }
  }, []);

  const handleExportCsv = useCallback(() => {
    toast.info("Export CSV", {
      description: "ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้",
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Export button */}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-1.5" onClick={handleExportCsv}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Check className="size-4" />}
          iconClassName="bg-emerald-100 text-emerald-600"
          label="โพสต์สำเร็จ"
          value={stats.successCount.toString()}
        />
        <StatCard
          icon={<X className="size-4" />}
          iconClassName="bg-red-100 text-red-600"
          label="ล้มเหลว"
          value={stats.failedCount.toString()}
        />
        <StatCard
          icon={<Activity className="size-4" />}
          iconClassName="bg-indigo-100 text-indigo-600"
          label="อัตราสำเร็จ"
          value={`${stats.successRate}%`}
        />
        <StatCard
          icon={<RefreshCw className="size-4" />}
          iconClassName="bg-amber-100 text-amber-600"
          label="Retry ทั้งหมด"
          value={stats.totalRetries.toString()}
        />
      </div>

      {/* Results table */}
      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16">
          <Activity className="size-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">ยังไม่มีผลการโพสต์</p>
          <p className="mt-1 text-xs text-gray-400">ผลจะปรากฏเมื่อระบบ auto-post ทำงาน</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="px-4 py-3 text-left font-medium text-gray-600">สถานะ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">โพสต์</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Platform</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">วันที่โพสต์</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Post ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">หมายเหตุ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  {/* action column */}
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr
                  key={result.id}
                  className={`border-b border-gray-100 last:border-b-0 ${
                    result.status === "failed" ? "bg-red-50/50" : ""
                  }`}
                >
                  {/* Status */}
                  <td className="px-4 py-3">
                    {result.status === "success" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <Check className="size-3" />
                        สำเร็จ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        <X className="size-3" />
                        ล้มเหลว
                      </span>
                    )}
                  </td>

                  {/* Post title */}
                  <td className="max-w-[200px] truncate px-4 py-3 font-medium text-gray-900">
                    {result.posts?.title ?? result.posts?.content.slice(0, 40) ?? "--"}
                  </td>

                  {/* Platform */}
                  <td className="px-4 py-3">
                    <PlatformBadge platform={result.platform} />
                  </td>

                  {/* Posted at */}
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {formatThaiDateTime(result.posted_at)}
                  </td>

                  {/* Platform post ID */}
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {result.platform_post_id ?? "--"}
                  </td>

                  {/* Notes */}
                  <td className="max-w-[200px] px-4 py-3">
                    {result.status === "success" ? (
                      <span className="text-xs text-emerald-600">
                        โพสต์สำเร็จ
                        {(result.posts?.retry_count ?? 0) > 0
                          ? ` (retry ${result.posts?.retry_count} ครั้ง)`
                          : "ครั้งแรก"}
                      </span>
                    ) : (
                      <div>
                        <p className="truncate text-xs text-red-600">
                          {result.error_message ?? "Unknown error"}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          Retry {result.posts?.retry_count ?? 0}/3
                        </p>
                      </div>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right">
                    {result.status === "success" && result.platform_post_id ? (
                      <a
                        href={PLATFORM_POST_URL[platform](result.platform_post_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        <ExternalLink className="size-3" />
                        ดูโพสต์
                      </a>
                    ) : result.status === "failed" && result.posts?.status !== "scheduled" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={retryingId === result.id || (result.posts?.retry_count ?? 0) >= 3}
                        onClick={() => handleRetry(result)}
                      >
                        {retryingId === result.id ? (
                          <RefreshCw className="size-3 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3" />
                        )}
                        Retry
                      </Button>
                    ) : result.posts?.status === "scheduled" ? (
                      <span className="text-xs text-amber-600">รอ retry...</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -- Sub-components --

function StatCard({
  icon,
  iconClassName,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <div className={`flex size-8 items-center justify-center rounded-lg ${iconClassName}`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

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
    className: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${c.className}`}
    >
      {c.label}
    </span>
  );
}
