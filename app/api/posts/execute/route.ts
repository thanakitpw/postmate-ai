import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/encryption";
import { sendPostResultEmail } from "@/lib/email";

interface ExecuteRequestBody {
  postId: string;
}

interface VpsResponse {
  success: boolean;
  platformPostId?: string;
  screenshotUrl?: string;
  error?: string;
}

/**
 * POST /api/posts/execute
 * Manually trigger VPS Playwright service for a single post.
 * Used for manual retry or immediate publish.
 */
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  let body: ExecuteRequestBody;
  try {
    body = (await request.json()) as ExecuteRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  // Fetch post with project and session info
  const { data: post, error: postError } = await supabase
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
      status,
      retry_count,
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
    .eq("id", body.postId)
    .single();

  if (postError || !post) {
    return NextResponse.json(
      { error: "Post not found", details: postError?.message },
      { status: 404 }
    );
  }

  // Only allow execution for certain statuses
  const allowedStatuses = ["draft", "scheduled", "failed"];
  if (!allowedStatuses.includes(post.status)) {
    return NextResponse.json(
      { error: `Cannot execute post with status "${post.status}"` },
      { status: 400 }
    );
  }

  const project = post.projects as unknown as {
    id: string;
    platform: "facebook" | "instagram" | "tiktok";
    project_name: string;
    client_id: string;
    clients: { id: string; owner_id: string; contact_email: string | null };
  };

  // Update status to 'publishing'
  const { error: updateError } = await supabase
    .from("posts")
    .update({ status: "publishing" })
    .eq("id", post.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update post status", details: updateError.message },
      { status: 500 }
    );
  }

  // Get session cookies
  let decryptedCookies = "{}";
  try {
    const { data: session } = await supabase
      .from("project_sessions")
      .select("cookies_encrypted")
      .eq("project_id", post.project_id)
      .eq("platform", project.platform)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (session?.cookies_encrypted) {
      decryptedCookies = decrypt(session.cookies_encrypted);
    }
  } catch (decryptError) {
    const msg = decryptError instanceof Error ? decryptError.message : String(decryptError);
    console.error(`[Execute] Session decrypt error for post ${post.id}:`, msg);
  }

  // Trigger VPS
  const vpsUrl = process.env.VPS_API_URL;
  const vpsSecret = process.env.VPS_API_SECRET;

  if (
    !vpsUrl ||
    !vpsSecret ||
    vpsUrl === "https://your-vps-domain.com" ||
    vpsSecret === "your-vps-api-secret-here"
  ) {
    // VPS not configured — simulate success for development
    console.log(`[Execute] VPS not configured, simulating success for post ${post.id}`);

    await supabase
      .from("posts")
      .update({ status: "published" })
      .eq("id", post.id);

    await supabase.from("post_results").insert({
      post_id: post.id,
      platform: project.platform,
      status: "success",
      error_message: null,
      platform_post_id: null,
    });

    return NextResponse.json({
      message: "Post published (VPS not configured — dev mode)",
      postId: post.id,
      status: "published",
    });
  }

  try {
    const vpsResponse = await fetch(`${vpsUrl}/api/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vpsSecret}`,
      },
      body: JSON.stringify({
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
      }),
    });

    if (!vpsResponse.ok) {
      const errorText = await vpsResponse.text();
      throw new Error(`VPS returned ${vpsResponse.status}: ${errorText}`);
    }

    const vpsResult = (await vpsResponse.json()) as VpsResponse;

    if (vpsResult.success) {
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

      // Send success email
      const ownerEmail = project.clients?.contact_email;
      if (ownerEmail) {
        await sendPostResultEmail(ownerEmail, post.title ?? "Untitled", "success").catch(() => {
          // Non-critical
        });
      }

      return NextResponse.json({
        message: "Post published successfully",
        postId: post.id,
        status: "published",
        platformPostId: vpsResult.platformPostId,
      });
    } else {
      // VPS reported failure
      const newRetryCount = post.retry_count + 1;
      const finalStatus = newRetryCount >= 3 ? "failed_final" : "failed";

      await supabase
        .from("posts")
        .update({
          status: finalStatus,
          retry_count: newRetryCount,
        })
        .eq("id", post.id);

      await supabase.from("post_results").insert({
        post_id: post.id,
        platform: project.platform,
        status: "failed",
        error_message: vpsResult.error ?? "Unknown VPS error",
        screenshot_url: vpsResult.screenshotUrl ?? null,
      });

      // Send failure email
      const ownerEmail = project.clients?.contact_email;
      if (ownerEmail) {
        await sendPostResultEmail(
          ownerEmail,
          post.title ?? "Untitled",
          "failed",
          vpsResult.error
        ).catch(() => {
          // Non-critical
        });
      }

      return NextResponse.json(
        {
          error: "Post execution failed",
          postId: post.id,
          status: finalStatus,
          retryCount: newRetryCount,
          details: vpsResult.error,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Execute] VPS trigger error for post ${post.id}:`, message);

    // Revert to failed
    await supabase
      .from("posts")
      .update({
        status: "failed",
        retry_count: post.retry_count + 1,
      })
      .eq("id", post.id);

    await supabase.from("post_results").insert({
      post_id: post.id,
      platform: project.platform,
      status: "failed",
      error_message: message,
    });

    return NextResponse.json(
      { error: "VPS trigger failed", details: message },
      { status: 502 }
    );
  }
}
