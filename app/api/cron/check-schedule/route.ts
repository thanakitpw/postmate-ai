import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/encryption";
import { sendPostResultEmail } from "@/lib/email";

const MAX_RETRIES = 3;

interface VpsPostPayload {
  postId: string;
  projectId: string;
  platform: string;
  content: string;
  title: string | null;
  hashtags: string[];
  mediaUrls: string[];
  articleUrl: string | null;
  contentType: string;
  cookies: string; // decrypted cookies JSON
}

interface VpsResponse {
  success: boolean;
  platformPostId?: string;
  screenshotUrl?: string;
  error?: string;
}

/**
 * Trigger VPS Playwright service for a single post.
 * Returns the VPS response or null if VPS is not configured.
 */
async function triggerVps(payload: VpsPostPayload): Promise<VpsResponse | null> {
  const vpsUrl = process.env.VPS_API_URL;
  const vpsSecret = process.env.VPS_API_SECRET;

  if (
    !vpsUrl ||
    !vpsSecret ||
    vpsUrl === "https://your-vps-domain.com" ||
    vpsSecret === "your-vps-api-secret-here"
  ) {
    console.log(`[Cron] VPS not configured, skipping trigger for post ${payload.postId}`);
    return null;
  }

  // In production, require HTTPS for VPS URL (allow http://localhost in development)
  const isProduction = process.env.NODE_ENV === "production";
  const isLocalhost = vpsUrl.startsWith("http://localhost") || vpsUrl.startsWith("http://127.0.0.1");
  if (isProduction && !vpsUrl.startsWith("https://")) {
    console.error(`[Cron] VPS_API_URL must use HTTPS in production. Got: ${vpsUrl}`);
    return { success: false, error: "VPS_API_URL must use HTTPS in production" };
  }
  if (!isProduction && !vpsUrl.startsWith("https://") && !isLocalhost) {
    console.warn(`[Cron] VPS_API_URL is not HTTPS and not localhost: ${vpsUrl}`);
  }

  try {
    const response = await fetch(`${vpsUrl}/api/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vpsSecret}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `VPS returned ${response.status}: ${errorText}`,
      };
    }

    const data = (await response.json()) as VpsResponse;
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `VPS connection failed: ${message}`,
    };
  }
}

/**
 * Vercel Cron — check due posts and trigger execution.
 * Runs every minute via Vercel Cron (vercel.json).
 */
export async function GET(request: Request) {
  // 12.1 — Verify CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || cronSecret === "your-cron-secret-here") {
    console.warn("[Cron] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  const token = authHeader?.replace("Bearer ", "");
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const results = {
    processed: 0,
    published: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // 12.2 — Query due posts
    const { data: duePosts, error: queryError } = await supabase
      .from("posts")
      .select(`
        id,
        project_id,
        title,
        content,
        hashtags,
        media_urls,
        article_url,
        content_type,
        retry_count,
        status,
        projects!inner (
          id,
          platform,
          project_name,
          client_id,
          clients!inner (
            id,
            owner_id,
            contact_email
          )
        )
      `)
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true });

    if (queryError) {
      console.error("[Cron] Query error:", queryError.message);
      return NextResponse.json(
        { error: "Database query failed", details: queryError.message },
        { status: 500 }
      );
    }

    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({ message: "No due posts", ...results });
    }

    // Process each post
    for (const post of duePosts) {
      results.processed++;

      // Type assertion for joined data
      const project = post.projects as unknown as {
        id: string;
        platform: "facebook" | "instagram" | "tiktok";
        project_name: string;
        client_id: string;
        clients: { id: string; owner_id: string; contact_email: string | null };
      };

      // 12.3 — Update status to 'publishing' before trigger
      const { error: updateError } = await supabase
        .from("posts")
        .update({ status: "publishing" })
        .eq("id", post.id)
        .eq("status", "scheduled"); // Guard against race condition

      if (updateError) {
        results.errors.push(`Post ${post.id}: failed to set publishing — ${updateError.message}`);
        results.skipped++;
        continue;
      }

      // Get active session for this project (check expiry)
      let decryptedCookies = "{}";
      try {
        const { data: session } = await supabase
          .from("project_sessions")
          .select("id, cookies_encrypted, expires_at")
          .eq("project_id", post.project_id)
          .eq("platform", project.platform)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (session) {
          // Check if session has expired
          if (session.expires_at && new Date(session.expires_at) <= new Date()) {
            console.warn(`[Cron] Session expired for project ${post.project_id}, marking as expired`);

            // Update session status to expired
            await supabase
              .from("project_sessions")
              .update({ status: "expired" })
              .eq("id", session.id);

            // Revert post to scheduled — skip this run
            await supabase
              .from("posts")
              .update({ status: "scheduled" })
              .eq("id", post.id);

            results.skipped++;
            results.errors.push(`Post ${post.id}: session expired for project ${post.project_id}`);
            continue;
          }

          if (session.cookies_encrypted) {
            decryptedCookies = decrypt(session.cookies_encrypted);
          }
        } else {
          console.warn(`[Cron] No active session for project ${post.project_id}`);
        }
      } catch (decryptError) {
        const msg = decryptError instanceof Error ? decryptError.message : String(decryptError);
        console.error(`[Cron] Session decrypt error for post ${post.id}:`, msg);
        // Continue with empty cookies — VPS will handle the error
      }

      // 12.4 — Trigger VPS
      const vpsPayload: VpsPostPayload = {
        postId: post.id,
        projectId: post.project_id,
        platform: project.platform,
        content: post.content,
        title: post.title,
        hashtags: post.hashtags,
        mediaUrls: post.media_urls,
        articleUrl: post.article_url,
        contentType: post.content_type,
        cookies: decryptedCookies,
      };

      const vpsResult = await triggerVps(vpsPayload);

      // If VPS not configured, revert to scheduled and skip (do NOT fake publish)
      if (vpsResult === null) {
        console.warn(`[Cron] VPS not configured — reverting post ${post.id} to scheduled, skipping`);

        await supabase
          .from("posts")
          .update({ status: "scheduled" })
          .eq("id", post.id);

        results.skipped++;
        continue;
      }

      // Handle VPS response
      if (vpsResult.success) {
        // 12.6 — Success
        await supabase
          .from("posts")
          .update({ status: "published" })
          .eq("id", post.id);

        await supabase.from("post_results").insert({
          post_id: post.id,
          platform: project.platform,
          status: "success",
          platform_post_id: vpsResult.platformPostId ?? null,
          screenshot_url: vpsResult.screenshotUrl ?? null,
        });

        results.published++;

        // Send success email
        const ownerEmail = project.clients?.contact_email;
        if (ownerEmail) {
          await sendPostResultEmail(ownerEmail, post.title ?? "Untitled", "success").catch(
            (err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              console.error("[Cron] Email send error:", msg);
            }
          );
        }
      } else {
        // 12.5 — Failure + retry logic
        const currentRetry = post.retry_count + 1;

        if (currentRetry >= MAX_RETRIES) {
          // Max retries exceeded
          await supabase
            .from("posts")
            .update({
              status: "failed_final",
              retry_count: currentRetry,
            })
            .eq("id", post.id);

          await supabase.from("post_results").insert({
            post_id: post.id,
            platform: project.platform,
            status: "failed",
            error_message: vpsResult.error ?? "Unknown error after max retries",
            screenshot_url: vpsResult.screenshotUrl ?? null,
          });

          results.failed++;

          // Send failure email
          const ownerEmail = project.clients?.contact_email;
          if (ownerEmail) {
            await sendPostResultEmail(
              ownerEmail,
              post.title ?? "Untitled",
              "failed",
              vpsResult.error
            ).catch((err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              console.error("[Cron] Email send error:", msg);
            });
          }
        } else {
          // Schedule retry with exponential backoff (2^retry seconds)
          const backoffMs = Math.pow(2, currentRetry) * 1000;
          const retryAt = new Date(Date.now() + backoffMs).toISOString();

          await supabase
            .from("posts")
            .update({
              status: "scheduled",
              retry_count: currentRetry,
              scheduled_at: retryAt,
            })
            .eq("id", post.id);

          await supabase.from("post_results").insert({
            post_id: post.id,
            platform: project.platform,
            status: "failed",
            error_message: `Retry ${currentRetry}/${MAX_RETRIES}: ${vpsResult.error ?? "Unknown error"}`,
            screenshot_url: vpsResult.screenshotUrl ?? null,
          });

          console.log(
            `[Cron] Post ${post.id}: retry ${currentRetry}/${MAX_RETRIES}, next attempt at ${retryAt}`
          );
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Cron] Unexpected error:", message);
    return NextResponse.json(
      { error: "Internal error", details: message, ...results },
      { status: 500 }
    );
  }

  console.log("[Cron] Run complete:", results);
  return NextResponse.json({ message: "Cron run complete", ...results });
}
