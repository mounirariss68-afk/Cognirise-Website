import { assetUrl } from "@/lib/assets";
import { PulseImage } from "@/components/ui/pulse-image";
import { BrandButton } from "@/components/ui/brand-button";
import { ABOUT_ADVISORS, ABOUT_FIRM, ABOUT_FOUNDERS, ABOUT_HERO, ABOUT_OFFICES, ABOUT_VALUES, type Person } from "@/site/content/about";
import { PageHero } from "@/site/components/PageHero";
import { ArrowLink, Section, SectionHeading } from "@/site/components/Primitives";

function People({ people, compact = false }: { people: Person[]; compact?: boolean }) {
  return (
    <ul className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2 lg:gap-[5vw]">
      {people.map((person) => (
        <li key={person.name} className="grid grid-cols-[112px_1fr] gap-6 sm:grid-cols-[150px_1fr]">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#071936]" style={{ clipPath: "polygon(8% 0, 100% 0, 100% 94%, 0 100%, 0 8%)" }}>
            <PulseImage src={assetUrl(person.image)} alt={person.name} className="h-full w-full object-cover" />
          </div>
          <div>
            <h3 className="font-display text-[22px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#102957]">{person.name}</h3>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#6f7d94]">{person.role}</p>
            <div className={`mt-4 space-y-3 leading-[1.6] text-[#405777] ${compact ? "text-[14px]" : "text-[14.5px]"}`}>
              {person.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AboutPage() {
  return (
    <div className="bg-[#fdfcfb] text-[#102957]">
      <PageHero {...ABOUT_HERO} />

      <Section labelledBy="firm-heading">
        <div className="grid gap-6 lg:grid-cols-[0.3fr_0.7fr] lg:gap-[6vw]">
          <SectionHeading id="firm-heading" size="sm">{ABOUT_FIRM.heading}</SectionHeading>
          <p className="max-w-[720px] text-[17px] leading-[1.6] text-[#405777]">{ABOUT_FIRM.body}</p>
        </div>
      </Section>

      <Section tone="soft" labelledBy="values-heading">
        <SectionHeading id="values-heading">{ABOUT_VALUES.heading}</SectionHeading>
        <ul className="mt-10 grid grid-cols-1 gap-px border border-[#cbd3e1] bg-[#cbd3e1] md:grid-cols-2">
          {ABOUT_VALUES.items.map((value) => (
            <li key={value.title} className="bg-[#fdfcfb] p-7">
              <h3 className="font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.035em] text-[#102957]">{value.title}</h3>
              <p className="mt-4 text-[15px] leading-[1.6] text-[#405777]">{value.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6"><ArrowLink href={ABOUT_VALUES.link.href}>{ABOUT_VALUES.link.label}</ArrowLink></div>
      </Section>

      <Section labelledBy="founders-heading">
        <SectionHeading id="founders-heading">{ABOUT_FOUNDERS.heading}</SectionHeading>
        <People people={ABOUT_FOUNDERS.people} />
      </Section>

      <Section tone="soft" labelledBy="advisors-heading">
        <SectionHeading id="advisors-heading">{ABOUT_ADVISORS.heading}</SectionHeading>
        <People people={ABOUT_ADVISORS.people} compact />
      </Section>

      <Section id="contact" labelledBy="contact-heading" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.3fr_0.7fr] lg:gap-[6vw]">
          <SectionHeading id="contact-heading" size="sm">{ABOUT_OFFICES.heading}</SectionHeading>
          <div>
            <ul className="divide-y divide-[#cbd3e1] border-y border-[#102957]">
              {ABOUT_OFFICES.offices.map((office) => (
                <li key={office.city} className="grid gap-1 py-4 text-[15px] leading-[1.5] text-[#30486d] sm:grid-cols-[140px_1fr] sm:gap-6">
                  <strong className="text-[#102957]">{office.city}</strong>
                  <span>{office.address}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-[640px] text-[15.5px] leading-[1.6] text-[#405777]">
              General enquiries, press and partnerships: <a href={`mailto:${ABOUT_OFFICES.email}`} className="font-semibold text-[#102957] underline decoration-[hsl(var(--brand-pink))]/40 underline-offset-4 hover:text-[hsl(var(--brand-pink))]">{ABOUT_OFFICES.email}</a>. To discuss a process, book a Value Scan.
            </p>
            <div className="mt-8"><BrandButton href={ABOUT_OFFICES.cta.href}>{ABOUT_OFFICES.cta.label}</BrandButton></div>
          </div>
        </div>
      </Section>
    </div>
  );
}
