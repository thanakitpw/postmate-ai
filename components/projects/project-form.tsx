"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  Save,
  Loader2,
  AlertCircle,
  Megaphone,
  Target,
  Link2,
  Sparkles,
  Globe,
  Facebook,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TONES, LANGUAGES } from "@/types/database";
import type { Project, Platform, Tone, Language } from "@/types/database";

// ─── Types ──────────────────────────────────────────

interface BrandAnalysisResult {
  business_type: string;
  target_audience: string;
  tone: Tone;
  brand_voice_notes: string;
  language: Language;
  suggested_project_name: string;
  suggested_page_name: string;
}

// ─── Schema ─────────────────────────────────────────

const projectSchema = z.object({
  project_name: z.string().min(1, "กรุณากรอกชื่อโปรเจค"),
  platform: z.enum(["facebook", "instagram", "tiktok"], {
    message: "กรุณาเลือกแพลตฟอร์ม",
  }),
  page_name: z.string().optional(),
  business_type: z.string().optional(),
  target_audience: z.string().optional(),
  tone: z
    .enum(["Professional", "Friendly", "Humorous", "Inspirational", "Urgent"])
    .nullable()
    .optional(),
  brand_voice_notes: z.string().optional(),
  language: z.enum(["TH", "EN", "Both"]).default("TH"),
  website_url: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\/.+/.test(val),
      "กรุณากรอก URL ที่ถูกต้อง (เริ่มด้วย http:// หรือ https://)"
    ),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface FormErrors {
  project_name?: string;
  platform?: string;
  page_name?: string;
  business_type?: string;
  target_audience?: string;
  tone?: string;
  brand_voice_notes?: string;
  language?: string;
  website_url?: string;
}

interface ProjectFormProps {
  clientId: string;
  initialData?: Project;
  mode: "create" | "edit";
}

// ─── Constants ──────────────────────────────────────

const platformOptions: { value: Platform; label: string; description: string; color: string }[] = [
  {
    value: "facebook",
    label: "Facebook",
    description: "เพจ Facebook สำหรับโพสต์และแชร์เนื้อหา",
    color: "border-blue-500 bg-blue-50 text-blue-700",
  },
  {
    value: "instagram",
    label: "Instagram",
    description: "โพสต์รูปภาพและวิดีโอบน Instagram",
    color: "border-pink-500 bg-pink-50 text-pink-700",
  },
  {
    value: "tiktok",
    label: "TikTok",
    description: "สร้างและโพสต์วิดีโอบน TikTok",
    color: "border-gray-800 bg-gray-50 text-gray-800",
  },
];

const toneLabels: Record<string, string> = {
  Professional: "มืออาชีพ",
  Friendly: "เป็นกันเอง",
  Humorous: "ตลกขบขัน",
  Inspirational: "สร้างแรงบันดาลใจ",
  Urgent: "เร่งด่วน",
};

const languageLabels: Record<string, string> = {
  TH: "ไทย",
  EN: "อังกฤษ",
  Both: "ไทย + อังกฤษ",
};

// ─── Shimmer Component ──────────────────────────────

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        className
      )}
      style={{
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
    />
  );
}

// ─── AI Analyzer Section ────────────────────────────

function AIAnalyzerSection({
  onResult,
  isDisabled,
}: {
  onResult: (result: BrandAnalysisResult) => void;
  isDisabled: boolean;
}) {
  const [analyzeUrl, setAnalyzeUrl] = useState("");
  const [analyzeType, setAnalyzeType] = useState<"facebook" | "website">("facebook");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeSuccess, setAnalyzeSuccess] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!analyzeUrl.trim()) {
      setAnalyzeError("กรุณากรอก URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(analyzeUrl);
    } catch {
      setAnalyzeError("กรุณากรอก URL ที่ถูกต้อง (เริ่มด้วย http:// หรือ https://)");
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeSuccess(false);

    try {
      const response = await fetch("/api/ai/analyze-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: analyzeUrl, type: analyzeType }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? "ไม่สามารถวิเคราะห์ได้ กรุณาลองใหม่");
      }

      const data = await response.json() as { result: BrandAnalysisResult };
      onResult(data.result);
      setAnalyzeSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่";
      setAnalyzeError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeUrl, analyzeType, onResult]);

  return (
    <div className="space-y-4">
      {/* Type toggle */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-900">ประเภท URL</Label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isDisabled || isAnalyzing}
            onClick={() => {
              setAnalyzeType("facebook");
              setAnalyzeError(null);
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all",
              analyzeType === "facebook"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            <Facebook className="size-4" />
            Facebook Page
          </button>
          <button
            type="button"
            disabled={isDisabled || isAnalyzing}
            onClick={() => {
              setAnalyzeType("website");
              setAnalyzeError(null);
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all",
              analyzeType === "website"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            <Globe className="size-4" />
            เว็บไซต์
          </button>
        </div>
      </div>

      {/* URL input */}
      <div className="space-y-2">
        <Label htmlFor="analyze_url">
          {analyzeType === "facebook" ? "Facebook Page URL" : "Website URL"}
        </Label>
        <div className="relative">
          {analyzeType === "facebook" ? (
            <Facebook className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          ) : (
            <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          )}
          <Input
            id="analyze_url"
            placeholder={
              analyzeType === "facebook"
                ? "https://facebook.com/yourpage"
                : "https://yourwebsite.com"
            }
            value={analyzeUrl}
            onChange={(e) => {
              setAnalyzeUrl(e.target.value);
              if (analyzeError) setAnalyzeError(null);
            }}
            className="h-10 pl-10"
            disabled={isDisabled || isAnalyzing}
          />
        </div>
      </div>

      {/* Analyze button */}
      <Button
        type="button"
        onClick={handleAnalyze}
        disabled={isDisabled || isAnalyzing || !analyzeUrl.trim()}
        className="gap-2 bg-indigo-600 hover:bg-indigo-700"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            กำลังวิเคราะห์...
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            วิเคราะห์ด้วย AI
          </>
        )}
      </Button>

      {/* Loading shimmer */}
      {isAnalyzing && (
        <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
            <Sparkles className="size-4" />
            AI กำลังวิเคราะห์ข้อมูล Brand...
          </div>
          <div className="space-y-2">
            <ShimmerBlock className="h-4 w-3/4" />
            <ShimmerBlock className="h-4 w-1/2" />
            <ShimmerBlock className="h-4 w-2/3" />
            <ShimmerBlock className="h-4 w-5/6" />
          </div>
        </div>
      )}

      {/* Success banner */}
      {analyzeSuccess && !isAnalyzing && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>AI วิเคราะห์เรียบร้อย คุณสามารถแก้ไขข้อมูลได้</span>
        </div>
      )}

      {/* Error */}
      {analyzeError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="size-4 shrink-0" />
          <span>{analyzeError}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Form Component ────────────────────────────

export function ProjectForm({ clientId, initialData, mode }: ProjectFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<ProjectFormData>({
    project_name: initialData?.project_name ?? "",
    platform: initialData?.platform ?? "facebook",
    page_name: initialData?.page_name ?? "",
    business_type: initialData?.business_type ?? "",
    target_audience: initialData?.target_audience ?? "",
    tone: initialData?.tone ?? null,
    brand_voice_notes: initialData?.brand_voice_notes ?? "",
    language: initialData?.language ?? "TH",
    website_url: initialData?.website_url ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAIAnalyzer, setShowAIAnalyzer] = useState(false);

  function validateForm(): boolean {
    const result = projectSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const supabase = createClient();

      if (mode === "create") {
        const { data, error } = await supabase
          .from("projects")
          .insert({
            client_id: clientId,
            project_name: formData.project_name,
            platform: formData.platform,
            page_name: formData.page_name || null,
            business_type: formData.business_type || null,
            target_audience: formData.target_audience || null,
            tone: formData.tone || null,
            brand_voice_notes: formData.brand_voice_notes || null,
            language: formData.language,
            website_url: formData.website_url || null,
          })
          .select("id")
          .single();

        if (error) {
          setServerError("ไม่สามารถสร้างโปรเจคได้ กรุณาลองใหม่");
          return;
        }

        router.push(`/projects/${data.id}`);
        router.refresh();
      } else if (initialData) {
        const { error } = await supabase
          .from("projects")
          .update({
            project_name: formData.project_name,
            page_name: formData.page_name || null,
            business_type: formData.business_type || null,
            target_audience: formData.target_audience || null,
            tone: formData.tone || null,
            brand_voice_notes: formData.brand_voice_notes || null,
            language: formData.language,
            website_url: formData.website_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id);

        if (error) {
          setServerError("ไม่สามารถอัปเดตโปรเจคได้ กรุณาลองใหม่");
          return;
        }

        router.push(`/projects/${initialData.id}/settings`);
        router.refresh();
      }
    } catch {
      setServerError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) {
      setServerError(null);
    }
  }

  const handleAIResult = useCallback((result: BrandAnalysisResult) => {
    setFormData((prev) => ({
      ...prev,
      business_type: result.business_type || prev.business_type,
      target_audience: result.target_audience || prev.target_audience,
      tone: result.tone || prev.tone,
      brand_voice_notes: result.brand_voice_notes || prev.brand_voice_notes,
      language: result.language || prev.language,
      project_name: result.suggested_project_name || prev.project_name,
      page_name: result.suggested_page_name || prev.page_name,
    }));
    // Clear any existing errors for the fields that were filled
    setErrors({});
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {serverError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Platform selector */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-900">แพลตฟอร์ม</Label>
        {mode === "edit" ? (
          <div className="flex items-center gap-2">
            {platformOptions
              .filter((p) => p.value === formData.platform)
              .map((p) => (
                <div
                  key={p.value}
                  className={cn(
                    "rounded-lg border-2 px-4 py-2 text-sm font-medium",
                    p.color
                  )}
                >
                  {p.label}
                </div>
              ))}
            <span className="text-xs text-gray-400">
              ไม่สามารถเปลี่ยนแพลตฟอร์มได้
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {platformOptions.map((platform) => (
              <button
                key={platform.value}
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    platform: platform.value,
                  }));
                  if (errors.platform) {
                    setErrors((prev) => ({ ...prev, platform: undefined }));
                  }
                }}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  formData.platform === platform.value
                    ? platform.color
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <p className="font-semibold">{platform.label}</p>
                <p className="mt-1 text-xs opacity-70">{platform.description}</p>
              </button>
            ))}
          </div>
        )}
        {errors.platform && (
          <p className="text-sm text-red-500">{errors.platform}</p>
        )}
      </div>

      {/* Brand Profile section */}
      <div className="space-y-4 border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            Brand Profile
          </h3>
          {mode === "create" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAIAnalyzer((prev) => !prev)}
              className={cn(
                "gap-1.5 text-xs transition-colors",
                showAIAnalyzer
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  : "text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              )}
            >
              <Sparkles className="size-3.5" />
              วิเคราะห์ด้วย AI
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  showAIAnalyzer && "rotate-180"
                )}
              />
            </Button>
          )}
        </div>

        {/* Collapsible AI Analyzer Panel */}
        {mode === "create" && (
          <div
            className={cn(
              "grid transition-all duration-300 ease-in-out",
              showAIAnalyzer ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-4">
                <AIAnalyzerSection
                  onResult={handleAIResult}
                  isDisabled={isLoading}
                />
              </div>
            </div>
          </div>
        )}

        {/* Project name */}
        <div className="space-y-2">
          <Label htmlFor="project_name">ชื่อโปรเจค</Label>
          <div className="relative">
            <Megaphone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="project_name"
              name="project_name"
              placeholder="เช่น Facebook เพจหลัก"
              value={formData.project_name}
              onChange={handleChange}
              className="h-10 pl-10"
              aria-invalid={!!errors.project_name}
              disabled={isLoading}
            />
          </div>
          {errors.project_name && (
            <p className="text-sm text-red-500">{errors.project_name}</p>
          )}
        </div>

        {/* Page name */}
        <div className="space-y-2">
          <Label htmlFor="page_name">ชื่อเพจ / บัญชี</Label>
          <Input
            id="page_name"
            name="page_name"
            placeholder="ชื่อเพจหรือบัญชีบนแพลตฟอร์ม"
            value={formData.page_name}
            onChange={handleChange}
            className="h-10"
            disabled={isLoading}
          />
        </div>

        {/* Business type */}
        <div className="space-y-2">
          <Label htmlFor="business_type">ประเภทธุรกิจ</Label>
          <div className="relative">
            <Target className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="business_type"
              name="business_type"
              placeholder="เช่น ร้านอาหาร, คลินิกความงาม, IT Solutions"
              value={formData.business_type}
              onChange={handleChange}
              className="h-10 pl-10"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Target audience */}
        <div className="space-y-2">
          <Label htmlFor="target_audience">กลุ่มเป้าหมาย</Label>
          <Textarea
            id="target_audience"
            name="target_audience"
            placeholder="เช่น ผู้หญิงอายุ 25-40 ปี ที่สนใจเรื่องสุขภาพ"
            value={formData.target_audience}
            onChange={handleChange}
            disabled={isLoading}
            rows={2}
          />
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <Label>โทนการสื่อสาร</Label>
          <Select
            value={formData.tone ?? undefined}
            onValueChange={(val) =>
              setFormData((prev) => ({
                ...prev,
                tone: val as Tone,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="เลือกโทนการสื่อสาร" />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((tone) => (
                <SelectItem key={tone} value={tone}>
                  {toneLabels[tone] ?? tone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Brand voice notes */}
        <div className="space-y-2">
          <Label htmlFor="brand_voice_notes">หมายเหตุ Brand Voice</Label>
          <Textarea
            id="brand_voice_notes"
            name="brand_voice_notes"
            placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับ brand voice เช่น คำที่ใช้บ่อย, สิ่งที่ควรหลีกเลี่ยง"
            value={formData.brand_voice_notes}
            onChange={handleChange}
            disabled={isLoading}
            rows={3}
          />
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label>ภาษาที่ใช้</Label>
          <Select
            value={formData.language}
            onValueChange={(val) =>
              setFormData((prev) => ({
                ...prev,
                language: val as Language,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="เลือกภาษา" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {languageLabels[lang] ?? lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Website URL */}
        <div className="space-y-2">
          <Label htmlFor="website_url">เว็บไซต์</Label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="website_url"
              name="website_url"
              placeholder="https://example.com"
              value={formData.website_url}
              onChange={handleChange}
              className="h-10 pl-10"
              aria-invalid={!!errors.website_url}
              disabled={isLoading}
            />
          </div>
          {errors.website_url && (
            <p className="text-sm text-red-500">{errors.website_url}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Save className="size-4" />
              {mode === "create" ? "สร้างโปรเจค" : "บันทึกการเปลี่ยนแปลง"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
