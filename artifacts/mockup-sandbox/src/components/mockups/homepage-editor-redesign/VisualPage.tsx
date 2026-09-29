import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, ExternalLink, Eye, FileText, Image as ImageIcon, Layers3, RotateCcw, Save, Send, Settings2, ShieldCheck, Sparkles, X } from "lucide-react";
import "./_group.css";

type Section = "hero" | "industries" | "proof" | "services";

const industries = [
  { name: "Financial services", tag: "Regulated growth", image: "/__mockup/images/cognirise-pulse-governance.jpg" },
  { name: "Telecommunications", tag: "Connected operations", image: "/__mockup/images/cognirise-pulse-people.jpg" },
  { name: "Energy & Resources", tag: "Operational resilience", image: "/__mockup/images/cognirise-pulse-outcomes.jpg" },
];

export function VisualPage() {
  const [selected, setSelected] = useState<Section>("hero");
  const [headline, setHeadline] = useState("We build what moves business forward.");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [drawer, setDrawer] = useState<"issues" | "release" | null>(null);
  const [industryMode, setIndustryMode] = useState<"manual" | "automatic">("manual");
  const [notice, setNotice] = useState("");

  const choose = (section: Section) => { setSelected(section); setSaved(false); };
  const announce = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2800); };

  return (
    <div className="homepage-editor-redesign vp-shell">
      <style>{`
        .vp-shell{min-height:100dvh;background:#f4f2ed;color:#102957;display:flex;flex-direction:column;--ink:#102957;--pink:#e44d91;--line:#d7dce3;--paper:#f4f2ed;--muted:#66758a;--serif:Georgia,'Times New Roman',serif}
        .vp-top{height:58px;flex:none;background:#102957;color:#f8f7f3;display:flex;align-items:center;padding:0 24px;gap:18px;border-bottom:1px solid #27416a}
        .vp-brand{font:700 15px var(--app-font-display);letter-spacing:-.05em;white-space:nowrap}.vp-brand i{color:#e44d91;font-style:normal}
        .vp-divider{height:22px;width:1px;background:#62718a}.vp-crumb{font-size:12px;color:#c4cbd7}.vp-topright{margin-left:auto;display:flex;align-items:center;gap:10px}
        .vp-edition{display:flex;align-items:center;gap:8px;border:1px solid #51627e;border-radius:3px;padding:7px 10px;font-size:11px;color:#e6e9ef;letter-spacing:.04em}
        .vp-draft{font-size:10px;text-transform:uppercase;letter-spacing:.11em;color:#f5c986;display:flex;align-items:center;gap:7px}.vp-draft:before{content:'';width:6px;height:6px;border-radius:50%;background:#ecb957}
        .vp-button{font:600 11px var(--app-font-sans);border:1px solid #536581;background:transparent;color:inherit;padding:8px 12px;border-radius:3px;display:inline-flex;align-items:center;gap:7px;cursor:pointer;transition:background .18s,transform .18s}.vp-button:hover{background:#ffffff17;transform:translateY(-1px)}.vp-button svg{width:14px;height:14px}
        .vp-button-light{background:#f2eee7;color:#102957;border-color:#f2eee7}.vp-button-light:hover{background:#fff}
        .vp-work{display:grid;grid-template-columns:204px minmax(0,1fr);min-height:calc(100dvh - 58px)}
        .vp-rail{background:#e9e8e3;border-right:1px solid #d6d9dc;padding:21px 14px;display:flex;flex-direction:column;gap:22px}
        .vp-rail-label{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#7a8798;padding:0 9px}
        .vp-nav{display:flex;flex-direction:column;gap:3px}.vp-nav button{border:0;background:transparent;text-align:left;padding:10px 9px;color:#526178;font:500 12px var(--app-font-sans);border-radius:3px;cursor:pointer;display:flex;align-items:center;gap:10px}.vp-nav button.active{background:#fff;color:#102957;box-shadow:0 1px 3px #1029570d}.vp-nav svg{width:15px;height:15px}
        .vp-pageoutline{border-top:1px solid #d2d5d6;padding-top:17px}.vp-outlineitem{width:100%;border:0;background:transparent;display:flex;align-items:flex-start;gap:8px;text-align:left;padding:8px 9px;color:#59677d;font-size:11px;border-radius:3px;cursor:pointer}.vp-outlineitem.active{color:#102957;background:#dce3ea}.vp-outlineitem b{font:500 9px var(--app-font-mono);color:#9ca5af;margin-top:2px}
        .vp-sourcecard{margin-top:auto;border:1px solid #d1d5d6;background:#f1f0eb;padding:12px;border-radius:3px}.vp-sourcecard strong{font-size:10px;display:block;margin-bottom:5px}.vp-sourcecard p{font-size:10px;line-height:1.5;color:#69778a;margin:0}
        .vp-main{min-width:0;padding:20px 24px 38px;overflow:auto}.vp-workbar{display:flex;align-items:center;gap:10px;margin:0 auto 15px;max-width:1080px}.vp-back{width:27px;height:27px;border:1px solid var(--line);background:#f9f8f4;border-radius:3px;display:grid;place-items:center;color:#526178;cursor:pointer}.vp-worktitle{font-size:12px;font-weight:600}.vp-workmeta{font-size:10px;color:#788699;margin-left:4px}.vp-canvas-tools{margin-left:auto;display:flex;gap:7px}.vp-stage{max-width:1080px;margin:auto;background:#fff;box-shadow:0 12px 40px #10295712;border:1px solid #d9dfe4;position:relative}
        .vp-stagehead{height:35px;border-bottom:1px solid #e6e8e9;background:#fcfbf8;padding:0 13px;display:flex;align-items:center;justify-content:space-between;color:#738095;font-size:9px;letter-spacing:.08em;text-transform:uppercase}.vp-stagehead span{display:flex;align-items:center;gap:6px}.vp-stagehead svg{width:12px;height:12px}
        .vp-public{font-family:var(--app-font-sans);color:#102957;overflow:hidden}.vp-publicheader{height:51px;padding:0 34px;display:flex;align-items:center;border-bottom:1px solid #e7e9ed;gap:38px}.vp-wordmark{font:700 14px var(--app-font-display);letter-spacing:-.06em;white-space:nowrap}.vp-wordmark i{color:#e44d91;font-style:normal}.vp-publicnav{display:flex;gap:23px;font-size:9px;color:#475773}.vp-publicnav span:last-child{margin-left:auto}.vp-publicnav{flex:1}
        .vp-hero{padding:47px 6.2% 38px;display:grid;grid-template-columns:1fr .9fr;align-items:center;gap:24px;position:relative;cursor:pointer;border:2px solid transparent}.vp-hero.selected,.vp-block.selected{border-color:#e44d91}.vp-overline{font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:#758196;font-weight:600}.vp-herotext h1{font:600 clamp(27px,3.5vw,44px)/.99 var(--app-font-display);letter-spacing:-.075em;margin:15px 0 14px;max-width:435px}.vp-herotext p{font-size:11px;line-height:1.6;color:#607088;max-width:355px;margin:0 0 20px}.vp-cta{display:inline-flex;align-items:center;gap:18px;background:#e44d91;color:white;text-decoration:none;padding:11px 14px;font-size:9px;font-weight:600}.vp-cta svg{width:13px;height:13px}.vp-heroimage{height:188px;position:relative;overflow:hidden;clip-path:polygon(5% 0,100% 5%,95% 100%,0 92%)}.vp-heroimage img{width:100%;height:100%;object-fit:cover;filter:saturate(.8)}.vp-imagebadge{position:absolute;right:8px;bottom:9px;background:#102957dc;color:white;padding:6px 8px;font-size:8px;letter-spacing:.05em}
        .vp-proof{border-block:1px solid #102957;display:grid;grid-template-columns:repeat(4,1fr);margin:0 5.5%;cursor:pointer}.vp-proof div{padding:12px 11px;border-right:1px solid #d4dbe2;font-size:9px;line-height:1.4;font-weight:600}.vp-proof div:last-child{border:0}
        .vp-section{padding:33px 6.2% 35px;position:relative;border:2px solid transparent;cursor:pointer}.vp-sectionhead{display:flex;align-items:end;justify-content:space-between;margin-bottom:16px}.vp-section h2{font:600 24px/.98 var(--app-font-display);letter-spacing:-.07em;margin:7px 0 0;max-width:340px}.vp-sectionhead small{font-size:8px;color:#7b8798}.vp-industrygrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.vp-industry{height:106px;position:relative;overflow:hidden;color:white;cursor:pointer}.vp-industry img{width:100%;height:100%;object-fit:cover;filter:brightness(.68) saturate(.8);transition:transform .3s}.vp-industry:hover img{transform:scale(1.04)}.vp-industryname{position:absolute;left:11px;bottom:10px;font-size:11px;font-weight:600}.vp-industryname small{display:block;font-size:8px;font-weight:400;margin-top:3px;color:#e2e6ed}.vp-sourcehint{display:flex;align-items:center;gap:7px;font-size:8px;color:#718095;margin-top:10px}.vp-sourcehint svg{width:11px;height:11px}
        .vp-footer{height:25px;background:#102957;color:#fff;font-size:8px;letter-spacing:.08em;padding:7px 6.2%;display:flex;justify-content:space-between}
        .vp-selection{position:absolute;z-index:3;top:12px;left:12px;background:#102957;color:#fff;border-radius:2px;padding:5px 7px;font-size:8px;letter-spacing:.06em;display:flex;align-items:center;gap:5px}.vp-selection svg{width:11px;height:11px}
        .vp-below{max-width:1080px;margin:17px auto 0;display:grid;grid-template-columns:1fr 255px;gap:14px}.vp-checks,.vp-flow{border:1px solid #d8dde1;background:#f8f7f3;padding:13px 15px}.vp-checkhead{display:flex;justify-content:space-between;align-items:center}.vp-checkhead h3{font:600 11px var(--app-font-sans);margin:0}.vp-checkcount{font-size:9px;color:#b45950}.vp-checkrow{display:flex;align-items:center;gap:8px;padding-top:11px;font-size:9px;color:#53647a}.vp-checkrow svg{width:14px;height:14px;color:#c36b56;flex:none}.vp-checkrow button{margin-left:auto;border:0;background:none;color:#b04c69;text-decoration:underline;font-size:9px;cursor:pointer}.vp-flow{display:flex;flex-direction:column;gap:8px}.vp-flowtop{display:flex;align-items:center;justify-content:space-between}.vp-flow h3{margin:0;font-size:10px}.vp-flowline{display:flex;align-items:center;gap:7px;font-size:8px;color:#68788d}.vp-step{display:flex;align-items:center;gap:5px}.vp-step i{width:14px;height:14px;border-radius:50%;border:1px solid #bcc5cd;display:grid;place-items:center;font-style:normal;font-size:7px}.vp-step.done i{background:#527f77;color:white;border-color:#527f77}.vp-step.current{color:#102957;font-weight:600}
        .vp-inspector{position:fixed;right:18px;top:74px;bottom:18px;width:300px;z-index:10;background:#fbfaf7;border:1px solid #d3d8de;box-shadow:0 12px 34px #10295722;padding:18px;display:flex;flex-direction:column;gap:15px;animation:vp-in .2s ease-out;overflow:auto}.vp-inspectorhead{display:flex;align-items:flex-start;justify-content:space-between}.vp-inspectorhead small{font-size:8px;text-transform:uppercase;letter-spacing:.13em;color:#7b8798}.vp-inspector h3{font:600 18px var(--app-font-display);letter-spacing:-.05em;margin:5px 0}.vp-close{border:0;background:none;color:#6f7c8e;cursor:pointer}.vp-close svg{width:17px}.vp-meta{display:flex;gap:6px}.vp-pill{font-size:8px;text-transform:uppercase;letter-spacing:.08em;padding:5px 7px;background:#edece6;color:#66758a}.vp-pill.blocked{background:#f7e9e4;color:#a75347}.vp-field label{display:block;font-size:9px;color:#748197;margin-bottom:6px}.vp-field textarea,.vp-field input{width:100%;border:1px solid #cfd6dd;background:#fff;padding:10px;color:#102957;font:500 12px var(--app-font-sans);resize:vertical;outline-color:#e44d91}.vp-field textarea{min-height:88px;line-height:1.45}.vp-helper{font-size:9px;color:#78869a;line-height:1.55}.vp-inspector-rule{height:1px;background:#e0e3e5}.vp-source{padding:10px;background:#f0f0eb;font-size:9px;line-height:1.55;color:#5d6c80}.vp-source strong{display:block;color:#102957;margin-bottom:3px}.vp-inspector-actions{margin-top:auto;display:flex;gap:7px;flex-wrap:wrap}.vp-inspector-actions .vp-button{font-size:9px;padding:8px 9px;color:#102957;border-color:#c8d0d8}.vp-inspector-actions .vp-button.primary{background:#102957;color:#fff;border-color:#102957}
        .vp-drawer{position:fixed;inset:0;z-index:20;background:#10295736;display:flex;justify-content:flex-end}.vp-drawerpanel{width:min(385px,100%);background:#f8f7f3;height:100%;padding:23px;box-shadow:-12px 0 36px #10295720;animation:vp-in .2s ease-out;display:flex;flex-direction:column;gap:15px}.vp-drawerhead{display:flex;justify-content:space-between;align-items:start}.vp-drawerhead h2{font:600 22px var(--app-font-display);margin:4px 0;letter-spacing:-.06em}.vp-issue{border:1px solid #d8dfe3;background:white;padding:13px;display:flex;gap:10px}.vp-issue>svg{color:#c16d52;width:16px;flex:none}.vp-issue strong{font-size:10px}.vp-issue p{font-size:9px;color:#68788d;line-height:1.5;margin:5px 0}.vp-issue button{border:0;background:none;color:#b04c69;padding:0;font-size:9px;text-decoration:underline;cursor:pointer}.vp-releasecard{border:1px solid #d8dfe3;background:white;padding:14px}.vp-releasecard h3{font-size:11px;margin:0 0 8px}.vp-releasecard p{font-size:9px;color:#69788b;line-height:1.5;margin:0}.vp-scopes{display:flex;gap:6px;margin-top:11px}.vp-scopes span{padding:5px 7px;background:#eeede7;font-size:8px;color:#65748a}.vp-separate{margin-top:auto;border-top:1px solid #d9dfe2;padding-top:13px;font-size:9px;color:#69788b;line-height:1.5}.vp-notice{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#102957;color:#fff;padding:10px 15px;font-size:10px;z-index:40;box-shadow:0 5px 20px #10295730;animation:vp-in .2s ease-out}
        @keyframes vp-in{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}
        @media(max-width:860px){.vp-work{grid-template-columns:60px minmax(0,1fr)}.vp-rail{padding:18px 7px}.vp-rail-label,.vp-nav button span,.vp-outlineitem:not(.active),.vp-sourcecard{display:none}.vp-nav button{justify-content:center}.vp-pageoutline{padding-top:10px}.vp-outlineitem.active{font-size:0;justify-content:center}.vp-main{padding:16px 12px 30px}.vp-below{grid-template-columns:1fr}.vp-inspector{right:8px;top:68px;bottom:8px;width:min(300px,calc(100vw - 76px))}}
        @media(max-width:600px){.vp-top{padding:0 12px;gap:10px}.vp-crumb{display:none}.vp-topright{gap:6px}.vp-edition{font-size:9px;padding:6px}.vp-top .vp-button{padding:7px;font-size:0}.vp-top .vp-button svg{width:15px;height:15px}.vp-draft{display:none}.vp-work{grid-template-columns:1fr}.vp-rail{display:none}.vp-workbar{flex-wrap:wrap}.vp-workmeta{display:none}.vp-canvas-tools .vp-button{padding:7px 8px;font-size:9px}.vp-hero{grid-template-columns:1fr;padding:35px 7% 22px;gap:20px}.vp-heroimage{height:145px}.vp-herotext h1{font-size:34px}.vp-publicheader{padding:0 15px;gap:15px}.vp-publicnav{gap:9px;font-size:8px}.vp-publicnav span:nth-child(2),.vp-publicnav span:nth-child(3){display:none}.vp-proof{grid-template-columns:repeat(2,1fr)}.vp-proof div:nth-child(2){border-right:0}.vp-proof div:nth-child(-n+2){border-bottom:1px solid #d4dbe2}.vp-section{padding:25px 6%}.vp-section h2{font-size:20px}.vp-industrygrid{grid-template-columns:1fr;gap:7px}.vp-industry{height:92px}.vp-sectionhead small{max-width:100px;text-align:right}.vp-main{padding:12px 8px 25px}.vp-below{margin-top:10px}.vp-stagehead{padding:0 8px;font-size:8px}.vp-footer{padding-inline:6%;font-size:7px}}
      `}</style>

      <header className="vp-top">
        <div className="vp-brand">cognirise <i>pulse</i></div><div className="vp-divider" />
        <div className="vp-crumb">Editorial workspace <ChevronRight size={13} /> Homepage</div>
        <div className="vp-topright">
          <div className="vp-edition">UAE <span style={{opacity:.5}}>·</span> English <ChevronDown size={12}/></div>
          <span className="vp-draft">{saved ? "Local preview saved" : "Draft · local preview"}</span>
          <button className="vp-button" onClick={() => announce("Opening the saved UAE / English buyer preview.")}><Eye/> Preview</button>
          <button className="vp-button vp-button-light" onClick={() => { setSaved(true); announce("Draft preview updated locally. Nothing has been persisted."); }}><Save/> Save draft</button>
          <button className="vp-button" onClick={() => setDrawer("release")}><ArrowUpRight/> Release center</button>
        </div>
      </header>

      <div className="vp-work">
        <aside className="vp-rail">
          <div>
            <div className="vp-rail-label">Workspace</div>
            <nav className="vp-nav">
              <button className="active"><Layers3/><span>Pages</span></button>
              <button onClick={() => announce("Reusable Industry records are managed in the Industries library.")}><FileText/><span>Content records</span></button>
              <button onClick={() => announce("Site Configuration owns the homepage hero film.")}><Settings2/><span>Site configuration</span></button>
            </nav>
          </div>
          <div className="vp-pageoutline">
            <div className="vp-rail-label">Homepage · composition</div>
            {([["01","Hero"],["02","Proof ledger"],["03","Industries"],["04","What we do"]] as const).map(([n,label],i) => {
              const key: Section[] = ["hero","proof","industries","services"];
              return <button key={n} onClick={() => choose(key[i])} className={`vp-outlineitem ${selected===key[i]?"active":""}`}><b>{n}</b>{label}</button>;
            })}
          </div>
          <div className="vp-sourcecard"><strong>Presentation is code-owned</strong><p>The homepage layout, section order and hero film slot are fixed. This editor changes approved content sources—not the site renderer.</p></div>
        </aside>

        <main className="vp-main">
          <div className="vp-workbar">
            <button className="vp-back" onClick={() => announce("Homepage workspace")}><ChevronLeft size={15}/></button>
            <strong className="vp-worktitle">Homepage</strong><span className="vp-workmeta">/ UAE · English · exact edition</span>
            <div className="vp-canvas-tools">
              <button className="vp-button" style={{color:"#53647a",borderColor:"#d1d7dc"}} onClick={() => announce("No saved revision changes to undo in this prototype.")}><RotateCcw/> Undo</button>
              <button className="vp-button" style={{color:"#53647a",borderColor:"#d1d7dc"}} onClick={() => setDrawer("issues")}><CircleAlert/> 3 checks</button>
            </div>
          </div>

          <div className="vp-stage">
            <div className="vp-stagehead"><span><Eye/> Buyer view · proposed content, current fixed layout</span><span>cognirise.com/ae <ExternalLink/></span></div>
            <div className="vp-public">
              <header className="vp-publicheader">
                <div className="vp-wordmark">cognirise <i>pulse</i></div>
                <nav className="vp-publicnav"><span>What we do</span><span>Industries</span><span>Our thinking</span><span>About</span><span>Get in touch ↗</span></nav>
              </header>
              <section className={`vp-hero vp-block ${selected==="hero"?"selected":""}`} onClick={() => choose("hero")}>
                {selected==="hero" && <div className="vp-selection"><Sparkles/> HERO · EDITABLE SLOT</div>}
                <div className="vp-herotext">
                  <div className="vp-overline">Enterprise transformation, made real</div>
                  {editing ? <textarea autoFocus value={headline} onClick={e=>e.stopPropagation()} onChange={e=>{setHeadline(e.target.value);setSaved(false);}} onBlur={()=>setEditing(false)} /> :
                    <h1 onDoubleClick={e=>{e.stopPropagation();setEditing(true);}} title="Double-click to edit locally">{headline}</h1>}
                  <p>We turn complex ambition into working systems—with your people, your data and your teams in control.</p>
                  <a className="vp-cta" href="#value" onClick={e=>{e.preventDefault();announce("CTA label and destination are homepage content fields.");}}>Explore what’s possible <ArrowUpRight/></a>
                </div>
                <div className="vp-heroimage" onClick={e=>{e.stopPropagation();choose("hero");setNotice("Hero film source: Site Configuration · Homepage hero film.");window.setTimeout(()=>setNotice(""),2800);}}>
                  <img src="/__mockup/images/cognirise-pulse-people.jpg" alt="Cognirise team working through an operating model" />
                  <div className="vp-imagebadge">HERO FILM · SITE CONFIGURATION</div>
                </div>
              </section>
              <div className={`vp-proof vp-block ${selected==="proof"?"selected":""}`} onClick={()=>choose("proof")}>
                <div>No long pilots. Prototype in 48 hours.</div><div>We don’t bill mandays. We deliver outcomes.</div><div>We build working solutions, not PowerPoints.</div><div>No vendor lock-in. You own the platform.</div>
              </div>
              <section className={`vp-section vp-block ${selected==="industries"?"selected":""}`} onClick={()=>choose("industries")}>
                {selected==="industries" && <div className="vp-selection"><Sparkles/> INDUSTRIES · EDITOR-OWNED HEADING</div>}
                <div className="vp-sectionhead"><div><div className="vp-overline">Applied expertise</div><h2>Built on expertise.</h2></div><small>Cards link to independent Industry records ↗</small></div>
                <div className="vp-industrygrid">
                  {industries.map((industry) => <div className="vp-industry" key={industry.name} onClick={e=>{e.stopPropagation();announce(`${industry.name} opens the published Industry record. Card title and image are not duplicated here.`);}}>
                    <img src={industry.image} alt="Abstract Cognirise Pulse editorial image"/>
                    <div className="vp-industryname">{industry.name}<small>{industry.tag}</small></div>
                  </div>)}
                </div>
                <div className="vp-sourcehint"><Layers3/> 6 published Industry records · current homepage selection 3 shown · click a card to open its source record</div>
              </section>
              <section className={`vp-section vp-block ${selected==="services"?"selected":""}`} style={{paddingTop:13,paddingBottom:18}} onClick={()=>choose("services")}>
                {selected==="services" && <div className="vp-selection"><Sparkles/> SERVICE TILES · SERVICE-LINE RECORDS</div>}
                <div className="vp-sectionhead"><div><div className="vp-overline">What we do</div><h2>Strategy, engineering and platform.</h2></div><small>Tile content from service-line records</small></div>
              </section>
              <div className="vp-footer"><span>COGNIRISE PULSE · UAE / ENGLISH</span><span>Code-owned footer · not editable here</span></div>
            </div>
          </div>

          <div className="vp-below">
            <section className="vp-checks">
              <div className="vp-checkhead"><h3>Page checks <span style={{color:"#7d8997",fontWeight:400}}>· exact field, grouped by section</span></h3><span className="vp-checkcount">2 blockers · 1 review gate</span></div>
              <div className="vp-checkrow"><CircleAlert/><span><b>Hero / film</b> — example: required media is unavailable.</span><button onClick={()=>{choose("hero");setDrawer("issues");}}>View remedy</button></div>
              <div className="vp-checkrow"><CircleAlert/><span><b>Industries / record 06</b> — source card image is missing.</span><button onClick={()=>{choose("industries");setDrawer("issues");}}>View field</button></div>
              <div className="vp-checkrow"><ShieldCheck/><span><b>Independent review</b> — no reviewer approval for this draft.</span><button onClick={()=>setDrawer("release")}>Workflow</button></div>
            </section>
            <section className="vp-flow">
              <div className="vp-flowtop"><h3>Release path</h3><button onClick={()=>setDrawer("release")} style={{border:0,background:"none",fontSize:9,color:"#b04c69",cursor:"pointer"}}>Details ↗</button></div>
              <div className="vp-flowline"><span className="vp-step current"><i>1</i> Draft</span><ChevronRight size={11}/><span className="vp-step"><i>2</i> Review</span><ChevronRight size={11}/><span className="vp-step"><i>3</i> Edition</span></div>
              <div className="vp-helper">Release Center publication is a separate scoped step.</div>
            </section>
          </div>
        </main>
      </div>

      {selected && <aside className="vp-inspector">
        <div className="vp-inspectorhead"><div><small>Selected on page · {selected==="hero"?"Hero":selected==="industries"?"Industry group":selected==="proof"?"Proof ledger":"Service tiles"}</small><h3>{selected==="hero"?"Opening statement":selected==="industries"?"Industry group":selected==="proof"?"Proof ledger":"Service tiles"}</h3></div><button className="vp-close" onClick={()=>setSelected("hero")} aria-label="Close inspector"><X/></button></div>
        <div className="vp-meta"><span className="vp-pill">UAE · English</span><span className="vp-pill blocked">Draft · blocked</span></div>
        {selected==="hero" ? <>
          <div className="vp-field"><label>Hero headline · homepage content slot</label><textarea value={headline} onChange={e=>{setHeadline(e.target.value);setSaved(false);}} /></div>
          <div className="vp-helper">This is the text buyers see. Double-click the headline on the page or edit here. Changes are local to this prototype.</div>
          <div className="vp-field"><label>Hero film · Site Configuration record</label><div className="vp-source"><strong>Source: Site Configuration → Homepage hero film</strong>Presented in a code-owned hero slot. Not a field on this homepage draft.</div></div>
          <div className="vp-issue"><CircleAlert/><div><strong>Example media blocker</strong><p>If required media is missing or unavailable for UAE / English, release stays blocked until its reference is resolved.</p></div></div>
          <button className="vp-button" style={{alignSelf:"flex-start",color:"#102957",borderColor:"#c8d0d8"}} onClick={()=>announce("Choose an authorized replacement in Site Configuration, or request independent media review.")}><ImageIcon/> Replace media / request review</button>
          <div className="vp-inspector-rule"/>
          <div className="vp-source"><strong>Presentation · code-owned</strong>Hero proportions, film placement, typography and CTA layout are fixed by the homepage renderer.</div>
        </> : selected==="industries" ? <>
          <div className="vp-field"><label>Section heading · homepage content</label><input defaultValue="Built on expertise." onChange={()=>setSaved(false)}/></div>
          <div className="vp-helper">The heading belongs to this homepage. Industry card titles and imagery belong to published Industry records.</div>
          <div className="vp-field"><label>Selection method</label><div style={{display:"flex",gap:7}}><button className={`vp-button ${industryMode==="manual"?"primary":""}`} onClick={()=>setIndustryMode("manual")}>Manual</button><button className={`vp-button ${industryMode==="automatic"?"primary":""}`} onClick={()=>setIndustryMode("automatic")}>Automatic</button></div></div>
          <div className="vp-source"><strong>{industryMode==="manual"?"3 selected · 6 published records":"Automatic · 6 published records"}</strong>{industryMode==="manual"?"Reorder selected records for this page. The source records remain independent.":"Selection rule: published records, ordered by featured rank. Count can be adjusted."}</div>
          {industries.map((item,i)=><div key={item.name} style={{display:"flex",alignItems:"center",gap:8,border:"1px solid #d8dde2",background:"#fff",padding:"8px",fontSize:9}}>
            <span style={{color:"#9aa4b0"}}>{String(i+1).padStart(2,"0")}</span><strong style={{flex:1}}>{item.name}</strong><button aria-label={`Move ${item.name} up`} onClick={()=>announce(`${item.name} reorder previewed locally.`)} style={{border:0,background:"none",cursor:"pointer",color:"#67778b"}}><ArrowUp size={13}/></button><button aria-label={`Move ${item.name} down`} onClick={()=>announce(`${item.name} reorder previewed locally.`)} style={{border:0,background:"none",cursor:"pointer",color:"#67778b"}}><ArrowDown size={13}/></button><button aria-label={`Open ${item.name} source record`} onClick={()=>announce(`Opening published Industry record: ${item.name}.`)} style={{border:0,background:"none",cursor:"pointer",color:"#b04c69"}}><ArrowUpRight size={13}/></button>
          </div>)}
          <div className="vp-issue"><CircleAlert/><div><strong>Industry record 06 · image missing</strong><p>Replace the image on the authorized Industry record or request media review. The card remains blocked.</p></div></div>
          <div className="vp-inspector-rule"/><div className="vp-source"><strong>Presentation · code-owned</strong>Card layout and responsive grid are fixed by the homepage renderer.</div>
        </> : <>
          <div className="vp-helper">This section appears in the current buyer view. Content is sourced from governed homepage slots and reusable records.</div>
          <div className="vp-source"><strong>{selected==="proof"?"Proof ledger · homepage content slots":"Service tiles · Service-line records"}</strong>{selected==="proof"?"Four statements are editable homepage text. This layout is code-owned.":"Tile names and destinations are managed on the corresponding service-line records."}</div>
          <div className="vp-inspector-rule"/><div className="vp-source"><strong>Source ownership</strong>Preview presents approved content in the existing site composition. It does not create a new block collection or change the renderer.</div>
        </>}
        <div className="vp-inspector-actions">
          <button className="vp-button primary" onClick={()=>{setSaved(true);announce("Local draft preview updated. No backend persistence.");}}><Save/> Save draft preview</button>
          <button className="vp-button" onClick={()=>setDrawer("issues")}><CircleAlert/> Checks</button>
        </div>
      </aside>}

      {drawer && <div className="vp-drawer" onClick={()=>setDrawer(null)}>
        <section className="vp-drawerpanel" onClick={e=>e.stopPropagation()}>
          <div className="vp-drawerhead"><div><small className="vp-rail-label" style={{padding:0}}>UAE · English edition</small><h2>{drawer==="issues"?"Section checks":"Review & release"}</h2></div><button className="vp-close" onClick={()=>setDrawer(null)} aria-label="Close panel"><X/></button></div>
          {drawer==="issues" ? <>
            <div className="vp-helper">Checks are attached to the visible section and exact content source. No top-level blocker pile.</div>
            <div className="vp-issue"><CircleAlert/><div><strong>Hero / Site Configuration → Homepage hero film</strong><p>Film media has no UAE / English approval. A reviewer has not cleared this asset.</p><button onClick={()=>{setDrawer(null);choose("hero");}}>Open hero source context</button><p>Remedy: replace media if authorized, or request media review. Approval is never automatic.</p></div></div>
            <div className="vp-issue"><CircleAlert/><div><strong>Industries / Industry record 06 → image</strong><p>Image reference is missing from the published Industry record.</p><button onClick={()=>{setDrawer(null);choose("industries");}}>Open industry group</button><p>Remedy: update the authorized Industry record or request review for replacement media.</p></div></div>
            <div className="vp-issue"><ShieldCheck/><div><strong>Workflow / Independent reviewer</strong><p>This draft has not been reviewed. The content owner cannot approve their own work.</p><button onClick={()=>setDrawer("release")}>See separate review path</button></div></div>
          </> : <>
            <div className="vp-releasecard"><h3>1 · Save draft</h3><p>Captures the exact UAE / English draft before it can enter independent review. Current prototype state is local only.</p></div>
            <div className="vp-releasecard"><h3>2 · Independent review</h3><p>A separate reviewer checks this exact edition. No self-approval and no one-click publish.</p><button className="vp-button" style={{marginTop:10,color:"#102957",borderColor:"#c8d0d8"}} onClick={()=>announce("Review request shown as a prototype action; no request was sent.")}><Send/> Request review</button></div>
            <div className="vp-releasecard"><h3>3 · Edition publication</h3><p>After approval, publish this reviewed revision to the UAE / English edition.</p><div className="vp-scopes"><span>Market: UAE</span><span>Locale: English</span></div></div>
            <div className="vp-releasecard"><h3>4 · Release Center</h3><p>Separate, explicitly scoped site release. Edition publication does not silently publish unrelated markets or content.</p><button className="vp-button" style={{marginTop:10,color:"#102957",borderColor:"#c8d0d8"}} onClick={()=>announce("Release Center action is separate and unavailable until approval and edition publication.")}><ArrowUpRight/> Review release scope</button></div>
            <div className="vp-separate">Media blockers must be resolved by replacing authorized media or requesting media review. Neither draft save nor review request grants media approval.</div>
          </>}
        </section>
      </div>}
      {notice && <div className="vp-notice" role="status">{notice}</div>}
    </div>
  );
}