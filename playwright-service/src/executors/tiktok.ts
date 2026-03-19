import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import { randomDelay, slowTypeKeyboard, humanClick, randomMouseMove } from "../lib/human-like.js";
import { takeScreenshotAndUpload } from "../lib/screenshot.js";
import type { PostPayload, PostResult, PlatformCookie } from "../types.js";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { tmpdir } from "os";
import { join } from "path";
import { unlink } from "fs/promises";
import { randomBytes } from "crypto";

const HEADLESS = process.env.HEADLESS === "true";

/**
 * Download a file from a URL to a temporary path.
 */
async function downloadToTemp(url: string): Promise<string> {
  const ext = url.split(".").pop()?.split("?")[0] ?? "mp4";
  const tempPath = join(tmpdir(), `postmate-tt-${randomBytes(8).toString("hex")}.${ext}`);

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const nodeStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
  await pipeline(nodeStream, createWriteStream(tempPath));

  return tempPath;
}

/**
 * Parse cookies JSON string.
 */
function parseCookies(cookiesJson: string): PlatformCookie[] {
  try {
    const parsed = JSON.parse(cookiesJson);
    return Array.isArray(parsed) ? (parsed as PlatformCookie[]) : [];
  } catch {
    console.error("[TikTok] Failed to parse cookies JSON");
    return [];
  }
}

/**
 * TikTok posting executor.
 *
 * IMPORTANT: TikTok frequently changes its DOM structure.
 * TikTok web upload is available at https://www.tiktok.com/upload
 * This executor uses TikTok's web upload page for posting videos.
 *
 * NOTE: TikTok primarily supports video content.
 * Image slideshows may require a different flow.
 *
 * TODO: TikTok selectors need frequent updating as the platform evolves.
 */
export async function executeTiktok(payload: PostPayload): Promise<PostResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  const tempFiles: string[] = [];

  try {
    browser = await chromium.launch({
      headless: HEADLESS,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      locale: "th-TH",
      timezoneId: "Asia/Bangkok",
    });

    // Set cookies
    const cookies = parseCookies(payload.cookies);
    if (cookies.length > 0) {
      await context.addCookies(
        cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain || ".tiktok.com",
          path: c.path || "/",
          expires: c.expires || -1,
          httpOnly: c.httpOnly ?? false,
          secure: c.secure ?? true,
          sameSite: c.sameSite || ("None" as const),
        }))
      );
    }

    page = await context.newPage();

    // Navigate to TikTok upload page
    await page.goto("https://www.tiktok.com/upload", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await randomDelay(3000, 5000);

    // Check if logged in — the upload page redirects to login if not authenticated
    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("login_redirect")) {
      const screenshotUrl = await takeScreenshotAndUpload(page, payload.postId, "not-logged-in");
      return {
        success: false,
        error: "Not logged in to TikTok. Session cookies may be expired.",
        screenshotUrl: screenshotUrl ?? undefined,
      };
    }

    // Also check for the upload area being visible
    // TODO: Update selector for TikTok upload area
    const uploadAreaVisible = await page
      .locator('[class*="upload"], input[type="file"], [data-testid*="upload"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!uploadAreaVisible) {
      const screenshotUrl = await takeScreenshotAndUpload(page, payload.postId, "no-upload-area");
      return {
        success: false,
        error: "TikTok upload area not found. May not be logged in or UI has changed.",
        screenshotUrl: screenshotUrl ?? undefined,
      };
    }

    await randomMouseMove(page);

    // TikTok requires video content
    if (!payload.mediaUrls || payload.mediaUrls.length === 0) {
      return {
        success: false,
        error: "TikTok requires at least one video file to create a post.",
      };
    }

    // Download media files
    const downloadedPaths: string[] = [];
    for (const url of payload.mediaUrls) {
      try {
        const tempPath = await downloadToTemp(url);
        downloadedPaths.push(tempPath);
        tempFiles.push(tempPath);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[TikTok] Failed to download media ${url}:`, msg);
      }
    }

    if (downloadedPaths.length === 0) {
      return {
        success: false,
        error: "Failed to download any media files for TikTok post.",
      };
    }

    // Upload video via file input
    // TODO: Update file input selector for TikTok
    const fileInput = page.locator('input[type="file"]').first();
    try {
      await fileInput.setInputFiles(downloadedPaths[0]); // TikTok typically takes one video
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const screenshotUrl = await takeScreenshotAndUpload(page, payload.postId, "upload-failed");
      return {
        success: false,
        error: `Failed to upload file to TikTok: ${msg}`,
        screenshotUrl: screenshotUrl ?? undefined,
      };
    }

    // Wait for upload to process
    await randomDelay(5000, 10000);

    // Wait for the video to finish processing
    // TODO: Update selector for upload progress/completion
    try {
      // Look for the caption/description area to appear (indicates upload is ready)
      await page
        .locator('[contenteditable="true"], textarea[placeholder*="caption"], textarea[placeholder*="description"], div[data-testid*="caption"]')
        .first()
        .waitFor({ timeout: 60000 }); // Videos can take a while to process
    } catch {
      console.warn("[TikTok] Timeout waiting for upload to complete, continuing anyway");
    }

    await randomDelay(2000, 3000);

    // Type the caption/description
    // TODO: Update selectors for TikTok caption area
    const captionSelectors = [
      'div[contenteditable="true"][data-text="true"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="caption"]',
      'textarea[placeholder*="description"]',
      '[data-testid*="caption"] div[contenteditable="true"]',
    ];

    let captionField: ReturnType<Page["locator"]> | null = null;
    for (const selector of captionSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        captionField = el;
        break;
      }
    }

    if (captionField) {
      await captionField.click();
      await randomDelay(500, 1000);

      // Clear existing text (TikTok may pre-fill with filename)
      await page.keyboard.press("Meta+A");
      await randomDelay(100, 200);
      await page.keyboard.press("Backspace");
      await randomDelay(300, 500);

      // Build caption with hashtags
      let fullCaption = payload.content;
      if (payload.hashtags && payload.hashtags.length > 0) {
        fullCaption += " " + payload.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
      }

      await slowTypeKeyboard(page, fullCaption);
      await randomDelay(1000, 2000);
    } else {
      console.warn("[TikTok] Could not find caption field");
    }

    // Click the "Post" button
    // TODO: Update selector for TikTok Post button
    const postButtonSelectors = [
      'button:has-text("Post")',
      'button:has-text("Publish")',
      'div[role="button"]:has-text("Post")',
      '[data-testid*="post"] button',
      'button[class*="post"]',
    ];

    let posted = false;
    for (const selector of postButtonSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 3000 })) {
          if (await btn.isEnabled({ timeout: 1000 })) {
            await humanClick(page, selector);
            posted = true;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    if (!posted) {
      const screenshotUrl = await takeScreenshotAndUpload(page, payload.postId, "no-post-button");
      return {
        success: false,
        error: "Could not find or click the Post button. TikTok UI may have changed.",
        screenshotUrl: screenshotUrl ?? undefined,
      };
    }

    // Wait for posting to complete
    await randomDelay(5000, 10000);

    // Check for success
    // TODO: Update selectors for TikTok success indicators
    const successIndicators = [
      'span:has-text("Your video is being uploaded")',
      'span:has-text("uploaded")',
      ':has-text("successfully")',
      '[class*="success"]',
    ];

    let postConfirmed = false;
    for (const selector of successIndicators) {
      if (await page.locator(selector).first().isVisible({ timeout: 8000 }).catch(() => false)) {
        postConfirmed = true;
        break;
      }
    }

    // Also check if we got redirected (sometimes TikTok redirects to profile after posting)
    const postUrl = page.url();
    if (postUrl.includes("/profile") || postUrl.includes("/@")) {
      postConfirmed = true;
    }

    if (!postConfirmed) {
      console.warn("[TikTok] Could not confirm post success, but no error detected");
    }

    return {
      success: true,
      platformPostId: undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[TikTok] Execution error:", message);

    let screenshotUrl: string | undefined;
    if (page) {
      const url = await takeScreenshotAndUpload(page, payload.postId, "error");
      screenshotUrl = url ?? undefined;
    }

    return {
      success: false,
      error: `TikTok posting failed: ${message}`,
      screenshotUrl,
    };
  } finally {
    for (const tempFile of tempFiles) {
      await unlink(tempFile).catch(() => {});
    }
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}
