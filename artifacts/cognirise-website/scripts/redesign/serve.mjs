// Static preview of dist/public with the live site's media as a fallback, for rendering checks.
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "dist/public");
const port = Number(process.env.PORT ?? 4173);
const live = "https://cognirise.ai";
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".webm": "video/webm", ".woff": "font/woff", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain", ".ico": "image/x-icon", ".pdf": "application/pdf" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  const file = path.join(root, pathname);
  if (pathname !== "/" && existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
    return;
  }
  if (/^\/(images|videos|media|downloads)\//.test(pathname)) {
    try {
      const upstream = await fetch(live + pathname);
      res.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") ?? "application/octet-stream" });
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      res.writeHead(502); res.end();
    }
    return;
  }
  if (pathname.startsWith("/api/")) { res.writeHead(404, { "content-type": "application/json" }); res.end("{}"); return; }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  createReadStream(path.join(root, "index.html")).pipe(res);
}).listen(port, () => console.log(`preview on http://localhost:${port}`));
