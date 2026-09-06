import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { type CmsDocumentKind, validateCmsSnapshot } from "@workspace/api-zod";
import NotFound from "@/pages/not-found";
import { applyMetadata } from "@/lib/metadata";

type Preview = {
  kind: CmsDocumentKind;
  document: Record<string, any>;
  market: string;
  locale: string;
  revisionId: string;
  revisionNumber: number;
  usedFallback: boolean;
  missingMediaIds: string[];
  validationWarnings: string[];
};

function Content({ value }: { value: Record<string, any> }) {
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

export default function CmsPreview() {
  const [match, params] = useRoute("/preview/:token");
  const [preview, setPreview] = useState<Preview>();
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    applyMetadata({ title: "Draft preview | Cognirise", description: "Protected CMS draft preview.", noIndex: true });
    if (!params?.token) return;
    fetch(`/api/preview/${encodeURIComponent(params.token)}`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<Preview>;
      })
      .then(setPreview)
      .catch(() => setMissing(true));
  }, [params?.token]);
  if (!match || missing) return <NotFound />;
  if (!preview) return null;
  const validation = validateCmsSnapshot(preview.kind, preview.document, "draft");
  const warnings = [...preview.validationWarnings, ...(validation.success ? [] : validation.errors)];
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-6 py-4 text-amber-950">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3">
          <strong>Protected draft preview — not published</strong>
          <span className="font-mono text-xs uppercase">{preview.market} / {preview.locale} · revision {preview.revisionNumber}{preview.usedFallback ? " · fallback" : ""}</span>
        </div>
      </header>
      <article className="mx-auto max-w-[1100px] px-6 py-16">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">{preview.kind}</p>
        <h1 className="mt-5 text-5xl font-semibold">{preview.document.title}</h1>
        {preview.document.summary && <p className="mt-6 max-w-[760px] text-xl leading-8 text-muted-foreground">{preview.document.summary}</p>}
        {(warnings.length > 0 || preview.missingMediaIds.length > 0) && <aside className="my-10 border border-amber-300 bg-amber-50 p-5" role="alert">
          <h2 className="font-semibold">Review warnings</h2>
          <ul className="mt-3 list-disc pl-5 text-sm">{warnings.map((warning) => <li key={warning}>{warning}</li>)}{preview.missingMediaIds.map((id) => <li key={id}>Media unavailable: {id}</li>)}</ul>
        </aside>}
        <div className="mt-14"><Content value={preview.document.content ?? {}} /></div>
      </article>
    </main>
  );
}