import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/project-form";

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Verify client belongs to user (middleware guarantees auth)
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .eq("owner_id", user?.id ?? "")
    .single();

  if (error || !client) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link href={`/clients/${clientId}`}>
        <Button variant="ghost" className="gap-2 text-gray-600">
          <ArrowLeft className="size-4" />
          กลับไปหน้า {client.name}
        </Button>
      </Link>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">
            สร้างโปรเจคใหม่
          </CardTitle>
          <CardDescription className="text-gray-500">
            เลือกแพลตฟอร์มและกรอกข้อมูล Brand Profile สำหรับ{" "}
            <span className="font-medium text-gray-700">{client.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm clientId={clientId} mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
