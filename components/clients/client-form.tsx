"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { User, Mail, Phone, Building2, Save, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client } from "@/types/database";

const clientSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อลูกค้า"),
  contact_name: z.string().optional(),
  contact_email: z
    .string()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      "กรุณากรอกอีเมลที่ถูกต้อง"
    ),
  contact_phone: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface FormErrors {
  name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface ClientFormProps {
  initialData?: Client;
  mode: "create" | "edit";
}

export function ClientForm({ initialData, mode }: ClientFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<ClientFormData>({
    name: initialData?.name ?? "",
    contact_name: initialData?.contact_name ?? "",
    contact_email: initialData?.contact_email ?? "",
    contact_phone: initialData?.contact_phone ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function validateForm(): boolean {
    const result = clientSchema.safeParse(formData);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setServerError("กรุณาเข้าสู่ระบบใหม่");
        return;
      }

      if (mode === "create") {
        const { data, error } = await supabase
          .from("clients")
          .insert({
            owner_id: user.id,
            name: formData.name,
            contact_name: formData.contact_name || null,
            contact_email: formData.contact_email || null,
            contact_phone: formData.contact_phone || null,
          })
          .select("id")
          .single();

        if (error) {
          setServerError("ไม่สามารถสร้างลูกค้าได้ กรุณาลองใหม่");
          return;
        }

        router.push(`/clients/${data.id}`);
        router.refresh();
      } else if (initialData) {
        const { error } = await supabase
          .from("clients")
          .update({
            name: formData.name,
            contact_name: formData.contact_name || null,
            contact_email: formData.contact_email || null,
            contact_phone: formData.contact_phone || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id);

        if (error) {
          setServerError("ไม่สามารถอัปเดตข้อมูลลูกค้าได้ กรุณาลองใหม่");
          return;
        }

        router.push(`/clients/${initialData.id}`);
        router.refresh();
      }
    } catch {
      setServerError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Client name */}
        <div className="space-y-2">
          <Label htmlFor="name">ชื่อลูกค้า / บริษัท</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="name"
              name="name"
              placeholder="เช่น บริษัท ABC จำกัด"
              value={formData.name}
              onChange={handleChange}
              className="h-10 pl-10"
              aria-invalid={!!errors.name}
              disabled={isLoading}
            />
          </div>
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Contact name */}
        <div className="space-y-2">
          <Label htmlFor="contact_name">ชื่อผู้ติดต่อ</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="contact_name"
              name="contact_name"
              placeholder="ชื่อผู้ติดต่อหลัก"
              value={formData.contact_name}
              onChange={handleChange}
              className="h-10 pl-10"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Contact email */}
        <div className="space-y-2">
          <Label htmlFor="contact_email">อีเมล</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              placeholder="email@example.com"
              value={formData.contact_email}
              onChange={handleChange}
              className="h-10 pl-10"
              aria-invalid={!!errors.contact_email}
              disabled={isLoading}
            />
          </div>
          {errors.contact_email && (
            <p className="text-sm text-red-500">{errors.contact_email}</p>
          )}
        </div>

        {/* Contact phone */}
        <div className="space-y-2">
          <Label htmlFor="contact_phone">เบอร์โทรศัพท์</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="contact_phone"
              name="contact_phone"
              placeholder="08x-xxx-xxxx"
              value={formData.contact_phone}
              onChange={handleChange}
              className="h-10 pl-10"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
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
              {mode === "create" ? "สร้างลูกค้า" : "บันทึกการเปลี่ยนแปลง"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
