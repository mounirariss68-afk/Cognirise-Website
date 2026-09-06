import type { NextFunction, Request, Response } from "express";
import { isExactSameOrigin, requestOrigin, SlidingWindowThrottle } from "./security";

export const AUTH_ERROR = { error: "Authentication failed." };

export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  res.setHeader("Cache-Control", "no-store");
  next();
}

export function sameOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.header("x-forwarded-host")?.split(",")[0]?.trim();
  const expected = requestOrigin({
    protocol: forwardedProto || req.protocol,
    host: forwardedHost || req.header("host"),
  });
  if (
    req.header("sec-fetch-site") === "cross-site" ||
    !isExactSameOrigin(req.header("origin"), expected)
  ) {
    res.status(403).json({ error: "Request origin is not allowed." });
    return;
  }
  next();
}

export function throttle(
  limiter: SlidingWindowThrottle,
  key: (req: Request) => string,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = limiter.consume(key(req));
    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfter));
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }
    next();
  };
}

export function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };
}
