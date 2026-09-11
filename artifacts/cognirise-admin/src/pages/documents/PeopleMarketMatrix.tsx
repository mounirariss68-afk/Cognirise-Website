import { type Document, type MarketEdition } from "@workspace/api-client-react";
import { Lock } from "lucide-react";
import { useLocation } from "wouter";
import { MarketAvailabilityChecklist } from "./MarketAvailabilityChecklist";

type Props = {
  people: Document[];
  markets: MarketEdition[];
  canManage: boolean;
  isAdministrator: boolean;
};

export function PeopleMarketMatrix({ people, markets, canManage, isAdministrator }: Props) {
  const [, setLocation] = useLocation();
  return (
    <section className="mb-8 rounded-xl border border-border bg-card shadow-sm" aria-labelledby="people-market-heading">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <h2 id="people-market-heading" className="font-semibold">People market availability</h2>
           <p className="mt-1 text-xs text-muted-foreground">Checked means shown; unchecked means excluded. Changes remain pending until an administrator publishes them.</p>
          {!canManage && (
            <p className="mt-2 flex items-center gap-1 text-xs text-amber-700">
              <Lock className="h-3 w-3" /> Editor, publisher, or administrator permission is required to stage availability.
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        {people.map((person) => (
          <article key={person.id} className="rounded-lg border bg-background p-4">
            <div className="mb-3">
              <h3 className="font-medium">{person.title}</h3>
              <p className="font-mono text-xs text-muted-foreground">{person.slug}</p>
            </div>
            <MarketAvailabilityChecklist
              documentId={person.id}
              destinations={markets.map((market) => ({ market: market.code, displayName: market.displayName, locale: market.defaultLocale }))}
              canManageMarket={() => canManage}
              isAdministrator={isAdministrator}
              releaseIndividually
              onOpenSharedContent={() => setLocation(`/content/${person.id}`)}
            />
          </article>
        ))}
      </div>
    </section>
  );
}