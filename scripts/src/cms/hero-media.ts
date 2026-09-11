import { createHash } from "node:crypto";

export type HeroSlot = "homepage" | "industries" | "platforms";
export type ConfiguredHeroSlot = Exclude<HeroSlot, "platforms">;
export type HeroMediaRole = "poster" | "fallback" | "mp4" | "webm";

export interface HeroMediaDefinition {
  slot: HeroSlot;
  role: HeroMediaRole;
  publicPath: string;
  sourceFile: string;
  filename: string;
  mimeType: "image/jpeg" | "video/mp4" | "video/webm";
  checksum: string;
  byteSize: number;
  width: number;
  height: number;
  altText: string;
}

const publicRoot = "artifacts/cognirise-website/public";

export const heroMedia: readonly HeroMediaDefinition[] = [
  {
    slot: "homepage",
    role: "poster",
    publicPath: "/images/cognirise/pulse-hero-film-poster.jpg",
    sourceFile: `${publicRoot}/images/cognirise/pulse-hero-film-poster.jpg`,
    filename: "pulse-hero-film-poster.jpg",
    mimeType: "image/jpeg",
    checksum: "683363c9af7db310aff4bc1bf015ffc06cf63b82a7cf22ebee41af786e1e49c8",
    byteSize: 184124,
    width: 1280,
    height: 720,
    altText: "Cognirise Pulse luminous forms moving through a deep architectural landscape.",
  },
  {
    slot: "homepage",
    role: "mp4",
    publicPath: "/videos/cognirise/pulse-hero-motion.mp4",
    sourceFile: `${publicRoot}/videos/cognirise/pulse-hero-motion.mp4`,
    filename: "pulse-hero-motion.mp4",
    mimeType: "video/mp4",
    checksum: "64bf2370ee23134d8d7af18f93e43af7b928ab0a834a78715d173991b46d9a3a",
    byteSize: 2275562,
    width: 1280,
    height: 720,
    altText: "",
  },
  {
    slot: "homepage",
    role: "webm",
    publicPath: "/videos/cognirise/pulse-hero-motion.webm",
    sourceFile: `${publicRoot}/videos/cognirise/pulse-hero-motion.webm`,
    filename: "pulse-hero-motion.webm",
    mimeType: "video/webm",
    checksum: "309d8a3f5ffb836c0de3efa0abb09741fc69cd71a89adab8cbaf80999caad922",
    byteSize: 5739176,
    width: 1280,
    height: 720,
    altText: "",
  },
  {
    slot: "industries",
    role: "poster",
    publicPath: "/images/cognirise/industries-hero-flight-poster.jpg",
    sourceFile: `${publicRoot}/images/cognirise/industries-hero-flight-poster.jpg`,
    filename: "industries-hero-flight-poster.jpg",
    mimeType: "image/jpeg",
    checksum: "8dc1a95eee36be6078ed133290b024ce556e34742d1ab08b21a76ceb7aba0f45",
    byteSize: 121728,
    width: 1280,
    height: 720,
    altText: "A luminous route crosses a wide landscape beneath an aircraft in flight.",
  },
  {
    slot: "industries",
    role: "mp4",
    publicPath: "/videos/cognirise/industries-hero-flight.mp4",
    sourceFile: `${publicRoot}/videos/cognirise/industries-hero-flight.mp4`,
    filename: "industries-hero-flight.mp4",
    mimeType: "video/mp4",
    checksum: "5d04280112bf6a12ba2f4f8fb9375111b69d14fcabcd69a05603f0288b79b7e1",
    byteSize: 3716572,
    width: 1280,
    height: 720,
    altText: "",
  },
  {
    slot: "industries",
    role: "webm",
    publicPath: "/videos/cognirise/industries-hero-flight.webm",
    sourceFile: `${publicRoot}/videos/cognirise/industries-hero-flight.webm`,
    filename: "industries-hero-flight.webm",
    mimeType: "video/webm",
    checksum: "230051b82e3d49aed205c0eb1ebfb8bbff4aaff04f2f35c8e2e3a2560cd7b769",
    byteSize: 3690339,
    width: 1280,
    height: 720,
    altText: "",
  },
  {
    slot: "platforms",
    role: "poster",
    publicPath: "/media/platforms/cognios-rotation-poster.jpg",
    sourceFile: `${publicRoot}/media/platforms/cognios-rotation-poster.jpg`,
    filename: "cognios-rotation-poster.jpg",
    mimeType: "image/jpeg",
    checksum: "3f0f37ea0f2ea2ff02951f2e78dd94356ac284ffd1f8acdc30d6fc9edd2f6cda",
    byteSize: 82468,
    width: 720,
    height: 720,
    altText: "A layered CogniOS ecosystem connected by a luminous central spine.",
  },
  {
    slot: "platforms",
    role: "fallback",
    publicPath: "/media/platforms/cognios-rotation-fallback.jpg",
    sourceFile: `${publicRoot}/media/platforms/cognios-rotation-fallback.jpg`,
    filename: "cognios-rotation-fallback.jpg",
    mimeType: "image/jpeg",
    checksum: "fc856d336a4780e5c7568f0cb1b9e96dda8ee7d4fd1f7967df9ce37c0be3a781",
    byteSize: 160562,
    width: 1024,
    height: 1024,
    altText: "A layered CogniOS ecosystem connected by a luminous central spine.",
  },
  {
    slot: "platforms",
    role: "mp4",
    publicPath: "/media/platforms/cognios-rotation.mp4",
    sourceFile: `${publicRoot}/media/platforms/cognios-rotation.mp4`,
    filename: "cognios-rotation.mp4",
    mimeType: "video/mp4",
    checksum: "8c31a002531438ad19f3c4c367b0a3e59fd63bc17b7f534cb343c3bbeabd0a1d",
    byteSize: 1398073,
    width: 720,
    height: 720,
    altText: "",
  },
  {
    slot: "platforms",
    role: "webm",
    publicPath: "/media/platforms/cognios-rotation.webm",
    sourceFile: `${publicRoot}/media/platforms/cognios-rotation.webm`,
    filename: "cognios-rotation.webm",
    mimeType: "video/webm",
    checksum: "8a9fb14aad7094dcbd0e5c2f75af18c9d3e7b343c21f36c415e19afbcf1d4755",
    byteSize: 1342022,
    width: 720,
    height: 720,
    altText: "",
  },
] as const;

export function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export interface GovernedHeroMedia {
  definition: HeroMediaDefinition;
  assetId: string;
  versionId: string;
}

export function heroConfiguration(slot: ConfiguredHeroSlot, governed: readonly GovernedHeroMedia[]) {
  const selected = governed.filter((item) => item.definition.slot === slot);
  const byRole = new Map(selected.map((item) => [item.definition.role, item]));
  if (selected.length !== 3 || !byRole.get("poster") || !byRole.get("mp4") || !byRole.get("webm")) {
    throw new Error(`${slot} requires exactly one governed poster, MP4, and WebM.`);
  }
  const poster = byRole.get("poster")!;
  const sources = ["mp4", "webm"].map((role) => {
    const item = byRole.get(role as "mp4" | "webm")!;
    return {
      mediaId: item.assetId,
      mediaVersionId: item.versionId,
      mimeType: item.definition.mimeType,
    };
  });
  return {
    schemaVersion: 1,
    page: slot,
    hero: {
      posterMediaId: poster.assetId,
      posterMediaVersionId: poster.versionId,
      sources,
    },
    mediaIds: selected.map((item) => item.assetId),
  };
}

export function heroConfigurationSnapshot(slot: ConfiguredHeroSlot, governed: readonly GovernedHeroMedia[]) {
  const configuration = heroConfiguration(slot, governed);
  const { mediaIds, ...content } = configuration;
  return {
    slug: `site-${slot}-hero`,
    title: `${slot === "homepage" ? "Homepage" : "Industries"} hero`,
    summary: null,
    content,
    mediaIds,
    markets: ["uae"],
  };
}

export function motionMetadata(
  slot: HeroSlot,
  posterMediaId: string,
  reducedMotionMediaId = posterMediaId,
) {
  return {
    groupId: `${slot}-hero`,
    variant: "desktop",
    autoplay: true,
    loop: true,
    posterMediaId,
    reducedMotionMediaId,
    accessibility: {
      decorative: true,
      hasAudio: false,
    },
  };
}