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
  const ext = url.split(".").pop()?.split("?")[0] ?? "jpg";
  const tempPath = join(tmpdir(), `postmate-ig-${randomBytes(8).toString("hex")}.${ext}`);

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
    console.error("[Instagram] Failed to parse cookies JSON");
    return [];
  }
}

/**
 * Instagram posting executor.
 *
 * IMPORTANT: Instagram frequently changes its DOM structure and selectors.
 * Instagram web has limited posting capabilities compared to the mobile app.
 * Image posting is supported; video/reel posting may require different flows.
 *
 * TODO: Instagram selectors need frequent updating as the platform evolves.
 */
export async function executeInstagram(payload: PostPayload): Promise<PostResult> {
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
          domain: c.domain || ".instagram.com",
          path: c.path || "/",
          expires: c.expires || -1,
          httpOnly: c.httpOnly ?? false,
          secure: c.secure ?? true,
          sameSite: c.sameSite || ("None" as const),
        }))
      );
    }

    page = await context.newPage();

    // Navigate to Instagram
    await page.goto("https://www.instagram.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await randomDelay(2000, 4000);

    // Check if logged in
    // TODO: Update selector for Instagram logged-in indicator
    const isLoggedIn = await page
      .locator('svg[aria-label="Home"], a[href="/direct/inbox/"], svg[aria-label="New post"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!isLoggedIn) {
      const screenshotUrl = await takeScreenshotAndUpload(page, payload.postId, "not-logged-in");
      return {
        success: false,
        error: "Not logged in to Instagram. Session cookies may be expired.",
        screenshotUrl: screenshotUrl ?? undefined,
      };
    }

    await randomMouseMove(page);
    await randomDelay(1000, 2000);

    // Instagram requires at least one image/video to create a post
    if (!payload.mediaUrls || payload.mediaUrls.length === 0) {
      return {
        success: false,
        error: "Instagram requires at least one image or video to create a post.",
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
        console.error(`[Instagram] Failed to download media ${url}:`, msg);
      }
    }

    if (downloadedPaths.length === 0) {
      return {
        success: false,
        error: "Failed to download any media files for Instagram post.",
      };
    }

    // Click "Create" / "New Post" button
    // TODO: Update selectors — Instagram changes these frequently
    const createButtonSelectors = [
      'svg[aria-label="New post"]',
      'a[href="/create/style/"]',
      '[aria-label="New post"]',
      'svg[aria-label="New Post"]',
      'span:has-text("Create")',
    ];

    let createClicked = false;
    for (const selector of createButtonSelectors) {
      try {
        const el = page.locator(selector).first();
        if (await el.isVisible({ timeout: 2000 })) {
          await el.click();
          createClicked = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!createClicked) {
      const screenshotUrl = await takeScreenshotAndUpload(page, payload.postId, "no-create-button");
      return {
        success: false,
        error: "Could not find the Create/New Post button. Instagram UI may have changed.",
        screenshotUrl: screenshotUrl ?? undefined,
      };
    }

    await randomDelay(2000, 3000);

    // The "Create new post" dialog should appear
    // Look for the file input to upload media
    // TODO: Update file input selector
    const fileInput = page
      .locator('input[type="file"][accept*="image"],input[type="file"]')
      .first();

    try {
      await fileInput.setInputFiles(downloadedPaths);
    } catch {
      // Try clicking "Select from computer" button first
      const selectButtonSelectors = [
        'button:has-text("Select from computer")',
        'button:has-text("Select From Computer")',
        'button:has-text("Select from")',
      ];

      for (const selector of selectButtonSelectors) {
        try {
          const btn = page.locator(selector).first();
          if (await btn.isVisible({ timeout: 2000 })) {
            // Instead of clicking (which opens a native dialog), set files on input
            const input = page.locator('input[type="file"]').first();
            await input.setInputFiles(downloadedPaths);
            break;
          }
        } catch {
          continue;
        }
      }
    }

    await randomDelay(2000, 4000);

    // Click "Next" to go to filters/editing step
    // TODO: Update selector for Next button
    const nextButtonSelectors = [
      'div[role="button"]:has-text("Next")',
      'button:has-text("Next")',
      '[aria-label="Next"]',
    ];

    for (let step = 0; step < 2; step++) {
      // Click Next twice: once for crop, once for filters
      await randomDelay(1000, 2000);
      for (const selector of nextButtonSelectors) {
        try {
          const btn = page.locator(selector).first();
          if (await btn.isVisible({ timeout: 3000 })) {
            await btn.click();
            break;
          }
        } catch {
          continue;
        }
      }
    }

    await randomDelay(1500, 2500);

    // Now we should be on the caption step
    // Type the caption
    // TODO: Update selector for caption textarea
    const captionSelectors = [
      'textarea[aria-label="Write a caption..."]',
      'textarea[aria-label*="caption"]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea[placeholder*="caption"]',
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

      // Build caption with hashtags
      let fullCaption = payload.content;
      if (payload.hashtags && payload.hashtags.length > 0) {
        fullCaption += "\n\n" + payload.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
      }

      await slowTypeKeyboard(page, fullCaption);
      await randomDelay(1000, 2000);
    } else {
      console.warn("[Instagram] Could not find caption field, posting without caption");
    }

    // Click "Share" button to publish
    // TODO: Update selector for Share button
    const shareButtonSelectors = [
      'div[role="button"]:has-text("Share")',
      'button:has-text("Share")',
      '[aria-label="Share"]',
    ];

    let shared = false;
    for (const selector of shareButtonSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 3000 })) {
          await humanClick(page, selector);
          shared = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!shared) {
      const screenshotUrl = await takeScreenshotAndUpload(page, payload.postId, "no-share-button");
      return {
        success: false,
        error: "Could not find the Share button. Instagram UI may have changed.",
        screenshotUrl: screenshotUrl ?? undefined,
      };
    }

    // Wait for posting to complete
    await randomDelay(5000, 8000);

    // Check for success indication (dialog closes or success message appears)
    // TODO: Better success verification
    const successIndicators = [
      'span:has-text("Your post has been shared")',
      'span:has-text("Post shared")',
      'img[alt="Animated checkmark"]',
    ];

    let postConfirmed = false;
    for (const selector of successIndicators) {
      if (await page.locator(selector).first().isVisible({ timeout: 5000 }).catch(() => false)) {
        postConfirmed = true;
        break;
      }
    }

    if (!postConfirmed) {
      // Not necessarily a failure — the dialog may have just closed
      console.warn("[Instagram] Could not confirm post success, but no error detected");
    }

    return {
      success: true,
      platformPostId: undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Instagram] Execution error:", message);

    let screenshotUrl: string | undefined;
    if (page) {
      const url = await takeScreenshotAndUpload(page, payload.postId, "error");
      screenshotUrl = url ?? undefined;
    }

    return {
      success: false,
      error: `Instagram posting failed: ${message}`,
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
