import { chromium, firefox, type Browser, type Page, type BrowserContext } from "playwright";
import { randomDelay, slowTypeKeyboard, humanClick, humanScroll, randomMouseMove } from "../lib/human-like.js";
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
 * Returns the temp file path.
 */
async function downloadToTemp(url: string): Promise<string> {
  const ext = url.split(".").pop()?.split("?")[0] ?? "jpg";
  const tempPath = join(tmpdir(), `postmate-${randomBytes(8).toString("hex")}.${ext}`);

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const nodeStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
  await pipeline(nodeStream, createWriteStream(tempPath));

  return tempPath;
}

/**
 * Parse cookies JSON string into Playwright-compatible cookie format.
 */
function parseCookies(cookiesJson: string): PlatformCookie[] {
  try {
    const parsed = JSON.parse(cookiesJson);
    if (Array.isArray(parsed)) {
      return parsed as PlatformCookie[];
    }
    return [];
  } catch {
    console.error("[Facebook] Failed to parse cookies JSON");
    return [];
  }
}

/**
 * Facebook Page posting executor.
 *
 * IMPORTANT: Facebook frequently changes its DOM structure and selectors.
 * If posting fails, the selectors below may need updating.
 * Check Facebook's current DOM structure and update accordingly.
 */
export async function executeFacebook(payload: PostPayload): Promise<PostResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  const tempFiles: string[] = [];

  // Browser mode: "firefox-profile" | "chrome-profile" | "cookies"
  const browserMode = process.env.BROWSER_MODE || "cookies";
  const firefoxProfilePath = process.env.FIREFOX_PROFILE_PATH ||
    `${process.env.HOME}/Library/Application Support/Firefox/Profiles`;
  const chromeProfilePath = process.env.CHROME_PROFILE_PATH ||
    `${process.env.HOME}/Library/Application Support/Google/Chrome`;

  try {
    if (browserMode === "firefox-profile") {
      // Find Firefox default profile directory
      const fs = await import("fs");
      let profileDir = firefoxProfilePath;

      // If path is the Profiles directory, find the default profile
      if (profileDir.endsWith("Profiles")) {
        const profiles = fs.readdirSync(profileDir).filter((d: string) => d.endsWith(".default-release") || d.endsWith(".default"));
        if (profiles.length > 0) {
          profileDir = `${profileDir}/${profiles[0]}`;
        }
      }

      console.log(`[Facebook] Using Firefox profile: ${profileDir}`);
      context = await firefox.launchPersistentContext(profileDir, {
        headless: false,
        viewport: { width: 1280, height: 900 },
      });
      page = context.pages()[0] || await context.newPage();

    } else if (browserMode === "chrome-profile") {
      console.log("[Facebook] Using Chrome profile (must close Chrome first)");
      context = await chromium.launchPersistentContext(
        `${chromeProfilePath}/Default`,
        {
          headless: false,
          channel: "chrome",
          viewport: { width: 1280, height: 900 },
          args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        }
      );
      page = context.pages()[0] || await context.newPage();

    } else {
      // Default: fresh browser with cookies
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

      // Set cookies from decrypted session
      const cookies = parseCookies(payload.cookies);
      if (cookies.length > 0) {
        await context.addCookies(
          cookies.map((c) => ({
            name: c.name,
            value: c.value,
            domain: c.domain || ".facebook.com",
          path: c.path || "/",
          expires: c.expires || -1,
          httpOnly: c.httpOnly ?? false,
          secure: c.secure ?? true,
          sameSite: c.sameSite || ("None" as const),
        }))
      );
      }

      page = await context.newPage();
    }

    // Navigate to Facebook
    await page.goto("https://www.facebook.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await randomDelay(2000, 4000);

    // Check if logged in by looking for the profile/menu area
    // TODO: Update selector if Facebook changes their logged-in indicators
    const isLoggedIn = await page
      .locator('[aria-label="Your profile"], [aria-label="Account"], [data-pagelet="ProfileTail"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!isLoggedIn) {
      // Try checking for the feed as an alternative indicator
      const hasFeed = await page
        .locator('[role="feed"], [data-pagelet="FeedUnit_0"]')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!hasFeed) {
        const screenshotUrl = await takeScreenshotAndUpload(page, payload.postId, "not-logged-in");
        return {
          success: false,
          error: "Not logged in to Facebook. Session cookies may be expired.",
          screenshotUrl: screenshotUrl ?? undefined,
        };
      }
    }

    await randomMouseMove(page);

    // Handle article_share content type
    if (payload.contentType === "article_share" && payload.articleUrl) {
      return await handleArticleShare(page, payload, tempFiles);
    }

    // --- Create a new post ---

    // TODO: These selectors target the Facebook feed "What's on your mind?" area.
    // Facebook frequently changes class names and aria labels.
    // Update these selectors as needed.

    // Click "What's on your mind?" to open the post composer
    const createPostSelectors = [
      '[aria-label="Create a post"]',
      '[aria-label="What\'s on your mind?"]',
      'div[role="button"][tabindex="0"]:has-text("What\'s on your mind")',
      'span:has-text("What\'s on your mind")',
    ];

    let composerOpened = false;
    for (const selector of createPostSelectors) {
      try {
        const el = page.locator(selector).first();
        if (await el.isVisible({ timeout: 2000 })) {
          await el.click();
          composerOpened = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!composerOpened) {
      const screenshotUrl = await takeScreenshotAndUpload(page, payload.postId, "no-composer");
      return {
        success: false,
        error: "Could not find the post composer. Facebook UI may have changed.",
        screenshotUrl: screenshotUrl ?? undefined,
      };
    }

    await randomDelay(1500, 3000);

    // Wait for the composer dialog/modal to appear
    // TODO: Update selector for the post composer text area
    const composerTextSelectors = [
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="on your mind"]',
      'div[contenteditable="true"][data-lexical-editor="true"]',
    ];

    let textArea: ReturnType<Page["locator"]> | null = null;
    for (const selector of composerTextSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        textArea = el;
        break;
      }
    }

    if (!textArea) {
      const screenshotUrl = await takeScreenshotAndUpload(page, payload.postId, "no-textarea");
      return {
        success: false,
        error: "Could not find the post text area. Facebook UI may have changed.",
        screenshotUrl: screenshotUrl ?? undefined,
      };
    }

    // Click into the text area and type the caption
    await textArea.click();
    await randomDelay(500, 1000);

    // Build the full post text: content + hashtags
    let fullText = payload.content;
    if (payload.hashtags && payload.hashtags.length > 0) {
      fullText += "\n\n" + payload.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    }

    // Type the content with human-like delays
    await slowTypeKeyboard(page, fullText);
    await randomDelay(1000, 2000);

    // Handle media upload if media URLs provided
    if (payload.mediaUrls && payload.mediaUrls.length > 0) {
      await handleMediaUpload(page, payload.mediaUrls, tempFiles);
      await randomDelay(2000, 4000);
    }

    // Click the "Post" button
    // TODO: Update selector for the Post/Publish button
    const postButtonSelectors = [
      'div[aria-label="Post"][role="button"]',
      'div[aria-label="Publish"][role="button"]',
      'span:has-text("Post"):not([aria-hidden])',
      'button:has-text("Post")',
    ];

    let posted = false;
    for (const selector of postButtonSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 })) {
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
        error: "Could not find or click the Post button. Facebook UI may have changed.",
        screenshotUrl: screenshotUrl ?? undefined,
      };
    }

    // Wait for the post to be published (composer should close)
    await randomDelay(3000, 5000);

    // Verify the composer closed (indicating success)
    // TODO: Better verification — check for success toast or post appearing in feed
    const composerStillOpen = await page
      .locator('div[contenteditable="true"][role="textbox"]')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (composerStillOpen) {
      const screenshotUrl = await takeScreenshotAndUpload(page, payload.postId, "post-may-have-failed");
      return {
        success: false,
        error: "Post composer still open after clicking Post. The post may not have been published.",
        screenshotUrl: screenshotUrl ?? undefined,
      };
    }

    // Take a success screenshot
    await humanScroll(page);
    await randomDelay(1000, 2000);

    return {
      success: true,
      // TODO: Extract the actual platform post ID from the URL or DOM
      // Facebook doesn't easily expose this after posting
      platformPostId: undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Facebook] Execution error:", message);

    let screenshotUrl: string | undefined;
    if (page) {
      const url = await takeScreenshotAndUpload(page, payload.postId, "error");
      screenshotUrl = url ?? undefined;
    }

    return {
      success: false,
      error: `Facebook posting failed: ${message}`,
      screenshotUrl,
    };
  } finally {
    // Clean up temp files
    for (const tempFile of tempFiles) {
      await unlink(tempFile).catch(() => {
        // Ignore cleanup errors
      });
    }

    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Handle media upload in the Facebook post composer.
 * Downloads media from URLs and attaches them via file input.
 */
async function handleMediaUpload(page: Page, mediaUrls: string[], tempFiles: string[]): Promise<void> {
  // Click the "Photo/Video" button to open the media upload area
  // TODO: Update selectors for the photo/video button
  const photoButtonSelectors = [
    'div[aria-label="Photo/video"][role="button"]',
    'div[aria-label="Photo/Video"][role="button"]',
    'span:has-text("Photo/video")',
  ];

  for (const selector of photoButtonSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        await randomDelay(1000, 2000);
        break;
      }
    } catch {
      continue;
    }
  }

  // Download each media file and upload via file input
  const downloadedPaths: string[] = [];
  for (const url of mediaUrls) {
    try {
      const tempPath = await downloadToTemp(url);
      downloadedPaths.push(tempPath);
      tempFiles.push(tempPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Facebook] Failed to download media ${url}:`, msg);
    }
  }

  if (downloadedPaths.length === 0) return;

  // Find the file input and set files
  // TODO: Facebook's file input selector may change
  const fileInput = page.locator('input[type="file"][accept*="image"],input[type="file"][accept*="video"]').first();
  try {
    await fileInput.setInputFiles(downloadedPaths);
    await randomDelay(2000, 4000);

    // Wait for upload to complete (look for thumbnails)
    await page
      .locator('div[role="img"], img[alt*="preview"]')
      .first()
      .waitFor({ timeout: 15000 })
      .catch(() => {
        console.warn("[Facebook] Could not confirm media upload completed");
      });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Facebook] File input upload failed:", msg);
  }
}

/**
 * Handle article/link share on Facebook.
 */
async function handleArticleShare(
  page: Page,
  payload: PostPayload,
  tempFiles: string[]
): Promise<PostResult> {
  // For article shares, we paste the URL into the composer
  // Facebook will auto-generate the link preview

  // Open the post composer
  const createPostSelectors = [
    '[aria-label="Create a post"]',
    '[aria-label="What\'s on your mind?"]',
    'span:has-text("What\'s on your mind")',
  ];

  for (const selector of createPostSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click();
        break;
      }
    } catch {
      continue;
    }
  }

  await randomDelay(1500, 3000);

  // Type the article URL first so Facebook generates the preview
  const textArea = page.locator('div[contenteditable="true"][role="textbox"]').first();
  await textArea.click();
  await randomDelay(500, 1000);

  // Paste the URL
  await slowTypeKeyboard(page, payload.articleUrl ?? "");
  await randomDelay(3000, 5000); // Wait for link preview to generate

  // Clear the URL and type the actual caption
  await page.keyboard.press("Control+A");
  await randomDelay(200, 400);

  // Build the full post text
  let fullText = payload.content;
  if (payload.hashtags && payload.hashtags.length > 0) {
    fullText += "\n\n" + payload.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  }
  fullText += "\n\n" + (payload.articleUrl ?? "");

  await slowTypeKeyboard(page, fullText);
  await randomDelay(1000, 2000);

  // Click Post
  const postButtonSelectors = [
    'div[aria-label="Post"][role="button"]',
    'div[aria-label="Publish"][role="button"]',
  ];

  for (const selector of postButtonSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await humanClick(page, selector);
        break;
      }
    } catch {
      continue;
    }
  }

  await randomDelay(3000, 5000);

  // Clean up temp files (none expected for article share, but just in case)
  void tempFiles;

  return {
    success: true,
    platformPostId: undefined,
  };
}
