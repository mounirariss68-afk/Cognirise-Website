import {
  FRAMEWORK_GUARDRAILS_FIGURE_ASSETS,
  guardrailsFrameworkContentSchema,
  type FrameworkContent,
  type FrameworkGuardrailsSubsection,
} from "@workspace/api-zod";

type UnknownRecord = Record<string, unknown>;
type AgentAuthorityFrameworkContent = Extract<FrameworkContent, { template: "agent-authority" }>;

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

function normalizeWorkedExample(value: unknown): AgentAuthorityFrameworkContent["workedExample"] | undefined {
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

function normalizeMethodology(value: unknown): AgentAuthorityFrameworkContent["methodology"] {
  if (!Array.isArray(value)) return [];
  const blocks: AgentAuthorityFrameworkContent["methodology"] = [];
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

function boundedString(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximum
    ? value.trim()
    : null;
}

function boundedText(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.trim().length <= maximum ? value.trim() : null;
}

function exactStrings(value: unknown, length: number, maximum: number): string[] | null {
  if (!Array.isArray(value) || value.length !== length) return null;
  const values = value.map((item) => boundedString(item, maximum));
  return values.every((item): item is string => item !== null) ? values : null;
}

function normalizeGuardrails(value: unknown): FrameworkGuardrailsSubsection | undefined {
  const source = record(value);
  const bankExample = record(source?.bankExample);
  const unit = record(source?.unit);
  const interaction = record(source?.interaction);
  const exposure = record(interaction?.exposure);
  const evidence = record(interaction?.evidence);
  const requiredControls = record(interaction?.requiredControls);
  const compensatingControls = record(interaction?.compensatingControls);
  const firstFigure = record(source?.firstFigure);
  const secondFigure = record(source?.secondFigure);
  const comparisonColumns = record(source?.comparisonColumns);
  const designRule = record(source?.designRule);
  const comparisonRows = Array.isArray(source?.comparisonRows) && source.comparisonRows.length === 3
    ? source.comparisonRows.map(record)
    : null;
  const paragraphs = exactStrings(unit?.paragraphs, 2, 4_000);
  if (!source || !bankExample || !unit || !interaction || !exposure || !evidence || !requiredControls
    || !compensatingControls || !firstFigure || !secondFigure || !comparisonColumns || !designRule || !comparisonRows || !paragraphs) {
    return undefined;
  }
  const figure = <T extends typeof FRAMEWORK_GUARDRAILS_FIGURE_ASSETS[number]>(candidate: UnknownRecord, asset: T) => {
    const altText = boundedString(candidate.altText, 1_000);
    const captionLabel = boundedString(candidate.captionLabel, 120);
    const captionLead = boundedString(candidate.captionLead, 1_000);
    const captionBody = boundedString(candidate.captionBody, 1_000);
    return candidate.asset === asset && altText && captionLabel && captionLead && captionBody
      ? { asset, altText, captionLabel, captionLead, captionBody }
      : null;
  };
  const normalizedFirstFigure = figure(firstFigure, "aam-guardrails-vs-authority.svg");
  const normalizedSecondFigure = figure(secondFigure, "aam-how-they-interact.svg");
  const columnGuardrails = boundedString(comparisonColumns.guardrails, 240);
  const columnAuthorityModel = boundedString(comparisonColumns.authorityModel, 240);
  const bridgeText = requiredControls.betweenExamples === undefined
    ? undefined
    : boundedText(requiredControls.betweenExamples, 1_000);
  const strings = [
    boundedString(source.heading, 240), boundedString(source.opening, 2_000), boundedString(source.definition, 4_000),
    boundedString(bankExample.beforeQuote, 4_000), boundedString(bankExample.quote, 1_000), boundedString(bankExample.afterQuote, 4_000),
    boundedString(source.comparisonHeading, 240), boundedString(unit.heading, 240), boundedString(unit.emphasis, 1_000),
    boundedString(interaction.heading, 240), boundedString(interaction.introduction, 1_000),
    boundedString(exposure.lead, 240), boundedString(exposure.body, 4_000), boundedString(evidence.lead, 240), boundedString(evidence.body, 4_000),
    boundedString(interaction.controlsIntroduction, 2_000), boundedString(requiredControls.lead, 240),
    boundedString(requiredControls.bodyBeforeExamples, 4_000), boundedString(requiredControls.assuranceExample, 2_000),
    boundedString(requiredControls.controlExample, 2_000), boundedString(requiredControls.conclusion, 1_000),
    boundedString(compensatingControls.lead, 240), boundedString(compensatingControls.bodyBeforeContent, 4_000),
    boundedString(compensatingControls.content, 240), boundedString(compensatingControls.bodyAfterContent, 4_000),
    boundedString(designRule.heading, 240), boundedString(designRule.quote, 2_000),
    boundedString(designRule.conclusion, 4_000), boundedString(designRule.failure, 4_000),
    boundedString(designRule.closingEmphasis, 1_000),
  ];
  const rows = comparisonRows.map((row) => ({
    label: boundedString(row?.label, 240),
    guardrails: boundedString(row?.guardrails, 2_000),
    authorityModel: boundedString(row?.authorityModel, 2_000),
    guardrailsEmphasis: row?.guardrailsEmphasis === "plain" || row?.guardrailsEmphasis === "italic"
      ? row.guardrailsEmphasis
      : null,
    authorityModelEmphasis: row?.authorityModelEmphasis === "plain" || row?.authorityModelEmphasis === "italic"
      ? row.authorityModelEmphasis
      : null,
  }));
  if (!normalizedFirstFigure || !normalizedSecondFigure || !columnGuardrails || !columnAuthorityModel || bridgeText === null || strings.some((item) => item === null)
    || rows.some((row) => !row.label || !row.guardrails || !row.authorityModel || !row.guardrailsEmphasis || !row.authorityModelEmphasis)) return undefined;
  return {
    heading: strings[0]!, opening: strings[1]!, definition: strings[2]!,
    bankExample: { beforeQuote: strings[3]!, quote: strings[4]!, afterQuote: strings[5]! },
    comparisonHeading: strings[6]!,
    comparisonColumns: { guardrails: columnGuardrails, authorityModel: columnAuthorityModel },
    comparisonRows: rows as FrameworkGuardrailsSubsection["comparisonRows"],
    unit: { heading: strings[7]!, paragraphs: [paragraphs[0]!, paragraphs[1]!], emphasis: strings[8]! },
    firstFigure: normalizedFirstFigure,
    interaction: {
      heading: strings[9]!, introduction: strings[10]!,
      exposure: { lead: strings[11]!, body: strings[12]! },
      evidence: { lead: strings[13]!, body: strings[14]! },
      controlsIntroduction: strings[15]!,
      requiredControls: {
        lead: strings[16]!, bodyBeforeExamples: strings[17]!, assuranceExample: strings[18]!,
        ...(bridgeText === undefined ? {} : { betweenExamples: bridgeText }),
        controlExample: strings[19]!, conclusion: strings[20]!,
      },
      compensatingControls: {
        lead: strings[21]!, bodyBeforeContent: strings[22]!, content: strings[23]!, bodyAfterContent: strings[24]!,
      },
    },
    secondFigure: normalizedSecondFigure,
    designRule: {
      heading: strings[25]!, quote: strings[26]!, conclusion: strings[27]!, failure: strings[28]!, closingEmphasis: strings[29]!,
    },
  };
}

export function normalizeFrameworkPreviewContent(value: unknown): FrameworkContent | null {
  const source = record(value);
  if (source?.template === "guardrails") {
    // Unlike public delivery, an issued preview may only render the exact
    // guarded revision. Parse the dedicated template instead of coercing it
    // into the authority shape or filling it from compiled content.
    const parsed = guardrailsFrameworkContentSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }
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
    guardrails: normalizeGuardrails(source.guardrails),
    heroMedia: record(source.heroMedia)
      && typeof record(source.heroMedia)?.mediaId === "string"
      && typeof record(source.heroMedia)?.mediaVersionId === "string"
      ? source.heroMedia as AgentAuthorityFrameworkContent["heroMedia"]
      : undefined,
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
  } as AgentAuthorityFrameworkContent;
}