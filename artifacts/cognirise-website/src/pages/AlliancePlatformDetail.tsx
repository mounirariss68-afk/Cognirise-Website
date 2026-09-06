import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { ALLIANCE_PLATFORMS, type AlliancePlatform } from "@/lib/alliancePlatforms";
import { useDynamicMetadata } from "@/lib/metadata";
import { assetUrl } from "@/lib/assets";

export default function AlliancePlatformDetail({ slug }: { slug: AlliancePlatform["slug"] }) {
  const platform = ALLIANCE_PLATFORMS[slug];
  const heroImage = assetUrl(platform.heroImage);
  useDynamicMetadata({ ...platform.meta, imageUrl: heroImage });

  return (
    <main className="alliance-page overflow-hidden bg-[#fdfcfb] text-[hsl(var(--brand-deep))]" data-platform={slug}>
      <section className="mx-auto max-w-[1440px] px-6 pb-16 pt-8 md:px-12 md:pb-24 md:pt-12">
        <p className="mb-8 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">
          <span className="h-px w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          {platform.eyebrow}
        </p>
        <div className="grid items-end gap-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-16">
          <header className="relative z-10 pb-4">
            <p className="mb-5 text-sm font-bold text-[hsl(var(--brand-pink))]">{platform.name}</p>
            <h1 className="max-w-[680px] text-5xl font-semibold leading-[.94] md:text-7xl lg:text-[88px]" data-testid={`heading-${slug}`}>
              {platform.headline}
            </h1>
            <p className="mt-8 max-w-[610px] text-base leading-8 text-muted-foreground md:text-lg">{platform.summary}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <BrandButton href="/value-scan" data-testid={`link-value-scan-${slug}`}>Explore a governed fit</BrandButton>
              <BrandButton href="/partners" variant="secondary" data-testid={`link-alliance-${slug}`}>See the alliance</BrandButton>
            </div>
          </header>
          <figure className="relative h-[430px] overflow-hidden bg-[#eef1f6] md:h-[620px] [clip-path:polygon(9%_0,100%_0,100%_92%,0_100%,0_10%)]">
            <img src={heroImage} alt={platform.heroAlt} width="1024" height="1024" className="h-full w-full object-cover" data-testid={`image-hero-${slug}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-white/35 via-transparent to-white/10" aria-hidden="true" />
            <figcaption className="absolute bottom-7 left-7 right-7 border-l-2 border-[hsl(var(--brand-coral))] bg-white/85 px-5 py-4 text-[10px] font-bold uppercase tracking-[.16em] backdrop-blur md:left-10 md:right-auto">
              Original Cognirise visual / concept, not product UI
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="border-y border-border bg-[#f5f3fa]" aria-label="Alliance relationship">
        <div className="mx-auto grid max-w-[1440px] gap-5 px-6 py-7 md:grid-cols-[.3fr_1fr] md:px-12">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">Relationship boundary</p>
          <p className="max-w-[940px] text-sm font-semibold leading-6">
            {platform.name} is an alliance platform, not a Cognirise product. Cognirise designs and integrates the wider solution; the partner owns and operates its platform proposition.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-14 px-6 py-24 md:px-12 md:py-32 lg:grid-cols-[.72fr_1.28fr]">
        <div>
          <p className="mb-6 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-coral))]">The operating problem</p>
          <h2 className="text-4xl font-semibold leading-none md:text-6xl">The work needs more than another tool.</h2>
        </div>
        <div className="self-end border-t border-border pt-7">
          <p className="text-xl leading-9 text-muted-foreground md:text-2xl md:leading-10">{platform.problem}</p>
          <p className="mt-8 border-l-2 border-[hsl(var(--brand-pink))] pl-6 text-base font-semibold leading-8">{platform.mechanism}</p>
        </div>
      </section>

      <section className="bg-[#eef1f6] px-6 py-24 md:px-12 md:py-32">
        <div className="mx-auto max-w-[1440px]">
          <header className="mb-14 grid gap-7 border-t border-[hsl(var(--brand-deep))] pt-7 md:grid-cols-[.35fr_1fr]">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">How the platform works</p>
            <h2 className="max-w-[870px] text-4xl font-semibold leading-none md:text-6xl">A visible route through the capability.</h2>
          </header>
          <div className={`grid gap-px bg-border ${platform.workflow.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
            {platform.workflow.map((step) => (
              <article key={step.label} className="bg-[#fdfcfb] p-7 md:p-9">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--brand-coral))]">{step.label}</p>
                <h3 className="mt-7 text-2xl font-semibold">{step.title}</h3>
                <p className="mt-5 text-sm leading-7 text-muted-foreground">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-24 md:px-12 md:py-32">
        <header className="mb-14 max-w-[900px]">
          <p className="mb-6 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">What is distinctive</p>
          <h2 className="text-4xl font-semibold leading-none md:text-6xl">The product claim, without the theatre.</h2>
        </header>
        <div className="grid border-y border-border md:grid-cols-3">
          {platform.differentiators.map((item) => (
            <article key={item.title} className="border-b border-border py-8 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0">
              <Check className="h-5 w-5 text-[hsl(var(--brand-coral))]" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
        <div className="mt-16 grid gap-px bg-border sm:grid-cols-3" aria-label={`${platform.name} sourced facts`}>
          {platform.facts.map((fact) => (
            <a key={fact.value} href={fact.sourceUrl} target="_blank" rel="noreferrer" className="group bg-[#f5f3fa] p-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))]" data-testid={`link-fact-${slug}-${fact.value}`}>
              <strong className="block text-4xl font-semibold group-hover:text-[hsl(var(--brand-pink))]">{fact.value}</strong>
              <span className="mt-3 flex items-end justify-between gap-3 text-xs font-semibold leading-5 text-muted-foreground">{fact.label}<ExternalLink className="h-4 w-4 shrink-0" /></span>
            </a>
          ))}
        </div>
      </section>

      <section className="bg-[#f7edf4] px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[.42fr_1fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">Cognirise contribution</p>
            <h2 className="mt-6 text-4xl font-semibold leading-none md:text-5xl">Specialist product. Accountable integration.</h2>
          </div>
          <div>
            <p className="max-w-[850px] text-xl leading-9">{platform.contribution}</p>
            <BrandButton href="/contact" className="mt-9" data-testid={`link-contact-${slug}`}>Discuss the integration</BrandButton>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-20 md:px-12" aria-labelledby={`${slug}-sources`}>
        <div className="grid gap-10 border-t border-[hsl(var(--brand-deep))] pt-7 md:grid-cols-[.35fr_1fr]">
          <div>
            <h2 id={`${slug}-sources`} className="text-[10px] font-bold uppercase tracking-[.2em]">Evidence register</h2>
            <p className="mt-3 text-xs text-muted-foreground">Official partner sources verified {platform.verifiedOn}.</p>
          </div>
          <ul className="space-y-6">
            {platform.sources.map((source) => (
              <li key={source.url} className="grid gap-3 border-b border-border pb-6 sm:grid-cols-[.42fr_1fr]">
                <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--brand-pink))] hover:underline" data-testid={`link-source-${slug}-${source.label.toLowerCase().replaceAll(" ", "-")}`}>
                  {source.label}<ArrowRight className="h-4 w-4" />
                </a>
                <p className="text-sm leading-6 text-muted-foreground">{source.supports}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}