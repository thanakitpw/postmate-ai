"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface DeleteProjectDialogProps {
  projectId: string;
  projectName: string;
  clientId: string;
}

export function DeleteProjectDialog({
  projectId,
  projectName,
  clientId,
}: DeleteProjectDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) {
        throw error;
      }

      router.push(`/clients/${clientId}`);
      router.refresh();
    } catch {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" className="gap-2">
            <Trash2 className="size-4" />
            ลบโปรเจค
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="size-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>ยืนยันการลบโปรเจค</DialogTitle>
              <DialogDescription>
                การลบจะลบข้อมูลทั้งหมดรวมถึงโพสต์ ประวัติการโพสต์ และ session
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">
            คุณกำลังจะลบโปรเจค{" "}
            <span className="font-semibold">{projectName}</span>{" "}
            ข้อมูลทั้งหมดจะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้
          </p>
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={isDeleting}>
                ยกเลิก
              </Button>
            }
          />
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                กำลังลบ...
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                ลบโปรเจค
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
