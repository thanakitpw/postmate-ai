// Shared types for the Playwright service

export interface PostPayload {
  postId: string;
  projectId: string;
  platform: "facebook" | "instagram" | "tiktok";
  content: string;
  title: string | null;
  hashtags: string[];
  mediaUrls: string[];
  articleUrl: string | null;
  contentType: string;
  cookies: string; // decrypted cookies JSON string
}

export interface ConnectPayload {
  platform: "facebook" | "instagram" | "tiktok";
  projectId: string;
}

export interface PostResult {
  success: boolean;
  platformPostId?: string;
  screenshotUrl?: string;
  error?: string;
}

export interface ConnectResult {
  success: boolean;
  encryptedCookies?: string;
  error?: string;
}

export interface PlatformCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export type PlatformExecutor = (payload: PostPayload) => Promise<PostResult>;

// Platform login URLs
export const PLATFORM_URLS: Record<string, { login: string; home: string; domain: string }> = {
  facebook: {
    login: "https://www.facebook.com/login",
    home: "https://www.facebook.com",
    domain: ".facebook.com",
  },
  instagram: {
    login: "https://www.instagram.com/accounts/login",
    home: "https://www.instagram.com",
    domain: ".instagram.com",
  },
  tiktok: {
    login: "https://www.tiktok.com/login",
    home: "https://www.tiktok.com",
    domain: ".tiktok.com",
  },
};
