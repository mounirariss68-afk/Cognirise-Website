import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import * as apiZod from "@workspace/api-zod";
import { repositoryRoot } from "./common.js";
import { objectStorageClient } from "./object-storage.js";

/**
 * Task 241 owns only these five independent methodology drafts.  It does not
 * use the general inventory importer: that importer has a much wider
 * authority, and can neither preserve this editorial history nor account for
 * nested media slots.
 */
const SLUGS = [
  "idao",
  "ai-use-case-prioritization",
  "ai-value-to-scale",
  "agentic-operations-readiness",
  "human-agent-operating-model",
] as const;

const TITLE_BY_SLUG: Record<(typeof SLUGS)[number], string> = {
  idao: "IDAO",
  "ai-use-case-prioritization": "AI Use-Case Portfolio Prioritization",
  "ai-value-to-scale": "AI Value-to-Scale",
  "agentic-operations-readiness": "Agentic Operations Readiness",
  "human-agent-operating-model": "Human–Agent Operating Model",
};

const DEFINITION_EXPORT_BY_SLUG: Record<(typeof SLUGS)[number], string> = {
  idao: "idaoEditorial",
  "ai-use-case-prioritization": "aiUseCasePrioritizationEditorial",
  "ai-value-to-scale": "aiValueToScaleEditorial",
  "agentic-operations-readiness": "agenticOperationsReadinessEditorial",
  "human-agent-operating-model": "humanAgentOperatingModelEditorial",
};

const args = process.argv.slice(2);
const apply = args.includes("--apply-db");
const verify = args.includes("--verify-db");
const bootstrap = args.includes("--bootstrap");
const target = args.find((argument) => argument.startsWith("--target="))?.slice("--target=".length);
const TASK_REASON = "Task 241 exact methodology editorial seed; draft only, pending editorial and media review.";
const SUCCESSOR_REASON = "Task 241 exact methodology editorial successor; draft only, pending editorial and media review.";
// These were the only three top-level metadata values written by the first
// schema-valid successor. They form a deliberately finite fingerprint for the
// metadata correction below; no arbitrary old draft is eligible.
const PRIOR_SUCCESSOR_SEO = {
  idao: {
    title: "IDAO | Cognirise",
    description: "A governed route from a consequential opportunity to evidence, adoption and a capability your team can own.",
    noIndex: false,
  },
  "ai-use-case-prioritization": {
    title: "AI Use-Case Portfolio Prioritization | Cognirise",
    description: "A serious working instrument for transformation leaders to transparently evaluate AI opportunities against value, feasibility, and risk—before committing funding.",
    noIndex: false,
  },
  "ai-value-to-scale": {
    title: "AI Value-to-Scale | Cognirise",
    description: "Can this organisation repeatedly move valuable AI into sustained operation?",
    noIndex: false,
  },
} as const;

if (args.some((argument) => ["--publish", "--approve", "--write-receipt", "--write-audit"].includes(argument))) {
  throw new Error("Task 241 is draft-only; publication, approval, receipt, and audit flags are not supported.");
}

type Slot = {
  kind: "text" | "link" | "media" | "fixed" | "group" | "fixed-list";
  role?: "hero" | "supporting" | "background" | "icon";
  src?: string;
  altText?: string;
  fields?: Record<string, Slot>;
  items?: Slot[];
};

type Definition = {
  template: string;
  slots: Slot;
  seed: Record<string, unknown>;
  editorialSchema: { safeParse: (value: unknown) => { success: boolean; error?: { issues: Array<{ message: string; path: PropertyKey[] }> } } };
};

type HeroSeed = Record<string, unknown> & {
  imageSrc?: string;
  imageAlt?: string;
  media?: { src: string; altText: string; role: string };
};

type MediaSource = {
  path: string;
  sourcePath: string;
  altText: string;
  role: string;
  checksum: string;
  byteSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
};

type Pin = { mediaId: string; mediaVersionId: string; role: string };

interface SqlClient {
  query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null; rows: Record<string, unknown>[] }>;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function differingPaths(expected: unknown, actual: unknown, path = "content"): string[] {
  if (canonicalJson(expected) === canonicalJson(actual)) return [];
  if (Array.isArray(expected) && Array.isArray(actual)) {
    return [...Array(Math.max(expected.length, actual.length)).keys()]
      .flatMap((index) => differingPaths(expected[index], actual[index], `${path}.${index}`));
  }
  if (expected && actual && typeof expected === "object" && typeof actual === "object") {
    const keys = new Set([...Object.keys(expected as object), ...Object.keys(actual as object)]);
    return [...keys].flatMap((key) => differingPaths(
      (expected as Record<string, unknown>)[key],
      (actual as Record<string, unknown>)[key],
      `${path}.${key}`,
    ));
  }
  return [path];
}

function legacyStoredShape(value: unknown): unknown {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(legacyStoredShape);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, legacyStoredShape(item)]));
  }
  return value;
}

function assertDevelopmentTarget() {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Task 241 methodology draft reconciliation is disabled in production.");
  }
  if (target !== "development") {
    throw new Error("Database work requires the explicit --target=development safeguard.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || !process.env.PRIVATE_OBJECT_DIR) {
    throw new Error("Development Object Storage is required.");
  }
}

function definitions(): Record<(typeof SLUGS)[number], Definition> {
  const module = apiZod as Record<string, unknown>;
  const list = module.methodologyEditorialDefinitions;
  const definitionsFromApi = typeof list === "function"
    ? (list as () => Definition[])()
    : [];
  const aggregate = new Map(definitionsFromApi.map((definition) => [definition.template, definition]));
  const resolved = Object.fromEntries(SLUGS.map((slug) => [
    slug,
    aggregate.get(slug) ?? module[DEFINITION_EXPORT_BY_SLUG[slug]],
  ])) as Record<(typeof SLUGS)[number], unknown>;
  for (const slug of SLUGS) {
    const definition = resolved[slug] as Partial<Definition> | undefined;
    if (!definition || typeof definition.template !== "string"
      || !definition.slots || !definition.seed || !definition.editorialSchema) {
      throw new Error(
        `Task 241 exact shared editorial definition is unavailable for ${slug}; expected ${DEFINITION_EXPORT_BY_SLUG[slug]} and methodologyEditorialDefinitions.`,
      );
    }
    if (definition.template !== slug) {
      throw new Error(`${slug}: exact editorial template does not match its route identity.`);
    }
  }
  return resolved as Record<(typeof SLUGS)[number], Definition>;
}

function heroSeeds(): Record<(typeof SLUGS)[number], HeroSeed> {
  const module = apiZod as Record<string, unknown>;
  const names: Record<(typeof SLUGS)[number], string> = {
    idao: "idaoHeroSeed",
    "ai-use-case-prioritization": "aiUseCasePrioritizationHeroSeed",
    "ai-value-to-scale": "aiValueToScaleHeroSeed",
    "agentic-operations-readiness": "agenticOperationsReadinessHeroSeed",
    "human-agent-operating-model": "humanAgentOperatingModelHeroSeed",
  };
  return Object.fromEntries(SLUGS.map((slug) => {
    const seed = module[names[slug]] as HeroSeed | undefined;
    if (!seed || typeof seed.title !== "string" || typeof seed.description !== "string") {
      throw new Error(`${slug}: exact shared heroSeed export is unavailable.`);
    }
    return [slug, seed];
  })) as Record<(typeof SLUGS)[number], HeroSeed>;
}

function sourceFromHero(slug: string, hero: HeroSeed): {
  path: string;
  src: string;
  altText: string;
  role: string;
} {
  const nested = hero.media;
  const src = nested?.src ?? hero.imageSrc;
  const altText = nested?.altText ?? hero.imageAlt;
  if (typeof src !== "string" || typeof altText !== "string") {
    throw new Error(`${slug}: heroSeed must declare its exact local source path and alt text.`);
  }
  return { path: "hero", src, altText, role: "hero" };
}

function contentSeed(slug: (typeof SLUGS)[number], definition: Definition, heroSeed: HeroSeed) {
  const { imageSrc: _imageSrc, imageAlt: _imageAlt, media: _media, ...hero } = heroSeed;
  const canonicalSeed = apiZod.methodologyCanonicalSeed as unknown as
    ((template: (typeof SLUGS)[number]) => Record<string, Array<{ id: string }>>);
  if (typeof canonicalSeed !== "function") {
    throw new Error("Task 241 shared methodology canonical identifiers are unavailable.");
  }
  return {
    schemaVersion: 1,
    template: slug,
    hero,
    editorial: definition.seed,
    canonical: canonicalSeed(slug),
    visibility: "public",
    order: SLUGS.indexOf(slug) + 1,
    sources: [],
    relatedIds: [],
  };
}

function assertExactSeedPreflight(
  definitionBySlug: Record<(typeof SLUGS)[number], Definition>,
  heroBySlug: Record<(typeof SLUGS)[number], HeroSeed>,
) {
  for (const slug of SLUGS) {
    const definition = definitionBySlug[slug];
    const editorial = definition.editorialSchema.safeParse(definition.seed);
    if (!editorial.success) {
      const details = editorial.error?.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`${slug}: exact shared editorial seed is schema-invalid: ${details ?? "unknown validation error"}`);
    }
    const envelope = apiZod.validateCmsContent(
      "framework",
      contentSeed(slug, definition, heroBySlug[slug]),
      "draft",
    );
    if (!envelope.success) {
      const details = envelope.errors.join("; ");
      throw new Error(`${slug}: exact framework envelope is schema-invalid: ${details}`);
    }
  }
}

function mediaSlots(slot: Slot, value: unknown, slotPath = "editorial", requireUnpinned = true): Array<{
  path: string; src: string; altText: string; role: string; pin?: Pin;
}> {
  if (slot.kind === "media") {
    if (!value || typeof value !== "object") throw new Error(`${slotPath}: editorial media value is missing.`);
    const source = value as { src?: unknown; altText?: unknown; media?: unknown };
    if (typeof slot.src !== "string" || source.src !== slot.src || typeof source.altText !== "string") {
      throw new Error(`${slotPath}: seed media does not match its fixed shared slot.`);
    }
    if (requireUnpinned && source.media !== undefined) {
      throw new Error(`${slotPath}: shared seed must not contain an environment-specific immutable media pin.`);
    }
    if (!requireUnpinned) {
      const pin = source.media as Partial<Pin> | undefined;
      if (!pin || typeof pin.mediaId !== "string" || typeof pin.mediaVersionId !== "string"
        || pin.role !== (slot.role ?? "supporting") || hasPlaceholder(pin)) {
        throw new Error(`${slotPath}: resolved editorial media pin is missing or a placeholder.`);
      }
    }
    return [{
      path: slotPath,
      src: slot.src,
      altText: source.altText,
      role: slot.role ?? "supporting",
      ...(!requireUnpinned ? { pin: source.media as Pin } : {}),
    }];
  }
  if (slot.kind === "group") {
    if (!slot.fields || !value || typeof value !== "object") throw new Error(`${slotPath}: malformed shared group slot.`);
    return Object.entries(slot.fields).flatMap(([key, child]) =>
      mediaSlots(child, (value as Record<string, unknown>)[key], `${slotPath}.${key}`, requireUnpinned),
    );
  }
  if (slot.kind === "fixed-list") {
    if (!slot.items || !Array.isArray(value) || slot.items.length !== value.length) {
      throw new Error(`${slotPath}: malformed shared fixed-list media slot.`);
    }
    return slot.items.flatMap((child, index) => mediaSlots(child, value[index], `${slotPath}.${index}`, requireUnpinned));
  }
  return [];
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
  return { width: null, height: null };
}

function mimeType(extension: string) {
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  throw new Error(`Task 241 supports only PNG, JPEG, or WebP editorial media, not ${extension}.`);
}

async function inspectMedia(
  slug: (typeof SLUGS)[number],
  definition: Definition,
  hero: HeroSeed,
): Promise<MediaSource[]> {
  const rawSlots: unknown = [sourceFromHero(slug, hero), ...mediaSlots(definition.slots, definition.seed)];
  if (!Array.isArray(rawSlots)) {
    throw new Error(`${slug}: exact shared schema media inventory is unavailable.`);
  }
  const slots = rawSlots.map((slot, index) => {
    const item = slot as { id?: unknown; src?: unknown; altText?: unknown; role?: unknown; path?: unknown };
    if (typeof item.src !== "string" || typeof item.altText !== "string" || typeof item.role !== "string") {
      throw new Error(`${slug}: malformed exact shared media occurrence ${index}.`);
    }
    return {
      path: typeof item.path === "string" ? item.path : `editorial.${index}`,
      src: item.src,
      altText: item.altText,
      role: item.role,
    };
  });
  if (!slots.length || (slug === "idao" && slots.length !== 11)) {
    throw new Error(`${slug}: expected ${slug === "idao" ? 11 : "at least one"} exact authored media occurrence, found ${slots.length}.`);
  }
  return Promise.all(slots.map(async (slot) => {
    if (!slot.src.startsWith("/images/") || slot.src.includes("..")) {
      throw new Error(`${slug} ${slot.path}: media source must be a local /images/ path.`);
    }
    const sourcePath = path.join("artifacts/cognirise-website/public", slot.src);
    const absolute = path.join(repositoryRoot, sourcePath);
    const bytes = await readFile(absolute);
    const extension = path.extname(sourcePath).toLowerCase();
    const dimensions = imageDimensions(bytes, extension);
    const info = await stat(absolute);
    return {
      path: slot.path,
      sourcePath,
      altText: slot.altText,
      role: slot.role,
      checksum: createHash("sha256").update(bytes).digest("hex"),
      byteSize: info.size,
      mimeType: mimeType(extension),
      width: dimensions.width,
      height: dimensions.height,
    };
  }));
}

function withPins(slot: Slot, value: unknown, pins: Map<string, Pin>, slotPath = "editorial"): unknown {
  if (slot.kind === "media") {
    const pin = pins.get(slotPath);
    if (!pin) throw new Error(`${slotPath}: no resolved environment-local immutable media pin.`);
    return { ...(value as Record<string, unknown>), media: pin };
  }
  if (slot.kind === "group") {
    return Object.fromEntries(Object.entries(slot.fields ?? {}).map(([key, child]) => [
      key,
      withPins(child, (value as Record<string, unknown>)[key], pins, `${slotPath}.${key}`),
    ]));
  }
  if (slot.kind === "fixed-list") {
    return (slot.items ?? []).map((child, index) =>
      withPins(child, (value as unknown[])[index], pins, `${slotPath}.${index}`));
  }
  return structuredClone(value);
}

function withoutPins(slot: Slot, value: unknown): unknown {
  if (slot.kind === "media") {
    const { media: _media, ...unresolved } = value as Record<string, unknown>;
    return unresolved;
  }
  if (slot.kind === "group") {
    return Object.fromEntries(Object.entries(slot.fields ?? {}).map(([key, child]) => [
      key,
      withoutPins(child, (value as Record<string, unknown>)[key]),
    ]));
  }
  if (slot.kind === "fixed-list") {
    return (slot.items ?? []).map((child, index) => withoutPins(child, (value as unknown[])[index]));
  }
  return structuredClone(value);
}

function legacyTaskDefinition(slug: (typeof SLUGS)[number], definition: Definition): Definition {
  if (slug !== "idao" && slug !== "agentic-operations-readiness" && slug !== "human-agent-operating-model") return definition;
  const slots = structuredClone(definition.slots);
  const seed = structuredClone(definition.seed);
  // This narrow predecessor is the only Task 241 layout created before the
  // authored IDAO stage/canon leaves and the two page-owned SEO groups entered
  // the schema. It is used solely to recognize an untouched historical task
  // draft before appending a successor; it is never an import source.
  if (slug === "idao") {
    delete slots.fields?.stageMedia;
    delete slots.fields?.canonMedia;
    delete seed.stageMedia;
    delete seed.canonMedia;
  }
  if (slug === "agentic-operations-readiness" || slug === "human-agent-operating-model") {
    const { noIndex: _noIndex, ...seo } = apiZod.methodologySeoSeed(slug);
    // The predecessor stored the same authored SEO title/description inside
    // editorial before those values became top-level snapshot metadata.
    slots.fields = { ...(slots.fields ?? {}), seo: { kind: "fixed" } };
    seed.seo = seo;
  }
  return { ...definition, slots, seed };
}

function hasPlaceholder(value: unknown): boolean {
  if (typeof value === "string") {
    return /^(?:0{8}|1{8})-0{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
  if (Array.isArray(value)) return value.some(hasPlaceholder);
  return Boolean(value && typeof value === "object" && Object.values(value).some(hasPlaceholder));
}

async function ensureObject(source: MediaSource): Promise<void> {
  const prefix = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "");
  const storageKey = `${prefix}/cms-media/task-241/${source.checksum}`;
  const object = objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!).file(storageKey);
  const bytes = await readFile(path.join(repositoryRoot, source.sourcePath));
  const [exists] = await object.exists();
  if (!exists) {
    await object.save(bytes, {
      resumable: false,
      contentType: source.mimeType,
      metadata: {
        cacheControl: "private, max-age=31536000, immutable",
        metadata: { checksum: source.checksum, source: "task-241-methodology-editorial" },
      },
    });
  }
  const [[metadata], [stored]] = await Promise.all([object.getMetadata(), object.download()]);
  if (Number(metadata.size) !== source.byteSize
    || metadata.contentType !== source.mimeType
    || metadata.metadata?.checksum !== source.checksum
    || createHash("sha256").update(stored).digest("hex") !== source.checksum) {
    throw new Error(`${source.sourcePath}: immutable environment-local object verification failed.`);
  }
}

async function ensureMedia(client: SqlClient, source: MediaSource): Promise<Pin> {
  const prefix = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "");
  const storageKey = `${prefix}/cms-media/task-241/${source.checksum}`;
  let asset = await client.query(
    `SELECT id::text,storage_key,checksum,byte_size,media_type,status
       FROM cms_media_assets WHERE checksum=$1`,
    [source.checksum],
  );
  if ((asset.rowCount ?? 0) > 1) throw new Error(`${source.sourcePath}: multiple CMS assets share this checksum; refusing ambiguous pin.`);
  if (!asset.rowCount) {
    asset = await client.query(
      `INSERT INTO cms_media_assets
        (storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,credit,collection,status)
       VALUES ($1,$2,$2,$3,$4,$5,$6,'Rights holder pending editorial review','website','pending-review')
       RETURNING id::text,storage_key,checksum,byte_size,media_type,status`,
      [storageKey, path.basename(source.sourcePath), source.mimeType, source.byteSize, source.checksum, source.altText],
    );
  }
  const row = asset.rows[0];
  if (!row || row.checksum !== source.checksum || Number(row.byte_size) !== source.byteSize
    || row.media_type !== source.mimeType || typeof row.id !== "string") {
    throw new Error(`${source.sourcePath}: existing media asset conflicts with the exact editorial source.`);
  }
  let version = await client.query(
    `SELECT id::text,asset_id::text,storage_key,checksum,byte_size,width,height,metadata
       FROM cms_media_versions WHERE asset_id=$1 AND checksum=$2 AND storage_key=$3`,
    [row.id, source.checksum, storageKey],
  );
  if ((version.rowCount ?? 0) > 1) throw new Error(`${source.sourcePath}: multiple immutable versions match this pin.`);
  if (!version.rowCount) {
    const number = await client.query(
      "SELECT COALESCE(MAX(version_number),0)+1 next FROM cms_media_versions WHERE asset_id=$1",
      [row.id],
    );
    version = await client.query(
      `INSERT INTO cms_media_versions
        (asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id::text,asset_id::text,storage_key,checksum,byte_size,width,height,metadata`,
      [row.id, number.rows[0]?.next, storageKey, source.checksum, source.byteSize, source.width, source.height, {
        sourcePath: source.sourcePath,
        editorialSlot: source.path,
        role: source.role,
        altText: source.altText,
        rightsStatus: "needs-review",
        accessibilityStatus: "needs-review",
        reviewStatus: "needs-review",
      }],
    );
  }
  const immutable = version.rows[0];
  if (!immutable || immutable.asset_id !== row.id || immutable.storage_key !== storageKey
    || immutable.checksum !== source.checksum || Number(immutable.byte_size) !== source.byteSize
    || Number(immutable.width) !== source.width || Number(immutable.height) !== source.height
    || hasPlaceholder(immutable.id)) {
    throw new Error(`${source.sourcePath}: immutable media version conflicts with task 241.`);
  }
  return { mediaId: String(row.id), mediaVersionId: String(immutable.id), role: source.role };
}

/**
 * Acquire every document/edition/revision lock and reject plainly incompatible
 * history before the apply path is allowed to create media rows or issue an
 * object-storage write. These locks are deliberately retained through staging.
 */
async function preflightDraftState(
  client: SqlClient,
  slug: (typeof SLUGS)[number],
  definition: Definition,
  heroSeed: HeroSeed,
  sources: MediaSource[],
): Promise<{ slug: string; action: "stage" | "preserved"; reason?: string }> {
  const preserveOrThrow = (reason: string): { slug: string; action: "preserved"; reason: string } => {
    if (bootstrap) return { slug, action: "preserved", reason };
    throw new Error(`${slug}: ${reason}; no media or editorial write was attempted.`);
  };
  const document = await client.query(
    `SELECT id::text,kind,title,status FROM cms_documents WHERE canonical_slug=$1 FOR UPDATE`,
    [slug],
  );
  if (!document.rowCount) return { slug, action: "stage" };
  const documentRow = document.rows[0];
  if (document.rowCount !== 1 || documentRow.kind !== "framework"
    || documentRow.title !== TITLE_BY_SLUG[slug] || documentRow.status !== "active") {
    throw new Error(`${slug}: canonical document identity conflicts; no media or editorial write was attempted.`);
  }
  const edition = await client.query(
    `SELECT id::text,publication_state,published_revision_id::text
       FROM cms_market_editions WHERE document_id=$1 AND market='uae' AND locale='en' FOR UPDATE`,
    [documentRow.id],
  );
  if (!edition.rowCount) return { slug, action: "stage" };
  const editionRow = edition.rows[0];
  if (edition.rowCount !== 1) {
    throw new Error(`${slug}: UAE/English edition identity is ambiguous; no media or editorial write was attempted.`);
  }
  const terminalEdition = editionRow.publication_state !== "draft" || editionRow.published_revision_id !== null;
  if (terminalEdition && !bootstrap) {
    return preserveOrThrow("existing UAE/English edition has publication history");
  }
  const revisions = await client.query(
    `SELECT id::text,revision_number,workflow_state,payload,reason FROM cms_revisions
       WHERE edition_id=$1 ORDER BY revision_number DESC FOR UPDATE`,
    [editionRow.id],
  );
  const latest = revisions.rows[0];
  if (!latest) {
    if (terminalEdition) return preserveOrThrow("existing UAE/English edition has publication history");
    return { slug, action: "stage" };
  }
  if (latest.workflow_state !== "draft" || hasPlaceholder(latest.payload)) {
    if (hasPlaceholder(latest.payload)) {
      throw new Error(`${slug}: latest revision contains a placeholder identity; no media or editorial write was attempted.`);
    }
    return preserveOrThrow("latest revision is a reviewed or otherwise non-draft terminal state");
  }
  if (terminalEdition) return preserveOrThrow("existing UAE/English edition has publication history");
  const legacyCandidate = latest.reason === TASK_REASON && Number(latest.revision_number) === 1;
  const comparisonDefinition = legacyCandidate ? legacyTaskDefinition(slug, definition) : definition;
  const latestContent = latest.payload && typeof latest.payload === "object"
    ? (latest.payload as Record<string, unknown>).content
    : undefined;
  if (!latestContent || typeof latestContent !== "object") {
    return preserveOrThrow("latest revision has no comparable Task 241 content envelope");
  }
  const rawContent = latestContent as Record<string, unknown>;
  const rawHero = rawContent.hero;
  const rawEditorial = rawContent.editorial;
  if (!rawHero || typeof rawHero !== "object" || !rawEditorial || typeof rawEditorial !== "object") {
    return preserveOrThrow("latest revision has malformed editorial media content");
  }
  const { media: _heroMedia, ...heroWithoutPin } = rawHero as Record<string, unknown>;
  const expectedContent = contentSeed(slug, comparisonDefinition, heroSeed);
  const actualContent = {
    ...rawContent,
    hero: heroWithoutPin,
    editorial: withoutPins(comparisonDefinition.slots, rawEditorial),
  };
  if (canonicalJson(legacyStoredShape(actualContent)) !== canonicalJson(legacyStoredShape(expectedContent))) {
    return preserveOrThrow("latest editorial content differs from its known Task 241 seed");
  }
  const storedSeo = (latest.payload as Record<string, unknown>).seo;
  const currentSeo = apiZod.methodologySeoSeed(slug);
  const priorSeo = PRIOR_SUCCESSOR_SEO[slug as keyof typeof PRIOR_SUCCESSOR_SEO];
  const permittedSeo = canonicalJson(storedSeo) === canonicalJson(currentSeo)
    || (legacyCandidate && canonicalJson(storedSeo) === canonicalJson({ noIndex: false }))
    || (priorSeo && canonicalJson(storedSeo) === canonicalJson(priorSeo));
  if (!permittedSeo) return preserveOrThrow("latest revision has newer authored SEO metadata");
  const references = await client.query(
    `SELECT ref.asset_id::text,ref.media_version_id::text,ref.field_path,
            asset.checksum asset_checksum,version.checksum version_checksum,version.storage_key
       FROM cms_media_references ref
       JOIN cms_media_assets asset ON asset.id=ref.asset_id
       JOIN cms_media_versions version ON version.id=ref.media_version_id AND version.asset_id=ref.asset_id
      WHERE ref.document_id=$1 AND ${legacyCandidate ? "ref.field_path LIKE $2" : "ref.field_path=$2"}`,
    [documentRow.id, legacyCandidate ? `revision:${latest.id}%` : `revision:${latest.id}`],
  );
  const expectedChecksums = new Set(sources.map((source) => source.checksum));
  const expectedStoragePrefix = `${process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "")}/cms-media/task-241/`;
  // A legacy revision-one draft is allowed to have its known historical
  // occurrence paths. All current/replay candidates must be API-loadable at
  // the exact revision path; either malformed set is a conflict before media
  // provisioning begins.
  const actualChecksums = new Set(references.rows.map((reference) => String(reference.asset_checksum)));
  const expectedReferenceCount = legacyCandidate ? sources.length : expectedChecksums.size;
  if (references.rowCount !== expectedReferenceCount
    || actualChecksums.size !== expectedChecksums.size
    || [...expectedChecksums].some((checksum) => !actualChecksums.has(checksum))
    || references.rows.some((reference) =>
      typeof reference.media_version_id !== "string"
      || hasPlaceholder(reference.media_version_id)
      || !expectedChecksums.has(String(reference.asset_checksum))
      || reference.asset_checksum !== reference.version_checksum
      || reference.storage_key !== `${expectedStoragePrefix}${reference.asset_checksum}`)) {
    return preserveOrThrow("latest revision has conflicting immutable media pins");
  }
  return { slug, action: "stage" };
}

async function stageDraft(
  client: SqlClient,
  slug: (typeof SLUGS)[number],
  definition: Definition,
  heroSeed: HeroSeed,
  sources: MediaSource[],
) {
  const document = await client.query(
    `SELECT id::text,kind,title,status FROM cms_documents WHERE canonical_slug=$1 FOR UPDATE`,
    [slug],
  );
  let documentId: string;
  if (!document.rowCount) {
    const created = await client.query(
      `INSERT INTO cms_documents(kind,canonical_slug,title,status)
       VALUES ('framework',$1,$2,'active') RETURNING id::text`,
      [slug, TITLE_BY_SLUG[slug]],
    );
    documentId = String(created.rows[0]?.id);
  } else {
    const existing = document.rows[0];
    if (document.rowCount !== 1 || existing.kind !== "framework" || existing.title !== TITLE_BY_SLUG[slug]
      || existing.status !== "active") {
      throw new Error(`${slug}: canonical document identity conflicts; editorial history was not changed.`);
    }
    documentId = String(existing.id);
  }
  if (!documentId || hasPlaceholder(documentId)) throw new Error(`${slug}: invalid document identity.`);

  let edition = await client.query(
    `SELECT id::text,publication_state,published_revision_id::text
       FROM cms_market_editions WHERE document_id=$1 AND market='uae' AND locale='en' FOR UPDATE`,
    [documentId],
  );
  let editionId: string;
  if (!edition.rowCount) {
    const created = await client.query(
      `INSERT INTO cms_market_editions
       (document_id,market,locale,localized_slug,publication_state,fallback_mode,parity_complete)
       VALUES ($1,'uae','en',$2,'draft','none',false) RETURNING id::text,publication_state,published_revision_id::text`,
      [documentId, slug],
    );
    edition = created;
  }
  const editionRow = edition.rows[0];
  if (!editionRow || edition.rowCount !== 1 || editionRow.publication_state !== "draft"
    || editionRow.published_revision_id !== null) {
    throw new Error(`${slug}: existing UAE/English edition has a publication pointer; preserved without change.`);
  }
  editionId = String(editionRow.id);

  const pins = new Map<string, Pin>();
  for (const source of sources) pins.set(source.path, await ensureMedia(client, source));
  const editorialContent = withPins(definition.slots, definition.seed, pins) as Record<string, unknown>;
  const editorial = definition.editorialSchema.safeParse(editorialContent);
  if (!editorial.success) {
    throw new Error(`${slug}: shared editorial seed is invalid: ${editorial.error?.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  }
  const content = contentSeed(slug, definition, heroSeed) as Record<string, unknown>;
  content.editorial = editorialContent;
  const heroPin = pins.get("hero");
  if (!heroPin) throw new Error(`${slug}: no exact environment-local hero media pin.`);
  content.hero = { ...(content.hero as Record<string, unknown>), media: heroPin };
  const payload = {
    slug,
    title: TITLE_BY_SLUG[slug],
    summary: typeof content.hero === "object" && content.hero
      && typeof (content.hero as Record<string, unknown>).description === "string"
      ? (content.hero as Record<string, unknown>).description
      : null,
    content,
    seo: apiZod.methodologySeoSeed(slug),
    mediaIds: [...new Set([...pins.values()].map((pin) => pin.mediaId))],
    markets: ["uae"],
  };
  const snapshot = apiZod.validateCmsSnapshot("framework", payload, "draft");
  if (!snapshot.success || hasPlaceholder(snapshot.data)) {
    throw new Error(`${slug}: draft payload is invalid or contains a placeholder media identity: ${snapshot.success ? "" : snapshot.errors.join("; ")}`);
  }
  const revisions = await client.query(
    `SELECT id::text,revision_number,payload,workflow_state,reason
       FROM cms_revisions WHERE edition_id=$1 ORDER BY revision_number DESC FOR UPDATE`,
    [editionId],
  );
  const latest = revisions.rows[0];
  let successor = false;
  if (latest) {
    if (latest.workflow_state !== "draft") {
      throw new Error(`${slug}: newer or conflicting meaningful editorial history was preserved; no draft was appended.`);
    }
    if (canonicalJson(latest.payload) === canonicalJson(snapshot.data)) {
      const references = await client.query(
        `SELECT asset_id::text,media_version_id::text,field_path FROM cms_media_references
          WHERE document_id=$1 AND field_path=$2`,
        [documentId, `revision:${latest.id}`],
      );
      const expectedPins = new Map([...pins.values()].map((pin) => [`${pin.mediaId}:${pin.mediaVersionId}`, pin]));
      if (references.rowCount !== expectedPins.size
        || references.rows.some((reference) => {
          const expected = expectedPins.get(`${reference.asset_id}:${reference.media_version_id}`);
          return !expected
            || reference.field_path !== `revision:${latest.id}`
            || hasPlaceholder(reference.media_version_id);
        })) {
        throw new Error(`${slug}: existing exact draft has an incomplete or conflicting immutable media pin.`);
      }
      return { slug, action: "replayed", stableDigest: digest({ slug, seed: contentSeed(slug, definition, heroSeed), sources }) };
    }
    const priorSeo = PRIOR_SUCCESSOR_SEO[slug as keyof typeof PRIOR_SUCCESSOR_SEO];
    if (priorSeo) {
      const references = await client.query(
        `SELECT asset_id::text,media_version_id::text,field_path FROM cms_media_references
          WHERE document_id=$1 AND field_path=$2`,
        [documentId, `revision:${latest.id}`],
      );
      const expectedPins = new Map([...pins.values()].map((pin) => [`${pin.mediaId}:${pin.mediaVersionId}`, pin]));
      const exactPriorSuccessor = latest.reason === SUCCESSOR_REASON
        && Number(latest.revision_number) === 2
        && canonicalJson(latest.payload) === canonicalJson({ ...snapshot.data, seo: priorSeo })
        && references.rowCount === expectedPins.size
        && !references.rows.some((reference) =>
          reference.field_path !== `revision:${latest.id}`
          || !expectedPins.has(`${reference.asset_id}:${reference.media_version_id}`)
          || hasPlaceholder(reference.media_version_id));
      if (exactPriorSuccessor) {
        successor = true;
      } else {
        throw new Error(`${slug}: newer or conflicting meaningful editorial history was preserved; the prior SEO successor fingerprint did not match.`);
      }
    }
    if (successor) {
      // The finite SEO correction above has already established that this
      // revision is an untouched Task 241 successor. Do not run the older
      // revision-one predecessor recognizer against it.
    } else {
    const legacyDefinition = legacyTaskDefinition(slug, definition);
    const legacyEditorial = withPins(legacyDefinition.slots, legacyDefinition.seed, pins) as Record<string, unknown>;
    const legacyContent = contentSeed(slug, legacyDefinition, heroSeed) as Record<string, unknown>;
    legacyContent.editorial = legacyEditorial;
    legacyContent.hero = { ...(legacyContent.hero as Record<string, unknown>), media: heroPin };
    const legacyContentValidation = apiZod.validateCmsContent("framework", legacyContent, "draft");
    const legacyPayload = legacyStoredShape({
      ...payload,
      content: legacyContentValidation.success ? legacyContentValidation.data : legacyContent,
      seo: { noIndex: false },
    });
    const legacyReferences = await client.query(
      `SELECT asset_id::text,media_version_id::text,field_path FROM cms_media_references
        WHERE document_id=$1 AND field_path LIKE $2`,
      [documentId, `revision:${latest.id}%`],
    );
    const legacyPinPairs = new Set([...pins.values()].map((pin) => `${pin.mediaId}:${pin.mediaVersionId}`));
    const legacyReasonMatches = latest.reason === TASK_REASON;
    const legacyRevisionMatches = Number(latest.revision_number) === 1;
    const legacyPayloadMatches = canonicalJson(latest.payload) === canonicalJson(legacyPayload);
    const legacyReferencesMatch = legacyReferences.rowCount === pins.size
      && !legacyReferences.rows.some((reference) =>
        !String(reference.field_path).startsWith(`revision:${latest.id}`)
        || !legacyPinPairs.has(`${reference.asset_id}:${reference.media_version_id}`));
    if (!legacyReasonMatches || !legacyRevisionMatches || !legacyPayloadMatches || !legacyReferencesMatch) {
      const differences = differingPaths(legacyPayload, latest.payload).slice(0, 12).join(",");
      throw new Error(`${slug}: newer or conflicting meaningful editorial history was preserved; no draft was appended (taskReason=${legacyReasonMatches}; revisionOne=${legacyRevisionMatches}; untouchedPayload=${legacyPayloadMatches}; untouchedPins=${legacyReferencesMatch}; differing=${differences}).`);
    }
    successor = true;
    }
  }
  const created = await client.query(
    `INSERT INTO cms_revisions
      (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,reason,created_by_user_id)
     SELECT $1,$2,1,$3,$4,'draft',$5,id FROM cms_users
      WHERE email='cms-inventory-migration@service.invalid' AND role='viewer' AND status='suspended'
     RETURNING id::text`,
    [
      editionId,
      successor ? Number(latest?.revision_number) + 1 : 1,
      snapshot.data,
      digest(snapshot.data),
      successor ? SUCCESSOR_REASON : TASK_REASON,
    ],
  );
  if (created.rowCount !== 1) {
    throw new Error(`${slug}: no existing suspended migration attribution user is available; no user fixture was created.`);
  }
  const revisionId = String(created.rows[0]?.id);
  for (const pin of new Map([...pins.values()].map((pin) => [`${pin.mediaId}:${pin.mediaVersionId}`, pin])).values()) {
    await client.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       VALUES ($1,$2,$3,$4)`,
      [pin.mediaId, pin.mediaVersionId, documentId, `revision:${revisionId}`],
    );
  }
  return { slug, action: successor ? "successor-created" : "created", stableDigest: digest({ slug, seed: contentSeed(slug, definition, heroSeed), sources }) };
}

async function verifyAllSeven(
  client: SqlClient,
  definitionBySlug: Record<(typeof SLUGS)[number], Definition>,
  heroBySlug: Record<(typeof SLUGS)[number], HeroSeed>,
  sourcesBySlug: Record<(typeof SLUGS)[number], MediaSource[]>,
) {
  const protectedSlugs = ["agent-authority-model", "guardrails-framework"];
  const expected = [...SLUGS, ...protectedSlugs];
  const rows = await client.query(
    `SELECT d.id::text document_id,d.canonical_slug,d.kind,e.id::text edition_id,e.publication_state,
            e.published_revision_id::text,r.id::text revision_id,r.payload,r.workflow_state
       FROM cms_documents d
       LEFT JOIN cms_market_editions e ON e.document_id=d.id AND e.market='uae' AND e.locale='en'
       LEFT JOIN LATERAL (
         SELECT id,payload,workflow_state FROM cms_revisions
          WHERE edition_id=e.id ORDER BY revision_number DESC LIMIT 1
       ) r ON true
      WHERE d.canonical_slug = ANY($1::text[])`,
    [expected],
  );
  if (rows.rowCount !== 7) throw new Error(`All-seven methodology inventory is incomplete (${rows.rowCount}/7).`);
  const verifiedDrafts: Array<{
    slug: string;
    status: "exact-draft-verified" | "draft-present" | "preserved-terminal";
    schemaMediaOccurrences?: number;
    apiLoadableImmutableAssetVersions?: number;
    publicDraftMedia: "none" | "not-asserted";
  }> = [];
  for (const row of rows.rows) {
    if (row.kind !== "framework" || !row.edition_id || !row.revision_id) {
      throw new Error(`${String(row.canonical_slug)}: framework draft inventory is incomplete.`);
    }
    const slug = String(row.canonical_slug);
    if (protectedSlugs.includes(slug)) continue;
    if (bootstrap) {
      if (hasPlaceholder(row.payload)) {
        throw new Error(`${slug}: bootstrap verification refuses a placeholder identity.`);
      }
      const terminal = row.publication_state !== "draft"
        || row.published_revision_id !== null
        || row.workflow_state !== "draft";
      verifiedDrafts.push({
        slug,
        status: terminal ? "preserved-terminal" : "draft-present",
        publicDraftMedia: terminal ? "not-asserted" : "none",
      });
      continue;
    }
    const validation = apiZod.validateCmsSnapshot("framework", row.payload, "draft");
    if (!validation.success) throw new Error(`${slug}: stored framework payload is invalid.`);
    if (row.publication_state !== "draft" || row.published_revision_id !== null || row.workflow_state !== "draft") {
      throw new Error(`${slug}: task 241 requires an unpublished draft; a publication state was not accepted.`);
    }
    const definition = definitionBySlug[slug as (typeof SLUGS)[number]];
    const heroSeed = heroBySlug[slug as (typeof SLUGS)[number]];
    const values = mediaSlots(definition.slots, definition.seed);
    // Snapshot validation trims text in its parsed return value. Compare the
    // raw persisted payload so authored whitespace remains part of the exact
    // shared seed rather than being silently normalized during verification.
    const storedContent = (row.payload as Record<string, unknown>).content as Record<string, unknown>;
    const pins = mediaSlots(definition.slots, storedContent.editorial, "editorial", false);
    const heroMedia = (storedContent.hero as { media?: unknown } | undefined)?.media as Partial<Pin> | undefined;
    if (!heroMedia || typeof heroMedia.mediaId !== "string" || typeof heroMedia.mediaVersionId !== "string"
      || heroMedia.role !== "hero" || hasPlaceholder(heroMedia)) {
      throw new Error(`${slug}: schema-loadable hero media pin is missing or invalid.`);
    }
    const normalized = structuredClone(storedContent);
    normalized.hero = {
      ...(normalized.hero as Record<string, unknown>),
    };
    delete (normalized.hero as Record<string, unknown>).media;
    normalized.editorial = withoutPins(definition.slots, normalized.editorial);
    const pinsMatch = values.length === pins.length;
    // Link/text schemas deliberately normalize values (for example, the
    // authored spacing around an inline emphasis). Compare both sides through
    // that same authoritative framework schema; this is not a generic
    // fallback and still rejects any changed normalized editorial value.
    const expectedSeed = apiZod.validateCmsContent(
      "framework",
      contentSeed(slug as (typeof SLUGS)[number], definition, heroSeed),
      "draft",
    );
    const storedSeed = apiZod.validateCmsContent("framework", normalized, "draft");
    const seedMatch = expectedSeed.success
      && storedSeed.success
      && canonicalJson(storedSeed.data) === canonicalJson(expectedSeed.data);
    const placeholders = hasPlaceholder(row.payload);
    if (!pinsMatch || !seedMatch || placeholders) {
      throw new Error(
        `${slug}: stored editorial payload differs from its exact seed (mediaSlotsMatch=${pinsMatch}; exactSeedMatch=${seedMatch}; placeholders=${placeholders}; differing=${differingPaths(contentSeed(slug as (typeof SLUGS)[number], definition, heroSeed), normalized).slice(0, 12).join(",")}).`,
      );
    }
    const references = await client.query(
      `SELECT ref.asset_id::text,ref.media_version_id::text,ref.field_path,
              asset.checksum asset_checksum,version.checksum version_checksum,version.storage_key
         FROM cms_media_references ref
         JOIN cms_media_assets asset ON asset.id=ref.asset_id
         JOIN cms_media_versions version ON version.id=ref.media_version_id AND version.asset_id=ref.asset_id
        WHERE ref.document_id=$1 AND ref.field_path=$2 ORDER BY ref.asset_id`,
      [row.document_id, `revision:${row.revision_id}`],
    );
    const expectedSources = sourcesBySlug[slug as (typeof SLUGS)[number]];
    const expectedReferenceSources = new Map<string, MediaSource[]>();
    for (const source of expectedSources) {
      const pin = source.path === "hero"
        ? heroMedia
        : pins.find((item) => item.path === source.path)?.pin;
      if (!pin) throw new Error(`${slug}: exact media slot ${source.path} has no immutable pin.`);
      const key = `${pin.mediaId}:${pin.mediaVersionId}`;
      expectedReferenceSources.set(key, [...(expectedReferenceSources.get(key) ?? []), source]);
    }
    if (references.rowCount !== expectedReferenceSources.size
      || references.rows.some((reference) =>
        reference.field_path !== `revision:${row.revision_id}`
        || typeof reference.media_version_id !== "string"
        || hasPlaceholder(reference.media_version_id)
        || !expectedReferenceSources.has(`${reference.asset_id}:${reference.media_version_id}`)
        || !expectedReferenceSources.get(`${reference.asset_id}:${reference.media_version_id}`)!.every((source) =>
          reference.asset_checksum === source.checksum
          && reference.version_checksum === source.checksum
          && reference.storage_key === `${process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "")}/cms-media/task-241/${source.checksum}`
        ))) {
      throw new Error(`${slug}: API-loadable immutable media references do not correspond to every exact authored source.`);
    }
    verifiedDrafts.push({
      slug,
      status: "exact-draft-verified",
      schemaMediaOccurrences: expectedSources.length,
      apiLoadableImmutableAssetVersions: expectedReferenceSources.size,
      publicDraftMedia: "none",
    });
  }
  return {
    frameworks: rows.rows.map((row) => String(row.canonical_slug)).sort(),
    count: rows.rowCount,
    verifiedDrafts,
  };
}

export async function runDraftTransaction<T>(hooks: {
  begin: () => Promise<unknown>;
  preflight: () => Promise<unknown>;
  stage: () => Promise<T>;
  commit: () => Promise<unknown>;
  rollback: () => Promise<unknown>;
  provisionObjects: () => Promise<unknown>;
}): Promise<T> {
  let committed = false;
  await hooks.begin();
  try {
    await hooks.preflight();
    const result = await hooks.stage();
    await hooks.commit();
    committed = true;
    // Object storage has no rollback primitive. It is deliberately invoked
    // only after all locked database classification/staging has committed.
    await hooks.provisionObjects();
    return result;
  } catch (error) {
    if (!committed) await hooks.rollback();
    throw error;
  }
}

export async function provisionStagedMedia<T>(
  classifications: Array<{ slug: string; action: "stage" | "preserved" }>,
  sourcesBySlug: Record<string, T[]>,
  provision: (source: T) => Promise<unknown>,
) {
  const unique = new Set<T>();
  for (const classification of classifications) {
    if (classification.action !== "stage") continue;
    for (const source of sourcesBySlug[classification.slug] ?? []) unique.add(source);
  }
  for (const source of unique) await provision(source);
}

async function main() {
  if (apply && verify) throw new Error("Choose either --apply-db or --verify-db, not both.");
  const definitionBySlug = definitions();
  const heroBySlug = heroSeeds();
  // This runs before Object Storage or database access. A malformed exact
  // seed must never leave an orphan object or a partial draft behind.
  assertExactSeedPreflight(definitionBySlug, heroBySlug);
  const inspected = Object.fromEntries(await Promise.all(SLUGS.map(async (slug) => [
    slug,
    await inspectMedia(slug, definitionBySlug[slug], heroBySlug[slug]),
  ]))) as Record<(typeof SLUGS)[number], MediaSource[]>;
  if (!apply && !verify) {
    console.log(JSON.stringify({
      task: 241,
      dryRun: true,
      routes: Object.fromEntries(SLUGS.map((slug) => [slug, {
        stableDigest: digest({ slug, seed: contentSeed(slug, definitionBySlug[slug], heroBySlug[slug]), sources: inspected[slug] }),
        mediaOccurrences: inspected[slug].length,
        media: inspected[slug],
      }])),
      note: "No database, storage, receipt, approval, audit, or fixture write was performed.",
    }, null, 2));
    return;
  }
  assertDevelopmentTarget();
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  let classifications: Array<{ slug: string; action: "stage" | "preserved"; reason?: string }> = [];
  try {
    const outcome = apply
      ? await runDraftTransaction({
        begin: async () => { await client.query("BEGIN"); },
        preflight: async () => {
        // Lock and classify the complete five-route set before staging media
        // rows. In particular, this happens before any object storage call.
          classifications = [];
          for (const slug of SLUGS) {
            classifications.push(await preflightDraftState(
              client, slug, definitionBySlug[slug], heroBySlug[slug], inspected[slug],
            ));
          }
        },
        stage: async () => {
          const staged = [];
          for (const slug of SLUGS) {
            const classification = classifications.find((candidate) => candidate.slug === slug);
            if (classification?.action === "preserved") {
              staged.push(classification);
            } else {
              staged.push(await stageDraft(client, slug, definitionBySlug[slug], heroBySlug[slug], inspected[slug]));
            }
          }
          return staged;
        },
        commit: async () => { await client.query("COMMIT"); },
        rollback: async () => { await client.query("ROLLBACK"); },
        provisionObjects: async () => {
          const uniqueSources = new Map<string, MediaSource>();
          for (const slug of SLUGS) {
            for (const source of inspected[slug]) uniqueSources.set(source.checksum, source);
          }
          await provisionStagedMedia(
            classifications,
            Object.fromEntries(SLUGS.map((slug) => [slug, [...uniqueSources.values()]
              .filter((source) => inspected[slug].some((candidate) => candidate.checksum === source.checksum))])),
            ensureObject,
          );
        },
      })
      : await (async () => {
        await client.query("BEGIN READ ONLY");
        try {
          const verified = await verifyAllSeven(client, definitionBySlug, heroBySlug, inspected);
          await client.query("ROLLBACK");
          return verified;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      })();
    console.log(JSON.stringify({ task: 241, target: "development", mode: apply ? "draft-only-apply" : "all-seven-read-only-verify", outcome }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}