import { HOW_WE_WORK_CLOSING, HOW_WE_WORK_HERO, HOW_WE_WORK_METHODS, HOW_WE_WORK_NEEDS, HOW_WE_WORK_RULES, HOW_WE_WORK_SITUATIONS, HOW_WE_WORK_STEPS, METHODS } from "@/site/content/how-we-work";
import { PageHero } from "@/site/components/PageHero";
import { FourSteps } from "@/site/components/FourSteps";
import { ClosingBand } from "@/site/components/ClosingBand";
import { TextTable } from "@/site/components/Tables";
import { ArrowLink, BulletList, RuleList, Section, SectionHeading } from "@/site/components/Primitives";

export default function HowWeWorkPage() {
  return (
    <div className="bg-[#fdfcfb] text-[#102957]">
      <PageHero {...HOW_WE_WORK_HERO} />

      <FourSteps heading={HOW_WE_WORK_STEPS.heading} afterTable={HOW_WE_WORK_STEPS.afterTable} />

      <Section tone="soft" labelledBy="needs-heading">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-[6vw]">
          <div>
            <SectionHeading id="needs-heading" size="sm">{HOW_WE_WORK_NEEDS.heading}</SectionHeading>
            <BulletList items={HOW_WE_WORK_NEEDS.items} className="mt-8" />
          </div>
          <div>
            <SectionHeading id="rules-heading" size="sm">{HOW_WE_WORK_RULES.heading}</SectionHeading>
            <RuleList items={HOW_WE_WORK_RULES.items} />
          </div>
        </div>
      </Section>

      <Section labelledBy="situations-heading">
        <SectionHeading id="situations-heading">{HOW_WE_WORK_SITUATIONS.heading}</SectionHeading>
        <TextTable columns={HOW_WE_WORK_SITUATIONS.columns} rows={HOW_WE_WORK_SITUATIONS.rows} />
      </Section>

      <Section tone="soft" labelledBy="methods-heading">
        <SectionHeading id="methods-heading">{HOW_WE_WORK_METHODS.heading}</SectionHeading>
        <ul className="mt-10 grid grid-cols-1 gap-px border border-[#cbd3e1] bg-[#cbd3e1] md:grid-cols-2 xl:grid-cols-3">
          {METHODS.map((method) => (
            <li key={method.name} className="flex flex-col gap-3 bg-[#fdfcfb] p-6">
              <h3 className="font-display text-[20px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#102957]">{method.name}</h3>
              <p className="text-[14.5px] leading-[1.55] text-[#405777]">{method.body}</p>
              <div className="mt-auto pt-2"><ArrowLink href={method.link.href}>{method.link.label}</ArrowLink></div>
            </li>
          ))}
        </ul>
      </Section>

      <ClosingBand heading={HOW_WE_WORK_CLOSING.heading} body={HOW_WE_WORK_CLOSING.body} cta={HOW_WE_WORK_CLOSING.cta} />
    </div>
  );
}
