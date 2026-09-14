import type { CmsFrameworkContent } from "@workspace/api-zod";
import { guardrailsFixture } from "./guardrails-fixture.js";

export const GUARDRAILS_REDESIGN_VERSION = "guardrails-redesign-v1" as const;
export const GUARDRAILS_HERO = {
  sourceFile: "attached_assets/generated_images/cognirise-guardrails-boundaries-hero.jpg",
  filename: "cognirise-guardrails-boundaries-hero.jpg",
  mimeType: "image/jpeg",
  checksum: "58854df17fc2aada590e03f5a2cd168677eb737a0d97cbe51b9e1a4b34b249fe",
  byteSize: 146_953,
  width: 1_024,
  height: 1_024,
  altText: "Violet and coral light passes through four ivory architectural gates with navy frames and glass boundaries.",
  intendedRoute: "/methodologies/guardrails-framework",
} as const;

export const guardrailsPresentation = {
  version: GUARDRAILS_REDESIGN_VERSION,
  hero: {
    headline: "Guardrails that hold.",
    subheadline: "Set the boundaries. Prove they work. Keep them working as your AI changes.",
    detailsLabel: "Read the reviewed introduction",
  },
  distinction: {
    summary: "A rule is not a control until the system has no path around it.",
    detailsLabel: "Read the distinction in full",
  },
  layers: {
    summary: "The same rule gets stronger only when it moves into a stronger enforcement layer.",
    detailsLabel: "See all four layers and the worked example",
  },
  exposure: {
    summary: "Exposure sets the minimum layer. Each band carries its own requirement.",
    detailsLabel: "See the five exposure-to-control relationships",
  },
  setProveHold: {
    summary: "Set what matters. Prove it survives attack. Hold it as the system changes.",
    questionsDetailsLabel: "Questions a control must answer",
    maintenanceDetailsLabel: "Maintenance by enforcement layer",
    measurementDetailsLabel: "What to measure",
  },
  authority: {
    summary: "Authority decides what a handover may do. Guardrails decide how strongly it is enforced.",
    detailsLabel: "Read how authority and enforcement work together",
  },
  sourcesNextStep: {
    summary: "Start with the handovers that are hardest to undo, then test the controls that protect them.",
    detailsLabel: "Read sources, three moves, and the review next step",
  },
} as const;

export type GovernedGuardrailsHero = {
  mediaId: string;
  mediaVersionId: string;
};

/** Preserves the original eleven-field payload as detailed source authority,
 * adding only the optional concise presentation map and a route-owned,
 * immutable hero reference. */
export function redesignedGuardrailsSnapshot(
  hero: GovernedGuardrailsHero,
) {
  const content = {
    ...guardrailsFixture.content,
    heroMedia: {
      mediaId: hero.mediaId,
      mediaVersionId: hero.mediaVersionId,
      role: "hero" as const,
      altText: GUARDRAILS_HERO.altText,
    },
    presentation: guardrailsPresentation,
  } satisfies CmsFrameworkContent;

  return {
    slug: guardrailsFixture.slug,
    title: guardrailsFixture.title,
    summary: guardrailsFixture.summary,
    content,
    seo: {
      ...guardrailsFixture.seo,
      ogImageMedia: {
        mediaId: hero.mediaId,
        mediaVersionId: hero.mediaVersionId,
        role: "og-image" as const,
        altText: GUARDRAILS_HERO.altText,
      },
    },
    mediaIds: [hero.mediaId],
    markets: guardrailsFixture.markets,
  };
}