import type { Page } from "playwright";
import { getSupabase } from "./supabase.js";
import { randomBytes } from "crypto";

/**
 * Take a full-page screenshot and upload it to Supabase Storage.
 * Returns the public URL of the screenshot, or null if upload fails.
 */
export async function takeScreenshotAndUpload(
  page: Page,
  postId: string,
  context: string = "error"
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const randomId = randomBytes(4).toString("hex");
    const filename = `${postId}/${context}-${timestamp}-${randomId}.png`;

    // Take full page screenshot
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: "png",
    });

    const supabase = getSupabase();

    // Upload to Supabase Storage screenshots bucket
    const { error: uploadError } = await supabase.storage
      .from("screenshots")
      .upload(filename, screenshotBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Screenshot] Upload error:", uploadError.message);
      return null;
    }

    // Get the URL (screenshots bucket is private, use signed URL)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("screenshots")
      .createSignedUrl(filename, 60 * 60 * 24 * 7); // 7 days

    if (signedUrlError) {
      console.error("[Screenshot] Signed URL error:", signedUrlError.message);
      // Return the path as fallback
      return `screenshots/${filename}`;
    }

    return signedUrlData.signedUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Screenshot] Failed to capture/upload:", message);
    return null;
  }
}
