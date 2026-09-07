import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDocumentMarketAvailabilityQueryKey,
  type Document,
  type MarketEdition,
  type MarketAvailabilityDecision,
  useGetDocumentMarketAvailability,
  usePublishDocumentMarketAvailability,
  useUpdateDocumentMarketAvailability,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const setDecision = (market: MarketEdition, decision: MarketAvailabilityDecision) => {
    update.mutate({
      documentId: person.id,
      marketEditionId: market.id,
      data: { decision },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDocumentMarketAvailabilityQueryKey(person.id) });
        toast({ title: "Availability staged", description: `${person.title} · ${market.displayName}: ${decision}. Public availability is unchanged until an administrator publishes it.` });
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
        return (
          <TableCell key={market.id} className="min-w-48 align-top">
            {availability.isLoading ? (
              <Loader2 className="mt-2 h-4 w-4 animate-spin text-muted-foreground" />
            ) : availability.isError || !item ? (
              <p className="text-xs text-destructive" role="alert">
                {errorMessage(availability.error) ?? "Availability unavailable"}
              </p>
            ) : (
              <div className="space-y-2">
                <Select
                  value={item.pendingDecision ?? item.publishedDecision}
                  onValueChange={(value) => setDecision(market, value as MarketAvailabilityDecision)}
                  disabled={!canManage || update.isPending || publish.isPending}
                >
                  <SelectTrigger className="h-8" aria-label={`${person.title} explicit availability in ${market.displayName}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Inherit</SelectItem>
                    <SelectItem value="show">Explicit on</SelectItem>
                    <SelectItem value="off">Explicit off</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant={item.publishedEffectiveAvailable ? "default" : "secondary"} className="text-[10px]">
                    Public {item.publishedEffectiveAvailable ? "on" : "off"}
                  </Badge>
                  <Badge variant={item.previewEffectiveAvailable ? "default" : "secondary"} className="text-[10px]">
                    Preview {item.previewEffectiveAvailable ? "on" : "off"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {item.hasEdition ? "Edition present" : "Fallback"}
                  </Badge>
                </div>
                {item.pendingDecision && (
                  <p className="text-[10px] text-amber-700">Staged: {item.pendingDecision}</p>
                )}
                {isAdministrator && item.pendingDecision && (
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
            Changes stage a pre-publication result. Public and preview results are shown separately; only enabled configured markets are shown.
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
                <TableHead key={market.id}>
                  <span>{market.displayName}</span>
                  <span className="ml-1 font-mono text-[10px] text-muted-foreground">({market.code})</span>
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