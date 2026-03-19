import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <Loader2 className="size-8 animate-spin text-indigo-500" />
      <p className="mt-4 text-sm text-gray-500">กำลังโหลด...</p>
    </div>
  );
}
