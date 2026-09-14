import React, { useEffect, useMemo, useState } from "react";
import {
  customFetch,
  getListDocumentsQueryKey,
  useListDocuments,
  type Document,
  type DocumentPage,
  type DocumentKind,
  type ListDocumentsParams,
} from "@workspace/api-client-react";
import { useQueries } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  mergeRelationshipRecords,
  relationshipRecordHref,
  relationshipRecordLabel,
  toRelationshipRecord,
  type RelationshipRecord,
} from "./relationship-records";

const INTERNAL_DESTINATIONS = [
  "/",
  "/about",
  "/contact",
  "/value-scan",
  "/platforms",
  "/insights",
  "/industries",
  "/methodologies",
  "/work",
];

function documentDescription(document: Pick<Document, "title" | "slug" | "kind" | "status" | "markets">) {
  const markets = document.markets.length ? document.markets.join(", ") : "no market";
  return `${document.title || document.slug} · ${document.kind} · ${document.status} · ${markets}`;
}

function listDocumentsUrl(params: ListDocumentsParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `/api/documents?${encoded}` : "/api/documents";
}

export function RecordPicker({ label, value, onChange, kind, maximum = 50 }: {
  label: string;
  value: unknown;
  onChange: (value: string[]) => void;
  kind?: DocumentKind;
  maximum?: number;
}) {
  const [search, setSearch] = useState("");
  const [knownRecords, setKnownRecords] = useState<Record<string, RelationshipRecord>>({});
  const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  const params = useMemo<ListDocumentsParams>(() => ({
    page: 1,
    pageSize: 25,
    kind,
    search: search.trim() || undefined,
  }), [kind, search]);
  const result = useListDocuments(params, {
    query: { queryKey: getListDocumentsQueryKey(params) },
  });
  const candidates = result.data?.items ?? [];

  // Search is deliberately not the source of truth for selected records. A
  // changed search term must not make an already-selected title disappear.
  // Load the authorized catalogue independently (and page through it) so a
  // reload can resolve titles even when the current search is empty or narrow.
  const selectedCatalogueParams = useMemo<ListDocumentsParams>(() => ({
    page: 1,
    pageSize: 100,
    kind,
  }), [kind]);
  const selectedCatalogue = useListDocuments(selectedCatalogueParams, {
    query: {
      enabled: selected.length > 0,
      queryKey: getListDocumentsQueryKey(selectedCatalogueParams),
    },
  });
  const additionalCataloguePages = useQueries({
    queries: Array.from(
      { length: Math.max(0, (selectedCatalogue.data?.totalPages ?? 0) - 1) },
      (_, index) => {
        const pageParams: ListDocumentsParams = {
          page: index + 2,
          pageSize: 100,
          kind,
        };
        return {
          queryKey: getListDocumentsQueryKey(pageParams),
          queryFn: () => customFetch<DocumentPage>(listDocumentsUrl(pageParams), { method: "GET" }),
          enabled: selected.length > 0 && Boolean(selectedCatalogue.data),
        };
      },
    ),
  });
  const selectedCatalogueRecords = useMemo(
    () => mergeRelationshipRecords(
      (selectedCatalogue.data?.items ?? []).map(toRelationshipRecord),
      ...additionalCataloguePages.flatMap((page) => (
        page.data ? [page.data.items.map(toRelationshipRecord)] : []
      )),
    ),
    [additionalCataloguePages, selectedCatalogue.data?.items],
  );
  const currentSuggestions = useMemo(
    () => candidates.map(toRelationshipRecord),
    [candidates],
  );
  useEffect(() => {
    const discovered = mergeRelationshipRecords(currentSuggestions, selectedCatalogueRecords);
    if (discovered.length === 0) return;
    setKnownRecords((previous) => {
      let changed = false;
      const next = { ...previous };
      for (const record of discovered) {
        if (next[record.id]) continue;
        next[record.id] = record;
        changed = true;
      }
      return changed ? next : previous;
    });
  }, [currentSuggestions, selectedCatalogueRecords]);
  const resolvedRecords = useMemo(
    () => new Map(
      mergeRelationshipRecords(
        currentSuggestions,
        selectedCatalogueRecords,
        Object.values(knownRecords),
      ).map((record) => [record.id, record]),
    ),
    [currentSuggestions, knownRecords, selectedCatalogueRecords],
  );
  const selectedCatalogueLoading = selected.length > 0 && (
    selectedCatalogue.isLoading
    || selectedCatalogue.isFetching
    || additionalCataloguePages.some((page) => page.isLoading || page.isFetching)
  );
  const selectedCatalogueError = selected.length > 0 && (
    selectedCatalogue.isError || additionalCataloguePages.some((page) => page.isError)
  );
  const selectedCatalogueSettled = selected.length === 0
    || (!selectedCatalogueLoading && !selectedCatalogueError);
  const selectedCandidates = new Map(
    selected
      .map((id) => [id, resolvedRecords.get(id)] as const)
      .filter((entry): entry is [string, RelationshipRecord] => Boolean(entry[1])),
  );
  const unavailable = selected.filter((id) => !selectedCandidates.has(id));
  const add = (id: string) => {
    if (!selected.includes(id) && selected.length < maximum) {
      const candidate = resolvedRecords.get(id);
      if (candidate) {
        setKnownRecords((previous) => previous[id] ? previous : { ...previous, [id]: candidate });
      }
      onChange([...selected, id]);
    }
  };
  const remove = (id: string) => onChange(selected.filter((selectedId) => selectedId !== id));

  return (
    <section className="space-y-3">
      <div>
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">
          Optional associations are editorial pointers only. They do not reuse or replicate content, automatically create website links, or add a reciprocal association on the other record. Saving does not publish or change either record.
        </p>
      </div>
      <Input
        aria-label={`${label} search`}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={`Search ${label.toLowerCase()}`}
      />
      <section className="space-y-2" aria-labelledby={`${label.replaceAll(/[^a-z0-9]/gi, "-")}-suggestions-heading`}>
        <div>
          <h4 id={`${label.replaceAll(/[^a-z0-9]/gi, "-")}-suggestions-heading`} className="text-sm font-medium">Suggestions</h4>
          <p className="text-xs text-muted-foreground">Suggestions are authorized governed records matching this search. Results include kind, status, and market availability. Choose one to add it to the selected associations below.</p>
        </div>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border bg-muted/20 p-2" aria-live="polite">
          {result.isLoading && <p className="p-2 text-xs text-muted-foreground">Searching governed records…</p>}
          {result.isError && <p role="alert" className="p-2 text-xs text-destructive">Suggestions could not be loaded. Existing associations are preserved; try again before replacing one.</p>}
          {!result.isLoading && !result.isError && candidates.length === 0 && <p className="p-2 text-xs text-muted-foreground">No matching suggestions.</p>}
          {candidates.map((document) => {
          const isSelected = selected.includes(document.id);
          return (
            <button
              type="button"
              key={document.id}
              disabled={isSelected || selected.length >= maximum}
              onClick={() => add(document.id)}
              className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-accent disabled:cursor-default disabled:opacity-60"
              title={documentDescription(document)}
            >
              <span className="font-medium">{relationshipRecordLabel(document)}</span>
              <span className="block text-xs text-muted-foreground">{document.kind} · {document.status} · {document.markets.join(", ") || "no market availability"}</span>
              {isSelected && <span className="text-xs text-primary">Selected</span>}
            </button>
          );
          })}
        </div>
      </section>
      <section className="space-y-2" aria-label={`${label} selected associations`}>
        <div>
          <h4 className="text-sm font-medium">Selected associations</h4>
          <p className="text-xs text-muted-foreground">These references are saved on this record only. They remain selected when the suggestions change.</p>
        </div>
        {selected.map((id) => {
          const document = selectedCandidates.get(id);
          return (
            <div key={id} className="flex items-start justify-between gap-3 rounded-md border p-2 text-sm">
              <div className="min-w-0">
                {document ? (
                  <>
                    <p className="font-medium">
                      <a
                        href={relationshipRecordHref(document.id)}
                        className="rounded-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Open ${relationshipRecordLabel(document)} in the editor`}
                      >
                        {relationshipRecordLabel(document)}
                      </a>
                    </p>
                    <p className="text-xs text-muted-foreground">{documentDescription(document)}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Inaccessible existing reference</p>
                    <p className="break-all text-xs text-amber-700 dark:text-amber-300">
                      {id} — no authorized title is available. The reference is retained unchanged; search again before replacing it or remove it explicitly if it is no longer available.
                    </p>
                  </>
                )}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(id)} aria-label={`Remove ${label} reference ${id}`}>
                Remove
              </Button>
            </div>
          );
        })}
        {selected.length === 0 && <p className="text-xs text-muted-foreground">No records selected.</p>}
      </section>
      {selectedCatalogueLoading && selected.length > 0 && (
        <p role="status" className="text-xs text-muted-foreground">Resolving selected association titles through authorized records…</p>
      )}
      {selectedCatalogueError && selected.length > 0 && (
        <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">Selected association titles could not be resolved through authorized records. Existing IDs are retained unchanged.</p>
      )}
      {unavailable.length > 0 && (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
          {unavailable.length} existing reference{unavailable.length === 1 ? "" : "s"} remain pinned while inaccessible or unavailable. Removing one is an explicit editorial decision.
        </p>
      )}
      {!selectedCatalogueLoading && selectedCatalogueSettled && unavailable.length > 0 && (
        <p className="text-xs text-muted-foreground">Authorized search could not resolve these references. Their IDs remain intact so access changes never silently rewrite editorial data.</p>
      )}
    </section>
  );
}

export function EnumMultiSelect({ label, value, options, labels, onChange }: {
  label: string;
  value: unknown;
  options: readonly string[];
  labels?: Record<string, string>;
  onChange: (value: string[]) => void;
}) {
  const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  const unknown = selected.filter((item) => !options.includes(item));
  const toggle = (option: string) => onChange(
    selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option],
  );
  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-md border p-2 text-sm">
            <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
            <span>{labels?.[option] ?? option.replaceAll("-", " ")}</span>
          </label>
        ))}
      </div>
      {unknown.map((option) => (
        <div key={option} className="flex items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
          <span className="break-all text-amber-800 dark:text-amber-200">Stored value “{option}” is not in the current approved enum. It is preserved until explicitly removed.</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(selected.filter((item) => item !== option))}>Remove</Button>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Choose one or more approved values. Unrecognized stored values are never silently discarded.</p>
    </fieldset>
  );
}

export function SafeDestinationField({ label, value, onChange, required, error }: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}) {
  const destination = typeof value === "string" ? value : "";
  const valid = !destination || /^https?:\/\/[^/].*/i.test(destination) || /^\/(?!\/)[a-z0-9/_-]*(?:\?[a-z0-9&=_-]+)?(?:#[a-z0-9_-]+)?$/i.test(destination);
  const isInternal = destination.startsWith("/");
  const knownInternal = INTERNAL_DESTINATIONS.includes(destination)
    || /^\/(?:platforms|insights|industries|methodologies|work)\/[a-z0-9/_-]+$/i.test(destination);
  return (
    <div className="space-y-2">
      <Label>{label} {required && <span className="text-destructive">(required)</span>}</Label>
      <Input
        aria-label={label}
        aria-invalid={Boolean(error) || !valid}
        list={`${label.replaceAll(/[^a-z0-9]/gi, "-")}-destinations`}
        value={destination}
        onChange={(event) => onChange(event.target.value)}
        placeholder="/value-scan or https://example.com/path"
      />
      <datalist id={`${label.replaceAll(/[^a-z0-9]/gi, "-")}-destinations`}>
        {INTERNAL_DESTINATIONS.map((path) => <option value={path} key={path} />)}
      </datalist>
      <p className="text-xs text-muted-foreground">
        Use an internal path or HTTP(S) custom link. {isInternal ? "The internal destination is checked against governed routes during review." : "External links are not fetched while saving a draft."}
      </p>
      {isInternal && valid && !knownInternal && <p role="status" className="text-xs text-amber-700 dark:text-amber-300">This internal path is not in the common route suggestions. Confirm its governed destination during review; it will not block saving this draft.</p>}
      {!valid && <p role="alert" className="text-xs text-destructive">Enter an internal path beginning with / or an HTTP(S) URL.</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}