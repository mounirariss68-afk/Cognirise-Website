import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import "./SignalJourney.css";

type SituationId = "investment" | "competing-ideas" | "existing-strategy" | "process-problem" | "pilot-release" | "proven-expansion" | "underperformance";

const ROUTES = [
  {
    id: "investment", label: "We need to know where AI is worth investing.", caption: "Find value",
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
    art: "/__mockup/images/method-route-cards/investment.jpg",
    artAlt: "Several illuminated paths narrow toward a bounded architectural opening."
  },
  {
    id: "competing-ideas", label: "We have several AI ideas and need to choose.", caption: "Choose the bets",
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
    art: "/__mockup/images/method-route-cards/competing-ideas.jpg",
    artAlt: "Distinct illuminated passages meet at a central decision threshold."
  },
  {
    id: "existing-strategy", label: "We have an AI strategy and need to implement it.", caption: "Put strategy to work",
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
    art: "/__mockup/images/method-route-cards/existing-strategy.jpg",
    artAlt: "Translucent planning planes lead into a structured passage for delivery."
  },
  {
    id: "process-problem", label: "We need to improve a specific process.", caption: "Improve the work",
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
    art: "/__mockup/images/method-route-cards/process-problem.jpg",
    artAlt: "A disrupted light path is deliberately rerouted through an architectural opening."
  },
  {
    id: "pilot-release", label: "We have a pilot and need to put it into everyday use.", caption: "Release with confidence",
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
    art: "/__mockup/images/method-route-cards/pilot-release.jpg",
    artAlt: "An experimental module connects to a supported operating structure."
  },
  {
    id: "proven-expansion", label: "AI works in one area. We need to expand it.", caption: "Expand what works",
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
    art: "/__mockup/images/method-route-cards/proven-expansion.jpg",
    artAlt: "A working structure connects by light paths to new contextual spaces."
  },
  {
    id: "underperformance", label: "Our AI is in use, but the results are falling short.", caption: "Recover missing value",
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
    art: "/__mockup/images/method-route-cards/underperformance.jpg",
    artAlt: "A misaligned signal passes through a diagnostic loop toward a deliberate next decision."
  }
] as const;

const SignalLink = ({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) => (
  <a href={href} className={className}>{children}</a>
);

export function SignalJourney({ presentation = "signal", imageHighlight = false }: { presentation?: "signal" | "panorama" | "threshold"; imageHighlight?: boolean }) {
  const [selected, setSelected] = useState<SituationId>("investment");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const radioRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = ROUTES.findIndex((route) => route.id === selected);
  const route = ROUTES[selectedIndex];
  const previewIndex = imageHighlight ? hoveredIndex ?? selectedIndex : selectedIndex;
  const previewRoute = ROUTES[previewIndex];

  const choose = (id: SituationId) => setSelected(id);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? ROUTES.length - 1 :
      (index + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1) + ROUTES.length) % ROUTES.length;
    radioRefs.current[next]?.focus();
    choose(ROUTES[next].id);
  };

  const signalLine = (
    <svg className="sj-signal-svg" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="sj-signal-gradient" x1="0" x2="1"><stop offset="0%" stopColor="#7657cb" /><stop offset="55%" stopColor="#c5388c" /><stop offset="100%" stopColor="#f07c67" /></linearGradient></defs>
      <path className="sj-signal-base" pathLength="1000" d="M 20 54 C 170 54 210 36 330 46 S 490 68 630 50 S 820 40 980 54" />
      <path className="sj-signal-progress" pathLength="1000" style={{ strokeDasharray: `${selectedIndex / (ROUTES.length - 1) * 1000} 1000` }} d="M 20 54 C 170 54 210 36 330 46 S 490 68 630 50 S 820 40 980 54" />
    </svg>
  );
  const stopChoices = (
    <div className="sj-stops" role="radiogroup" aria-label="Starting situation">
      {ROUTES.map((item, index) => {
        const active = item.id === selected;
        return <button
          key={item.id}
          ref={(node) => { radioRefs.current[index] = node; }}
          type="button"
          role="radio"
          aria-label={item.label}
          aria-checked={active}
          aria-controls="sj-route-detail"
          tabIndex={active ? 0 : -1}
          data-testid={`situation-radio-${item.id}`}
          className={`sj-stop${active ? " is-active" : ""}${index < selectedIndex ? " is-traveled" : ""}`}
          onClick={() => choose(item.id)}
          onKeyDown={(event) => onKeyDown(event, index)}
          onMouseEnter={imageHighlight ? () => setHoveredIndex(index) : undefined}
          onMouseLeave={imageHighlight ? () => setHoveredIndex(null) : undefined}
          onFocus={imageHighlight ? () => setHoveredIndex(index) : undefined}
          onBlur={imageHighlight ? () => setHoveredIndex(null) : undefined}
        >
          <span className="sj-node"><span /></span>
          <span className="sj-stop-index">{String(index + 1).padStart(2, "0")}</span>
          <span className="sj-stop-caption">{item.caption}</span>
        </button>;
      })}
    </div>
  );

  return (
    <main className={`signal-journey${presentation === "panorama" ? " signal-journey--panorama" : ""}`}>
      <header className="sj-intro">
        <div className="sj-eyebrow"><span className="sj-pulse-dot" /> COGNIRISE / DECISION ROUTER</div>
        <h1>Start with your <em>situation.</em></h1>
        <p>Select the decision in front of you. Find a practical next move, the evidence to bring, and methods that fit the question—not a prescribed sequence.</p>
      </header>

      <section className="sj-journey" aria-label="Seven starting situations">
        <div className="sj-journey-head">
          <div><span className="sj-overline">{presentation === "panorama" ? "ONE CONTINUOUS VIEW" : "THE SIGNAL JOURNEY"}</span><h2>{presentation === "panorama" || presentation === "threshold" ? "Choose a threshold" : "Where are you now?"}</h2></div>
          <div className="sj-position" aria-live="polite"><span>{String(selectedIndex + 1).padStart(2, "0")}</span><i>/ 07</i></div>
        </div>
        <p className="sj-journey-note">Seven real starting points <span>·</span> one practical next decision</p>
        {presentation === "panorama" ? (
          <div className="sj-panorama">
            <div className="sj-panorama-stage">
              <img
                src="/__mockup/images/method-journey-panorama-horizon.jpg"
                alt={imageHighlight ? "" : "One continuous corridor of seven architectural thresholds, joined by a violet-to-coral light path."}
                style={{ transform: `translateX(calc(-50% + ${29.167 - selectedIndex * (58.334 / 6)}%))` }}
              />
              <div className="sj-panorama-shade" />
              <div className="sj-panorama-focus" aria-hidden="true" style={imageHighlight ? { left: `${previewIndex * 100 / 7}%` } : undefined} />
              <div className="sj-panorama-caption" aria-live="polite">
                <span>{String(previewIndex + 1).padStart(2, "0")} / 07 · {hoveredIndex === null ? "CURRENT STOP" : "PREVIEW STOP"}</span>
                <strong>{imageHighlight ? previewRoute.label : route.caption}</strong>
              </div>
              {imageHighlight && <div className="sj-panorama-targets" aria-label="Preview starting situations">
                {ROUTES.map((item, index) => <button
                  key={item.id}
                  type="button"
                  aria-label={`Preview and select: ${item.label}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                  onClick={() => choose(item.id)}
                />)}
              </div>}
            </div>
            <div className="sj-panorama-rail">
              <div className="sj-rail-inner">{signalLine}{stopChoices}</div>
            </div>
          </div>
        ) : (
          <div className="sj-rail-scroll">
            <div className="sj-rail-inner">{signalLine}{stopChoices}</div>
          </div>
        )}
        <div className="sj-rail-footer"><span>EXPLORING AI</span><span className="sj-footer-line" /><span>RECOVERING MISSING VALUE</span></div>
      </section>

      <section id="sj-route-detail" className="sj-detail" aria-label="Selected situation details">
        <div className="sj-detail-top">
          <div className="sj-detail-copy">
            <div className="sj-route-kicker"><span className="sj-route-index">{String(selectedIndex + 1).padStart(2, "0")}</span> / SELECTED SITUATION</div>
            <h2 data-testid="route-detail-situation">{route.label}</h2>
            <p className="sj-description">{route.description}</p>
          </div>
          <figure className="sj-art">
            <img src={route.art} alt={route.artAlt} data-pulse-image-resilient="true" />
            <figcaption><span>THE ROUTE IN CONTEXT</span><span>{String(selectedIndex + 1).padStart(2, "0")} — 07</span></figcaption>
          </figure>
        </div>

        <div className="sj-decision-band">
          <div className="sj-data-point"><span className="sj-label"><ArrowDownRight size={15} /> WHAT YOU MAY HAVE</span><p>{route.existingAssets}</p></div>
          <div className="sj-data-point sj-next-decision"><span className="sj-label"><ArrowRight size={15} /> THE NEXT DECISION</span><p>{route.decision}</p></div>
          <div className="sj-data-point"><span className="sj-label"><ArrowUpRight size={15} /> PRACTICAL OUTPUT</span><p>{route.output}</p></div>
        </div>

        <div className="sj-methods">
          <div className="sj-section-heading"><span className="sj-overline">TOOLS FOR THIS QUESTION</span><h3>Relevant methods <i>&</i> why they fit</h3></div>
          <div className="sj-method-list">
            {route.methods.map((method, index) => <article className="sj-method" key={method.name}>
              <span className="sj-method-index">0{index + 1}</span>
              <div><SignalLink href={method.href} className="sj-text-link">{method.name} <ArrowRight size={14} /></SignalLink><p>{method.reason}</p></div>
            </article>)}
          </div>
        </div>

        <aside className="sj-governance">
          <div className="sj-gov-heading"><span className="sj-overline">GOVERNANCE, WHEN IT APPLIES</span><p>Evidence leads. Frameworks support the decision.</p></div>
          <div className="sj-gov-row">
            <span className="sj-gov-mark sj-violet" />
            <div><SignalLink href="/methodologies/idao" className="sj-gov-link">IDAO Delivery Framework <ArrowRight size={14} /></SignalLink><span className="sj-conditional">CONDITIONAL IDAO CONNECTION</span><p>{route.idao}</p></div>
          </div>
          <div className="sj-gov-row">
            <span className="sj-gov-mark sj-coral" />
            <div><SignalLink href="/methodologies/agent-authority-model" className="sj-gov-link">Agent Authority Model <ArrowRight size={14} /></SignalLink><span className="sj-conditional">ONLY FOR A CONSEQUENTIAL HANDOVER</span><p>{route.authority}</p></div>
          </div>
        </aside>

        <nav className="sj-actions" aria-label="Suggested next methods">
          {route.actions.map((action) => <a key={action.label} href={action.href} className={`sj-action ${action.type === "primary" ? "sj-action-primary" : "sj-action-secondary"}`} data-testid={`action-${action.type}`}>
            <span>{action.label}</span><ArrowRight size={17} />
          </a>)}
        </nav>
      </section>
      <footer className="sj-footnote"><span>COGNIRISE PULSE</span><span>Start where the evidence is—not where a checklist begins.</span></footer>
    </main>
  );
}

export default SignalJourney;