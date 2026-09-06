import { BrandButton } from "@/components/ui/brand-button";
import { contentRecord, useCmsCollection, useCmsEntry } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";

const advisorsFallback = [
  {
    initials: "AL", name: "Alexis Lecanuet", role: "Advisory Board Member", title: "Regional Senior Managing Director, Accenture Middle East",
    background: "A 24-year Accenture career culminating in leadership of the firm's Middle East business — strategy execution, client portfolio leadership and regional operations. Previously built and expanded Accenture's products portfolio across the Middle East and Türkiye, with deep roots in consumer, retail and large-scale digital transformation across Europe and MENA. Ranked among Forbes Middle East's “Global Meets Local” top 50 executives; board member of INJAZ ME; educated at ESCP Europe and SKEMA.",
    contribution: "The incumbent's playbook, from the inside: how global consultancies win, price and scale in this region — so our senior-led, platform-powered model is sharpened precisely where the traditional model is weakest.",
    source: "Profile per AmCham Abu Dhabi bio, Forbes Middle East and Consultancy-me.com, accessed August 2026.",
  },
  {
    initials: "RA", name: "Rami Aslan", role: "Advisory Board Member", title: "Former CEO, Türk Telekom · Investor & Board Member",
    background: "More than 25 years across North America, Europe, the Middle East and Africa. CEO of Türk Telekom (2013–2017) — Türkiye's largest telecom operator, with some 35,000 employees serving 40+ million customers — after leading Oger Telecom as CEO and executive board member. Earlier, head of M&A and corporate finance at the Oger Group, concluding transactions exceeding US$25 billion, following banking roles at Citigroup and TD covering telecom and technology. Board roles have spanned Avea, TTNET, Cell-C and operators across four more countries. Since 2018, a co-founder of venture and private-equity initiatives. McGill BCom and MBA.",
    contribution: "The operator's seat: what transformation looks like when you're accountable for 35,000 people and a nation's network — plus an investor's discipline on our economics and a telecom depth that anchors one of our core industries.",
    source: "Profile per McGill Desautels advisory board bio and public announcements, accessed August 2026.",
  },
  {
    initials: "FM", name: "Fadi Mattar", role: "Advisory Board Member", title: "Public & Government Affairs Director — IMEA & Türkiye, and Country Director Kuwait & Levant, Dow",
    background: "A senior corporate-affairs and country leader at Dow, responsible for public and government affairs across India, the Middle East, Africa and Türkiye, and for Dow's business in Kuwait and the Levant. His Dow decade spans public affairs, government relations and country leadership; before Dow he headed corporate communications at EQUATE Petrochemical, served as Marketing Director for MENA at American Express, and held corporate communications and marketing roles at Citibank across the UAE, Bahrain and Oman — a career bridging energy & petrochemicals, financial services, and the corridors where business meets government in the Gulf.",
    contribution: "The stakeholder map: how large industrials and governments in the Gulf actually make decisions — sharpening our energy & resources proposition, our public-sector posture, and how the Cognirise story lands with boards, ministries and media.",
    source: "Profile per Dow announcements and public executive profiles (publicly spelled “Fadi Matar”), accessed August 2026.",
  },
];

export default function Advisors() {
  const advisorsQuery = useCmsCollection("person", advisorsFallback, (item) => {
    const content = contentRecord(item, "person");
    if (content.role !== "advisor") return null;
    const name = item.title;
    return {
      initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2),
      name,
      role: "Advisory Board Member",
      title: content.title,
      background: content.biography,
      contribution: content.contribution || "",
      source: content.sources.map((source) => source.label).join("; "),
    };
  });
  const page = useCmsEntry("person", "advisors");
  useDynamicMetadata(page.data?.seo && metadataFromSeo(page.data.seo, {
    title: "Advisors | Cognirise",
    description: "Senior strategic guidance shaping Cognirise capability and delivery.",
  }));
  const advisors = advisorsQuery.data;

  return (
    <main className="overflow-hidden">
      <section className="relative bg-[hsl(var(--brand-deep))] px-6 py-24 text-white md:px-12 md:py-32">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[hsl(var(--brand-violet))]/30 blur-3xl" />
        <div className="relative mx-auto max-w-[1440px]">
          <p className="mb-8 text-[10px] font-bold uppercase tracking-[.2em] text-white/55">Our advisors / counsel at scale</p>
          <h1 className="max-w-[1050px] text-5xl font-semibold leading-[.94] md:text-7xl lg:text-[100px]">The counsel of people <span className="brand-gradient-text">who’ve run the real thing.</span></h1>
          <p className="mt-9 max-w-[690px] text-lg leading-8 text-white/70">Our advisory board brings together senior leaders who have built and led at the scale our clients operate at — shaping our value proposition, pressure-testing our business model, and keeping us honest about what enterprises actually need.</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-20 md:px-12 md:py-32" aria-label="Advisory board profiles">
        <div className="divide-y divide-border border-y border-foreground">
          {advisors.map((advisor, index) => (
            <article key={advisor.name} className="grid gap-10 py-16 lg:grid-cols-[.55fr_1.25fr]" data-testid={`profile-advisor-${advisor.initials.toLowerCase()}`}>
              <header className="lg:sticky lg:top-28 lg:self-start">
                <div className="mb-8 flex items-start justify-between">
                  <span className="grid h-24 w-24 place-items-center bg-[hsl(var(--brand-deep))] font-display text-3xl font-bold text-white [clip-path:polygon(0_0,100%_12%,86%_100%,8%_88%)]">{advisor.initials}</span>
                  <span className="text-xs font-bold text-[hsl(var(--brand-coral))]">0{index + 1} / {String(advisors.length).padStart(2, "0")}</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--brand-pink))]">{advisor.role}</p>
                <h2 className="mt-3 text-4xl font-semibold md:text-5xl" data-testid={`text-advisor-name-${advisor.initials.toLowerCase()}`}>{advisor.name}</h2>
                <p className="mt-5 max-w-[430px] text-sm font-semibold leading-6">{advisor.title}</p>
              </header>
              <div className="grid gap-8 md:grid-cols-[1.15fr_.85fr]">
                <div><h3 className="mb-5 text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">Background</h3><p className="text-base leading-8 text-muted-foreground">{advisor.background}</p></div>
                <aside className="relative bg-secondary p-8 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-[hsl(var(--brand-violet))] before:via-[hsl(var(--brand-pink))] before:to-[hsl(var(--brand-coral))]">
                  <h3 className="text-sm font-bold">What {advisor.name.split(" ")[0]} brings to Cognirise</h3>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{advisor.contribution}</p>
                  <p className="mt-8 border-t border-border pt-5 text-[10px] leading-5 text-muted-foreground">{advisor.source}</p>
                </aside>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-12 max-w-[820px] text-xl leading-8">The board convenes quarterly and on demand — reviewing our value proposition, service design, partnerships and market posture as the firm scales.</p>
      </section>

      <section className="bg-[hsl(var(--brand-deep))] px-6 py-24 text-white md:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-10 md:flex-row md:items-end">
          <div><h2 className="text-4xl font-semibold md:text-6xl">Advised by operators.<br /><span className="text-[hsl(var(--brand-coral))]">Delivered by builders.</span></h2><p className="mt-5 text-white/65">The judgment of people who’ve run the real thing, inside every engagement.</p></div>
          <BrandButton href="/contact" variant="inverse" data-testid="link-advisors-contact">Talk to us</BrandButton>
        </div>
      </section>
    </main>
  );
}