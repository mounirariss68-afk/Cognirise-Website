import { BrandButton } from "@/components/ui/brand-button";
import type { IndustryPage as IndustryContent } from "@/site/content/types";
import { FIGURES_LEGEND } from "@/site/content/industries-hub";
import { PageHero } from "@/site/components/PageHero";
import { UseCaseTable, EvidenceTable } from "@/site/components/Tables";
import { Workflow } from "@/site/components/Workflow";
import { CaseCards } from "@/site/components/Cards";
import { ArrowLink, BulletList, Section, SectionHeading } from "@/site/components/Primitives";

/**
 * The industry template: hero, where AI pays off, one worked example, what we
 * have built, our view, what others have reported, the market note and how to
 * start. Six pages use it; the Public Sector page has its own composition.
 */
export function IndustryPage({ page }: { page: IndustryContent }) {
  return (
    <div className="bg-[#fdfcfb] text-[#102957]">
      <PageHero {...page.hero} />

      <Section labelledBy="usecases-heading">
        <SectionHeading id="usecases-heading">Where AI pays off</SectionHeading>
        <UseCaseTable rows={page.useCases} note={page.useCaseNote} />
      </Section>

      <Section tone="soft" labelledBy="workflow-heading">
        <SectionHeading id="workflow-heading">{page.workflow.heading}</SectionHeading>
        <Workflow steps={page.workflow.steps} outro={page.workflow.outro} />
      </Section>

      <Section labelledBy="built-heading">
        <SectionHeading id="built-heading">{page.built.heading}</SectionHeading>
        {page.built.intro && <p className="mt-6 max-w-[680px] text-[15.5px] leading-[1.6] text-[#405777]">{page.built.intro}</p>}
        <CaseCards cards={page.built.cards} columns={page.built.cards.length >= 4 ? 4 : page.built.cards.length === 3 ? 3 : 2} link={page.built.link} />
      </Section>

      <Section tone="deep" rule={false} labelledBy="view-heading">
        <div className="grid gap-8 lg:grid-cols-[0.3fr_0.7fr] lg:gap-[6vw]">
          <SectionHeading id="view-heading" size="sm" className="!text-white">{page.view.heading}</SectionHeading>
          <div>
            <p className="max-w-[760px] text-[clamp(18px,1.6vw,22px)] leading-[1.55] text-[#d7dfed]">{page.view.body}</p>
            {page.view.link && <div className="mt-6"><ArrowLink href={page.view.link.href} inverse>{page.view.link.label}</ArrowLink></div>}
          </div>
        </div>
      </Section>

      <Section labelledBy="evidence-heading">
        <SectionHeading id="evidence-heading">{page.evidence.heading}</SectionHeading>
        <EvidenceTable rows={page.evidence.rows} legend={FIGURES_LEGEND.line} />
      </Section>

      <Section tone="soft" labelledBy="market-heading">
        <div className="grid gap-6 lg:grid-cols-[0.3fr_0.7fr] lg:gap-[6vw]">
          <SectionHeading id="market-heading" size="sm">{page.market.heading}</SectionHeading>
          <p className="max-w-[680px] text-[16px] leading-[1.6] text-[#405777]">{page.market.body}</p>
        </div>
      </Section>

      <Section labelledBy="start-heading">
        <div className="grid gap-10 lg:grid-cols-[0.55fr_0.45fr] lg:gap-[6vw]">
          <div>
            <SectionHeading id="start-heading">{page.start.heading}</SectionHeading>
            <p className="mt-6 max-w-[620px] text-[16px] leading-[1.6] text-[#405777]">{page.start.body}</p>
            <div className="mt-8"><BrandButton href="/value-scan">Book a Value Scan</BrandButton></div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#6f7d94]">What to bring</p>
            <BulletList items={page.start.bring} className="mt-4" />
          </div>
        </div>
      </Section>
    </div>
  );
}
