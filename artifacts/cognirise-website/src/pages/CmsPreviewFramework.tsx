import type { FrameworkContent } from "@workspace/api-zod";
import { AgentAuthorityLayout } from "@/pages/AgentAuthorityModel";
import { GuardrailsLayout } from "@/pages/GuardrailsFramework";
import {
  frameworkPreviewWarnings,
  normalizeFrameworkPreviewContent,
} from "@/lib/framework-preview";
import { type CmsRecord } from "@/lib/cms";
import { Shell } from "@/components/layout/Shell";
import type { Preview } from "./CmsPreview";

function PreviewBanner({ preview }: { preview: Preview }) {
  return (
    <header className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:px-6 sm:py-4">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <strong>Protected draft preview — not published</strong>
        <span className="font-mono text-[10px] uppercase sm:text-xs">{preview.requestedMarket} / {preview.requestedLocale} · revision {preview.revisionNumber}{preview.usedFallback ? " · fallback" : ""}</span>
      </div>
    </header>
  );
}

function PreviewWarningPanel({ warnings, missingMedia }: { warnings: string[]; missingMedia: string[] }) {
  if (!warnings.length && !missingMedia.length) return null;
  return (
    <aside className="border-b border-amber-300 bg-amber-50 px-6 py-5 text-amber-950" role="alert">
      <div className="mx-auto max-w-[1100px]">
        <h2 className="font-semibold">Review warnings</h2>
        <ul className="mt-3 list-disc pl-5 text-sm">
          {warnings.map((warning) => <li key={warning}>{warning}</li>)}
          {missingMedia.map((reference) => <li key={reference}>Media unavailable: {reference}</li>)}
        </ul>
      </div>
    </aside>
  );
}

function unresolvedPinnedMedia(value: unknown, media: NonNullable<Preview["media"]>): string[] {
  const missing = new Set<string>();
  const inspect = (candidate: unknown) => {
    if (Array.isArray(candidate)) {
      candidate.forEach(inspect);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    const record = candidate as Record<string, unknown>;
    if (typeof record.mediaId === "string" && typeof record.mediaVersionId === "string"
      && !media.some((item) => item.id === record.mediaId && item.versionId === record.mediaVersionId)) {
      missing.add(`${record.mediaId}@${record.mediaVersionId}`);
    }
    Object.values(record).forEach(inspect);
  };
  inspect(value);
  return [...missing];
}

function ProtectedPreviewError({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-background px-6 py-24">
      <section className="mx-auto max-w-[720px] border border-amber-300 bg-amber-50 p-8 text-amber-950" role="alert">
        <h1 className="text-2xl font-semibold">This protected preview is unavailable.</h1>
        <p className="mt-3 leading-7">{message}</p>
      </section>
    </main>
  );
}

export type CmsPreviewFrameworkProps = {
  preview: Preview;
  framework: CmsRecord<FrameworkContent>;
  warnings: string[];
};

/** The framework branch used by CmsPreview after its protected response has
 * been validated and normalized. Keeping this renderer separate also lets
 * the preview regression exercise the real route without a public CMS query. */
export function CmsPreviewFramework({
  preview,
  framework,
  warnings,
}: CmsPreviewFrameworkProps) {
  const missingFrameworkMedia = [
    ...new Set([
      ...preview.missingMediaIds,
      ...unresolvedPinnedMedia(preview.document.content, preview.media ?? []),
    ]),
  ];
  if (missingFrameworkMedia.length) {
    return (
      <Shell navigationOverride={preview.navigation}>
        <PreviewBanner preview={preview} />
        <PreviewWarningPanel warnings={warnings} missingMedia={missingFrameworkMedia} />
        <ProtectedPreviewError message="This saved framework revision references draft media that is unavailable. It has not been completed with public media." />
      </Shell>
    );
  }
  return (
    <Shell navigationOverride={preview.navigation}>
      <main className="min-h-screen bg-background">
        <PreviewBanner preview={preview} />
        <PreviewWarningPanel warnings={warnings} missingMedia={preview.missingMediaIds} />
        {framework.template === "agent-authority"
          ? <AgentAuthorityLayout framework={framework} preview />
          : <GuardrailsLayout framework={framework} preview />}
      </main>
    </Shell>
  );
}

/** Build the same exact framework record consumed by the protected preview
 * route. Optional summary copy enters only through the strict normalizer. */
export function normalizeCmsPreviewFramework(preview: Preview): {
  framework: CmsRecord<FrameworkContent> | null;
  warnings: string[];
} {
  const frameworkContent = normalizeFrameworkPreviewContent(preview.document.content);
  const framework = frameworkContent
    ? {
        ...frameworkContent,
        id: preview.revisionId,
        slug: typeof preview.document.slug === "string" ? preview.document.slug : "agent-authority-model",
        title: typeof preview.document.title === "string" ? preview.document.title : "",
        summary: typeof preview.document.summary === "string" ? preview.document.summary : null,
        media: preview.media,
        seo: undefined,
        publishedAt: "",
        updatedAt: "",
      } as CmsRecord<FrameworkContent>
    : null;
  return {
    framework,
    warnings: frameworkPreviewWarnings(preview.document.content),
  };
}