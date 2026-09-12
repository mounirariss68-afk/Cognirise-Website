import { useMemo, useState } from "react";
import {
  getListDocumentsQueryKey,
  useListDocuments,
  type Document,
  type DocumentKind,
  type ListDocumentsParams,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

function documentDescription(document: Document) {
  const markets = document.markets.length ? document.markets.join(", ") : "no market";
  return `${document.title || document.slug} · ${document.kind} · ${document.status} · ${markets}`;
}

function recordDisplay(document: Document) {
  return document.title || document.slug || document.id;
}

export function RecordPicker({ label, value, onChange, kind, maximum = 50 }: {
  label: string;
  value: unknown;
  onChange: (value: string[]) => void;
  kind?: DocumentKind;
  maximum?: number;
}) {
  const [search, setSearch] = useState("");
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
  const selectedCandidates = new Map(candidates.filter((item) => selected.includes(item.id)).map((item) => [item.id, item]));
  const unavailable = selected.filter((id) => !selectedCandidates.has(id));
  const add = (id: string) => {
    if (!selected.includes(id) && selected.length < maximum) onChange([...selected, id]);
  };
  const remove = (id: string) => onChange(selected.filter((selectedId) => selectedId !== id));

  return (
    <section className="space-y-3">
      <div>
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">Search by title or slug. Results include kind, status, and market availability; saving does not publish or change the selected record.</p>
      </div>
      <Input
        aria-label={`${label} search`}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={`Search ${label.toLowerCase()}`}
      />
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border bg-muted/20 p-2" aria-live="polite">
        {result.isLoading && <p className="p-2 text-xs text-muted-foreground">Searching governed records…</p>}
        {result.isError && <p role="alert" className="p-2 text-xs text-destructive">Records could not be loaded. Existing references are preserved; try again before replacing one.</p>}
        {!result.isLoading && !result.isError && candidates.length === 0 && <p className="p-2 text-xs text-muted-foreground">No matching governed records.</p>}
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
              <span className="font-medium">{recordDisplay(document)}</span>
              <span className="block text-xs text-muted-foreground">{document.kind} · {document.status} · {document.markets.join(", ") || "no market availability"}</span>
              {isSelected && <span className="text-xs text-primary">Selected</span>}
            </button>
          );
        })}
      </div>
      <div className="space-y-2" aria-label={`${label} selected records`}>
        {selected.map((id) => {
          const document = selectedCandidates.get(id);
          return (
            <div key={id} className="flex items-start justify-between gap-3 rounded-md border p-2 text-sm">
              <div className="min-w-0">
                {document ? (
                  <>
                    <p className="font-medium">{recordDisplay(document)}</p>
                    <p className="text-xs text-muted-foreground">{documentDescription(document)}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Existing reference</p>
                    <p className="break-all text-xs text-amber-700 dark:text-amber-300">
                      {id} — not in the current search result. It is retained unchanged; search for it before replacing or remove it explicitly if it is no longer available.
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
      </div>
      {unavailable.length > 0 && (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
          {unavailable.length} existing reference{unavailable.length === 1 ? "" : "s"} remain pinned while unavailable. Removing one is an explicit editorial decision.
        </p>
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