"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  Save,
  Loader2,
  AlertCircle,
  Megaphone,
  Target,
  Link2,
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

      <div className="border-t border-gray-200 pt-6">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Brand Profile
        </h3>

        <div className="space-y-4">
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
