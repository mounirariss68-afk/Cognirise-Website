import { useRoute } from "wouter";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import NotFound from "@/pages/not-found";
import { useMarketStore } from "@/store/market";
import { BrandButton } from "@/components/ui/brand-button";
import { cmsRequestIsUnavailable, contentRecord, resolveCmsMedia, useCmsEntry } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";
import { PublicationPresentation } from "@/components/cms/PublicCmsPresentations";
import { ServiceError } from "@/components/error-boundary";
import { useReleaseContext } from "@/lib/releases";

const articles = {
  "ai-should-move-the-business": {
    topic: "Agentic enterprise",
    title: "AI should move the business—not just assist it.",
    date: "3 September 2026",
    author: "Strategy Practice",
    readingTime: "5 min read",
    heroImage: "/images/cognirise/site-insights.jpg",
    content: (
      <>
        <p className="lead">
          AI transformation is not a portfolio of pilots. It is a decision to redesign priority work around people, data, controls and intelligent execution.
        </p>
        <p>
          Many enterprises are stuck in a holding pattern. They have copilots assisting individuals, but the core operating model remains unchanged. The friction points—hand-offs, data silos, slow decisions—are still there, just slightly masked by faster email drafting.
        </p>
        <p>
          Transformation begins when leaders stop asking "how can AI help our people?" and start asking "how should this work move?" When you design the process for intelligence, you don't just add a conversational interface. You build governed agents that execute tasks, connected to the knowledge they need, escalating to human authority only when judgment is required.
        </p>
        <h3>The limits of assistance</h3>
        <p>
          A copilot makes a single task faster. Agentic transformation makes a sequence of tasks automatic. If a loan origination process requires six hand-offs across three departments, giving each person an AI assistant doesn't fix the process—it just makes the hand-offs happen marginally faster.
        </p>
        <p>
          The alternative is to look at the process end-to-end. Where is the data? What are the regulatory boundaries? What are the decision criteria? Once those are mapped, a governed digital workforce can handle the routine validation and assembly, bringing a synthesized decision to the human operator. The work moves.
        </p>
        <h3>Designing for control</h3>
        <p>
          Moving work automatically requires trust, which means governance cannot be an afterthought. An agentic enterprise builds control into the flow: audit trails, clear authority boundaries, and deterministic fallbacks. The system is designed to stop and ask for direction when uncertainty arises.
        </p>
        <p>
          Stop running isolated pilots. Bring one consequential process under pressure, and redesign it for intelligence.
        </p>
      </>
    )
  },
  "foundations-for-production": {
    topic: "Foundations",
    title: "The conditions for AI that can hold up in production.",
    date: "28 August 2026",
    author: "Engineering Practice",
    readingTime: "4 min read",
    heroImage: "/images/cognirise/site-infrastructure.jpg",
    content: (
      <>
        <p className="lead">
          Data, security, governance and architecture are not the preamble. They are the work.
        </p>
        <p>
          The hardest part of AI isn't the model. It's the environment around the model. When a promising prototype fails to reach production, it is rarely because the intelligence wasn't good enough. It fails because the enterprise wasn't ready to support it.
        </p>
        <p>
          Production demands a different set of questions: who may access what, where data may move, what the operating team can observe, and how the system connects to the wider estate. A conversational interface alone does not answer them.
        </p>
        <h3>The integration reality</h3>
        <p>
          AI needs a place to operate. It needs a structured route to enterprise knowledge. If your documentation is a mess of conflicting versions, an LLM will simply hallucinate at scale. The foundation of any AI transformation is data hygiene and semantic architecture.
        </p>
        <p>
          The CogniOS architecture approaches this systematically. Before agents are orchestrated, the knowledge layer and integration route need to be designed around controlled context and the systems of record.
        </p>
        <h3>Boundaries by design</h3>
        <p>
          For public-sector and regulated work, the relevant boundaries must be made explicit before architecture choices are made. Data location, access, authority and evidence requirements should shape the foundation rather than appear as a policy note at the end.
        </p>
      </>
    )
  },
  "governed-digital-workforce": {
    topic: "Platforms",
    title: "From agent experiments to a governed digital workforce.",
    date: "15 August 2026",
    author: "Platforms Team",
    readingTime: "6 min read",
    heroImage: "/images/cognirise/site-cognios.jpg",
    content: (
      <>
        <p className="lead">
          What it takes to deploy agents into real operating environments—with people accountable at every decision point.
        </p>
        <p>
          We are moving from an era where AI generates text to an era where AI takes action. Agents are systems that can perceive an environment, make decisions based on a goal, and use tools to execute tasks. But deploying an agent in a consequential enterprise environment is fundamentally different from a sandbox experiment.
        </p>
        <p>
          A digital workforce requires an operating model. Who manages the agents? How do they escalate exceptions? How do you audit a decision made at machine speed?
        </p>
        <h3>The accountability model</h3>
        <p>
          Agents do not replace human authority; they require it to be more precise. A governed digital workforce operates within strict, declarative boundaries. An agent might have the authority to process an invoice up to $10,000 if it matches a purchase order, but it must flag anything anomalous to a human operator.
        </p>
        <p>
          This is where the Experience Layer of CogniOS becomes critical. The interface between human and agent must fit the operating context and present the information necessary for a person to make an informed judgment. 
        </p>
        <p>
          The digital workforce is not an IT project. It is a new way of organizing the enterprise. Start with one process, define the boundaries, and build the controls before you scale.
        </p>
      </>
    )
  }
};

export default function InsightArticle() {
  const [match, params] = useRoute("/insights/:slug");
  const { market, locale } = useMarketStore();
  const slug = params?.slug || "";
  const releaseContext = useReleaseContext();
  const compiledArticle = market === "uae" && locale === "en"
    && !releaseContext && Object.hasOwn(articles, slug);
  const cms = useCmsEntry("publication", slug, { preferCompiled: compiledArticle });
  const record = cms.data ? contentRecord(cms.data, "publication") : undefined;
  const heroMedia = record && cms.data
    ? resolveCmsMedia(cms.data.media, record.heroMedia, record.heroMediaId)
    : undefined;
  const pdfMedia = record && cms.data
    ? resolveCmsMedia(cms.data.media, record.pdfMedia, record.pdfMediaId)
    : undefined;
  const socialMedia = record && cms.data
    ? resolveCmsMedia(cms.data.media, record.social.imageMedia, record.social.imageMediaId)
    : undefined;
  const article = cms.data ? {
    topic: record?.topics[0] || "Perspective",
    title: cms.data.title,
    date: new Date(`${record?.publicationDate}T00:00:00Z`).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" }),
    author: record?.author || "Cognirise",
    readingTime: `${record?.readingTimeMinutes ?? 1} min read`,
    heroImage: heroMedia?.url || "",
    content: record?.variant === "pov" ? (
      <><p className="lead">{record.teaser}</p>{pdfMedia && <p><a href={pdfMedia.url}>Download the approved POV document</a></p>}</>
    ) : (
      <>{record?.body.map((block, index) => {
        if (block.type === "heading") return <h3 key={index}>{block.text}</h3>;
        if (block.type === "list") return <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
        if (block.type === "quote") return <blockquote key={index}>{block.text}</blockquote>;
        return <p className={index === 0 ? "lead" : undefined} key={index}>{block.text}</p>;
      })}</>
    ),
  } : compiledArticle
    ? articles[slug as keyof typeof articles]
    : undefined;
  useDynamicMetadata(cms.data?.seo && metadataFromSeo(cms.data.seo, {
    title: `${cms.data.title} | Cognirise`,
    description: cms.data.summary || "A Cognirise perspective on governed AI-native organisations.",
    imageUrl: socialMedia?.url || heroMedia?.url,
  }));

  if (!match || !slug) {
    return <NotFound />;
  }
  if (cms.isError && cmsRequestIsUnavailable(cms.error)) {
    return <ServiceError onRetry={() => { void cms.refetch(); }} />;
  }
  if ((!article && !cms.isPending) || (cms.isAuthoritative && cms.issue)) return <NotFound />;

  if (!article) return null;

  if (cms.data && record) {
    return (
      <PublicationPresentation
        title={cms.data.title}
        summary={cms.data.summary}
        content={record}
        heroMedia={heroMedia}
        pdfMedia={pdfMedia}
        socialMedia={socialMedia}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="public-hero-shell">
      <article className="w-full max-w-[900px] py-12 md:py-20">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Perspective · {article.topic}
        </div>
        
        <h1 data-cms-field="title" className="text-4xl md:text-5xl lg:text-[64px] leading-[1.05] font-semibold mb-10 tracking-tight">
          {article.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-12 py-6 border-y border-border">
          <div>By {article.author}</div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-border" />
          <div>{article.date}</div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-border" />
          <div>{article.readingTime}</div>
        </div>
        
        <div className="prose prose-lg md:prose-xl max-w-none prose-headings:font-display prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[hsl(var(--brand-pink))] hover:prose-a:text-[hsl(var(--brand-coral))] prose-p:leading-relaxed prose-p:text-foreground/80">
          <style>{`
            .prose .lead { font-size: 1.25em; line-height: 1.6; color: hsl(var(--foreground)); font-weight: 500; margin-bottom: 2em; }
            .prose h3 { margin-top: 2em; margin-bottom: 1em; font-size: 1.75em; color: hsl(var(--brand-deep)); }
          `}</style>
          
          {article.content}
        </div>
        
        <div className="mt-20 pt-10 border-t border-foreground">
          <div className="bg-[hsl(var(--secondary))] p-8 md:p-12 text-center flex flex-col items-center">
            <h3 className="font-display text-2xl md:text-3xl font-semibold mb-4">Ready to move the work?</h3>
            <p className="text-muted-foreground mb-8 max-w-[400px]">
              Start with one process under pressure. In a focused working session, we surface the opportunity and practical route to production.
            </p>
            <BrandButton href="/value-scan">Book a value scan</BrandButton>
          </div>
        </div>
      </article>
      </div>
    </div>
  );
}
