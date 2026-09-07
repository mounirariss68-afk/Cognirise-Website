import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const websiteRoot = path.join(repositoryRoot, "artifacts/cognirise-website");
export const linkedinRoot = path.join(repositoryRoot, "artifacts/mockup-sandbox/public/images/cognirise/linkedin");
export const defaultOutputDirectory = path.join(repositoryRoot, "scripts/cms/output");

export type ReviewStatus = "needs-review";
export interface InventoryRecord {
  externalId: string;
  type: "person" | "partner" | "platform" | "article" | "industry" | "asset";
  name: string;
  sourceFile: string;
  route?: string;
  fields: Record<string, unknown>;
  review: { status: ReviewStatus; reasons: string[] };
  digest?: string;
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
  // Editorial raster artwork belongs in the CMS. Editable masters, archives,
  // brand marks, and the CogniOS UI annotation remain source/code-owned.
  const files = (await walk(directory)).filter((file) =>
    /\.(png|jpe?g)$/i.test(file) && path.basename(file) !== "blueprint-annotated.png"
  );
  const sourceFiles = (await walk(path.join(websiteRoot, "src"))).filter((file) => /\.(ts|tsx)$/.test(file));
  const usages = new Map<string, string[]>();
  const legacyAltText: Record<string, string> = {};
  for (const sourceFile of sourceFiles) {
    const contents = await readFile(sourceFile, "utf8");
    for (const match of contents.matchAll(/\/images\/[A-Za-z0-9_./-]+/g)) {
      const filesForPath = usages.get(match[0]) ?? [];
      filesForPath.push(relative(sourceFile));
      usages.set(match[0], [...new Set(filesForPath)].sort());
    }
  }
  return Promise.all(files.map(async (file) => {
    const info = await stat(file);
    const name = relative(file);
    const bytes = await readFile(file);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const publicPath = `/${path.relative(path.join(websiteRoot, "public"), file).replaceAll(path.sep, "/")}`;
    const extension = path.extname(file).toLowerCase();
    const dimensions = imageDimensions(bytes, extension);
    return {
      externalId: stableId("asset", file, name),
      type: "asset" as const,
      name: path.basename(file),
      sourceFile: name,
      fields: {
        publicPath,
        bytes: info.size,
        extension,
        mimeType: mimeType(extension),
        checksum,
        width: dimensions.width,
        height: dimensions.height,
        usages: usages.get(publicPath) ?? [],
        cmsOwnership: "cms-candidate",
        collection: "website",
        linkedinAssetKind: null,
        campaignMetadata: null,
        accessibility: {
          altText: legacyAltText[path.basename(file)]
            ?? path.basename(file, extension).replaceAll("-", " "),
          decorative: false,
        },
        rights: { status: "needs-review", owner: "Rights holder pending editorial review", source: publicPath },
      },
      review: review(["Confirm rights holder, source, license, and descriptive alt text before media import."]),
      digest: checksum,
    };
  }));
}

const linkedinAssets = [
  ["governance", "post", "Governance", "A point of view on controls as an enabling architecture.", "Governed AI / Control in motion", "Dark architectural gates with a magenta and coral current and Governance is the architecture of motion text."],
  ["judgment", "post", "Judgment", "A human and AI perspective for consequential decisions.", "Human + AI / Shared judgment", "Coral and violet currents meet around an architectural platform with Judgment stays visible text."],
  ["orchestration", "post", "Orchestration", "A systems view of operating rhythm.", "Orchestration / Many forces, one rhythm", "Violet and coral current flowing across monumental navy frames with operating rhythm text."],
  ["transformation", "post", "Transformation", "A considered prompt about how change gets structure.", "Transformation / New operating form", "A coral violet force breaks through monumental navy architecture with change needs an operating form text."],
  ["knowledge", "post", "Knowledge", "A knowledge intelligence perspective.", "Knowledge intelligence / Living index", "Layered translucent library architecture with Insight needs a living index text."],
  ["action", "post", "Action", "An agentic workflow perspective.", "Agentic workflows / Directed action", "Violet and coral action streams move through a monumental operating environment with Turn intelligence toward action text."],
  ["header-governance", "header", "Governance in motion", "A deep architectural profile treatment.", "Governed AI / Control in motion", "Wide architectural header featuring governance in motion."],
  ["header-judgment", "header", "Human judgment", "A luminous profile treatment for people-led work.", "Human + AI / Shared judgment", "Wide header where coral and violet currents meet, with Human judgment visible."],
  ["header-rhythm", "header", "Operating rhythm", "A panoramic systems-oriented profile treatment.", "Orchestration / Many forces, one rhythm", "Wide header with flowing current among monumental architectural frames."],
] as const;

export async function linkedinAssetRecords(): Promise<InventoryRecord[]> {
  return Promise.all(linkedinAssets.map(async ([slug, kind, title, purpose, pulseSource, altText]) => {
    const filename = `cognirise-linkedin-${slug}.png`;
    const file = path.join(linkedinRoot, filename);
    const bytes = await readFile(file);
    const info = await stat(file);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const dimensions = imageDimensions(bytes, ".png");
    return {
      externalId: stableId("asset", file, filename),
      type: "asset" as const,
      name: filename,
      sourceFile: relative(file),
      fields: {
        publicPath: `/linkedin/${filename}`,
        bytes: info.size,
        extension: ".png",
        mimeType: "image/png",
        checksum,
        width: dimensions.width,
        height: dimensions.height,
        usages: ["Cognirise LinkedIn communications"],
        cmsOwnership: "cms-candidate",
        collection: "linkedin",
        linkedinAssetKind: kind,
        campaignMetadata: {
          campaign: "Pulse",
          edition: "02",
          title,
          purpose,
          pulseSource,
          approvedUse: "Cognirise LinkedIn communications only",
        },
        accessibility: { altText, decorative: false },
        rights: { status: "approved-use", owner: "Cognirise", source: "Pulse image-led edition" },
      },
      review: review(["Confirm campaign copy and publishing date before use."]),
      digest: checksum,
    };
  }));
}

function mimeType(extension: string) {
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".svg") return "image/svg+xml";
  throw new Error(`Unsupported inventoried asset type: ${extension}`);
}

function imageDimensions(bytes: Buffer, extension: string) {
  if (extension === ".png" && bytes.length >= 24) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  if (extension === ".svg") {
    const text = bytes.toString("utf8", 0, Math.min(bytes.length, 8_192));
    const viewBox = text.match(/viewBox=["'][^"']*?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)["']/i);
    return { width: viewBox ? Number(viewBox[1]) : null, height: viewBox ? Number(viewBox[2]) : null };
  }
  return { width: null, height: null };
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