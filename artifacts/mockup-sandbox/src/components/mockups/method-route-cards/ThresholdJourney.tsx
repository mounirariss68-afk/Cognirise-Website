import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, CornerDownRight } from "lucide-react";
import "./ThresholdJourney.css";

type RouteSituation =
  | "investment"
  | "competing-ideas"
  | "existing-strategy"
  | "process-problem"
  | "pilot-release"
  | "proven-expansion"
  | "underperformance";

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
    caption: "Find value",
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
    caption: "Choose wisely",
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
    caption: "Make it real",
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
    caption: "Change the work",
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
    caption: "Release well",
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
    caption: "Extend proven value",
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
    caption: "Recover value",
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

type RouteId = (typeof ROUTE_DATA)[number]["id"];

function ThresholdGlyph({ active, index }: { active: boolean; index: number }) {
  return (
    <span className={`threshold-glyph${active ? " is-active" : ""}`} aria-hidden="true">
      <span className="threshold-glyph-shadow" />
      <span className="threshold-glyph-frame">
        <span className="threshold-glyph-inner" />
        <span className="threshold-glyph-light" />
      </span>
      <span className="threshold-glyph-floor" />
      <span className="threshold-glyph-mark">{String(index + 1).padStart(2, "0")}</span>
    </span>
  );
}

export function ThresholdJourney() {
  const [activeSituation, setActiveSituation] = useState<RouteId>("investment");
  const journeyRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLElement>(null);
  const activeIndex = ROUTE_DATA.findIndex((route) => route.id === activeSituation);
  const activeRoute = ROUTE_DATA[activeIndex];

  const selectSituation = (id: RouteId) => setActiveSituation(id);
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? ROUTE_DATA.length - 1
        : (index + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + ROUTE_DATA.length) % ROUTE_DATA.length;
    const nextRoute = ROUTE_DATA[nextIndex];
    journeyRef.current?.querySelector<HTMLButtonElement>(`[data-route-index="${nextIndex}"]`)?.focus();
    selectSituation(nextRoute.id);
  };

  return (
    <main className="threshold-journey">
      <header className="threshold-intro">
        <div className="threshold-eyebrow"><span /> COGNIRISE / ADVISORY ROUTE</div>
        <h2>Start with the decision<br className="threshold-desktop-break" /> in front of you.</h2>
        <p>Select your current situation. Each opening leads to a practical next decision—without implying that every route follows the same sequence.</p>
      </header>

      <section className="threshold-map" aria-labelledby="threshold-map-title">
        <div className="threshold-map-heading">
          <div>
            <span className="threshold-map-overline">SEVEN ENTRY POINTS</span>
            <h3 id="threshold-map-title">Choose a threshold</h3>
          </div>
          <p>Any starting point. Follow the evidence, not a prescribed path.</p>
        </div>
        <div className="threshold-journey-track" aria-hidden="true">
          <span className="threshold-track-segment threshold-track-segment-one" />
          <span className="threshold-track-segment threshold-track-segment-two" />
          <span className="threshold-track-segment threshold-track-segment-three" />
          <span className="threshold-track-segment threshold-track-segment-four" />
          <span className="threshold-track-segment threshold-track-segment-five" />
          <span className="threshold-track-segment threshold-track-segment-six" />
          <span className="threshold-track-branch threshold-track-branch-left" />
          <span className="threshold-track-branch threshold-track-branch-right" />
        </div>
        <div
          ref={journeyRef}
          role="radiogroup"
          aria-label="Choose your current AI situation"
          className="threshold-stops"
          data-testid="threshold-situation-radiogroup"
        >
          {ROUTE_DATA.map((route, index) => {
            const isActive = route.id === activeSituation;
            return (
              <button
                key={route.id}
                type="button"
                role="radio"
                aria-label={route.label}
                aria-checked={isActive}
                aria-controls="threshold-route-output"
                tabIndex={isActive ? 0 : -1}
                data-route-index={index}
                data-testid={`threshold-radio-${route.id}`}
                className="threshold-stop"
                onClick={() => selectSituation(route.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                <ThresholdGlyph active={isActive} index={index} />
                <span className="threshold-stop-caption">{route.caption}</span>
                <span className="threshold-mobile-label">{route.label}</span>
                <span className="threshold-stop-state">{isActive ? "Selected" : "Open route"}</span>
              </button>
            );
          })}
        </div>
        <div className="threshold-map-foot">
          <span className="threshold-key"><i /> SELECTED OPENING</span>
          <span className="threshold-map-position">{String(activeIndex + 1).padStart(2, "0")} <b>/</b> 07</span>
          <span className="threshold-map-note">The route details update below</span>
        </div>
      </section>

      <section
        id="threshold-route-output"
        ref={outputRef}
        role="region"
        aria-label="Selected situation route details"
        className="threshold-output"
        data-testid="threshold-route-output"
      >
        <span className="threshold-sr-only" role="status" aria-live="polite">Selected situation: {activeRoute.label}</span>
        <div className="threshold-output-heading">
          <div className="threshold-route-index">CURRENT SITUATION <span>{String(activeIndex + 1).padStart(2, "0")} / 07</span></div>
          <h3 data-testid="threshold-route-title">{activeRoute.label}</h3>
          <p>{activeRoute.description}</p>
        </div>

        <div className="threshold-feature">
          <div className="threshold-feature-art">
            <img
              src={SITUATION_ART[activeRoute.id].src}
              alt={SITUATION_ART[activeRoute.id].alt}
              loading={activeIndex < 2 ? "eager" : "lazy"}
              data-pulse-image-resilient="true"
            />
            <span className="threshold-art-caption">A useful opening begins with the right question.</span>
          </div>
          <div className="threshold-decisions">
            <div className="threshold-detail-block">
              <h4><CornerDownRight size={15} /> Existing assets</h4>
              <p>{activeRoute.existingAssets}</p>
            </div>
            <div className="threshold-detail-block threshold-decision-block">
              <h4><CornerDownRight size={15} /> Decision needed</h4>
              <p>{activeRoute.decision}</p>
            </div>
            <div className="threshold-detail-block">
              <h4><CornerDownRight size={15} /> Practical output</h4>
              <p>{activeRoute.output}</p>
            </div>
          </div>
        </div>

        <div className="threshold-methods" data-testid="threshold-route-methods">
          <div className="threshold-section-title">
            <span>METHODS / AS NEEDED</span>
            <h4>Use what answers the open question.</h4>
          </div>
          <div className="threshold-method-list">
            {activeRoute.methods.map((method, index) => (
              <article className="threshold-method" key={method.name}>
                <a href={method.href} data-testid={`threshold-method-${index}`}>
                  {method.name}<ArrowUpRight size={16} aria-hidden="true" />
                </a>
                <p>{method.reason}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="threshold-governance">
          <div className="threshold-governance-title">
            <span>CONDITIONAL CONNECTIONS</span>
            <h4>Governance follows the situation.</h4>
          </div>
          <div className="threshold-governance-columns">
            <article data-testid="threshold-route-idao">
              <h5><span className="threshold-gov-dot violet" /><a href="/methodologies/idao">IDAO Delivery Framework <ArrowUpRight size={14} /></a></h5>
              <span className="threshold-governance-label">Conditional IDAO connection</span>
              <p>{activeRoute.idao}</p>
            </article>
            <article data-testid="threshold-route-authority">
              <h5><span className="threshold-gov-dot coral" /><a href="/methodologies/agent-authority-model">Agent Authority Model <ArrowUpRight size={14} /></a></h5>
              <span className="threshold-governance-label">Only for consequential handovers</span>
              <p>{activeRoute.authority}</p>
            </article>
          </div>
        </div>

        <nav className="threshold-actions" aria-label="Recommended next actions" data-testid="threshold-route-actions">
          <span className="threshold-actions-label">A PRACTICAL NEXT MOVE</span>
          <div className="threshold-action-links">
            {activeRoute.actions.map((action, index) => (
              <a
                key={action.label}
                href={action.href}
                data-testid={`threshold-action-${index}`}
                className={`threshold-action ${action.type === "primary" ? "is-primary" : "is-secondary"}`}
              >
                <span>{action.label}</span><ArrowUpRight size={17} aria-hidden="true" />
              </a>
            ))}
          </div>
        </nav>
      </section>
    </main>
  );
}