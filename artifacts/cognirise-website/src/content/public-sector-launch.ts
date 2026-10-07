import { publicSectorNativeSchema } from "@workspace/api-zod";
import type { IndustryContent } from "./industries";
import type { Market } from "@/store/market";
import manuscripts from "../../../../scripts/src/cms/public-sector-native-content.json";

// Owner-authorized launch editions use the exact October manuscripts already
// staged for the CMS. Bundle the content; never fetch mutable drafts publicly.
const launchEditions = Object.fromEntries(
  Object.entries(manuscripts).map(([market, manuscript]) => [
    market,
    { ...manuscript, publicSectorNative: publicSectorNativeSchema.parse(manuscript.publicSectorNative) },
  ]),
) as Record<Market, {
  thesis: string;
  dek: string;
  sources: IndustryContent["sources"];
  publicSectorNative: ReturnType<typeof publicSectorNativeSchema.parse>;
}>;

export function publicSectorLaunchEnabled(options: {
  enabled: boolean;
  slug: string;
  locale: string;
  protectedPreview: boolean;
  releasePreview: boolean;
}) {
  return options.enabled && options.slug === "public-sector"
    && options.locale === "en" && !options.protectedPreview && !options.releasePreview;
}

export function applyPublicSectorLaunch(view: IndustryContent, market: Market): IndustryContent {
  if (view.slug !== "public-sector") return view;
  const edition = launchEditions[market];
  if (!edition || edition.publicSectorNative.market !== market) {
    throw new Error(`No matching Public Sector launch edition for ${market}.`);
  }
  const { publicSectorPov: _legacy, ...base } = view;
  return {
    ...base,
    ...edition,
    legacyPath: "/industries/public-sector",
  };
}
