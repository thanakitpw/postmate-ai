"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

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
    <div className="w-full max-w-md">
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">รีเซ็ตรหัสผ่าน</CardTitle>
          <CardDescription className="text-muted-foreground">
            {isSent
              ? "ตรวจสอบอีเมลของคุณเพื่อรีเซ็ตรหัสผ่าน"
              : "กรอกอีเมลเพื่อรับลิงก์รีเซ็ตรหัสผ่าน"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isSent ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle2 className="size-5 shrink-0" />
                <div>
                  <p className="font-medium">ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว</p>
                  <p className="mt-1 text-green-600">
                    กรุณาตรวจสอบอีเมล {email} และทำตามขั้นตอนในอีเมลเพื่อรีเซ็ตรหัสผ่าน
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="h-10 w-full"
                size="lg"
                onClick={() => {
                  setIsSent(false);
                  setEmail("");
                }}
              >
                ส่งอีเมลอีกครั้ง
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {serverError && (
                <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg p-3 text-sm">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                      if (serverError) setServerError(null);
                    }}
                    className="h-10 pl-10"
                    aria-invalid={!!error}
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
              </div>

              <Button type="submit" className="h-10 w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    กำลังส่ง...
                  </span>
                ) : (
                  "ส่งลิงก์รีเซ็ตรหัสผ่าน"
                )}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-primary flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
