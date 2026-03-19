import "dotenv/config";
import express from "express";
import cors from "cors";
import { chromium, type BrowserContext } from "playwright";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { authMiddleware } from "./middleware/auth.js";
import { executeFacebook } from "./executors/facebook.js";
import { executeInstagram } from "./executors/instagram.js";
import { executeTiktok } from "./executors/tiktok.js";
import { insertPostResult } from "./lib/supabase.js";
import { PLATFORM_URLS } from "./types.js";
import type { PostPayload, ConnectPayload, PostResult, ConnectResult, PlatformCookie } from "./types.js";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));

// --- Health check (no auth required) ---
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "postmate-ai-playwright",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- All other routes require auth ---
app.use("/api/post", authMiddleware);
app.use("/api/connect", authMiddleware);

// --- POST /api/post ---
// Receive post data + cookies, execute posting on the appropriate platform
app.post("/api/post", async (req, res) => {
  const payload = req.body as PostPayload;

  // Validate required fields
  if (!payload.postId || !payload.platform || !payload.content) {
    res.status(400).json({
      success: false,
      error: "Missing required fields: postId, platform, content",
    });
    return;
  }

  const supportedPlatforms = ["facebook", "instagram", "tiktok"];
  if (!supportedPlatforms.includes(payload.platform)) {
    res.status(400).json({
      success: false,
      error: `Unsupported platform: ${payload.platform}. Supported: ${supportedPlatforms.join(", ")}`,
    });
    return;
  }

  console.log(`[Server] Executing post ${payload.postId} on ${payload.platform}`);

  let result: PostResult;

  try {
    switch (payload.platform) {
      case "facebook":
        result = await executeFacebook(payload);
        break;
      case "instagram":
        result = await executeInstagram(payload);
        break;
      case "tiktok":
        result = await executeTiktok(payload);
        break;
      default:
        result = { success: false, error: `Unknown platform: ${payload.platform}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Server] Executor error for post ${payload.postId}:`, message);
    result = { success: false, error: message };
  }

  // Save result to Supabase
  try {
    await insertPostResult({
      postId: payload.postId,
      platform: payload.platform,
      status: result.success ? "success" : "failed",
      errorMessage: result.error,
      platformPostId: result.platformPostId,
      screenshotUrl: result.screenshotUrl,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Server] Failed to save post result:`, msg);
  }

  console.log(
    `[Server] Post ${payload.postId}: ${result.success ? "SUCCESS" : "FAILED"}${result.error ? ` — ${result.error}` : ""}`
  );

  const statusCode = result.success ? 200 : 500;
  res.status(statusCode).json(result);
});

// --- POST /api/connect ---
// Open a browser for manual login, capture cookies, return encrypted
app.post("/api/connect", async (req, res) => {
  const payload = req.body as ConnectPayload;

  if (!payload.platform || !payload.projectId) {
    res.status(400).json({
      success: false,
      error: "Missing required fields: platform, projectId",
    } satisfies ConnectResult);
    return;
  }

  const platformConfig = PLATFORM_URLS[payload.platform];
  if (!platformConfig) {
    res.status(400).json({
      success: false,
      error: `Unsupported platform: ${payload.platform}`,
    } satisfies ConnectResult);
    return;
  }

  console.log(`[Server] Starting connect flow for ${payload.platform} (project: ${payload.projectId})`);

  let context: BrowserContext | null = null;

  try {
    // Always open visible browser for manual login
    const browser = await chromium.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      locale: "th-TH",
      timezoneId: "Asia/Bangkok",
    });

    const page = await context.newPage();

    // Navigate to the platform's login page
    await page.goto(platformConfig.login, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    console.log(`[Server] Browser opened at ${platformConfig.login}`);
    console.log(`[Server] Waiting for user to log in manually...`);

    // Wait for the user to log in
    // We detect login by checking for platform-specific logged-in indicators
    const loginDetectors: Record<string, () => Promise<void>> = {
      facebook: async () => {
        // Wait for redirect to facebook.com home or any page with feed
        await page.waitForURL(
          (url) =>
            url.hostname.includes("facebook.com") &&
            !url.pathname.includes("/login") &&
            !url.pathname.includes("/checkpoint"),
          { timeout: 300000 } // 5 minutes
        );
      },
      instagram: async () => {
        // Wait for redirect away from login page
        await page.waitForURL(
          (url) =>
            url.hostname.includes("instagram.com") &&
            !url.pathname.includes("/accounts/login"),
          { timeout: 300000 }
        );
      },
      tiktok: async () => {
        // Wait for redirect away from login page
        await page.waitForURL(
          (url) =>
            url.hostname.includes("tiktok.com") && !url.pathname.includes("/login"),
          { timeout: 300000 }
        );
      },
    };

    const detector = loginDetectors[payload.platform];
    if (detector) {
      await detector();
    }

    // Additional wait to ensure cookies are fully set
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Capture all cookies for this domain
    const allCookies = await context.cookies();
    const platformCookies: PlatformCookie[] = allCookies
      .filter((c) => c.domain.includes(platformConfig.domain.replace(".", "")))
      .map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite as PlatformCookie["sameSite"],
      }));

    console.log(`[Server] Captured ${platformCookies.length} cookies for ${payload.platform}`);

    // Encrypt the cookies
    const cookiesJson = JSON.stringify(platformCookies);
    const encryptedCookies = encryptCookies(cookiesJson);

    // Close browser
    await context.close();
    await browser.close();
    context = null;

    const connectResult: ConnectResult = {
      success: true,
      encryptedCookies,
    };

    res.json(connectResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Server] Connect flow error:`, message);

    if (context) {
      try {
        const browser = context.browser();
        await context.close();
        if (browser) await browser.close();
      } catch {
        // Ignore cleanup errors
      }
    }

    const connectResult: ConnectResult = {
      success: false,
      error: `Connect failed: ${message}`,
    };

    res.status(500).json(connectResult);
  }
});

// --- Encryption helpers (matching lib/encryption.ts) ---

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.SESSION_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("SESSION_ENCRYPTION_KEY is not set");
  }
  if (key.length !== 64) {
    throw new Error("SESSION_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(key, "hex");
}

function encryptCookies(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Same format as lib/encryption.ts: iv + tag + ciphertext
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

// Decrypt function for verifying/debugging (same as lib/encryption.ts)
function _decryptCookies(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, "base64");

  if (combined.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid encrypted data: too short");
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

// Export for use in executors if needed
export { _decryptCookies as decryptCookies };

// --- Start server ---
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║  PostMate AI — Playwright Service        ║
  ║  Running on http://localhost:${PORT}        ║
  ║  Health: http://localhost:${PORT}/api/health ║
  ╚══════════════════════════════════════════╝
  `);
});
