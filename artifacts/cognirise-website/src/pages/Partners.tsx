import { BrandButton } from "@/components/ui/brand-button";
import { contentRecord, useCmsCollection } from "@/lib/cms";
import { useDynamicMetadata } from "@/lib/metadata";
import { useGovernedLanding } from "@/components/GovernedLandingRoute";
import { landingCta, landingMedia, landingNarrative, landingSeo, landingText } from "@/lib/cms";
import { PartnerProfilePresentation } from "@/components/cms/PublicCmsPresentations";
import type { PartnerContent } from "@workspace/api-zod";

type PartnerCard = {
  category: string;
  name: string;
  positioning: string;
  facts: string[][];
  coverage: string[];
  evidence: string;
  contribution: string;
  source: string;
  content?: PartnerContent;
};

const partnersFallback: PartnerCard[] = [
  {
    category: "engineering",
    name: "BGTS", positioning: "Software engineering & technology services · 30 years of engineering · London, Sheffield, Düsseldorf, Amsterdam, Istanbul, Ankara — Dubai opening",
    facts: [["2,000+", "full-time professionals"], ["8", "offices across the UK, Europe & Türkiye"], ["ISO/IEC 42001", "certified AI management (plus ISO 27001, 20000-1, 9001)"]],
    coverage: ["Banking & finance", "Manufacturing", "Automotive", "Telecoms", "Retail & e-commerce", "Media & entertainment", "Technology"],
    evidence: "HSBC, Vodafone, Mercedes-Benz, Coca-Cola, Booking.com, DHL, Samsung, Intel, IBM, BASF, Honda and Warner Bros. feature among the clients listed on BGTS's site. Case studies include AI-driven data management for retail; machine-learning vehicle pricing for automotive; promotion & loyalty management platforms; PIM modernization and legacy decommissioning.",
    contribution: "The delivery backbone: two thousand certified engineers with deep financial-services specialization and nearshore scale across Europe and Türkiye — soon on the ground in Dubai. It's how a senior-led firm ships enterprise-scale builds without diluting seniority.",
    source: "Facts per bgts.com (About Us, industries and case-study pages), accessed August 2026.",
  },
  {
    category: "engineering",
    name: "Argano", positioning: "Digital transformation consultancy for high-performance operations · Americas-anchored with global delivery",
    facts: [["Top 1%", "Microsoft Inner Circle — 7 consecutive years"], ["5", "strategic platform alliances: Microsoft, Oracle, SAP, Salesforce, Infor"], ["Partner of the Year", "Oracle (regional) & Infor (healthcare) awards"]],
    coverage: ["Asset-intensive industries", "Healthcare", "Manufacturing", "Services", "Enterprise ERP · HCM · CX across sectors"],
    evidence: "Argano designs, implements and runs the enterprise platforms operations depend on — Oracle, SAP, Microsoft Dynamics, Salesforce and Infor — with recent expansion including a SAP delivery center in Mexico and acquisitions in capital-program governance and Oracle ERP services. Public highlights include Infor CloudSuite modernization in healthcare and capital-program governance for asset-intensive industries.",
    contribution: "Mastery of the systems of record. When CogniOS interfaces with your ERP, CRM or HCM rather than replacing it, Argano's top-1% platform expertise makes those integrations enterprise-grade — and extends Cognirise's reach into the Americas.",
    source: "Facts per argano.com (homepage, partner and technology pages), accessed August 2026.",
  },
  {
    category: "platform",
    name: "Lupitor", positioning: "Conversational-AI platform — AI agents for customer experience · Pittsburgh · San Francisco · Istanbul",
    facts: [["40+", "clients on the platform"], ["0.05%", "reported hallucination rate on its custom-trained LLM"], ["48 hrs", "to a custom demo on your data"]],
    coverage: ["Voice AI", "Chat & email", "Contact centers", "Any language", "On-premise or cloud"],
    evidence: "Omnichannel AI agents that hold natural, human-like conversations grounded in your own data — with orchestration guardrails, self-improvement from live interactions, and integrations into CRM, documents and business apps. Deployable inside your infrastructure. Multilingual voice AI that can run on-premise is precisely what sovereign and regulated MENAT clients require — and what most global platforms can't offer.",
    contribution: "The voice of the digital workforce. Lupitor powers the conversational front door — call centers, citizen hotlines, guest concierges — in any language, on your infrastructure, feeding governed CogniOS workflows behind it.",
    source: "Facts per lupitor.com, accessed August 2026.",
  },
  {
    category: "platform",
    name: "Datatoolpack", positioning: "Automated data-preparation platform · Turning raw datasets into structured, AI-ready data",
    facts: [["10+", "data-cleaning fixations for consistent formats"], ["1,000 → 20,000", "records in a published synthetic-data case example"], ["3 runs", "available in the free starting tier"]],
    coverage: ["Data completion & verification", "Data cleaning", "Numericalization", "Missing-data handling", "Feature engineering", "Noise reduction", "Synthetic data"],
    evidence: "AutoData brings common data-preparation steps into preset machine-learning pipelines. The platform can fill and verify values using web searches, API requests and LLM queries; standardize formats; numericalize and scale data; reduce noise; engineer features; and generate synthetic records. Its published HR example transformed inconsistent source data into a structured machine-learning dataset and expanded 1,000 records to 20,000 without manual preprocessing.",
    contribution: "The preparation layer for AI-ready data. Datatoolpack helps Cognirise clients move from fragmented, inconsistent source data toward governed datasets that can support analytics, model training and CogniOS workflows with less manual pipeline work.",
    source: "Alliance status confirmed by Cognirise, September 2026. Product facts per datatoolpack.com and AutoData product pages, accessed September 2026.",
  },
  {
    category: "platform",
    name: "bunjee.ai", positioning: "AI-native organizational intelligence · Capturing how experts and leaders think, then deploying that knowledge across the enterprise",
    facts: [["30+", "languages supported for AI-led interviews"], ["2,184", "candidates screened in a published use case"], ["6 days", "to complete a process described as normally taking 6–8 weeks"]],
    coverage: ["Recruitment", "Onboarding", "Training", "Assessment", "Internal communication", "Corporate memory", "Expert knowledge"],
    evidence: "Bunjee captures conversations, videos, documents and processes from an organization's experts, structures them into a living intelligence layer, and deploys that expertise where teams need it. The same layer supports recruitment, onboarding, communication, assessment and training. Its recruitment workflow combines job posting, CV scoring and AI-led interviews with consistent rubrics, transcripts, rationale and ranked shortlists.",
    contribution: "The organizational-memory layer. bunjee.ai helps Cognirise clients capture scarce expert judgment once and make it available across hiring, onboarding, learning, assessment and communication — extending governed intelligence from enterprise systems into the way people think and decide.",
    source: "Alliance status confirmed by Cognirise, September 2026. Product facts and published use-case figures per bunjee.ai, accessed September 2026.",
  },
];

const allianceGroups = [
  {
    id: "engineering",
    number: "01",
    label: "Engineering partners",
    title: "The capacity to build at enterprise scale.",
    description: "Engineering partners extend the senior Cognirise field team with platform implementation depth, certified delivery capacity and the specialist muscle to move complex systems into production.",
  },
  {
    id: "platform",
    number: "02",
    label: "Platform partners",
    title: "Specialist products, connected around the work.",
    description: "Platform partners bring focused capabilities that complement CogniOS — from conversational AI and data readiness to organizational intelligence — selected where they strengthen the client outcome.",
  },
];

export default function Partners() {
  const governedLanding = useGovernedLanding();
  const governedHero = governedLanding ? landingNarrative(governedLanding, "hero") : null;
  const heroEyebrow = landingText(governedLanding, "partners-hero-eyebrow", "Our partners / one accountable ecosystem");
  const heroHeading = governedHero?.heading || landingText(governedLanding, "partners-hero-heading", "Senior-led. Partner-amplified.");
  const heroBody = governedHero?.text || landingText(governedLanding, "partners-hero-body", "Cognirise stays deliberately senior and small — and delivers at enterprise scale through two complementary alliance types: engineering partners who extend delivery capacity, and platform partners who bring specialist products into the solution.");
  const heroMedia = landingMedia(governedLanding, "partners-hero-media", {
    src: "/images/cognirise/alliance-bunjee.jpg",
    alt: "Cognirise alliance partners connected through a governed enterprise network.",
  });
  const closingCta = landingCta(governedLanding, "partners-closing-cta", { label: "Talk to a partner", href: "/contact" });
  const partnersQuery = useCmsCollection<PartnerCard>("partner", partnersFallback, (item) => {
    const content = contentRecord(item, "partner");
    const category = content.allianceCategory;
    if (category !== "engineering" && category !== "platform") return null;
    return {
      category,
      name: item.title,
      positioning: content.positioning,
      facts: content.facts.map((fact) => [fact.value, fact.label]),
      coverage: content.coverage,
      evidence: content.evidence.map((evidence) => evidence.statement).join(" "),
      contribution: content.contribution || "",
      source: content.sources.map((source) => source.label).join("; "),
      content,
    };
  });
  const governedSeo = governedLanding ? landingSeo(governedLanding) : undefined;
  useDynamicMetadata(governedSeo ? {
    title: governedSeo.title || "Partners | Cognirise",
    description: governedSeo.description || "The alliance and technology network supporting the Cognirise operating model.",
    canonicalUrl: governedSeo.canonicalUrl,
    noIndex: governedSeo.noIndex,
  } : undefined);
  const partners = partnersQuery.data;
  const valueHeadline = landingText(
    governedLanding,
    "partners-value-headline",
    "{count} confirmed partners.",
  ).replace("{count}", String(partners.length));
  const valueBody = landingText(governedLanding, "partners-value-body", "One accountable team.");

  return (
    <main className="overflow-hidden">
      <section className="relative bg-[hsl(var(--brand-deep))] px-6 py-24 text-white md:px-12 md:py-32">
        <div className="absolute -left-28 bottom-0 h-96 w-96 rounded-full bg-[hsl(var(--brand-violet))]/25 blur-3xl" />
          <div className="relative mx-auto max-w-[1440px]">
          <p className="mb-8 text-[10px] font-bold uppercase tracking-[.2em] text-white/55">{heroEyebrow}</p>
          <h1 data-governed-landing={governedLanding?.pagePath} className="max-w-[1050px] text-5xl font-semibold leading-[.94] md:text-7xl lg:text-[100px]">{heroHeading}</h1>
          <div className="mt-10 grid gap-8 border-t border-white/20 pt-8 md:grid-cols-[1fr_.6fr]">
            <p className="max-w-[730px] text-lg leading-8 text-white/70">{heroBody}</p>
            <p className="text-2xl font-semibold">{valueHeadline}<br /><span className="text-[hsl(var(--brand-coral))]">{valueBody}</span></p>
          </div>
          <img className="sr-only" src={heroMedia.src} alt={heroMedia.alt} />
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-20 md:px-12 md:py-32" aria-label="Alliance partner profiles">
        {allianceGroups.map((group) => {
          const groupPartners = partners.filter((partner) => partner.category === group.id);
          return (
          <section key={group.id} className="mb-32 last:mb-0" aria-labelledby={`${group.id}-partners-heading`}>
            <header className="mb-16 grid gap-8 border-t border-foreground pt-7 md:grid-cols-[.35fr_1fr]">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">{group.number} / {group.label}</p>
              <div>
                <h2 id={`${group.id}-partners-heading`} className="max-w-[850px] text-4xl font-semibold leading-none md:text-6xl">{landingText(governedLanding, `partners-${group.id}-heading`, group.title)}</h2>
                <p className="mt-6 max-w-[720px] text-base leading-7 text-muted-foreground">{landingText(governedLanding, `partners-${group.id}-body`, group.description)}</p>
              </div>
            </header>
            {groupPartners.map((partner, index) => (
              <PartnerProfilePresentation
                key={partner.name}
                name={partner.name}
                content={partner.content || {
                  schemaVersion: 1,
                  allianceCategory: partner.category,
                  positioning: partner.positioning,
                  facts: partner.facts.map(([value, label]) => ({ value, label })),
                  coverage: partner.coverage,
                  evidence: [{ statement: partner.evidence, source: { label: partner.source }, approved: true }],
                  contribution: partner.contribution,
                  relationshipStatus: "active",
                  visibility: "public",
                  order: index,
                  sources: partner.source ? [{ label: partner.source }] : [],
                } as PartnerContent}
                index={index}
                groupLabel={group.label}
                source={partner.source}
                evidenceText={partner.evidence}
                platformHref={group.id === "platform" && ["Lupitor", "Datatoolpack", "bunjee.ai"].includes(partner.name)
                  ? `/platforms/${partner.name === "Lupitor" ? "lupitor" : partner.name === "Datatoolpack" ? "datatoolpack" : "bunjee-ai"}`
                  : undefined}
              />
            ))}
          </section>
          );
        })}
        <p className="mt-24 max-w-[900px] border-l-4 border-[hsl(var(--brand-pink))] pl-7 text-xl leading-9">{landingText(governedLanding, "partners-method-body", "Beyond the confirmed alliance network, Cognirise assembles additional specialist capability per engagement — so every mission gets exactly the engineering depth and platform support it needs.")}</p>
      </section>

      <section className="bg-[hsl(var(--brand-deep))] px-6 py-24 text-white md:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-10 md:flex-row md:items-end">
          <div><p className="mb-6 text-[10px] font-bold uppercase tracking-[.2em] text-white/55">{landingText(governedLanding, "partners-closing-eyebrow", "One accountable ecosystem")}</p><h2 className="max-w-[800px] text-4xl font-semibold md:text-6xl">{landingText(governedLanding, "partners-closing-heading", "One senior team. The whole network behind it.")}</h2><p className="mt-5 text-white/65">{landingText(governedLanding, "partners-closing-body", "Tell us the outcome. We’ll bring the right partners to the table — under one accountable lead.")}</p></div>
          <BrandButton href={closingCta.href} variant="inverse" data-testid="link-partners-contact">{closingCta.label}</BrandButton>
        </div>
      </section>
    </main>
  );
}