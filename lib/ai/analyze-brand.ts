// Brand analyzer using Claude API — analyzes Facebook pages or websites

import type { Tone, Language } from "@/types/database";

// ─── Types ──────────────────────────────────────────

export interface BrandAnalysisRequest {
  url: string;
  type: "facebook" | "website";
}

export interface BrandAnalysisResult {
  business_type: string;
  target_audience: string;
  tone: Tone;
  brand_voice_notes: string;
  language: Language;
  suggested_project_name: string;
  suggested_page_name: string;
}

// ─── Prompt Builder ────────────────────────────────

function buildAnalyzeBrandSystemPrompt(): string {
  return `You are an expert brand analyst. Given a URL (either a Facebook page or a website), analyze the brand and extract key information for social media content planning.

## Output Requirements
Return a valid JSON object with this exact structure:
{
  "business_type": "<business type in Thai, e.g. ร้านอาหาร, คลินิกความงาม>",
  "target_audience": "<target audience description in Thai>",
  "tone": "<one of: Professional, Friendly, Humorous, Inspirational, Urgent>",
  "brand_voice_notes": "<brand voice notes in Thai — communication style, keywords, things to avoid>",
  "language": "<one of: TH, EN, Both>",
  "suggested_project_name": "<suggested project name in Thai>",
  "suggested_page_name": "<page/account name>"
}

## Rules
- tone MUST be exactly one of: Professional, Friendly, Humorous, Inspirational, Urgent
- language MUST be exactly one of: TH, EN, Both
- All text fields should be in Thai except suggested_page_name which should match the actual page name
- Be specific and actionable in target_audience and brand_voice_notes
- Return ONLY the JSON object, no markdown code blocks, no explanation`;
}

function buildAnalyzeUserMessage(url: string, type: "facebook" | "website", websiteContent?: string): string {
  if (type === "facebook") {
    return `Analyze this Facebook page URL and infer the brand information: ${url}

Based on the URL and page name, determine the business type, target audience, communication tone, and other brand attributes. If you cannot determine specific details, make reasonable inferences based on the page name and URL pattern.`;
  }

  const contentSnippet = websiteContent
    ? `\n\nHere is the website content (truncated):\n${websiteContent.slice(0, 8000)}`
    : "";

  return `Analyze this website and extract brand information: ${url}${contentSnippet}

Determine the business type, target audience, communication tone, and other brand attributes based on the website content.`;
}

// ─── Response Parser ────────────────────────────────

const VALID_TONES: ReadonlyArray<Tone> = ["Professional", "Friendly", "Humorous", "Inspirational", "Urgent"];
const VALID_LANGUAGES: ReadonlyArray<Language> = ["TH", "EN", "Both"];

function parseAnalysisResponse(content: string): BrandAnalysisResult {
  let jsonStr = content.trim();

  // Remove markdown code blocks if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1]?.trim() ?? jsonStr;
  }

  // Try to find object braces
  const objStart = jsonStr.indexOf("{");
  const objEnd = jsonStr.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1) {
    jsonStr = jsonStr.slice(objStart, objEnd + 1);
  }

  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

  // Validate and normalize
  const tone = typeof parsed.tone === "string" && VALID_TONES.includes(parsed.tone as Tone)
    ? (parsed.tone as Tone)
    : "Professional";

  const language = typeof parsed.language === "string" && VALID_LANGUAGES.includes(parsed.language as Language)
    ? (parsed.language as Language)
    : "TH";

  return {
    business_type: typeof parsed.business_type === "string" ? parsed.business_type : "",
    target_audience: typeof parsed.target_audience === "string" ? parsed.target_audience : "",
    tone,
    brand_voice_notes: typeof parsed.brand_voice_notes === "string" ? parsed.brand_voice_notes : "",
    language,
    suggested_project_name: typeof parsed.suggested_project_name === "string" ? parsed.suggested_project_name : "",
    suggested_page_name: typeof parsed.suggested_page_name === "string" ? parsed.suggested_page_name : "",
  };
}

// ─── Fetch Website Content ─────────────────────────

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PostMateAI/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return "";
    }

    const html = await response.text();

    // Strip HTML tags and extract text content
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return textContent;
  } catch {
    return "";
  }
}

// ─── Main Function ──────────────────────────────────

export async function analyzeBrand(
  request: BrandAnalysisRequest
): Promise<BrandAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.AI_MODEL ?? "claude-sonnet-4-5-20250514";

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }

  // Fetch website content if analyzing a website
  let websiteContent: string | undefined;
  if (request.type === "website") {
    websiteContent = await fetchWebsiteContent(request.url);
  }

  const systemPrompt = buildAnalyzeBrandSystemPrompt();
  const userMessage = buildAnalyzeUserMessage(request.url, request.type, websiteContent);

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
          messages: [{ role: "user", content: userMessage }],
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };

      const content = data.content?.find((b) => b.type === "text")?.text;
      if (!content) {
        throw new Error("Empty response from AI");
      }

      return parseAnalysisResponse(content);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) continue;
    }
  }

  throw lastError ?? new Error("Failed to analyze brand");
}
