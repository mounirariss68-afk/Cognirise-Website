import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { assetUrl } from "@/lib/assets";
import { contentRecord, useCmsCollection } from "@/lib/cms";

type TeamProfile = {
  initials: string;
  name: string;
  group: "leadership" | "advisor";
  title: string;
  background: string;
  contribution: string;
  enabled: boolean;
};

export const peopleFallback: TeamProfile[] = [
  {
    initials: "MA",
    name: "Mounir Ariss",
    group: "leadership",
    title: "CEO & Co-founder",
    background: "Three decades helping enterprises across the region and beyond turn technology shifts into operating advantage, with senior accountability kept close to delivery.",
    contribution: "Strategic judgment, practical transformation leadership and a focus on turning consequential AI decisions into operating results.",
    enabled: true,
  },
  {
    initials: "BE",
    name: "Bulent Egrilmez",
    group: "leadership",
    title: "CTO & Co-founder",
    background: "A technology leader focused on production-grade AI, LLM and RAG systems, multi-agent architecture, product delivery and enterprise transformation.",
    contribution: "The engineering discipline to move AI from a promising prototype into secure, scalable systems that perform in production.",
    enabled: true,
  },
  {
    initials: "OBY",
    name: "Omer Barbaros Yis",
    group: "leadership",
    title: "Co-founder",
    background: "An experienced business and technology leader helping organisations connect strategic ambition, operating priorities and executable transformation.",
    contribution: "An operator’s perspective on shaping partnerships and practical routes from enterprise priorities to sustained value.",
    enabled: true,
  },
  {
    initials: "HN",
    name: "Hisham Nofal, PhD.",
    group: "leadership",
    title: "Education Sector lead",
    background: "More than two decades across education consulting, sector leadership and academia, with deep experience of GCC and MENA education systems and former leadership of KPMG Saudi Arabia’s education sector.",
    contribution: "Sector depth that connects education policy and institutional ambition with workable, responsible transformation.",
    enabled: true,
  },
  {
    initials: "GG",
    name: "Gökhan Güney",
    group: "leadership",
    title: "Co-founder",
    background: "Decades of enterprise transformation leadership across Türkiye, Europe and the Gulf, building the engineering muscle that turns strategy into systems that run.",
    contribution: "Delivery leadership, local operating knowledge and the discipline required to carry complex change into production.",
    enabled: false,
  },
  {
    initials: "AL",
    name: "Alexis Lecanuet",
    group: "advisor",
    title: "Former Regional CEO, Accenture Middle East",
    background: "A senior regional leader with extensive experience in strategy execution, client portfolio leadership and large-scale digital transformation across Europe and MENA.",
    contribution: "An inside view of how transformation firms win and scale in the region, sharpening Cognirise’s senior-led, platform-powered model.",
    enabled: true,
  },
  {
    initials: "RA",
    name: "Rami Aslan",
    group: "advisor",
    title: "Former CEO, Türk Telekom · Investor & Board Member",
    background: "More than 25 years across North America, Europe, the Middle East and Africa, spanning telecom operations, corporate finance, investment and board leadership.",
    contribution: "The operator’s seat on transformation at national scale, alongside investor discipline and deep telecom expertise.",
    enabled: true,
  },
  {
    initials: "FM",
    name: "Fadi Mattar",
    group: "advisor",
    title: "Public & Government Affairs Director — IMEA & Türkiye, and Country Director Kuwait & Levant, Dow",
    background: "A senior corporate-affairs and country leader whose career bridges energy and petrochemicals, financial services, government relations and business leadership in the Gulf.",
    contribution: "A grounded understanding of how large industrial organisations and governments make decisions, strengthening our market and stakeholder perspective.",
    enabled: true,
  },
];

const profileOrder = peopleFallback.map(({ name }) => name);

function ProfileList({ profiles, label }: { profiles: TeamProfile[]; label: string }) {
  if (!profiles.length) {
    return <p className="border-y border-border py-12 text-muted-foreground">No {label.toLowerCase()} profiles are currently published.</p>;
  }

  return (
    <div className="divide-y divide-border border-y border-foreground">
      {profiles.map((profile, index) => (
        <article key={profile.name} className="grid gap-10 py-16 lg:grid-cols-[.55fr_1.25fr]" data-testid={`profile-${profile.group}-${profile.initials.toLowerCase()}`}>
          <header className="lg:sticky lg:top-28 lg:self-start">
            <div className="mb-8 flex items-start justify-between">
              <span className="grid h-24 w-24 place-items-center bg-gradient-to-br from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))] font-display text-2xl font-bold text-white [clip-path:polygon(0_0,100%_10%,88%_100%,10%_88%)]">{profile.initials}</span>
              <span className="text-xs font-bold text-[hsl(var(--brand-coral))]">{String(index + 1).padStart(2, "0")} / {String(profiles.length).padStart(2, "0")}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--brand-pink))]">{profile.title}</p>
            <h3 className="mt-3 text-4xl font-semibold md:text-5xl" data-testid={`text-profile-name-${profile.initials.toLowerCase()}`}>{profile.name}</h3>
          </header>
          <div className="grid gap-8 md:grid-cols-[1.15fr_.85fr]">
            <div>
              <h4 className="mb-5 text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">Background</h4>
              <p className="text-base leading-8 text-muted-foreground">{profile.background}</p>
            </div>
            <aside className="relative bg-secondary p-8 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-[hsl(var(--brand-violet))] before:via-[hsl(var(--brand-pink))] before:to-[hsl(var(--brand-coral))]">
              <h4 className="text-sm font-bold">What {profile.name.split(" ")[0]} brings to Cognirise</h4>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{profile.contribution}</p>
            </aside>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function AboutPeople() {
  const peopleQuery = useCmsCollection("person", peopleFallback, (item) => {
    const content = contentRecord(item, "person");
    if (content.role !== "founder" && content.role !== "leader" && content.role !== "advisor") return null;
    const name = item.title;
    return {
      initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 3),
      name,
      group: content.role === "advisor" ? "advisor" as const : "leadership" as const,
      title: content.title,
      background: content.biography || "",
      contribution: content.contribution || content.focusAreas.map((focus) => focus.detail).join(" "),
      enabled: true,
    };
  });
  const visiblePeople = peopleQuery.data
    .filter((profile) => profile.enabled)
    .sort((a, b) => {
      const aIndex = profileOrder.indexOf(a.name);
      const bIndex = profileOrder.indexOf(b.name);
      return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
    });
  const leadership = visiblePeople.filter((profile) => profile.group === "leadership");
  const advisors = visiblePeople.filter((profile) => profile.group === "advisor");

  return (
    <main className="overflow-hidden bg-background">
      <section className="relative min-h-[650px] bg-[hsl(var(--brand-deep))] px-6 py-20 text-white md:px-12 md:py-28">
        <div className="absolute -right-32 top-0 h-[520px] w-[520px] rounded-full bg-[hsl(var(--brand-pink))]/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1440px] gap-14 lg:grid-cols-[.92fr_1.08fr] lg:items-end">
          <div>
            <p className="mb-8 text-[10px] font-bold uppercase tracking-[.2em] text-white/60">Our Team</p>
            <h1 className="max-w-[760px] text-5xl font-semibold leading-[.94] md:text-7xl lg:text-[104px]">Judgment stays <em className="not-italic text-[hsl(var(--brand-coral))]">close to the work.</em></h1>
            <p className="mt-8 max-w-[590px] text-lg leading-8 text-white/70">The people who frame the decision stay close enough to make it real. Leadership, engineering and accountability belong in the same room.</p>
          </div>
          <figure className="clip-diagonal relative h-[390px] overflow-hidden lg:h-[520px]">
            <img className="h-full w-full object-cover" src={assetUrl("/images/cognirise/site-leadership.jpg")} alt="Senior colleagues working together around a detailed physical model." />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))]/80 via-transparent to-transparent" />
          </figure>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-24 md:px-12 md:py-32" aria-labelledby="leadership-team">
        <div className="mb-14 grid gap-6 md:grid-cols-2">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">01 / Our Team</p>
          <h2 id="leadership-team" className="text-4xl font-semibold md:text-6xl">Leadership Team</h2>
        </div>
        <ProfileList profiles={leadership} label="Leadership Team" />
      </section>

      <section id="board-of-advisors" className="scroll-mt-24 bg-secondary px-6 py-24 md:px-12 md:py-32" aria-labelledby="board-of-advisors-heading">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-14 grid gap-6 md:grid-cols-2">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">02 / Counsel at scale</p>
            <div>
              <h2 id="board-of-advisors-heading" className="text-4xl font-semibold md:text-6xl">Board of Advisors</h2>
              <p className="mt-5 max-w-[650px] leading-7 text-muted-foreground">Senior leaders who pressure-test our model and keep it grounded in what enterprises actually need.</p>
            </div>
          </div>
          <ProfileList profiles={advisors} label="Board of Advisors" />
        </div>
      </section>

      <section className="bg-[hsl(var(--brand-deep))] px-6 py-24 text-white md:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <h2 className="max-w-[800px] text-5xl font-semibold leading-[.95] md:text-7xl">Bring one process.<br /><span className="text-[hsl(var(--brand-coral))]">Meet the people.</span></h2>
          <Link href="/value-scan" className="inline-flex items-center gap-4 border border-white px-6 py-4 text-sm font-bold transition hover:bg-white hover:text-[hsl(var(--brand-deep))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))]" data-testid="link-about-value-scan">Book a value scan <ArrowRight size={18} /></Link>
        </div>
      </section>
    </main>
  );
}