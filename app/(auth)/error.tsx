"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[Auth Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex size-12 items-center justify-center rounded-xl bg-red-50">
        <AlertTriangle className="size-6 text-red-500" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">
        เกิดข้อผิดพลาด
      </h2>
      <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
        ไม่สามารถโหลดหน้านี้ได้ กรุณาลองใหม่อีกครั้ง
      </p>
      <Button
        onClick={reset}
        variant="outline"
        className="mt-4 gap-2"
      >
        <RotateCcw className="size-4" />
        ลองใหม่อีกครั้ง
      </Button>
    </div>
  );
}
