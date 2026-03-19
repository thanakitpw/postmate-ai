"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const forgotPasswordSchema = z.object({
  email: z.email("กรุณากรอกอีเมลที่ถูกต้อง"),
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  function validateForm(): boolean {
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      setError(firstIssue?.message ?? "กรุณากรอกข้อมูลให้ถูกต้อง");
      return false;
    }
    setError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setServerError(resetError.message);
        return;
      }

      setIsSent(true);
    } catch {
      setServerError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
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
          <h1 className="text-[1.375rem] font-bold tracking-tight text-[#1e293b]">ลืมรหัสผ่าน</h1>
          <p className="mt-1 text-[0.8125rem] text-[#94a3b8]">
            กรอกอีเมลเพื่อรับลิงก์รีเซ็ตรหัสผ่าน
          </p>
        </div>

        {/* Form */}
        {!isSent ? (
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
              <label className="mb-1.5 block text-[0.775rem] font-medium text-[#1e293b]">
                อีเมล
              </label>
              <input
                type="email"
                name="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                  if (serverError) setServerError(null);
                }}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-[0.8125rem] text-[#1e293b] placeholder-[#94a3b8] transition-all focus:border-[#6366f1] focus:outline-none focus:ring-[3px] focus:ring-[rgba(99,102,241,0.08)]"
                aria-invalid={!!error}
                autoComplete="email"
                disabled={isLoading}
              />
              {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366f1] px-5 py-2.5 text-[0.875rem] font-medium text-white shadow-[0_1px_2px_rgba(99,102,241,0.2)] transition-all hover:bg-[#4f46e5] hover:shadow-[0_2px_4px_rgba(99,102,241,0.3)] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  กำลังส่ง...
                </>
              ) : (
                "ส่งลิงก์รีเซ็ต"
              )}
            </button>
          </form>
        ) : (
          /* Success message */
          <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-6 text-center">
            <div className="mb-2">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#166534"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 4L12 13 2 4" />
              </svg>
            </div>
            <h3 className="mb-2 font-semibold text-[#166534]">ส่งอีเมลเรียบร้อย!</h3>
            <p className="text-[0.85rem] text-[#15803d]">
              กรุณาตรวจสอบอีเมลของคุณ แล้วคลิกลิงก์เพื่อรีเซ็ตรหัสผ่าน
            </p>
          </div>
        )}

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[0.85rem] text-[#6366f1] no-underline hover:text-[#4f46e5]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
