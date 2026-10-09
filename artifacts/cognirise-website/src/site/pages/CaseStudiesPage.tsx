import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { CASE_GROUPS, CASE_INDUSTRIES, CASE_STUDIES, CASE_STUDIES_CLOSING, CASE_STUDIES_HERO, CASE_STUDIES_LEGEND } from "@/site/content/case-studies";
import { PageHero } from "@/site/components/PageHero";
import { ClosingBand } from "@/site/components/ClosingBand";
import { CaseCards } from "@/site/components/Cards";
import { Section, SectionHeading } from "@/site/components/Primitives";

type Filter = (typeof CASE_INDUSTRIES)[number];

/**
 * Twenty-two cases in four groups. Filter chips narrow the list in the browser;
 * the chosen chip is kept in the query string so a filtered view can be linked.
 */
export default function CaseStudiesPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const fromUrl = new URLSearchParams(search).get("industry");
  const initial = (CASE_INDUSTRIES as readonly string[]).includes(fromUrl ?? "") ? (fromUrl as Filter) : "All";
  const [filter, setFilter] = useState<Filter>(initial);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (filter === "All") params.delete("industry"); else params.set("industry", filter);
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) navigate(next, { replace: true });
  }, [filter, navigate]);

  const groups = useMemo(() => CASE_GROUPS.map((group) => ({
    group,
    cards: CASE_STUDIES.filter((c) => c.group === group && (filter === "All" || c.industry === filter)),
  })).filter((entry) => entry.cards.length > 0), [filter]);

  return (
    <div className="bg-[#fdfcfb] text-[#102957]">
      <PageHero {...CASE_STUDIES_HERO} />

      <section className="home-layout-frame border-t border-[#cbd3e1] pt-10" aria-label="How to read the figures and filter">
        <p className="max-w-[760px] text-[14px] leading-[1.6] text-[#647491]">{CASE_STUDIES_LEGEND}</p>
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by industry">
          {CASE_INDUSTRIES.map((industry) => (
            <button
              key={industry}
              type="button"
              aria-pressed={filter === industry}
              onClick={() => setFilter(industry)}
              className={`border px-4 py-2 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] ${filter === industry ? "border-[#102957] bg-[#102957] text-white" : "border-[#cbd3e1] bg-[#fdfcfb] text-[#102957] hover:border-[#102957]"}`}
            >
              {industry}
            </button>
          ))}
        </div>
      </section>

      {groups.map((entry, index) => (
        <Section key={entry.group} labelledBy={`group-${index}`} rule={index > 0} className="[&>div]:pt-10 [&>div]:lg:pt-14">
          <SectionHeading id={`group-${index}`} size="sm">{entry.group}</SectionHeading>
          <CaseCards cards={entry.cards.map(({ industry, ...card }) => ({ ...card, industry }))} columns={entry.cards.length === 1 ? 2 : 3} />
        </Section>
      ))}

      <ClosingBand heading={CASE_STUDIES_CLOSING.heading} body={CASE_STUDIES_CLOSING.body} cta={CASE_STUDIES_CLOSING.cta} watermark="WORK" />
    </div>
  );
}
