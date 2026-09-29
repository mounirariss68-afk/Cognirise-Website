import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { type Document, type MarketEdition, useGetSession, getGetSessionQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { MarketAvailabilityChecklist } from "./MarketAvailabilityChecklist";

type Props = {
  person: Document;
  markets: MarketEdition[];
  canManage: boolean;
  canManageMarket?: (market: string) => boolean;
  isAdministrator: boolean;
  onOpenSharedContent: () => void;
};

function statusLabel(status: Document["status"]) {
  switch (status) {
    case "in-review":
      return "Awaiting review";
    case "approved":
      return "Approved revision; publish the exact edition and release scope";
    case "published":
      return "Content edition published; check visibility and release scope";
    case "archived":
      return "Administrator action required";
    default:
      return "Editable draft";
  }
}

function statusClass(status: Document["status"]) {
  switch (status) {
    case "published":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
    case "in-review":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700";
    case "approved":
      return "border-sky-500/20 bg-sky-500/10 text-sky-700";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function personRole(person: Document) {
  const content = person.content as unknown as { role?: unknown };
  return typeof content.role === "string" ? content.role : "Role in editor";
}

export function PeopleTableRow({
  person,
  markets,
  canManage,
  canManageMarket: canManageMarketOverride,
  isAdministrator,
  onOpenSharedContent,
}: Props) {
  const { data: session } = useGetSession({ query: { queryKey: getGetSessionQueryKey() } });
  const canManageMarket = (market: string) => canManageMarketOverride
    ? canManageMarketOverride(market)
    : canManage && Boolean(
      session?.user?.role === "administrator" || session?.user?.marketCodes?.includes(market),
    );
  const contentHref = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/content/${person.id}`;
  return (
    <TableRow className="border-border/50 align-top hover:bg-muted/20">
      <TableCell className="min-w-[13rem]">
        <a
          href={contentHref}
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onOpenSharedContent();
          }}
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="font-medium text-foreground">{person.title}</span>
          <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{person.slug}</span>
          <span className="mt-1 block text-xs capitalize text-muted-foreground">{personRole(person)}</span>
        </a>
      </TableCell>
      {markets.map((market) => (
        <TableCell key={market.id} className="whitespace-nowrap align-middle px-2">
          <MarketAvailabilityChecklist
            documentId={person.id}
            destinations={[{
              market: market.code,
              displayName: market.displayName,
              locale: market.defaultLocale,
            }]}
            canManageMarket={canManageMarket}
            isAdministrator={isAdministrator}
            releaseIndividually
            onOpenSharedContent={onOpenSharedContent}
            compact
          />
        </TableCell>
      ))}
      <TableCell className="min-w-[12rem]">
        <Badge
          variant="outline"
          className={`font-mono text-[10px] uppercase tracking-wider ${statusClass(person.status)}`}
          aria-label={`Status: ${statusLabel(person.status)}`}
        >
          {person.status.replace("-", " ")}
        </Badge>
        <p className="mt-1 max-w-[13rem] text-xs text-muted-foreground">{statusLabel(person.status)}</p>
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs font-mono text-muted-foreground">
        {format(new Date(person.updatedAt), "MMM d, yyyy HH:mm")}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={onOpenSharedContent}
             aria-label={`Open editor for ${person.title}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
             <span className="sm:not-sr-only">Open editor</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
