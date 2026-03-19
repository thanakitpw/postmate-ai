// Monthly plan generator using Claude API

import {
  buildMonthlyPlanSystemPrompt,
  extractBrandContext,
  type MonthlyPlanPromptInput,
  type MonthlyPlanSlot,
} from "@/lib/ai/prompts";
import type { Project } from "@/types/database";

// ─── Types ──────────────────────────────────────────

export interface MonthlyPlanGeneratedPost {
  date: string;
  slot_index: number;
  content_type: string;
  title: string;
  caption: string;
  hashtags: string[];
  tags: string[];
  image_prompt_th: string;
  image_prompt_en: string;
  image_ratio: string;
}

export interface MonthlyPlanConfig {
  month: string; // YYYY-MM
  activeDays: number[]; // 0-6 (Sun-Sat)
  defaultPostsPerDay: number;
  dayOverrides: Record<string, number>; // day index -> post count
  slotTypes: Record<string, string>; // "dayIndex_slotIndex" -> content_type
  theme: string | null;
}

// ─── Slot Builder ───────────────────────────────────

export function buildSlots(config: MonthlyPlanConfig): MonthlyPlanSlot[] {
  const parts = config.month.split("-");
  const year = parseInt(parts[0] ?? "2026", 10);
  const month = parseInt(parts[1] ?? "1", 10); // 1-based
  const daysInMonth = new Date(year, month, 0).getDate();
  const slots: MonthlyPlanSlot[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    if (!config.activeDays.includes(dayOfWeek)) continue;

    const postsForDay =
      config.dayOverrides[String(dayOfWeek)] ?? config.defaultPostsPerDay;

    for (let slotIdx = 0; slotIdx < postsForDay; slotIdx++) {
      const slotKey = `${dayOfWeek}_${slotIdx}`;
      const contentType = config.slotTypes[slotKey] ?? "regular_post";
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      slots.push({
        date: dateStr,
        slotIndex: slotIdx,
        contentType,
      });
    }
  }

  return slots;
}

// ─── AI Call ────────────────────────────────────────

export async function generateMonthlyPlan(
  project: Project,
  config: MonthlyPlanConfig
): Promise<MonthlyPlanGeneratedPost[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.AI_MODEL ?? "claude-sonnet-4-5-20250514";

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }

  const slots = buildSlots(config);
  if (slots.length === 0) {
    throw new Error("No slots to generate - check active days configuration");
  }

  const brand = extractBrandContext(project);
  const promptInput: MonthlyPlanPromptInput = {
    brand,
    month: config.month,
    theme: config.theme,
    slots,
  };

  const systemPrompt = buildMonthlyPlanSystemPrompt(promptInput);

  // Retry up to 2 times if parse fails
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `Generate the monthly plan now. There are ${slots.length} slots to fill.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };

      const content = data.content?.find(b => b.type === "text")?.text;
      if (!content) {
        throw new Error("Empty response from AI");
      }

      const parsed = parseMonthlyPlanResponse(content);
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) continue;
    }
  }

  throw lastError ?? new Error("Failed to generate monthly plan");
}

// ─── Response Parser ────────────────────────────────

export function parseMonthlyPlanResponse(content: string): MonthlyPlanGeneratedPost[] {
  // Try to extract JSON from the response
  let jsonStr = content.trim();

  // Remove markdown code blocks if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try to find array brackets
  const arrayStart = jsonStr.indexOf("[");
  const arrayEnd = jsonStr.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd !== -1) {
    jsonStr = jsonStr.slice(arrayStart, arrayEnd + 1);
  }

  const parsed = JSON.parse(jsonStr) as unknown[];

  if (!Array.isArray(parsed)) {
    throw new Error("Response is not a JSON array");
  }

  return parsed.map((item, index) => {
    const post = item as Record<string, unknown>;
    return validateMonthlyPlanPost(post, index);
  });
}

function validateMonthlyPlanPost(
  post: Record<string, unknown>,
  index: number
): MonthlyPlanGeneratedPost {
  const requiredFields = ["date", "caption", "image_prompt_th", "image_prompt_en"];
  for (const field of requiredFields) {
    if (!post[field] || typeof post[field] !== "string") {
      throw new Error(`Post at index ${index} missing required field: ${field}`);
    }
  }

  return {
    date: post.date as string,
    slot_index: typeof post.slot_index === "number" ? post.slot_index : 0,
    content_type: typeof post.content_type === "string" ? post.content_type : "regular_post",
    title: typeof post.title === "string" ? post.title : "",
    caption: post.caption as string,
    hashtags: Array.isArray(post.hashtags)
      ? (post.hashtags as unknown[]).filter((h): h is string => typeof h === "string")
      : [],
    tags: Array.isArray(post.tags)
      ? (post.tags as unknown[]).filter((t): t is string => typeof t === "string")
      : [],
    image_prompt_th: post.image_prompt_th as string,
    image_prompt_en: post.image_prompt_en as string,
    image_ratio: typeof post.image_ratio === "string" ? post.image_ratio : "1:1",
  };
}
