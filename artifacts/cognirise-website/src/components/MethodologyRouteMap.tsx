import { useState, useEffect, type KeyboardEvent, useRef } from "react";
import { ArrowRight, Info, Workflow, Scale, Target, ShieldCheck, CheckCircle2, CornerDownRight } from "lucide-react";
import { Link } from "wouter";

type RouteSituation = "org-wide" | "multiple-opps" | "one-workflow" | "work-design" | "authority" | "live-evidence";

const STORAGE_KEY_SELECTION = "cognirise-methodology-selection";
const STORAGE_KEY_SCROLL = "cognirise-methodology-scroll";

const ROUTE_DATA = [
  {
    id: "org-wide", label: "Organization-wide constraint", icon: Scale,
    methodId: "value-to-scale",
    method: "AI Value-to-Scale",
    decision: "What prevents repeatable movement from opportunity to sustained value?",
    output: "Seven-dimension maturity profile, evidence gaps and prioritized actions.",
    idao: "Identifies systemic constraints. Evidence determines whether selected work enters Innovate or a later IDAO stage.",
    authority: "Tests governance as an organizational capability before setting limits for specific handovers.",
    actions: [
      { label: "Take self-assessment", href: "/methodologies/ai-value-to-scale#assessment", type: "nested" },
      { label: "Open methodology", href: "/methodologies/ai-value-to-scale", type: "primary" }
    ]
  },
  {
    id: "multiple-opps", label: "Multiple opportunities", icon: Target,
    methodId: "prioritization",
    method: "AI Use-Case Prioritization",
    decision: "Which opportunities should advance, sequence or stop?",
    output: "Transparent scorecard and an Innovate, Demonstrate, Activate or stop recommendation.",
    idao: "Recommends whether an opportunity should stop, be investigated, demonstrated or activated.",
    authority: "Exposure and required oversight inform control burden, changing priority or the responsible IDAO entry.",
    actions: [
      { label: "Open prioritization method", href: "/methodologies/ai-use-case-prioritization", type: "primary" }
    ]
  },
  {
    id: "one-workflow", label: "One use case or workflow", icon: Workflow,
    methodId: "readiness",
    method: "Agentic Operations Readiness",
    decision: "Is this workflow ready for agents, and what must change first?",
    output: "Proceed, Prepare or Stop decision with a register of unresolved conditions.",
    idao: "Missing conditions become work in the appropriate IDAO stage. Repeat the test when scope changes.",
    authority: "Readiness establishes if the workflow can operate; Agent Authority separately sets handover independence.",
    actions: [
      { label: "Assess a workflow", href: "/methodologies/agentic-operations-readiness", type: "primary" }
    ]
  },
  {
    id: "work-design", label: "Human–agent work design", icon: CheckCircle2,
    methodId: "operating-model",
    method: "Human–Agent Operating Model",
    decision: "How must roles, rights and handovers change when AI enters real work?",
    output: "Role and handover design, decision-rights map, capability plan, incentive changes.",
    idao: "Shapes roles, handovers, capabilities, incentives and measures throughout IDAO.",
    authority: "Converts handovers into explicitly designed propose/approve/act rights.",
    actions: [
      { label: "Open playbook", href: "/methodologies/human-agent-operating-model", type: "primary" }
    ]
  },
  {
    id: "authority", label: "Specific handover authority", icon: ShieldCheck,
    methodId: "authority",
    method: "Agent Authority Model",
    decision: "What authority can this specific consequential handover hold?",
    output: "The approved authority calculation and its required operating controls.",
    idao: "Applied wherever a consequential handover appears and revisited when evidence changes.",
    authority: "Direct entry to the canonical model for Knowledge, Decision and Action handovers.",
    actions: [
      { label: "Calculate authority", href: "/methodologies/agent-authority-model", type: "primary" }
    ]
  },
  {
    id: "live-evidence", label: "Evidence from live operation", icon: Info,
    methodId: "loopback",
    method: "IDAO Loopback",
    decision: "What does operating evidence require us to update, retest or stop?",
    output: "An evidence-led return to the responsible decision or IDAO stage.",
    idao: "Operate or weak evidence loops back to the responsible stage rather than forcing a new start.",
    authority: "Revisit authority when evidence, exposure, scope or the handover changes.",
    actions: [
      { label: "Review IDAO stages", href: "/methodologies/idao", type: "primary" }
    ]
  }
] as const;

export function MethodologyRouteMap() {
  const [activeSituation, setActiveSituation] = useState<RouteSituation>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_SELECTION);
      if (stored && ROUTE_DATA.some(r => r.id === stored)) {
        return stored as RouteSituation;
      }
    } catch (e) {}
    return "org-wide";
  });

  const outputRef = useRef<HTMLDivElement>(null);

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
      setActiveSituation(nextId);
      
    }
  };

  const handleRadioClick = (id: RouteSituation) => {
    setActiveSituation(id);
    if (window.innerWidth < 768 && outputRef.current) {
       const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
       outputRef.current.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth", block: "start" });
    }
  };

  const activeRoute = ROUTE_DATA.find(r => r.id === activeSituation) || ROUTE_DATA[0];

  return (
    <div className="bg-[#fdfcfb] flex flex-col md:flex-row shadow-lg border border-[#cbd3e1]">
      {/* Left Side: Situations Radio Group */}
      <div className="md:w-[320px] lg:w-[400px] shrink-0 border-b md:border-b-0 md:border-r border-[#cbd3e1] bg-[#f9fafb]">
        <div className="p-6 lg:p-8 border-b border-[#cbd3e1]">
          <h3 className="font-display text-xl font-semibold text-[#102957]">Start with your situation</h3>
        </div>
        <div 
          role="radiogroup" 
          aria-label="Starting situation" 
          className="flex flex-col"
          data-testid="situation-radiogroup"
        >
          {ROUTE_DATA.map((sit, index) => {
            const Icon = sit.icon;
            const isActive = activeSituation === sit.id;
            return (
              <button
                key={sit.id}
                role="radio"
                aria-checked={isActive}
                aria-controls="selected-route-output"
                data-route-index={index}
                data-testid={`situation-radio-${sit.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleRadioClick(sit.id as RouteSituation)}
                onKeyDown={(event) => handleSituationKeyDown(event, index)}
                className={`w-full text-left flex items-start gap-4 p-6 lg:p-8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--brand-pink))] border-b border-[#cbd3e1] last:border-b-0 group ${
                  isActive 
                    ? "bg-[#102957] text-white" 
                    : "bg-transparent text-[#405777] hover:bg-white"
                }`}
              >
                <div className={`shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-sm ${isActive ? 'bg-[hsl(var(--brand-pink))] text-white' : 'bg-black/5 text-[#647491] group-hover:bg-[#102957] group-hover:text-white'}`}>
                  <Icon size={14} />
                </div>
                <div>
                  <span className={`block font-semibold text-[15px] leading-tight ${isActive ? "text-white" : "text-[#102957]"}`}>
                    {sit.label}
                  </span>
                  <span className={`mt-2 block text-[13px] leading-[1.4] ${isActive ? "text-white/80" : "text-[#647491]"}`}>
                    {sit.method}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Side: Output */}
      <div 
        id="selected-route-output"
        role="region"
        aria-live="polite"
        data-testid="route-output-panel"
        ref={outputRef}
        className="flex-1 scroll-mt-24 p-6 sm:p-8 md:p-10 lg:p-16 bg-white flex flex-col relative overflow-hidden min-h-[600px]"
      >
        <div key={activeSituation} className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-500 motion-safe:fill-mode-both">
          {/* Output Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand-pink))]" />
              <span className="font-bold text-[10px] uppercase tracking-[0.14em] text-[#647491]">
                Recommended Path
              </span>
            </div>
            <h4 className="font-display text-[clamp(32px,5vw,52px)] font-semibold text-[#102957] tracking-[-.04em] leading-[1.05]" data-testid="route-detail-method">
              {activeRoute.method}
            </h4>
          </div>

          {/* Grid of details */}
          <div className="grid lg:grid-cols-2 gap-10 mb-14">
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
                Required Output
              </h5>
              <p className="text-[17px] leading-[1.6] text-[#405777]">
                {activeRoute.output}
              </p>
            </div>
          </div>

          {/* Anchors Box */}
          <div className="bg-[#f9fafb] border-l-2 border-[#102957] p-8 mb-12">
            <h5 className="text-sm font-bold text-[#102957] mb-6 uppercase tracking-wider">
              Connections to Governing Frameworks
            </h5>
            <div className="space-y-6">
              <div data-testid="route-anchor-idao">
                <h6 className="text-[13px] font-bold text-[#102957] mb-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[hsl(var(--brand-violet))] rounded-full" />
                  IDAO Delivery Framework
                </h6>
                <p className="text-[15px] text-[#536887] leading-relaxed pl-3.5 border-l border-[#cbd3e1]/50">{activeRoute.idao}</p>
              </div>
              <div data-testid="route-anchor-authority">
                <h6 className="text-[13px] font-bold text-[#102957] mb-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[hsl(var(--brand-coral))] rounded-full" />
                  Agent Authority Model
                </h6>
                <p className="text-[15px] text-[#536887] leading-relaxed pl-3.5 border-l border-[#cbd3e1]/50">{activeRoute.authority}</p>
              </div>
            </div>
          </div>

          {/* Actions Box */}
          <div className="flex flex-wrap items-center gap-6 mt-auto pt-8 border-t border-[#cbd3e1]" data-testid="route-actions">
            {activeRoute.actions.map((action, idx) => (
              <Link 
                key={idx}
                href={action.href}
                onClick={handleLinkClick}
                data-testid={`action-${action.type}`}
                className={
                  action.type === 'primary'
                    ? "relative overflow-hidden inline-flex items-center gap-3 bg-[#102957] text-white px-7 py-4 hover:bg-[#1a3a75] text-[15px] font-bold transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--brand-pink))]"
                    : "inline-flex items-center gap-2 text-[15px] font-bold text-[#405777] hover:text-[#102957] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#102957]"
                }
              >
                {action.type === 'primary' && (
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
                )}
                <span className={action.type === 'primary' ? "pl-1" : ""}>{action.label}</span>
                {action.type === 'primary' && (
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
