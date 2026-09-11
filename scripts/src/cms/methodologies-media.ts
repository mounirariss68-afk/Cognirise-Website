import { createHash } from "node:crypto";

export const methodologiesHeroMedia = {
  task: 294,
  slot: "methodologies-hero-media",
  pagePath: "/methodologies",
  sourceFile: "attached_assets/cognirise-industry-education_1789039954658.png",
  filename: "cognirise-methodologies-overview.png",
  mimeType: "image/png",
  checksum: "d44641810913d36924887248667011d826348ea6f7a3ca8b41a2eb475c5dd5a8",
  byteSize: 1_813_277,
  width: 1024,
  height: 1024,
  altText: "Futuristic stone learning spaces connected by flowing paths of violet and coral light",
} as const;

export const methodologiesMediaRights = {
  status: "approved",
  basis: "explicit-user-publishing-request",
  evidence: "Task 294 explicitly requests publishing the supplied image on the /methodologies overview.",
  source: "user-supplied attached asset",
} as const;

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function immutableVersionMetadata() {
  return {
    altText: methodologiesHeroMedia.altText,
    accessibilityStatus: "approved",
    rightsStatus: "approved",
    rights: methodologiesMediaRights,
    source: {
      kind: "user-supplied",
      repositoryPath: methodologiesHeroMedia.sourceFile,
      request: "Publish the supplied image on the /methodologies overview.",
      task: methodologiesHeroMedia.task,
    },
    usage: {
      pagePath: methodologiesHeroMedia.pagePath,
      slot: methodologiesHeroMedia.slot,
      role: "hero",
    },
  };
}

type LandingSnapshot = {
  mediaIds?: unknown;
  content?: {
    pagePath?: unknown;
    sections?: unknown;
    visualReferences?: unknown;
  };
  [key: string]: unknown;
};

export function resolveMethodologiesSnapshot(
  compiled: LandingSnapshot,
  mediaId: string,
  mediaVersionId: string,
) {
  if (compiled.content?.pagePath !== methodologiesHeroMedia.pagePath) {
    throw new Error("The compiled landing authority is not /methodologies.");
  }
  if (!Array.isArray(compiled.content.sections)) {
    throw new Error("The compiled /methodologies landing has no section inventory.");
  }
  const matches = compiled.content.sections.filter((section) =>
    section && typeof section === "object"
      && (section as Record<string, unknown>).id === methodologiesHeroMedia.slot
  );
  if (matches.length !== 1 || (matches[0] as Record<string, unknown>).type !== "migration-media") {
    throw new Error(
      `The compiled /methodologies landing must contain exactly one unresolved ${methodologiesHeroMedia.slot} slot.`,
    );
  }
  const reference = {
    mediaId,
    mediaVersionId,
    role: "hero" as const,
    altText: methodologiesHeroMedia.altText,
  };
  const sections = compiled.content.sections.map((section) => {
    if ((section as Record<string, unknown>).id !== methodologiesHeroMedia.slot) return section;
    const source = section as Record<string, unknown>;
    return {
      id: source.id,
      order: source.order,
      type: "media" as const,
      references: [reference],
    };
  });
  return {
    ...compiled,
    mediaIds: [mediaId],
    content: {
      ...compiled.content,
      sections,
      visualReferences: [],
    },
  };
}
