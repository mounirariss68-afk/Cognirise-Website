import { useEffect, useMemo, useRef, useState } from "react";
import {
  getGetNavigationSettingsQueryKey,
  getGetPublicNavigationSettingsQueryKey,
  useGetNavigationSettings,
  usePublishNavigationSettings,
  useReviewNavigationSettings,
  useUpdateNavigationSettings,
  type NavigationSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  navigationDestinationOptions,
  navigationParentOptions,
  navigationPositionOptions,
  navigationSnapshot,
  navigationTree,
} from "./navigation-authoring";

function actionErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const candidate = error as {
    data?: { error?: unknown; detail?: unknown; details?: Array<{ message?: string }> } | string;
    message?: unknown;
  };
  if (candidate.data && typeof candidate.data === "object") {
    const detail = candidate.data.details?.find((item) => item.message)?.message;
    if (detail) return detail;
    if (typeof candidate.data.error === "string") return candidate.data.error;
    if (typeof candidate.data.detail === "string") return candidate.data.detail;
  }
  if (typeof candidate.data === "string" && candidate.data.trim()) return candidate.data;
  return typeof candidate.message === "string" && candidate.message.trim() ? candidate.message : fallback;
}

const markets = [
  { value: "uae", label: "UAE" },
  { value: "ksa", label: "KSA" },
  { value: "turkiye", label: "Türkiye" },
  { value: "europe", label: "Europe" },
];

export function normalizeNavigationLocale(value: string): string | null {
  const normalized = value.trim().toLowerCase().replaceAll("_", "-");
  if (!normalized) return null;
  try {
    const parsed = new Intl.Locale(normalized);
    const languageName = new Intl.DisplayNames(["en"], {
      type: "language",
      fallback: "none",
    }).of(parsed.language);
    return languageName ? normalized : null;
  } catch {
    return null;
  }
}

export default function NavigationSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [market, setMarket] = useState("uae");
  const [locale, setLocale] = useState("en");
  // Keep the text being edited separate from the committed query key. This
  // prevents an empty intermediate input from disabling the query while the
  // editor has already cleared its draft.
  const [localeInput, setLocaleInput] = useState("en");
  const params = useMemo(() => ({ market, locale }), [locale, market]);
  const activeKey = `${market}:${locale}`;
  const activeKeyRef = useRef(activeKey);
  activeKeyRef.current = activeKey;
  const query = useGetNavigationSettings(params, {
    query: {
      enabled: normalizeNavigationLocale(locale) !== null,
      queryKey: getGetNavigationSettingsQueryKey(params),
    },
  });
  const update = useUpdateNavigationSettings();
  const review = useReviewNavigationSettings();
  const publish = usePublishNavigationSettings();
  const [draft, setDraft] = useState<NavigationSettings | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishVersion, setPublishVersion] = useState<number | null>(null);
  const baselineRef = useRef<NavigationSettings | null>(null);
  const hasUnsavedRef = useRef(false);
  const hydratedKeyRef = useRef("");
  const draftRef = useRef<NavigationSettings | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  draftRef.current = draft;

  // A refetch is allowed to refresh a clean edition, but never replaces a
  // locally edited draft. The requested key check also prevents a slower prior
  // market response from hydrating the newly selected edition.
  useEffect(() => {
    if (!query.data || query.data.requestedMarket !== market || query.data.requestedLocale !== locale) return;
    if (hydratedKeyRef.current === activeKey && hasUnsavedRef.current) return;
    setDraft(query.data);
    draftRef.current = query.data;
    baselineRef.current = query.data;
    hydratedKeyRef.current = activeKey;
    hasUnsavedRef.current = false;
    setHasUnsaved(false);
    setActionError(null);
  }, [activeKey, locale, market, query.data]);

  useEffect(() => {
    const dirty = Boolean(
      draft
      && baselineRef.current
      && navigationSnapshot(draft) !== navigationSnapshot(baselineRef.current),
    );
    hasUnsavedRef.current = dirty;
    setHasUnsaved(dirty);
  }, [draft]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const protectNavigation = (event: MouseEvent) => {
      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a[href]") : null;
      if (!anchor || anchor.getAttribute("target") === "_blank") return;
      if (hasUnsavedRef.current && !window.confirm("Discard unsaved navigation changes and leave this screen?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", protectNavigation, true);
    return () => document.removeEventListener("click", protectNavigation, true);
  }, []);

  const actionPending = update.isPending || review.isPending || publish.isPending;

  const switchEdition = (nextMarket: string, nextLocale: string) => {
    if (nextMarket === market && nextLocale === locale) {
      setLocaleInput(nextLocale);
      return true;
    }
    if (actionPending) return false;
    if (hasUnsavedRef.current && !window.confirm("Discard unsaved navigation changes and switch edition?")) return false;
    activeKeyRef.current = `${nextMarket}:${nextLocale}`;
    hydratedKeyRef.current = "";
    baselineRef.current = null;
    hasUnsavedRef.current = false;
    setHasUnsaved(false);
    setDraft(null);
    setActionError(null);
    setPublishConfirmOpen(false);
    setPublishVersion(null);
    setMarket(nextMarket);
    setLocale(nextLocale);
    setLocaleInput(nextLocale);
    return true;
  };

  const commitLocaleInput = () => {
    const nextLocale = normalizeNavigationLocale(localeInput);
    if (!nextLocale) {
      setActionError("Enter a recognized locale such as en, en-US, or zh-Hant before switching editions.");
      return;
    }
    if (!switchEdition(market, nextLocale)) setLocaleInput(locale);
  };

  const switchMarket = (nextMarket: string) => {
    const nextLocale = normalizeNavigationLocale(localeInput);
    if (!nextLocale) {
      setActionError("Enter a recognized locale such as en, en-US, or zh-Hant before switching editions.");
      return;
    }
    switchEdition(nextMarket, nextLocale);
  };

  const updateItem = (id: string, change: Partial<NavigationSettings["items"][number]>) => {
    if (actionPending) return;
    setDraft((current) => current && ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, ...change } : item),
    }));
  };

  const updatePage = (path: string, enabled: boolean) => {
    if (actionPending) return;
    setDraft((current) => current && ({
      ...current,
      pages: current.pages.map((page) => page.path === path ? { ...page, enabled } : page),
    }));
  };

  const save = async () => {
    const submitted = draftRef.current;
    const targetKey = activeKeyRef.current;
    if (!submitted || !hasUnsavedRef.current || actionPending) return;
    setActionError(null);
    try {
      const saved = await update.mutateAsync({
        data: {
          items: submitted.items,
          pages: submitted.pages,
          // Keep the requested target separate from the effective fallback
          // returned in the draft. A fallback can be edited intentionally,
          // but it must still be written under the selected edition key.
          market,
          locale,
          version: submitted.version,
        },
      });
      if (activeKeyRef.current !== targetKey) return;
      setDraft(saved);
      baselineRef.current = saved;
      hydratedKeyRef.current = targetKey;
      hasUnsavedRef.current = false;
      setHasUnsaved(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetNavigationSettingsQueryKey(params) }),
        queryClient.invalidateQueries({ queryKey: getGetPublicNavigationSettingsQueryKey(params) }),
      ]);
      toast({
        title: `Navigation draft version ${saved.version} saved`,
        description: "The live website is unchanged until an authorized publish.",
      });
    } catch (error) {
      if (activeKeyRef.current === targetKey) {
        setActionError(actionErrorMessage(error, "Navigation could not be saved. Your changes remain here."));
      }
    }
  };

  const submitForReview = async () => {
    const submitted = draftRef.current;
    const targetKey = activeKeyRef.current;
    if (!submitted || hasUnsavedRef.current || actionPending) return;
    setActionError(null);
    try {
      const reviewed = await review.mutateAsync({ data: { market, locale } });
      if (activeKeyRef.current !== targetKey) return;
      setDraft(reviewed);
      baselineRef.current = reviewed;
      hydratedKeyRef.current = targetKey;
      hasUnsavedRef.current = false;
      setHasUnsaved(false);
      toast({
        title: `Navigation version ${reviewed.version} submitted for review`,
        description: "Review does not change the live website.",
      });
    } catch (error) {
      if (activeKeyRef.current === targetKey) {
        setActionError(actionErrorMessage(error, "Navigation could not be submitted for review."));
      }
    }
  };

  const openPublish = () => {
    if (!draft || hasUnsaved || actionPending) return;
    setPublishVersion(draft.version);
    setPublishConfirmOpen(true);
  };

  const publishSaved = async () => {
    const submitted = draftRef.current;
    const targetKey = activeKeyRef.current;
    const exactVersion = publishVersion;
    if (!submitted || exactVersion === null || submitted.version !== exactVersion || hasUnsavedRef.current || actionPending) return;
    setActionError(null);
    try {
      const published = await publish.mutateAsync({
        data: { market, locale, version: exactVersion, confirmation: "PUBLISH" },
      });
      if (activeKeyRef.current !== targetKey) return;
      setDraft(published);
      baselineRef.current = published;
      hydratedKeyRef.current = targetKey;
      hasUnsavedRef.current = false;
      setHasUnsaved(false);
      setPublishConfirmOpen(false);
      setPublishVersion(null);
      await queryClient.invalidateQueries({ queryKey: getGetPublicNavigationSettingsQueryKey(params) });
      toast({
        title: `Navigation version ${exactVersion} published`,
        description: "The exact saved version is now live for this market and locale.",
      });
    } catch (error) {
      if (activeKeyRef.current === targetKey) {
        setActionError(actionErrorMessage(error, "Navigation could not be published. Reload the current version before retrying."));
      }
    }
  };

  const groups = useMemo(() => navigationTree(draft?.items ?? []), [draft?.items]);
  if (query.isPending && !draft) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.18em] text-muted-foreground">Website controls</p>
          <h1 className="mt-2 text-3xl font-semibold">Header navigation</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Arrange the two-level menu with named pages and parent choices. Save creates a draft; review and publishing are separate, authorized actions.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <label className="sr-only" htmlFor="navigation-market">Market</label>
          <select
            id="navigation-market"
            aria-label="Market"
            className="h-10 rounded-md border bg-background px-3"
            value={market}
            onChange={(event) => switchMarket(event.target.value)}
            disabled={actionPending}
          >
            {markets.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="navigation-locale">Locale</label>
          <input
            id="navigation-locale"
            aria-label="Locale"
            className="h-10 w-24 rounded-md border bg-background px-3"
            value={localeInput}
            onChange={(event) => {
              setLocaleInput(event.target.value);
              setActionError(null);
            }}
            onBlur={commitLocaleInput}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitLocaleInput();
              }
            }}
            disabled={actionPending}
          />
          <Button onClick={save} disabled={query.isFetching || actionPending || !draft || !hasUnsaved}>
            {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save draft
          </Button>
          <Button
            variant="outline"
            onClick={submitForReview}
            disabled={query.isFetching || actionPending || !draft || hasUnsaved}
          >
            Review version {draft?.version ?? "…"}
          </Button>
          <Button
            variant="outline"
            onClick={openPublish}
            disabled={query.isFetching || actionPending || !draft || hasUnsaved}
          >
            Publish version {draft?.version ?? "…"}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
        <span className={`rounded-full border px-3 py-1 ${hasUnsaved ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
          {hasUnsaved ? "Unsaved local changes" : "Saved draft"}
        </span>
        {draft && <span className="text-muted-foreground">Version {draft.version} · {draft.market.toUpperCase()} · {draft.locale}</span>}
        {query.isFetching && <span className="text-muted-foreground">Refreshing this edition…</span>}
        {draft?.usedFallback && (
          <span className="rounded border border-amber-300 bg-amber-50 px-3 py-1 text-amber-900">
            Editing the configured fallback {draft.market.toUpperCase()} · {draft.locale}; save only after confirming this target.
          </span>
        )}
      </div>

      {query.isError && !draft && (
        <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          Navigation settings could not be loaded. {actionErrorMessage(query.error, "Check your administrator session and try again.")}
        </div>
      )}
      {actionError && <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{actionError}</div>}

      <Dialog
        open={publishConfirmOpen}
        onOpenChange={(open) => {
          if (!publish.isPending) setPublishConfirmOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish navigation version {publishVersion}</DialogTitle>
            <DialogDescription>
              This releases the exact saved version for {market}/{locale}. Publishing is authorized separately from saving and review; pending edits cannot be included accidentally.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-muted/30 p-3 text-sm">
            Confirm that version <strong>{publishVersion}</strong> is the intended menu and page-availability configuration.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPublishConfirmOpen(false)} disabled={publish.isPending}>Cancel</Button>
            <Button onClick={publishSaved} disabled={publish.isPending || !draft || publishVersion !== draft.version}>
              {publish.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm publish version {publishVersion}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.id} className="rounded-lg border bg-card">
            <div className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <label className="text-sm font-medium">
                    Menu label
                    <input
                      aria-label={`${group.label} menu label`}
                      className="mt-1 block w-full rounded border px-2 py-1.5"
                      value={group.label}
                      onChange={(event) => updateItem(group.id, { label: event.target.value })}
                      disabled={actionPending}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Page
                    <select
                      aria-label={`${group.label} page`}
                      className="mt-1 block h-9 w-full rounded border bg-background px-2 text-sm"
                      value={group.destination}
                      onChange={(event) => updateItem(group.id, { destination: event.target.value })}
                      disabled={actionPending}
                    >
                      {navigationDestinationOptions({ pages: draft?.pages ?? [], items: draft?.items ?? [] }, group.destination).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    Position
                    <select
                      aria-label={`${group.label} position`}
                      className="mt-1 block h-9 rounded border bg-background px-2 text-sm"
                      value={String(group.order)}
                      onChange={(event) => updateItem(group.id, { order: Number(event.target.value) })}
                      disabled={actionPending}
                    >
                      {navigationPositionOptions(draft?.items.length ?? 1, group.order).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">Main menu item. Its submenu remains staged independently.</p>
              </div>
              <Switch
                aria-label={`Show ${group.label} main menu`}
                checked={group.visible}
                onCheckedChange={(checked) => updateItem(group.id, { visible: checked })}
                disabled={actionPending}
              />
            </div>
            {group.children.length > 0 && (
              <div className="space-y-3 border-t bg-muted/20 px-5 py-3">
                {group.children.map((child) => (
                  <div key={child.id} className="flex items-start justify-between gap-4 border-b py-3 last:border-0">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <label className="text-sm font-medium">
                          Submenu label
                          <input
                            aria-label={`${child.label} submenu label`}
                            className="mt-1 block w-full rounded border bg-background px-2 py-1.5"
                            value={child.label}
                            onChange={(event) => updateItem(child.id, { label: event.target.value })}
                            disabled={actionPending}
                          />
                        </label>
                        <label className="text-sm font-medium">
                          Page
                          <select
                            aria-label={`${child.label} page`}
                            className="mt-1 block h-9 w-full rounded border bg-background px-2 text-sm"
                            value={child.destination}
                            onChange={(event) => updateItem(child.id, { destination: event.target.value })}
                            disabled={actionPending}
                          >
                            {navigationDestinationOptions({ pages: draft?.pages ?? [], items: draft?.items ?? [] }, child.destination).map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm font-medium">
                          Position
                          <select
                            aria-label={`${child.label} position`}
                            className="mt-1 block h-9 rounded border bg-background px-2 text-sm"
                            value={String(child.order)}
                            onChange={(event) => updateItem(child.id, { order: Number(event.target.value) })}
                            disabled={actionPending}
                          >
                            {navigationPositionOptions(draft?.items.length ?? 1, child.order).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </label>
                      </div>
                      <label className="block text-sm font-medium">
                        Parent menu
                        <select
                          aria-label={`${child.label} parent menu`}
                          className="mt-1 block h-9 w-full rounded border bg-background px-2 text-sm"
                          value={child.parentId ?? ""}
                          onChange={(event) => updateItem(child.id, { parentId: event.target.value || null })}
                          disabled={actionPending}
                        >
                          {navigationParentOptions(draft?.items ?? [], child.id).map((option) => (
                            <option key={option.value || "top-level"} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <Switch
                      aria-label={`Show ${child.label} submenu item`}
                      checked={child.visible}
                      onCheckedChange={(checked) => updateItem(child.id, { visible: checked })}
                      disabled={actionPending}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Page availability</h2>
        <p className="mt-1 text-sm text-muted-foreground">Unavailable pages are removed from menus, direct delivery and the sitemap. This decision is staged with the navigation draft.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {draft?.pages.map((page) => (
            <label key={page.path} className="flex items-center justify-between gap-3 rounded border p-3 text-sm">
              <span className="font-mono">{page.path}</span>
              <Switch
                checked={page.enabled}
                aria-label={`Enable ${page.path}`}
                onCheckedChange={(enabled) => updatePage(page.path, enabled)}
                disabled={actionPending}
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}