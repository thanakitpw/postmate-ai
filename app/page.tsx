import { redirect } from "next/navigation";

// Root page redirects to the dashboard (which handles auth via middleware)
export default function RootPage() {
  redirect("/login");
}
