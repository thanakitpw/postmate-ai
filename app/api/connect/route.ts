import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { platform, projectId } = body as {
      platform: string;
      projectId: string;
    };

    if (!platform || !projectId) {
      return NextResponse.json(
        { error: "platform and projectId are required" },
        { status: 400 }
      );
    }

    // Check VPS is configured
    const vpsUrl = process.env.VPS_API_URL;
    const vpsSecret = process.env.VPS_API_SECRET;

    if (!vpsUrl || !vpsSecret || vpsUrl.includes("your-vps")) {
      return NextResponse.json(
        { error: "Playwright Service ยังไม่ได้ตั้งค่า กรุณาตั้งค่า VPS_API_URL ใน .env.local" },
        { status: 503 }
      );
    }

    // Call Playwright Service /api/connect
    const response = await fetch(`${vpsUrl}/api/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vpsSecret}`,
      },
      body: JSON.stringify({ platform, projectId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Playwright Service error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.success || !data.encryptedCookies) {
      return NextResponse.json(
        { error: data.error ?? "ไม่ได้รับ cookies จาก browser" },
        { status: 400 }
      );
    }

    // Save encrypted cookies to project_sessions
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days default

    // Check if session already exists
    const { data: existingSession } = await supabase
      .from("project_sessions")
      .select("id")
      .eq("project_id", projectId)
      .eq("platform", platform)
      .eq("status", "active")
      .single();

    if (existingSession) {
      // Update existing session
      await supabase
        .from("project_sessions")
        .update({
          cookies_encrypted: data.encryptedCookies,
          status: "active",
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", existingSession.id);
    } else {
      // Create new session
      await supabase.from("project_sessions").insert({
        project_id: projectId,
        platform,
        cookies_encrypted: data.encryptedCookies,
        status: "active",
        expires_at: expiresAt.toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
