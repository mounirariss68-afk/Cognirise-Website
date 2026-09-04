import { useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  MoveUpRight,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

const gradient = "linear-gradient(105deg,#7b5cde 0%,#cf4db9 47%,#ff776b 100%)";

const navItems = [
  { label: "What we do", items: ["Agentic enterprise transformation", "Data & AI foundations", "Engineering with AI", "Sovereign & regulated AI", "Digital AI workforce"] },
  { label: "Platforms", items: ["CogniOS", "CogniAgents", "CogniDocs", "CogniTalk", "Architecture"] },
  { label: "Industries", items: ["Banking & financial services", "Public sector & government", "Telecoms", "Travel & hospitality", "Energy & resources"] },
  { label: "Work", items: ["Case studies", "Selected builds", "Outcomes"] },
  { label: "Insights", items: ["Research & POVs", "News", "All insights"] },
];

const stages = [
  { n: "01", title: "See the work", text: "Find the process where value is waiting, not another abstract use case.", tag: "DISCOVER" },
  { n: "02", title: "Shape the route", text: "Senior operators and engineers design the shortest governed path to production.", tag: "DESIGN" },
  { n: "03", title: "Move it live", text: "Forward-deployed people and forward-deployed agents work beside your team.", tag: "DEPLOY" },
  { n: "04", title: "Make it repeatable", text: "Measure the outcome, harden the system, and carry the pattern across the enterprise.", tag: "SCALE" },
];

const industries = [
  { name: "Government", kicker: "PUBLIC VALUE", title: "Build services citizens can feel.", body: "Sovereign-ready AI for ministries and public institutions — with control, explainability and accountable deployment.", first: "Service operations", color: "#7257d8" },
  { name: "Banking", kicker: "FINANCIAL SERVICES", title: "Turn institutional knowledge into momentum.", body: "Connect data, decisions and regulated workflows without trading away trust.", first: "Credit & risk operations", color: "#cb4dad" },
  { name: "Energy", kicker: "ENERGY & RESOURCES", title: "See the next operational move.", body: "Bring intelligence closer to assets, field teams and the decisions that protect performance.", first: "Asset intelligence", color: "#ee705d" },
];

function RouteDiagram() {
  return (
    <div className="relative h-[380px] w-full overflow-hidden border border-[#d9deea] bg-[#f8faff] sm:h-[450px]">
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(#dfe5f0 1px, transparent 1px), linear-gradient(90deg,#dfe5f0 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="absolute left-[8%] top-[18%] font-mono text-[9px] tracking-[0.22em] text-[#8190ac]">OPERATING SYSTEM / 07:42:16 GST</div>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 450" fill="none" aria-label="A gradient route moving work through an organization" role="img">
        <path d="M72 306 C170 306 151 147 268 147 S373 326 475 302 S570 108 722 120" stroke="#c9d1df" strokeWidth="1.5" strokeDasharray="4 6" />
        <path d="M72 306 C170 306 151 147 268 147 S373 326 475 302 S570 108 722 120" stroke="url(#route)" strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray=".32 .68" className="vi-route" />
        <path d="M266 147 L266 82 M475 302 L475 370" stroke="#c9d1df" strokeWidth="1" strokeDasharray="3 4" />
        <circle cx="72" cy="306" r="12" fill="#f8faff" stroke="#7b5cde" strokeWidth="2" /><circle cx="268" cy="147" r="12" fill="#f8faff" stroke="#cf4db9" strokeWidth="2" /><circle cx="475" cy="302" r="12" fill="#f8faff" stroke="#f27466" strokeWidth="2" /><circle cx="722" cy="120" r="12" fill="#f8faff" stroke="#e86a60" strokeWidth="2" />
        <circle cx="72" cy="306" r="4" fill="#7b5cde" /><circle cx="268" cy="147" r="4" fill="#cf4db9" /><circle cx="475" cy="302" r="4" fill="#f27466" /><circle cx="722" cy="120" r="4" fill="#e86a60" />
        <defs><linearGradient id="route" x1="40" y1="300" x2="740" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#7b5cde" /><stop offset=".52" stopColor="#cf4db9" /><stop offset="1" stopColor="#ff776b" /></linearGradient></defs>
      </svg>
      <div className="absolute bottom-[12%] left-[5%] text-[11px] font-medium text-[#293652]">INTAKE <span className="ml-2 font-mono text-[9px] text-[#8994aa]">PROCESS 01</span></div>
      <div className="absolute left-[31%] top-[19%] text-[11px] font-medium text-[#293652]">DECISION <span className="ml-2 font-mono text-[9px] text-[#8994aa]">HUMAN + AGENT</span></div>
      <div className="absolute bottom-[9%] left-[57%] text-[11px] font-medium text-[#293652]">EXECUTION <span className="ml-2 font-mono text-[9px] text-[#8994aa]">LIVE</span></div>
      <div className="absolute right-[5%] top-[13%] text-[11px] font-medium text-[#293652]">OUTCOME <span className="ml-2 font-mono text-[9px] text-[#8994aa]">MEASURED</span></div>
      <div className="absolute right-5 top-5 flex items-center gap-2 border border-[#d6ddeb] bg-white/90 px-3 py-2 text-[10px] font-semibold tracking-[0.15em] text-[#485776]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#d953a9]" /> ROUTE ACTIVE</div>
    </div>
  );
}

export function VisibleIntelligence() {
  const [openNav, setOpenNav] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stage, setStage] = useState(1);
  const [industry, setIndustry] = useState(0);
  const [toast, setToast] = useState(false);

  const requestStart = () => {
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
  };

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#fbfcff] text-[#14213d]" style={{ fontFamily: "'DM Sans','Plus Jakarta Sans',ui-sans-serif,sans-serif" }}>
      <style>{`
        .vi-route { animation: vi-draw 5s ease-in-out infinite; }
        @keyframes vi-draw { 0%,100% { stroke-dashoffset: .38; } 50% { stroke-dashoffset: 0; } }
        .vi-float { animation: vi-float 5s ease-in-out infinite; }
        @keyframes vi-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @media (prefers-reduced-motion: reduce) { .vi-route,.vi-float { animation: none; } }
      `}</style>
      <header className="relative z-30 border-b border-[#e6e9f0] bg-[#fbfcff]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[76px] max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="#top" className="flex h-10 w-[150px] items-center overflow-visible" aria-label="Cognirise home"><img src="/__mockup/images/cognirise/logo-blue.svg" alt="Cognirise" className="h-9 w-auto origin-left object-contain object-left" style={{ width: 133, transform: "scale(2.35)" }} /></a>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navItems.map((item) => <div key={item.label} className="relative">
              <button onClick={() => setOpenNav(openNav === item.label ? null : item.label)} className="flex min-h-11 items-center gap-2 px-3 text-[13px] font-semibold text-[#31415f] transition-colors hover:text-[#7c55d4]" aria-expanded={openNav === item.label}>{item.label}<ChevronDown size={14} className={openNav === item.label ? "rotate-180 transition-transform" : "transition-transform"} /></button>
              {openNav === item.label && <div className="absolute right-0 top-14 z-40 w-72 border border-[#dfe4ee] bg-white p-4 shadow-[0_18px_50px_rgba(35,46,78,.12)]">{item.items.map((sub) => <button key={sub} onClick={() => setOpenNav(null)} className="block w-full border-b border-[#edf0f5] px-2 py-3 text-left text-[13px] text-[#465572] last:border-0 hover:text-[#b242ae]">{sub}<ArrowRight size={13} className="float-right mt-0.5" /></button>)}</div>}
            </div>)}
          </nav>
          <div className="hidden items-center gap-5 lg:flex"><button className="text-[#52617d] hover:text-[#7b5cde]" aria-label="Search"><Search size={18} /></button><button onClick={requestStart} className="group flex items-center gap-3 bg-[#182640] px-5 py-3 text-[12px] font-bold tracking-[0.04em] text-white transition-colors hover:bg-[#7c55d4]">Bring us one process <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></button></div>
          <button className="flex h-11 w-11 items-center justify-center border border-[#dbe1ec] lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {mobileOpen && <div className="border-t border-[#e6e9f0] bg-white px-5 py-4 lg:hidden">{navItems.map((item) => <button key={item.label} onClick={() => setOpenNav(openNav === item.label ? null : item.label)} className="flex w-full items-center justify-between border-b border-[#edf0f5] py-4 text-left text-sm font-semibold">{item.label}<ChevronDown size={16} />{openNav === item.label && <div className="absolute left-5 right-5 mt-28 border border-[#e0e5ee] bg-white p-3">{item.items.map((sub) => <span key={sub} className="block py-2 text-xs text-[#53627d]">{sub}</span>)}</div>}</button>)}<button onClick={requestStart} className="mt-5 flex w-full items-center justify-between bg-[#182640] px-4 py-3 text-sm font-bold text-white">Bring us one process <ArrowRight size={15} /></button></div>}
      </header>

      <section id="top" className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[.93fr_1.07fr] lg:gap-10 lg:px-12 lg:pb-28 lg:pt-28">
        <div className="relative z-10 flex flex-col justify-center">
          <div className="mb-8 flex items-center gap-3 text-[11px] font-bold tracking-[0.2em] text-[#7d55d8]"><span className="h-px w-10" style={{ background: gradient }} /> UAE / BUILT FOR THE NEXT OPERATING MODEL</div>
          <h1 className="max-w-[720px] text-[clamp(3.3rem,6.2vw,6.4rem)] font-semibold leading-[.94] tracking-[-.07em] text-[#16233e]">AI should move<br /><span className="relative inline-block">the business<span className="absolute -bottom-1 left-0 h-[7px] w-[76%] opacity-80" style={{ background: gradient }} /></span> — not<br />just assist it.</h1>
          <p className="mt-9 max-w-[550px] text-[18px] leading-8 text-[#55627b]">Cognirise is the AI-native advisory &amp; engineering firm. Senior operators, forward-deployed engineers and governed agents move priority work from strategy into production.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><button onClick={requestStart} className="group inline-flex min-h-14 items-center justify-center gap-4 px-6 text-sm font-bold text-white" style={{ background: gradient }}>Bring us one process <ArrowDownRight size={17} className="transition-transform group-hover:translate-x-1 group-hover:translate-y-1" /></button><a href="#model" className="inline-flex min-h-14 items-center justify-center gap-3 border border-[#cbd3e2] px-6 text-sm font-bold text-[#293753] hover:border-[#7b5cde]">See how we work <ArrowRight size={17} /></a></div>
          <div className="mt-14 flex items-center gap-4 border-t border-[#e1e5ee] pt-5 text-[11px] text-[#74809a]"><ShieldCheck size={17} className="text-[#7557d2]" /><span>Designed for ambitious, regulated and sovereign environments.</span></div>
        </div>
        <div className="relative flex items-center"><div className="absolute -left-8 top-8 h-56 w-56 rounded-full bg-[#d8d2fb] opacity-35 blur-3xl" /><div className="relative z-10 w-full"><RouteDiagram /><div className="mt-4 flex items-center justify-between font-mono text-[10px] tracking-[.16em] text-[#8a95ab]"><span>INTELLIGENCE / VISIBLE</span><span>COGNIRISE / 01</span></div></div></div>
      </section>

      <section className="border-y border-[#e2e6ef] bg-white"><div className="mx-auto grid max-w-[1400px] grid-cols-2 lg:grid-cols-4">{["COST", "CAPACITY", "SPEED", "RISK"].map((item, i) => <div key={item} className="group border-r border-[#e2e6ef] px-5 py-8 last:border-0 sm:px-8 lg:px-12"><div className="mb-5 flex items-center justify-between"><span className="font-mono text-[10px] tracking-[.2em] text-[#7d8ba5]">0{i + 1} / OUTCOME</span><MoveUpRight size={15} className="text-[#d04eaf] opacity-0 transition-opacity group-hover:opacity-100" /></div><div className="text-[clamp(1.6rem,2.4vw,2.5rem)] font-semibold tracking-[-.05em] text-[#243350]">{item}</div><p className="mt-2 max-w-[170px] text-[12px] leading-5 text-[#7d889e]">{["Reduce the drag in the system.", "Create capacity for better work.", "Shorten the distance to value.", "De-risk the move into production."][i]}</p></div>)}</div></section>

      <section className="mx-auto grid max-w-[1400px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-12 lg:py-36"><div><p className="font-mono text-[10px] font-bold tracking-[.22em] text-[#c04baa]">THE TENSION / 02</p><h2 className="mt-6 max-w-[520px] text-[clamp(2.5rem,4vw,4.7rem)] font-semibold leading-[.98] tracking-[-.065em]">Consulting firms leave slides.<br /><span className="text-[#aab3c3]">We leave work moving.</span></h2></div><div className="max-w-[580px] self-end text-[19px] leading-8 text-[#58657d]"><p>AI spend is rising. Yet too much transformation is still trapped in pilots, copilots and disconnected proofs of concept.</p><p className="mt-7 text-[#1c2a45]">We are not paid to advise. We are paid to move four numbers: <span className="font-semibold">cost, capacity, speed and risk.</span></p><button onClick={requestStart} className="mt-9 inline-flex items-center gap-3 border-b-2 border-[#cc4cab] pb-3 text-sm font-bold text-[#293753]">Find your starting point <ArrowRight size={16} /></button></div></section>

      <section id="model" className="bg-[#182640] px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-32"><div className="mx-auto max-w-[1400px]"><div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]"><div><p className="font-mono text-[10px] tracking-[.2em] text-[#ed708a]">THE OPERATING MODEL / 03</p><h2 className="mt-7 max-w-[480px] text-[clamp(2.7rem,4.5vw,5rem)] font-semibold leading-[.96] tracking-[-.065em]">Forward-deployed people.<br /><span className="text-[#8d7ee7]">Forward-deployed agents.</span></h2><p className="mt-8 max-w-[400px] text-[17px] leading-7 text-[#afbad0]">Not a handoff from strategy to delivery. One accountable team, moving through the work together.</p></div><div><div className="mb-10 flex flex-wrap gap-2">{stages.map((s, i) => <button key={s.n} onClick={() => setStage(i)} className={`flex items-center gap-2 border px-4 py-3 text-left text-[11px] font-bold tracking-[.08em] transition-all ${stage === i ? "border-[#dc61ae] bg-[#283553] text-white" : "border-[#43506b] text-[#9da9c0] hover:border-[#8b7ce0]"}`}><span className="font-mono text-[#ed708a]">{s.n}</span>{s.tag}</button>)}</div><div className="relative min-h-[320px] border border-[#3a4966] p-7 sm:p-10"><div className="absolute right-5 top-5 font-mono text-[9px] tracking-[.2em] text-[#76839e]">LIVE DELIVERY LOOP</div><div className="flex h-full flex-col justify-between"><div><div className="font-mono text-[11px] tracking-[.18em] text-[#ed708a]">{stages[stage].tag} / {stages[stage].n}</div><h3 className="mt-4 text-3xl font-semibold tracking-[-.04em]">{stages[stage].title}</h3><p className="mt-4 max-w-[420px] text-base leading-7 text-[#bdc6d7]">{stages[stage].text}</p></div><div className="mt-12 grid grid-cols-3 gap-3"><div className="h-2 bg-[#7b5cde]" /><div className={`h-2 ${stage > 0 ? "bg-[#c950b2]" : "bg-[#46536c]"}`} /><div className={`h-2 ${stage > 1 ? "bg-[#ed706c]" : "bg-[#46536c]"}`} /></div></div></div></div></div></div></section>

      <section className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-12 lg:py-36"><div className="flex flex-col justify-between gap-7 border-b border-[#dfe4ed] pb-10 sm:flex-row sm:items-end"><div><p className="font-mono text-[10px] tracking-[.2em] text-[#c04baa]">WHERE TO START / 04</p><h2 className="mt-5 max-w-[600px] text-[clamp(2.5rem,4vw,4.4rem)] font-semibold leading-none tracking-[-.06em]">Make the next move visible.</h2></div><p className="max-w-[330px] text-sm leading-6 text-[#697690]">Whether you know the intervention or only know the problem, there is a useful first step.</p></div><div className="grid gap-4 pt-8 lg:grid-cols-2"><button onClick={requestStart} className="group relative overflow-hidden border border-[#d6dce7] bg-white p-8 text-left transition-all hover:-translate-y-1 hover:border-[#8a6be0] sm:p-11"><div className="absolute right-0 top-0 h-32 w-32 opacity-15" style={{ background: gradient, clipPath: "polygon(100% 0,100% 100%,0 0)" }} /><span className="font-mono text-[10px] tracking-[.2em] text-[#7b5cde]">I KNOW WHAT I NEED</span><h3 className="mt-7 text-3xl font-semibold tracking-[-.04em]">Explore services &amp; platforms</h3><p className="mt-4 max-w-[390px] text-base leading-7 text-[#697690]">Transformation, foundations, engineering, sovereign AI or a digital workforce — find the right route.</p><span className="mt-10 inline-flex items-center gap-3 text-sm font-bold">Explore the operating model <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></span></button><button onClick={requestStart} className="group relative overflow-hidden bg-[#eef0fb] p-8 text-left transition-all hover:-translate-y-1 sm:p-11"><div className="absolute right-0 top-0 h-40 w-40 opacity-15" style={{ background: gradient, clipPath: "polygon(100% 0,100% 100%,0 0)" }} /><span className="font-mono text-[10px] tracking-[.2em] text-[#c04baa]">I KNOW THERE IS A PROBLEM</span><h3 className="mt-7 text-3xl font-semibold tracking-[-.04em]">Bring us one process</h3><p className="mt-4 max-w-[390px] text-base leading-7 text-[#697690]">We will help locate the highest-value starting point and make a business case for moving it.</p><span className="mt-10 inline-flex items-center gap-3 text-sm font-bold">Book a value scan <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></span></button></div></section>

      <section className="border-y border-[#e0e5ee] bg-white"><div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="flex items-end justify-between gap-5"><div><p className="font-mono text-[10px] tracking-[.2em] text-[#c04baa]">SECTOR ROUTES / 05</p><h2 className="mt-5 text-[clamp(2.5rem,4vw,4.4rem)] font-semibold leading-none tracking-[-.06em]">Built for the reality<br />of the region.</h2></div><div className="hidden items-center gap-2 sm:flex"><button onClick={() => setIndustry((industry + industries.length - 1) % industries.length)} className="flex h-11 w-11 items-center justify-center border border-[#d7deea] hover:border-[#7b5cde]" aria-label="Previous sector"><ChevronLeft size={18} /></button><button onClick={() => setIndustry((industry + 1) % industries.length)} className="flex h-11 w-11 items-center justify-center border border-[#d7deea] hover:border-[#7b5cde]" aria-label="Next sector"><ChevronRight size={18} /></button></div></div><div className="mt-12 grid gap-10 lg:grid-cols-[.68fr_1.32fr]"><div className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">{industries.map((item, i) => <button key={item.name} onClick={() => setIndustry(i)} className={`flex min-w-max items-center justify-between border-l-2 px-5 py-4 text-left text-lg font-semibold transition-all lg:w-full ${industry === i ? "border-[#cf4db9] bg-[#f4f2fc] text-[#1c2a45]" : "border-transparent text-[#8993a6] hover:text-[#40506e]"}`}>{item.name}<ArrowRight size={16} /></button>)}</div><div className="relative min-h-[350px] overflow-hidden p-8 sm:p-12" style={{ background: `linear-gradient(120deg,${industries[industry].color} 0%,#1b2945 74%)` }}><div className="absolute -right-14 -top-14 h-64 w-64 rounded-full border border-white/20" /><div className="absolute right-20 top-20 h-28 w-28 rounded-full border border-white/20" /><div className="relative z-10 flex h-full flex-col justify-between text-white"><div><p className="font-mono text-[10px] tracking-[.2em] text-white/65">{industries[industry].kicker}</p><h3 className="mt-7 max-w-[570px] text-[clamp(2rem,3.5vw,4rem)] font-semibold leading-[.98] tracking-[-.06em]">{industries[industry].title}</h3><p className="mt-6 max-w-[480px] text-base leading-7 text-white/75">{industries[industry].body}</p></div><div className="mt-12 flex flex-wrap items-center justify-between gap-5 border-t border-white/20 pt-5 text-xs"><span>FIRST ROUTE / {industries[industry].first}</span><button onClick={requestStart} className="inline-flex items-center gap-2 font-bold">See the route <MoveUpRight size={15} /></button></div></div></div></div></div></section>

      <section className="mx-auto grid max-w-[1400px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:px-12 lg:py-36"><div><p className="font-mono text-[10px] tracking-[.2em] text-[#c04baa]">THE ECOSYSTEM / 06</p><h2 className="mt-5 max-w-[520px] text-[clamp(2.5rem,4vw,4.4rem)] font-semibold leading-none tracking-[-.06em]">One system.<br />Specialist intelligence.</h2><p className="mt-7 max-w-[440px] text-lg leading-8 text-[#67738b]">CogniOS is the connective layer. CogniAgents, CogniDocs, CogniTalk and CogniWare give each operating context a way to move.</p><button onClick={requestStart} className="mt-8 inline-flex items-center gap-3 text-sm font-bold text-[#7a56d4]">Read the architecture <ArrowRight size={16} /></button></div><div className="relative min-h-[390px] border border-[#dbe1eb] bg-[#f7f8fc] p-6 sm:p-10"><div className="absolute inset-8 border border-dashed border-[#cdd5e3]" /><div className="absolute left-1/2 top-1/2 flex h-36 w-36 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center text-white shadow-[0_12px_30px_rgba(111,81,213,.28)]" style={{ background: gradient }}><Sparkles size={20} /><span className="mt-2 text-lg font-bold">CogniOS</span><span className="font-mono text-[9px] tracking-widest text-white/75">CORE LAYER</span></div>{["CogniAgents", "CogniDocs", "CogniTalk", "CogniWare"].map((name, i) => <div key={name} className={`vi-float absolute flex h-24 w-24 flex-col items-center justify-center border border-[#d2d9e7] bg-white text-center shadow-sm ${["left-10 top-10", "right-10 top-10", "bottom-10 left-10", "bottom-10 right-10"][i]}`} style={{ animationDelay: `${i * .65}s` }}><Plus size={14} className="mb-2 text-[#cf4db9]" /><span className="text-[11px] font-bold text-[#354563]">{name}</span></div>)}</div></section>

      <section className="bg-[#182640] px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-12 lg:flex-row lg:items-end"><div><p className="font-mono text-[10px] tracking-[.2em] text-[#ee738c]">THE FIRST STEP / 07</p><h2 className="mt-6 max-w-[760px] text-[clamp(3rem,6vw,6.5rem)] font-semibold leading-[.9] tracking-[-.075em]">Start with one day.<br /><span className="text-[#c95ab6]">Leave with a business case.</span></h2></div><div className="max-w-[330px]"><p className="text-base leading-7 text-[#b9c3d5]">Bring one process, the people closest to it and the question you cannot answer. We will make the route visible.</p><button onClick={requestStart} className="mt-7 inline-flex items-center gap-3 bg-white px-5 py-4 text-sm font-bold text-[#182640] hover:bg-[#f3ddec]">Book a value scan <ArrowRight size={16} /></button></div></div></section>

      <footer className="bg-[#111d34] px-5 py-12 text-[#aeb9ca] sm:px-8 lg:px-12"><div className="mx-auto max-w-[1400px]"><div className="flex flex-col justify-between gap-10 border-b border-[#334159] pb-10 sm:flex-row"><div><div className="h-10 w-[158px] overflow-visible"><img src="/__mockup/images/cognirise/logo-white.svg" alt="Cognirise" className="h-10 w-auto origin-left object-contain object-left" style={{ width: 140, transform: "scale(2.35)" }} /></div><p className="mt-5 max-w-[300px] text-sm leading-6">Intelligence becomes visible when it moves work.</p></div><div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm sm:grid-cols-3"><a href="#model" className="hover:text-white">What we do</a><a href="#model" className="hover:text-white">Platforms</a><a href="#model" className="hover:text-white">Industries</a><a href="#model" className="hover:text-white">Work</a><a href="#model" className="hover:text-white">Insights</a><a href="#top" className="hover:text-white">Contact</a></div></div><div className="flex flex-col justify-between gap-3 pt-6 font-mono text-[10px] tracking-[.12em] text-[#71809a] sm:flex-row"><span>© COGNIRISE.AI / UAE · GLOBAL</span><span>PRIVACY &nbsp; ACCESSIBILITY &nbsp; LINKEDIN</span></div></div></footer>
      {toast && <div role="status" className="fixed bottom-5 right-5 z-50 flex max-w-[340px] items-start gap-3 border border-[#d7c7f2] bg-white px-5 py-4 text-sm text-[#253653] shadow-[0_15px_45px_rgba(31,45,77,.2)]"><div className="mt-0.5 h-2.5 w-2.5 rounded-full" style={{ background: gradient }} /><div><strong className="font-bold">Let’s move it.</strong><p className="mt-1 text-xs text-[#697690]">A Cognirise team member will help identify the right first process.</p></div><button onClick={() => setToast(false)} className="ml-2 text-[#7a879e]" aria-label="Dismiss"><X size={15} /></button></div>}
    </main>
  );
}