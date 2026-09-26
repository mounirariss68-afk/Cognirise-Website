import { useState, type KeyboardEvent } from "react";
import { ArrowRight, ArrowUpRight, CornerDownRight } from "lucide-react";
import "./_group.css";
import "./ConnectedScenes.css";

type SituationId =
  | "investment"
  | "competing-ideas"
  | "existing-strategy"
  | "process-problem"
  | "pilot-release"
  | "proven-expansion"
  | "underperformance";

const ROUTES = [
  {
    id: "investment",
    label: "We need to know where AI is worth investing.",
    caption: "Find the value",
    image: "/__mockup/images/method-route-cards/investment.jpg",
    alt: "Several illuminated paths narrow toward a bounded architectural opening.",
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
    ],
  },
  {
    id: "competing-ideas",
    label: "We have several AI ideas and need to choose.",
    caption: "Choose between ideas",
    image: "/__mockup/images/method-route-cards/competing-ideas.jpg",
    alt: "Distinct illuminated passages meet at a central decision threshold.",
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
    ],
  },
  {
    id: "existing-strategy",
    label: "We have an AI strategy and need to implement it.",
    caption: "Put strategy to work",
    image: "/__mockup/images/method-route-cards/existing-strategy.jpg",
    alt: "Translucent planning planes lead into a structured passage for delivery.",
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
    ],
  },
  {
    id: "process-problem",
    label: "We need to improve a specific process.",
    caption: "Improve a process",
    image: "/__mockup/images/method-route-cards/process-problem.jpg",
    alt: "A disrupted light path is deliberately rerouted through an architectural opening.",
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
    ],
  },
  {
    id: "pilot-release",
    label: "We have a pilot and need to put it into everyday use.",
    caption: "Move a pilot into use",
    image: "/__mockup/images/method-route-cards/pilot-release.jpg",
    alt: "An experimental module connects to a supported operating structure.",
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
    ],
  },
  {
    id: "proven-expansion",
    label: "AI works in one area. We need to expand it.",
    caption: "Expand what works",
    image: "/__mockup/images/method-route-cards/proven-expansion.jpg",
    alt: "A working structure connects by light paths to new contextual spaces.",
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
    ],
  },
  {
    id: "underperformance",
    label: "Our AI is in use, but the results are falling short.",
    caption: "Recover missing value",
    image: "/__mockup/images/method-route-cards/underperformance.jpg",
    alt: "A misaligned signal passes through a diagnostic loop toward a deliberate next decision.",
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
    ],
  },
] as const;

type RouteLink = (typeof ROUTES)[number];

export function ConnectedScenes() {
  const [selected, setSelected] = useState<SituationId>("investment");
  const selectedRoute = ROUTES.find((route) => route.id === selected) ?? ROUTES[0];
  const selectedIndex = ROUTES.findIndex((route) => route.id === selected);

  const selectByIndex = (index: number) => {
    const next = ROUTES[(index + ROUTES.length) % ROUTES.length];
    setSelected(next.id);
    document.getElementById(`scene-${next.id}`)?.focus();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") selectByIndex(0);
    else if (event.key === "End") selectByIndex(ROUTES.length - 1);
    else selectByIndex(index + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1));
  };

  return (
    <main className="method-route-cards connected-scenes" data-testid="connected-scenes">
      <header className="scenes-intro">
        <div className="scenes-eyebrow"><span /> COGNIRISE / AI ADVISORY</div>
        <h2>Start with the decision<br /><em>in front of you.</em></h2>
        <p>Select your real situation. See the evidence to look for, the next practical decision and the methods that fit—without being pushed through a prescribed sequence.</p>
      </header>

      <section className="scenes-journey" aria-labelledby="journey-heading">
        <div className="journey-heading">
          <div>
            <span className="journey-overline">Seven situations · one useful next move</span>
            <h3 id="journey-heading">Where are you now?</h3>
          </div>
          <div className="journey-direction" aria-hidden="true"><span>EXPLORING AI</span><i /><span>RECOVERING VALUE</span></div>
        </div>
        <div className="scene-rail-shell">
          <div className="scene-rail" role="radiogroup" aria-label="Starting situation" data-testid="situation-radiogroup">
            {ROUTES.map((route, index) => {
              const checked = route.id === selected;
              return (
                <button
                  id={`scene-${route.id}`}
                  key={route.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={route.label}
                  aria-controls="selected-route-output"
                  tabIndex={checked ? 0 : -1}
                  data-route-index={index}
                  data-testid={`situation-radio-${route.id}`}
                  className={`scene-stop${checked ? " is-selected" : ""}`}
                  onClick={() => setSelected(route.id)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                >
                  <span className="scene-image">
                    <img src={route.image} alt={route.alt} loading="eager" data-pulse-image-resilient="true" />
                    <span className="scene-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="scene-select-mark" aria-hidden="true">{checked ? "●" : "＋"}</span>
                  </span>
                  <span className="scene-caption">{route.caption}</span>
                </button>
              );
            })}
          </div>
          <div className="mobile-journey-cue" aria-hidden="true">
            <span>{String(selectedIndex + 1).padStart(2, "0")} <b>/ 07</b></span>
            <div className="journey-progress"><i style={{ transform: `scaleX(${(selectedIndex + 1) / ROUTES.length})` }} /></div>
            <span>Swipe to explore <ArrowRight size={14} /></span>
          </div>
        </div>
      </section>

      <RouteDetails route={selectedRoute} index={selectedIndex} />
    </main>
  );
}

function RouteDetails({ route, index }: { route: RouteLink; index: number }) {
  return (
    <section className="scene-detail" id="selected-route-output" role="region" aria-label="Situation route details" data-testid="route-output-panel">
      <span className="sr-only" role="status" aria-live="polite">Selected situation: {route.label}</span>
      <div className="detail-masthead">
        <div className="detail-number">{String(index + 1).padStart(2, "0")} <span>— 07</span></div>
        <div className="detail-heading">
          <span className="detail-kicker">YOUR SITUATION</span>
          <h3 data-testid="route-detail-situation">{route.label}</h3>
          <p className="detail-description">{route.description}</p>
        </div>
        <p className="detail-note">Methods answer the question in front of you. They are not a mandatory sequence.</p>
      </div>
      <div className="decision-ledger">
        <div className="ledger-cell" data-testid="route-detail-assets">
          <h4><CornerDownRight size={15} /> What may already exist</h4>
          <p>{route.existingAssets}</p>
        </div>
        <div className="ledger-cell decision-cell" data-testid="route-detail-decision">
          <h4><CornerDownRight size={15} /> The next decision</h4>
          <p>{route.decision}</p>
        </div>
        <div className="ledger-cell output-cell" data-testid="route-detail-output">
          <h4><CornerDownRight size={15} /> Practical output</h4>
          <p>{route.output}</p>
        </div>
      </div>

      <div className="methods-section" data-testid="route-methods">
        <div className="section-label"><span>01</span> Methods that fit this question</div>
        <div className="method-list">
          {route.methods.map((method, methodIndex) => (
            <article className="method-entry" key={method.name}>
              <a href={method.href} data-testid={`route-method-${methodIndex}`}>
                <span>{method.name}</span><ArrowUpRight size={16} aria-hidden="true" />
              </a>
              <p>{method.reason}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="governance-band">
        <div className="governance-heading">
          <span className="section-label"><span>02</span> Conditional governance</span>
          <p>Bring these in where the evidence or handover calls for them.</p>
        </div>
        <div className="governance-columns">
          <article data-testid="route-anchor-idao">
            <h4><i className="governance-dot violet" /><a href="/methodologies/idao">IDAO Delivery Framework <ArrowUpRight size={14} /></a></h4>
            <span className="conditional-label">Evidence-dependent gates</span>
            <p>{route.idao}</p>
          </article>
          <article data-testid="route-anchor-authority">
            <h4><i className="governance-dot coral" /><a href="/methodologies/agent-authority-model">Agent Authority Model <ArrowUpRight size={14} /></a></h4>
            <span className="conditional-label">Only for consequential handovers</span>
            <p>{route.authority}</p>
          </article>
        </div>
      </div>

      <nav className="route-actions" aria-label="Recommended next actions" data-testid="route-actions">
        {route.actions.map((action, actionIndex) => (
          <a
            key={action.label}
            href={action.href}
            data-testid={`action-${action.type}-${actionIndex}`}
            className={`scene-action ${action.type === "primary" ? "scene-action-primary" : "scene-action-secondary"}`}
          >
            <span>{action.label}</span><span className="action-arrow"><ArrowRight size={17} /></span>
          </a>
        ))}
      </nav>
    </section>
  );
}