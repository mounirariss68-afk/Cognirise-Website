import { useState, type KeyboardEvent } from "react";
import { ArrowRight, ArrowDown, Info, ChevronRight, Workflow, Scale, Target, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

type RouteSituation = "org-wide" | "multiple-opps" | "one-workflow" | "work-design" | "authority" | "live-evidence" | null;

const ROUTE_DATA = [
  {
    id: "org-wide", label: "Organization-wide constraint", icon: Scale,
    methodId: "value-to-scale",
    method: "AI Value-to-Scale", methodHref: "/methodologies/ai-value-to-scale",
    decision: "What prevents repeatable movement from opportunity to sustained value?",
    output: "Seven-dimension maturity profile, evidence gaps and prioritized actions.",
    idao: "Identifies systemic constraints, priorities and potential initiatives. Evidence determines whether selected work enters Innovate or a later IDAO stage.",
    authority: "Tests authority governance as an organizational capability. Actual limits are set only for specific handovers in selected initiatives."
  },
  {
    id: "multiple-opps", label: "Multiple opportunities", icon: Target,
    methodId: "prioritization",
    method: "AI Use-Case Prioritization", methodHref: "/methodologies/ai-use-case-prioritization",
    decision: "Which opportunities should advance, sequence or stop?",
    output: "Transparent scorecard and an Innovate, Demonstrate, Activate or stop recommendation.",
    idao: "Recommends whether an opportunity should stop, be investigated, demonstrated or activated.",
    authority: "Exposure and required oversight inform control burden and can change priority, scope or the responsible IDAO entry."
  },
  {
    id: "one-workflow", label: "One use case or workflow", icon: Workflow,
    methodId: "readiness",
    method: "Agentic Operations Readiness", methodHref: "/methodologies/agentic-operations-readiness",
    decision: "Is this workflow ready for agents, and what must change first?",
    output: "Proceed, Prepare or Stop decision with a register of unresolved conditions.",
    idao: "Missing conditions become work in the appropriate IDAO stage. Repeat the test when scope changes.",
    authority: "Readiness establishes whether the workflow can operate; Agent Authority separately sets how independently each consequential handover may act."
  },
  {
    id: "work-design", label: "Human–agent work design", icon: CheckCircle2,
    methodId: "operating-model",
    method: "Human–Agent Operating Model", methodHref: "/methodologies/human-agent-operating-model",
    decision: "How must roles, rights and handovers change when AI enters real work?",
    output: "Role and handover design, decision-rights map, capability plan, incentive changes.",
    idao: "Shapes roles, handovers, capabilities, incentives and measures throughout Innovate, Demonstrate, Activate and Operate.",
    authority: "Converts identified handovers into propose, approve, act, intervene and demotion rights without replacing the approved authority calculation."
  },
  {
    id: "authority", label: "Specific handover authority", icon: ShieldCheck,
    methodId: "authority",
    method: "Agent Authority Model", methodHref: "/methodologies/agent-authority-model",
    decision: "What authority can this specific consequential handover hold?",
    output: "The approved authority result and its required controls.",
    idao: "Applied wherever a consequential handover appears across IDAO and revisited when evidence or scope changes.",
    authority: "Direct route to the canonical model for Knowledge, Decision and Action handovers."
  },
  {
    id: "live-evidence", label: "Evidence from live operation", icon: Info,
    methodId: "loopback",
    method: "IDAO Loopback", methodHref: "/methodologies/idao",
    decision: "What does operating evidence require us to update, retest or stop?",
    output: "An evidence-led return to the responsible decision or IDAO stage.",
    idao: "Operate or weak evidence loops back to the responsible stage rather than forcing a new start at Innovate.",
    authority: "Revisit authority when evidence, exposure, scope or the handover changes."
  }
] as const;

const METHODS = [
  {
    id: "value-to-scale",
    name: "AI Value-to-Scale",
    href: "/methodologies/ai-value-to-scale",
    decision: "Systemic constraints and potential initiatives",
    nested: "Self-assessment · an instrument within this method",
  },
  {
    id: "prioritization",
    name: "AI Use-Case Prioritization",
    href: "/methodologies/ai-use-case-prioritization",
    decision: "Stop, investigate, demonstrate or activate",
    nested: undefined,
  },
  {
    id: "readiness",
    name: "Agentic Operations Readiness",
    href: "/methodologies/agentic-operations-readiness",
    decision: "Proceed, Prepare or Stop one workflow",
    nested: undefined,
  },
  {
    id: "operating-model",
    name: "Human–Agent Operating Model",
    href: "/methodologies/human-agent-operating-model",
    decision: "Roles, handovers, capabilities and measures",
    nested: undefined,
  },
] as const;

export function MethodologyRouteMap() {
  const [activeSituation, setActiveSituation] = useState<RouteSituation>(null);

  const activeRoute = ROUTE_DATA.find(r => r.id === activeSituation);
  const isMethodActive = (methodId: string) => !activeRoute || activeRoute.methodId === methodId;
  const handleSituationKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + ROUTE_DATA.length) % ROUTE_DATA.length;
    const nextButton = event.currentTarget
      .closest('[role="radiogroup"]')
      ?.querySelector<HTMLButtonElement>(`[data-route-index="${nextIndex}"]`);
    nextButton?.focus();
  };

  return (
    <div className="bg-[#fdfcfb] rounded-sm overflow-hidden flex flex-col xl:flex-row shadow-sm border border-[#cbd3e1] print:border-none print:shadow-none print:block">
      
      {/* Sidebar: Situations (Hidden on small screens / print to avoid duplicate clutter, replaced by stacked view) */}
      <div className="bg-[#f3f5f8] border-b xl:border-b-0 xl:border-r border-[#cbd3e1] xl:w-[360px] shrink-0 p-6 md:p-8 hidden md:block print:hidden">
        <h3 className="font-display text-xl font-semibold text-[#102957] mb-6">Start with your situation</h3>
        <div className="space-y-2" role="radiogroup" aria-label="Starting situation">
          {ROUTE_DATA.map((sit, index) => {
            const Icon = sit.icon;
            const isActive = activeSituation === sit.id;
            return (
              <button
                key={sit.id}
                role="radio"
                aria-checked={isActive}
                aria-controls="selected-methodology-route"
                 data-route-index={index}
                 tabIndex={isActive || (!activeSituation && index === 0) ? 0 : -1}
                 onClick={() => setActiveSituation(sit.id as RouteSituation)}
                onFocus={() => setActiveSituation(sit.id as RouteSituation)}
                 onKeyDown={(event) => handleSituationKeyDown(event, index)}
                className={`w-full text-left flex items-center justify-between p-4 rounded-sm border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] ${
                  isActive 
                    ? "bg-[#102957] border-[#102957] text-white shadow-md" 
                    : "bg-white border-[#cbd3e1] text-[#405777] hover:border-[#102957] hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? "text-[hsl(var(--brand-pink))]" : "text-[#647491]"} />
                  <span>
                    <span className="block text-sm font-semibold">{sit.label}</span>
                    <span className={`mt-1 block text-[10px] ${isActive ? "text-white/70" : "text-[#647491]"}`}>{sit.method}</span>
                  </span>
                </div>
                <ChevronRight size={16} className={`transition-transform ${isActive ? "text-white rotate-90" : "text-[#cbd3e1]"}`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Diagram Area (Desktop Interactive) */}
      <div className="p-6 md:p-8 lg:p-10 flex-1 hidden md:flex flex-col print:hidden bg-white">
        
        {/* Dynamic Route Info */}
        <div id="selected-methodology-route" className="mb-8" aria-live="polite">
          {activeRoute ? (
            <div className="bg-white border-2 border-[#102957] p-6 rounded-sm shadow-md relative animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#cbd3e1]">
                <h4 className="font-display text-xl font-semibold text-[#102957]">{activeRoute.method}</h4>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setActiveSituation(null)} className="text-xs font-bold text-[#647491] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">Show all routes</button>
                  <Link href={activeRoute.methodHref} className="text-xs font-bold text-[hsl(var(--brand-pink))] hover:text-[#102957] flex items-center gap-1">Open Method <ArrowRight size={14} /></Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <strong className="text-[10px] uppercase tracking-wider text-[#647491] block mb-1">Decision</strong>
                  <p className="text-[13px] text-[#405777]">{activeRoute.decision}</p>
                </div>
                <div>
                  <strong className="text-[10px] uppercase tracking-wider text-[#647491] block mb-1">Output</strong>
                  <p className="text-[13px] text-[#405777]">{activeRoute.output}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 p-4 bg-[#f3f5f8] rounded-sm">
                 <div>
                   <strong className="text-[10px] uppercase tracking-wider text-[#102957] block mb-1">IDAO Connection</strong>
                   <p className="text-xs text-[#536887]">{activeRoute.idao}</p>
                 </div>
                 <div>
                   <strong className="text-[10px] uppercase tracking-wider text-[#102957] block mb-1">Agent Authority Connection</strong>
                   <p className="text-xs text-[#536887]">{activeRoute.authority}</p>
                 </div>
              </div>
              
              {/* Visual connector down */}
              <div className="absolute -bottom-8 left-1/2 w-0.5 h-8 bg-[#102957]" />
              <ArrowDown size={16} className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[#102957]" />
            </div>
          ) : (
            <div className="rounded-sm border-2 border-[#cbd3e1] p-5 text-[#405777]">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--brand-pink))]">Complete static route</p>
              <p className="mt-2 max-w-3xl text-xs leading-[1.55]">Every situation goes directly to its relevant decision method or approved anchor. Focus or select one to isolate its full route.</p>
              <div className="mt-4 grid gap-2 lg:grid-cols-2">
                {ROUTE_DATA.map((route) => (
                  <Link key={route.id} href={route.methodHref} className="group grid grid-cols-[minmax(0,.85fr)_auto_minmax(0,1.15fr)] items-center gap-2 border border-[#cbd3e1] bg-[#f3f5f8] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">
                    <span className="text-[10px] font-bold leading-tight text-[#405777]">{route.label}</span>
                    <ArrowRight size={13} className="text-[hsl(var(--brand-pink))]" />
                    <span>
                      <strong className="block text-[11px] leading-tight text-[#102957] group-hover:text-[hsl(var(--brand-pink))]">{route.method}</strong>
                      <span className="mt-1 block text-[9px] uppercase tracking-wider text-[#647491]">IDAO + Agent Authority</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Value Scan Optional Box */}
        <div className="mb-8 p-4 bg-white border border-[#cbd3e1] rounded-sm text-sm text-[#405777] flex items-start gap-3 shadow-sm relative">
           <Info size={18} className="text-[hsl(var(--brand-pink))] mt-0.5 shrink-0" />
           <div>
             <strong className="text-[#102957]">Value Scan:</strong> An optional facilitated entry that can start from any situation. It is not another framework; it helps locate the right method or IDAO entry point.
           </div>
        </div>

        <div className="relative mb-10">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#647491]">Use the relevant decision method</p>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {METHODS.map((method) => (
              <Link
                key={method.id}
                href={method.href}
                className={`relative flex min-h-[156px] flex-col border p-4 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] ${
                  isMethodActive(method.id)
                    ? "border-[#102957] bg-white"
                    : "border-[#cbd3e1] bg-[#f3f5f8] opacity-35"
                }`}
              >
                <strong className="font-display text-base leading-tight">{method.name}</strong>
                <span className="mt-3 text-[11px] leading-[1.45] text-[#536887]">{method.decision}</span>
                {method.nested && <span className="mt-3 border-l-2 border-[hsl(var(--brand-pink))] pl-2 text-[9px] font-bold uppercase tracking-wider text-[#647491]">{method.nested}</span>}
                <span className="mt-auto pt-3 text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--brand-pink))]">↓ IDAO entry or update</span>
                <span className="absolute -bottom-5 left-1/2 h-5 w-px bg-[#102957]" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <p className="mt-7 text-center text-[10px] font-bold uppercase tracking-wider text-[#647491]">Each method also connects to Agent Authority when it identifies or reshapes a consequential handover ↓</p>
        </div>

        {/* IDAO Band */}
        <Link href="/methodologies/idao" aria-label="Open the IDAO methodology" className="relative mb-12 block rounded-sm border-2 border-[#102957] bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">
          <div className="bg-[#f3f5f8] p-3 border-b border-[#cbd3e1] text-[11px] font-bold text-[#102957] text-center">
            Entry can be Innovate, Demonstrate, Activate, or an update to Operate based on evidence. No initiative is required to start at Innovate.
          </div>
          <div className="flex">
            {['Innovate', 'Demonstrate', 'Activate', 'Operate'].map(stage => (
              <div key={stage} className="flex-1 p-4 text-center border-r border-[#102957] last:border-r-0 bg-[#102957] text-white">
                <div className="font-display font-semibold tracking-wide">{stage}</div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-[#cbd3e1] text-[11px] font-bold text-[hsl(var(--brand-pink))] text-center italic bg-[#fff0f2]">
            Operate or weak evidence loops back to the responsible stage.
          </div>
          {/* Connection line down to Agent Authority */}
          <div className="absolute -bottom-12 left-1/2 w-0.5 h-12 bg-[#cbd3e1]" />
          <ArrowDown size={16} className="absolute -bottom-14 left-1/2 -translate-x-1/2 text-[#cbd3e1]" />
        </Link>

        {/* Agent Authority Rail */}
        <Link href="/methodologies/agent-authority-model" className="block rounded-sm border-2 border-[hsl(var(--brand-coral))] bg-white p-6 text-center shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">
          <ShieldCheck size={28} className="mx-auto text-[hsl(var(--brand-coral))] mb-3" />
          <h4 className="font-display font-semibold text-xl text-[#102957] mb-2">Agent Authority Model</h4>
          <p className="text-sm text-[#536887] mb-5">Persistent authority rail governing consequential handovers across all IDAO stages.</p>
          <div className="flex justify-center gap-4 text-xs font-bold uppercase tracking-wider text-[#102957]">
            <span className="bg-[#f3f5f8] px-5 py-2.5 border border-[#cbd3e1] rounded-sm">Knowledge</span>
            <span className="bg-[#f3f5f8] px-5 py-2.5 border border-[#cbd3e1] rounded-sm">Decision</span>
            <span className="bg-[#f3f5f8] px-5 py-2.5 border border-[#cbd3e1] rounded-sm">Action</span>
          </div>
        </Link>
      </div>

      {/* Mobile & Print View: Stacked, Complete Static State */}
      <div className="md:hidden print:block p-6 print:p-0">
         <div className="mb-8 p-4 bg-[#f3f5f8] border border-[#cbd3e1] rounded-sm text-sm text-[#405777]">
           <strong className="text-[#102957]">Value Scan:</strong> An optional facilitated entry that can start from any situation. It is not another framework.
         </div>
         
         <div className="space-y-8">
           {ROUTE_DATA.map(route => {
             const Icon = route.icon;
             return (
                <Link href={route.methodHref} key={route.id} className="block border-2 border-[#102957] rounded-sm bg-white print:border-[#cbd3e1] print:break-inside-avoid shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">
                  <div className="bg-[#102957] text-white p-4 print:bg-transparent print:text-[#102957] print:border-b print:border-[#102957]">
                    <div className="flex items-center gap-2 mb-2 opacity-80 print:opacity-100">
                      <Icon size={16} className="print:hidden" />
                       <span className="text-xs uppercase tracking-wider font-bold">Situation: {route.label}</span>
                     </div>
                     <h4 className="font-display text-xl font-semibold">{route.method}</h4>
                   </div>
                  <div className="p-4 space-y-4">
                    <div><strong className="text-[10px] uppercase tracking-wider text-[#647491] block mb-1">Decision</strong><p className="text-sm">{route.decision}</p></div>
                    <div><strong className="text-[10px] uppercase tracking-wider text-[#647491] block mb-1">Output</strong><p className="text-sm">{route.output}</p></div>
                    <div className="border-t border-[#cbd3e1] pt-4"><strong className="text-[10px] uppercase tracking-wider text-[hsl(var(--brand-violet))] block mb-1">IDAO Connection</strong><p className="text-sm">{route.idao}</p></div>
                    <div className="border-t border-[#cbd3e1] pt-4"><strong className="text-[10px] uppercase tracking-wider text-[hsl(var(--brand-coral))] block mb-1">Agent Authority Connection</strong><p className="text-sm">{route.authority}</p></div>
                  </div>
               </Link>
             )
           })}
         </div>

         <div className="mt-10 border-2 border-[#102957] rounded-sm bg-white print:break-inside-avoid">
            <Link href="/methodologies/idao" className="block p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">
              <h4 className="font-bold text-[#102957] mb-2">IDAO Delivery Framework</h4>
             <p className="text-sm text-[#536887] mb-3">Entry can be Innovate, Demonstrate, Activate, or an update to Operate based on evidence. No initiative is required to start at Innovate. Operate or weak evidence loops back to the responsible stage.</p>
             <div className="grid grid-cols-2 gap-2 text-xs font-bold text-white sm:grid-cols-4 mb-5">
              <span className="bg-[#102957] px-2 py-1 rounded-sm">Innovate</span>
              <span className="bg-[#102957] px-2 py-1 rounded-sm">Demonstrate</span>
              <span className="bg-[#102957] px-2 py-1 rounded-sm">Activate</span>
              <span className="bg-[#102957] px-2 py-1 rounded-sm">Operate</span>
              </div>
            </Link>
            
             <Link href="/methodologies/agent-authority-model" className="block border-t border-[#cbd3e1] p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">
              <h4 className="font-bold text-[#102957] mb-2 flex items-center gap-2"><ShieldCheck size={16} className="text-[hsl(var(--brand-coral))]" /> Agent Authority Model</h4>
              <p className="text-sm text-[#536887] mb-3">Persistent authority rail governing Knowledge, Decision, and Action handovers across all stages.</p>
             </Link>
         </div>
      </div>

    </div>
  );
}
