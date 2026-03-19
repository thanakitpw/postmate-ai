// Single/series post content generator using Claude API

import {
  buildGeneratePostSystemPrompt,
  extractBrandContext,
  type GeneratePostPromptInput,
} from "@/lib/ai/prompts";
import type { Project } from "@/types/database";

// ─── Types ──────────────────────────────────────────

export interface GeneratedPost {
  title: string;
  caption: string;
  hashtags: string[];
  tags: string[];
  image_prompt_th: string;
  image_prompt_en: string;
  image_ratio: string;
  content_type: string;
}

export interface GenerateRequest {
  topic: string;
  type: "single" | "series";
  seriesCount?: number;
  language?: string;
}

// ─── AI Call ────────────────────────────────────────

export async function generatePosts(
  project: Project,
  request: GenerateRequest
): Promise<GeneratedPost[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.AI_MODEL ?? "claude-sonnet-4-5-20250514";

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }

  const brand = extractBrandContext(project);
  const promptInput: GeneratePostPromptInput = {
    brand,
    topic: request.topic,
    type: request.type,
    seriesCount: request.seriesCount,
    language: request.language,
  };

  const systemPrompt = buildGeneratePostSystemPrompt(promptInput);

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
              content: `Create ${request.type === "single" ? "a post" : `a series of ${request.seriesCount ?? 3} posts`} about: ${request.topic}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 4096,
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

      const parsed = parseGenerateResponse(content);
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) continue;
    }
  }

  throw lastError ?? new Error("Failed to generate posts");
}

// ─── Response Parser ────────────────────────────────

export function parseGenerateResponse(content: string): GeneratedPost[] {
  let jsonStr = content.trim();

  // Remove markdown code blocks if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1]?.trim() ?? jsonStr;
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
    return validateGeneratedPost(post, index);
  });
}

function validateGeneratedPost(
  post: Record<string, unknown>,
  index: number
): GeneratedPost {
  const requiredFields = ["caption", "image_prompt_th", "image_prompt_en"];
  for (const field of requiredFields) {
    if (!post[field] || typeof post[field] !== "string") {
      throw new Error(`Post at index ${index} missing required field: ${field}`);
    }
  }

  return {
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
    content_type: typeof post.content_type === "string" ? post.content_type : "regular_post",
  };
}
