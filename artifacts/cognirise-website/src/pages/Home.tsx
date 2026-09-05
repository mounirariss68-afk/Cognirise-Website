import { Link } from "wouter";
import { ArrowDown, ArrowRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";

export default function Home() {
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  return (
    <main className="cp">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .cp{--ink:#102957;--ink2:#071936;--paper:#fdfcfb;--soft:#f2f4f8;--line:#cbd3e1;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}.cp *{box-sizing:border-box}.cp button{font:inherit}.cp a{color:inherit;text-decoration:none}.cp :focus-visible{outline:3px solid var(--coral);outline-offset:4px}
        .cp-hero{padding:22px 4.8vw 0;position:relative}.cp-kicker{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;display:flex;align-items:center;gap:10px}.cp-kicker:before{content:"";width:23px;height:1px;background:linear-gradient(90deg,var(--violet),var(--coral))}.cp-hero-grid{min-height:690px;display:grid;grid-template-columns:.83fr 1.17fr;gap:36px;align-items:end;padding-bottom:34px}.cp-hero-copy{position:relative;z-index:2;padding:0 0 16px}.cp-hero h1,.cp h2,.cp h3{font-family:Comfortaa,sans-serif}.cp-hero h1{font-weight:600;font-size:clamp(48px,6.4vw,100px);line-height:.94;letter-spacing:-.075em;margin:30px 0 28px;max-width:690px}.cp-hero h1 em{font-style:normal;color:var(--pink)}.cp-hero p{font-size:16px;line-height:1.6;color:#415779;max-width:450px;margin:0 0 30px}.cp-hero-actions{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
        .cp-hero-image{height:640px;position:relative;overflow:hidden;background:#101d3b;clip-path:polygon(10% 0,100% 0,100% 91%,0 100%,0 12%)}.cp-hero-image img{width:100%;height:100%;object-fit:cover;animation:cpImage 1.4s cubic-bezier(.2,.7,.2,1) both}.cp-hero-image:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.42),transparent 35%),linear-gradient(0deg,rgba(7,25,54,.48),transparent 30%)}.cp-hero-caption{position:absolute;z-index:2;left:34px;bottom:29px;color:#fff;font-size:10px;letter-spacing:.12em;text-transform:uppercase}.cp-hero-caption span{display:block;opacity:.75;margin-bottom:7px}.cp-hero-word{font:600 clamp(58px,9.2vw,150px)/.8 Comfortaa,sans-serif;color:#fff;position:absolute;z-index:2;right:-10px;top:50px;letter-spacing:-.1em;mix-blend-mode:overlay;opacity:.87}
        .cp-proof{margin:0 4.8vw;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);display:grid;grid-template-columns:1.1fr 1fr 1fr 1fr}.cp-proof div{padding:18px 20px;border-right:1px solid var(--line);font-size:12px;line-height:1.4}.cp-proof div:last-child{border:0}.cp-proof b{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;margin-bottom:8px;color:#6a7891}.cp-proof strong{font-weight:600}
        .cp-statement{padding:150px 4.8vw 110px;display:grid;grid-template-columns:1fr 1.15fr;gap:7vw}.cp-statement h2{font-weight:600;font-size:clamp(42px,5vw,78px);letter-spacing:-.075em;line-height:.98;margin:25px 0 0}.cp-statement h2 em{font-style:normal;color:var(--coral)}.cp-statement-copy{align-self:end;border-top:1px solid var(--line);padding-top:22px;font-size:21px;line-height:1.44;color:#30486d;max-width:520px}.cp-statement-copy p{margin:0}.cp-statement-copy small{font-size:12px;display:block;line-height:1.55;margin-top:22px;color:#647491}
        .cp-break{margin:0 4.8vw;background:var(--ink2);height:min(650px,50vw);min-height:480px;position:relative;overflow:hidden}.cp-break img{width:100%;height:100%;object-fit:cover;opacity:.9;transform:scale(1.04);animation:cpBreath 8s ease-in-out infinite alternate}.cp-break:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.87),rgba(7,25,54,.08) 70%)}.cp-break-copy{position:absolute;z-index:2;left:6%;bottom:11%;max-width:610px;color:#fff}.cp-break h2{font-weight:600;font-size:clamp(43px,5.3vw,80px);letter-spacing:-.075em;line-height:.96;margin:16px 0}.cp-break p{max-width:410px;font-size:15px;line-height:1.6;color:#dce4f0}.cp-break-mark{position:absolute;z-index:2;right:4%;top:34px;color:#fff;font-size:10px;letter-spacing:.12em;writing-mode:vertical-rl}
        .cp-model{padding:125px 4.8vw}.cp-model-head{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:end}.cp-model h2{font-size:clamp(42px,5vw,72px);line-height:.97;letter-spacing:-.08em;font-weight:600;margin:20px 0 0;max-width:700px}.cp-model-lead{font-size:16px;line-height:1.55;max-width:410px;color:#42587b;margin:0}.cp-services{margin-top:65px;border-top:1px solid var(--ink)}.cp-service{width:100%;text-align:left;display:grid;grid-template-columns:72px 1fr 1fr 40px;align-items:center;gap:20px;padding:23px 8px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;transition:padding .24s,background .24s}.cp-service:hover,.cp-service.active{padding-left:21px;background:#f1effb}.cp-service span{font-size:10px;letter-spacing:.1em;color:#697a96}.cp-service h3{font-size:clamp(20px,2.3vw,32px);line-height:1.05;font-weight:600;letter-spacing:-.06em;margin:0}.cp-service p{font-size:13px;line-height:1.45;color:#536887;margin:0;max-width:300px}.cp-service svg{justify-self:end}.cp-service.active svg{color:var(--pink)}
        .cp-clarity{margin:0 4.8vw 122px;border-top:1px solid var(--ink);display:grid;grid-template-columns:1.08fr .92fr;gap:7vw;padding-top:28px}.cp-clarity h2{font-size:clamp(37px,4.4vw,65px);line-height:.98;letter-spacing:-.075em;font-weight:600;margin:18px 0 25px;max-width:720px}.cp-clarity-copy{font-size:16px;line-height:1.65;color:#405777;max-width:590px}.cp-clarity-copy strong{color:var(--ink)}.cp-outcomes{align-self:end;border-top:1px solid var(--line);padding-top:22px}.cp-outcomes-intro{font-size:14px;line-height:1.55;color:#536887;margin:0 0 24px}.cp-outcome-row{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--line)}.cp-outcome-row div{padding:16px 8px;border-right:1px solid var(--line);font:600 15px Comfortaa,sans-serif}.cp-outcome-row div:last-child{border:0}.cp-outcome-row span{display:block;font:10px Inter,sans-serif;color:var(--pink);letter-spacing:.1em;margin-bottom:7px}
        .cp-image-ledger{padding:0 4.8vw 122px}.cp-image-ledger-head{padding:25px 0;border-top:1px solid var(--ink);display:flex;align-items:end;justify-content:space-between;gap:20px}.cp-image-ledger-head h2{font-size:clamp(39px,4.7vw,69px);line-height:.97;letter-spacing:-.08em;font-weight:600;margin:18px 0 0;max-width:660px}.cp-image-ledger-head p{max-width:290px;font-size:14px;line-height:1.5;color:#536887}.cp-image-ledger-grid{display:grid;grid-template-columns:1.2fr .8fr;grid-template-rows:310px 310px;gap:12px;margin-top:42px}.cp-ledger-image{position:relative;overflow:hidden;background:var(--ink2)}.cp-ledger-image:first-child{grid-row:span 2}.cp-ledger-image img{width:100%;height:100%;object-fit:cover;transition:transform .7s cubic-bezier(.2,.7,.2,1)}.cp-ledger-image:hover img{transform:scale(1.06)}.cp-ledger-image:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(7,25,54,.75),transparent 50%)}.cp-ledger-image figcaption{position:absolute;z-index:1;left:24px;bottom:20px;color:white}.cp-ledger-image figcaption span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.12em;opacity:.72;margin-bottom:9px}.cp-ledger-image figcaption strong{font:600 clamp(19px,2.2vw,30px)/1 Comfortaa,sans-serif;letter-spacing:-.06em}.cp-ledger-image:first-child figcaption strong{font-size:clamp(25px,3.4vw,48px)}
        .cp-converge{background:#eef0f5;padding:0 4.8vw 126px}.cp-converge-wrap{display:grid;grid-template-columns:1.1fr .9fr;min-height:590px}.cp-converge-copy{padding:90px 9% 60px 0}.cp-converge h2{font-weight:600;font-size:clamp(43px,5vw,76px);line-height:.97;letter-spacing:-.08em;margin:20px 0 28px}.cp-converge p{font-size:16px;line-height:1.6;color:#3e567b;max-width:410px}.cp-converge-points{margin-top:40px;border-top:1px solid var(--ink)}.cp-converge-points div{padding:12px 0;border-bottom:1px solid var(--line);font-size:13px;font-weight:600}.cp-converge-points span{display:inline-block;color:var(--pink);font-size:10px;letter-spacing:.1em;width:54px}.cp-converge-image{margin-top:-46px;position:relative;overflow:hidden;clip-path:polygon(0 8%,100% 0,100% 100%,9% 92%)}.cp-converge-image img{width:100%;height:100%;object-fit:cover}.cp-converge-image:after{content:"people + agents";position:absolute;right:24px;bottom:23px;color:#fff;font-size:10px;letter-spacing:.11em;text-transform:uppercase}
        .cp-industries{padding:0 4.8vw 130px}.cp-industry-top{border-top:1px solid var(--ink);padding-top:25px;display:flex;justify-content:space-between;gap:30px;align-items:end}.cp-industries h2{font-size:clamp(40px,4.8vw,70px);line-height:.98;letter-spacing:-.08em;font-weight:600;margin:12px 0 0}.cp-industry-top p{font-size:14px;line-height:1.5;max-width:280px;color:#536887}.cp-industry-list{margin-top:54px;display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line)}.cp-industry{border-bottom:1px solid var(--line);padding:21px 10px;display:flex;align-items:center;gap:18px;font-size:18px;font-family:Comfortaa,sans-serif;font-weight:600;letter-spacing:-.04em;transition:color 0.2s, background 0.2s;}.cp-industry:hover{background:#f2f4f8;color:var(--pink);}.cp-industry:nth-child(odd){border-right:1px solid var(--line)}.cp-industry span{font-family:Inter,sans-serif;font-size:10px;letter-spacing:.1em;color:#77859c}.cp-industry svg{margin-left:auto;color:var(--coral)}
        .cp-start{background:var(--ink);color:#fff;padding:104px 4.8vw 112px;position:relative}.cp-start:before{content:"PULSE";position:absolute;right:-10px;bottom:-18px;font:600 19vw/.7 Comfortaa,sans-serif;letter-spacing:-.11em;color:rgba(255,255,255,.06)}.cp-start-inner{position:relative;z-index:1;max-width:970px}.cp-start h2{font-size:clamp(52px,7.5vw,113px);font-weight:600;letter-spacing:-.095em;line-height:.88;margin:26px 0}.cp-start h2 em{font-style:normal;color:#ff8470}.cp-start p{font-size:17px;line-height:1.55;max-width:480px;color:#d6deed;margin-bottom:32px}
        @keyframes cpImage{from{clip-path:inset(0 100% 0 0);transform:scale(1.12)}to{clip-path:inset(0);transform:scale(1)}}@keyframes cpBreath{to{transform:scale(1.1) translateX(-1.4%)}}@media(prefers-reduced-motion:reduce){.cp *,.cp *:before,.cp *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
        @media(max-width:760px){.cp-hero{padding:33px 21px 0}.cp-hero-grid{display:flex;flex-direction:column;gap:32px;min-height:0;align-items:stretch;padding-bottom:25px}.cp-hero h1{font-size:54px;margin:25px 0 22px}.cp-hero p{font-size:15px}.cp-hero-image{height:440px;clip-path:polygon(10% 0,100% 0,100% 93%,0 100%,0 8%)}.cp-hero-word{font-size:71px}.cp-proof{margin:0 21px;grid-template-columns:1fr 1fr}.cp-proof div{padding:16px 12px}.cp-proof div:nth-child(2){border-right:0}.cp-proof div:nth-child(-n+2){border-bottom:1px solid var(--line)}.cp-statement{padding:86px 21px 73px;display:block}.cp-statement h2{font-size:42px}.cp-statement-copy{font-size:18px;margin-top:43px}.cp-break{margin:0;height:520px;min-height:0}.cp-break-copy{left:23px;right:23px;bottom:28px}.cp-break h2{font-size:42px}.cp-model{padding:82px 21px}.cp-model-head{display:block}.cp-model h2{font-size:43px}.cp-model-lead{margin-top:29px}.cp-services{margin-top:42px}.cp-service{grid-template-columns:35px 1fr 25px;gap:12px;padding:20px 0}.cp-service p{display:none}.cp-service h3{font-size:21px}.cp-image-ledger{padding:0 21px 82px}.cp-image-ledger-head{display:block}.cp-image-ledger-head h2{font-size:41px}.cp-image-ledger-grid{grid-template-columns:1fr;grid-template-rows:350px 240px 240px;gap:10px;margin-top:32px}.cp-ledger-image:first-child{grid-row:auto}.cp-converge{padding:0 21px 80px}.cp-converge-wrap{display:flex;flex-direction:column;min-height:0}.cp-converge-copy{padding:76px 0 42px}.cp-converge h2{font-size:43px}.cp-converge-image{height:390px;margin:0}.cp-industries{padding:0 21px 82px}.cp-industry-top{display:block}.cp-industries h2{font-size:42px}.cp-industry-list{display:block;margin-top:37px}.cp-industry{font-size:17px}.cp-industry:nth-child(odd){border-right:0}.cp-start{padding:77px 21px 82px}.cp-start h2{font-size:58px}}
      `}</style>
      <style>{`
        @media(max-width:760px){
          .cp-clarity{margin:0 21px 82px;display:block}
          .cp-clarity h2{font-size:40px}
          .cp-clarity-copy{font-size:15px}
          .cp-outcomes{margin-top:42px}
          .cp-outcome-row{grid-template-columns:1fr 1fr}
          .cp-outcome-row div:nth-child(2){border-right:0}
          .cp-outcome-row div:nth-child(-n+2){border-bottom:1px solid var(--line)}
        }
      `}</style>

      <section className="cp-hero">
        <div className="cp-kicker">{marketLocation} / AI-native advisory & engineering</div>
        <div className="cp-hero-grid">
          <div className="cp-hero-copy">
            <h1>Intelligence becomes <em>momentum.</em></h1>
            <p><strong>Cognirise is the AI-native advisory and engineering firm.</strong> Senior operators, forward-deployed engineers and governed agents move priority work from strategy into production.</p>
            <div className="cp-hero-actions">
              <BrandButton href="/value-scan" variant="submit">
                Bring us one process
              </BrandButton>
              <BrandButton href="/what-we-do" variant="editorial" icon={<ArrowDown className="h-4 w-4" />}>
                See how we work
              </BrandButton>
            </div>
          </div>
          <div className="cp-hero-image">
            <img src={assetUrl("/images/cognirise/pulse-hero.jpg")} alt="An abstract field of living intelligence flowing through a white and navy architectural space." />
            <div className="cp-hero-word">move</div>
            <div className="cp-hero-caption"><span>01 / living intelligence</span>Not another AI pilot</div>
          </div>
        </div>
      </section>
      
      <section className="cp-proof" aria-label="Cognirise qualities">
        <div><b>Built for</b><strong>Enterprise and government</strong></div>
        <div><b>Model</b><strong>Forward-deployed people + agents</strong></div>
        <div><b>Focus</b><strong>Priority work, not presentationware</strong></div>
        <div><b>Starting point</b><strong>One process under pressure</strong></div>
      </section>

      <section className="cp-statement">
        <div>
          <div className="cp-kicker">The pressure is real</div>
          <h2>AI spend is rising.<br />Too little <em>work</em> is changing.</h2>
        </div>
        <div className="cp-statement-copy">
          <p>Copilots can demonstrate possibility. Transformation begins when the process, people, data and controls move as one operating system.</p>
          <small>Consulting firms leave slides. Cognirise stays with the work—through the decisions, build and governed deployment.</small>
        </div>
      </section>

      <section className="cp-break">
        <img src={assetUrl("/images/cognirise/pulse-breakthrough.jpg")} alt="A bright gradient force breaking directly through a rigid architectural maze." />
        <div className="cp-break-copy">
          <div className="cp-kicker">A different operating model</div>
          <h2>Make the route, then move through it.</h2>
          <p>We bring strategy, engineering and agentic delivery into the same room—so the hardest constraints are addressed before they become the reason nothing ships.</p>
        </div>
        <div className="cp-break-mark">02 / breakthrough</div>
      </section>

      <section className="cp-model" id="services">
        <div className="cp-model-head">
          <div>
            <div className="cp-kicker">What we bring to the work</div>
            <h2>Exact where generic AI is vague.</h2>
          </div>
          <p className="cp-model-lead">A complete route from a consequential business problem to a working, governed system.</p>
        </div>
        <div className="cp-services">
          {[
            ["01","Agentic enterprise transformation","Find the work worth changing. Rebuild it around intelligence."],
            ["02","Data & AI foundations","Make data, controls and architecture ready for what comes next."],
            ["03","Engineering with AI","Ship production systems with forward-deployed engineering teams."],
            ["04","Sovereign & regulated AI","Build local control, security and explainability into the work."],
            ["05","Digital AI workforce","Deploy governed agents into real operating environments."]
          ].map(([number,title,copy], index) => {
            const urls = [
              "/what-we-do/agentic-enterprise-transformation",
              "/what-we-do/data-ai-foundations",
              "/what-we-do/engineering-with-ai",
              "/what-we-do/sovereign-regulated-ai",
              "/what-we-do/digital-ai-workforce"
            ];
            return (
              <Link className="cp-service" href={urls[index]} key={title}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <ArrowRight size={18} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="cp-clarity" aria-labelledby="connected-system-title">
        <div>
          <div className="cp-kicker">One system, shaped to the mandate</div>
          <h2 id="connected-system-title">Advisory defines the route. Engineering makes it real.</h2>
          <p className="cp-clarity-copy"><strong>CogniOS capabilities help governed intelligence operate in the work.</strong> We use the combination the mandate requires—not a platform looking for a problem.</p>
        </div>
        <div className="cp-outcomes">
          <p className="cp-outcomes-intro">Every mandate defines its own evidence. Cognirise looks for defensible movement in cost, capacity, speed and risk—without forcing every engagement into the same dashboard.</p>
          <div className="cp-outcome-row" aria-label="Outcome lenses">
            <div><span>01</span>Cost</div>
            <div><span>02</span>Capacity</div>
            <div><span>03</span>Speed</div>
            <div><span>04</span>Risk</div>
          </div>
        </div>
      </section>

      <section className="cp-image-ledger" aria-label="Cognirise outcomes in motion">
        <div className="cp-image-ledger-head">
          <div>
            <div className="cp-kicker">The system in motion</div>
            <h2>Three conditions for change that holds.</h2>
          </div>
          <p>We build the path, the controls and the capacity to keep the work moving after the first release.</p>
        </div>
        <div className="cp-image-ledger-grid">
          <figure className="cp-ledger-image">
            <img src={assetUrl("/images/cognirise/cognirise-pulse-outcomes.jpg")} alt="Violet, coral and navy sculptural forms moving precisely through a white architectural space." />
            <figcaption><span>01 / outcomes</span><strong>Capacity that compounds.</strong></figcaption>
          </figure>
          <figure className="cp-ledger-image">
            <img src={assetUrl("/images/cognirise/cognirise-pulse-governance.jpg")} alt="A luminous thread moving through precise navy gateways in a white architectural chamber." />
            <figcaption><span>02 / control</span><strong>Governance in the flow.</strong></figcaption>
          </figure>
          <figure className="cp-ledger-image">
            <img src={assetUrl("/images/cognirise/cognirise-pulse-people.jpg")} alt="Senior professionals collaborating around a vibrant translucent structure." />
            <figcaption><span>03 / people</span><strong>Expertise deployed.</strong></figcaption>
          </figure>
        </div>
      </section>

      <section className="cp-converge">
        <div className="cp-converge-wrap">
          <div className="cp-converge-copy">
            <div className="cp-kicker">One accountable team</div>
            <h2>Human-led. Agent-accelerated.</h2>
            <p>Human judgment sets the direction. Engineers make the system real. Agents take on governed work. Each force makes the other more useful.</p>
            <div className="cp-converge-points">
              <div><span>01</span>Senior operators make the call</div>
              <div><span>02</span>Forward-deployed engineers build it</div>
              <div><span>03</span>Governed agents move the work</div>
            </div>
          </div>
          <div className="cp-converge-image">
            <img src={assetUrl("/images/cognirise/pulse-convergence.jpg")} alt="People standing within an abstract luminous architectural space where human and agent forces converge." />
          </div>
        </div>
      </section>

      <section className="cp-industries" id="industries">
        <div className="cp-industry-top">
          <div>
            <div className="cp-kicker">Built for consequential work</div>
            <h2>Where operating pressure is real.</h2>
          </div>
          <p>For organisations where speed matters, but control is non-negotiable.</p>
        </div>
        <div className="cp-industry-list">
          {["Banking & financial services","Government & public sector","Telecoms","Travel & hospitality","Energy & resources","Manufacturing & conglomerates"].map((industry,index) => {
            const urls = [
              "/industries/banking",
              "/industries/public-sector",
              "/industries/telecoms",
              "/industries/travel",
              "/industries/energy",
              "/industries/manufacturing"
            ];
            return (
              <Link className="cp-industry" href={urls[index]} key={industry}>
                <span>0{index + 1}</span>{industry}<ArrowRight size={16} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="cp-start" id="start">
        <div className="cp-start-inner">
          <div className="cp-kicker">The first move</div>
          <h2>Bring one process.<br /><em>Leave with a route.</em></h2>
          <p>Start with a process where urgency, complexity and value have already collided. In one focused working session, we will surface the opportunity, constraints and practical route to production.</p>
          <BrandButton href="/value-scan" variant="submit">
            Book a value scan
          </BrandButton>
        </div>
      </section>
    </main>
  );
}
