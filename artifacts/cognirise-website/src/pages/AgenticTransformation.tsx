import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { Link } from "wouter";
import { ArrowDown, ArrowRight, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { scrollToSection } from "@/lib/motion";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";

export default function AgenticTransformation() {
  const [openStep, setOpenStep] = useState<number>(0);
  const { market } = useMarketStore();
  
  const marketLocation = getMarketLocationLabel(market);
  const heroKicker = cleanHeroIdentifier(`What we do / ${marketLocation}`, { marketLocation });

  const journey = [
    ["01", "Frame the work", "Bring one process under pressure. We find where time, risk, hand-offs and decisions are constraining the outcome."],
    ["02", "Design the move", "Senior operators, engineers and your team define the target operating model, controls and the route to value."],
    ["03", "Build in the flow", "We integrate intelligence into the work itself—not beside it—then test it against the realities of your environment."],
    ["04", "Run, learn, extend", "Governed agents and people work as one system, creating the capacity to take the next priority process on."],
  ];

  const goTo = scrollToSection;

  return (
    <main className="at">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .at{--ink:#102957;--deep:#071936;--paper:#fdfcfb;--mist:#f0f3f7;--line:#cbd3e1;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}
        .at *{box-sizing:border-box}
        .at button{font:inherit}
        .at :focus-visible{outline:3px solid var(--coral);outline-offset:4px}
        .at h1,.at h2,.at h3{font-family:Comfortaa,sans-serif}
        .at-primary{border:1px solid var(--ink);cursor:pointer;color:#fff;background:var(--ink);font-weight:700;font-size:12px;padding:4px 4px 4px 17px;min-height:46px;display:inline-flex;align-items:center;gap:15px;position:relative;isolation:isolate;overflow:hidden;transition:transform .24s,box-shadow .24s;text-decoration:none}
        .at-primary:before{content:"";position:absolute;z-index:-2;inset:-1px;background:linear-gradient(105deg,var(--violet),var(--pink),var(--coral));opacity:0;transition:.24s}
        .at-primary:after{content:"";position:absolute;z-index:-1;inset:1px;background:var(--ink);transition:.24s}
        .at-primary svg{width:36px;height:36px;padding:10px;background:#fff;color:var(--ink);transition:.24s}
        .at-primary:hover{transform:translate(-3px,-3px);box-shadow:6px 6px 0 var(--coral)}
        .at-primary:hover:before{opacity:1}
        .at-primary:hover:after{background:rgba(7,25,54,.94)}
        .at-primary:hover svg{transform:translate(3px,-3px);background:var(--coral);color:#fff}
        
        .at-hero{padding:21px 4.8vw 0}
        .at-kicker{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;display:flex;gap:10px;align-items:center}
        .at-kicker:before{content:"";width:23px;height:1px;background:linear-gradient(90deg,var(--violet),var(--coral))}
        .at-hero-grid{display:grid;grid-template-columns:.86fr 1.14fr;gap:44px;align-items:end;min-height:685px;padding-bottom:34px}
        .at-hero-copy{padding-bottom:16px;position:relative;z-index:1}
        .at-hero h1{font-size:clamp(47px,6vw,93px);line-height:.94;letter-spacing:-.08em;font-weight:600;margin:29px 0 28px;max-width:660px}
        .at-hero h1 em{font-style:normal;color:var(--pink)}
        .at-hero p{font-size:16px;line-height:1.6;color:#415779;max-width:460px;margin:0 0 30px}
        .at-actions{display:flex;gap:19px;align-items:center;flex-wrap:wrap}
        .at-under{border-bottom:1px solid var(--ink);display:inline-flex;gap:9px;align-items:center;background:none;border-left:none;border-right:none;border-top:none;cursor:pointer;color:var(--ink);font-weight:700;font-size:12px;padding-bottom:2px}
        .at-under:hover{color:var(--pink);border-color:var(--pink)}
        .at-hero-image{height:640px;overflow:hidden;position:relative;background:var(--deep);clip-path:polygon(10% 0,100% 0,100% 91%,0 100%,0 12%)}
        .at-hero-image img{height:100%;width:100%;object-fit:cover}
        .at-hero-image:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(7,25,54,.57),transparent 45%)}
        .at-hero-word{position:absolute;right:-8px;top:44px;z-index:1;color:#fff;opacity:.8;mix-blend-mode:overlay;font:600 clamp(60px,9vw,146px)/.8 Comfortaa,sans-serif;letter-spacing:-.1em}
        .at-caption{position:absolute;z-index:2;bottom:27px;left:32px;color:#fff;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
        .at-caption span{display:block;opacity:.72;margin-bottom:7px}
        
        .at-proof{margin:0 4.8vw;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}
        .at-proof div{padding:18px 20px;border-right:1px solid var(--line);font-size:12px;line-height:1.4}
        .at-proof div:last-child{border:0}
        .at-proof b{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;margin-bottom:8px;color:#6a7891}
        
        .at-tension{padding:145px 4.8vw 112px;display:grid;grid-template-columns:1fr 1.15fr;gap:8vw}
        .at-tension h2,.at-section h2{font-size:clamp(42px,5vw,77px);font-weight:600;letter-spacing:-.08em;line-height:.98;margin:25px 0 0}
        .at-tension h2 em{font-style:normal;color:var(--coral)}
        .at-tension-copy{align-self:end;border-top:1px solid var(--line);padding-top:22px;font-size:21px;line-height:1.44;color:#30486d;max-width:540px}
        .at-tension-copy small{display:block;font-size:12px;line-height:1.55;margin-top:23px;color:#647491}
        
        .at-break{height:min(640px,51vw);min-height:470px;margin:0 4.8vw;position:relative;overflow:hidden;background:var(--deep)}
        .at-break img{width:100%;height:100%;object-fit:cover}
        .at-break:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.84),rgba(7,25,54,.03) 72%)}
        .at-break-copy{position:absolute;z-index:1;left:6%;bottom:11%;color:#fff;max-width:620px}
        .at-break h2{font-size:clamp(42px,5.3vw,79px);line-height:.96;letter-spacing:-.08em;font-weight:600;margin:16px 0}
        .at-break p{max-width:430px;font-size:15px;line-height:1.6;color:#dce4f0}
        .at-break-mark{position:absolute;z-index:1;right:4%;top:34px;color:#fff;font-size:10px;letter-spacing:.12em;writing-mode:vertical-rl}
        
        .at-section{padding:125px 4.8vw}
        .at-section-head{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:end}
        .at-section h2{max-width:690px}
        .at-lead{font-size:16px;line-height:1.58;color:#42587b;max-width:420px;margin:0}
        
        .at-journey{margin-top:62px;border-top:1px solid var(--ink)}
        .at-step{width:100%;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);display:grid;grid-template-columns:72px 1fr 1fr 32px;gap:20px;align-items:center;padding:24px 8px;text-align:left;cursor:pointer;transition:.24s}
        .at-step:hover,.at-step.active{padding-left:21px;background:#f1effb}
        .at-step span{font-size:10px;letter-spacing:.1em;color:#697a96}
        .at-step h3{font-size:clamp(20px,2.4vw,31px);line-height:1.05;letter-spacing:-.06em;margin:0}
        .at-step p{margin:0;color:#536887;font-size:13px;line-height:1.48;max-width:335px}
        .at-step svg{justify-self:end}
        .at-step.active svg{color:var(--pink)}
        
        .at-outcomes{background:var(--mist);padding:0 4.8vw 120px}
        .at-outcomes-wrap{display:grid;grid-template-columns:.95fr 1.05fr;gap:7vw;align-items:center}
        .at-outcomes-copy{padding:105px 0 58px}
        .at-outcomes h2{font-size:clamp(42px,5vw,76px);font-weight:600;line-height:.97;letter-spacing:-.08em;margin:20px 0 28px}
        .at-outcomes p{font-size:16px;line-height:1.6;max-width:415px;color:#3e567b}
        
        .at-outcome-list{border-top:1px solid var(--ink);margin-top:39px}
        .at-outcome-list div{padding:12px 0;border-bottom:1px solid var(--line);font-size:13px;font-weight:600}
        .at-outcome-list span{display:inline-block;width:54px;font-size:10px;letter-spacing:.1em;color:var(--pink)}
        
        .at-outcome-image{height:570px;margin-top:-42px;position:relative;overflow:hidden;clip-path:polygon(0 8%,100% 0,100% 100%,9% 92%)}
        .at-outcome-image img{width:100%;height:100%;object-fit:cover}
        .at-outcome-image:after{content:"outcomes, designed in";position:absolute;right:24px;bottom:24px;color:white;font-size:10px;letter-spacing:.11em;text-transform:uppercase}
        
        .at-related{padding:0 4.8vw 128px}
        .at-related-head{border-top:1px solid var(--ink);padding:25px 0;display:flex;align-items:end;justify-content:space-between;gap:30px}
        .at-related h2{font-size:clamp(40px,4.7vw,68px);font-weight:600;line-height:.98;letter-spacing:-.08em;margin:17px 0 0}
        .at-related-head p{max-width:310px;font-size:14px;line-height:1.5;color:#536887}
        
        .at-service-photo{height:420px;position:relative;overflow:hidden;margin-top:35px;clip-path:polygon(5% 0,100% 0,100% 91%,0 100%,0 9%);display:block;text-decoration:none;color:inherit}
        .at-service-photo img{width:100%;height:100%;object-fit:cover;transition:transform .7s}
        .at-service-photo:hover img{transform:scale(1.05)}
        .at-service-photo:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.78),transparent 68%)}
        .at-service-caption{position:absolute;z-index:1;left:5%;bottom:11%;color:#fff;max-width:530px}
        .at-service-caption h3{font-size:clamp(26px,3.3vw,48px);line-height:1;letter-spacing:-.07em;margin:12px 0}
        .at-service-caption p{font-size:14px;line-height:1.5;margin:0;color:#e0e7f0;max-width:390px}
        
        .at-start{background:var(--ink);color:#fff;padding:104px 4.8vw 128px;position:relative}
        .at-start:before{content:"MOVE";position:absolute;right:-10px;bottom:-18px;color:rgba(255,255,255,.06);font:600 19vw/.7 Comfortaa,sans-serif;letter-spacing:-.11em}
        .at-start-inner{position:relative;z-index:1;max-width:970px}
        .at-start h2{font-size:clamp(51px,7.5vw,111px);font-weight:600;line-height:.88;letter-spacing:-.095em;margin:27px 0}
        .at-start h2 em{font-style:normal;color:#ff8470}
        .at-start p{font-size:17px;line-height:1.55;color:#d6deed;max-width:515px}
        .at-start .at-primary{border-color:transparent;background:linear-gradient(100deg,var(--violet),var(--pink),var(--coral));margin-top:18px}
        .at-start .at-primary:after{background:transparent}
        .at-start .at-primary:hover{box-shadow:6px 6px 0 #fff}
        
        @keyframes at-breathe{to{transform:scale(1.08) translateX(-1%)}}
        @media(prefers-reduced-motion:reduce){.at *,.at *:before,.at *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
        
        @media(max-width:760px){
          .at-hero{padding:33px 21px 0}
          .at-hero-grid{display:flex;flex-direction:column;align-items:stretch;gap:32px;min-height:0;padding-bottom:25px}
          .at-hero h1{font-size:52px;margin:25px 0 22px}
          .at-hero-image{height:435px}
          .at-hero-word{font-size:70px}
          .at-proof{margin:0 21px;grid-template-columns:1fr 1fr}
          .at-proof div{padding:16px 12px}
          .at-proof div:nth-child(2){border-right:0}
          .at-proof div:nth-child(-n+2){border-bottom:1px solid var(--line)}
          .at-tension{display:block;padding:86px 21px 73px}
          .at-tension h2,.at-section h2{font-size:42px}
          .at-tension-copy{font-size:18px;margin-top:42px}
          .at-break{margin:0;height:520px;min-height:0}
          .at-break-copy{left:23px;right:23px;bottom:28px}
          .at-break h2{font-size:42px}
          .at-section{padding:82px 21px}
          .at-section-head{display:block}
          .at-lead{margin-top:29px}
          .at-journey{margin-top:42px}
          .at-step{grid-template-columns:35px 1fr 25px;gap:12px;padding:20px 0}
          .at-step p{display:none}
          .at-step h3{font-size:21px}
          .at-outcomes{padding:0 21px 80px}
          .at-outcomes-wrap{display:flex;flex-direction:column;gap:0}
          .at-outcomes-copy{padding:76px 0 42px}
          .at-outcomes h2{font-size:43px}
          .at-outcome-image{height:390px;width:100%;margin:0}
          .at-related{padding:0 21px 82px}
          .at-related-head{display:block}
          .at-related h2{font-size:41px}
          .at-service-photo{height:430px;margin-top:32px}
          .at-service-caption{left:24px;right:24px}
          .at-service-caption h3{font-size:31px}
          .at-start{padding:77px 21px 122px}
          .at-start h2{font-size:57px}
        }
      `}</style>
      
      <section className="at-hero public-hero-shell">
        <div className="at-hero-grid">
          <div className="at-hero-copy">
            <div className="launch-hero-top"><NavigationBackControl embedded /><div className="at-kicker">{heroKicker}</div></div>
            <div className="launch-hero-narrative">
            <h1>Make AI change the <em>work.</em></h1>
            <p>As a capability within Consulting & Engineering with AI, agentic enterprise transformation brings senior operators, forward-deployed engineers and governed agents together around the processes that matter most.</p>
            <div className="at-actions">
              <Link href="/value-scan" className="at-primary">
                Bring us one process <ArrowRight size={15} />
              </Link>
              <button className="at-under" onClick={() => goTo("model")}>
                Explore the operating model <ArrowDown size={15} />
              </button>
            </div>
          </div>
            </div>
          <div className="at-hero-image">
            <img src={assetUrl("/images/cognirise/site-services.jpg")} alt="A vivid current moving through a white and navy architectural landscape." />
            <div className="at-hero-word">work</div>
            <div className="at-caption">
              <span>01 / agentic transformation</span>
              From ambition into production
            </div>
          </div>
        </div>
      </section>
      
      <section className="at-proof" aria-label="Service qualities">
        <div><b>Starting point</b>One consequential process</div>
        <div><b>Operating model</b>People + engineers + agents</div>
        <div><b>Built for</b>Enterprise and government</div>
        <div><b>Focus</b>Production value, with control</div>
      </section>
      
      <section className="at-tension">
        <div>
          <div className="at-kicker">The real problem</div>
          <h2>AI is everywhere.<br />Change is <em>not.</em></h2>
        </div>
        <div className="at-tension-copy">
          Most programmes stop at possibility: a pilot, a copilot, a presentation. The operating work stays fragmented, while the teams carrying it remain under pressure.
          <small>Transformation starts when the process, data, decisions and controls are redesigned together—and the system is carried into production.</small>
        </div>
      </section>
      
      <section className="at-break">
        <img src={assetUrl("/images/cognirise/pulse-breakthrough.jpg")} alt="A violet and coral current breaking through a rigid architectural maze." />
        <div className="at-break-copy">
          <div className="at-kicker">Change the route</div>
          <h2>Build through the constraint.</h2>
          <p>We work where operational urgency meets technical reality. The hard constraints are not an afterthought—they are where the transformation begins.</p>
        </div>
        <div className="at-break-mark">02 / breakthrough</div>
      </section>
      
      <section className="at-section" id="model">
        <div className="at-section-head">
          <div>
            <div className="at-kicker">The operating model</div>
            <h2>One team, in the work.</h2>
          </div>
          <p className="at-lead">A disciplined route from a priority business problem to a working, governed system—designed with the people who run it.</p>
        </div>
        <div className="at-journey">
          {journey.map(([num,title,copy], i) => (
            <button className={`at-step ${openStep === i ? "active" : ""}`} onClick={() => setOpenStep(i)} key={title}>
              <span>{num}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
              {openStep === i ? <Minus size={18} /> : <Plus size={18} />}
            </button>
          ))}
        </div>
      </section>
      
      <section className="at-outcomes">
        <div className="at-outcomes-wrap">
          <div className="at-outcomes-copy">
            <div className="at-kicker">What changes</div>
            <h2>Capacity, speed and control—moving together.</h2>
            <p>Agentic transformation is not a hand-off to automation. It is a new operating rhythm: human judgment where it counts, governed intelligence where work can move.</p>
            <div className="at-outcome-list">
              <div><span>01</span>Reduce cost in the work that repeats</div>
              <div><span>02</span>Create capacity for higher-value decisions</div>
              <div><span>03</span>Shorten the route from insight to action</div>
              <div><span>04</span>De-risk change with governance in the flow</div>
            </div>
          </div>
          <div className="at-outcome-image">
            <img src={assetUrl("/images/cognirise/cognirise-pulse-outcomes.jpg")} alt="A coral route passing through violet and navy architectural forms." />
          </div>
        </div>
      </section>
      
      <section className="at-related">
        <div className="at-related-head">
          <div>
            <div className="at-kicker">Connected service lines</div>
            <h2>The transformation needs its ground.</h2>
          </div>
          <p>Go deeper through the three service lines, with specialist capabilities supporting each route.</p>
        </div>
        <Link href="/#service-lines" className="at-service-photo">
          <img src={assetUrl("/images/cognirise/site-services.jpg")} alt="A colourful current travelling through a layered architectural environment." />
          <div className="at-service-caption">
            <div className="at-kicker">Connected capability</div>
            <h3>Data, architecture and delivery—aligned to the same move.</h3>
            <p>Explore Consulting & Engineering with AI, Sovereign AI Solutions and AI Platforms.</p>
          </div>
        </Link>
      </section>
      
      <section className="at-start" id="start">
        <div className="at-start-inner">
          <div className="at-kicker">The first move</div>
          <h2>Bring one process.<br /><em>Leave with a route.</em></h2>
          <p>Start with the work where urgency, complexity and value have already collided. In a focused working session, we surface the opportunity, constraints and a practical route to production.</p>
          <Link href="/value-scan" className="at-primary">
            Book a value scan <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
