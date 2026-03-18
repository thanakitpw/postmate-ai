import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ClientForm } from "@/components/clients/client-form";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link href="/">
        <Button variant="ghost" className="gap-2 text-gray-600">
          <ArrowLeft className="size-4" />
          กลับไปหน้าหลัก
        </Button>
      </Link>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">
            เพิ่มลูกค้าใหม่
          </CardTitle>
          <CardDescription className="text-gray-500">
            กรอกข้อมูลลูกค้าเพื่อเริ่มจัดการโปรเจคโซเชียลมีเดีย
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
