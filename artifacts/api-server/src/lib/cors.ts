import type { CorsOptions } from "cors";

export function cmsCorsOptions(allowed = process.env.CMS_ALLOWED_ORIGINS ?? ""): CorsOptions {
  const origins = new Set(allowed.split(",").map((origin) => origin.trim()).filter(Boolean));
  return {
    credentials: false,
    origin(origin, callback) {
      callback(null, !!origin && origins.has(origin));
    },
  };
}