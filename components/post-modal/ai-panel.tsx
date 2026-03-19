"use client";

import { Sparkles } from "lucide-react";

export function AiPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-indigo-50">
        <Sparkles className="size-8 text-indigo-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        AI สร้างเนื้อหา
      </h3>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        ฟีเจอร์ AI สร้างเนื้อหาจะพร้อมใช้งานเร็ว ๆ นี้
        สามารถสร้างโพสต์ด้วยตนเองในแท็บ Manual ได้ก่อน
      </p>
    </div>
  );
}
