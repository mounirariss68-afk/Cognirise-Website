import { useState } from "react";
import { ArrowDownRight, ArrowRight, ChevronDown, Menu, Plus, X } from "lucide-react";

const nav = ["What we do", "Platforms", "Industries", "Work", "Insights", "About"];
const layers = [
  { id: "01", title: "Signal", copy: "The business problem, made specific.", tone: "from-[#7067db] to-[#b956d0]" },
  { id: "02", title: "System", copy: "Data, foundations, governance and agents.", tone: "from-[#c450c3] to-[#e85a9c]" },
  { id: "03", title: "Movement", copy: "Forward-deployed people making work change.", tone: "from-[#e85a9c] to-[#f8796c]" },
  { id: "04", title: "Outcome", copy: "Cost, capacity, speed and risk — in motion.", tone: "from-[#f8796c] to-[#f39a62]" },
];
const offers = [
  ["Transformation", "Turn an enterprise priority into a governed operating system."],
  ["Foundations", "Make data and AI ready for the work that matters."],
  ["Engineering", "Build, integrate and run AI-native products in production."],
  ["Sovereign AI", "Design for control, locality, explainability and trust."],
  ["Digital workforce", "Deploy agents that execute alongside your people."],
];

export function LivingArchitecture() {
  const [menu, setMenu] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState(2);
  const [industry, setIndustry] = useState("Government");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#f8f9fc] text-[#101634]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <style>{`
        .la-grid { background-image: linear-gradient(rgba(36,48,94,.065) 1px,transparent 1px),linear-gradient(90deg,rgba(36,48,94,.065) 1px,transparent 1px); background-size: 32px 32px; }
        .la-gradient { background: linear-gradient(105deg,#7067db 0%,#bb55c9 44%,#ed608e 72%,#f98a69 100%); }
        @keyframes la-pulse { 0%,100% { opacity:.35; transform:scale(.96) } 50% { opacity:1; transform:scale(1) } }
        @keyframes la-drift { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-7px) } }
        .la-pulse { animation:la-pulse 3s ease-in-out infinite; } .la-drift { animation:la-drift 6s ease-in-out infinite; }
        @media (prefers-reduced-motion:reduce) { .la-pulse,.la-drift { animation:none } }
      `}</style>
      <header className="relative z-30 border-b border-[#dfe3ee] bg-[#f8f9fc]/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 lg:px-12">
          <a href="#top" aria-label="Cognirise home" className="flex items-center">
            <img src="/__mockup/images/cognirise/logo-blue.svg" alt="Cognirise" className="h-11 w-[86px] object-contain object-left" />
          </a>
          <nav className="hidden items-center gap-7 lg:flex">
            {nav.map((item) => (
              <button key={item} onClick={() => setMenu(menu === item ? null : item)} className="flex items-center gap-1.5 text-[13px] font-semibold text-[#263052] transition-colors hover:text-[#8958c6]">
                {item}<ChevronDown size={13} strokeWidth={1.8} />
              </button>
            ))}
          </nav>
          <div className="hidden items-center gap-4 lg:flex">
            <span className="font-mono text-[10px] tracking-[.18em] text-[#71809d]">UAE / EN</span>
            <a href="#start" className="la-gradient rounded-full px-5 py-3 text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(196,83,178,.2)] transition-transform hover:-translate-y-0.5">Bring us one process</a>
          </div>
          <button className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button>
        </div>
        {menu && <div className="absolute left-0 right-0 top-[76px] border-b border-[#dfe3ee] bg-[#f8f9fc] px-5 py-8 shadow-xl"><div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-5 md:grid-cols-4"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#8d59c6]">Explore</p><p className="mt-3 text-xl font-bold">{menu}</p></div><div className="col-span-3 grid grid-cols-2 gap-3 text-sm text-[#4e5a7a]"><a href="#architecture" className="rounded-lg border border-[#dfe3ee] p-4 hover:bg-white">Read the architecture <ArrowRight size={15} className="mt-3" /></a><a href="#start" className="rounded-lg border border-[#dfe3ee] p-4 hover:bg-white">Find your starting point <ArrowRight size={15} className="mt-3" /></a></div></div></div>}
        {mobileOpen && <div className="border-t border-[#dfe3ee] bg-[#f8f9fc] p-5 lg:hidden">{nav.map((item) => <button key={item} className="block w-full border-b border-[#dfe3ee] py-4 text-left font-semibold" onClick={() => setMobileOpen(false)}>{item}</button>)}<a href="#start" className="la-gradient mt-5 block rounded-full px-5 py-3 text-center font-bold text-white">Bring us one process</a></div>}
      </header>

      <section id="top" className="la-grid relative border-b border-[#dfe3ee]">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-20 pt-16 lg:grid-cols-[.9fr_1.1fr] lg:px-12 lg:pb-28 lg:pt-24">
          <div className="max-w-[650px]">
            <p className="mb-7 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-[#725acb]"><span className="h-2 w-2 rounded-full bg-[#ec6a82] la-pulse" />AI-native advisory & engineering / UAE</p>
            <h1 className="text-[clamp(3.2rem,7vw,7.2rem)] font-black leading-[.91] tracking-[-.075em]">Make the<br /><span className="bg-gradient-to-r from-[#7067db] via-[#bd54c1] to-[#f07770] bg-clip-text text-transparent">system move.</span></h1>
            <p className="mt-8 max-w-[520px] text-[19px] leading-8 text-[#475271]">Cognirise is the AI-native advisory & engineering firm. Senior operators, forward-deployed engineers and governed agents move priority work from strategy into production.</p>
            <div className="mt-9 flex flex-wrap items-center gap-5"><a href="#start" className="la-gradient rounded-full px-6 py-4 text-sm font-bold text-white">Bring us one process <ArrowRight className="ml-2 inline" size={16} /></a><a href="#architecture" className="text-sm font-bold text-[#253055] underline decoration-[#d4d9e6] underline-offset-8">Explore the operating model</a></div>
            <p className="mt-12 font-mono text-[10px] uppercase tracking-[.18em] text-[#8a94ac]">Built for ambition / designed for sovereign and regulated environments</p>
          </div>
          <div id="architecture" className="relative min-h-[440px] self-center lg:min-h-[530px]">
            <div className="absolute inset-4 rounded-[28px] border border-[#d9deea] bg-[#f8f9fc]/60 p-5 shadow-[0_30px_80px_rgba(44,58,106,.08)] lg:inset-8 lg:p-8">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[.16em] text-[#79839d]"><span>Operating architecture / 01</span><span>Live system</span></div>
              <div className="relative mt-8 h-[380px]">
                <div className="absolute left-1/2 top-2 h-[320px] w-px -translate-x-1/2 bg-[#ccd3e3]" />
                <div className="absolute left-1/2 top-2 h-[170px] w-[2px] -translate-x-1/2 bg-gradient-to-b from-[#7763d8] via-[#ce59b4] to-[#ef7378] transition-all duration-700" style={{ height: `${160 + activeLayer * 55}px` }} />
                {layers.map((layer, i) => <button key={layer.id} onClick={() => setActiveLayer(i)} className={`la-drift absolute left-1/2 flex w-full -translate-x-1/2 items-center gap-3 text-left transition-all duration-500 ${i === activeLayer ? "scale-[1.03]" : "opacity-70 hover:opacity-100"}`} style={{ top: i * 82 }}><span className={`z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-[#f8f9fc] bg-gradient-to-br ${layer.tone} font-mono text-[11px] font-bold text-white shadow-lg`}>{layer.id}</span><span className="rounded-xl border border-[#dfe3ee] bg-[#f8f9fc] px-4 py-3 shadow-sm"><strong className="block text-sm">{layer.title}</strong><small className="text-[12px] text-[#69748f]">{layer.copy}</small></span></button>)}
                <div className="absolute bottom-0 right-0 max-w-[180px] border-l-2 border-[#e9727c] pl-3 font-mono text-[10px] leading-5 text-[#737d97]">A visible route from ambition to governed execution.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#dfe3ee] bg-white"><div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-[#dfe3ee] md:grid-cols-4 px-5 lg:px-12">{["Cost", "Capacity", "Speed", "Risk"].map((x, i) => <div key={x} className="px-4 py-8 first:pl-0 lg:py-10"><p className="font-mono text-[10px] tracking-[.2em] text-[#8b95ad]">OUTCOME / 0{i + 1}</p><p className="mt-2 text-xl font-bold">{x}</p><p className="mt-1 text-[12px] text-[#73809d]">{["Less friction in the work", "More room for the mission", "Shorter path to production", "Control built into the system"][i]}</p></div>)}</div></section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 lg:px-12 lg:py-36"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="font-mono text-[11px] uppercase tracking-[.2em] text-[#8d59c6]">The point of view</p><h2 className="mt-5 max-w-[480px] text-4xl font-black leading-[.98] tracking-[-.055em] lg:text-6xl">Consulting firms leave slides. <span className="text-[#8b91a8]">We leave a working system.</span></h2></div><div className="lg:pt-16"><p className="max-w-[570px] text-[20px] leading-8 text-[#4b5876]">AI transformation is not a strategy deck or a collection of pilots. It is an operating architecture: the right foundations, the right agents, the right controls, and people who stay close enough to move the work.</p><div className="mt-10 border-t border-[#dfe3ee] pt-5"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#8b95ad]">Our measure</p><p className="mt-3 text-2xl font-bold">“We are not paid to advise. We are paid to move four numbers.”</p></div></div></div></section>

      <section className="bg-[#111832] px-5 py-24 text-white lg:px-12 lg:py-32"><div className="mx-auto max-w-[1440px]"><div className="flex flex-wrap items-end justify-between gap-8"><div><p className="font-mono text-[11px] uppercase tracking-[.2em] text-[#ed7694]">The stack, not the shelf</p><h2 className="mt-4 text-4xl font-black tracking-[-.05em] lg:text-6xl">A living architecture.</h2></div><p className="max-w-[390px] text-[16px] leading-7 text-[#b9c0d5]">Platforms, services and industry plays connect into one accountable system — not five disconnected offers.</p></div><div className="mt-16 grid gap-3 md:grid-cols-5">{offers.map(([title, copy], i) => <a href="#start" key={title} className={`group relative min-h-[240px] overflow-hidden border border-white/15 p-5 transition-all hover:-translate-y-2 ${i === 0 ? "md:translate-y-8" : i === 4 ? "md:-translate-y-8" : ""}`}><span className="font-mono text-[10px] text-[#aab3cd]">0{i + 1} / CAPABILITY</span><Plus className="absolute right-5 top-5 text-[#ed7694] transition-transform group-hover:rotate-90" size={17} /><h3 className="absolute bottom-14 text-xl font-bold">{title}</h3><p className="absolute bottom-5 pr-5 text-[12px] leading-5 text-[#acb5ce]">{copy}</p></a>)}</div></div></section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 lg:px-12 lg:py-36"><div className="grid gap-12 lg:grid-cols-[.55fr_1fr]"><div><p className="font-mono text-[11px] uppercase tracking-[.2em] text-[#8d59c6]">Industry lens</p><h2 className="mt-5 text-4xl font-black tracking-[-.05em] lg:text-6xl">Start where value leaks.</h2><div className="mt-9 flex flex-wrap gap-2">{["Government", "Banking", "Telecoms", "Energy"].map((x) => <button key={x} onClick={() => setIndustry(x)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${industry === x ? "border-[#a65bc8] bg-[#a65bc8] text-white" : "border-[#d8deeb] text-[#596580] hover:border-[#a65bc8]"}`}>{x}</button>)}</div></div><div className="la-grid border border-[#dce1ec] bg-[#f8f9fc] p-7 lg:p-12"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#8c96ad]">Selected lens / {industry}</p><h3 className="mt-6 text-3xl font-black">{industry === "Government" ? "Sovereign by design." : industry === "Banking" ? "Trust at transaction speed." : industry === "Telecoms" ? "Complexity, made operable." : "Intelligence for the physical world."}</h3><p className="mt-5 max-w-[570px] text-[17px] leading-7 text-[#58637e]">{industry === "Government" ? "For public-sector leaders, transformation must be locally governed, explainable and ready for the realities of service delivery." : "Cognirise connects domain priorities to governed systems, data foundations and agents that can work in the real operating environment."}</p><a href="#start" className="mt-9 inline-flex items-center gap-2 text-sm font-bold text-[#7e59c8]">Explore the play <ArrowRight size={16} /></a></div></div></section>

      <section id="start" className="la-gradient px-5 py-20 text-white lg:px-12 lg:py-28"><div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="font-mono text-[11px] uppercase tracking-[.2em] text-white/75">A practical first move</p><h2 className="mt-5 max-w-[720px] text-5xl font-black leading-[.95] tracking-[-.06em] lg:text-7xl">Start with one day.<br />Leave with a business case.</h2><p className="mt-7 max-w-[560px] text-lg leading-7 text-white/85">Bring one process, one ambition or one stubborn bottleneck. We will map the system, identify the first intervention and leave you with a route forward.</p></div><a href="mailto:hello@cognirise.ai" className="inline-flex items-center gap-3 rounded-full bg-[#111832] px-6 py-4 text-sm font-bold text-white">Find your starting point <ArrowDownRight size={17} /></a></div></section>

      <footer className="bg-[#111832] px-5 py-14 text-white lg:px-12"><div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1fr_2fr]"><div><img src="/__mockup/images/cognirise/logo-white.svg" alt="Cognirise" className="h-12 w-[92px] object-contain object-left" /><p className="mt-7 max-w-[270px] text-sm leading-6 text-[#aeb7cf]">Forward-deployed people. Forward-deployed agents.</p></div><div className="grid grid-cols-2 gap-8 text-sm text-[#aeb7cf] md:grid-cols-4"><div><p className="mb-4 font-bold text-white">Explore</p><a href="#architecture" className="block py-1">Operating model</a><a href="#start" className="block py-1">Bring one process</a></div><div><p className="mb-4 font-bold text-white">Platforms</p><a href="#architecture" className="block py-1">CogniOS</a><a href="#architecture" className="block py-1">CogniAgents</a></div><div><p className="mb-4 font-bold text-white">Industries</p><a href="#start" className="block py-1">Public sector</a><a href="#start" className="block py-1">Financial services</a></div><div><p className="mb-4 font-bold text-white">Contact</p><a href="mailto:hello@cognirise.ai" className="block py-1">hello@cognirise.ai</a><span className="block py-1">Dubai / Abu Dhabi</span></div></div></div></footer>
    </main>
  );
}