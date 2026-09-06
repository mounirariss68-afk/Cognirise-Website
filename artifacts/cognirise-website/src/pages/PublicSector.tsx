import { Link } from "wouter";
import { ArrowDown, ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { scrollToSection } from "@/lib/motion";

export default function PublicSector() {
  const [open, setOpen] = useState<number>(0);
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "United Arab Emirates" :
    market === "ksa" ? "Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Türkiye" :
    "Europe";

  const plays = [
    ["01", "Service journeys", "Use governed intelligence to make complex public interactions easier to navigate, without losing accountability."],
    ["02", "Knowledge at the point of work", "Bring policy, procedures and institutional knowledge into the flow of teams who need to act on it."],
    ["03", "Document-heavy operations", "Rework high-volume review and correspondence processes with human oversight designed in."],
    ["04", "Sovereign foundations", "Set deployment, data and governance boundaries before intelligence enters consequential work."]
  ];

  const go = scrollToSection;

  return (
    <main className="ps">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .ps{--ink:#102957;--deep:#071936;--paper:#fdfcfb;--soft:#eef0f5;--line:#cbd3e1;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}
        .ps *{box-sizing:border-box}
        .ps button{font:inherit}
        .ps :focus-visible{outline:3px solid var(--coral);outline-offset:4px}
        .ps h1,.ps h2,.ps h3{font-family:Comfortaa,sans-serif}
        
        .ps-primary{border:1px solid var(--ink);cursor:pointer;color:#fff;background:var(--ink);font-weight:700;font-size:12px;padding:4px 4px 4px 17px;min-height:46px;display:inline-flex;align-items:center;gap:15px;position:relative;isolation:isolate;overflow:hidden;transition:transform .24s,box-shadow .24s;text-decoration:none}
        .ps-primary:before{content:"";position:absolute;z-index:-2;inset:-1px;background:linear-gradient(105deg,var(--violet),var(--pink),var(--coral));opacity:0;transition:opacity .24s}
        .ps-primary:after{content:"";position:absolute;z-index:-1;inset:1px;background:var(--ink);transition:background .24s}
        .ps-primary svg{width:36px;height:36px;padding:10px;background:#fff;color:var(--ink);transition:transform .24s,background .24s}
        .ps-primary:hover{transform:translate(-3px,-3px);box-shadow:6px 6px 0 var(--coral)}
        .ps-primary:hover:before{opacity:1}
        .ps-primary:hover:after{background:rgba(7,25,54,.94)}
        .ps-primary:hover svg{transform:translate(3px,-3px);background:var(--coral);color:#fff}
        
        .ps-hero{padding:22px 4.8vw 0}
        .ps-kicker{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;display:flex;align-items:center;gap:10px}
        .ps-kicker:before{content:"";width:23px;height:1px;background:linear-gradient(90deg,var(--violet),var(--coral))}
        .ps-hero-grid{min-height:690px;display:grid;grid-template-columns:.83fr 1.17fr;gap:36px;align-items:end;padding-bottom:34px}
        .ps-copy{padding-bottom:16px;position:relative;z-index:1}
        .ps-copy h1{font-weight:600;font-size:clamp(49px,6.25vw,98px);line-height:.94;letter-spacing:-.075em;margin:30px 0 28px}
        .ps-copy h1 em,.ps-statement em{font-style:normal;color:var(--pink)}
        .ps-copy p{font-size:16px;line-height:1.6;color:#415779;max-width:455px;margin:0 0 30px}
        .ps-actions{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
        .ps-under{border-bottom:1px solid var(--ink);font-weight:700;display:inline-flex;gap:9px;align-items:center;background:none;border-left:none;border-right:none;border-top:none;cursor:pointer;color:var(--ink);font-size:12px;padding-bottom:2px}
        .ps-under:hover{color:var(--pink);border-color:var(--pink)}
        .ps-hero-image{height:640px;position:relative;overflow:hidden;background:var(--deep);clip-path:polygon(10% 0,100% 0,100% 91%,0 100%,0 12%)}
        .ps-hero-image img{width:100%;height:100%;object-fit:cover}
        .ps-hero-image:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.35),transparent 42%),linear-gradient(0deg,rgba(7,25,54,.55),transparent 35%)}
        .ps-word{font:600 clamp(54px,8.9vw,145px)/.8 Comfortaa,sans-serif;color:#fff;position:absolute;z-index:2;right:-10px;top:54px;letter-spacing:-.1em;mix-blend-mode:overlay}
        .ps-caption{position:absolute;z-index:2;left:34px;bottom:29px;color:#fff;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
        .ps-caption span{display:block;opacity:.75;margin-bottom:7px}
        
        .ps-proof{margin:0 4.8vw;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);display:grid;grid-template-columns:repeat(4,1fr)}
        .ps-proof div{padding:18px 20px;border-right:1px solid var(--line);font-size:12px;line-height:1.4}
        .ps-proof div:last-child{border:0}
        .ps-proof b{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;margin-bottom:8px;color:#6a7891}
        
        .ps-statement{padding:150px 4.8vw 110px;display:grid;grid-template-columns:1fr 1.15fr;gap:7vw}
        .ps-statement h2{font-weight:600;font-size:clamp(42px,5vw,78px);letter-spacing:-.075em;line-height:.98;margin:25px 0 0}
        .ps-statement-copy{align-self:end;border-top:1px solid var(--line);padding-top:22px;font-size:21px;line-height:1.44;color:#30486d;max-width:540px}
        .ps-statement-copy p{margin:0}
        .ps-statement-copy small{font-size:12px;display:block;line-height:1.55;margin-top:22px;color:#647491}
        
        .ps-cinematic{margin:0 4.8vw;height:min(650px,50vw);min-height:480px;position:relative;overflow:hidden;background:var(--deep)}
        .ps-cinematic img{width:100%;height:100%;object-fit:cover}
        .ps-cinematic:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.9),rgba(7,25,54,.1) 72%)}
        .ps-cinematic-copy{position:absolute;z-index:2;left:6%;bottom:11%;max-width:615px;color:white}
        .ps-cinematic h2{font-weight:600;font-size:clamp(43px,5.3vw,80px);letter-spacing:-.075em;line-height:.96;margin:16px 0}
        .ps-cinematic p{max-width:450px;font-size:15px;line-height:1.6;color:#dce4f0}
        .ps-mark{position:absolute;z-index:2;right:4%;top:34px;color:#fff;font-size:10px;letter-spacing:.12em;writing-mode:vertical-rl}
        
        .ps-plays{padding:125px 4.8vw}
        .ps-head{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:end}
        .ps-head h2,.ps-platform h2{font-size:clamp(42px,5vw,72px);line-height:.97;letter-spacing:-.08em;font-weight:600;margin:20px 0 0}
        .ps-lead{font-size:16px;line-height:1.55;max-width:410px;color:#42587b;margin:0}
        .ps-list{margin-top:65px;border-top:1px solid var(--ink)}
        .ps-play{width:100%;text-align:left;display:grid;grid-template-columns:72px 1fr 1fr 40px;align-items:center;gap:20px;padding:23px 8px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;transition:padding .24s,background .24s}
        .ps-play:hover,.ps-play.active{padding-left:21px;background:#f1effb}
        .ps-play span{font-size:10px;letter-spacing:.1em;color:#697a96}
        .ps-play h3{font-size:clamp(20px,2.3vw,32px);line-height:1.05;font-weight:600;letter-spacing:-.06em;margin:0}
        .ps-play p{font-size:13px;line-height:1.45;color:#536887;margin:0;max-width:320px}
        
        .ps-platform{background:var(--soft);padding:0 4.8vw 126px}
        .ps-platform-wrap{display:grid;grid-template-columns:1.1fr .9fr;min-height:590px}
        .ps-platform-copy{padding:90px 9% 60px 0}
        .ps-platform-copy p{font-size:16px;line-height:1.6;color:#3e567b;max-width:430px}
        .ps-points{margin-top:40px;border-top:1px solid var(--ink)}
        .ps-points div{padding:13px 0;border-bottom:1px solid var(--line);font-size:13px;font-weight:600}
        .ps-points span{display:inline-block;color:var(--pink);font-size:10px;letter-spacing:.1em;width:54px}
        .ps-platform-image{margin-top:-46px;overflow:hidden;clip-path:polygon(0 8%,100% 0,100% 100%,9% 92%)}
        .ps-platform-image img{width:100%;height:100%;object-fit:cover}
        
        .ps-ledger{padding:0 4.8vw 122px}
        .ps-ledger-head{padding:25px 0;border-top:1px solid var(--ink);display:flex;justify-content:space-between;align-items:end;gap:30px}
        .ps-ledger-head h2{font:600 clamp(39px,4.7vw,69px)/.97 Comfortaa,sans-serif;letter-spacing:-.08em;margin:18px 0 0;max-width:670px}
        .ps-ledger-head p{max-width:300px;font-size:14px;line-height:1.5;color:#536887}
        .ps-ledger-grid{display:grid;grid-template-columns:1.2fr .8fr;grid-template-rows:310px 310px;gap:12px;margin-top:42px}
        .ps-tile{position:relative;overflow:hidden;background:var(--deep)}
        .ps-tile:first-child{grid-row:span 2}
        .ps-tile img{width:100%;height:100%;object-fit:cover;transition:transform .7s}
        .ps-tile:hover img{transform:scale(1.06)}
        .ps-tile:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(7,25,54,.72),transparent 55%)}
        .ps-tile figcaption{position:absolute;z-index:1;left:24px;bottom:20px;color:#fff}
        .ps-tile span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.12em;opacity:.72;margin-bottom:9px}
        .ps-tile strong{font:600 clamp(19px,2.2vw,30px)/1 Comfortaa,sans-serif;letter-spacing:-.06em}
        .ps-tile:first-child strong{font-size:clamp(25px,3.4vw,48px)}
        
        .ps-start{background:var(--ink);color:#fff;padding:104px 4.8vw 128px;position:relative}
        .ps-start:before{content:"PUBLIC";position:absolute;right:-10px;bottom:-18px;font:600 17vw/.7 Comfortaa,sans-serif;letter-spacing:-.11em;color:rgba(255,255,255,.06)}
        .ps-start-inner{position:relative;z-index:1;max-width:970px}
        .ps-start h2{font-size:clamp(52px,7.5vw,113px);font-weight:600;letter-spacing:-.095em;line-height:.88;margin:26px 0}
        .ps-start h2 em{font-style:normal;color:#ff8470}
        .ps-start p{font-size:17px;line-height:1.55;max-width:510px;color:#d6deed}
        .ps-start .ps-primary{border-color:transparent;background:linear-gradient(100deg,var(--violet),var(--pink),var(--coral));margin-top:21px;font-size:13px}
        .ps-start .ps-primary:after{background:transparent}
        
        @keyframes breath{to{transform:scale(1.08) translateX(-1%)}}
        @media(prefers-reduced-motion:reduce){.ps *,.ps *:before,.ps *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
        
        @media(max-width:760px){
          .ps-hero{padding:33px 21px 0}
          .ps-hero-grid{display:flex;flex-direction:column;gap:32px;min-height:0;align-items:stretch;padding-bottom:25px}
          .ps-copy h1{font-size:53px;margin:25px 0 22px}
          .ps-hero-image{height:440px}
          .ps-word{font-size:69px}
          .ps-proof{margin:0 21px;grid-template-columns:1fr 1fr}
          .ps-proof div{padding:16px 12px}
          .ps-proof div:nth-child(2){border-right:0}
          .ps-proof div:nth-child(-n+2){border-bottom:1px solid var(--line)}
          .ps-statement{padding:86px 21px 73px;display:block}
          .ps-statement h2{font-size:42px}
          .ps-statement-copy{font-size:18px;margin-top:43px}
          .ps-cinematic{margin:0;height:520px;min-height:0}
          .ps-cinematic-copy{left:23px;right:23px;bottom:28px}
          .ps-cinematic h2{font-size:42px}
          .ps-plays{padding:82px 21px}
          .ps-head{display:block}
          .ps-head h2{font-size:43px}
          .ps-lead{margin-top:29px}
          .ps-list{margin-top:42px}
          .ps-play{grid-template-columns:35px 1fr 25px;gap:12px;padding:20px 0}
          .ps-play p{display:none}
          .ps-play h3{font-size:21px}
          .ps-platform{padding:0 21px 80px}
          .ps-platform-wrap{display:flex;flex-direction:column;min-height:0}
          .ps-platform-copy{padding:76px 0 42px}
          .ps-platform h2{font-size:43px}
          .ps-platform-image{height:390px;margin:0}
          .ps-ledger{padding:0 21px 82px}
          .ps-ledger-head{display:block}
          .ps-ledger-head h2{font-size:41px}
          .ps-ledger-grid{grid-template-columns:1fr;grid-template-rows:350px 240px 240px;gap:10px;margin-top:32px}
          .ps-tile:first-child{grid-row:auto}
          .ps-start{padding:77px 21px 122px}
          .ps-start h2{font-size:58px}
        }
      `}</style>

      <section className="ps-hero">
        <div className="ps-kicker">{marketLocation} / Government & public sector</div>
        <div className="ps-hero-grid">
          <div className="ps-copy">
            <h1>Public value needs <em>accountable</em> intelligence.</h1>
            <p>For public-sector work where every decision carries weight: intelligence that is governed, grounded in context and built to serve the people behind the process.</p>
            <div className="ps-actions">
              <Link href="/value-scan" className="ps-primary">
                Bring us one process <ArrowRight />
              </Link>
              <button className="ps-under" onClick={() => go("plays")}>
                Explore public-sector plays <ArrowDown size={15} />
              </button>
            </div>
          </div>
          <div className="ps-hero-image">
            <img src={assetUrl("/images/cognirise/site-government.jpg")} alt="Architectural public space with a luminous route moving through it." />
            <div className="ps-word">public</div>
            <div className="ps-caption">
              <span>01 / public value</span>
              Intelligence with a mandate
            </div>
          </div>
        </div>
      </section>

      <section className="ps-proof" aria-label="Public sector delivery principles">
        <div><b>Built for</b><strong>Consequential public work</strong></div>
        <div><b>Deployment</b><strong>Chosen against the mandate</strong></div>
        <div><b>Context</b><strong>Public work and local realities</strong></div>
        <div><b>Model</b><strong>Forward-deployed people + agents</strong></div>
      </section>

      <section className="ps-statement">
        <div>
          <div className="ps-kicker">The public standard</div>
          <h2>Trust is not an output.<br />It is the <em>operating condition.</em></h2>
        </div>
        <div className="ps-statement-copy">
          <p>Public-sector intelligence has to work inside real mandates, systems and oversight. The route is not to add another layer of technology. It is to make controls, judgment and delivery part of the same work.</p>
          <small>We start with the process under pressure—then shape the architecture, governance and delivery approach around its public value.</small>
        </div>
      </section>

      <section className="ps-cinematic">
        <img src={assetUrl("/images/cognirise/cognirise-pulse-governance.jpg")} alt="A violet route moving through a sequence of formal architectural gateways." />
        <div className="ps-cinematic-copy">
          <div className="ps-kicker">Boundaries by design</div>
          <h2>Control stays in the route.</h2>
          <p>We make deployment constraints visible before a route is chosen, so the operating environment—not an abstract model—sets the boundaries.</p>
        </div>
        <div className="ps-mark">02 / governed flow</div>
      </section>

      <section className="ps-plays" id="plays">
        <div className="ps-head">
          <div>
            <div className="ps-kicker">Where the work begins</div>
            <h2>Bring intelligence to the public work that cannot wait.</h2>
          </div>
          <p className="ps-lead">No generic transformation theatre. Start with a service, decision or operation where clarity, pace and accountability need to move together.</p>
        </div>
        <div className="ps-list">
          {plays.map(([number, title, copy], i) => (
            <button className={`ps-play ${open === i ? "active" : ""}`} onClick={() => setOpen(i)} key={title}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
              <Plus size={18} />
            </button>
          ))}
        </div>
      </section>

      <section className="ps-platform" id="platform">
        <div className="ps-platform-wrap">
          <div className="ps-platform-copy">
            <div className="ps-kicker">The operating layer</div>
            <h2>One place to hold the context, controls and work.</h2>
            <p>CogniOS brings the pieces into a governed operating environment: people stay responsible, and agents work within the boundaries you define.</p>
            <div className="ps-points">
              <div><span>01</span>Design around local operating realities</div>
              <div><span>02</span>Keep governance close to execution</div>
              <div><span>03</span>Work across complex knowledge environments</div>
            </div>
          </div>
          <div className="ps-platform-image">
            <img src={assetUrl("/images/cognirise/site-cognios.jpg")} alt="Layered transparent intelligence architecture held in a light architectural chamber." />
          </div>
        </div>
      </section>

      <section className="ps-ledger">
        <div className="ps-ledger-head">
          <div>
            <div className="ps-kicker">A delivery model with proximity</div>
            <h2>Forward-deployed where the public work happens.</h2>
          </div>
          <p>Our teams enter the work with the people accountable for it—turning constraints into design inputs, not late-stage blockers.</p>
        </div>
        <div className="ps-ledger-grid">
          <figure className="ps-tile">
            <img src={assetUrl("/images/cognirise/site-government.jpg")} alt="Public architecture framed by flowing intelligence." />
            <figcaption>
              <span>01 / proximity</span>
              <strong>Work beside the decision.</strong>
            </figcaption>
          </figure>
          <figure className="ps-tile">
            <img src={assetUrl("/images/cognirise/cognirise-pulse-governance.jpg")} alt="A governed route flowing through gateways." />
            <figcaption>
              <span>02 / assurance</span>
              <strong>Design the controls in.</strong>
            </figcaption>
          </figure>
          <figure className="ps-tile">
            <img src={assetUrl("/images/cognirise/site-cognios.jpg")} alt="A layered intelligence system." />
            <figcaption>
              <span>03 / foundation</span>
              <strong>Make context usable.</strong>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="ps-start" id="start">
        <div className="ps-start-inner">
          <div className="ps-kicker">The first move</div>
          <h2>Bring one process.<br /><em>Keep the mandate.</em></h2>
          <p>Start with a process where public value, complexity and urgency have already converged. In a focused working session, we will surface the operating constraints and a practical route to a governed build.</p>
          <Link href="/value-scan" className="ps-primary">
            Start a working session <ArrowRight />
          </Link>
        </div>
      </section>
    </main>
  );
}
