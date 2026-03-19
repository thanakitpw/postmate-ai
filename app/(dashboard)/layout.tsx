import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Try to get user - middleware already handles auth redirect
  // so if we're here, user should be authenticated
  let userName = "User";
  let userEmail = "";
  let userId = "";
  let userRole = "owner";

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
      userEmail = user.email ?? "";
      userName = user.email?.split("@")[0] ?? "User";

      // Fetch profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (profile) {
        userName = profile.full_name ?? userName;
        userRole = profile.role;
      }
    }
  } catch {
    // Auth error - middleware will handle redirect
  }

  return (
    <DashboardShell
      user={{
        id: userId,
        email: userEmail,
        fullName: userName,
        role: userRole,
      }}
    >
      {children}
    </DashboardShell>
  );
}
