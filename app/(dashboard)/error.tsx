"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-red-50">
        <AlertTriangle className="size-8 text-red-500" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-gray-900">
        เกิดข้อผิดพลาด
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-gray-500">
        ระบบพบข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่ กรุณาติดต่อทีมสนับสนุน
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-gray-400">
          Error ID {error.digest}
        </p>
      )}
      <Button
        onClick={reset}
        variant="outline"
        className="mt-6 gap-2"
      >
        <RotateCcw className="size-4" />
        ลองใหม่อีกครั้ง
      </Button>
    </div>
  );
}
