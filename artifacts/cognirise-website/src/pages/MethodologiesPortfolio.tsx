import { ArrowRight, Download } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { assetUrl } from "@/lib/assets";
import { MethodologyRouteMap } from "@/components/MethodologyRouteMap";

type PortfolioItem = {
  release: string;
  title: string;
  user: string;
  decision: string;
  output: string;
  relation: string;
  href?: string;
  nested?: { title: string; desc: string };
};

const portfolio: PortfolioItem[] = [
  {
    release: "Available now",
    title: "AI Value-to-Scale Maturity Model",
    user: "Enterprise and government leaders",
    decision: "What prevents repeatable movement from opportunity to sustained value?",
    output: "Seven-dimension maturity profile, evidence gaps and prioritized actions",
    relation: "IDAO: identifies constraints, priorities and potential initiatives; evidence determines entry at Innovate or a later stage. Agent Authority: tests governance capability, but sets no handover limit itself.",
    href: "/methodologies/ai-value-to-scale",
    nested: { title: "Self-Administered AI Maturity Assessment", desc: "An application of Value-to-Scale with the same IDAO and Agent Authority relationships." }
  },
  { release: "Available now", title: "Agentic Operations Readiness Framework", user: "Process owners, operations, technology and risk", decision: "Is this workflow ready for agents, and what must change first?", output: "Proceed, Prepare or Stop decision with a register of unresolved operating conditions", relation: "IDAO: missing conditions become work at the appropriate stage and the test repeats when scope changes. Agent Authority: separately sets independence for each consequential handover.", href: "/methodologies/agentic-operations-readiness" },
  { release: "Available now", title: "AI Use-Case Portfolio Prioritization Method", user: "Transformation and investment leaders", decision: "Which opportunities should advance, sequence or stop?", output: "Transparent scorecard and an Innovate, Demonstrate, Activate or stop recommendation", relation: "IDAO: recommends stop, investigate, demonstrate or activate. Agent Authority: exposure and oversight affect control burden, priority, scope and entry point.", href: "/methodologies/ai-use-case-prioritization" },
  { release: "Available now", title: "Human–Agent Operating Model Playbook", user: "Business, workforce and operating-model leaders", decision: "How must roles, rights and handovers change when AI enters real work?", output: "Role and handover design, decision-rights map, capability plan, incentive changes and adoption measures", relation: "IDAO: shapes work across all four stages. Agent Authority: translates consequential handovers into explicit rights without replacing the approved calculation.", href: "/methodologies/human-agent-operating-model" },
];

export default function MethodologiesPortfolio() {
  return (
    <main className="bg-[#fdfcfb] text-[#102957]">
      <header className="px-6 pb-20 pt-12 md:px-[4.8vw] lg:pb-28">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--brand-pink))]">Cognirise methodologies</p>
        <div className="mt-7 grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <h1 className="font-display text-[clamp(52px,8vw,118px)] font-semibold leading-[.88] tracking-[-.09em]">A portfolio for AI that has to operate.</h1>
          <div className="border-t border-[#102957] pt-6">
            <p className="text-lg leading-[1.6] text-[#405777]">
              Every supporting method connects to our two approved anchors: <strong>IDAO</strong> is our core adaptive delivery framework, and the <strong>Agent Authority Model</strong> governs consequential handovers across it.
            </p>
            <BrandButton href="/methodologies/agentic-operations-readiness" className="mt-7">Assess a workflow</BrandButton>
          </div>
        </div>
      </header>
      <section className="border-y border-[#cbd3e1] bg-[#fdfcfb] px-6 py-20 md:px-[4.8vw]" aria-labelledby="roadmap-title">
        <h2 id="roadmap-title" className="font-display text-[clamp(40px,5vw,72px)] font-semibold tracking-[-.08em]">Methodology Route Map</h2>
        <p className="mt-4 max-w-2xl text-sm leading-[1.65] text-[#536887]">Connect every method to our two core anchors: IDAO for adaptive delivery, and the Agent Authority Model for safe handovers. Select your situation to see the logical route.</p>
        <div className="mt-12">
          <MethodologyRouteMap />
        </div>

        <div className="mt-20 border-t border-[#cbd3e1] pt-16" aria-labelledby="portfolio-list-title">
          <h2 id="portfolio-list-title" className="font-display text-[clamp(32px,4vw,56px)] font-semibold tracking-[-.06em]">The Methods</h2>
          <ol className="mt-10 border-l border-t border-[#cbd3e1] grid lg:grid-cols-2">
          {portfolio.map((item) => <li key={item.title} className="flex flex-col gap-5 border-b border-r border-[#cbd3e1] bg-white p-6 lg:p-8">
            <div><span className="block text-[9px] uppercase tracking-wider text-[#647491]">{item.release}</span></div>
            <div>
              <h3 className="font-display text-2xl font-semibold tracking-[-.05em]">{item.title}</h3>
              <p className="mt-3 text-xs leading-[1.5] text-[#647491]"><strong>User:</strong> {item.user}</p>
              {item.nested && (
                <div className="mt-5 p-4 border border-[#cbd3e1] bg-[#f1f3f7] rounded-sm">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#647491] block mb-1">Nested Instrument</span>
                  <h4 className="font-semibold text-sm text-[#102957]">{item.nested.title}</h4>
                  <p className="text-[11px] text-[#536887] mt-1">{item.nested.desc}</p>
                </div>
              )}
              {item.href && <a href={item.href} className="mt-6 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4 text-[hsl(var(--brand-pink))] hover:text-[#102957]">Open methodology <ArrowRight size={14} /></a>}
            </div>
            <dl className="grid gap-4 text-sm leading-[1.55] text-[#405777] mt-auto pt-6 border-t border-[#cbd3e1]"><div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#647491]">Decision</dt><dd className="mt-1">{item.decision}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#647491]">Output</dt><dd className="mt-1">{item.output}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#647491]">Connection</dt><dd className="mt-1">{item.relation}</dd></div></dl>
          </li>)}
        </ol>
        <a href={assetUrl("/downloads/cognirise-ai-value-to-scale-assessment.pdf")} download className="mt-8 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4 text-[#102957] hover:text-[hsl(var(--brand-pink))]"><Download size={16} /> Download the VTS assessment worksheet</a>
        </div>
      </section>
    </main>
  );
}
