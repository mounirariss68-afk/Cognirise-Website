import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CornerDownRight } from "lucide-react";
import "./_group.css";
import "./Pathways.css";

type RouteSituation = "investment" | "competing-ideas" | "existing-strategy" | "process-problem" | "pilot-release" | "proven-expansion" | "underperformance";

const SITUATION_ART: Record<RouteSituation, { src: string; alt: string }> = {
  investment: { src: "/__mockup/images/method-route-cards/investment.jpg", alt: "Several illuminated paths narrow toward a bounded architectural opening." },
  "competing-ideas": { src: "/__mockup/images/method-route-cards/competing-ideas.jpg", alt: "Distinct illuminated passages meet at a central decision threshold." },
  "existing-strategy": { src: "/__mockup/images/method-route-cards/existing-strategy.jpg", alt: "Translucent planning planes lead into a structured passage for delivery." },
  "process-problem": { src: "/__mockup/images/method-route-cards/process-problem.jpg", alt: "A disrupted light path is deliberately rerouted through an architectural opening." },
  "pilot-release": { src: "/__mockup/images/method-route-cards/pilot-release.jpg", alt: "An experimental module connects to a supported operating structure." },
  "proven-expansion": { src: "/__mockup/images/method-route-cards/proven-expansion.jpg", alt: "A working structure connects by light paths to new contextual spaces." },
  underperformance: { src: "/__mockup/images/method-route-cards/underperformance.jpg", alt: "A misaligned signal passes through a diagnostic loop toward a deliberate next decision." },
};

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

type RouteLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  [key: string]: unknown;
};

function Link({ href, children, ...props }: RouteLinkProps) {
  return <a href={href} {...props}>{children}</a>;
}

export function Current() {
  const [activeSituation, setActiveSituation] = useState<RouteSituation>("investment");
  const [previewSituation, setPreviewSituation] = useState<RouteSituation | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const selectSituation = (situation: RouteSituation) => {
    setPreviewSituation(null);
    setActiveSituation(situation);
    outputRef.current?.scrollTo({ top: 0 });
  };
  const handleSituationKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) return;
    event.preventDefault();
    const direction = (event.key === "ArrowDown" || event.key === "ArrowRight") ? 1 : -1;
    const nextIndex = (index + direction + ROUTE_DATA.length) % ROUTE_DATA.length;
    const nextButton = event.currentTarget.closest('[role="radiogroup"]')?.querySelector<HTMLButtonElement>(`[data-route-index="${nextIndex}"]`);
    if (nextButton) {
      nextButton.focus();
      selectSituation(ROUTE_DATA[nextIndex].id as RouteSituation);
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
  const activeRoute = ROUTE_DATA.find((route) => route.id === displayedSituation) || ROUTE_DATA[0];
  const previewOnMouse = (id: RouteSituation, pointerType: string) => {
    if (pointerType === "mouse") {
      outputRef.current?.scrollTo({ top: 0 });
      setPreviewSituation(id);
    }
  };
  return (
    <main className="method-route-cards method-route-pathways min-h-screen px-6 py-20 md:px-[4.8vw]" data-testid="method-route-cards-pathways">
      <div className="method-route-context max-w-3xl">
        <h2 className="font-display text-[clamp(40px,5vw,72px)] font-semibold tracking-[-.08em] text-[#102957]">Start with your situation</h2>
        <p className="mt-6 text-[19px] leading-[1.58] text-[#536887]">
          Select the decision in front of you. See what you may already have, the practical output to work toward, and which existing method fits. IDAO delivery and specialist authority decisions remain conditional on evidence.
        </p>
      </div>

      <div data-testid="methodology-route-map" className="methodology-route-screen pathways-screen [&_button]:scroll-mt-32 [&_a]:scroll-mt-32">
        <div className="methodology-route-rail" onPointerLeave={() => setPreviewSituation(null)}>
          <div className="methodology-route-rail-heading">
            <h3>Choose the decision in front of you</h3>
            <p>Seven starting points. One next decision.</p>
          </div>
          <div className="pathways-scene" aria-label="Selected decision landscape">
            <img
              key={displayedSituation}
              src={SITUATION_ART[displayedSituation].src}
              alt={SITUATION_ART[displayedSituation].alt}
              data-pulse-image-resilient="true"
            />
            <div className="pathways-scene-shade" aria-hidden="true" />
            <div className="pathways-scene-caption">
              <span>{previewSituation ? "Previewing this situation" : "Your current decision"}</span>
              <strong>{activeRoute.label}</strong>
            </div>
            <div className="pathways-scene-signal" aria-hidden="true"><i /><i /><i /></div>
          </div>
          <div role="radiogroup" aria-label="Starting situation" className="methodology-route-choices" data-testid="situation-radiogroup">
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
                  <span className="pathways-choice-signal" aria-hidden="true" />
                  <span className="methodology-route-choice-label">{sit.label}</span>
                  <span className="pathways-choice-mark" aria-hidden="true">↗</span>
                </button>
              );
            })}
          </div>
        </div>

        <div id="selected-route-output" role="region" aria-label="Situation route details" data-testid="route-output-panel" ref={outputRef} className="methodology-route-detail scroll-mt-24">
          <span className="sr-only" role="status" aria-live="polite">Selected situation: {ROUTE_DATA.find((route) => route.id === activeSituation)?.label}</span>
          <div className="pathways-detail-inner">
            <div className="methodology-route-hero">
              <div className="pathways-detail-art" aria-hidden="true">
                <img src={SITUATION_ART[activeRoute.id].src} alt="" />
                <span className="pathways-art-caption">A route through the decision</span>
              </div>
              <div className="methodology-route-hero-copy">
                <div className="methodology-route-hero-kicker">{previewSituation ? "Previewing this situation" : "Your selected situation"}</div>
                <h4 className="font-display text-[clamp(32px,5vw,52px)] font-semibold text-[#102957] tracking-[-.04em] leading-[1.05]" data-testid="route-detail-situation">{activeRoute.label}</h4>
                <p className="pathways-description">{activeRoute.description}</p>
              </div>
              <p className="methodology-route-hero-aside">The route below connects your current evidence to a practical next decision. Methods are selected for the question, not prescribed as a sequence.</p>
            </div>

            <div className="route-detail-grid mb-12">
              <div data-testid="route-detail-assets">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#102957] mb-3 flex items-center gap-2"><CornerDownRight size={14} className="text-[hsl(var(--brand-pink))]" />Existing assets</h5>
                <p className="text-[16px] leading-[1.6] text-[#405777]">{activeRoute.existingAssets}</p>
              </div>
              <div data-testid="route-detail-decision">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#102957] mb-3 flex items-center gap-2"><CornerDownRight size={14} className="text-[hsl(var(--brand-pink))]" />Decision needed</h5>
                <p className="text-[17px] leading-[1.6] text-[#405777] font-medium">{activeRoute.decision}</p>
              </div>
              <div data-testid="route-detail-output">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#102957] mb-3 flex items-center gap-2"><CornerDownRight size={14} className="text-[hsl(var(--brand-pink))]" />Actual output</h5>
                <p className="text-[16px] leading-[1.6] text-[#405777]">{activeRoute.output}</p>
              </div>
            </div>

            <div data-testid="route-methods" className="mb-12 border-t border-[#cbd3e1] pt-8">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#102957] mb-5">Relevant methods and why they fit</h5>
              <div className="grid gap-5 sm:grid-cols-2">
                {activeRoute.methods.map((method, index) => (
                  <div key={method.name} className="border-l-2 border-[hsl(var(--brand-violet))] pl-4">
                    <Link href={method.href} data-testid={`route-method-${index}`} className="block font-semibold text-[#102957] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">{method.name}</Link>
                    <p className="mt-2 text-[14px] leading-[1.55] text-[#536887]">{method.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="route-governing p-6 sm:p-8 mb-12">
              <h5 className="text-sm font-bold text-[#102957] mb-6 uppercase tracking-wider">Connections to Governing Frameworks</h5>
              <div className="space-y-6">
                <div data-testid="route-anchor-idao">
                  <h6 className="text-[13px] font-bold text-[#102957] mb-1 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[hsl(var(--brand-violet))] rounded-full" /><Link href="/methodologies/idao" className="underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">IDAO Delivery Framework</Link></h6>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#647491]">Conditional IDAO connection</div>
                  <p className="text-[15px] text-[#536887] leading-relaxed pl-3.5 border-l border-[#cbd3e1]/50">{activeRoute.idao}</p>
                </div>
                <div data-testid="route-anchor-authority">
                  <h6 className="text-[13px] font-bold text-[#102957] mb-1 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[hsl(var(--brand-coral))] rounded-full" /><Link href="/methodologies/agent-authority-model" className="underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">Agent Authority Model</Link></h6>
                  <p className="text-[15px] text-[#536887] leading-relaxed pl-3.5 border-l border-[#cbd3e1]/50">{activeRoute.authority}</p>
                </div>
              </div>
            </div>

            <div className="method-route-actions flex flex-wrap items-center gap-6 mt-auto pt-8 border-t border-[#cbd3e1]" data-testid="route-actions">
              {activeRoute.actions.map((action, index) => (
                <a key={index} href={action.href} data-testid={`action-${action.type}`} className={`method-route-brand-button method-route-brand-button-${action.type} max-w-full min-w-0`}>
                  <span>{action.label}</span><span className="method-route-button-arrow" aria-hidden="true">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}