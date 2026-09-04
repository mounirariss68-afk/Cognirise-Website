import { useState } from "react";
import { ArrowRight, ChevronDown, Menu, X, Plus, Minus, ArrowUpRight } from "lucide-react";

const navItems = [
  { label: "What we do", children: ["Agentic enterprise transformation", "Data & AI foundations", "Engineering with AI", "Sovereign & regulated AI", "Digital AI workforce"] },
  { label: "Platforms", children: ["CogniOS", "CogniAgents", "CogniDocs", "CogniTalk", "Architecture"] },
  { label: "Industries", children: ["Banking & financial services", "Public sector & government", "Telecoms", "Energy & resources", "Manufacturing"] },
  { label: "Work", children: ["Case studies", "Selected builds", "Outcomes"] },
  { label: "Insights", children: ["Research / POVs", "News", "All insights"] },
  { label: "About", children: ["Firm", "Leadership", "Advisors", "Partners"] },
];

const outcomes = [
  ["01", "Cost", "Remove avoidable work from the operating model."],
  ["02", "Capacity", "Give expert teams room for the work only they can do."],
  ["03", "Speed", "Shorten the distance from decision to production."],
  ["04", "Risk", "Build controls into the system, not around it."],
];

const offers = [
  { no: "01", title: "Agentic enterprise transformation", copy: "Turn priority workflows into governed, measurable systems of work." },
  { no: "02", title: "Data & AI foundations", copy: "Make data usable, secure and ready for the decisions that matter." },
  { no: "03", title: "Engineering with AI", copy: "Ship software and intelligent services with senior technical ownership." },
  { no: "04", title: "Sovereign & regulated AI", copy: "Design for local control, auditability and the realities of public trust." },
  { no: "05", title: "Digital AI workforce", copy: "Deploy agents that execute inside the operating rhythm of your teams." },
];

function Mark({ dark = false }: { dark?: boolean }) {
  return <img src={`/__mockup/images/cognirise/${dark ? "logo-white" : "logo-blue"}.svg`} alt="Cognirise" className="h-10 w-[78px] object-contain object-left" />;
}

export function ExecutiveFieldManual() {
  const [openNav, setOpenNav] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);
  const [industry, setIndustry] = useState("Public sector");

  return (
    <main className="cfm-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        .cfm-shell{--ink:#111b3c;--muted:#556079;--line:#d8dce6;--paper:#fafbfc;--violet:#7448d8;--coral:#f1696d;background:var(--paper);color:var(--ink);font-family:'DM Sans',sans-serif;overflow:hidden}
        .cfm-shell *{box-sizing:border-box}.cfm-shell a{text-decoration:none;color:inherit}.cfm-mono{font-family:'Space Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
        .cfm-container{width:min(1240px,calc(100% - 48px));margin:0 auto}.cfm-grid{background-image:linear-gradient(to right,rgba(17,27,60,.065) 1px,transparent 1px);background-size:calc(100% / 12) 100%}
        .cfm-reveal{animation:cfm-rise .7s cubic-bezier(.2,.8,.2,1) both}.cfm-delay{animation-delay:.12s}.cfm-delay2{animation-delay:.22s}@keyframes cfm-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .cfm-route{background:linear-gradient(115deg,#7448d8 0%,#c34bb4 48%,#f1696d 100%)}.cfm-ink-button{transition:transform .2s ease,background .2s ease}.cfm-ink-button:hover{transform:translateY(-2px);background:#26345e}
        .cfm-outline:hover{border-color:var(--violet);color:var(--violet)}.cfm-card{transition:transform .25s ease,box-shadow .25s ease}.cfm-card:hover{transform:translateY(-4px);box-shadow:0 16px 35px rgba(17,27,60,.09)}
        @media(max-width:800px){.cfm-container{width:min(100% - 32px,620px)}.cfm-desktop{display:none!important}.cfm-grid{background-size:50% 100%}}
        @media(min-width:801px){.cfm-mobile{display:none!important}}
        @media(prefers-reduced-motion:reduce){.cfm-reveal{animation:none}.cfm-card,.cfm-ink-button{transition:none}}
      `}</style>

      <header className="sticky top-0 z-30 border-b border-[#d8dce6]/80 bg-[#fafbfc]/95 backdrop-blur">
        <div className="cfm-container flex h-[76px] items-center justify-between">
          <a href="#top" aria-label="Cognirise home"><Mark /></a>
          <nav className="cfm-desktop flex items-center gap-7 text-[13px] font-semibold">
            {navItems.map((item) => (
              <div key={item.label} className="relative" onMouseEnter={() => setOpenNav(item.label)} onMouseLeave={() => setOpenNav(null)}>
                <button className="flex items-center gap-1 py-7 text-[#33405f] hover:text-[#7448d8]" onClick={() => setOpenNav(openNav === item.label ? null : item.label)} aria-expanded={openNav === item.label}>
                  {item.label}<ChevronDown size={13} />
                </button>
                {openNav === item.label && <div className="absolute right-0 top-[62px] z-40 w-64 border border-[#d8dce6] bg-[#fafbfc] p-3 shadow-xl">{item.children.map((child) => <a href="#offers" key={child} className="block border-b border-[#e7e9ef] px-3 py-3 text-sm last:border-0 hover:text-[#7448d8]">{child}</a>)}</div>}
              </div>
            ))}
            <a href="#contact" className="cfm-route rounded-full px-5 py-3 text-white shadow-sm">Bring us one process <ArrowRight size={14} className="ml-2 inline" /></a>
          </nav>
          <button className="cfm-mobile p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu">{mobileOpen ? <X /> : <Menu />}</button>
        </div>
        {mobileOpen && <div className="cfm-mobile border-t border-[#d8dce6] bg-[#fafbfc] px-4 pb-5">{navItems.map((item) => <button key={item.label} className="flex w-full justify-between border-b border-[#e7e9ef] py-4 text-left font-semibold" onClick={() => setOpenNav(openNav === item.label ? null : item.label)}>{item.label}<ChevronDown size={16} /></button>)}<a href="#contact" className="cfm-route mt-5 block rounded-full px-5 py-3 text-center text-white">Bring us one process</a></div>}
      </header>

      <section id="top" className="cfm-grid relative border-b border-[#d8dce6]">
        <div className="cfm-container grid min-h-[650px] grid-cols-1 items-center gap-10 py-20 lg:grid-cols-12 lg:gap-8 lg:py-24">
          <div className="lg:col-span-7">
            <p className="cfm-mono cfm-reveal mb-7 text-[11px] font-bold text-[#7448d8]">UAE / FIELD NOTE 01 / 2025</p>
            <h1 className="cfm-reveal max-w-4xl text-[clamp(3.2rem,7vw,6.7rem)] font-semibold leading-[.91] tracking-[-.075em]">AI should move<br /><span className="text-[#7448d8]">the business.</span><br />Not just assist it.</h1>
            <p className="cfm-reveal cfm-delay mt-9 max-w-xl text-[19px] leading-8 text-[#556079]">Cognirise is the AI-native advisory &amp; engineering firm. Senior operators, forward-deployed engineers and governed agents move priority work from strategy into production.</p>
            <div className="cfm-reveal cfm-delay2 mt-9 flex flex-wrap gap-3"><a href="#contact" className="cfm-ink-button rounded-full bg-[#111b3c] px-6 py-3.5 text-sm font-semibold text-white">Bring us one process <ArrowRight size={16} className="ml-2 inline" /></a><a href="#model" className="cfm-outline rounded-full border border-[#aeb5c7] px-6 py-3.5 text-sm font-semibold transition-colors">See how we work</a></div>
          </div>
          <div className="relative lg:col-span-5 lg:pl-10">
            <div className="absolute -right-20 -top-10 h-72 w-72 rounded-full bg-[#ece8ff] blur-3xl" />
            <div className="relative border-l border-t border-[#cbd0dd] bg-[#f2f3f7] p-5 shadow-[18px_18px_0_#e5e7ee]">
              <div className="mb-12 flex items-center justify-between"><span className="cfm-mono text-[10px] text-[#66718a]">Operating brief</span><span className="h-2 w-2 rounded-full bg-[#f1696d]" /></div>
              <div className="space-y-7">
                {["Board ambition", "Priority process", "Governed system", "Business outcome"].map((label, i) => <div key={label} className="relative flex items-center gap-4"><div className={`h-12 w-12 shrink-0 border ${i < 3 ? "border-[#7448d8] bg-white" : "cfm-route border-transparent"} flex items-center justify-center text-xs font-bold ${i === 3 ? "text-white" : "text-[#7448d8]"}`}>{`0${i + 1}`}</div><div><p className="cfm-mono text-[10px] text-[#66718a]">STEP 0{i + 1}</p><p className="mt-1 font-semibold">{label}</p></div>{i < 3 && <div className="cfm-route absolute left-[23px] top-12 h-7 w-px" />}</div>)}
              </div>
              <p className="mt-12 border-t border-[#cbd0dd] pt-4 text-sm leading-6 text-[#556079]">A briefing that ends with a business case, not another deck.</p>
            </div>
          </div>
        </div>
        <div className="cfm-container flex flex-wrap gap-x-10 gap-y-3 border-t border-[#d8dce6] py-5 text-xs text-[#556079]"><span className="cfm-mono text-[#111b3c]">For leaders who need</span><span>clarity before scale</span><span>control before deployment</span><span>movement before more pilots</span></div>
      </section>

      <section className="cfm-container py-28">
        <div className="grid gap-10 lg:grid-cols-12"><div className="lg:col-span-5"><p className="cfm-mono text-[11px] font-bold text-[#7448d8]">THE EXECUTIVE QUESTION</p><h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-.04em] md:text-6xl">Consulting firms leave slides.</h2></div><div className="lg:col-span-6 lg:col-start-7"><p className="text-2xl leading-relaxed text-[#33405f]">AI spend is rising. But too little work is changing. The gap is not another strategy. It is the distance between a decision and a system people use.</p><p className="mt-8 text-base leading-7 text-[#66718a]">We are not paid to advise. We are paid to move four numbers — with the governance, architecture and accountable delivery to prove it.</p></div></div>
        <div className="mt-20 grid border-t border-[#d8dce6] sm:grid-cols-2 lg:grid-cols-4">{outcomes.map(([no, title, copy]) => <div key={title} className="cfm-card border-b border-r border-[#d8dce6] p-6 lg:min-h-[220px]"><span className="cfm-mono text-[10px] text-[#7448d8]">{no}</span><h3 className="mt-14 text-2xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#66718a]">{copy}</p></div>)}</div>
      </section>

      <section id="model" className="bg-[#111b3c] py-28 text-[#fafbfc]">
        <div className="cfm-container"><div className="grid gap-12 lg:grid-cols-12"><div className="lg:col-span-5"><p className="cfm-mono text-[11px] font-bold text-[#e780d4]">THE OPERATING MODEL</p><h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-.04em] md:text-6xl">Forward-deployed people.<br /><span className="text-[#e780d4]">Forward-deployed agents.</span></h2></div><div className="lg:col-span-6 lg:col-start-7"><p className="text-xl leading-8 text-[#cbd0dd]">One accountable team, close enough to the work to see what must change — and technical enough to make it real.</p></div></div>
          <div className="mt-20 grid border-y border-white/20 md:grid-cols-4">{["Discover", "Prototype", "Produce", "Scale"].map((label, i) => <div key={label} className="relative border-b border-white/20 p-6 md:border-b-0 md:border-r md:last:border-r-0"><span className="cfm-mono text-[10px] text-[#e780d4]">0{i + 1}</span><h3 className="mt-12 text-2xl font-semibold">{label}</h3><p className="mt-3 text-sm leading-6 text-[#aab3c8]">{["Name the process and the value at stake.", "Prove the route with the people who own it.", "Integrate, govern and put it into the rhythm.", "Measure outcomes, then extend the system."][i]}</p>{i < 3 && <ArrowRight className="absolute right-5 top-1/2 hidden text-[#f1696d] md:block" size={20} />}</div>)}</div>
        </div>
      </section>

      <section id="offers" className="cfm-container py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="cfm-mono text-[11px] font-bold text-[#7448d8]">STARTING POINTS</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.04em] md:text-6xl">Choose the problem.<br />We’ll find the route.</h2></div><p className="max-w-sm text-base leading-7 text-[#66718a]">Know the service you need? Go direct. Still framing the problem? Start with one process.</p></div>
        <div className="mt-16 border-t border-[#d8dce6]">{offers.map((offer, i) => <div key={offer.no} className="cfm-card border-b border-[#d8dce6]"><button className="flex w-full items-center gap-5 py-6 text-left md:py-7" onClick={() => setExpanded(expanded === i ? null : i)} aria-expanded={expanded === i}><span className="cfm-mono w-9 text-[10px] text-[#7448d8]">{offer.no}</span><span className="flex-1 text-xl font-semibold md:text-2xl">{offer.title}</span>{expanded === i ? <Minus size={20} /> : <Plus size={20} />}</button>{expanded === i && <div className="ml-14 max-w-2xl pb-7 text-base leading-7 text-[#66718a]">{offer.copy} <a href="#contact" className="ml-2 font-semibold text-[#7448d8]">Explore this route <ArrowUpRight size={15} className="inline" /></a></div>}</div>)}</div>
      </section>

      <section className="border-y border-[#d8dce6] bg-[#eef0f5] py-24">
        <div className="cfm-container"><div className="flex flex-wrap items-end justify-between gap-7"><div><p className="cfm-mono text-[11px] font-bold text-[#7448d8]">WHERE THE WORK STARTS</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.04em] md:text-5xl">Built for the stakes<br />of this region.</h2></div><div className="flex flex-wrap gap-2">{["Public sector", "Banking", "Telecoms", "Energy"].map((item) => <button key={item} className={`rounded-full border px-4 py-2 text-sm transition-colors ${industry === item ? "border-[#111b3c] bg-[#111b3c] text-white" : "border-[#b6bdcc] text-[#556079] hover:border-[#7448d8]"}`} onClick={() => setIndustry(item)}>{item}</button>)}</div></div><div className="mt-14 grid gap-10 lg:grid-cols-12"><div className="border-t-2 border-[#7448d8] pt-5 lg:col-span-5"><p className="cfm-mono text-[10px] text-[#7448d8]">CURRENT BRIEF / {industry.toUpperCase()}</p><h3 className="mt-8 text-3xl font-semibold">{industry === "Public sector" ? "Sovereignty is an operating requirement." : industry === "Banking" ? "Trust is the product." : industry === "Telecoms" ? "Every second is an operating decision." : "The transition must run the business."}</h3></div><div className="lg:col-span-5 lg:col-start-7"><p className="text-lg leading-8 text-[#556079]">Transformation here carries a particular burden: ambition must move at the pace of institutions, infrastructure and public trust. Cognirise brings local context, technical depth and accountable delivery to the same table.</p><a href="#contact" className="mt-8 inline-flex items-center border-b border-[#111b3c] pb-2 text-sm font-semibold">See the {industry.toLowerCase()} play <ArrowRight size={15} className="ml-3" /></a></div></div></div>
      </section>

      <section id="contact" className="cfm-route py-24 text-white"><div className="cfm-container grid gap-12 lg:grid-cols-12"><div className="lg:col-span-7"><p className="cfm-mono text-[11px] text-white/70">A FIRST CONVERSATION</p><h2 className="mt-5 text-5xl font-semibold leading-[.95] tracking-[-.06em] md:text-7xl">Start with one day.<br />Leave with a<br />business case.</h2></div><div className="lg:col-span-4 lg:col-start-9"><p className="text-lg leading-8 text-white/85">Bring one process, one constraint or one ambition. We’ll map the value, the route to production and the decisions required to move.</p><button className="mt-8 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#111b3c] transition-transform hover:-translate-y-1">Book a value scan <ArrowRight size={16} className="ml-2 inline" /></button><p className="mt-5 text-xs text-white/70">For executive sponsors, technology leaders and transformation teams.</p></div></div></section>

      <footer className="bg-[#111b3c] py-12 text-white"><div className="cfm-container"><div className="flex flex-col justify-between gap-10 border-b border-white/20 pb-10 md:flex-row"><Mark dark /><div className="grid grid-cols-2 gap-x-14 gap-y-4 text-sm text-[#cbd0dd] md:grid-cols-4"><a href="#offers">What we do</a><a href="#model">Operating model</a><a href="#offers">Platforms</a><a href="#contact">Contact</a><a href="#offers">Industries</a><a href="#contact">Insights</a><a href="#contact">About</a><a href="#top">Back to top ↑</a></div></div><div className="flex flex-col justify-between gap-4 pt-6 text-xs text-[#aab3c8] md:flex-row"><span>© 2025 Cognirise. Intelligence that elevates.</span><span>UAE · Designed for regulated ambition.</span></div></div></footer>
    </main>
  );
}