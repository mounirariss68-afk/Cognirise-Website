import { Link } from "wouter";
import { ArrowDown, ArrowRight, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";

export default function CogniOSPlatform() {
  const [active, setActive] = useState<number>(0);
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const layers = [
    ["06", "Experience layer", "Human and agent interactions designed for the operating context."],
    ["05", "Agent layer", "CogniAgents coordinate governed tasks, decisions and specialist actions."],
    ["04", "Knowledge layer", "CogniDocs turns enterprise knowledge into controlled, retrievable context."],
    ["03", "Intelligence layer", "Models, prompts and orchestration selected for the work at hand."],
    ["02", "Integration layer", "Connects the systems where work, data and decisions already live."],
    ["01", "Foundation layer", "Infrastructure, data and identity controls shaped around the deployment context."]
  ];

  const products = [
    ["01", "CogniTalk", "A conversational layer for meaningful work between people and enterprise intelligence."],
    ["02", "CogniAgents", "Governed agents that coordinate specialist tasks in defined operational environments."],
    ["03", "CogniDocs", "Knowledge made available with the context, access and control the work requires."],
    ["04", "CogniWare", "Composable intelligence capabilities connected to the systems that run the enterprise."]
  ];

  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="co">
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
.co{--ink:#102957;--deep:#071936;--paper:#fdfcfb;--mist:#eef1f6;--line:#cbd3e1;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}.co *{box-sizing:border-box}.co button,.co a{font:inherit;text-decoration:none;}.co :focus-visible{outline:3px solid var(--coral);outline-offset:4px}
.co-primary{border:1px solid var(--ink);cursor:pointer;color:#fff;background:var(--ink);font-weight:700;font-size:12px;padding:4px 4px 4px 17px;min-height:46px;display:inline-flex;align-items:center;gap:15px;position:relative;isolation:isolate;overflow:hidden;transition:transform .24s,box-shadow .24s}.co-primary:before{content:"";position:absolute;z-index:-2;inset:-1px;background:linear-gradient(105deg,var(--violet),var(--pink),var(--coral));opacity:0;transition:opacity .24s}.co-primary:after{content:"";position:absolute;z-index:-1;inset:1px;background:var(--ink);transition:background .24s}.co-primary svg{width:36px;height:36px;padding:10px;background:#fff;color:var(--ink);transition:transform .24s,background .24s,color .24s}.co-primary:hover{transform:translate(-3px,-3px);box-shadow:6px 6px 0 var(--coral)}.co-primary:hover:before{opacity:1}.co-primary:hover:after{background:rgba(7,25,54,.94)}.co-primary:hover svg{transform:translate(3px,-3px);background:var(--coral);color:#fff}
.co-kicker{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;display:flex;align-items:center;gap:10px}.co-kicker:before{content:"";width:23px;height:1px;background:linear-gradient(90deg,var(--violet),var(--coral))}.co-hero{padding:22px 4.8vw 0}.co-hero-grid{min-height:680px;display:grid;grid-template-columns:.84fr 1.16fr;gap:40px;align-items:end;padding-bottom:35px}.co-hero-copy{padding-bottom:17px;position:relative;z-index:2}.co h1,.co h2,.co h3{font-family:Comfortaa,sans-serif}.co h1{font-size:clamp(50px,6.35vw,100px);font-weight:600;line-height:.94;letter-spacing:-.08em;margin:31px 0 27px}.co h1 em,.co h2 em{font-style:normal;color:var(--pink)}.co-hero p{color:#42587b;font-size:16px;line-height:1.6;max-width:440px;margin:0 0 29px}.co-actions{display:flex;align-items:center;gap:18px}.co-under{border:0;border-bottom:1px solid var(--ink);background:transparent;color:var(--ink);padding:8px 0;display:inline-flex;gap:9px;align-items:center;font-size:12px;font-weight:700;cursor:pointer}.co-under:hover{color:var(--pink);border-color:var(--pink)}.co-hero-art{height:630px;overflow:hidden;position:relative;background:var(--deep);clip-path:polygon(11% 0,100% 0,100% 91%,0 100%,0 12%)}.co-hero-art img{width:100%;height:100%;object-fit:cover;animation:coIn 1.35s both}.co-hero-art:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.2),transparent 48%),linear-gradient(0deg,rgba(7,25,54,.57),transparent 32%)}.co-word{position:absolute;z-index:1;right:-11px;top:55px;color:#fff;font:600 clamp(55px,9vw,146px)/.8 Comfortaa;letter-spacing:-.1em;mix-blend-mode:overlay}.co-caption{position:absolute;z-index:2;bottom:28px;left:34px;color:#fff;font-size:10px;letter-spacing:.12em;text-transform:uppercase}.co-caption span{opacity:.72;display:block;margin-bottom:7px}.co-proof{margin:0 4.8vw;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);display:grid;grid-template-columns:repeat(4,1fr)}.co-proof div{padding:18px 20px;border-right:1px solid var(--line);font-size:12px;line-height:1.4}.co-proof div:last-child{border:0}.co-proof b{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;margin-bottom:8px;color:#687895}.co-proof strong{font-weight:600}
.co-intro{padding:145px 4.8vw 112px;display:grid;grid-template-columns:1fr 1.12fr;gap:8vw}.co-intro h2,.co-architecture h2,.co-spines h2{font-size:clamp(42px,5vw,76px);font-weight:600;line-height:.98;letter-spacing:-.08em;margin:24px 0 0}.co-intro-copy{align-self:end;border-top:1px solid var(--line);padding-top:22px;color:#30486d;font-size:20px;line-height:1.46;max-width:535px}.co-intro-copy small{font-size:14px;display:block;line-height:1.55;margin-top:22px;color:#647491}.co-wide{margin:0 4.8vw;height:min(610px,48vw);min-height:455px;position:relative;overflow:hidden;background:var(--deep)}.co-wide img{width:100%;height:100%;object-fit:cover;animation:coBreath 9s ease-in-out infinite alternate}.co-wide:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.82),transparent 72%)}.co-wide-copy{position:absolute;z-index:2;left:6%;bottom:11%;color:#fff;max-width:570px}.co-wide h2{font:600 clamp(43px,5.2vw,78px)/.97 Comfortaa;letter-spacing:-.08em;margin:17px 0}.co-wide p{font-size:15px;line-height:1.6;color:#dbe4f0;max-width:410px}
.co-architecture{padding:124px 4.8vw 80px}.co-arch-head{display:grid;grid-template-columns:1fr .9fr;gap:50px;align-items:end}.co-arch-head p{font-size:16px;line-height:1.55;color:#42587b;max-width:410px;margin:0}.co-layers{border-top:1px solid var(--ink);margin-top:63px}.co-layer{width:100%;display:grid;grid-template-columns:70px 1fr 1fr 35px;gap:20px;align-items:center;text-align:left;border:0;border-bottom:1px solid var(--line);padding:22px 9px;background:transparent;color:var(--ink);cursor:pointer;transition:padding .25s,background .25s}.co-layer:hover,.co-layer.active{padding-left:22px;background:#f0effa}.co-layer span{font-size:10px;letter-spacing:.1em;color:#687895}.co-layer h3{font-size:clamp(19px,2.3vw,31px);line-height:1.05;letter-spacing:-.06em;margin:0;font-weight:600}.co-layer p{font-size:13px;line-height:1.45;color:#536887;max-width:330px;margin:0}.co-layer svg{justify-self:end}.co-layer.active svg{color:var(--pink)}
.co-spines{padding:54px 4.8vw 122px;background:var(--mist)}.co-spines-head{border-top:1px solid var(--ink);padding-top:25px;display:flex;align-items:end;justify-content:space-between;gap:30px}.co-spines-head p{font-size:14px;line-height:1.5;max-width:300px;color:#536887}.co-spine-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:46px}.co-spine{min-height:420px;background:var(--deep);position:relative;overflow:hidden;padding:31px;color:#fff}.co-spine img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.58;transition:transform .7s}.co-spine:hover img{transform:scale(1.06)}.co-spine:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(7,25,54,.93),rgba(7,25,54,.1))}.co-spine-content{position:absolute;z-index:1;bottom:28px;left:29px;right:28px}.co-spine strong{font:600 clamp(26px,3vw,43px)/1 Comfortaa;letter-spacing:-.07em}.co-spine p{font-size:14px;line-height:1.5;max-width:390px;color:#dce4f1}.co-spine small{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px}
.co-products{padding:124px 4.8vw}.co-product-head{display:flex;justify-content:space-between;gap:40px;align-items:end;border-top:1px solid var(--ink);padding-top:25px}.co-product-head h2{font-size:clamp(41px,4.9vw,72px);line-height:.97;letter-spacing:-.08em;margin:17px 0 0;font-weight:600;max-width:680px}.co-product-head p{max-width:300px;font-size:14px;line-height:1.5;color:#536887}.co-products-list{margin-top:58px;border-top:1px solid var(--line)}.co-product{display:grid;grid-template-columns:90px 1fr 1fr 35px;align-items:center;gap:20px;border-bottom:1px solid var(--line);padding:22px 8px}.co-product span{font-size:10px;letter-spacing:.1em;color:var(--pink)}.co-product h3{margin:0;font-size:clamp(21px,2.4vw,34px);letter-spacing:-.06em}.co-product p{font-size:13px;line-height:1.5;color:#536887;max-width:380px}.co-product svg{justify-self:end;color:var(--coral)}
.co-principles{background:var(--deep);color:#fff;padding:112px 4.8vw 100px;position:relative}.co-principles:before{content:"CONTROL";position:absolute;right:-15px;top:24px;color:rgba(255,255,255,.055);font:600 17vw/.8 Comfortaa;letter-spacing:-.1em}.co-principles-inner{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:8vw}.co-principles h2{font:600 clamp(45px,5.7vw,85px)/.94 Comfortaa;letter-spacing:-.08em;margin:21px 0}.co-principles p{max-width:430px;color:#d6deed;font-size:16px;line-height:1.6}.co-principle-list{border-top:1px solid rgba(255,255,255,.36);align-self:end;margin-bottom:48px;}.co-principle-list div{padding:18px 0;border-bottom:1px solid rgba(255,255,255,.27);font:600 18px Comfortaa;letter-spacing:-.04em}.co-principle-list span{font:500 10px Inter;letter-spacing:.12em;color:#ff907b;margin-right:16px}
@keyframes coIn{from{clip-path:inset(0 100% 0 0);transform:scale(1.12)}to{clip-path:inset(0);transform:scale(1)}}@keyframes coBreath{to{transform:scale(1.075) translateX(-1%)}}@media(prefers-reduced-motion:reduce){.co *,.co *:before,.co *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
@media(max-width:760px){.co-hero{padding:33px 21px 0}.co-hero-grid{display:flex;flex-direction:column;min-height:0;gap:33px;padding-bottom:25px}.co h1{font-size:53px;margin:25px 0 22px}.co-hero-art{height:440px}.co-word{font-size:71px}.co-proof{margin:0 21px;grid-template-columns:1fr 1fr}.co-proof div{padding:16px 12px}.co-proof div:nth-child(2){border-right:0}.co-proof div:nth-child(-n+2){border-bottom:1px solid var(--line)}.co-intro{padding:84px 21px 73px;display:block}.co-intro h2,.co-architecture h2,.co-spines h2{font-size:42px}.co-intro-copy{font-size:18px;margin-top:43px}.co-wide{margin:0;height:510px;min-height:0}.co-wide-copy{left:23px;right:23px;bottom:28px}.co-wide h2{font-size:41px}.co-architecture{padding:80px 21px}.co-arch-head{display:block}.co-arch-head p{margin-top:28px}.co-layers{margin-top:41px}.co-layer{grid-template-columns:35px 1fr 24px;gap:12px;padding:20px 0}.co-layer p{display:none}.co-layer.active p{display:block;grid-column:2/4;grid-row:2;margin-top:2px}.co-layer svg{grid-column:3;grid-row:1}.co-layer h3{font-size:20px}.co-spines{padding:54px 21px 80px}.co-spines-head,.co-product-head{display:block}.co-spines-head p,.co-product-head p{margin-top:25px}.co-spine-grid{grid-template-columns:1fr;margin-top:33px}.co-spine{min-height:350px}.co-products{padding:80px 21px}.co-product-head h2{font-size:41px}.co-products-list{margin-top:40px}.co-product{grid-template-columns:46px 1fr 24px;gap:12px;padding:20px 0}.co-product p{display:none}.co-product h3{font-size:21px}.co-principles{padding:76px 21px 76px}.co-principles-inner{display:block}.co-principles h2{font-size:54px}.co-principle-list{margin-top:38px}}
      `}</style>
      <section className="co-hero">
        <div className="co-kicker">{marketLocation} / Platforms</div>
        <div className="co-hero-grid">
          <div className="co-hero-copy">
            <h1>The operating system for <em>governed intelligence.</em></h1>
            <p>CogniOS connects people, agents, knowledge and enterprise systems so AI can move consequential work—without surrendering control.</p>
            <div className="co-actions">
              <button className="co-primary" onClick={() => scroll("architecture")}>Read the architecture <ArrowRight /></button>
              <button className="co-under" onClick={() => scroll("principles")}>See the principles <ArrowDown size={15} /></button>
            </div>
          </div>
          <div className="co-hero-art">
            <img src={assetUrl("/images/cognirise/site-cognios.jpg")} alt="Six luminous architectural layers connected by a central intelligence flow." />
            <div className="co-word">system</div>
            <div className="co-caption">
              <span>CogniOS / platform overview</span>Built to make intelligence accountable
            </div>
          </div>
        </div>
      </section>
      
      <section className="co-proof" aria-label="CogniOS platform qualities">
        <div><b>Designed for</b><strong>UAE enterprise and government</strong></div>
        <div><b>Language</b><strong>People and agents, in context</strong></div>
        <div><b>Control</b><strong>Human authority remains explicit</strong></div>
        <div><b>Deployment</b><strong>Boundaries defined for the environment</strong></div>
      </section>

      <section className="co-intro">
        <div>
          <div className="co-kicker">One architecture, not another tool</div>
          <h2>AI needs a place to <em>operate.</em></h2>
        </div>
        <div className="co-intro-copy">
          CogniOS is the connective architecture for enterprise intelligence. It gives the work a governed route from data and systems through agents and knowledge, to the people making consequential decisions.
          <small>It is designed around the conditions that define the work: organisational context, visible human authority and clear operating boundaries.</small>
        </div>
      </section>

      <section className="co-wide">
        <img src={assetUrl("/images/cognirise/pulse-convergence.jpg")} alt="A luminous architectural environment where human presence and intelligent systems meet." />
        <div className="co-wide-copy">
          <div className="co-kicker">The platform in practice</div>
          <h2>Build the route.<br/>Keep the authority.</h2>
          <p>CogniOS brings the structures around intelligence into the same operating environment, rather than asking teams to govern them after the fact.</p>
        </div>
      </section>

      <section className="co-architecture" id="architecture">
        <div className="co-arch-head">
          <div>
            <div className="co-kicker">Reference architecture</div>
            <h2>Six layers.<br/>One controlled flow.</h2>
          </div>
          <p>Each layer has a distinct responsibility. Together they give teams a practical way to deploy intelligence into the work, not beside it.</p>
        </div>
        <div className="co-layers">
          {layers.map(([num, title, copy], i) => (
            <button
              className={`co-layer ${active === i ? "active" : ""}`}
              key={title}
              onClick={() => setActive(i)}
              aria-expanded={active === i}
              aria-controls={`co-layer-panel-${i}`}
            >
              <span>{num}</span>
              <h3>{title}</h3>
              <p id={`co-layer-panel-${i}`}>{copy}</p>
              {active === i ? <Minus size={18} /> : <Plus size={18} />}
            </button>
          ))}
        </div>
      </section>

      <section className="co-spines">
        <div className="co-spines-head">
          <div>
            <div className="co-kicker">Through every layer</div>
            <h2>Two spines keep the platform honest.</h2>
          </div>
          <p>They are not a review gate at the end. They run through the architecture, from first decision to live operation.</p>
        </div>
        <div className="co-spine-grid">
          <article className="co-spine">
            <img src={assetUrl("/images/cognirise/cognirise-pulse-governance.jpg")} alt="A violet route moving through a series of controlled architectural gateways." />
            <div className="co-spine-content">
              <small>Spine 01 / AI governance & assurance</small>
              <strong>Control in the flow.</strong>
              <p>Policies, approvals, traceability and assurance remain visible wherever intelligence is used.</p>
            </div>
          </article>
          <article className="co-spine">
            <img src={assetUrl("/images/cognirise/pulse-convergence.jpg")} alt="An abstract operational space showing systems converging." />
            <div className="co-spine-content">
              <small>Spine 02 / platform engineering & ops</small>
              <strong>Built to stay in motion.</strong>
              <p>Integration, observability and platform operations turn a deployment into an operating capability.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="co-products">
        <div className="co-product-head">
          <div>
            <div className="co-kicker">A connected product family</div>
            <h2>Specialist capabilities. A shared operating system.</h2>
          </div>
          <p>CogniOS is the architecture that lets each capability contribute to a governed whole.</p>
        </div>
        <div className="co-products-list">
          {products.map(([n, t, c]) => (
            <article className="co-product" key={t}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{c}</p>
              <ArrowRight size={17}/>
            </article>
          ))}
        </div>
      </section>

      <section className="co-principles" id="principles">
        <div className="co-principles-inner">
          <div>
            <div className="co-kicker">The non-negotiables</div>
            <h2>Intelligence with a clear line of <em>authority.</em></h2>
            <p>CogniOS is designed to support human decisions, not obscure them. It creates a usable platform for teams operating where context, trust and control cannot be treated as edge cases.</p>
          </div>
          <div className="flex flex-col">
            <div className="co-principle-list">
              <div><span>01</span>Context designed around the work</div>
              <div><span>02</span>Boundaries made explicit</div>
              <div><span>03</span>Human authority stays visible</div>
              <div><span>04</span>Governance travels with the work</div>
            </div>
            <div>
              <Link href="/value-scan" className="co-primary">Bring us one process <ArrowRight /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
