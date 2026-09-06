import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { assetUrl } from "@/lib/assets";

interface PersonProfile {
  initials: string;
  name: string;
  role: string;
  title?: string;
  background: string;
  contribution: string;
}

const operatingTeam: PersonProfile[] = [
  {
    initials: "MA",
    name: "Mounir Ariss",
    role: "Founding Partner",
    background: "Three decades helping enterprises across the region and beyond turn technology shifts into operating advantage. A career built on framing the decision architecture that makes enterprise-scale change possible, now focused entirely on the agentic enterprise.",
    contribution: "The conviction that AI is an operating discipline, not a science experiment — grounded in thirty years of framing consequential transformation for the region's largest enterprises."
  },
  {
    initials: "BE",
    name: "Bülent Eğrilmez",
    role: "CTO & Co-Founder",
    background: "A track record of engineering production-grade AI systems and multi-agent architectures that actually ship. Technical leadership bridging deep LLM/RAG capability, enterprise transformation, and the rigorous product delivery required to run consequential work.",
    contribution: "The engineering truth. The ability to architect AI systems that survive contact with real enterprise complexity, ensuring our platforms execute with the discipline of traditional enterprise software."
  },
  {
    initials: "HN",
    name: "Hisham Nofal, PhD",
    role: "Education Sector Lead",
    background: "More than 20 years across education consulting, sector leadership, and academia, focused on GCC and MENA systems. Former Education Sector Lead at KPMG Saudi Arabia, bringing deep domain expertise in national-scale learning transformation. Holds a PhD from Texas Tech.",
    contribution: "The domain authority to redesign national education systems for an AI-native future, grounded in the realities of how ministries, universities, and regulators actually operate in the region."
  }
];

const advisoryBoard: PersonProfile[] = [
  {
    initials: "AL",
    name: "Alexis Lecanuet",
    role: "Advisory Board Member",
    title: "Former Regional CEO, Accenture Middle East",
    background: "A 24-year Accenture career culminating in leadership of the firm's Middle East business — strategy execution, client portfolio leadership and regional operations. Previously built and expanded Accenture's products portfolio across the Middle East and Türkiye, with deep roots in consumer, retail and large-scale digital transformation.",
    contribution: "The incumbent's playbook, from the inside: how global consultancies win, price and scale in this region — so our senior-led, platform-powered model is sharpened precisely where the traditional model is weakest."
  },
  {
    initials: "RA",
    name: "Rami Aslan",
    role: "Advisory Board Member",
    title: "Former CEO, Türk Telekom · Investor & Board Member",
    background: "More than 25 years across North America, Europe, the Middle East and Africa. CEO of Türk Telekom (2013–2017) — Türkiye's largest telecom operator — after leading Oger Telecom as CEO and executive board member. Earlier, head of M&A and corporate finance at the Oger Group, following banking roles at Citigroup and TD. McGill BCom and MBA.",
    contribution: "The operator's seat: what transformation looks like when you're accountable for 35,000 people and a nation's network — plus an investor's discipline on our economics and a telecom depth that anchors one of our core industries."
  },
  {
    initials: "FM",
    name: "Fadi Mattar",
    role: "Advisory Board Member",
    title: "Public & Government Affairs Director — IMEA & Türkiye, and Country Director Kuwait & Levant, Dow",
    background: "A senior corporate-affairs and country leader at Dow, responsible for public and government affairs across India, the Middle East, Africa and Türkiye, and for Dow's business in Kuwait and the Levant. His decade spans public affairs, government relations and country leadership; bridging energy & petrochemicals, financial services, and the corridors where business meets government.",
    contribution: "The stakeholder map: how large industrials and governments actually make decisions — sharpening our energy & resources proposition, our public-sector posture, and how the Cognirise story lands with boards and ministries."
  }
];

function PersonProfileRow({
  person,
  index,
  total,
  group,
}: {
  person: PersonProfile;
  index: number;
  total: number;
  group: "operating" | "advisor";
}) {
  const key = person.initials.toLowerCase();
  const firstName = person.name.split(" ")[0];

  return (
    <article
      className="grid gap-10 py-16 md:py-24 lg:grid-cols-[.45fr_1fr_1.2fr]"
      data-testid={`profile-${group}-${key}`}
    >
      <div className="flex items-start gap-5">
        <span
          className={`grid h-20 w-20 shrink-0 place-items-center font-display text-2xl font-bold text-white ${
            group === "operating"
              ? "bg-gradient-to-br from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))] [clip-path:polygon(0_0,100%_10%,88%_100%,10%_88%)]"
              : "bg-[hsl(var(--brand-deep))] [clip-path:polygon(0_0,100%_12%,86%_100%,8%_88%)]"
          }`}
          aria-hidden="true"
        >
          {person.initials}
        </span>
        <span className="pt-2 text-[10px] font-bold tracking-[.2em] text-muted-foreground">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
      <div>
        <p
          className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--brand-pink))]"
          data-testid={`text-${group}-role-${key}`}
        >
          {person.role}
        </p>
        <h3 className="text-4xl font-semibold md:text-5xl" data-testid={`text-${group}-name-${key}`}>
          {person.name}
        </h3>
        {person.title && (
          <p className="mt-5 max-w-[430px] text-sm font-semibold leading-6" data-testid={`text-${group}-title-${key}`}>
            {person.title}
          </p>
        )}
      </div>
      <div className="grid gap-8">
        <div>
          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">Background</h4>
          <p className="text-base leading-8 text-muted-foreground" data-testid={`text-${group}-background-${key}`}>
            {person.background}
          </p>
        </div>
        <aside className="relative bg-secondary p-8 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-[hsl(var(--brand-violet))] before:via-[hsl(var(--brand-pink))] before:to-[hsl(var(--brand-coral))]">
          <h4 className="text-sm font-bold">What {firstName} brings to Cognirise</h4>
          <p className="mt-4 text-sm leading-7 text-muted-foreground" data-testid={`text-${group}-contribution-${key}`}>
            {person.contribution}
          </p>
        </aside>
      </div>
    </article>
  );
}

export default function AboutPeople() {
  return (
    <main className="overflow-hidden bg-background">
      <section className="relative min-h-[690px] bg-[hsl(var(--brand-deep))] px-6 py-20 text-white md:px-12 md:py-28">
        <div className="absolute -right-32 top-0 h-[520px] w-[520px] rounded-full bg-[hsl(var(--brand-pink))]/25 blur-3xl" />
        <div className="absolute -bottom-48 left-[30%] h-[420px] w-[420px] rounded-full bg-[hsl(var(--brand-violet))]/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1440px] gap-14 lg:grid-cols-[.92fr_1.08fr] lg:items-end">
          <div>
            <p className="mb-8 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/60">
              <span className="h-px w-8 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              Our Team
            </p>
            <h1 className="max-w-[760px] text-5xl font-semibold leading-[.94] md:text-7xl lg:text-[104px]">
              Senior-led is not a slogan. <em className="not-italic text-[hsl(var(--brand-coral))]">It’s the staffing model.</em>
            </h1>
            <p className="mt-8 max-w-[570px] text-base leading-7 text-white/70 md:text-lg">
              The people who frame the decision stay close enough to make it real. Cognirise was founded to keep judgment, engineering and accountability in the same room.
            </p>
          </div>
          <figure className="clip-diagonal relative h-[390px] overflow-hidden lg:h-[520px]">
            <img className="h-full w-full object-cover" src={assetUrl("/images/cognirise/site-leadership.jpg")} alt="Senior colleagues working together around a detailed physical model." />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))]/80 via-transparent to-transparent" />
            <figcaption className="absolute bottom-8 left-8 text-xs font-bold uppercase tracking-[.18em]">Judgment stays close to the work</figcaption>
          </figure>
        </div>
      </section>

      {/* Operating Team */}
      <section className="mx-auto max-w-[1440px] scroll-mt-24 px-6 py-24 md:px-12 md:py-36" aria-labelledby="operating-team-heading" id="operating-team">
        <div className="grid gap-10 border-b border-foreground pb-14 md:grid-cols-2">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">01 / The Operating Team</p>
          <h2 id="operating-team-heading" className="text-4xl font-semibold leading-none md:text-6xl">Accountable for delivery.<br />Present in the work.</h2>
        </div>
        <div className="divide-y divide-border">
          {operatingTeam.map((person, index) => (
            <PersonProfileRow
              key={person.name}
              person={person}
              index={index}
              total={operatingTeam.length}
              group="operating"
            />
          ))}
        </div>
      </section>

      {/* Advisory Board */}
      <section className="scroll-mt-24 px-6 py-20 md:px-12 md:pb-36" aria-labelledby="advisory-board-heading" id="board-of-advisors">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-10 border-b border-foreground pb-14 md:grid-cols-2">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">02 / Board of Advisors</p>
            <h2 id="advisory-board-heading" className="text-4xl font-semibold leading-none md:text-6xl">The counsel of people<br />who've run the real thing.</h2>
          </div>
          <div className="divide-y divide-border">
            {advisoryBoard.map((person, index) => (
              <PersonProfileRow
                key={person.name}
                person={person}
                index={index}
                total={advisoryBoard.length}
                group="advisor"
              />
            ))}
          </div>
          <p className="mt-4 max-w-[820px] text-xl leading-8">
            The board convenes quarterly and on demand — reviewing our value proposition, service design, partnerships and market posture as the firm scales.
          </p>
        </div>
      </section>

      {/* The proof is operational */}
      <section className="relative bg-secondary px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1fr_.8fr] lg:items-center">
          <div>
            <p className="mb-6 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">The proof is operational</p>
            <h2 className="max-w-[850px] text-4xl font-semibold leading-[1.02] md:text-7xl">We run our own firm on our own platform.</h2>
            <p className="mt-7 max-w-[650px] text-lg leading-8 text-muted-foreground"><strong className="text-foreground">Atelier, powered by CogniOS.</strong> We don’t sell what we don’t live on.</p>
          </div>
          <div className="clip-diagonal-bottom h-[310px] overflow-hidden">
            <img className="h-full w-full object-cover" src={assetUrl("/images/cognirise/pulse-convergence.jpg")} alt="Violet and coral architectural forms converging in a bright space." />
          </div>
        </div>
      </section>

      <section className="bg-[hsl(var(--brand-deep))] px-6 py-24 text-white md:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <h2 className="max-w-[800px] text-5xl font-semibold leading-[.95] md:text-7xl">Bring one process.<br /><span className="text-[hsl(var(--brand-coral))]">Meet the people.</span></h2>
          <div>
            <Link href="/value-scan" className="inline-flex items-center gap-4 border border-white px-6 py-4 text-sm font-bold transition hover:bg-white hover:text-[hsl(var(--brand-deep))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))]" data-testid="link-about-value-scan">Book a value scan <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
