import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get a Supabase client using service role key.
 * Used for inserting post_results and uploading screenshots.
 */
export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  supabaseInstance = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseInstance;
}

/**
 * Insert a post result record into the post_results table.
 */
export async function insertPostResult(params: {
  postId: string;
  platform: string;
  status: "success" | "failed";
  errorMessage?: string | null;
  platformPostId?: string | null;
  screenshotUrl?: string | null;
}): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.from("post_results").insert({
    post_id: params.postId,
    platform: params.platform,
    status: params.status,
    error_message: params.errorMessage ?? null,
    platform_post_id: params.platformPostId ?? null,
    screenshot_url: params.screenshotUrl ?? null,
  });

  if (error) {
    console.error("[Supabase] Failed to insert post_result:", error.message);
  }
}

/**
 * Update post status in the posts table.
 */
export async function updatePostStatus(
  postId: string,
  status: string,
  retryCount?: number
): Promise<void> {
  const supabase = getSupabase();

  const updateData: Record<string, unknown> = { status };
  if (retryCount !== undefined) {
    updateData.retry_count = retryCount;
  }

  const { error } = await supabase
    .from("posts")
    .update(updateData)
    .eq("id", postId);

  if (error) {
    console.error("[Supabase] Failed to update post status:", error.message);
  }
}
