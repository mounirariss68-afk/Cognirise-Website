import { useEffect, useMemo, useState } from "react";
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

export default function NavigationSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [market, setMarket] = useState("uae");
  const [locale, setLocale] = useState("en");
  const params = { market, locale };
  const query = useGetNavigationSettings(params, {
    query: { queryKey: getGetNavigationSettingsQueryKey(params) },
  });
  const update = useUpdateNavigationSettings();
  const review = useReviewNavigationSettings();
  const publish = usePublishNavigationSettings();
  const [draft, setDraft] = useState<NavigationSettings | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) {
      setDraft(query.data);
    }
  }, [query.data]);

  const groups = useMemo(() => (draft?.items ?? [])
    .filter((item) => !item.parentId)
    .map((parent) => ({
      ...parent,
      children: (draft?.items ?? []).filter((item) => item.parentId === parent.id),
    })), [draft]);

  const updateItem = (id: string, change: Partial<NavigationSettings["items"][number]>) =>
    setDraft((current) => current && ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, ...change } : item),
    }));

  const save = async () => {
    if (!draft) return;
    setActionError(null);
    try {
      await update.mutateAsync({
        data: {
          items: draft.items,
          pages: draft.pages,
          market,
          locale,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetNavigationSettingsQueryKey(params) }),
        queryClient.invalidateQueries({ queryKey: getGetPublicNavigationSettingsQueryKey(params) }),
      ]);
      toast({ title: "Website navigation updated" });
    } catch (error) {
      const data = typeof error === "object" && error !== null && "data" in error
        ? (error as { data?: { details?: Array<{ message?: string }> } }).data
        : undefined;
      setActionError(data?.details?.find((detail) => detail.message)?.message
        ?? (error instanceof Error ? error.message : "Navigation could not be saved."));
    }
  };

  if (query.isPending) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.18em] text-muted-foreground">Website controls</p>
          <h1 className="mt-2 text-3xl font-semibold">Header navigation</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Turn menu and submenu links on or off. Hiding a main menu also hides its submenu; saved submenu choices return when the main menu is enabled again.
          </p>
        </div>
        <div className="flex items-center gap-3">
        <select aria-label="Market" className="h-10 rounded-md border bg-background px-3" value={market} onChange={(event) => setMarket(event.target.value)}>
          <option value="uae">UAE</option><option value="ksa">KSA</option>
          <option value="turkiye">Türkiye</option><option value="europe">Europe</option>
        </select>
        <input aria-label="Locale" className="h-10 w-24 rounded-md border bg-background px-3" value={locale} onChange={(event) => setLocale(event.target.value)} />
        <Button onClick={save} disabled={update.isPending || !draft}>
          {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save navigation
        </Button>
        <Button variant="outline" onClick={async () => {
          await review.mutateAsync({ data: { market, locale } });
          await query.refetch();
          toast({ title: "Navigation submitted for review" });
        }} disabled={review.isPending || update.isPending}>Submit for review</Button>
        <Button variant="outline" onClick={async () => {
          await publish.mutateAsync({ data: { market, locale } });
          await Promise.all([query.refetch(), queryClient.invalidateQueries({ queryKey: getGetPublicNavigationSettingsQueryKey(params) })]);
          toast({ title: "Navigation published" });
        }} disabled={publish.isPending || review.isPending}>Publish reviewed</Button>
        </div>
      </header>

      {query.isError && <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">Navigation settings could not be loaded.</div>}
      {actionError && <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{actionError}</div>}

      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.id} className="rounded-lg border bg-card">
            <div className="flex items-center justify-between gap-4 p-5">
              <div>
                <input aria-label={`${group.id} label`} className="font-semibold border rounded px-2 py-1" value={group.label} onChange={(event) => updateItem(group.id, { label: event.target.value })} />
                <input aria-label={`${group.id} destination`} className="mt-2 block w-full rounded border px-2 py-1 font-mono text-xs" value={group.destination} onChange={(event) => updateItem(group.id, { destination: event.target.value })} />
                <input aria-label={`${group.id} order`} type="number" min={0} className="mt-2 w-20 rounded border px-2 py-1 text-xs" value={group.order} onChange={(event) => updateItem(group.id, { order: Number(event.target.value) })} />
                <p className="mt-1 font-mono text-xs text-muted-foreground">Main menu</p>
              </div>
              <Switch
                aria-label={`Show ${group.label} main menu`}
                checked={group.visible}
                onCheckedChange={(checked) => updateItem(group.id, { visible: checked })}
              />
            </div>
            {group.children.length > 0 && (
              <div className="border-t bg-muted/20 px-5 py-2">
                {group.children.map((child) => (
                  <div key={child.id} className="flex items-center justify-between gap-4 border-b py-3 last:border-0">
                    <div className="flex-1">
                      <input aria-label={`${child.id} label`} className="w-full rounded border px-2 py-1 text-sm" value={child.label} onChange={(event) => updateItem(child.id, { label: event.target.value })} />
                      <input aria-label={`${child.id} destination`} className="mt-1 w-full rounded border px-2 py-1 font-mono text-xs" value={child.destination} onChange={(event) => updateItem(child.id, { destination: event.target.value })} />
                      <div className="mt-1 flex gap-2">
                        <input aria-label={`${child.id} parent`} className="w-40 rounded border px-2 py-1 font-mono text-xs" value={child.parentId ?? ""} onChange={(event) => updateItem(child.id, { parentId: event.target.value || null })} />
                        <input aria-label={`${child.id} order`} type="number" min={0} className="w-20 rounded border px-2 py-1 text-xs" value={child.order} onChange={(event) => updateItem(child.id, { order: Number(event.target.value) })} />
                      </div>
                    </div>
                    <Switch
                      aria-label={`Show ${child.label} submenu item`}
                      checked={child.visible}
                      onCheckedChange={(checked) => updateItem(child.id, { visible: checked })}
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
        <p className="mt-1 text-sm text-muted-foreground">Unavailable pages are removed from menus, direct delivery and the sitemap.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {draft?.pages.map((page) => (
            <label key={page.path} className="flex items-center justify-between gap-3 rounded border p-3 font-mono text-xs">
              {page.path}
              <Switch checked={page.enabled} aria-label={`Enable ${page.path}`} onCheckedChange={(enabled) => setDraft((current) => current && ({
                ...current, pages: current.pages.map((value) => value.path === page.path ? { ...value, enabled } : value),
              }))} />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}