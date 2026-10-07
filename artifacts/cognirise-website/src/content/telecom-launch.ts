import { industryContentSchema, telecomPovSchema } from "@workspace/api-zod";
import type { IndustryContent } from "./industries";
import launchContent from "./telecom-launch.json";

// Owner-authorized public launch copy, detached from the mutable CMS draft.
// Hero media, regional context and protected previews retain their existing authority.
const approvedLaunchCopy = {
  ...launchContent,
  sources: industryContentSchema.innerType().shape.sources.parse(launchContent.sources),
  telecomPov: telecomPovSchema.parse(launchContent.telecomPov),
};

export function applyTelecomLaunch(view: IndustryContent): IndustryContent {
  if (view.slug !== "telecoms") return view;
  return { ...view, ...approvedLaunchCopy };
}
