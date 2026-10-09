import { SERVICE_GROUPS, WHAT_WE_DO_CLOSING, WHAT_WE_DO_HERO, WHAT_WE_DO_PLATFORM } from "@/site/content/what-we-do";
import { PageHero } from "@/site/components/PageHero";
import { ClosingBand } from "@/site/components/ClosingBand";
import { ArrowLink, BulletList, Section, SectionHeading, Tag } from "@/site/components/Primitives";

export default function WhatWeDoPage() {
  return (
    <div className="bg-[#fdfcfb] text-[#102957]">
      <PageHero {...WHAT_WE_DO_HERO} />

      {SERVICE_GROUPS.map((group, groupIndex) => (
        <Section key={group.id} id={group.id} tone={groupIndex % 2 === 1 ? "soft" : "paper"} labelledBy={`${group.id}-heading`} className="scroll-mt-24">
          <div className="grid gap-10 lg:grid-cols-[0.28fr_0.72fr] lg:gap-[6vw]">
            <div>
              <span className="text-[10px] font-semibold tracking-[0.12em] text-[hsl(var(--brand-pink))]">0{groupIndex + 1}</span>
              <SectionHeading id={`${group.id}-heading`} size="lg" className="mt-3">{group.heading}</SectionHeading>
            </div>
            <div className="divide-y divide-[#cbd3e1]">
              {group.lines.map((line) => (
                <article key={line.id} id={line.id} className="scroll-mt-24 py-10 first:pt-0 last:pb-0">
                  <h3 className="font-display text-[clamp(24px,2.6vw,34px)] font-semibold leading-[1.08] tracking-[-0.045em] text-[#102957]">{line.heading}</h3>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#6f7d94]">{line.officialName}</p>
                  <p className="mt-5 max-w-[640px] text-[16px] leading-[1.6] text-[#405777]">{line.body}</p>
                  <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
                    <BulletList items={line.bullets} />
                    <div className="border border-[#cbd3e1] bg-white p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#6f7d94]">Example</p>
                      <p className="mt-3 text-[14.5px] leading-[1.55] text-[#30486d]"><strong className="text-[#102957]">{line.example.title}</strong> {line.example.body}</p>
                      <div className="mt-3"><Tag tag={line.example.tag} /></div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Section>
      ))}

      <Section tone="paper" labelledBy="platform-heading">
        <div className="grid gap-6 lg:grid-cols-[0.28fr_0.72fr] lg:gap-[6vw]">
          <SectionHeading id="platform-heading" size="sm">{WHAT_WE_DO_PLATFORM.heading}</SectionHeading>
          <div>
            <p className="max-w-[640px] text-[16px] leading-[1.6] text-[#405777]">{WHAT_WE_DO_PLATFORM.body}</p>
            <div className="mt-5"><ArrowLink href={WHAT_WE_DO_PLATFORM.link.href}>{WHAT_WE_DO_PLATFORM.link.label}</ArrowLink></div>
          </div>
        </div>
      </Section>

      <ClosingBand heading={WHAT_WE_DO_CLOSING.heading} body={WHAT_WE_DO_CLOSING.body} cta={WHAT_WE_DO_CLOSING.cta} />
    </div>
  );
}
