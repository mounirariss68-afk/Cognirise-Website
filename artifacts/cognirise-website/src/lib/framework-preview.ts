import type { FrameworkContent } from "@workspace/api-zod";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function string(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function oneOf<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? value as T : fallback;
}

function externalUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

function safeLink(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (/^\/(?!\/)[a-z0-9/_-]*(?:\?[a-z0-9&=_-]+)?(?:#[a-z0-9_-]+)?$/i.test(value)) return value;
  return externalUrl(value);
}

function normalizeExample(value: unknown) {
  const source = record(value);
  if (!source) return null;
  return {
    sector: string(source.sector, "Unspecified sector"),
    title: string(source.title, "Untitled handover"),
    handover: oneOf(source.handover, ["knowledge", "decision", "action"] as const, "knowledge"),
    reversibility: oneOf(source.reversibility, ["R1", "R2", "R3", "R4"] as const, "R1"),
    reach: oneOf(source.reach, ["H1", "H2", "H3", "H4", "H5"] as const, "H1"),
    exposureBand: oneOf(source.exposureBand, ["E1", "E2", "E3", "E4", "E5"] as const, "E1"),
    oversight: string(source.oversight),
    detail: string(source.detail),
  };
}

function normalizeWorkedExample(value: unknown): FrameworkContent["workedExample"] | undefined {
  const source = record(value);
  const example = normalizeExample(value);
  if (!source || !example) return undefined;
  return {
    ...example,
    requestedAuthority: oneOf(
      source.requestedAuthority,
      ["out-of-loop", "on-loop", "in-loop", "in-loop-second", "in-loop-external"] as const,
      "out-of-loop",
    ),
    interventionWindow: typeof source.interventionWindow === "string" ? source.interventionWindow : undefined,
    accountableRole: string(source.accountableRole),
    promotionEvidence: string(source.promotionEvidence),
    automaticDemotion: string(source.automaticDemotion),
    authorityArtefact: typeof source.authorityArtefact === "string" ? source.authorityArtefact : undefined,
  };
}

function normalizeMethodology(value: unknown): FrameworkContent["methodology"] {
  if (!Array.isArray(value)) return [];
  const blocks: FrameworkContent["methodology"] = [];
  for (const item of value) {
    const block = record(item);
    if (!block) continue;
    if (block.type === "heading" && typeof block.text === "string") {
      blocks.push({ type: "heading", level: block.level === 2 ? 2 : 3, text: block.text });
      continue;
    }
    if (block.type === "paragraph" && typeof block.text === "string") {
      blocks.push({ type: "paragraph", text: block.text });
      continue;
    }
    if (block.type === "quote" && typeof block.text === "string") {
      blocks.push({
        type: "quote",
        text: block.text,
        attribution: typeof block.attribution === "string" ? block.attribution : undefined,
      });
      continue;
    }
    if (block.type === "list") {
      blocks.push({
        type: "list",
        style: block.style === "numbered" ? "numbered" : "bullet",
        items: Array.isArray(block.items)
          ? block.items.filter((item): item is string => typeof item === "string")
          : [],
      });
    }
  }
  return blocks;
}

export function normalizeFrameworkPreviewContent(value: unknown): FrameworkContent | null {
  const source = record(value);
  if (source?.template !== "agent-authority") return null;
  const sectorExamples = Array.isArray(source.sectorExamples)
    ? source.sectorExamples.map(normalizeExample).filter((item): item is NonNullable<typeof item> => item !== null)
    : [];
  const sources = Array.isArray(source.sources)
    ? source.sources.flatMap((item) => {
      const citation = record(item);
      if (!citation || typeof citation.label !== "string") return [];
      return [{
        label: citation.label,
        url: externalUrl(citation.url),
        accessedAt: typeof citation.accessedAt === "string" ? citation.accessedAt : undefined,
      }];
    })
    : [];

  return {
    schemaVersion: 1,
    template: "agent-authority",
    teaser: string(source.teaser),
    handoverExplanation: string(source.handoverExplanation),
    methodology: normalizeMethodology(source.methodology),
    workedExample: normalizeWorkedExample(source.workedExample),
    sectorExamples,
    heroMediaId: typeof source.heroMediaId === "string" ? source.heroMediaId : undefined,
    cta: record(source.cta) && typeof record(source.cta)?.label === "string" && safeLink(record(source.cta)?.href)
      ? { label: String(record(source.cta)?.label), href: String(safeLink(record(source.cta)?.href)) }
      : undefined,
    visibility: oneOf(source.visibility, ["public", "hidden", "restricted"] as const, "hidden"),
    order: typeof source.order === "number" && Number.isInteger(source.order) ? source.order : 0,
    sources,
    verificationDate: typeof source.verificationDate === "string" ? source.verificationDate : undefined,
    reviewDate: typeof source.reviewDate === "string" ? source.reviewDate : undefined,
    relatedIds: Array.isArray(source.relatedIds)
      ? source.relatedIds.filter((item): item is string => typeof item === "string")
      : [],
  } as FrameworkContent;
}