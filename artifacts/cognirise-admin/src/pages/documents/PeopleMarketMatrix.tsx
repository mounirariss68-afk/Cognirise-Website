import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDocumentMarketAvailabilityQueryKey,
  type Document,
  type MarketEdition,
  useGetDocumentMarketAvailability,
  usePublishDocumentMarketAvailability,
  useUpdateDocumentMarketAvailability,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Send } from "lucide-react";

type Props = {
  people: Document[];
  markets: MarketEdition[];
  canManage: boolean;
  isAdministrator: boolean;
};

function errorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as { error?: string; message?: string };
    return candidate.error ?? candidate.message;
  }
  return undefined;
}

function PersonAvailabilityRow({ person, markets, canManage, isAdministrator }: {
  person: Document;
  markets: MarketEdition[];
  canManage: boolean;
  isAdministrator: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const availability = useGetDocumentMarketAvailability(person.id);
  const update = useUpdateDocumentMarketAvailability();
  const publish = usePublishDocumentMarketAvailability();
  const byMarket = new Map(availability.data?.items.map((item) => [item.marketEditionId, item]));

  const setAvailability = (market: MarketEdition, available: boolean) => {
    const decision = available ? "show" : "off";
    update.mutate({
      documentId: person.id,
      marketEditionId: market.id,
      data: { decision },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDocumentMarketAvailabilityQueryKey(person.id) });
        toast({
          title: "Change staged",
          description: `${person.title} is ${available ? "available" : "hidden"} in ${market.displayName} after publication.`,
        });
      },
      onError: (error) => toast({
        title: "Availability was not changed",
        description: errorMessage(error) ?? "Your role may not have permission to manage market availability.",
        variant: "destructive",
      }),
    });
  };
  const publishDecision = (market: MarketEdition) => {
    publish.mutate({ documentId: person.id, marketEditionId: market.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDocumentMarketAvailabilityQueryKey(person.id) });
        toast({ title: "Availability published", description: `${person.title} is updated for ${market.displayName}.` });
      },
      onError: (error) => toast({
        title: "Availability was not published",
        description: errorMessage(error) ?? "Only administrators can publish staged availability.",
        variant: "destructive",
      }),
    });
  };

  return (
    <TableRow>
      <TableCell className="min-w-56">
        <div className="font-medium">{person.title}</div>
        <div className="font-mono text-xs text-muted-foreground">{person.slug}</div>
      </TableCell>
      {markets.map((market) => {
        const item = byMarket.get(market.id);
        const hasPendingChange = Boolean(item?.pendingDecision);
        const checked = hasPendingChange
          ? item?.previewEffectiveAvailable
          : item?.publishedEffectiveAvailable;
        return (
          <TableCell key={market.id} className="min-w-36 align-top">
            {availability.isLoading ? (
              <div className="flex items-center justify-center py-2" aria-label={`Loading ${person.title} availability in ${market.displayName}`}>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : availability.isError || !item ? (
              <p className="text-xs text-destructive" role="alert">
                {errorMessage(availability.error) ?? "Availability unavailable"}
              </p>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(nextChecked) => setAvailability(market, nextChecked === true)}
                  disabled={!canManage || update.isPending || publish.isPending}
                  aria-label={`${person.title} available in ${market.displayName}`}
                  className="mt-1 h-5 w-5"
                />
                {hasPendingChange ? (
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-800">
                      Pending: {item.previewEffectiveAvailable ? "Available" : "Hidden"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Live: {item.publishedEffectiveAvailable ? "Available" : "Hidden"}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    Live: {item.publishedEffectiveAvailable ? "Available" : "Hidden"}
                  </span>
                )}
                {isAdministrator && hasPendingChange && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-full gap-1 text-[10px]"
                    disabled={publish.isPending || update.isPending}
                    onClick={() => publishDecision(market)}
                  >
                    {publish.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Publish
                  </Button>
                )}
              </div>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

export function PeopleMarketMatrix({ people, markets, canManage, isAdministrator }: Props) {
  return (
    <section className="mb-8 rounded-xl border border-border bg-card shadow-sm" aria-labelledby="people-market-heading">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <h2 id="people-market-heading" className="font-semibold">People market availability</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Checked means available; unchecked means hidden. Changes remain pending until an administrator publishes them.
          </p>
          {!canManage && (
            <p className="mt-2 flex items-center gap-1 text-xs text-amber-700">
              <Lock className="h-3 w-3" /> Editor, publisher, or administrator permission is required to stage availability.
            </p>
          )}
        </div>
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              {markets.map((market) => (
                <TableHead key={market.id} className="min-w-36 text-center">
                  <span>{market.displayName}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => (
              <PersonAvailabilityRow key={person.id} person={person} markets={markets} canManage={canManage} isAdministrator={isAdministrator} />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}