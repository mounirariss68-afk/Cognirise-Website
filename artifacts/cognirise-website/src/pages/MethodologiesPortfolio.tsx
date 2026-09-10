import { ArrowRight, Download } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { assetUrl } from "@/lib/assets";

type PortfolioItem = {
  release: string;
  title: string;
  user: string;
  decision: string;
  output: string;
  relation: string;
  href?: string;
};

const portfolio: PortfolioItem[] = [
  { release: "Available now", title: "AI Value-to-Scale Maturity Model", user: "Enterprise and government leaders", decision: "What prevents repeatable movement from opportunity to sustained value?", output: "Seven-dimension maturity profile, evidence gaps and prioritized actions", relation: "Sets the portfolio-level starting point; IDAO moves selected work; Value Scan frames the first route.", href: "/methodologies/ai-value-to-scale" },
  { release: "Roadmap 02", title: "Agentic Operations Readiness Framework", user: "Process owners, operations, technology and risk", decision: "Is this workflow ready for agents, and what must change first?", output: "Workflow readiness decision covering stability, access, fallback, exceptions, observability and economics", relation: "Tests the workflow before delivery; Agent Authority then sets authority for each handover." },
  { release: "Roadmap 03", title: "AI Use-Case Portfolio Prioritization Method", user: "Transformation and investment leaders", decision: "Which opportunities should advance, sequence or stop?", output: "Transparent scorecard and an Innovate, Demonstrate, Activate or stop recommendation", relation: "Feeds selected opportunities into IDAO and gives the Value Scan a comparable portfolio context." },
  { release: "Roadmap 04", title: "Human–Agent Operating Model Playbook", user: "Business, workforce and operating-model leaders", decision: "How must roles, rights and handovers change when AI enters real work?", output: "Role redesign, decision rights, handovers, capability plan, incentives and adoption measures", relation: "Makes Activate and Operate durable; uses Agent Authority for consequential handovers." },
  { release: "Available now", title: "Self-Administered AI Maturity Assessment", user: "Leadership teams seeking a private first view", decision: "Where are the weakest evidence-backed conditions for sustained value?", output: "Dimension scores, evidence gaps and 3–5 actions—not a benchmark or certification", relation: "A private entry point to the Value-to-Scale model; an optional Value Scan can test the priority in context.", href: "/methodologies/ai-value-to-scale#assessment" },
];

export default function MethodologiesPortfolio() {
  return (
    <main className="bg-[#fdfcfb] text-[#102957]">
      <header className="px-6 pb-20 pt-12 md:px-[4.8vw] lg:pb-28">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--brand-pink))]">Cognirise methodologies</p>
        <div className="mt-7 grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <h1 className="font-display text-[clamp(52px,8vw,118px)] font-semibold leading-[.88] tracking-[-.09em]">A portfolio for AI that has to operate.</h1>
          <div className="border-t border-[#102957] pt-6"><p className="text-lg leading-[1.6] text-[#405777]">Five connected methods answer five different decisions—from organisational readiness to workflow authority. The first release combines the AI Value-to-Scale model with a private self-assessment.</p><BrandButton href="/methodologies/ai-value-to-scale" className="mt-7">Explore the first release</BrandButton></div>
        </div>
      </header>
      <section className="border-y border-[#cbd3e1] bg-[#f1f3f7] px-6 py-20 md:px-[4.8vw]" aria-labelledby="roadmap-title">
        <h2 id="roadmap-title" className="font-display text-[clamp(40px,5vw,72px)] font-semibold tracking-[-.08em]">Publication roadmap</h2>
        <p className="mt-4 max-w-2xl text-sm leading-[1.65] text-[#536887]">The sequence is deliberate. Later methods deepen a distinct decision without duplicating IDAO or the Agent Authority Model.</p>
        <ol className="mt-10 border-l border-t border-[#cbd3e1]">
          {portfolio.map((item, index) => <li key={item.title} className="grid gap-5 border-b border-r border-[#cbd3e1] bg-white p-6 lg:grid-cols-[70px_1fr_1.1fr] lg:p-8">
            <div><span className="text-[10px] font-bold text-[hsl(var(--brand-pink))]">0{index + 1}</span><span className="mt-2 block text-[9px] uppercase tracking-wider text-[#647491]">{item.release}</span></div>
            <div><h3 className="font-display text-2xl font-semibold tracking-[-.05em]">{item.title}</h3><p className="mt-3 text-xs leading-[1.5] text-[#647491]"><strong>User:</strong> {item.user}</p>{item.href && <a href={item.href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4">Open methodology <ArrowRight size={14} /></a>}</div>
            <dl className="grid gap-4 text-sm leading-[1.55] text-[#405777]"><div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#647491]">Decision</dt><dd className="mt-1">{item.decision}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#647491]">Output</dt><dd className="mt-1">{item.output}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#647491]">Connection and boundary</dt><dd className="mt-1">{item.relation}</dd></div></dl>
          </li>)}
        </ol>
        <a href={assetUrl("/downloads/cognirise-ai-value-to-scale-assessment.pdf")} download className="mt-8 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"><Download size={16} /> Download the assessment worksheet</a>
      </section>
    </main>
  );
}
