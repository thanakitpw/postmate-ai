// System prompt builders for AI content generation

import type { Project } from "@/types/database";

// Brand profile context for all AI prompts
interface BrandContext {
  projectName: string;
  platform: string;
  businessType: string | null;
  targetAudience: string | null;
  tone: string | null;
  language: string;
  brandVoiceNotes: string | null;
  websiteUrl: string | null;
}

export function extractBrandContext(project: Project): BrandContext {
  return {
    projectName: project.project_name,
    platform: project.platform,
    businessType: project.business_type,
    targetAudience: project.target_audience,
    tone: project.tone,
    language: project.language,
    brandVoiceNotes: project.brand_voice_notes,
    websiteUrl: project.website_url,
  };
}

function buildBrandSection(ctx: BrandContext): string {
  const lines: string[] = [];
  lines.push(`- Platform: ${ctx.platform}`);
  lines.push(`- Project: ${ctx.projectName}`);
  if (ctx.businessType) lines.push(`- Business type: ${ctx.businessType}`);
  if (ctx.targetAudience) lines.push(`- Target audience: ${ctx.targetAudience}`);
  if (ctx.tone) lines.push(`- Tone of voice: ${ctx.tone}`);
  lines.push(`- Language: ${ctx.language === "TH" ? "Thai" : ctx.language === "EN" ? "English" : "Both Thai and English"}`);
  if (ctx.brandVoiceNotes) lines.push(`- Brand voice notes: ${ctx.brandVoiceNotes}`);
  if (ctx.websiteUrl) lines.push(`- Website: ${ctx.websiteUrl}`);
  return lines.join("\n");
}

// ─── Monthly Plan Prompt ──────────────────────────────────────

export interface MonthlyPlanPromptInput {
  brand: BrandContext;
  month: string; // e.g. "2026-04"
  theme: string | null;
  slots: MonthlyPlanSlot[];
}

export interface MonthlyPlanSlot {
  date: string; // YYYY-MM-DD
  slotIndex: number;
  contentType: string;
}

export function buildMonthlyPlanSystemPrompt(input: MonthlyPlanPromptInput): string {
  const { brand, month, theme, slots } = input;

  return `You are a professional social media content planner for a ${brand.platform} page.

## Brand Profile
${buildBrandSection(brand)}

## Task
Create a monthly content plan for ${month}.${theme ? `\nMonthly theme: ${theme}` : ""}

Generate content for ${slots.length} posts across the month.

## Slots to fill
${slots.map((s) => `- ${s.date} (slot ${s.slotIndex + 1}): content type = ${s.contentType}`).join("\n")}

## Output Requirements
Return a valid JSON array. Each item must match this structure exactly:
{
  "date": "YYYY-MM-DD",
  "slot_index": <number>,
  "content_type": "<content_type>",
  "title": "<short title>",
  "caption": "<full post caption with line breaks>",
  "hashtags": ["tag1", "tag2", ...],
  "tags": ["promotion" | "education" | "engagement" | "branding" | "seasonal" | "testimonial"],
  "image_prompt_th": "<image generation prompt in Thai>",
  "image_prompt_en": "<image generation prompt in English>",
  "image_ratio": "1:1" | "4:5" | "16:9" | "9:16"
}

## Caption Writing Rules
- Write captions in ${brand.language === "TH" ? "Thai" : brand.language === "EN" ? "English" : "both Thai and English"}
- Match the brand tone: ${brand.tone ?? "Professional"}
- NEVER use ":" (colon) in captions — use spaces or line breaks instead
- Use "." (dot) on a line by itself to create visual spacing between sections
- Use emoji icons as bullet points or section headers
- Structure captions like this:
  1. Hook/headline (attention-grabbing first line)
  2. . (dot for spacing)
  3. Main content with emoji bullet points
  4. . (dot for spacing)
  5. Call-to-Action (e.g. "สอบถามทีมงานทางแชทนี้ได้เลยนะคะ", "กดเซฟเก็บไว้ได้เลยค่า")
  6. . (dot for spacing)
  7. Contact info section (Inbox, Line, Call)
  8. . (dot for spacing)
  9. Hashtags on the LAST line, separated by spaces

## Image Prompt Rules
- Each post MUST have both image_prompt_th and image_prompt_en
- image_prompt MUST include text overlay instructions: specify a short headline text in Thai AND English to be displayed ON the image (like a social media graphic with text overlay, not just a photo)
- image_prompt should describe a visually compelling graphic/banner with text overlay, background design, color scheme, and typography style
- Use brand gradient colors: #ee0f39 (red) to #381f8f (dark purple), diagonal from top-left to bottom-right as the primary background gradient
- Example: "Gradient background from #ee0f39 to #381f8f (top-left to bottom-right), with upward trending graph icons in white/light colors, text overlay: 'การตลาดออนไลน์สำหรับธุรกิจยุคดิจิทัล' in bold white Thai font at top center, 'Digital Marketing for Businesses in the Digital Age' in smaller white English below, modern flat design style, professional social media banner"

## Other Rules
- Hashtags should be relevant and include a mix of popular and niche tags
- Put hashtags AFTER the caption, separated by a blank line with "."
- tags must only use: promotion, education, engagement, branding, seasonal, testimonial
- Return ONLY the JSON array, no markdown code blocks, no explanation`;
}

// ─── Single/Series Post Prompt ────────────────────────────────

export interface GeneratePostPromptInput {
  brand: BrandContext;
  topic: string;
  type: "single" | "series";
  seriesCount?: number; // 3, 5, or 7
  language?: string; // override
}

export function buildGeneratePostSystemPrompt(input: GeneratePostPromptInput): string {
  const { brand, topic, type, seriesCount, language } = input;
  const lang = language ?? brand.language;
  const count = type === "series" ? (seriesCount ?? 3) : 1;

  return `You are a professional social media content creator for a ${brand.platform} page.

## Brand Profile
${buildBrandSection(brand)}

## Task
${type === "single"
    ? `Create a single post about: ${topic}`
    : `Create a series of ${count} posts about: ${topic}. Each post should build on the previous one to form a cohesive series.`}

## Output Requirements
Return a valid JSON array with ${count} item(s). Each item must match this structure exactly:
{
  "title": "<short title>",
  "caption": "<full post caption with line breaks>",
  "hashtags": ["tag1", "tag2", ...],
  "tags": ["promotion" | "education" | "engagement" | "branding" | "seasonal" | "testimonial"],
  "image_prompt_th": "<image generation prompt in Thai>",
  "image_prompt_en": "<image generation prompt in English>",
  "image_ratio": "1:1" | "4:5" | "16:9" | "9:16",
  "content_type": "regular_post" | "article_share" | "promotion" | "engagement" | "repost"
}

## Caption Writing Rules
- Write captions in ${lang === "TH" ? "Thai" : lang === "EN" ? "English" : "both Thai and English"}
- Match the brand tone: ${brand.tone ?? "Professional"}
- NEVER use ":" (colon) in captions — use spaces or line breaks instead
- Use "." (dot) on a line by itself to create visual spacing between sections
- Use emoji icons as bullet points or section headers
- Structure captions like this:
  1. Hook/headline (attention-grabbing first line)
  2. . (dot for spacing)
  3. Main content with emoji bullet points
  4. . (dot for spacing)
  5. Call-to-Action (e.g. "สอบถามทีมงานทางแชทนี้ได้เลยนะคะ", "กดเซฟเก็บไว้ได้เลยค่า")
  6. . (dot for spacing)
  7. Contact info section (Inbox, Line, Call)
  8. . (dot for spacing)
  9. Hashtags on the LAST line, separated by spaces

## Image Prompt Rules
- Each post MUST have both image_prompt_th and image_prompt_en
- image_prompt MUST include text overlay instructions: specify a short headline text in Thai AND English to be displayed ON the image
- image_prompt should describe a visually compelling graphic/banner with text overlay, background design, color scheme, and typography style
- Use brand gradient colors: #ee0f39 (red) to #381f8f (dark purple), diagonal from top-left to bottom-right as the primary background gradient
- Example: "Gradient background from #ee0f39 to #381f8f (top-left to bottom-right), with upward trending graph icons in white/light colors, text overlay: 'การตลาดออนไลน์สำหรับธุรกิจยุคดิจิทัล' in bold white Thai font at top center, 'Digital Marketing for Businesses in the Digital Age' in smaller white English below, modern flat design style, professional social media banner"

## Other Rules
- Hashtags should be relevant and include a mix of popular and niche tags
- tags must only use: promotion, education, engagement, branding, seasonal, testimonial
- Return ONLY the JSON array, no markdown code blocks, no explanation`;
}
