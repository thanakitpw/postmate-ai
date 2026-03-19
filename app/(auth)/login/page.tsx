"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.email("กรุณากรอกอีเมลที่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function validateForm(): boolean {
    const result = loginSchema.safeParse(formData);
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
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          setServerError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        } else {
          setServerError(error.message);
        }
        return;
      }

      // Full page reload to ensure auth cookies are sent with the request
      window.location.href = "/";
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
    <div className="w-full max-w-[420px]">
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-10 shadow-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 inline-flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#6366f1] text-white">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h1 className="text-[1.375rem] font-bold tracking-tight text-[#1e293b]">PostMate AI</h1>
          <p className="mt-1 text-[0.8125rem] text-[#94a3b8]">จัดการ Social Media อัจฉริยะ</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {serverError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{serverError}</span>
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-[0.775rem] font-medium text-[#1e293b]">อีเมล</label>
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-[0.8125rem] text-[#1e293b] placeholder-[#94a3b8] transition-all focus:border-[#6366f1] focus:outline-none focus:ring-[3px] focus:ring-[rgba(99,102,241,0.08)]"
              aria-invalid={!!errors.email}
              autoComplete="email"
              disabled={isLoading}
            />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[0.775rem] font-medium text-[#1e293b]">
              รหัสผ่าน
            </label>
            <input
              type="password"
              name="password"
              placeholder="รหัสผ่าน"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-[0.8125rem] text-[#1e293b] placeholder-[#94a3b8] transition-all focus:border-[#6366f1] focus:outline-none focus:ring-[3px] focus:ring-[rgba(99,102,241,0.08)]"
              aria-invalid={!!errors.password}
              autoComplete="current-password"
              disabled={isLoading}
            />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
          </div>

          <div className="mb-6 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-[0.85rem] text-[#94a3b8]">
              <input type="checkbox" defaultChecked className="accent-[#6366f1]" />
              จดจำฉัน
            </label>
            <Link
              href="/forgot-password"
              className="text-[0.85rem] text-[#6366f1] no-underline hover:text-[#4f46e5]"
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366f1] px-5 py-2.5 text-[0.875rem] font-medium text-white shadow-[0_1px_2px_rgba(99,102,241,0.2)] transition-all hover:bg-[#4f46e5] hover:shadow-[0_2px_4px_rgba(99,102,241,0.3)] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              "เข้าสู่ระบบ"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 border-t border-[#e5e7eb] pt-6 text-center">
          <p className="text-[0.85rem] text-[#94a3b8]">
            ยังไม่มีบัญชี?{" "}
            <a href="#" className="font-medium text-[#6366f1] no-underline hover:text-[#4f46e5]">
              ติดต่อเรา
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
