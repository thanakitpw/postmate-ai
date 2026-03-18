"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ProjectActiveToggleProps {
  projectId: string;
  isActive: boolean;
}

export function ProjectActiveToggle({
  projectId,
  isActive: initialIsActive,
}: ProjectActiveToggleProps) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleToggle(checked: boolean) {
    setIsUpdating(true);
    setIsActive(checked);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("projects")
        .update({
          is_active: checked,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      if (error) {
        // Revert on error
        setIsActive(!checked);
      } else {
        router.refresh();
      }
    } catch {
      setIsActive(!checked);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
      <div>
        <Label className="text-sm font-medium text-gray-900">
          สถานะโปรเจค
        </Label>
        <p className="text-xs text-gray-500">
          {isActive
            ? "โปรเจคกำลังใช้งาน สามารถสร้างโพสต์และตั้งเวลาได้"
            : "โปรเจคปิดใช้งาน ไม่สามารถสร้างโพสต์ใหม่ได้"}
        </p>
      </div>
      <Switch
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isUpdating}
        aria-label="เปิด/ปิด โปรเจค"
      />
    </div>
  );
}
