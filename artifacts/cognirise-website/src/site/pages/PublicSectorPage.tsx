import { BrandButton } from "@/components/ui/brand-button";
import { useMarketStore } from "@/store/market";
import {
  PUBLIC_SECTOR_BUILT,
  PUBLIC_SECTOR_EDITIONS,
  PUBLIC_SECTOR_ELEMENTS,
  PUBLIC_SECTOR_EVIDENCE,
  PUBLIC_SECTOR_HERO,
  PUBLIC_SECTOR_NOW_NEXT_LATER,
  PUBLIC_SECTOR_SERVICE,
  PUBLIC_SECTOR_START,
  PUBLIC_SECTOR_TEST,
  PUBLIC_SECTOR_VIEW,
} from "@/site/content/public-sector";
import { FIGURES_LEGEND } from "@/site/content/industries-hub";
import { PageHero } from "@/site/components/PageHero";
import { EvidenceTable, TextTable } from "@/site/components/Tables";
import { CaseCards, StatTiles, Timeline } from "@/site/components/Cards";
import { ActionCard } from "@/site/components/ActionCard";
import { ArrowLink, BulletList, CardGrid, Section, SectionHeading } from "@/site/components/Primitives";

export function editionForMarket(market: string) {
  return PUBLIC_SECTOR_EDITIONS.find((edition) => edition.market === market) ?? PUBLIC_SECTOR_EDITIONS[0];
}

/**
 * The Public Sector page. The hero, the test, the six elements, the redesigned
 * service, the delivery order, the cases, the view and the evidence are shared;
 * "Where the market stands" and the candidate services change with the market
 * view (UAE, KSA, Türkiye, Europe).
 */
export default function PublicSectorPage() {
  const { market } = useMarketStore();
  const edition = editionForMarket(market);

  return (
    <div className="bg-[#fdfcfb] text-[#102957]">
      <PageHero {...PUBLIC_SECTOR_HERO} />

      <Section labelledBy="test-heading">
        <div className="grid gap-6 lg:grid-cols-[0.3fr_0.7fr] lg:gap-[6vw]">
          <SectionHeading id="test-heading">{PUBLIC_SECTOR_TEST.heading}</SectionHeading>
          <p className="max-w-[680px] text-[16px] leading-[1.6] text-[#405777]">{PUBLIC_SECTOR_TEST.lead}</p>
        </div>
        <TextTable columns={PUBLIC_SECTOR_TEST.columns} rows={PUBLIC_SECTOR_TEST.rows} />
      </Section>

      <Section tone="soft" labelledBy="elements-heading">
        <SectionHeading id="elements-heading">{PUBLIC_SECTOR_ELEMENTS.heading}</SectionHeading>
        <CardGrid items={PUBLIC_SECTOR_ELEMENTS.items} columns={3} numbered />
      </Section>

      <Section labelledBy="market-heading" key={edition.market}>
        <div className="grid gap-6 lg:grid-cols-[0.45fr_0.55fr] lg:gap-[6vw]">
          <SectionHeading id="market-heading">{edition.heading}</SectionHeading>
          <p className="max-w-[640px] text-[16px] leading-[1.6] text-[#405777]">{edition.lead}</p>
        </div>
        <Timeline milestones={edition.milestones} />
        <StatTiles tiles={edition.stats} />
      </Section>

      <Section tone="soft" labelledBy="service-heading">
        <div className="grid gap-10 lg:grid-cols-[0.5fr_0.5fr] lg:gap-[6vw]">
          <div>
            <SectionHeading id="service-heading">{PUBLIC_SECTOR_SERVICE.heading}</SectionHeading>
            <p className="mt-6 max-w-[620px] text-[16px] leading-[1.6] text-[#405777]">{PUBLIC_SECTOR_SERVICE.body}</p>
          </div>
          <ActionCard />
        </div>
      </Section>

      <Section labelledBy="order-heading">
        <SectionHeading id="order-heading">{PUBLIC_SECTOR_NOW_NEXT_LATER.heading}</SectionHeading>
        <CardGrid items={PUBLIC_SECTOR_NOW_NEXT_LATER.items} columns={3} />
      </Section>

      <Section tone="soft" labelledBy="built-heading">
        <SectionHeading id="built-heading">{PUBLIC_SECTOR_BUILT.heading}</SectionHeading>
        <CaseCards cards={PUBLIC_SECTOR_BUILT.cards} columns={3} link={PUBLIC_SECTOR_BUILT.link} />
      </Section>

      <Section tone="deep" rule={false} labelledBy="view-heading">
        <div className="grid gap-8 lg:grid-cols-[0.3fr_0.7fr] lg:gap-[6vw]">
          <SectionHeading id="view-heading" size="sm" className="!text-white">{PUBLIC_SECTOR_VIEW.heading}</SectionHeading>
          <div>
            <p className="max-w-[760px] text-[clamp(18px,1.6vw,22px)] leading-[1.55] text-[#d7dfed]">{PUBLIC_SECTOR_VIEW.body}</p>
            <div className="mt-6"><ArrowLink href={PUBLIC_SECTOR_VIEW.link.href} inverse>{PUBLIC_SECTOR_VIEW.link.label}</ArrowLink></div>
          </div>
        </div>
      </Section>

      <Section labelledBy="evidence-heading">
        <SectionHeading id="evidence-heading">{PUBLIC_SECTOR_EVIDENCE.heading}</SectionHeading>
        <EvidenceTable rows={PUBLIC_SECTOR_EVIDENCE.rows} legend={FIGURES_LEGEND.line} />
      </Section>

      <Section tone="soft" labelledBy="start-heading">
        <div className="grid gap-10 lg:grid-cols-[0.55fr_0.45fr] lg:gap-[6vw]">
          <div>
            <SectionHeading id="start-heading">{PUBLIC_SECTOR_START.heading}</SectionHeading>
            <p className="mt-6 max-w-[620px] text-[16px] leading-[1.6] text-[#405777]">{PUBLIC_SECTOR_START.body}</p>
            <div className="mt-8"><BrandButton href={PUBLIC_SECTOR_START.cta.href}>{PUBLIC_SECTOR_START.cta.label}</BrandButton></div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#6f7d94]">What to bring</p>
            <BulletList items={[`${PUBLIC_SECTOR_START.candidateLabel}: ${edition.candidateServices}`, ...PUBLIC_SECTOR_START.bring]} className="mt-4" />
          </div>
        </div>
      </Section>
    </div>
  );
}
