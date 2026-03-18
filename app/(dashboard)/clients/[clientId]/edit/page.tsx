import Link from "next/link";
import { redirect, notFound } from "next/navigation";
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
import { ClientForm } from "@/components/clients/client-form";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("owner_id", user.id)
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
            แก้ไขข้อมูลลูกค้า
          </CardTitle>
          <CardDescription className="text-gray-500">
            อัปเดตข้อมูลลูกค้า {client.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm initialData={client} mode="edit" />
        </CardContent>
      </Card>
    </div>
  );
}
