import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const websiteRoot = path.join(repositoryRoot, "artifacts/cognirise-website");
export const defaultOutputDirectory = path.join(repositoryRoot, "scripts/cms/output");

export type ReviewStatus = "needs-review";
export interface InventoryRecord {
  externalId: string;
  type: "person" | "partner" | "platform" | "article" | "asset";
  name: string;
  sourceFile: string;
  route?: string;
  fields: Record<string, unknown>;
  review: { status: ReviewStatus; reasons: string[] };
}

export function relative(file: string) {
  return path.relative(repositoryRoot, file).replaceAll(path.sep, "/");
}

export function stableId(type: InventoryRecord["type"], sourceFile: string, name: string) {
  return `${type}:${createHash("sha256").update(`${relative(sourceFile)}\0${name}`).digest("hex").slice(0, 20)}`;
}

export async function source(file: string) {
  return readFile(path.join(websiteRoot, file), "utf8");
}

export function requireMatches(input: string, expression: RegExp, sourceFile: string, label: string) {
  const matches = [...input.matchAll(expression)];
  if (!matches.length) throw new Error(`Could not locate ${label} in ${sourceFile}; source layout may have changed.`);
  return matches;
}

export function textField(block: string, field: string) {
  const match = block.match(new RegExp(`${field}:\\s*["']([^"']+)["']`));
  return match?.[1];
}

export function review(reasons: string[]): { status: ReviewStatus; reasons: string[] } {
  return { status: "needs-review", reasons };
}

export async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  }));
  return nested.flat();
}

export async function assetRecords(): Promise<InventoryRecord[]> {
  const directory = path.join(websiteRoot, "public/images");
  const files = await walk(directory);
  return Promise.all(files.map(async (file) => {
    const info = await stat(file);
    const name = relative(file);
    return {
      externalId: stableId("asset", file, name),
      type: "asset" as const,
      name: path.basename(file),
      sourceFile: name,
      fields: { publicPath: `/${path.relative(path.join(websiteRoot, "public"), file).replaceAll(path.sep, "/")}`, bytes: info.size, extension: path.extname(file).toLowerCase() },
      review: review(["Confirm rights holder, source, license, and descriptive alt text before media import."]),
    };
  }));
}

export function outputPath(argument: string | undefined, filename: string) {
  const candidate = argument ? path.resolve(repositoryRoot, argument) : path.join(defaultOutputDirectory, filename);
  const allowed = path.resolve(defaultOutputDirectory) + path.sep;
  if (!candidate.startsWith(allowed)) throw new Error(`Refusing output outside scripts/cms/output: ${candidate}`);
  return candidate;
}

export async function emitJson(value: unknown, file: string, shouldWrite: boolean) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (shouldWrite) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf8");
    console.log(`Wrote ${relative(file)}`);
  } else {
    console.log(content);
    console.error("Dry run: no file was written. Pass --write to save under scripts/cms/output.");
  }
}