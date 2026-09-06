import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function files(path: string): string[] {
  return readdirSync(path).flatMap((name) => {
    const child = join(path, name);
    return statSync(child).isDirectory() ? files(child) : [child];
  });
}

test("public website has no admin source dependency", () => {
  const sources = files(new URL("../", import.meta.url).pathname)
    .filter((path) => /\.[tj]sx?$/.test(path) && !path.endsWith(".test.ts") && !path.endsWith(".test.tsx"))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  assert.doesNotMatch(sources, /from\s+["'][^"']*(?:admin|\/api\/(?:auth|documents|dashboard|users|audit))/);
});