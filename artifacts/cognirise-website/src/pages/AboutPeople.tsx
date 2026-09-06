import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { assetUrl } from "@/lib/assets";

const founders = [
  {
    initials: "MA",
    name: "Mounir Ariss",
    bio: "Three decades helping enterprises across the region and beyond turn technology shifts into operating advantage — now focused on one conviction: the next frontier isn't AI adoption, it's becoming an agentic enterprise.",
    focus: [
      ["Agentic Enterprise Transformation", "AI-native workflows and decision layers"],
      ["Data & AI Foundations", "Architecture, governance, durable capability"],
      ["SDLC & Legacy Modernization", "AI-augmented delivery, retiring technical debt"],
    ],
  },
  {
    initials: "GG",
    name: "Gökhan Güney",
    bio: "Decades of enterprise transformation leadership across Türkiye, Europe and the Gulf — building the engineering muscle that turns strategy decks into systems that run.",
    focus: [
      ["Agentic Enterprise Transformation", "Humans + agents in production"],
      ["Data & AI Foundations", "Platforms and operating models that scale"],
      ["SDLC & Legacy Modernization", "Engineering acceleration with AI"],
    ],
  },
];

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
              Founding partners
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

      <section className="mx-auto max-w-[1440px] px-6 py-24 md:px-12 md:py-36" aria-labelledby="founders-heading">
        <div className="grid gap-10 border-b border-foreground pb-14 md:grid-cols-2">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">01 / The founder story</p>
          <h2 id="founders-heading" className="text-4xl font-semibold leading-none md:text-6xl">Two disciplines.<br />One accountable route.</h2>
        </div>
        <div className="divide-y divide-border">
          {founders.map((founder, index) => (
            <article key={founder.name} className="grid gap-10 py-16 md:py-24 lg:grid-cols-[.45fr_1fr_1.2fr]" data-testid={`profile-founder-${founder.initials.toLowerCase()}`}>
              <div className="flex items-start gap-5">
                <span className="grid h-20 w-20 shrink-0 place-items-center bg-gradient-to-br from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))] font-display text-2xl font-bold text-white [clip-path:polygon(0_0,100%_10%,88%_100%,10%_88%)]">{founder.initials}</span>
                <span className="pt-2 text-[10px] font-bold tracking-[.2em] text-muted-foreground">0{index + 1}</span>
              </div>
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--brand-pink))]">Founding Partner</p>
                <h3 className="text-4xl font-semibold md:text-5xl" data-testid={`text-founder-name-${founder.initials.toLowerCase()}`}>{founder.name}</h3>
                <p className="mt-7 max-w-[520px] text-base leading-7 text-muted-foreground">{founder.bio}</p>
              </div>
              <div className="border-t border-foreground pt-1">
                {founder.focus.map(([title, detail], focusIndex) => (
                  <div key={title} className="grid grid-cols-[32px_1fr] gap-4 border-b border-border py-5">
                    <span className="text-[10px] font-bold text-[hsl(var(--brand-coral))]">0{focusIndex + 1}</span>
                    <div><h4 className="text-sm font-bold">{title}</h4><p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p></div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

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
          <Link href="/value-scan" className="inline-flex items-center gap-4 border border-white px-6 py-4 text-sm font-bold transition hover:bg-white hover:text-[hsl(var(--brand-deep))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))]" data-testid="link-about-value-scan">Book a value scan <ArrowRight size={18} /></Link>
        </div>
      </section>
    </main>
  );
}