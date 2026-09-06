import { useEffect, useMemo, useState } from "react";
import {
  getGetNavigationSettingsQueryKey,
  getGetPublicNavigationSettingsQueryKey,
  useGetNavigationSettings,
  useUpdateNavigationSettings,
} from "@workspace/api-client-react";
import { NAVIGATION_ITEM_REGISTRY } from "@workspace/api-zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NavigationSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useGetNavigationSettings({
    query: { queryKey: getGetNavigationSettingsQueryKey() },
  });
  const update = useUpdateNavigationSettings();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (query.data) {
      setEnabled(Object.fromEntries(query.data.items.map((item) => [item.id, item.enabled])));
    }
  }, [query.data]);

  const groups = useMemo(() => NAVIGATION_ITEM_REGISTRY
    .filter((item) => !("parentId" in item))
    .map((parent) => ({
      ...parent,
      children: NAVIGATION_ITEM_REGISTRY.filter((item) => "parentId" in item && item.parentId === parent.id),
    })), []);

  const save = async () => {
    await update.mutateAsync({
      data: {
        items: NAVIGATION_ITEM_REGISTRY.map((item) => ({
          id: item.id,
          enabled: enabled[item.id] ?? true,
        })),
      },
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetNavigationSettingsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetPublicNavigationSettingsQueryKey() }),
    ]);
    toast({ title: "Website navigation updated" });
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
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save navigation
        </Button>
      </header>

      {query.isError && <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">Navigation settings could not be loaded.</div>}

      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.id} className="rounded-lg border bg-card">
            <div className="flex items-center justify-between gap-4 p-5">
              <div>
                <h2 className="font-semibold">{group.label}</h2>
                <p className="mt-1 font-mono text-xs text-muted-foreground">Main menu</p>
              </div>
              <Switch
                aria-label={`Show ${group.label} main menu`}
                checked={enabled[group.id] ?? true}
                onCheckedChange={(checked) => setEnabled((current) => ({ ...current, [group.id]: checked }))}
              />
            </div>
            {group.children.length > 0 && (
              <div className="border-t bg-muted/20 px-5 py-2">
                {group.children.map((child) => (
                  <div key={child.id} className="flex items-center justify-between gap-4 border-b py-3 last:border-0">
                    <span className="text-sm">{child.label}</span>
                    <Switch
                      aria-label={`Show ${child.label} submenu item`}
                      checked={enabled[child.id] ?? true}
                      onCheckedChange={(checked) => setEnabled((current) => ({ ...current, [child.id]: checked }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}