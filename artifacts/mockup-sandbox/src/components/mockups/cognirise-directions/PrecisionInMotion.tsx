import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Menu, MoveRight, Pause, Play, X } from "lucide-react";

const services = [
  ["01", "Agentic enterprise transformation", "Find the work worth changing. Rebuild it around intelligence."],
  ["02", "Data & AI foundations", "Make data, controls and architecture ready for what comes next."],
  ["03", "Engineering with AI", "Ship production systems with forward-deployed engineering teams."],
  ["04", "Sovereign & regulated AI", "Build local control, security and explainability into the work."],
  ["05", "Digital AI workforce", "Deploy governed agents into real operating environments."],
];

export function PrecisionInMotion() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [running, setRunning] = useState(true);
  const [activeService, setActiveService] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setActiveService((current) => (current + 1) % services.length), 3300);
    return () => window.clearInterval(timer);
  }, [running]);

  return (
    <main className="precision">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&family=Syne:wght@600;700;800&display=swap');
        .precision{--ink:#071536;--soft:#f3f4f8;--line:#d5d9e4;--violet:#8456e7;--magenta:#e454b1;--coral:#ff755e;color:var(--ink);background:#fbfbfd;font-family:Manrope,sans-serif;overflow:hidden}
        .precision *{box-sizing:border-box}.precision button{font:inherit}.precision a{text-decoration:none;color:inherit}
        .precision .mono{font-family:"DM Mono",monospace;text-transform:uppercase;font-size:10px;letter-spacing:.08em}.precision .eyebrow{display:flex;gap:10px;align-items:center;font-family:"DM Mono",monospace;text-transform:uppercase;font-size:11px;letter-spacing:.08em;font-weight:500}.precision .eyebrow:before{content:"";width:25px;height:2px;background:linear-gradient(90deg,var(--violet),var(--coral))}
        .precision header{position:absolute;z-index:10;top:0;left:0;width:100%;height:88px;display:flex;align-items:center;justify-content:space-between;padding:18px 4.6%;border-bottom:1px solid rgba(7,21,54,.14)}
        .precision .brand{width:146px;height:50px;object-fit:contain;object-position:left}.precision nav{display:flex;align-items:center;gap:29px;font-size:13px;font-weight:700}.precision nav a{position:relative}.precision nav a:after{content:"";position:absolute;bottom:-7px;left:0;width:0;height:2px;background:var(--coral);transition:width .25s}.precision nav a:hover:after{width:100%}
        .precision .nav-cta,.precision .gradient-btn{border:0;cursor:pointer;background:linear-gradient(105deg,var(--violet),var(--magenta) 53%,var(--coral));color:#fff;font-weight:800;letter-spacing:-.02em;transition:transform .2s,box-shadow .2s}.precision .nav-cta{padding:13px 18px;font-size:12px}.precision .nav-cta:hover,.precision .gradient-btn:hover{transform:translate(-3px,-3px);box-shadow:5px 5px 0 var(--ink)}.precision .menu-toggle{display:none;background:none;border:0;color:var(--ink)}
        .precision .hero{min-height:880px;padding:161px 4.6% 56px;position:relative;isolation:isolate;border-bottom:1px solid var(--line);background:radial-gradient(circle at 78% 45%,#f0f0fd 0,transparent 32%),#fbfbfd}.precision .hero-copy{max-width:1090px;position:relative;z-index:2}.precision h1{font-family:Syne,sans-serif;font-size:clamp(64px,10.4vw,166px);letter-spacing:-.095em;line-height:.83;margin:30px 0 38px;font-weight:800;max-width:1050px}.precision .hero h1 span{display:block;margin-left:13vw}.precision .hero h1 em{font-style:normal;color:transparent;background:linear-gradient(100deg,var(--violet),var(--magenta),var(--coral));-webkit-background-clip:text;background-clip:text}
        .precision .hero-bottom{display:flex;align-items:end;justify-content:space-between;gap:30px;margin-top:78px;position:relative;z-index:2}.precision .hero-bottom p{max-width:470px;font-size:18px;line-height:1.48;margin:0}.precision .hero-actions{display:flex;gap:12px;align-items:center}.precision .gradient-btn{padding:17px 20px;font-size:14px}.precision .line-btn{background:transparent;color:var(--ink);border:1px solid var(--ink);padding:16px 19px;font-weight:800;font-size:14px;cursor:pointer}.precision .line-btn:hover{background:var(--ink);color:#fff}
        .precision .trajectory{position:absolute;z-index:0;inset:120px -15% 0 35%;pointer-events:none}.precision .trajectory:before{content:"";position:absolute;width:100%;height:156px;top:42%;background:linear-gradient(90deg,transparent 0%,#8c64ec 10%,#e254b0 48%,#ff7961 100%);transform:rotate(-27deg);clip-path:polygon(0 47%,100% 0,100% 55%,0 100%);opacity:.96;animation:slip 7s cubic-bezier(.2,.7,.2,1) infinite alternate}.precision .trajectory:after{content:"";position:absolute;width:75%;height:1px;top:58%;right:-2%;background:#091535;transform:rotate(-27deg);box-shadow:0 -24px 0 rgba(7,21,54,.12),0 24px 0 rgba(7,21,54,.12)}@keyframes slip{to{transform:translate(-60px,34px) rotate(-27deg)}}.precision .target{position:absolute;right:7%;top:20%;width:273px;height:273px;border:1px solid rgba(7,21,54,.32);border-radius:50%;animation:rotate 22s linear infinite}.precision .target:before,.precision .target:after{content:"";position:absolute;background:linear-gradient(90deg,var(--violet),var(--coral))}.precision .target:before{width:8px;height:8px;border-radius:50%;right:33px;top:30px}.precision .target:after{width:1px;height:120%;left:50%;top:-10%;transform:rotate(37deg);opacity:.5}@keyframes rotate{to{transform:rotate(360deg)}}.precision .side-index{position:absolute;bottom:56px;right:4.6%;display:flex;gap:9px;align-items:center}.precision .side-index i{height:1px;width:20px;background:#b9bfcd}.precision .side-index i:first-child{width:54px;background:var(--ink)}
        .precision .ticker{background:var(--ink);color:#fff;overflow:hidden;white-space:nowrap;padding:14px 0;transform:rotate(-2deg) scale(1.03);position:relative;z-index:3}.precision .ticker div{font:600 13px "DM Mono",monospace;letter-spacing:.02em;animation:marquee 18s linear infinite}.precision .ticker b{color:#ff8a76;font-weight:500;margin:0 22px}@keyframes marquee{to{transform:translateX(-38%)}}
        .precision .statement{padding:180px 9% 156px;position:relative}.precision .statement:after{content:"";position:absolute;left:4.6%;top:90px;bottom:90px;border-left:1px solid var(--line)}.precision .statement h2{font-family:Syne,sans-serif;font-size:clamp(43px,6.3vw,88px);letter-spacing:-.075em;line-height:.94;margin:40px 0 0;max-width:940px}.precision .statement h2 strong{font-weight:inherit;color:var(--coral)}.precision .statement p{font-size:19px;line-height:1.55;max-width:470px;margin:46px 0 0 42%;color:#33415f}
        .precision .motion-panel{padding:0 4.6% 150px}.precision .control-room{background:var(--ink);color:#fff;min-height:650px;position:relative;padding:42px;overflow:hidden}.precision .control-room:before{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 0 46%,rgba(255,255,255,.04) 46.1% 46.3%,transparent 46.4%),repeating-linear-gradient(0deg,transparent 0 68px,rgba(255,255,255,.05) 69px 70px);pointer-events:none}.precision .room-head{display:flex;position:relative;z-index:1;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.28);padding-bottom:18px}.precision .room-head button{border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;width:38px;height:38px;cursor:pointer;display:grid;place-items:center}.precision .room-head button:hover{background:#fff;color:var(--ink)}.precision .system-title{font:700 clamp(41px,6vw,78px)/.9 Syne,sans-serif;letter-spacing:-.08em;max-width:600px;margin:76px 0 0;position:relative;z-index:1}.precision .systems{display:grid;grid-template-columns:1fr 1fr;gap:1px;position:absolute;bottom:0;right:0;width:56%;background:rgba(255,255,255,.25);z-index:1}.precision .system{background:#0c1a3b;padding:24px;min-height:125px;cursor:pointer;transition:background .3s}.precision .system:hover,.precision .system.active{background:linear-gradient(120deg,#704ce0,#e24fb2 68%,#f87860)}.precision .system small{font:11px "DM Mono",monospace}.precision .system h3{font-size:18px;line-height:1.05;margin:20px 0 0;max-width:170px}.precision .pulse-line{position:absolute;left:2%;bottom:77px;width:62%;height:126px;z-index:1;overflow:hidden}.precision .pulse-line svg{width:100%;height:100%}.precision .pulse-line path{stroke-dasharray:1100;stroke-dashoffset:1100;animation:draw 3.2s ease forwards infinite}@keyframes draw{50%,100%{stroke-dashoffset:0}}
        .precision .outcomes{padding:48px 4.6% 155px}.precision .outcome-grid{display:grid;grid-template-columns:1.15fr .85fr 1fr;grid-template-rows:280px 280px;margin-top:48px;border-top:1px solid var(--ink);border-left:1px solid var(--ink)}.precision .outcome{padding:26px;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);position:relative;display:flex;flex-direction:column;justify-content:space-between;transition:.35s}.precision .outcome:hover{background:var(--ink);color:#fff}.precision .outcome:nth-child(1){grid-row:span 2;background:linear-gradient(135deg,#ececff,#fff 60%)}.precision .outcome:nth-child(1):hover{background:linear-gradient(145deg,#6d49dc,#e154af,#fa765f)}.precision .outcome:nth-child(4){background:var(--soft)}.precision .outcome b{font:700 44px/.8 Syne,sans-serif;letter-spacing:-.08em;max-width:260px}.precision .outcome p{font-size:14px;line-height:1.45;margin:0;max-width:220px}.precision .outcome span{font:11px "DM Mono",monospace}
        .precision .case-file{padding:0 4.6% 156px}.precision .case-wrap{border-top:1px solid var(--ink);padding-top:20px}.precision .case-header{display:grid;grid-template-columns:1fr 2fr;gap:30px;align-items:start;margin:32px 0}.precision .case-header h2{font:700 clamp(48px,7.5vw,112px)/.85 Syne,sans-serif;letter-spacing:-.09em;margin:0}.precision .case-header p{max-width:430px;font-size:19px;line-height:1.45;margin:10px 0}.precision .case-visual{background:#ebecf2;height:430px;position:relative;overflow:hidden;border:1px solid #c6c9d4}.precision .case-visual:before{content:"";position:absolute;width:106%;height:95px;background:linear-gradient(90deg,var(--violet),var(--magenta),var(--coral));top:48%;left:-3%;transform:rotate(-12deg);box-shadow:0 -116px 0 rgba(7,21,54,.04),0 116px 0 rgba(7,21,54,.04);animation:slice 6s ease-in-out infinite alternate}@keyframes slice{to{transform:translateX(-7%) rotate(-12deg)}}.precision .case-visual .axis{position:absolute;inset:0;background:linear-gradient(90deg,transparent 49.8%,rgba(7,21,54,.3) 50%,transparent 50.2%),linear-gradient(0deg,transparent 49.8%,rgba(7,21,54,.3) 50%,transparent 50.2%)}.precision .case-visual strong{position:absolute;left:6%;bottom:7%;font:700 clamp(30px,4vw,60px)/.84 Syne,sans-serif;letter-spacing:-.08em;color:#fff;z-index:1}.precision .case-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.precision .case-tags span{border:1px solid var(--ink);padding:8px 10px;font:10px "DM Mono",monospace;text-transform:uppercase}
        .precision .sector{padding:120px 4.6%;background:#f0f1f5;border-top:1px solid var(--line)}.precision .sector-top{display:flex;justify-content:space-between;gap:30px;align-items:end}.precision .sector-top h2{font:700 clamp(49px,7vw,96px)/.87 Syne,sans-serif;letter-spacing:-.085em;max-width:760px;margin:22px 0 0}.precision .sector-top p{max-width:300px;font-size:15px;line-height:1.55}.precision .sector-list{margin-top:78px;border-top:1px solid var(--ink)}.precision .sector-row{display:grid;grid-template-columns:80px 1.2fr 1fr 50px;gap:20px;align-items:center;padding:28px 0;border-bottom:1px solid #aeb4c2;transition:.25s}.precision .sector-row:hover{padding-left:18px;background:linear-gradient(90deg,rgba(126,84,229,.09),transparent)}.precision .sector-row h3{font:700 clamp(27px,3.5vw,48px)/1 Syne,sans-serif;letter-spacing:-.07em;margin:0}.precision .sector-row p{font-size:14px;line-height:1.4;margin:0}.precision .sector-row svg{justify-self:end}
        .precision .closing{background:var(--ink);color:#fff;padding:140px 4.6% 38px;position:relative}.precision .closing:before{content:"";position:absolute;top:0;right:0;width:47%;height:13px;background:linear-gradient(90deg,var(--violet),var(--magenta),var(--coral)}.precision .closing h2{font:700 clamp(58px,9vw,140px)/.83 Syne,sans-serif;letter-spacing:-.1em;margin:30px 0 62px;max-width:1030px}.precision .closing h2 em{font-style:normal;color:#ff846d}.precision .closing-actions{display:flex;gap:13px}.precision .closing .line-btn{border-color:#fff;color:#fff}.precision .closing .line-btn:hover{background:#fff;color:var(--ink)}.precision footer{border-top:1px solid rgba(255,255,255,.28);margin-top:117px;padding-top:25px;display:flex;justify-content:space-between;align-items:end;gap:30px}.precision footer img{width:150px;height:50px;object-fit:contain;object-position:left;filter:none}.precision footer p{font-size:11px;opacity:.65;margin:0}
        .precision .mobile-menu{display:none}.precision :focus-visible{outline:3px solid var(--coral);outline-offset:3px}
        @media(max-width:720px){.precision header{height:72px;padding:10px 5%}.precision .brand{width:121px}.precision nav{display:none}.precision .menu-toggle{display:block}.precision .mobile-menu{display:flex;position:fixed;z-index:20;inset:0;background:var(--ink);color:#fff;padding:24px;flex-direction:column;gap:26px}.precision .mobile-menu button{align-self:flex-end;background:none;border:0;color:#fff}.precision .mobile-menu a{font:700 38px/.95 Syne,sans-serif;letter-spacing:-.06em}.precision .hero{min-height:730px;padding:126px 6% 38px}.precision h1{font-size:clamp(57px,17vw,91px);margin-top:25px}.precision .hero h1 span{margin-left:6vw}.precision .trajectory{inset:230px -80% 0 12%}.precision .target{right:-45px;top:30%;width:190px;height:190px}.precision .hero-bottom{display:block;margin-top:55px}.precision .hero-bottom p{font-size:16px;max-width:330px}.precision .hero-actions{margin-top:24px;flex-wrap:wrap}.precision .side-index{bottom:27px}.precision .statement{padding:110px 8% 100px}.precision .statement:after{display:none}.precision .statement h2{font-size:42px}.precision .statement p{margin:35px 0 0;font-size:17px}.precision .motion-panel{padding:0 0 85px}.precision .control-room{min-height:630px;padding:24px}.precision .system-title{margin-top:65px}.precision .systems{width:100%;grid-template-columns:1fr 1fr}.precision .pulse-line{left:0;width:100%;bottom:252px}.precision .outcomes{padding:30px 0 85px}.precision .outcomes>.eyebrow{padding:0 6%}.precision .outcome-grid{grid-template-columns:1fr 1fr;grid-template-rows:230px 230px 210px;margin-top:33px}.precision .outcome:nth-child(1){grid-column:span 2;grid-row:auto}.precision .outcome b{font-size:34px}.precision .case-file{padding:0 6% 100px}.precision .case-header{grid-template-columns:1fr;gap:0}.precision .case-header h2{font-size:55px}.precision .case-header p{font-size:17px}.precision .case-visual{height:315px}.precision .sector{padding:88px 6%}.precision .sector-top{display:block}.precision .sector-top h2{font-size:52px}.precision .sector-row{grid-template-columns:45px 1fr 25px;gap:13px}.precision .sector-row p{display:none}.precision .sector-row h3{font-size:29px}.precision .closing{padding:92px 6% 28px}.precision .closing h2{font-size:62px}.precision footer{margin-top:80px;align-items:start;flex-direction:column}.precision footer p{line-height:1.5}.precision .ticker{transform:none}.precision .eyebrow{font-size:10px}}
        @media(prefers-reduced-motion:reduce){.precision *, .precision *:before,.precision *:after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
      `}</style>

      <header>
        <img className="brand" src="/__mockup/images/cognirise/logo-blue.svg" alt="Cognirise" />
        <nav aria-label="Main navigation">
          <a href="#work">What we do</a><a href="#system">Platforms</a><a href="#sectors">Industries</a><a href="#work">Work</a><a href="#insights">Insights</a>
          <button className="nav-cta" onClick={() => document.getElementById("start")?.scrollIntoView({ behavior: "smooth" })}>Bring us one process <ArrowUpRight size={14} /></button>
        </nav>
        <button className="menu-toggle" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu /></button>
      </header>
      {menuOpen && <div className="mobile-menu"><button aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={28} /></button><a href="#work" onClick={() => setMenuOpen(false)}>What we do</a><a href="#system" onClick={() => setMenuOpen(false)}>Platforms</a><a href="#sectors" onClick={() => setMenuOpen(false)}>Industries</a><a href="#start" onClick={() => setMenuOpen(false)}>Bring us one process</a></div>}

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">UAE / AI-native advisory & engineering</div>
          <h1>Make AI<br /><span>move <em>work.</em></span></h1>
          <div className="hero-bottom">
            <p>Senior operators, forward-deployed engineers and governed agents—working as one team to move priority work from ambition into production.</p>
            <div className="hero-actions"><button className="gradient-btn" onClick={() => document.getElementById("start")?.scrollIntoView({ behavior: "smooth" })}>Bring us one process <ArrowDownRight size={17} /></button><button className="line-btn" onClick={() => document.getElementById("system")?.scrollIntoView({ behavior: "smooth" })}>How we work</button></div>
          </div>
        </div>
        <div className="trajectory"><div className="target" /></div>
        <div className="side-index mono"><i /><i /><i /> 01 / 05</div>
      </section>

      <div className="ticker"><div>FORWARD-DEPLOYED PEOPLE <b>×</b> FORWARD-DEPLOYED AGENTS <b>×</b> STRATEGY INTO PRODUCTION <b>×</b> GOVERNED BY DESIGN <b>×</b> FORWARD-DEPLOYED PEOPLE <b>×</b> FORWARD-DEPLOYED AGENTS <b>×</b> STRATEGY INTO PRODUCTION <b>×</b></div></div>

      <section className="statement">
        <div className="eyebrow">The point of view</div>
        <h2>AI spend is rising.<br />Too little <strong>work</strong> is changing.</h2>
        <p>Copilots and pilot programmes can demonstrate possibility. But transformation happens when the process, the data, the people and the controls move together.</p>
      </section>

      <section className="motion-panel" id="system">
        <div className="control-room">
          <div className="room-head"><span className="mono">Cognirise operating system / live model</span><button aria-label={running ? "Pause model" : "Play model"} onClick={() => setRunning(!running)}>{running ? <Pause size={15} /> : <Play size={15} />}</button></div>
          <h2 className="system-title">One accountable route. From priority to production.</h2>
          <div className="pulse-line" aria-hidden="true"><svg viewBox="0 0 800 160" fill="none"><path d="M0 130H146L224 22L340 130H468L573 43L676 130H800" stroke="url(#g)" strokeWidth="5"/><defs><linearGradient id="g"><stop stopColor="#8657ea"/><stop offset=".55" stopColor="#e255b2"/><stop offset="1" stopColor="#ff785e"/></linearGradient></defs></svg></div>
          <div className="systems">{services.map(([number, title], index) => <button key={title} className={`system ${index === activeService ? "active" : ""}`} onClick={() => setActiveService(index)}><small>{number}</small><h3>{title}</h3></button>)}</div>
        </div>
      </section>

      <section className="outcomes" id="work">
        <div className="eyebrow">The work changes four things</div>
        <div className="outcome-grid">
          <article className="outcome"><span>OUTCOME / 01</span><b>Cost that does not come back.</b><p>Redesign the system, not just a task inside it.</p></article>
          <article className="outcome"><span>OUTCOME / 02</span><b>Capacity<br />released.</b><p>Free expert teams for higher-value decisions.</p></article>
          <article className="outcome"><span>OUTCOME / 03</span><b>Time<br />compressed.</b><p>Shorten the route from idea to a working system.</p></article>
          <article className="outcome"><span>OUTCOME / 04</span><b>Risk made visible.</b><p>Make governance and control part of the build.</p></article>
        </div>
      </section>

      <section className="case-file">
        <div className="case-wrap">
          <div className="eyebrow">A different first meeting</div>
          <div className="case-header"><h2>Bring the work.</h2><p>Not a broad brief. Not another demo. Bring one process where urgency, complexity and value have already collided. We will map the route forward with you.</p></div>
          <div className="case-visual"><div className="axis" /><strong>PROCESS<br />IN MOTION</strong></div>
          <div className="case-tags"><span>Priority process</span><span>Executive sponsor</span><span>Technical owner</span><span>Production route</span></div>
        </div>
      </section>

      <section className="sector" id="sectors">
        <div className="sector-top"><div><div className="eyebrow">Built for consequential work</div><h2>Where the operating pressure is real.</h2></div><p>We work with organisations in the UAE and beyond where speed matters, but control is non-negotiable.</p></div>
        <div className="sector-list">{[["01","Banking & financial services","Governed intelligence for complex decisions."],["02","Government & public sector","Sovereign systems built around public value."],["03","Telecoms","Agentic operations at network scale."],["04","Energy & resources","Sharper decisions across physical operations."],["05","Travel & hospitality","Intelligence that improves every service moment."]].map(([n,title,copy]) => <a className="sector-row" href="#start" key={title}><span className="mono">{n}</span><h3>{title}</h3><p>{copy}</p><ArrowUpRight size={19}/></a>)}</div>
      </section>

      <section className="closing" id="start">
        <div className="eyebrow">Start with one day</div>
        <h2>Leave with<br />a <em>route</em> to<br />production.</h2>
        <div className="closing-actions"><button className="gradient-btn" onClick={() => window.alert("Thank you. A Cognirise advisor will be in touch to arrange your value scan.")}>Book a value scan <MoveRight size={17}/></button><button className="line-btn" onClick={() => document.getElementById("system")?.scrollIntoView({ behavior: "smooth" })}>Explore the operating model</button></div>
        <footer><img src="/__mockup/images/cognirise/logo-white.svg" alt="Cognirise" /><p>Intelligence that moves work.<br />Dubai · United Arab Emirates</p><p>© Cognirise. All rights reserved.</p></footer>
      </section>
    </main>
  );
}