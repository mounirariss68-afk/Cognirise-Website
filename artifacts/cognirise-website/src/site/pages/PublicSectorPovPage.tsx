import { Link } from "wouter";
import { MARKET_OPTIONS, useMarketStore } from "@/store/market";
import {
  POV_CLOSING,
  POV_IMPACT,
  POV_META,
  POV_SOURCES_HEADING,
  POV_SOURCES_LEAD,
  povChapters,
  povEdition,
  type PovBlock,
} from "@/site/content/public-sector-pov";
import { PageHero } from "@/site/components/PageHero";
import { ClosingBand } from "@/site/components/ClosingBand";
import { TextTable } from "@/site/components/Tables";
import { BulletList, CardGrid, Kicker, Section, SectionHeading } from "@/site/components/Primitives";

function Block({ block }: { block: PovBlock }) {
  switch (block.kind) {
    case "p":
      return <p className="max-w-[720px] text-[16px] leading-[1.65] text-[#30486d]">{block.text}</p>;
    case "h3":
      return <h3 className="pt-2 font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#102957]">{block.text}</h3>;
    case "ul":
      return <BulletList items={block.items} className="max-w-[760px]" />;
    case "table":
      return <TextTable columns={block.columns} rows={block.rows} caption={block.caption} />;
    case "note":
      return <p className="max-w-[720px] border-l-2 border-[hsl(var(--brand-pink))] pl-4 text-[14px] leading-[1.55] text-[#536887]">{block.text}</p>;
  }
}

/**
 * The public-sector point of view: six chapters on what changes, the benefits
 * the evidence supports, and the sources. The market view picks the edition.
 */
export default function PublicSectorPovPage() {
  const { market, setMarket } = useMarketStore();
  const edition = povEdition(market);
  const chapters = povChapters(edition);

  return (
    <div className="bg-[#fdfcfb] text-[#102957]">
      <PageHero
        kicker={`${POV_META.kicker} · ${edition.label}`}
        title={POV_META.title}
        lead={`${POV_META.lead} ${edition.leadClose}`}
        primary={POV_META.primary}
        secondary={POV_META.secondary}
        image={POV_META.image}
      >
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#536887]">
          <span className="font-semibold uppercase tracking-[0.12em] text-[10px] text-[#102957]">{POV_META.editionsLabel}</span>
          {MARKET_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMarket(option.id)}
              aria-pressed={option.id === edition.market}
              className={`underline-offset-4 ${option.id === edition.market ? "font-semibold text-[#102957] underline decoration-[hsl(var(--brand-pink))]" : "hover:text-[#102957] hover:underline"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PageHero>

      <Section labelledBy="pov-pointer" key={edition.market}>
        <p id="pov-pointer" className="max-w-[720px] text-[16px] leading-[1.6] text-[#405777]">
          {POV_META.pointer}{" "}
          <Link href="/industries/public-sector" className="font-semibold text-[#102957] underline decoration-[hsl(var(--brand-pink))]/40 underline-offset-4 hover:decoration-[hsl(var(--brand-pink))]">Public Sector page</Link>. This article is the argument behind them.
        </p>
      </Section>

      {chapters.map((chapter, index) => (
        <Section key={chapter.num} tone={index % 2 === 1 ? "soft" : "paper"} labelledBy={`chapter-${chapter.num}`}>
          <Kicker>What changes · {chapter.num}</Kicker>
          <SectionHeading id={`chapter-${chapter.num}`} className="mt-5 max-w-[860px]">{chapter.title}</SectionHeading>
          <div className="mt-8 space-y-6">
            {chapter.blocks.map((block, blockIndex) => <Block key={blockIndex} block={block} />)}
          </div>
        </Section>
      ))}

      <Section labelledBy="impact-heading">
        <Kicker>Impact and benefits</Kicker>
        <SectionHeading id="impact-heading" className="mt-5 max-w-[860px]">{POV_IMPACT.heading}</SectionHeading>
        <p className="mt-6 max-w-[720px] text-[16px] leading-[1.6] text-[#405777]">{POV_IMPACT.lead}</p>
        <CardGrid items={POV_IMPACT.benefits} columns={4} />
        <p className="mt-8 max-w-[760px] border-l-2 border-[hsl(var(--brand-pink))] pl-4 text-[15px] leading-[1.6] text-[#30486d]">{edition.applicability}</p>
        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-[5vw]">
          <div className="space-y-6">
            <h3 className="font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#102957]">{POV_IMPACT.timeHeading}</h3>
            <p className="text-[16px] leading-[1.65] text-[#30486d]">{POV_IMPACT.time}</p>
            <h3 className="pt-2 font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#102957]">{POV_IMPACT.caseHeading}</h3>
            <p className="text-[16px] leading-[1.65] text-[#30486d]">{POV_IMPACT.caseBody}</p>
            <p className="border-l-2 border-[hsl(var(--brand-coral))] pl-4 text-[15px] font-semibold leading-[1.55] text-[#102957]">{POV_IMPACT.caseNote}</p>
          </div>
          <div className="space-y-6">
            <h3 className="font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#102957]">{POV_IMPACT.measureHeading}</h3>
            <p className="text-[16px] leading-[1.65] text-[#30486d]">{POV_IMPACT.measure}</p>
          </div>
        </div>
      </Section>

      <Section tone="soft" labelledBy="sources-heading">
        <SectionHeading id="sources-heading" size="sm">{POV_SOURCES_HEADING}</SectionHeading>
        <p className="mt-5 max-w-[720px] text-[15px] leading-[1.6] text-[#405777]">{POV_SOURCES_LEAD}</p>
        <ol className="mt-8 grid gap-x-10 gap-y-4 border-t border-[#102957] pt-6 md:grid-cols-2">
          {edition.sources.map((source, index) => (
            <li key={source.url} className="grid grid-cols-[32px_1fr] gap-2 text-[14px] leading-[1.5]">
              <span className="pt-[2px] text-[10px] font-semibold tracking-[0.12em] text-[hsl(var(--brand-pink))]">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-[#102957] underline decoration-[hsl(var(--brand-pink))]/40 underline-offset-4 hover:decoration-[hsl(var(--brand-pink))]">{source.label}</a>
                <span className="block text-[#536887]">{source.note}</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <ClosingBand heading={POV_CLOSING.heading} body={POV_CLOSING.body} cta={POV_CLOSING.cta} secondary={POV_CLOSING.secondary} />
    </div>
  );
}
