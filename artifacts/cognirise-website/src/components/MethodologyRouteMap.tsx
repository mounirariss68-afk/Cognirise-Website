import { useState, useEffect, type KeyboardEvent, useRef } from "react";
import { CornerDownRight } from "lucide-react";
import { Link } from "wouter";
import { BrandButton } from "@/components/ui/brand-button";
import { trackProjectEvent } from "@/lib/analytics";
import { assetUrl } from "@/lib/assets";
import "./MethodologyRouteMap.css";
import "./MethodologyRouteMap.print.css";

type RouteSituation = "investment" | "competing-ideas" | "existing-strategy" | "process-problem" | "pilot-release" | "proven-expansion" | "underperformance";

const SITUATION_ART: Record<RouteSituation, { src: string; alt: string }> = {
  investment: { src: "/images/cognirise/situations/investment.jpg", alt: "Several illuminated paths narrow toward a bounded architectural opening." },
  "competing-ideas": { src: "/images/cognirise/situations/competing-ideas.jpg", alt: "Distinct illuminated passages meet at a central decision threshold." },
  "existing-strategy": { src: "/images/cognirise/situations/existing-strategy.jpg", alt: "Translucent planning planes lead into a structured passage for delivery." },
  "process-problem": { src: "/images/cognirise/situations/process-problem.jpg", alt: "A disrupted light path is deliberately rerouted through an architectural opening." },
  "pilot-release": { src: "/images/cognirise/situations/pilot-release.jpg", alt: "An experimental module connects to a supported operating structure." },
  "proven-expansion": { src: "/images/cognirise/situations/proven-expansion.jpg", alt: "A working structure connects by light paths to new contextual spaces." },
  underperformance: { src: "/images/cognirise/situations/underperformance.jpg", alt: "A misaligned signal passes through a diagnostic loop toward a deliberate next decision." },
};

const STORAGE_KEY_SELECTION = "cognirise-methodology-selection";
const STORAGE_KEY_SCROLL = "cognirise-methodology-scroll";

// Keep compound words intact in print so copied/extracted PDF text retains
// the exact wording instead of gaining a space at a hyphen line break.
function printWords(text: string) {
  return text.split(/(\S*-\S*)/g).map((part, index) =>
    part.includes("-") ? <span key={index} style={{ whiteSpace: "nowrap" }}>{part}</span> : part,
  );
}

const ROUTE_DATA = [
  {
    id: "investment", label: "We need to know where AI is worth investing.",
    description: "We are exploring AI, but have not established a useful opportunity or a convincing business case. We need to understand the likely benefits, costs and evidence before committing.",
    existingAssets: "Strategic goals, cost pressures, baseline information or a few ideas may exist; a chosen project is not required.",
    decision: "What problem, if any, is worth addressing with AI, and what evidence would justify the investment?",
    output: "A bounded value hypothesis; comparison with non-AI alternatives; benefits, full costs, assumptions, owner and measurement plan; a proportionate next test or a reason not to proceed. This self-service route is not a complete business case; producing a full business case is additional engagement work.",
    methods: [
      { name: "IDAO opportunity framing", href: "/methodologies/idao", reason: "Use Innovate when the opportunity, accountable owner, measurable outcome or proof plan is still unresolved." },
      { name: "AI Use-Case Prioritization", href: "/methodologies/ai-use-case-prioritization", reason: "Use only when actual comparable alternatives already exist; its scorecard informs sequence, not a complete financial business case." },
    ],
    idao: "IDAO's canonical Innovate, Demonstrate, Activate and Operate gates remain evidence-dependent. Enter Innovate when the opportunity or evidence is unresolved; move to Demonstrate for a bounded hypothesis that needs proof, while adequate existing evidence can support a later entry.",
    authority: "Use Agent Authority only when a specific consequential Knowledge, Decision or Action handover needs a ceiling. It is not a prerequisite for deciding whether to invest.",
    actions: [
      { label: "Frame an opportunity in IDAO", href: "/methodologies/idao", type: "primary" },
      { label: "Compare defined opportunities", href: "/methodologies/ai-use-case-prioritization", type: "secondary" },
    ]
  },
  {
    id: "competing-ideas", label: "We have several AI ideas and need to choose.",
    description: "We have competing proposals and limited money or capacity. We need to decide what to fund first, what to investigate and what to stop.",
    existingAssets: "Candidate descriptions, value hypotheses and some feasibility information exist, even if the evidence quality varies.",
    decision: "Which proposals should advance, in what order, and which should wait or stop?",
    output: "A transparent comparative decision with evidence gaps, capacity and control considerations, and investigate, demonstrate, activate or stop recommendations.",
    methods: [
      { name: "AI Use-Case Prioritization", href: "/methodologies/ai-use-case-prioritization", reason: "Compare proposals across value, feasibility, time to evidence, adoption friction, control burden and reuse potential." },
      { name: "IDAO delivery gates", href: "/methodologies/idao", reason: "Treat each recommendation as input to the canonical evidence gate; a score is not permission to bypass IDAO." },
    ],
    idao: "Route each selected proposal according to its evidence: Innovate for unresolved opportunity, Demonstrate for a bounded test, Activate when implementation evidence is sufficient, or Stop when it should not proceed.",
    authority: "Control burden and required oversight can change priority or the responsible IDAO entry. Use Agent Authority separately for each consequential handover.",
    actions: [
      { label: "Open prioritization", href: "/methodologies/ai-use-case-prioritization", type: "primary" },
      { label: "Review IDAO gates", href: "/methodologies/idao", type: "secondary" },
    ]
  },
  {
    id: "existing-strategy", label: "We have an AI strategy and need to implement it.",
    description: "We already have a strategy or roadmap, whether developed internally or by a consultant. We need to turn it into owned, funded delivery work without repeating decisions that are already supported.",
    existingAssets: "The strategy may include priority use cases, architecture, recommendations and a governance model; its completeness and evidence still need to be checked.",
    decision: "What can we start delivering now, who owns it, and what evidence or dependencies are still missing?",
    output: "An agreed first delivery package, accountable owner, funding and resourcing decisions, acceptance measures, dependencies and evidence-based IDAO entry. Turning a strategy or roadmap into delivery is additional engagement work beyond this self-service route.",
    methods: [
      { name: "Direct IDAO entry", href: "/methodologies/idao", reason: "Review existing evidence and enter the earliest responsible gate; a roadmap does not require a strategy restart or bypass an evidence gate." },
      { name: "Supporting methods when a question remains", href: "/methodologies/ai-use-case-prioritization", reason: "Use prioritization, Value-to-Scale, readiness or work-design methods only for a specific unresolved decision—not a generic implementation score." },
    ],
    idao: "Enter the earliest IDAO stage whose gate the existing evidence can responsibly satisfy. Demonstrate, Activate or Operate may be appropriate; return to Innovate only where the opportunity itself needs reframing.",
    authority: "Review a specific consequential handover when one is part of the delivery package. Agent Authority does not replace the delivery gate; guardrails remain a complementary control question.",
    actions: [
      { label: "Review IDAO delivery entry", href: "/methodologies/idao", type: "primary" },
      { label: "Open a supporting method", href: "/methodologies/ai-use-case-prioritization", type: "secondary" },
    ]
  },
  {
    id: "process-problem", label: "We need to improve a specific process.",
    description: "We know where work is slow, costly or unreliable. We need to work out whether AI would help and what must change in the process—not start by assuming it needs agents.",
    existingAssets: "A known operational problem, affected work and ideally a process owner and baseline are available; an AI solution is not yet assumed.",
    decision: "What change would improve this process, and does AI have a useful role?",
    output: "A clear problem and baseline, changed-work proposal, AI and non-AI options, feasibility questions and a bounded test.",
    methods: [
      { name: "IDAO opportunity framing", href: "/methodologies/idao", reason: "Frame the bounded problem, evidence and next test without presuming an agent solution." },
      { name: "Human–Agent Operating Model", href: "/methodologies/human-agent-operating-model", reason: "Use when people, responsibilities, capabilities, incentives or handovers must change in the proposed work." },
      { name: "Agentic Operations Readiness", href: "/methodologies/agentic-operations-readiness", reason: "Use only for an actual proposed agent workflow; it tests operating conditions, not every process-improvement option." },
    ],
    idao: "Use Innovate for an unresolved intervention and Demonstrate for a bounded test. Do not require an agent-specific assessment when a non-agent process change is the better option.",
    authority: "If the proposed change includes a consequential handover, define its authority separately. Guardrails and authority are specialist considerations, not an eighth starting situation.",
    actions: [
      { label: "Frame the process opportunity", href: "/methodologies/idao", type: "primary" },
      { label: "Open work-design playbook", href: "/methodologies/human-agent-operating-model", type: "secondary" },
      { label: "Assess an agent workflow", href: "/methodologies/agentic-operations-readiness", type: "secondary" },
    ]
  },
  {
    id: "pilot-release", label: "We have a pilot and need to put it into everyday use.",
    description: "We have tested something, but it is not yet a supported part of normal work. We need to establish what remains before people can rely on it.",
    existingAssets: "A prototype or limited trial exists, with some test evidence; integration, security, support, ownership, adoption or a safe release decision may remain unresolved.",
    decision: "What must be proven or completed before this can become a dependable part of normal work?",
    output: "An explicit proceed, prepare or stop decision where the agent-readiness method applies, or an IDAO release plan covering acceptance, integration, monitoring, fallback, support and people.",
    methods: [
      { name: "IDAO delivery gate", href: "/methodologies/idao", reason: "Use the canonical gate for a governed implementation and move into Operate only with the required release and ownership evidence." },
      { name: "Agentic Operations Readiness when agent-based", href: "/methodologies/agentic-operations-readiness", reason: "Test the six operating conditions for the actual agent workflow; a promising demo does not automatically earn release." },
      { name: "Human–Agent Operating Model when work changes", href: "/methodologies/human-agent-operating-model", reason: "Design responsibilities, decision rights, enablement and adoption where everyday work will change." },
    ],
    idao: "Remain in Demonstrate while evidence is insufficient; enter Activate when governed implementation is justified, then Operate once release, ownership and support evidence are in place.",
    authority: "Set authority for each consequential handover before it operates. The approved guardrails-versus-authority distinction helps separate control requirements from the authority ceiling.",
    actions: [
      { label: "Review the IDAO gate", href: "/methodologies/idao", type: "primary" },
      { label: "Assess agent operating conditions", href: "/methodologies/agentic-operations-readiness", type: "secondary" },
      { label: "Design changed work", href: "/methodologies/human-agent-operating-model", type: "secondary" },
    ]
  },
  {
    id: "proven-expansion", label: "AI works in one area. We need to expand it.",
    description: "We have evidence of value in an existing live setting. We need to decide what can be reused and what must change for other teams, locations or workloads.",
    existingAssets: "An operating use case has a baseline, demonstrated benefit, an owner and service or control experience; the new context may differ in data, language, permissions or accountability.",
    decision: "What can we reuse, what changes in the new context, and where should expansion proceed?",
    output: "An expansion decision and prioritized dependencies, with validated reuse assumptions, people and control changes, and renewed evidence where needed.",
    methods: [
      { name: "IDAO Operate and loopback", href: "/methodologies/idao", reason: "Use operating evidence to inform expansion; new contexts may need Demonstrate or Activate rather than a blanket scale approval." },
      { name: "AI Value-to-Scale", href: "/methodologies/ai-value-to-scale", reason: "Use for repeated organizational constraints and evidence gaps across teams or locations, not as a financial business-case calculator." },
      { name: "AI Use-Case Prioritization", href: "/methodologies/ai-use-case-prioritization", reason: "Compare expansion choices when there are several candidate teams, contexts or workloads." },
      { name: "Human–Agent Operating Model", href: "/methodologies/human-agent-operating-model", reason: "Use where changed roles, capability, incentives, adoption or handovers determine whether reuse will hold." },
    ],
    idao: "Operate evidence can inform expansion. Enter Demonstrate or Activate again where the new context changes the evidence; materially new opportunities may return to Innovate.",
    authority: "Revisit each consequential handover when exposure, scope, evidence or operating context changes. Guardrails remain complementary to the canonical authority decision.",
    actions: [
      { label: "Review expansion through IDAO", href: "/methodologies/idao", type: "primary" },
      { label: "Assess organizational constraints", href: "/methodologies/ai-value-to-scale", type: "secondary" },
      { label: "Compare expansion choices", href: "/methodologies/ai-use-case-prioritization", type: "secondary" },
    ]
  },
  {
    id: "underperformance", label: "Our AI is in use, but the results are falling short.",
    description: "AI is already part of the work, but the benefits, quality, cost or adoption are disappointing. We need to identify the cause and decide whether to improve, redesign, replace or stop it.",
    existingAssets: "A live deployment and some usage or performance evidence exist; a measurement gap must be acknowledged rather than filled with an assumed result.",
    decision: "Why are the results insufficient, and should we improve, redesign, replace, reduce scope or stop?",
    output: "A diagnosis against an agreed baseline and outcome, a targeted corrective decision with an owner, and a retest or stop criterion.",
    methods: [
      { name: "IDAO operating evidence and loopback", href: "/methodologies/idao", reason: "Use live evidence to improve, constrain or return to the responsible earlier decision; do not automatically prescribe another pilot." },
      { name: "Human–Agent Operating Model", href: "/methodologies/human-agent-operating-model", reason: "Use directly when responsibilities, incentives, capabilities, adoption or handovers are the known cause." },
      { name: "AI Value-to-Scale", href: "/methodologies/ai-value-to-scale", reason: "Use for repeated systemic constraints across the organization, not as a universal failure score." },
      { name: "Agentic Operations Readiness when conditions fail", href: "/methodologies/agentic-operations-readiness", reason: "Use for an unsafe or underperforming agent workflow to identify unresolved operating conditions." },
    ],
    idao: "Stay in Operate for bounded improvement when the proposition remains sound; return to Demonstrate or Innovate when assumptions fail. Stop or constrain unsafe or unviable work.",
    authority: "If a known problem concerns a consequential handover, use Agent Authority directly and reassess when exposure, scope or evidence changes. Review the existing guardrails distinction alongside it.",
    actions: [
      { label: "Review operating evidence in IDAO", href: "/methodologies/idao", type: "primary" },
      { label: "Open work-design playbook", href: "/methodologies/human-agent-operating-model", type: "secondary" },
      { label: "Review organizational constraints", href: "/methodologies/ai-value-to-scale", type: "secondary" },
    ]
  }
] as const;

type MethodologyDestination = (typeof ROUTE_DATA)[number]["actions"][number]["href"];

export function MethodologyRouteMap() {
  const [activeSituation, setActiveSituation] = useState<RouteSituation>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_SELECTION);
      if (stored && ROUTE_DATA.some(r => r.id === stored)) {
        return stored as RouteSituation;
      }
    } catch (e) {}
    return "investment";
  });
  const [previewSituation, setPreviewSituation] = useState<RouteSituation | null>(null);

  const outputRef = useRef<HTMLDivElement>(null);
  // Defaults and restored state are not buyer interactions.
  const lastSelectedSituation = useRef<RouteSituation | null>(null);

  const selectSituation = (situation: RouteSituation) => {
    setPreviewSituation(null);
    setActiveSituation(situation);
    // Keep the decision heading in view when the desktop detail pane has been scrolled.
    outputRef.current?.scrollTo({ top: 0 });
    if (lastSelectedSituation.current === situation) return;
    lastSelectedSituation.current = situation;
    trackProjectEvent("methodology_route_selected", {
      situation,
      location: window.innerWidth < 768 ? "mobile_route_selector" : "desktop_route_selector",
    });
  };

  const openDestination = (destination: MethodologyDestination) => {
    handleLinkClick();
    trackProjectEvent("methodology_destination_opened", {
      situation: activeSituation,
      destination,
      location: window.innerWidth < 768 ? "mobile_selected_route" : "desktop_selected_route",
    });
  };

  const openAnchor = (destination: "/methodologies/idao" | "/methodologies/agent-authority-model" | "/methodologies/agent-authority-model#guardrails-and-authority") => {
    handleLinkClick();
    const location = window.innerWidth < 768 ? "mobile_route_map" : "desktop_route_map";
    trackProjectEvent("methodology_anchor_opened", { destination, location });
  };

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_SELECTION, activeSituation);
    } catch (e) {}
  }, [activeSituation]);

  const handleLinkClick = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY_SCROLL, window.scrollY.toString());
    } catch (e) {}
  };

  const handleSituationKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) return;
    event.preventDefault();
    const direction = (event.key === "ArrowDown" || event.key === "ArrowRight") ? 1 : -1;
    const nextIndex = (index + direction + ROUTE_DATA.length) % ROUTE_DATA.length;
    const nextButton = event.currentTarget
      .closest('[role="radiogroup"]')
      ?.querySelector<HTMLButtonElement>(`[data-route-index="${nextIndex}"]`);
    
    if (nextButton) {
      nextButton.focus();
      const nextId = ROUTE_DATA[nextIndex].id as RouteSituation;
      selectSituation(nextId);
      
    }
  };

  const handleRadioClick = (id: RouteSituation) => {
    selectSituation(id);
    if (window.innerWidth < 768 && outputRef.current) {
       const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
       outputRef.current.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }
  };

  const displayedSituation = previewSituation ?? activeSituation;
  const activeRoute = ROUTE_DATA.find(r => r.id === displayedSituation) || ROUTE_DATA[0];
  const previewOnMouse = (id: RouteSituation, pointerType: string) => {
    if (pointerType === "mouse") {
      outputRef.current?.scrollTo({ top: 0 });
      setPreviewSituation(id);
    }
  };

  return (
    <>
    <section className="methodology-route-print" aria-label="Complete methodology route map">
      <h2>Cognirise methodology route map</h2>
      <div className="methodology-print-anchors" aria-label="Governing framework anchors">
        <h3>Governing frameworks</h3>
        <p><Link href="/methodologies/idao">IDAO Delivery Framework</Link></p>
        <p><Link href="/methodologies/agent-authority-model">Agent Authority Model</Link></p>
      </div>
      {ROUTE_DATA.map((route) => (
        <article key={route.id} data-print-route={route.id}>
          <p><strong>Situation:</strong> {printWords(route.label)}</p>
          <p><strong>Description:</strong> {printWords(route.description)}</p>
          <p><strong>Existing assets:</strong> {printWords(route.existingAssets)}</p>
          <h3>Decision in front of you</h3>
          <p>{printWords(route.decision)}</p>
          <p><strong>Actual output:</strong> {printWords(route.output)}</p>
          <p><strong>Relevant methods:</strong> {printWords(route.methods.map((method) => method.name).join("; "))}</p>
          <p><strong>Why these methods:</strong> {printWords(route.methods.map((method) => method.name + ": " + method.reason).join(" "))}</p>
          <p><strong>Conditional IDAO connection:</strong> {printWords(route.idao)}</p>
          <p><strong>Connection to Agent Authority:</strong> {printWords(route.authority)}</p>
          <div>
            {route.actions.map((action) => (
              <p key={action.href}><Link href={action.href}>{action.label}</Link></p>
            ))}
          </div>
        </article>
      ))}
      <section className="methodology-print-specialists" aria-label="Direct specialist routes">
        <h3>Direct specialist routes</h3>
        <p><strong>Human–Agent Operating Model:</strong> Open the playbook directly when changed work, roles, capabilities, adoption or handovers are already the decision.</p>
        <p><strong>Agent Authority Model:</strong> Calculate the ceiling directly for a specific consequential Knowledge, Decision or Action handover.</p>
        <p><strong>AI Guardrails:</strong> Planned as a complementary specialist method alongside Agent Authority. No standalone Guardrails framework or assessment is published; read the approved guardrails-versus-authority distinction in the existing Agent Authority page.</p>
        <p><Link href="/methodologies/human-agent-operating-model">Open Human–Agent Operating Model</Link></p>
        <p><Link href="/methodologies/agent-authority-model">Open Agent Authority Model</Link></p>
        <p><Link href="/methodologies/agent-authority-model#guardrails-and-authority">Read approved guardrails-versus-authority distinction</Link></p>
      </section>
    </section>
    <div data-testid="methodology-route-map" className="methodology-route-screen [&_button]:scroll-mt-32 [&_a]:scroll-mt-32">
        {/* Each complete text-and-art panel is one choice. */}
      <div className="methodology-route-rail" onPointerLeave={() => setPreviewSituation(null)}>
        <div className="methodology-route-rail-heading">
           <h3>Choose the decision in front of you</h3>
           <p>Seven starting points. One next decision.</p>
        </div>
        <div 
          role="radiogroup" 
          aria-label="Starting situation" 
           className="methodology-route-choices"
          data-testid="situation-radiogroup"
        >
          {ROUTE_DATA.map((sit, index) => {
            const isActive = activeSituation === sit.id;
            const isPreview = previewSituation === sit.id;
            return (
              <button
                key={sit.id}
                role="radio"
                aria-checked={isActive}
                aria-controls="selected-route-output"
                data-route-index={index}
                data-testid={`situation-radio-${sit.id}`}
                data-committed={isActive}
                data-preview={isPreview}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleRadioClick(sit.id as RouteSituation)}
                onPointerEnter={(event) => previewOnMouse(sit.id as RouteSituation, event.pointerType)}
                onFocus={() => setPreviewSituation(null)}
                onKeyDown={(event) => handleSituationKeyDown(event, index)}
                className="methodology-route-choice"
              >
                 <span className="methodology-route-choice-content">
                  <span className="methodology-route-choice-index">{String(index + 1).padStart(2, "0")} / 07{isActive ? " · Selected" : ""}</span>
                  <span className="methodology-route-choice-label">
                    {sit.label}
                  </span>
                </span>
                  <span className="methodology-route-art">
                    <img src={assetUrl(SITUATION_ART[sit.id].src)} alt={SITUATION_ART[sit.id].alt} loading={index < 3 ? "eager" : "lazy"} data-pulse-image-resilient="true" />
                  </span>
              </button>
            )
          })}
        </div>
      </div>

       {/* Details remain editorial copy; no second copy of the selected scene. */}
      <div 
        id="selected-route-output"
        role="region"
        aria-label="Situation route details"
        data-testid="route-output-panel"
        ref={outputRef}
        className="methodology-route-detail scroll-mt-24"
      >
        <span className="sr-only" role="status" aria-live="polite">Selected situation: {ROUTE_DATA.find(r => r.id === activeSituation)?.label}</span>
        <div>
           {/* Decision-first output header */}
            <div className="methodology-route-hero">
             <div className="methodology-route-hero-copy">
               <div className="methodology-route-hero-kicker">{previewSituation ? "Previewing" : "Selected route"} / {String(ROUTE_DATA.findIndex(r => r.id === displayedSituation) + 1).padStart(2, "0")}</div>
             <h4 className="font-display text-[clamp(32px,5vw,52px)] font-semibold text-[#102957] tracking-[-.04em] leading-[1.05]" data-testid="route-detail-situation">
               {activeRoute.label}
              </h4>
             </div>
              <p className="methodology-route-hero-aside">The route below connects your current evidence to a practical next decision. Methods are selected for the question, not prescribed as a sequence.</p>
          </div>

          {/* Grid of details */}
            <div className="route-detail-grid mb-12">
             <div data-testid="route-detail-assets">
               <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#102957] mb-3 flex items-center gap-2">
                 <CornerDownRight size={14} className="text-[hsl(var(--brand-pink))]" />
                 Existing assets
               </h5>
               <p className="text-[16px] leading-[1.6] text-[#405777]">{activeRoute.existingAssets}</p>
             </div>
            <div data-testid="route-detail-decision">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#102957] mb-3 flex items-center gap-2">
                <CornerDownRight size={14} className="text-[hsl(var(--brand-pink))]" />
                Decision needed
              </h5>
              <p className="text-[17px] leading-[1.6] text-[#405777] font-medium">
                {activeRoute.decision}
              </p>
            </div>
            <div data-testid="route-detail-output">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#102957] mb-3 flex items-center gap-2">
                <CornerDownRight size={14} className="text-[hsl(var(--brand-pink))]" />
                 Actual output
              </h5>
               <p className="text-[16px] leading-[1.6] text-[#405777]">
                {activeRoute.output}
              </p>
            </div>
          </div>

           <div data-testid="route-methods" className="mb-12 border-t border-[#cbd3e1] pt-8">
             <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#102957] mb-5">
               Relevant methods and why they fit
             </h5>
             <div className="grid gap-5 sm:grid-cols-2">
               {activeRoute.methods.map((method, index) => (
                 <div key={method.name} className="border-l-2 border-[hsl(var(--brand-violet))] pl-4">
                   <Link
                     href={method.href}
                     onClick={() => openDestination(method.href)}
                     data-testid={`route-method-${index}`}
                     className="block font-semibold text-[#102957] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]"
                   >
                     {method.name}
                   </Link>
                   <p className="mt-2 text-[14px] leading-[1.55] text-[#536887]">{method.reason}</p>
                 </div>
               ))}
             </div>
           </div>

          {/* Anchors Box */}
           <div className="route-governing p-6 sm:p-8 mb-12">
            <h5 className="text-sm font-bold text-[#102957] mb-6 uppercase tracking-wider">
              Connections to Governing Frameworks
            </h5>
            <div className="space-y-6">
              <div data-testid="route-anchor-idao">
                <h6 className="text-[13px] font-bold text-[#102957] mb-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[hsl(var(--brand-violet))] rounded-full" />
                  <Link href="/methodologies/idao" onClick={() => openAnchor("/methodologies/idao")} className="underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">IDAO Delivery Framework</Link>
                </h6>
               <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#647491]">Conditional IDAO connection</div>
                <p className="text-[15px] text-[#536887] leading-relaxed pl-3.5 border-l border-[#cbd3e1]/50">{activeRoute.idao}</p>
              </div>
              <div data-testid="route-anchor-authority">
                <h6 className="text-[13px] font-bold text-[#102957] mb-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[hsl(var(--brand-coral))] rounded-full" />
                  <Link href="/methodologies/agent-authority-model" onClick={() => openAnchor("/methodologies/agent-authority-model")} className="underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">Agent Authority Model</Link>
                </h6>
                <p className="text-[15px] text-[#536887] leading-relaxed pl-3.5 border-l border-[#cbd3e1]/50">{activeRoute.authority}</p>
              </div>
            </div>
          </div>

          {/* Actions Box */}
          <div className="flex flex-wrap items-center gap-6 mt-auto pt-8 border-t border-[#cbd3e1]" data-testid="route-actions">
            {activeRoute.actions.map((action, idx) => (
              <BrandButton
                key={idx}
                href={action.href}
                onClick={() => openDestination(action.href)}
                data-testid={`action-${action.type}`}
                variant={action.type}
                className="max-w-full min-w-0"
              >
                {action.label}
              </BrandButton>
            ))}
          </div>
        </div>
      </div>
    </div>
     <section
       data-testid="specialist-routes"
       aria-label="Direct specialist routes"
       className="mt-8 grid gap-6 border border-[#cbd3e1] bg-[#f9fafb] p-6 sm:grid-cols-2 lg:grid-cols-3 lg:p-8"
     >
       <div>
         <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--brand-pink))]">Direct specialist access</p>
         <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em] text-[#102957]">Already know the specialist decision?</h3>
         <p className="mt-3 text-[14px] leading-[1.6] text-[#536887]">These are direct routes, not additional starting situations or mandatory steps.</p>
       </div>
       <div className="border-l border-[#cbd3e1] pl-5">
         <Link href="/methodologies/human-agent-operating-model" onClick={() => openDestination("/methodologies/human-agent-operating-model")} className="font-semibold text-[#102957] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">
           Human–Agent Operating Model
         </Link>
         <p className="mt-2 text-[14px] leading-[1.55] text-[#536887]">Go directly here when changed work, roles, capabilities, adoption or handovers are the known decision.</p>
       </div>
       <div className="border-l border-[#cbd3e1] pl-5">
         <Link href="/methodologies/agent-authority-model" onClick={() => openAnchor("/methodologies/agent-authority-model")} className="font-semibold text-[#102957] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">
           Agent Authority Model
         </Link>
         <p className="mt-2 text-[14px] leading-[1.55] text-[#536887]">Calculate the ceiling directly for a specific consequential Knowledge, Decision or Action handover.</p>
       </div>
       <div className="sm:col-span-2 lg:col-span-3 border-t border-[#cbd3e1] pt-5">
         <p className="text-[14px] leading-[1.6] text-[#536887]">
           <strong className="text-[#102957]">AI Guardrails:</strong> planned as a complementary specialist method alongside Agent Authority. No standalone Guardrails framework or assessment is published yet. Read the approved guardrails-versus-authority distinction in the existing{" "}
           <Link href="/methodologies/agent-authority-model#guardrails-and-authority" onClick={() => openAnchor("/methodologies/agent-authority-model#guardrails-and-authority")} className="font-semibold text-[#102957] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">
             Agent Authority page
           </Link>
           .
         </p>
       </div>
     </section>
    </>
  );
}
