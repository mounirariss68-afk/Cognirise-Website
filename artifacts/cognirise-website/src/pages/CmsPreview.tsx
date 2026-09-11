import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { type CmsDocumentKind, type FrameworkContent, type IndustryContent, type OfficeContent, validateCmsSnapshot } from "@workspace/api-zod";
import NotFound from "@/pages/not-found";
import { applyMetadata } from "@/lib/metadata";
import { AgentAuthorityLayout } from "@/pages/AgentAuthorityModel";
import {
  isIndustryPreviewFocusMessage,
  resolvePreviewIndustryMedia,
  type CmsRecord,
} from "@/lib/cms";
import { normalizeFrameworkPreviewContent } from "@/lib/framework-preview";
import { OfficeContactCard } from "@/components/OfficeContactCard";
import { BankingEditorial } from "@/components/industries/BankingEditorial";
import { Shell, type PreviewNavigationSnapshot } from "@/components/layout/Shell";
import { IndustryEditorialView } from "@/components/industries/IndustryEditorial";

type Preview = {
  kind: CmsDocumentKind;
  document: Record<string, unknown>;
  market: string;
  locale: string;
  requestedMarket: string;
  requestedLocale: string;
  revisionId: string;
  revisionNumber: number;
  usedFallback: boolean;
  media: CmsRecord<FrameworkContent>["media"];
  missingMediaIds: string[];
  validationWarnings: string[];
  navigation: PreviewNavigationSnapshot;
};

type PreviewError = {
  kind: "expired" | "revoked" | "forbidden" | "authentication" | "invalid-response" | "unavailable";
  message: string;
};

const previewMarkets = ["uae", "ksa", "turkiye", "europe"] as const;
type IndustryPreviewStatus = "ready" | "unavailable" | "expired" | "revoked";

function isPreview(value: unknown): value is Preview {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const preview = value as Record<string, unknown>;
  return (
    typeof preview.kind === "string"
    && ["person", "partner", "platform", "publication", "case-study", "industry", "framework", "office", "landing-page", "site-configuration"].includes(preview.kind)
    && Boolean(preview.document) && typeof preview.document === "object" && !Array.isArray(preview.document)
    && typeof preview.market === "string"
    && typeof preview.locale === "string"
    && typeof preview.requestedMarket === "string"
    && typeof preview.requestedLocale === "string"
    && typeof preview.revisionId === "string"
    && typeof preview.revisionNumber === "number"
    && typeof preview.usedFallback === "boolean"
    && Array.isArray(preview.media)
    && Array.isArray(preview.missingMediaIds) && preview.missingMediaIds.every((id) => typeof id === "string")
    && Array.isArray(preview.validationWarnings) && preview.validationWarnings.every((warning) => typeof warning === "string")
    && Boolean(preview.navigation) && typeof preview.navigation === "object" && !Array.isArray(preview.navigation)
  );
}

function fetchError(response: Response, body: unknown): PreviewError {
  const detail = body && typeof body === "object" && typeof (body as Record<string, unknown>).error === "string"
    ? (body as Record<string, string>).error
    : "The protected preview could not be loaded.";
  const reason = body && typeof body === "object" ? (body as Record<string, unknown>).reason : undefined;
  if (response.status === 410 && reason === "revoked") return { kind: "revoked", message: detail };
  if (response.status === 410) return { kind: "expired", message: detail };
  if (response.status === 403) return { kind: "forbidden", message: detail };
  if (response.status === 401) return { kind: "authentication", message: detail };
  return { kind: "unavailable", message: detail };
}

function industryPreviewStatus(
  preview: Preview | undefined,
  error: PreviewError | undefined,
  loading: boolean,
): IndustryPreviewStatus | null {
  // A newly mounted preview has not yet made a protected request. Reporting it
  // as unavailable would cause the parent to discard the still-live iframe.
  if (loading) return null;
  if (error?.kind === "revoked") return "revoked";
  if (error?.kind === "expired") return "expired";
  if (error || !preview) return "unavailable";
  if (preview.kind !== "industry") return "ready";

  const validation = validateCmsSnapshot(preview.kind, preview.document, "draft");
  if (!validation.success) return "unavailable";
  const content = validation.data.content as IndustryContent;
  if (
    !previewMarkets.some((market) => market === preview.requestedMarket)
    || (content.bankingPov && content.bankingPov.market !== preview.requestedMarket)
  ) return "unavailable";
  const media = resolvePreviewIndustryMedia(content, preview.media);
  return preview.missingMediaIds.length || media.missingReferences.length ? "unavailable" : "ready";
}

function Content({ value }: { value: Record<string, unknown> }) {
  const rows = Object.entries(value).filter(([key]) => !["schemaVersion", "sources", "relatedIds", "order", "visibility"].includes(key));
  return <div className="space-y-8">{rows.map(([key, item]) => (
    <section key={key} className="border-t border-border pt-4">
      <h2 className="text-xs font-bold uppercase tracking-[.18em] text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</h2>
      {typeof item === "string" || typeof item === "number"
        ? <p className="mt-3 whitespace-pre-wrap text-lg leading-8">{String(item)}</p>
        : <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-md bg-secondary p-4 text-sm">{JSON.stringify(item, null, 2)}</pre>}
    </section>
  ))}</div>;
}

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

function ProtectedPreviewError({ error }: { error: PreviewError }) {
  const title = error.kind === "revoked"
    ? "This preview session has been revoked."
    : error.kind === "expired"
      ? "This preview session has expired."
      : error.kind === "forbidden"
        ? "You do not have access to this preview."
        : error.kind === "authentication"
          ? "Sign in with MFA to view this preview."
          : "This protected preview is unavailable.";
  return (
    <main className="min-h-screen bg-background px-6 py-24">
      <section className="mx-auto max-w-[720px] border border-amber-300 bg-amber-50 p-8 text-amber-950" role="alert">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 leading-7">{error.message}</p>
      </section>
    </main>
  );
}

function IndustryPreview({ preview, content }: { preview: Preview; content: IndustryContent }) {
  const previewMarket = previewMarkets.find((market) => market === preview.requestedMarket);
  if (!previewMarket) {
    return <ProtectedPreviewError error={{ kind: "invalid-response", message: "The saved preview does not identify a supported market." }} />;
  }
  if (content.bankingPov && content.bankingPov.market !== preview.requestedMarket) {
    return <ProtectedPreviewError error={{ kind: "invalid-response", message: "The saved banking revision does not match this preview market." }} />;
  }

  const media = resolvePreviewIndustryMedia(content, preview.media);
  const missingMedia = [...new Set([...preview.missingMediaIds, ...media.missingReferences])];
  if (missingMedia.length) {
    return (
      <>
        <PreviewWarningPanel warnings={preview.validationWarnings} missingMedia={missingMedia} />
        <ProtectedPreviewError error={{
          kind: "invalid-response",
          message: "This saved industry revision references draft media that is unavailable. It has not been completed with public media.",
        }} />
      </>
    );
  }

  return (
    <>
      <PreviewWarningPanel warnings={preview.validationWarnings} missingMedia={missingMedia} />
      {media.content.bankingPov
        ? <BankingEditorial view={{ ...media.content, slug: "financial-services", media: preview.media } as Parameters<typeof BankingEditorial>[0]["view"]} />
        : <IndustryEditorialView
            view={media.content as Parameters<typeof IndustryEditorialView>[0]["view"]}
            marketOverride={previewMarket}
          />}
    </>
  );
}

export default function CmsPreview() {
  const [match, params] = useRoute("/preview/:token");
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState<PreviewError>();
  const [loading, setLoading] = useState(Boolean(match && params?.token));
  const lastPreviewStatus = useRef<IndustryPreviewStatus | undefined>(undefined);
  const previewStatus = industryPreviewStatus(preview, error, loading);

  useEffect(() => {
    applyMetadata({ title: "Draft preview | Cognirise", description: "Protected CMS draft preview.", canonicalUrl: null, noIndex: true });
    // Each capability gets an independent delivery lifecycle. In particular,
    // do not retain a prior ready state while its replacement is loading.
    lastPreviewStatus.current = undefined;
    setPreview(undefined);
    setError(undefined);
    setLoading(Boolean(params?.token));
    if (!params?.token) return;

    const controller = new AbortController();
    let active = true;
    let requestNumber = 0;
    const load = async () => {
      const currentRequest = ++requestNumber;
      try {
        const response = await fetch(`/api/preview/${encodeURIComponent(params.token)}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const body: unknown = await response.json().catch(() => null);
        if (!active || currentRequest !== requestNumber) return;
        if (!response.ok) {
          setPreview(undefined);
          setError(fetchError(response, body));
          setLoading(false);
          return;
        }
        if (!isPreview(body)) {
          setPreview(undefined);
          setError({ kind: "invalid-response", message: "The preview server returned an invalid saved revision." });
          setLoading(false);
          return;
        }
        setError(undefined);
        setPreview(body);
        setLoading(false);
      } catch (caught) {
        if (!active || (caught instanceof DOMException && caught.name === "AbortError")) return;
        setPreview(undefined);
        setError({ kind: "unavailable", message: "The protected preview request could not be completed." });
        setLoading(false);
      }
    };
    void load();
    const poll = window.setInterval(() => void load(), 30_000);
    return () => {
      active = false;
      window.clearInterval(poll);
      controller.abort();
    };
  }, [params?.token]);

  useEffect(() => {
    // The parent receives only an opaque delivery state. Capability tokens,
    // revision data, diagnostics, and preview content remain in this frame.
    if (!previewStatus || window.parent === window || lastPreviewStatus.current === previewStatus) return;
    window.parent.postMessage(
      { type: "industry-preview-status", status: previewStatus },
      window.location.origin,
    );
    lastPreviewStatus.current = previewStatus;
  }, [previewStatus]);

  useEffect(() => {
    const receiveFocusRequest = (event: MessageEvent<unknown>) => {
      // This route is intentionally the only message receiver. A preview may
      // be embedded by the same-origin CMS, never controlled by another frame.
      if (
        window.parent === window
        || event.origin !== window.location.origin
        || event.source !== window.parent
      ) return;
      if (!isIndustryPreviewFocusMessage(event.data)) return;
      const section = document.querySelector<HTMLElement>(
        `[data-industry-section="${event.data.section}"]`,
      );
      if (!section) return;
      const disclosure = section.querySelector<HTMLElement>("[aria-expanded]");
      if (event.data.state && disclosure && disclosure.getAttribute("aria-expanded") !== String(event.data.state === "expanded")) {
        disclosure.click();
      }
      if (!section.hasAttribute("tabindex")) section.tabIndex = -1;
      section.focus({ preventScroll: true });
      section.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    };
    window.addEventListener("message", receiveFocusRequest);
    return () => window.removeEventListener("message", receiveFocusRequest);
  }, []);

  if (!match) return <NotFound />;
  if (error) return <ProtectedPreviewError error={error} />;
  if (!preview) return null;

  const validation = validateCmsSnapshot(preview.kind, preview.document, "draft");
  const warnings = [...preview.validationWarnings, ...(validation.success ? [] : validation.errors)];

  if (preview.kind === "industry") {
    if (!validation.success) {
      return (
        <Shell navigationOverride={preview.navigation}>
          <PreviewBanner preview={preview} />
          <PreviewWarningPanel warnings={warnings} missingMedia={preview.missingMediaIds} />
          <ProtectedPreviewError error={{
            kind: "invalid-response",
            message: "This saved industry revision has validation errors and cannot be completed from public content.",
          }} />
        </Shell>
      );
    }
    return (
      <Shell navigationOverride={preview.navigation}>
        <PreviewBanner preview={preview} />
        <IndustryPreview preview={preview} content={validation.data.content as IndustryContent} />
      </Shell>
    );
  }

  const frameworkContent = preview.kind === "framework"
    ? normalizeFrameworkPreviewContent(preview.document.content)
    : null;
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

  if (preview.kind === "framework" && framework) {
    return (
      <Shell navigationOverride={preview.navigation}>
        <main className="min-h-screen bg-background">
          <PreviewBanner preview={preview} />
          <PreviewWarningPanel warnings={warnings} missingMedia={preview.missingMediaIds} />
          <AgentAuthorityLayout framework={framework} preview />
        </main>
      </Shell>
    );
  }

  if (preview.kind === "office" && validation.success) {
    const office = validation.data.content as OfficeContent;
    return (
      <main className="min-h-screen bg-background">
        <PreviewBanner preview={preview} />
        <PreviewWarningPanel warnings={warnings} missingMedia={preview.missingMediaIds} />
        <section className="px-6 py-24">
          <div className="mx-auto max-w-[720px] border border-border bg-[hsl(var(--secondary))] p-12">
            <h3 className="mb-6 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))]">Global Offices</h3>
            <OfficeContactCard city={office.city} address={office.address} phone={office.phone} />
          </div>
        </section>
      </main>
    );
  }

  return (
    <Shell navigationOverride={preview.navigation}>
      <main className="min-h-screen bg-background">
        <PreviewBanner preview={preview} />
        <article className="mx-auto max-w-[1100px] px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">{preview.kind}</p>
          <h1 className="mt-5 text-5xl font-semibold">{typeof preview.document.title === "string" ? preview.document.title : "Saved draft"}</h1>
          {typeof preview.document.summary === "string" && <p className="mt-6 max-w-[760px] text-xl leading-8 text-muted-foreground">{preview.document.summary}</p>}
          <PreviewWarningPanel warnings={warnings} missingMedia={preview.missingMediaIds} />
          <div className="mt-14"><Content value={preview.document.content && typeof preview.document.content === "object" && !Array.isArray(preview.document.content) ? preview.document.content as Record<string, unknown> : {}} /></div>
        </article>
      </main>
    </Shell>
  );
}