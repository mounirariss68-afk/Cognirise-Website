import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { industryContentSchema, validateCmsSnapshot } from "@workspace/api-zod";
import { canonicalResultDigest } from "./migration.js";
import { emitJson, outputPath, repositoryRoot } from "./common.js";

/**
 * Task 319 is deliberately separate from the generic inventory importer. The
 * inventory contains the short, canonical Public Sector record; these four
 * documents are a reviewed, market-specific editorial handoff. Keeping the
 * handoff here also means that a post-merge replay can be checked against the
 * same source and request digest without using task-local database IDs.
 */

export const PUBLIC_SECTOR_MARKETS = ["uae", "ksa", "turkiye", "europe"] as const;
export type PublicSectorMarket = (typeof PUBLIC_SECTOR_MARKETS)[number];
const SHARED_LEGAL_REVIEW_BLOCKER = "Shared public-sector legal claim (section 3, line 32): the universal suspensive-appeal assertion is not legally verified; narrow the language or supply authoritative legal support before publication.";

const DOCUMENTS: Record<PublicSectorMarket, string> = {
  uae: "attached_assets/public-sector_UAE_page-copy_1789205079143.md",
  ksa: "attached_assets/public-sector_KSA_page-copy_1789205152431.md",
  turkiye: "attached_assets/public-sector_Turkiye_page-copy_1789205152432.md",
  europe: "attached_assets/public-sector_EU_page-copy_1789205152431.md",
};

const MARKET_LABELS: Record<PublicSectorMarket, string> = {
  uae: "United Arab Emirates",
  ksa: "Kingdom of Saudi Arabia",
  turkiye: "Türkiye",
  europe: "European Union",
};

const EVIDENCE_FILE = "scripts/src/cms/public-sector-evidence.json";
const EVIDENCE_REVIEW_FILE = "docs/public-sector-evidence-review.md";
const OPERATION = "cms.public-sector.edition-draft-v1";
const RECEIPT_PREFIX = "cms-public-sector-editions-v1";
const SERVICE_EMAIL = "cms-public-sector-editions-v1@service.invalid";
const SERVICE_NAME = "Public Sector editions reconciliation service";
const DATE_PROVENANCE = "Inherited unchanged from the approved predecessor; Task 319 did not re-verify or advance either date.";

type RichBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; style: "bullet" | "numbered"; items: string[] };

type SourceKind = "Official source" | "Independent study" | "Company-reported" | "Vendor claim";

export interface ParsedPublicSectorDocument {
  market: PublicSectorMarket;
  marketLabel: string;
  headline: string;
  heroBody: string;
  opportunityParagraphs: string[];
  pressures: Array<{ title: string; body: string }>;
  capabilitiesIntroduction: string;
  capabilities: Array<{ title: string; body: string }>;
  applications: Array<{
    use: string;
    description: string;
    evidence: string;
    boundary: string;
  }>;
  applicationsDisclaimer: string;
  reversal: { title: string; body: string };
  myth: { claim: string; verdict: string };
  marketHeading: string;
  marketContext: RichBlock[];
  sourcesIntroduction: string;
  sources: Array<{
    label: string;
    publisher: string;
    kind: SourceKind;
    supports: string;
    limitation: string;
  }>;
  nextAction: RichBlock[];
  service: { label: string; href: string; firstMove: string };
}

export interface PublicSectorEvidenceSource {
  id?: string;
  label: string;
  publisher: string;
  kind: SourceKind;
  url: string;
  supports?: string;
  limitation?: string;
  jurisdiction?: string;
  market?: PublicSectorMarket;
  accessedAt?: string;
  verification?: "verified" | "partial" | "unverified" | "blocked";
  checkedDate?: string | null;
  lineSpan?: { file: string; start: number; end: number };
  scope?: "attachment" | "shared-application";
}

export interface PublicSectorEvidenceApplication {
  market: PublicSectorMarket;
  use: string;
  sourceUrls: string[];
  evidence?: string;
  institution?: string;
  jurisdiction?: string;
  attribution?: string;
  lineSpan?: { file: string; start: number; end: number };
}

export interface PublicSectorEvidenceMapping {
  version: number;
  sources: PublicSectorEvidenceSource[];
  applications: PublicSectorEvidenceApplication[];
  unresolved: string[];
  reviewDocumentDigest?: string;
}

export interface PublicSectorContentResult {
  payload: Record<string, unknown>;
  candidateDigest: string;
  draftBlockers: string[];
  fatalBlockers: string[];
  evidenceReport: {
    version: 1;
    status: "ready" | "review-required" | "blocked";
    sourceCount: number;
    applicationCount: number;
    draftBlockers: string[];
    fatalBlockers: string[];
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeKey(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function combineEvidenceNotes(...values: Array<string | undefined>) {
  const notes = [...new Set(values
    .map((value) => value?.trim())
    .filter((value): value is string => typeof value === "string" && !/^[-–—]+$/.test(value)))];
  return notes.length ? notes.join("\n\n") : undefined;
}

function marketScopedReviewBlockers(market: PublicSectorMarket, blockers: string[]) {
  const regionalPrefixes: Record<PublicSectorMarket, string> = {
    uae: "UAE:",
    ksa: "Saudi Arabia:",
    turkiye: "Türkiye:",
    europe: "EU:",
  };
  const prefixes = new Set(Object.values(regionalPrefixes));
  return blockers.filter((blocker) => {
    const regionalPrefix = [...prefixes].find((prefix) => blocker.startsWith(prefix));
    return !regionalPrefix || regionalPrefix === regionalPrefixes[market];
  });
}

function cleanInline(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function editorialParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => cleanInline(paragraph.replace(/\n/g, " ")))
    .filter(Boolean);
}

function section(markdown: string, number: number) {
  const startPattern = new RegExp(`^## ${number}\\. [^\\n]*\\n`, "m");
  const start = startPattern.exec(markdown);
  if (!start || start.index === undefined) throw new Error(`Public Sector source is missing section ${number}.`);
  const bodyStart = start.index + start[0].length;
  const remainder = markdown.slice(bodyStart);
  const next = /^## \d+\. /m.exec(remainder);
  return remainder.slice(0, next?.index ?? remainder.length).trim();
}

function parsePressures(value: string) {
  const pressures: Array<{ title: string; body: string }> = [];
  const pattern = /\*\*(\d+\.\s*[^*]+)\*\*\s*\n\n([\s\S]*?)(?=\n\n\*\*\d+\.\s*[^*]+\*\*|$)/g;
  for (const match of value.matchAll(pattern)) {
    const title = cleanInline(match[1]).replace(/^\d+\.\s*/, "");
    const body = editorialParagraphs(match[2]).join("\n\n");
    if (title && body) pressures.push({ title, body });
  }
  if (pressures.length !== 4) throw new Error(`Expected four Public Sector operating pressures, found ${pressures.length}.`);
  return pressures;
}

function parseCapabilities(value: string) {
  const paragraphs = value.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const introduction = cleanInline(paragraphs.shift()?.replace(/\n/g, " ") ?? "");
  const rest = paragraphs.join("\n\n");
  const capabilities: Array<{ title: string; body: string }> = [];
  const pattern = /\*\*([^*]+)\*\*\s*\n\n([\s\S]*?)(?=\n\n\*\*[^*]+\*\*|$)/g;
  for (const match of rest.matchAll(pattern)) {
    const title = cleanInline(match[1]);
    const body = editorialParagraphs(match[2]).join("\n\n");
    if (title && body) capabilities.push({ title, body });
  }
  if (!introduction || capabilities.length !== 3) {
    throw new Error(`Expected the Public Sector capability introduction and three capabilities; found ${capabilities.length}.`);
  }
  return { introduction, capabilities };
}

function parseApplications(value: string) {
  const rows = value.split("\n").filter((line) => line.trim().startsWith("|"));
  const applications: Array<{
    use: string;
    description: string;
    evidence: string;
    boundary: string;
  }> = [];
  for (const row of rows.slice(2)) {
    const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 3 || !cells[0]) continue;
    const title = cells[0].match(/^\*\*([^*]+)\*\*/)?.[1];
    const description = title
      ? cleanInline(cells[0].replace(/^\*\*[^*]+\*\*\s*<br>\s*/, ""))
      : cleanInline(cells[0]);
    if (!title || !description) continue;
    applications.push({
      use: cleanInline(title),
      description,
      evidence: cleanInline(cells[1]),
      boundary: cleanInline(cells[2]),
    });
  }
  if (applications.length !== 3) throw new Error(`Expected three Public Sector applications, found ${applications.length}.`);
  return applications;
}

function parseSourceRows(value: string) {
  const rows = value.split("\n").filter((line) => line.trim().startsWith("|"));
  const sources: ParsedPublicSectorDocument["sources"] = [];
  for (const row of rows.slice(2)) {
    const cells = row.split("|").slice(1, -1).map((cell) => cleanInline(cell));
    if (cells.length !== 5 || !cells[0]) continue;
    if (!["Official source", "Independent study", "Company-reported", "Vendor claim"].includes(cells[2])) {
      throw new Error(`Unsupported source category in Public Sector source trail: ${cells[2]}.`);
    }
    sources.push({
      label: cells[0],
      publisher: cells[1],
      kind: cells[2] as SourceKind,
      supports: cells[3],
      limitation: cells[4],
    });
  }
  if (sources.length < 1) throw new Error("Public Sector source trail is empty.");
  return sources;
}

function richBlocks(value: string, headingNames: ReadonlySet<string>, initialHeadingAsParagraph = false) {
  const blocks: RichBlock[] = [];
  const lines = value.split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    const text = cleanInline(paragraph.join(" "));
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", style: "bullet", items: list.map(cleanInline) });
    list = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const boldHeading = line.match(/^\*\*([^*]+)\*\*$/);
    if (boldHeading && headingNames.has(cleanInline(boldHeading[1]))) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 3, text: cleanInline(boldHeading[1]) });
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 3, text: cleanInline(line.slice(4)) });
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  if (!initialHeadingAsParagraph && blocks[0]?.type === "paragraph") {
    // The editorial lead is intentionally a paragraph, not a synthetic heading.
    return blocks;
  }
  return blocks;
}

function parsePerspective(value: string) {
  const mythIndex = value.indexOf("### Myth / verdict");
  if (mythIndex < 0) throw new Error("Public Sector perspective is missing the myth/verdict subsection.");
  const reversalText = value.slice(0, mythIndex).replace(/^### Documented reversal\s*/m, "").trim();
  const mythText = value.slice(mythIndex).replace(/^### Myth \/ verdict\s*/m, "").trim();
  const reversalParagraphs = reversalText.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const reversalTitle = cleanInline(reversalParagraphs.shift() ?? "");
  const mythParagraphs = mythText.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const claim = cleanInline(mythParagraphs.shift() ?? "").replace(/^Myth\s+—\s*/i, "");
  const verdictFirst = cleanInline(mythParagraphs.shift() ?? "").replace(/^Verdict\s+—\s*/i, "");
  const verdict = [verdictFirst, ...mythParagraphs.map((part) => cleanInline(part.replace(/\n/g, " ")))]
    .filter(Boolean)
    .join("\n\n");
  if (!reversalTitle || !reversalParagraphs.length || !claim || !verdict) {
    throw new Error("Public Sector perspective is missing reversal or myth/verdict substance.");
  }
  return {
    reversal: { title: reversalTitle, body: reversalParagraphs.map((part) => cleanInline(part.replace(/\n/g, " "))).join("\n\n") },
    myth: { claim, verdict },
  };
}

function parseNextAction(value: string) {
  const heading = value.match(/^### ([^\n]+)/m)?.[1];
  const withoutHeading = value.replace(/^### [^\n]*\n?/m, "");
  const serviceIndex = withoutHeading.indexOf("**Service:**");
  const serviceMatch = withoutHeading.match(/\*\*Service:\*\*\s*([^→]+)→[\s\S]*?\*\*\[Book a value scan\]\*\*/);
  const body = serviceIndex >= 0 ? withoutHeading.slice(0, serviceIndex) : withoutHeading;
  const blocks = richBlocks(
    body.trim(),
    new Set(["What it produces.", "Candidate journeys in the UAE", "Candidate journeys in Saudi Arabia", "Candidate journeys in Türkiye", "Candidate journeys in the European Union", "What good looks like, measured"]),
  );
  if (serviceMatch) {
    blocks.push({ type: "paragraph", text: `Service: ${cleanInline(serviceMatch[1])} → Book a value scan` });
  }
  return heading
    ? [{ type: "heading", level: 2, text: cleanInline(heading) } satisfies RichBlock, ...blocks]
    : blocks;
}

export function parsePublicSectorDocument(markdown: string, market: PublicSectorMarket): ParsedPublicSectorDocument {
  const hero = section(markdown, 1);
  const opportunity = section(markdown, 2);
  const pressures = section(markdown, 3);
  const capabilities = section(markdown, 4);
  const applications = section(markdown, 5);
  const perspective = section(markdown, 6);
  const marketContext = section(markdown, 7);
  const sources = section(markdown, 8);
  const nextAction = section(markdown, 9);

  const heroHeading = hero.match(/^### ([^\n]+)/m)?.[1];
  const heroBody = editorialParagraphs(hero.split(/\n>\s*|\n\*/)[0].replace(/^### [^\n]*\n?/, ""))[0];
  const opportunityParagraphs = editorialParagraphs(opportunity);
  const pressureRows = parsePressures(pressures);
  const capabilityRows = parseCapabilities(capabilities);
  const applicationRows = parseApplications(applications);
  const perspectiveRows = parsePerspective(perspective);
  const marketParagraphs = editorialParagraphs(marketContext);
  const marketHeading = marketParagraphs[0] ?? "";
  const marketBlocks = richBlocks(
    marketContext.replace(/^### [^\n]*\n?/, ""),
    new Set(["Stated ambition", "Demonstrated delivery", "Governance and data boundaries", "Language and accessibility"]),
  );
  const sourceParagraphs = editorialParagraphs(sources);
  const sourceRows = parseSourceRows(sources);
  const disclaimer = editorialParagraphs(applications).find((paragraph) =>
    paragraph.startsWith("These are representative industry patterns"),
  );
  if (!heroHeading || !heroBody || opportunityParagraphs.length < 4 || !disclaimer || !marketHeading) {
    throw new Error(`Public Sector ${market} source has incomplete editorial substance.`);
  }
  const nextBlocks = parseNextAction(nextAction);
  if (nextBlocks.length < 5) throw new Error(`Public Sector ${market} next action is incomplete.`);
  const serviceLine = nextAction.match(/\*\*Service:\*\*\s*([^→]+)→/)?.[1]?.trim() ?? "Sovereign & Regulated AI";
  return {
    market,
    marketLabel: MARKET_LABELS[market],
    headline: cleanInline(heroHeading),
    heroBody,
    opportunityParagraphs,
    pressures: pressureRows,
    capabilitiesIntroduction: capabilityRows.introduction,
    capabilities: capabilityRows.capabilities,
    applications: applicationRows,
    applicationsDisclaimer: disclaimer,
    reversal: perspectiveRows.reversal,
    myth: perspectiveRows.myth,
    marketHeading,
    marketContext: marketBlocks,
    sourcesIntroduction: sourceParagraphs[0] ?? "",
    sources: sourceRows,
    nextAction: nextBlocks,
    service: {
      label: serviceLine,
      href: "/what-we-do/sovereign-regulated-ai",
      firstMove: "Map one high-friction public journey from policy intent to resolved case.",
    },
  };
}

function sourceRowsFromUnknown(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter(isObject);
  if (!isObject(value)) return [];
  return Object.entries(value).flatMap(([key, item]) => isObject(item) ? [{ key, ...item }] : []);
}

function appRowsFromUnknown(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter(isObject);
  if (!isObject(value)) return [];
  return Object.entries(value).flatMap(([key, item]) => isObject(item) ? [{ use: key, ...item }] : []);
}

function sourceKind(value: unknown): SourceKind | undefined {
  if (value === "Official source" || value === "Independent study" || value === "Company-reported" || value === "Vendor claim") return value;
  return undefined;
}

function asMarket(value: unknown): PublicSectorMarket | undefined {
  return PUBLIC_SECTOR_MARKETS.includes(value as PublicSectorMarket) ? value as PublicSectorMarket : undefined;
}

export function normalizePublicSectorEvidence(raw: unknown): PublicSectorEvidenceMapping {
  if (!isObject(raw) || (raw.version !== 1 && raw.schemaVersion !== "1.0")) {
    throw new Error("Public Sector evidence mapping must declare version 1 or schemaVersion 1.0.");
  }
  const sources: PublicSectorEvidenceSource[] = [];
  const marketSections = isObject(raw.markets)
    ? Object.entries(raw.markets).flatMap(([market, section]) =>
      isObject(section) ? [{ market, section }] : [])
    : [];
  const mappedSourceRows = [
    ...sourceRowsFromUnknown(raw.sources ?? raw.sourceMap ?? raw.sourceMappings),
    ...marketSections.flatMap(({ market, section }) =>
      sourceRowsFromUnknown(section.sources ?? section.sourceMap).map((row): Record<string, unknown> => ({ ...row, market }))),
  ];
  for (const row of mappedSourceRows) {
    const url = typeof row.url === "string"
      ? row.url
      : Array.isArray(row.urls) && typeof row.urls[0] === "string" ? row.urls[0] : undefined;
    const kind = sourceKind(row.kind ?? row.category ?? row.evidenceCategory);
    const label = typeof row.pageLabel === "string"
      ? row.pageLabel
      : typeof row.sourceLabel === "string"
        ? row.sourceLabel
        : typeof row.label === "string"
          ? row.label
          : typeof row.name === "string" ? row.name : typeof row.key === "string" ? row.key : undefined;
    const publisher = typeof row.publisher === "string"
      ? row.publisher
      : typeof row.attribution === "string"
        ? row.attribution
        : isObject(row.attribution) && typeof row.attribution.publisher === "string"
          ? row.attribution.publisher
          : undefined;
    const rowMarkets = [
      ...(asMarket(row.market) ? [asMarket(row.market)!] : []),
      ...(Array.isArray(row.markets) ? row.markets.map(asMarket).filter((market): market is PublicSectorMarket => Boolean(market)) : []),
    ];
    if (!label || !publisher || !kind) continue;
    const id = typeof row.id === "string" ? row.id : typeof row.key === "string" ? row.key : undefined;
    for (const market of rowMarkets.length ? rowMarkets : [undefined]) {
      sources.push({
        id,
        label,
        publisher,
        kind,
        url: url ?? "",
        supports: typeof row.supports === "string"
          ? row.supports
          : Array.isArray(row.supports) ? row.supports.filter((item): item is string => typeof item === "string").join(" ")
            : typeof row.support === "string" ? row.support : undefined,
        limitation: typeof row.limitation === "string"
          ? row.limitation
          : Array.isArray(row.limitations) ? row.limitations.filter((item): item is string => typeof item === "string").join(" ")
            : undefined,
        jurisdiction: typeof row.jurisdiction === "string" ? row.jurisdiction : isObject(row.attribution) && typeof row.attribution.jurisdiction === "string" ? row.attribution.jurisdiction : undefined,
        market,
        accessedAt: typeof row.accessedAt === "string" ? row.accessedAt : undefined,
        verification: row.verification === "verified" || row.verification === "partial" || row.verification === "unverified" || row.verification === "blocked"
          ? row.verification
          : undefined,
        checkedDate: typeof row.checkedDate === "string" ? row.checkedDate : row.checkedDate === null ? null : undefined,
        lineSpan: isObject(row.lineSpan)
          && typeof row.lineSpan.file === "string"
          && typeof row.lineSpan.start === "number"
          && typeof row.lineSpan.end === "number"
          ? { file: row.lineSpan.file, start: row.lineSpan.start, end: row.lineSpan.end }
          : undefined,
        scope: row.scope === "attachment" || row.scope === "shared-application" ? row.scope : undefined,
      });
    }
  }
  const applications: PublicSectorEvidenceApplication[] = [];
  const mappedApplicationRows = [
    ...appRowsFromUnknown(raw.applications ?? raw.applicationMap ?? raw.applicationMappings),
    ...marketSections.flatMap(({ market, section }) =>
      appRowsFromUnknown(section.applications ?? section.applicationMap).map((row): Record<string, unknown> => ({ ...row, market }))),
  ];
  for (const row of mappedApplicationRows) {
    const market = asMarket(row.market);
    const use = typeof row.pageUse === "string"
      ? row.pageUse
      : typeof row.use === "string" ? row.use : typeof row.title === "string" ? row.title : typeof row.key === "string" ? row.key : undefined;
    const sourceUrls = Array.isArray(row.sourceUrls) ? row.sourceUrls.filter((item): item is string => typeof item === "string") : [];
    if (!market || !use) continue;
    const attribution = typeof row.attribution === "string"
      ? row.attribution
      : isObject(row.attribution) && typeof row.attribution.institution === "string" && typeof row.attribution.jurisdiction === "string"
        ? `${row.attribution.institution} (${row.attribution.jurisdiction})`
      : typeof row.institution === "string" && typeof row.jurisdiction === "string"
        ? `${row.institution} (${row.jurisdiction})`
        : undefined;
    applications.push({
      market,
      use,
      sourceUrls,
      evidence: typeof row.evidence === "string" ? row.evidence : undefined,
      institution: typeof row.institution === "string" ? row.institution : undefined,
      jurisdiction: typeof row.jurisdiction === "string" ? row.jurisdiction : undefined,
      attribution,
      lineSpan: isObject(row.lineSpan)
        && typeof row.lineSpan.file === "string"
        && typeof row.lineSpan.start === "number"
        && typeof row.lineSpan.end === "number"
        ? { file: row.lineSpan.file, start: row.lineSpan.start, end: row.lineSpan.end }
        : undefined,
    });
  }
  const unresolved = [
    ...(Array.isArray(raw.unresolved) ? raw.unresolved : []),
    ...(Array.isArray(raw.blockers) ? raw.blockers : []),
    ...(Array.isArray(raw.unresolvedBlockers) ? raw.unresolvedBlockers : []),
  ].map((item) => typeof item === "string"
    ? item
    : isObject(item)
      ? `${typeof item.id === "string" ? item.id : "evidence"}: ${typeof item.problem === "string" ? item.problem : JSON.stringify(item)}`
      : String(item));
  return {
    version: 1,
    sources,
    applications,
    unresolved: [...new Set(unresolved)],
  };
}

export function buildPublicSectorContent(
  document: ParsedPublicSectorDocument,
  evidence: PublicSectorEvidenceMapping,
  baseSnapshot?: Record<string, unknown>,
): PublicSectorContentResult {
  const fatalBlockers: string[] = [];
  const draftBlockers = [...new Set([
    ...marketScopedReviewBlockers(document.market, evidence.unresolved),
    SHARED_LEGAL_REVIEW_BLOCKER,
  ])];
  if (!baseSnapshot || !isObject(baseSnapshot.content)) {
    fatalBlockers.push("No approved predecessor payload was supplied; verification and review dates, hero media and editorial fields cannot be invented.");
  }
  const sourceByMarketLabel = new Map(evidence.sources.map((source) => [
    `${source.market ?? "*"}:${normalizeKey(source.label)}`,
    source,
  ]));
  const appByKey = new Map(evidence.applications.map((app) => [`${app.market}:${normalizeKey(app.use)}`, app]));
  const sourceTrail: Array<Record<string, unknown>> = [];
  const sourceUrls = new Set<string>();
  for (const source of document.sources) {
    const mapped = sourceByMarketLabel.get(`${document.market}:${normalizeKey(source.label)}`)
      ?? sourceByMarketLabel.get(`*:${normalizeKey(source.label)}`);
    if (!mapped) {
      draftBlockers.push(`${document.market}: no market-scoped evidence mapping for source "${source.label}"; source retained only in the editorial review blocker ledger.`);
      continue;
    }
    if (!mapped.url || !/^https?:\/\//i.test(mapped.url)) {
      draftBlockers.push(`${document.market}: evidence source "${source.label}" has no HTTP(S) URL; it is not promoted into the publishable source trail.`);
      continue;
    }
    const mappedUrl = mapped.url;
    if (mapped.market && mapped.market !== document.market) {
      fatalBlockers.push(`${document.market}: source "${source.label}" is attributed to ${mapped.market}, not ${document.market}.`);
    }
    if (!mapped.supports && !source.supports) {
      draftBlockers.push(`${document.market}: source "${source.label}" is missing a supports note.`);
    }
    if (!mapped.limitation && !source.limitation) {
      draftBlockers.push(`${document.market}: source "${source.label}" is missing a limitation note.`);
    }
    sourceUrls.add(mappedUrl);
    sourceTrail.push({
      label: source.label,
      publisher: mapped.jurisdiction ? `${mapped.publisher} (${mapped.jurisdiction})` : mapped.publisher,
      kind: mapped.kind,
      url: mappedUrl,
      supports: combineEvidenceNotes(source.supports, mapped.supports),
      limitation: combineEvidenceNotes(source.limitation, mapped.limitation),
      ...(mapped.accessedAt ? { accessedAt: mapped.accessedAt } : {}),
      market: document.market,
    });
  }
  // Shared application examples are named in all four attachments. Promote
  // their actually mapped source rows into the payload source trail so each
  // application URL remains resolvable without inventing a market URL.
  for (const application of evidence.applications.filter((item) => item.market === document.market)) {
    for (const url of application.sourceUrls) {
      if (!sourceUrls.has(url)) {
        const shared = evidence.sources.find((source) => source.url === url && source.url);
        if (!shared) continue;
        sourceUrls.add(url);
        sourceTrail.push({
          label: shared.label,
          publisher: shared.jurisdiction ? `${shared.publisher} (${shared.jurisdiction})` : shared.publisher,
          kind: shared.kind,
          url,
          supports: shared.supports,
          limitation: shared.limitation,
          ...(shared.accessedAt ? { accessedAt: shared.accessedAt } : {}),
          market: document.market,
        });
      }
    }
  }
  const uses: Array<Record<string, unknown>> = [];
  for (const application of document.applications) {
    const mapped = appByKey.get(`${document.market}:${normalizeKey(application.use)}`);
    if (!mapped) {
      fatalBlockers.push(`${document.market}: application "${application.use}" has no explicit market-and-label evidence mapping; no unrelated source URL or attribution will be substituted.`);
    }
    const attribution = mapped?.attribution
      ?? (mapped?.institution && mapped?.jurisdiction ? `${mapped.institution} (${mapped.jurisdiction})` : undefined);
    if (!attribution) {
      fatalBlockers.push(`${document.market}: application "${application.use}" is missing explicit institution/jurisdiction attribution.`);
    }
    const urls = mapped?.sourceUrls.filter((url) => sourceUrls.has(url)) ?? [];
    if (mapped && mapped.sourceUrls.length === 0) {
      draftBlockers.push(`${document.market}: application "${application.use}" is explicitly unresolved in the evidence ledger and has no cited URL; no source was substituted.`);
    } else if (!mapped || urls.length !== mapped.sourceUrls.length || !urls.length) {
      fatalBlockers.push(`${document.market}: application "${application.use}" has an unlinked source URL set; no unrelated URL will be substituted.`);
    }
    const evidenceText = [
      application.evidence,
      attribution ? `Named example attribution: ${attribution}.` : "",
      application.use === "Service operations" && attribution?.includes("Estonia")
        ? "The cited Estonia source covers proactive family-benefit outcomes only; it does not establish the other operational claims in this application."
        : "",
    ].filter(Boolean).join("\n\n");
    if (evidenceText.length > 3000) {
      fatalBlockers.push(`${document.market}: evidence for "${application.use}" exceeds the 3000 character limit.`);
    }
    uses.push({
      use: application.use,
      description: application.description,
      evidence: evidenceText,
      sourceUrls: urls,
      boundary: application.boundary,
    });
  }
  const reviewBlockers = [...new Set(draftBlockers)];
  if (reviewBlockers.length > 30) {
    fatalBlockers.push(`${document.market}: reviewBlockers has ${reviewBlockers.length} entries; the contract permits at most 30.`);
  }
  if (reviewBlockers.some((blocker) => blocker.length > 1_000)) {
    fatalBlockers.push(`${document.market}: a reviewBlockers entry exceeds the 1000 character contract limit.`);
  }
  const original = baseSnapshot && isObject(baseSnapshot) ? structuredClone(baseSnapshot) : {};
  const originalContent = isObject(original.content) ? original.content : {};
  const content: Record<string, unknown> = {
    ...originalContent,
    schemaVersion: 1,
    legacyPath: "/industries/public-sector",
    name: "Public Sector",
    shortName: "Public Sector",
    thesis: document.headline,
    accent: "point of service.",
    dek: document.heroBody,
    opportunity: document.opportunityParagraphs[0],
    capabilities: document.capabilities,
    pressures: document.pressures,
    reversal: document.reversal,
    myth: document.myth,
    gcc: document.marketHeading,
    service: document.service,
    uses,
    sources: sourceTrail,
    image: typeof originalContent.image === "string" ? originalContent.image : "",
    imageAlt: typeof originalContent.imageAlt === "string"
      ? originalContent.imageAlt
      : "",
    variant: "ledger",
    selectedWork: isObject(originalContent.selectedWork)
      ? originalContent.selectedWork
      : { description: "" },
    verificationDate: typeof originalContent.verificationDate === "string" ? originalContent.verificationDate : "",
    reviewDate: typeof originalContent.reviewDate === "string" ? originalContent.reviewDate : "",
    visibility: "public",
    order: typeof originalContent.order === "number" ? originalContent.order : 5,
    relatedIds: Array.isArray(originalContent.relatedIds) ? originalContent.relatedIds : [],
    publicSectorPov: {
      version: 1,
      market: document.market,
      marketLabel: document.marketLabel,
      opportunity: document.opportunityParagraphs.map((text): RichBlock => ({ type: "paragraph", text })),
      pressuresHeading: "Operating Pressures",
      capabilitiesIntroduction: document.capabilitiesIntroduction,
      applicationsDisclaimer: document.applicationsDisclaimer,
      marketHeading: document.marketHeading,
      marketContext: document.marketContext,
      sourcesIntroduction: document.sourcesIntroduction,
      nextAction: document.nextAction,
      reviewBlockers,
    },
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(content.verificationDate))) {
    fatalBlockers.push(`${document.market}: approved predecessor has no valid verificationDate; Task 319 will not invent one.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(content.reviewDate))) {
    fatalBlockers.push(`${document.market}: approved predecessor has no valid reviewDate; Task 319 will not invent one.`);
  }
  const payload: Record<string, unknown> = {
    ...original,
    slug: "public-sector",
    title: "Public Sector",
    summary: document.heroBody,
    seo: isObject(original.seo) ? original.seo : { noIndex: false },
    content,
    mediaIds: Array.isArray(original.mediaIds) ? original.mediaIds : [],
    markets: [document.market],
  };
  return {
    payload,
    candidateDigest: canonicalResultDigest(payload),
    draftBlockers,
    fatalBlockers,
    evidenceReport: {
      version: 1,
      status: fatalBlockers.length ? "blocked" : draftBlockers.length ? "review-required" : "ready",
      sourceCount: sourceTrail.length,
      applicationCount: uses.length,
      draftBlockers: [...draftBlockers],
      fatalBlockers: [...fatalBlockers],
    },
  };
}

export async function parsePublicSectorDocuments() {
  const parsed = new Map<PublicSectorMarket, ParsedPublicSectorDocument>();
  for (const market of PUBLIC_SECTOR_MARKETS) {
    const markdown = await readFile(path.join(repositoryRoot, DOCUMENTS[market]), "utf8");
    parsed.set(market, parsePublicSectorDocument(markdown, market));
  }
  return parsed;
}

export async function readPublicSectorEvidence(file = path.join(repositoryRoot, EVIDENCE_FILE)) {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(file, "utf8"));
  } catch {
    throw new Error(`Public Sector evidence mapping is required at ${path.relative(repositoryRoot, file)}; no source URL or attribution will be invented.`);
  }
  const reviewFile = path.join(repositoryRoot, EVIDENCE_REVIEW_FILE);
  let review: string;
  try {
    review = await readFile(reviewFile, "utf8");
  } catch {
    throw new Error(`Public Sector evidence review is required at ${EVIDENCE_REVIEW_FILE}; unresolved claims cannot be silently promoted.`);
  }
  if (!review.trim()) throw new Error(`Public Sector evidence review is empty at ${EVIDENCE_REVIEW_FILE}.`);
  return {
    ...normalizePublicSectorEvidence(raw),
    reviewDocumentDigest: digest(review),
  };
}

export type PublicSectorEditionAction = "stage" | "stage-successor" | "replay" | "preserve-conflict";

export function publicSectorEditionAction(input: {
  receipt?: { operation: string; requestDigest: string; resultDigest: string | null; revisionId: string };
  operation: string;
  requestDigest: string;
  resultDigest: string;
  latestRevisionId: string | null;
  publishedRevisionId: string | null;
  latestWorkflowState: string | null;
  candidateDigest: string;
  latestDigest?: string | null;
  previousAutomatedDraft?: boolean;
}): PublicSectorEditionAction {
  if (input.receipt) {
    if (input.receipt.operation === OPERATION
      && input.receipt.requestDigest === input.requestDigest
      && input.receipt.resultDigest === input.resultDigest
      && input.receipt.revisionId === input.latestRevisionId
      && input.latestDigest === input.candidateDigest
    ) return "replay";
    return input.previousAutomatedDraft
      && input.latestRevisionId === input.receipt.revisionId
      && input.latestWorkflowState === "draft"
      ? "stage-successor"
      : "preserve-conflict";
  }
  if (
    input.latestRevisionId
    && (input.latestRevisionId !== input.publishedRevisionId || input.latestWorkflowState !== "approved")
  ) return "preserve-conflict";
  return "stage";
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function receiptResultDigest(documentId: string, editionId: string, revisionId: string, candidateDigest: string) {
  return digest({ documentId, editionId, revisionId, candidateDigest, publication: "draft" });
}

interface QueryResult {
  rows: Array<Record<string, any>>;
  rowCount?: number | null;
}

interface SqlClient {
  query(sql: string, values?: unknown[]): Promise<QueryResult>;
}

async function getServiceUser(client: SqlClient) {
  const result = await client.query(
    `INSERT INTO cms_users(email,display_name,role,status)
     VALUES($1,$2,'viewer','suspended')
     ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name
     RETURNING id::text`,
    [SERVICE_EMAIL, SERVICE_NAME],
  );
  if (!result.rows[0]?.id) throw new Error("Could not provision Public Sector reconciliation attribution.");
  return String(result.rows[0].id);
}

async function referencesFor(client: SqlClient, documentId: string, revisionId: string) {
  const result = await client.query(
    `SELECT asset_id::text,media_version_id::text
       FROM cms_media_references
      WHERE document_id=$1 AND field_path=$2
      ORDER BY asset_id`,
    [documentId, `revision:${revisionId}`],
  );
  return result.rows.map((row) => ({
    assetId: String(row.asset_id),
    mediaVersionId: row.media_version_id ? String(row.media_version_id) : null,
  }));
}

async function reconcileMarket(
  pool: { connect: () => Promise<SqlClient> },
  market: PublicSectorMarket,
  document: ParsedPublicSectorDocument,
  evidence: PublicSectorEvidenceMapping,
) {
  const client = await pool.connect();
  let open = false;
  try {
    await client.query("BEGIN");
    open = true;
    const lockKey = `${RECEIPT_PREFIX}:${market}:en`;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lockKey]);
    const documentResult = await client.query(
      `SELECT id::text,canonical_slug,title
         FROM cms_documents
        WHERE kind='industry' AND canonical_slug='public-sector'
        FOR UPDATE`,
    );
    if (documentResult.rows.length !== 1) throw new Error("Public Sector requires exactly one existing industry document after generic CMS reconciliation.");
    const documentId = String(documentResult.rows[0].id);
    let editionResult = await client.query(
      `SELECT e.id::text edition_id,e.market,e.locale,e.localized_slug,e.content_mode,e.fallback_mode,
              e.publication_state,e.published_revision_id::text,
              published.id::text published_id,published.revision_number published_revision_number,
              published.payload_version published_payload_version,published.workflow_state published_workflow_state,
              published.payload published_payload,published.content_digest published_digest,
              latest.id::text latest_id,latest.revision_number latest_revision_number,latest.workflow_state latest_workflow_state,
              latest.content_digest latest_digest,latest.payload latest_payload
         FROM cms_market_editions e
         LEFT JOIN cms_revisions published ON published.id=e.published_revision_id
         LEFT JOIN LATERAL (
           SELECT r.id,r.revision_number,r.workflow_state,r.content_digest,r.payload
             FROM cms_revisions r
            WHERE r.edition_id=e.id
            ORDER BY r.revision_number DESC,r.created_at DESC,r.id DESC
            LIMIT 1
         ) latest ON true
        WHERE e.document_id=$1 AND e.market=$2 AND e.locale='en'
        FOR UPDATE OF e`,
      [documentId, market],
    );
    if (editionResult.rows.length > 1) throw new Error(`${market}/en has duplicate Public Sector editions.`);
    if (!editionResult.rows.length) {
      await client.query(
        `INSERT INTO cms_market_editions
          (document_id,market,locale,localized_slug,publication_state,fallback_mode,
           parity_complete,content_mode,editorial_market)
         VALUES($1,$2,'en','public-sector','draft','none',false,'custom',$2)
         ON CONFLICT(document_id,market,locale) DO NOTHING`,
        [documentId, market],
      );
      editionResult = await client.query(
        `SELECT e.id::text edition_id,e.market,e.locale,e.localized_slug,e.content_mode,e.fallback_mode,
                e.publication_state,e.published_revision_id::text,
                NULL::text published_id,NULL::int published_revision_number,
                NULL::int published_payload_version,NULL::text published_workflow_state,
                NULL::jsonb published_payload,NULL::text published_digest,
                NULL::text latest_id,NULL::int latest_revision_number,NULL::text latest_workflow_state,
                NULL::text latest_digest,NULL::jsonb latest_payload
           FROM cms_market_editions e
          WHERE e.document_id=$1 AND e.market=$2 AND e.locale='en'
          FOR UPDATE`,
        [documentId, market],
      );
    }
    const edition = editionResult.rows[0];
    const publicationVerification = {
      publicationState: String(edition.publication_state),
      publishedRevisionId: edition.published_id ? String(edition.published_id) : null,
      publishedDigest: edition.published_digest ? String(edition.published_digest) : null,
      pointerMutated: false,
    };
    const canonicalSharedUae = market === "uae" && edition.content_mode === "shared";
    if ((!canonicalSharedUae && edition.content_mode !== "custom") || edition.fallback_mode !== "none") {
      throw new Error(`${market}/en is not an eligible custom edition (or the existing canonical UAE shared edition); no fallback or shared mode was changed.`);
    }
    const sourceResult = await client.query(
      `SELECT e.id::text edition_id,e.published_revision_id::text,
              r.id::text revision_id,r.payload_version,r.payload,r.content_digest
         FROM cms_market_editions e
         JOIN cms_revisions r ON r.id=e.published_revision_id
        WHERE e.document_id=$1 AND e.market='uae' AND e.locale='en'
          AND e.publication_state='published' AND r.workflow_state='approved'
        FOR SHARE OF e,r`,
      [documentId],
    );
    if (sourceResult.rows.length !== 1) throw new Error("Public Sector UAE approved publication is required as the immutable hero/content predecessor.");
    const source = sourceResult.rows[0];
    if (canonicalSharedUae && !publicationVerification.publishedRevisionId) {
      // The canonical UAE edition can intentionally have no local pointer
      // while its shared public response is served from the approved
      // predecessor. Record the effective public pointer in the receipt/audit
      // payload so read-only verification compares like with like.
      publicationVerification.publishedRevisionId = String(source.revision_id);
      publicationVerification.publishedDigest = source.content_digest ? String(source.content_digest) : null;
    }
    const published = edition.published_payload && isObject(edition.published_payload)
      ? edition.published_payload
      : source.payload;
    const sourceRevisionId = edition.published_id ? String(edition.published_id) : String(source.revision_id);
    const references = await referencesFor(client, documentId, sourceRevisionId);
    const candidate = buildPublicSectorContent(document, evidence, published);
    if (candidate.fatalBlockers.length) throw new Error(candidate.fatalBlockers.join("; "));
    const content = isObject(candidate.payload.content) ? candidate.payload.content : {};
    const heroId = isObject(content.heroMedia) && typeof content.heroMedia.mediaId === "string"
      ? content.heroMedia.mediaId
      : typeof content.heroMediaId === "string"
        ? content.heroMediaId
        : Array.isArray(candidate.payload.mediaIds) && typeof candidate.payload.mediaIds[0] === "string"
          ? candidate.payload.mediaIds[0]
          : null;
    const heroReference = heroId
      ? references.find((reference) => reference.assetId === heroId && reference.mediaVersionId)
      : undefined;
    if (!heroReference) {
      throw new Error(`${market}/en has no byte-pinned approved hero reference to preserve; no draft was staged.`);
    }
    const verifiedHero = await client.query(
      `SELECT a.id
         FROM cms_media_assets a
         JOIN cms_media_versions v ON v.id=$2 AND v.asset_id=a.id
        WHERE a.id=$1
          AND a.status IN ('pending-review','active')
          AND v.storage_key NOT LIKE 'deferred/%'`,
      [heroReference.assetId, heroReference.mediaVersionId],
    );
    if (!verifiedHero.rowCount) {
      throw new Error(`${market}/en hero reference is not an approved immutable media version; no draft was staged.`);
    }
    // Validate the generated content against the complete industry contract
    // before staging it. The draft validator intentionally remains permissive
    // about review blockers; publication validation rejects those blockers
    // after an editor has cleared them.
    const contentValidation = industryContentSchema.safeParse(candidate.payload.content);
    if (!contentValidation.success) {
      throw new Error(`${market}/en Public Sector candidate is not schema-complete: ${contentValidation.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
    }
    const validation = validateCmsSnapshot("industry", {
      ...candidate.payload,
      content: contentValidation.data,
    }, "draft");
    if (!validation.success) throw new Error(`${market}/en Public Sector draft is invalid: ${validation.errors.join("; ")}`);
    const nextPayload = validation.data;
    const candidateDigest = canonicalResultDigest(nextPayload);
    const requestDigest = digest({
      operation: OPERATION,
      market,
      locale: "en",
      sourceRevisionId,
      candidateDigest,
      evidenceReviewDigest: evidence.reviewDocumentDigest ?? null,
    });
    const receiptResult = await client.query(
      `SELECT idempotency_key,operation,request_digest,result_digest,subject_id
         FROM cms_operation_receipts
        WHERE idempotency_key=$1 OR idempotency_key LIKE $2
        ORDER BY created_at DESC
        LIMIT 1`,
      [lockKey, `${lockKey}:successor:%`],
    );
    const receipt = receiptResult.rows[0]
      ? {
          idempotencyKey: String(receiptResult.rows[0].idempotency_key),
          operation: String(receiptResult.rows[0].operation),
          requestDigest: String(receiptResult.rows[0].request_digest),
          resultDigest: receiptResult.rows[0].result_digest ? String(receiptResult.rows[0].result_digest) : "",
          revisionId: String(receiptResult.rows[0].subject_id),
        }
      : undefined;
    const previousAuditResult = receipt
      ? await client.query(
        `SELECT metadata
           FROM cms_audit_events
          WHERE request_id=$1
            AND action='cms.public-sector.edition-draft-staged'
          ORDER BY occurred_at DESC
          LIMIT 1`,
        [receipt!.idempotencyKey],
      )
      : { rows: [] };
    const previousAuditMetadata = previousAuditResult.rows[0]?.metadata;
    const previousAutomatedDraft = Boolean(
      receipt
      && receipt.operation === OPERATION
      && receipt.revisionId === (edition.latest_id ? String(edition.latest_id) : null)
      && edition.latest_workflow_state === "draft"
      && isObject(previousAuditMetadata)
      && previousAuditMetadata.revisionId === receipt.revisionId
      && previousAuditMetadata.candidateDigest === edition.latest_digest,
    );
    const expectedResult = receipt
      ? receiptResultDigest(documentId, String(edition.edition_id), receipt.revisionId, candidateDigest)
      : "";
    const action = publicSectorEditionAction({
      receipt,
      operation: OPERATION,
      requestDigest,
      resultDigest: expectedResult,
      latestRevisionId: edition.latest_id ? String(edition.latest_id) : null,
      publishedRevisionId: edition.published_id ? String(edition.published_id) : null,
      latestWorkflowState: edition.latest_workflow_state ? String(edition.latest_workflow_state) : null,
      candidateDigest,
      latestDigest: edition.latest_digest ? String(edition.latest_digest) : null,
      previousAutomatedDraft,
    });
    if (action === "preserve-conflict") {
      throw new Error(`${market}/en has a competing receipt or newer editorial revision; current publication and draft were preserved.`);
    }
    if (action === "replay") {
      await client.query("COMMIT");
      open = false;
      return {
        market,
        disposition: "replayed",
        editionId: edition.edition_id,
        draftRevisionId: receipt!.revisionId,
        securePreviewRequest: `/api/documents/${documentId}/preview?market=${market}&locale=en&revisionId=${receipt!.revisionId}`,
        candidateDigest,
        publicationVerification,
        preservedState: ["published revision pointer", "revision history", "availability decisions", "immutable hero media reference"],
        draftBlockers: candidate.draftBlockers,
        evidenceReport: candidate.evidenceReport,
        dateProvenance: DATE_PROVENANCE,
        approvalBlockers: ["Normal authenticated CMS review and Publish controls remain required.", DATE_PROVENANCE],
      };
    }
    const serviceUserId = await getServiceUser(client);
    const latestRevisionNumber = Number(
      edition.latest_id
        ? edition.latest_revision_number ?? edition.published_revision_number ?? 0
        : edition.published_revision_number ?? 0,
    );
    const inserted = await client.query(
      `INSERT INTO cms_revisions
        (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
         created_by_user_id,source_revision_id,reason)
       VALUES($1,$2,$3,$4,$5,'draft',$6,$7,$8)
       RETURNING id::text`,
      [
        edition.edition_id,
        latestRevisionNumber + 1,
        Number(edition.published_payload_version ?? source.payload_version ?? 1),
        nextPayload,
        candidateDigest,
        serviceUserId,
        sourceRevisionId,
        `Task 319 Public Sector ${market}/en edition; staged for normal editorial review and publication.`,
      ],
    );
    const revisionId = String(inserted.rows[0]?.id ?? "");
    if (!revisionId) throw new Error(`${market}/en draft revision could not be created.`);
    for (const reference of references) {
      await client.query(
        `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(document_id,field_path,asset_id) DO NOTHING`,
        [reference.assetId, reference.mediaVersionId, documentId, `revision:${revisionId}`],
      );
    }
    const result = receiptResultDigest(documentId, String(edition.edition_id), revisionId, candidateDigest);
    if (action === "stage-successor") {
      await client.query(
        `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest)
         VALUES($1,$2,$3,$4,$5)`,
        [`${lockKey}:successor:${requestDigest}`, OPERATION, revisionId, requestDigest, result],
      );
    } else {
      await client.query(
        `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest)
         VALUES($1,$2,$3,$4,$5)`,
        [lockKey, OPERATION, revisionId, requestDigest, result],
      );
    }
    const auditRequestId = action === "stage-successor" ? `${lockKey}:${requestDigest}` : lockKey;
    await client.query(
      `INSERT INTO cms_audit_events
        (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
       VALUES($1,$2,$3,'industry',$4,$5,$6)
       ON CONFLICT(request_id) DO NOTHING`,
      [
        serviceUserId,
        SERVICE_NAME,
        "cms.public-sector.edition-draft-staged",
        documentId,
        auditRequestId,
        {
          task: 319,
          market,
          locale: "en",
          editionId: edition.edition_id,
          revisionId,
          sourceRevisionId,
          candidateDigest,
          draftBlockers: candidate.draftBlockers,
          evidenceReport: candidate.evidenceReport,
          publicationVerification,
          ...(action === "stage-successor" ? {
            successorOfRevisionId: receipt!.revisionId,
            stagingGuard: "exact prior automated draft receipt and digest; newer editorial revisions are preserved",
          } : {}),
          publication: "draft-only; no publication pointer or availability changed",
        },
      ],
    );
    await client.query("COMMIT");
    open = false;
    return {
      market,
      disposition: action === "stage-successor" ? "staged-successor" : "staged-draft",
      editionId: edition.edition_id,
      draftRevisionId: revisionId,
      securePreviewRequest: `/api/documents/${documentId}/preview?market=${market}&locale=en&revisionId=${revisionId}`,
      candidateDigest,
      publicationVerification,
      preservedState: ["published revision pointer", "revision history", "availability decisions", "immutable hero media reference"],
      draftBlockers: candidate.draftBlockers,
       evidenceReport: candidate.evidenceReport,
      dateProvenance: DATE_PROVENANCE,
      approvalBlockers: ["Normal authenticated CMS review and Publish controls remain required.", DATE_PROVENANCE],
    };
  } catch (error) {
    if (open) await client.query("ROLLBACK");
    throw error;
  } finally {
    // `pool.connect()` clients expose release in pg, while the small SQL
    // interface used by unit tests does not need one.
    const releasable = client as SqlClient & { release?: () => void };
    releasable.release?.();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply-db");
  const write = args.includes("--write");
  const reportConflict = args.includes("--report-conflict");
  const target = args.find((item) => item.startsWith("--target="))?.slice(9);
  const destination = args.find((item) => item.startsWith("--out="))?.slice(6);
  const requested = args.find((item) => item.startsWith("--market="))?.slice(9) as PublicSectorMarket | undefined;
  if (requested && !PUBLIC_SECTOR_MARKETS.includes(requested)) throw new Error(`Unsupported Public Sector market: ${requested}.`);
  const markets = requested ? [requested] : [...PUBLIC_SECTOR_MARKETS];
  const parsed = await parsePublicSectorDocuments();
  const evidence = await readPublicSectorEvidence();
  const evidenceReport = {
    version: 1 as const,
    status: "review-required" as const,
    sourceCount: evidence.sources.length,
    applicationCount: evidence.applications.length,
    draftBlockers: [...new Set([...evidence.unresolved, SHARED_LEGAL_REVIEW_BLOCKER])],
    fatalBlockers: [] as string[],
  };
  const plan = markets.map((market) => {
    const document = parsed.get(market)!;
    return {
      market,
      source: DOCUMENTS[market],
      headline: document.headline,
      sectionCount: 9,
      sourceCount: document.sources.length,
      applicationCount: document.applications.length,
      operation: `${RECEIPT_PREFIX}:${market}:en`,
      dateProvenance: DATE_PROVENANCE,
    };
  });
  if (!apply) {
    await emitJson({
      task: 319,
      mode: "dry-run",
      plan,
      unresolvedEvidence: evidence.unresolved,
      evidenceReport,
      evidenceReviewDigest: evidence.reviewDocumentDigest ?? null,
      dateProvenance: DATE_PROVENANCE,
      action: "No database or publication mutation occurred. Pass --apply-db --target=development to stage independent drafts.",
      publication: "This command never publishes; authenticated CMS review and Publish remain mandatory.",
    }, outputPath(destination, "public-sector-editions-reconciliation.json"), write);
    return;
  }
  if (
    process.env.NODE_ENV === "production"
    || process.env.REPLIT_DEPLOYMENT === "1"
    || target !== "development"
  ) throw new Error("Public Sector edition reconciliation is development-only and requires --target=development.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const { pool } = await import("@workspace/db");
  const results: Array<Record<string, unknown>> = [];
  try {
    for (const market of markets) {
      try {
        results.push(await reconcileMarket(pool, market, parsed.get(market)!, evidence));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          market,
          disposition: "preserved-conflict",
          error: message,
          evidenceReport,
          action: "No Public Sector publication pointer, availability decision, hero pin, historical revision, or newer editorial draft was overwritten.",
        });
        if (!reportConflict) throw error;
      }
    }
  } finally {
    await pool.end();
  }
  await emitJson({
    task: 319,
    mode: "apply",
    results,
    evidenceReport,
    publication: "Draft staging only. No edition was published or availability decision changed.",
    approvalBlockers: ["Review each exact market in the authenticated CMS, resolve evidence/legal blockers, and use normal Publish controls.", DATE_PROVENANCE],
  }, outputPath(destination, "public-sector-editions-reconciliation.json"), write);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    const reportConflict = process.argv.includes("--report-conflict");
    const destination = process.argv.find((item) => item.startsWith("--out="))?.slice(6);
    if (reportConflict) {
      await emitJson({
        task: 319,
        mode: process.argv.includes("--apply-db") ? "apply" : "dry-run",
        disposition: "preserved-conflict",
        error: message,
        action: "No Public Sector content, publication pointer, availability decision, hero pin, or editorial revision was overwritten.",
        approvalBlockers: ["Resolve the evidence mapping or editorial conflict, then review and publish through normal CMS controls."],
      }, outputPath(destination, "public-sector-editions-reconciliation.json"), true);
      console.error(`Public Sector reconciliation preserved existing editorial state: ${message}`);
      return;
    }
    console.error(message);
    process.exitCode = 1;
  });
}