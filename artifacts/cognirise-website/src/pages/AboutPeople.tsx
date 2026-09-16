import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import * as React from "react";
import type { PersonContent } from "@workspace/api-zod";
import { assetUrl } from "@/lib/assets";
import { useGovernedLanding } from "@/components/GovernedLandingRoute";
import {
  contentRecord,
  landingCta,
  landingMedia,
  landingText,
  type CmsRecord,
  type CmsDeliveryState,
  useCmsCollection,
} from "@/lib/cms";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";

type TeamProfile = {
  initials: string;
  name: string;
  group: "leadership" | "advisor";
  title: string;
  background: string;
  contribution: string;
};
type PreviewPersonRecord = CmsRecord<PersonContent> & { content: PersonContent };

function ProfileList({ profiles, label, delivery }: { profiles: TeamProfile[]; label: string; delivery: CmsDeliveryState }) {
  if (delivery !== "cms" && delivery !== "intentional-empty") return null;
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

function PeopleDeliveryStatus({ delivery }: { delivery: CmsDeliveryState }) {
  if (delivery === "loading") {
    return <p className="border-y border-border py-12 text-muted-foreground" aria-busy="true" role="status" data-testid="status-about-people-loading">Loading team profiles…</p>;
  }
  if (delivery !== "cms" && delivery !== "intentional-empty") {
    return <p className="border-y border-border py-12 text-muted-foreground" role="alert" data-testid="status-about-people-unavailable">Team profiles are temporarily unavailable.</p>;
  }
  return null;
}

export default function AboutPeople({ previewPerson }: { previewPerson?: PreviewPersonRecord } = {}) {
  const { market } = useMarketStore();
  const marketLocation = getMarketLocationLabel(market);
  const governedLanding = useGovernedLanding();
  const heroEyebrow = cleanHeroIdentifier(
    landingText(governedLanding, "about-hero-eyebrow", "Our Team"),
    { marketLocation },
  );
  const heroHeading = landingText(governedLanding, "about-hero-heading", "Judgment stays close to the work.");
  const heroBody = landingText(governedLanding, "about-hero-body", "The people who frame the decision stay close enough to make it real. Leadership, engineering and accountability belong in the same room.");
  const leadershipVisual = landingMedia(governedLanding, "about-hero-visual", { src: assetUrl("/images/cognirise/site-leadership.jpg"), alt: "Senior colleagues working together around a detailed physical model." });
  const leadershipEyebrow = landingText(governedLanding, "about-leadership-eyebrow", "01 / Our Team");
  const leadershipTitle = landingText(governedLanding, "about-leadership-title", "Leadership Team");
  const advisoryEyebrow = landingText(governedLanding, "about-advisory-eyebrow", "02 / Counsel at scale");
  const advisoryTitle = landingText(governedLanding, "about-advisory-title", "Board of Advisors");
  const advisoryBody = landingText(governedLanding, "about-advisory-body", "Senior leaders who pressure-test our model and keep it grounded in what enterprises actually need.");
  const closingHeading = landingText(governedLanding, "about-closing-heading", "Bring one process. Meet the people.");
  const closingCta = landingCta(governedLanding, "about-closing-cta", { label: "Book a value scan", href: "/value-scan" });
  const peopleQuery = useCmsCollection("person", [], (item) => {
    const content = contentRecord(item, "person");
    const personContent = item.content as PersonContent;
    if (content.role !== "founder" && content.role !== "leader" && content.role !== "advisor") return null;
    const name = item.title;
    return {
      initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 3),
      name,
      group: content.role === "advisor" ? "advisor" as const : "leadership" as const,
      title: personContent.title,
      background: content.biography || "",
      contribution: content.contribution || "",
    };
  });
  const previewProfile = previewPerson
    ? (() => {
        const content = previewPerson.content;
        if (content.role !== "founder" && content.role !== "leader" && content.role !== "advisor") return undefined;
        const name = previewPerson.title;
        return {
          initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 3),
          name,
          group: content.role === "advisor" ? "advisor" as const : "leadership" as const,
          title: content.title,
          background: content.biography || "",
          contribution: content.contribution || "",
        };
      })()
    : undefined;
  const visiblePeople = peopleQuery.delivery === "cms" ? peopleQuery.data : [];
  const renderedPeople = previewProfile ? [previewProfile] : visiblePeople;
  const peopleDelivery = previewPerson ? "cms" as const : peopleQuery.delivery;
  const leadership = renderedPeople.filter((profile) => profile.group === "leadership");
  const advisors = renderedPeople.filter((profile) => profile.group === "advisor");

  return (
    <main className="overflow-hidden bg-background">
      <section className="relative min-h-[650px] bg-[hsl(var(--brand-deep))] py-20 text-white md:py-28">
        <div className="absolute -right-32 top-0 h-[520px] w-[520px] rounded-full bg-[hsl(var(--brand-pink))]/25 blur-3xl" />
        <div className="public-hero-shell relative grid gap-14 lg:grid-cols-[.92fr_1.08fr] lg:items-end">
          <div>
            <p data-hero-content-edge className="mb-8 text-[10px] font-bold uppercase tracking-[.2em] text-white/60">{heroEyebrow}</p>
            <h1 data-governed-landing={governedLanding?.pagePath} className="max-w-[760px] text-5xl font-semibold leading-[.94] md:text-7xl lg:text-[104px]">{heroHeading}</h1>
            <p className="mt-8 max-w-[590px] text-lg leading-8 text-white/70">{heroBody}</p>
          </div>
          <figure className="clip-diagonal relative h-[390px] overflow-hidden lg:h-[520px]">
             <img className="h-full w-full object-cover" style={{ objectPosition: leadershipVisual.objectPosition }} src={leadershipVisual.src} alt={leadershipVisual.alt} />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))]/80 via-transparent to-transparent" />
          </figure>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-24 md:px-12 md:py-32" aria-labelledby="leadership-team">
        <div className="mb-14 grid gap-6 md:grid-cols-2">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">{leadershipEyebrow}</p>
          <h2 id="leadership-team" className="text-4xl font-semibold md:text-6xl">{leadershipTitle}</h2>
        </div>
        <PeopleDeliveryStatus delivery={peopleDelivery} />
        <ProfileList profiles={leadership} label="Leadership Team" delivery={peopleDelivery} />
      </section>

      <section id="board-of-advisors" className="scroll-mt-24 bg-secondary px-6 py-24 md:px-12 md:py-32" aria-labelledby="board-of-advisors-heading">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-14 grid gap-6 md:grid-cols-2">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">{advisoryEyebrow}</p>
            <div>
              <h2 id="board-of-advisors-heading" className="text-4xl font-semibold md:text-6xl">{advisoryTitle}</h2>
              <p className="mt-5 max-w-[650px] leading-7 text-muted-foreground">{advisoryBody}</p>
            </div>
          </div>
          <ProfileList profiles={advisors} label="Board of Advisors" delivery={peopleDelivery} />
        </div>
      </section>

      <section className="bg-[hsl(var(--brand-deep))] px-6 py-24 text-white md:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <h2 className="max-w-[800px] text-5xl font-semibold leading-[.95] md:text-7xl">{closingHeading}</h2>
          <Link href={closingCta.href} className="inline-flex items-center gap-4 border border-white px-6 py-4 text-sm font-bold transition hover:bg-white hover:text-[hsl(var(--brand-deep))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))]" data-testid="link-about-value-scan">{closingCta.label} <ArrowRight size={18} /></Link>
        </div>
      </section>
    </main>
  );
}