"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PlanConfig, type PlanConfigData } from "@/components/monthly-plan/plan-config";
import { PlanPreview } from "@/components/monthly-plan/plan-preview";
import type { MonthlyPlanGeneratedPost } from "@/lib/ai/monthly-plan";
import type { MonthlyPlanConfig, Json } from "@/types/database";

interface MonthlyPlanClientProps {
  projectId: string;
  existingConfig: MonthlyPlanConfig | null;
}

export function MonthlyPlanClient({
  projectId,
  existingConfig,
}: MonthlyPlanClientProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<MonthlyPlanGeneratedPost[]>([]);
  const [currentConfig, setCurrentConfig] = useState<PlanConfigData | null>(null);

  // Build initial config from existing DB config
  const initialConfig: PlanConfigData | null = existingConfig
    ? {
        month: existingConfig.plan_month.slice(0, 7),
        activeDays: existingConfig.active_days,
        defaultPostsPerDay: existingConfig.default_posts_per_day,
        dayOverrides: (existingConfig.day_overrides as Record<string, number>) ?? {},
        slotTypes: (existingConfig.slot_types as Record<string, string>) ?? {},
        theme: (existingConfig.theme as string) ?? "",
      }
    : null;

  // ─── Generate plan ───────────────────────────────────

  const handleGenerate = useCallback(
    async (config: PlanConfigData) => {
      setGenerating(true);
      setError(null);
      setCurrentConfig(config);

      try {
        const response = await fetch("/api/ai/monthly-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            month: config.month,
            activeDays: config.activeDays,
            defaultPostsPerDay: config.defaultPostsPerDay,
            dayOverrides: config.dayOverrides,
            slotTypes: config.slotTypes,
            theme: config.theme || null,
          }),
        });

        if (!response.ok) {
          const data = (await response.json()) as { error: string };
          throw new Error(data.error || "Failed to generate plan");
        }

        const data = (await response.json()) as {
          posts: MonthlyPlanGeneratedPost[];
        };

        setGeneratedPosts(data.posts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setGenerating(false);
      }
    },
    [projectId]
  );

  // ─── Regenerate single post ───────────────────────────

  const handleRegeneratePost = useCallback(
    async (index: number) => {
      if (!currentConfig) return;
      setRegeneratingIndex(index);

      try {
        const post = generatedPosts[index];
        if (!post) return;
        const response = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            topic: `${currentConfig.theme ? currentConfig.theme + " - " : ""}${post.content_type} post for ${post.date}`,
            type: "single",
          }),
        });

        if (!response.ok) {
          const data = (await response.json()) as { error: string };
          throw new Error(data.error || "Failed to regenerate");
        }

        const data = (await response.json()) as {
          posts: Array<{
            title: string;
            caption: string;
            hashtags: string[];
            tags: string[];
            image_prompt_th: string;
            image_prompt_en: string;
            image_ratio: string;
            content_type: string;
          }>;
        };

        if (data.posts.length > 0) {
          const regenerated = data.posts[0];
          if (regenerated) {
            const updated = [...generatedPosts];
            const existing = updated[index];
            if (existing) {
              updated[index] = {
                ...existing,
                title: regenerated.title,
                caption: regenerated.caption,
                hashtags: regenerated.hashtags,
                tags: regenerated.tags,
                image_prompt_th: regenerated.image_prompt_th,
                image_prompt_en: regenerated.image_prompt_en,
                image_ratio: regenerated.image_ratio,
              };
            }
            setGeneratedPosts(updated);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setRegeneratingIndex(null);
      }
    },
    [generatedPosts, currentConfig, projectId]
  );

  // ─── After save ───────────────────────────────────────

  function handleSaved() {
    router.push(`/projects/${projectId}`);
    router.refresh();
  }

  return (
    <div className="space-y-8 overflow-hidden">
      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Config */}
      <PlanConfig
        onGenerate={handleGenerate}
        generating={generating}
        initialConfig={initialConfig}
      />

      {/* Preview */}
      {generatedPosts.length > 0 && (
        <PlanPreview
          posts={generatedPosts}
          projectId={projectId}
          planMonth={currentConfig?.month ?? ""}
          onPostsChange={setGeneratedPosts}
          onRegeneratePost={handleRegeneratePost}
          regeneratingIndex={regeneratingIndex}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
