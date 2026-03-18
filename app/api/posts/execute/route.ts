import { NextResponse } from "next/server";

// Trigger Playwright on VPS for auto-posting
export async function POST() {
  // TODO: Implement post execution via VPS
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
