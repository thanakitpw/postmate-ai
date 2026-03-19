import type { Request, Response, NextFunction } from "express";

/**
 * API key authentication middleware.
 * Checks for x-api-secret header or Authorization Bearer token.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiSecret = process.env.API_SECRET;

  if (!apiSecret || apiSecret === "your-api-secret-here") {
    console.error("[Auth] API_SECRET is not configured");
    res.status(500).json({ error: "Server not configured" });
    return;
  }

  // Check x-api-secret header first, then Authorization Bearer
  const headerSecret = req.headers["x-api-secret"] as string | undefined;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  const providedSecret = headerSecret || bearerToken;

  if (!providedSecret) {
    res.status(401).json({ error: "Missing authentication" });
    return;
  }

  if (providedSecret !== apiSecret) {
    res.status(401).json({ error: "Invalid authentication" });
    return;
  }

  next();
}
