import { cognibasePulsePageSchema, cogniagentsPulsePageSchema, type PlatformContent } from "@workspace/api-zod";
import CogniBase from "@/pages/CogniBase";
import CogniAgents from "@/pages/CogniAgents";

/** Do not infer a specialist composition from a slug alone, or from a partial draft. */
export function pulsePlatformVariant(slug: string, content: PlatformContent): "cognibase-pulse" | "cogniagents-pulse" | null {
  if (slug === "cognibase" && content.template === "cognibase-pulse" && cognibasePulsePageSchema.safeParse(content.pulsePage).success) return "cognibase-pulse";
  if (slug === "cogniagents" && content.template === "cogniagents-pulse" && cogniagentsPulsePageSchema.safeParse(content.pulsePage).success) return "cogniagents-pulse";
  return null;
}

/** A broken Pulse draft must never masquerade as a standard platform preview. */
export function platformPreviewPresentation(slug: string, content: PlatformContent): "standard" | "invalid-pulse" | "cognibase-pulse" | "cogniagents-pulse" {
  if (content.template !== "cognibase-pulse" && content.template !== "cogniagents-pulse") return "standard";
  return pulsePlatformVariant(slug, content) ?? "invalid-pulse";
}

export function PulsePlatformPresentation({ slug, content, preview = false }: { slug: string; content: PlatformContent; preview?: boolean }) {
  const variant = pulsePlatformVariant(slug, content);
  if (variant === "cognibase-pulse") return <CogniBase page={content.pulsePage as Parameters<typeof CogniBase>[0]["page"]} preview={preview} />;
  if (variant === "cogniagents-pulse") return <CogniAgents page={content.pulsePage as Parameters<typeof CogniAgents>[0]["page"]} preview={preview} />;
  return null;
}