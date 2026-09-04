import { Link } from "wouter";
import { ArrowDown, ArrowRight, Minus, Plus } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useState } from "react";
import { useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";

export default function ServicesOverview() {
  const [openService, setOpenService] = useState<number>(0);
  const [route, setRoute] = useState<string | null>(null);
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const services = [
    { no: "01", title: "Agentic enterprise transformation", short: "For priority work that needs redesign, not another isolated pilot.", copy: "We identify the work that matters, define the operating change and stay through production—where strategy becomes a working system.", outcome: "A route from executive decision to operating change.", url: "/what-we-do/agentic-enterprise-transformation" },
    { no: "02", title: "Data & AI foundations", short: "For data, controls and architecture that must be ready before the work moves.", copy: "We make the underlying estate usable for AI: from data and integration to governance, operating models and the conditions for scale.", outcome: "Foundations designed for real deployment.", url: "/what-we-do/data-ai-foundations" },
    { no: "03", title: "Engineering with AI", short: "For teams that need to ship dependable systems at the pace of the opportunity.", copy: "Forward-deployed engineers build, integrate and harden the products and platforms that take promising work into production.", outcome: "Systems built in the environment where they will run.", url: "/what-we-do/engineering-with-ai" },
    { no: "04", title: "Sovereign & regulated AI", short: "For environments where local control, explainability and assurance are central.", copy: "We design AI around the obligations of the environment: sovereignty, security, transparency and the governance that holds in use.", outcome: "Control engineered into the work—not added after.", url: "/what-we-do/sovereign-regulated-ai" },
    { no: "05", title: "Digital AI workforce", short: "For operations ready to give governed agents a meaningful role in the flow of work.", copy: "We help organisations deploy agents that operate within defined boundaries, alongside teams, systems and accountable decision-making.", outcome: "Agents that move work with people, not around them.", url: "/what-we-do/digital-ai-workforce" },
  ];

  return (
    <main className="cps">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .cps{--ink:#102957;--deep:#081a3a;--paper:#fdfcfb;--soft:#f0f2f6;--line:#cad2df;--muted:#526886;--violet:#7659df;--pink:#dc509f;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}.cps *{box-sizing:border-box}.cps button{font:inherit}.cps a{color:inherit;text-decoration:none}.cps :focus-visible{outline:3px solid var(--coral);outline-offset:4px}.cps h1,.cps h2,.cps h3{font-family:Comfortaa,sans-serif}
        .cps-hero{padding:22px 4.8vw 0}.cps-kicker{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;display:flex;align-items:center;gap:10px}.cps-kicker:before{content:"";width:23px;height:1px;background:linear-gradient(90deg,var(--violet),var(--coral))}.cps-hero-grid{min-height:650px;display:grid;grid-template-columns:.86fr 1.14fr;gap:38px;align-items:end;padding-bottom:36px}.cps-hero-copy{padding-bottom:16px;position:relative;z-index:2}.cps-hero h1{font-weight:600;font-size:clamp(51px,6.5vw,102px);line-height:.93;letter-spacing:-.08em;margin:30px 0 28px;max-width:700px}.cps-hero h1 em{font-style:normal;color:var(--pink)}.cps-hero p{font-size:16px;line-height:1.6;color:#415779;max-width:460px;margin:0 0 30px}.cps-hero-actions{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
        .cps-hero-image{height:595px;position:relative;overflow:hidden;background:var(--deep);clip-path:polygon(10% 0,100% 0,100% 92%,0 100%,0 11%)}.cps-hero-image img{width:100%;height:100%;object-fit:cover;animation:cpsReveal 1.25s cubic-bezier(.2,.7,.2,1) both}.cps-hero-image:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,26,58,.28),transparent 45%),linear-gradient(0deg,rgba(8,26,58,.55),transparent 36%)}.cps-hero-word{font:600 clamp(56px,8.2vw,135px)/.8 Comfortaa,sans-serif;color:#fff;position:absolute;z-index:2;right:-8px;top:49px;letter-spacing:-.11em;mix-blend-mode:overlay}.cps-caption{position:absolute;z-index:2;left:34px;bottom:28px;color:#fff;font-size:10px;letter-spacing:.12em;text-transform:uppercase}.cps-caption span{display:block;opacity:.73;margin-bottom:7px}
        .cps-proof{margin:0 4.8vw;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);display:grid;grid-template-columns:1.1fr 1fr 1fr 1fr}.cps-proof div{padding:18px 20px;border-right:1px solid var(--line);font-size:12px;line-height:1.4}.cps-proof div:last-child{border:0}.cps-proof b{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;margin-bottom:8px;color:#6a7891}
        .cps-intro{padding:146px 4.8vw 115px;display:grid;grid-template-columns:1fr 1.14fr;gap:8vw}.cps-intro h2,.cps-services h2,.cps-route h2{font-weight:600;font-size:clamp(43px,5vw,78px);letter-spacing:-.08em;line-height:.98;margin:24px 0 0}.cps-intro h2 em,.cps-route h2 em{font-style:normal;color:var(--coral)}.cps-intro-copy{align-self:end;border-top:1px solid var(--line);padding-top:22px;font-size:21px;line-height:1.45;color:#30486d;max-width:540px}.cps-intro-copy p{margin:0}.cps-intro-copy small{display:block;font-size:12px;line-height:1.6;color:#647491;margin-top:23px}
        .cps-break{margin:0 4.8vw;background:var(--deep);height:min(610px,48vw);min-height:470px;position:relative;overflow:hidden}.cps-break img{width:100%;height:100%;object-fit:cover;animation:cpsBreath 9s ease-in-out infinite alternate}.cps-break:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,26,58,.9),rgba(8,26,58,.08) 68%)}.cps-break-copy{position:absolute;z-index:2;left:6%;bottom:11%;color:#fff;max-width:610px}.cps-break h2{font-size:clamp(42px,5.3vw,80px);line-height:.97;letter-spacing:-.08em;font-weight:600;margin:17px 0}.cps-break p{max-width:440px;color:#dce4f0;font-size:15px;line-height:1.6}.cps-break-mark{position:absolute;right:4%;top:34px;z-index:2;color:#fff;font-size:10px;letter-spacing:.12em;writing-mode:vertical-rl}
        .cps-services{padding:126px 4.8vw 116px}.cps-services-head{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:end}.cps-services-lead{font-size:16px;line-height:1.55;max-width:420px;color:#42587b;margin:0}.cps-accordion{margin-top:61px;border-top:1px solid var(--ink)}.cps-service{border-bottom:1px solid var(--line);background:transparent;color:var(--ink);width:100%;text-align:left;cursor:pointer;padding:22px 8px;display:grid;grid-template-columns:73px 1fr .8fr 35px;align-items:center;gap:18px;transition:padding .24s,background .24s}.cps-service:hover,.cps-service.active{padding-left:21px;background:#f1effb}.cps-service span{font-size:10px;letter-spacing:.1em;color:#697a96}.cps-service h3{font-size:clamp(20px,2.25vw,31px);line-height:1.05;font-weight:600;letter-spacing:-.06em;margin:0}.cps-service p{font-size:13px;line-height:1.45;color:#536887;margin:0;max-width:300px}.cps-service svg{justify-self:end}.cps-detail{background:#f1effb;margin-top:-1px;padding:0 8% 31px 94px;display:grid;grid-template-columns:1fr 1fr;gap:40px;border-bottom:1px solid var(--line);font-size:15px;line-height:1.6;color:#405674}.cps-detail p{margin:0;max-width:430px}.cps-detail strong{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--pink);display:block;margin-bottom:8px}
        .cps-route{background:#edf0f5;padding:0 4.8vw 122px}.cps-route-wrap{display:grid;grid-template-columns:1.05fr .95fr;min-height:600px}.cps-route-copy{padding:91px 9% 60px 0}.cps-route-copy>p{font-size:16px;line-height:1.6;color:#3e567b;max-width:410px}.cps-route-options{margin-top:37px;border-top:1px solid var(--ink)}.cps-route-options button{width:100%;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;text-align:left;padding:15px 0;display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:600}.cps-route-options button:hover,.cps-route-options button.active{color:var(--pink)}.cps-route-response{font-size:13px;line-height:1.55;padding-top:17px;color:#526886}.cps-route-image{margin-top:-44px;position:relative;overflow:hidden;clip-path:polygon(0 8%,100% 0,100% 100%,9% 92%)}.cps-route-image img{width:100%;height:100%;object-fit:cover}.cps-route-image:after{content:"Start with the pressure";position:absolute;right:23px;bottom:23px;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.11em}
        .cps-ways{padding:0 4.8vw 130px}.cps-ways-top{border-top:1px solid var(--ink);padding-top:26px;display:flex;justify-content:space-between;align-items:end;gap:30px}.cps-ways h2{font-size:clamp(40px,4.8vw,70px);line-height:.98;letter-spacing:-.08em;font-weight:600;margin:12px 0 0}.cps-ways-top p{font-size:14px;line-height:1.5;max-width:290px;color:#536887}.cps-way-list{margin-top:55px;border-top:1px solid var(--line)}.cps-way{display:grid;grid-template-columns:66px 1fr 1fr 32px;gap:20px;align-items:center;padding:22px 9px;border-bottom:1px solid var(--line)}.cps-way span{font-size:10px;letter-spacing:.1em;color:#75839b}.cps-way h3{font-size:20px;letter-spacing:-.05em;margin:0}.cps-way p{font-size:13px;line-height:1.48;margin:0;color:#536887}.cps-way svg{color:var(--coral)}
        .cps-start{background:var(--ink);color:#fff;padding:104px 4.8vw 112px;position:relative}.cps-start:before{content:"WORK";position:absolute;right:-8px;bottom:-16px;font:600 19vw/.7 Comfortaa,sans-serif;letter-spacing:-.11em;color:rgba(255,255,255,.06)}.cps-start-inner{position:relative;z-index:1;max-width:990px}.cps-start h2{font-size:clamp(51px,7.5vw,111px);font-weight:600;letter-spacing:-.1em;line-height:.88;margin:25px 0}.cps-start h2 em{font-style:normal;color:#ff8873}.cps-start p{font-size:17px;line-height:1.55;max-width:510px;color:#d6deed;margin-bottom:32px}
        @keyframes cpsReveal{from{clip-path:inset(0 100% 0 0);transform:scale(1.1)}to{clip-path:inset(0);transform:scale(1)}}@keyframes cpsBreath{to{transform:scale(1.075) translateX(-1.2%)}}@media(prefers-reduced-motion:reduce){.cps *,.cps *:before,.cps *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
        @media(max-width:760px){.cps-hero{padding:33px 21px 0}.cps-hero-grid{display:flex;flex-direction:column;min-height:0;gap:32px;padding-bottom:25px}.cps-hero h1{font-size:53px;margin:25px 0 22px}.cps-hero-image{height:435px}.cps-hero-word{font-size:68px}.cps-proof{margin:0 21px;grid-template-columns:1fr 1fr}.cps-proof div{padding:16px 12px}.cps-proof div:nth-child(2){border-right:0}.cps-proof div:nth-child(-n+2){border-bottom:1px solid var(--line)}.cps-intro{padding:85px 21px 74px;display:block}.cps-intro h2{font-size:42px}.cps-intro-copy{font-size:18px;margin-top:42px}.cps-break{margin:0;height:518px;min-height:0}.cps-break-copy{left:23px;right:22px;bottom:26px}.cps-break h2{font-size:41px}.cps-services{padding:82px 21px}.cps-services-head{display:block}.cps-services h2{font-size:42px}.cps-services-lead{margin-top:29px}.cps-accordion{margin-top:42px}.cps-service{grid-template-columns:35px 1fr 25px;padding:20px 0;gap:12px}.cps-service p{display:none}.cps-service h3{font-size:21px}.cps-detail{display:block;padding:19px 18px 25px 47px;font-size:14px}.cps-detail p+div{margin-top:18px}.cps-route{padding:0 21px 79px}.cps-route-wrap{display:flex;flex-direction:column;min-height:0}.cps-route-copy{padding:76px 0 42px}.cps-route h2{font-size:42px}.cps-route-image{height:390px;margin:0}.cps-ways{padding:0 21px 82px}.cps-ways-top{display:block}.cps-ways h2{font-size:42px}.cps-way-list{margin-top:37px}.cps-way{grid-template-columns:35px 1fr 22px;gap:12px}.cps-way p{display:none}.cps-way h3{font-size:18px}.cps-start{padding:77px 21px 82px}.cps-start h2{font-size:57px}}
      `}</style>

      <section className="cps-hero">
        <div className="cps-kicker">What we do / {marketLocation}</div>
        <div className="cps-hero-grid">
          <div className="cps-hero-copy">
            <h1>Stay with the work.<br />From decision to <em>production.</em></h1>
            <p>Cognirise brings senior operators, engineers and governed agents to the work that needs to change—then remains accountable for making it real.</p>
            <div className="cps-hero-actions">
              <BrandButton href="#services" variant="submit" onClick={(e) => { e.preventDefault(); document.getElementById("services")?.scrollIntoView({ behavior: "smooth" }); }}>
                Explore services
              </BrandButton>
              <BrandButton href="#route" variant="editorial" icon={<ArrowDown className="h-4 w-4" />} onClick={(e) => { e.preventDefault(); document.getElementById("route")?.scrollIntoView({ behavior: "smooth" }); }}>
                Not sure where to start
              </BrandButton>
            </div>
          </div>
          <div className="cps-hero-image">
            <img src={assetUrl("/images/cognirise/site-services.jpg")} alt="Violet and coral intelligence routes moving through a bright architectural space." />
            <div className="cps-hero-word">work</div>
            <div className="cps-caption"><span>01 / services</span>One accountable route</div>
          </div>
        </div>
      </section>

      <section className="cps-proof" aria-label="Service principles">
        <div><b>Built for</b><strong>Enterprise and government</strong></div>
        <div><b>Start with</b><strong>A priority process under pressure</strong></div>
        <div><b>Stay through</b><strong>Build, deployment and change</strong></div>
        <div><b>Bring together</b><strong>People, engineering and agents</strong></div>
      </section>

      <section className="cps-intro">
        <div>
          <div className="cps-kicker">A different kind of service firm</div>
          <h2>Decision is only the start.<br />The work is the <em>test.</em></h2>
        </div>
        <div className="cps-intro-copy">
          <p>AI transformations fail when the strategy, system and operating reality are treated as separate engagements. We work across all three, in the same accountable motion.</p>
          <small>Whether the pressure is commercial, operational, technical or regulatory, the first question is the same: what must move—and what will it take to make that change hold?</small>
        </div>
      </section>

      <section className="cps-break">
        <img src={assetUrl("/images/cognirise/pulse-breakthrough.jpg")} alt="A vivid flow of violet and coral threads breaking through a white architectural maze." />
        <div className="cps-break-copy">
          <div className="cps-kicker">From the first hard question</div>
          <h2>Make the route. Then keep moving.</h2>
          <p>Our services are distinct entry points—not disconnected offers. Each can begin with one consequential problem and extend into the teams, systems and controls needed to carry it into production.</p>
        </div>
        <div className="cps-break-mark">02 / the route</div>
      </section>

      <section className="cps-services" id="services">
        <div className="cps-services-head">
          <div>
            <div className="cps-kicker">Choose an entry point</div>
            <h2>Five ways into the work.</h2>
          </div>
          <p className="cps-services-lead">Start where the current pressure is clearest. We will connect it to the wider operating system from there.</p>
        </div>
        <div className="cps-accordion">
          {services.map((service, index) => (
            <div key={service.title}>
              <button 
                className={`cps-service ${openService === index ? "active" : ""}`} 
                onClick={() => setOpenService(openService === index ? -1 : index)} 
                aria-expanded={openService === index}
              >
                <span>{service.no}</span>
                <h3>{service.title}</h3>
                <p>{service.short}</p>
                {openService === index ? <Minus size={18} /> : <Plus size={18} />}
              </button>
              {openService === index && (
                <div className="cps-detail">
                  <div>
                    <strong>How we help</strong>
                    <p>{service.copy}</p>
                  </div>
                  <div>
                    <strong>The difference</strong>
                    <p>{service.outcome}</p>
                    <div className="mt-8">
                      <BrandButton href={service.url} variant="submit">
                        Explore service
                      </BrandButton>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="cps-route" id="route">
        <div className="cps-route-wrap">
          <div className="cps-route-copy">
            <div className="cps-kicker">You do not need to diagnose it alone</div>
            <h2>Not sure which service you <em>need?</em></h2>
            <p>Begin with the intent behind the question. Select the statement that feels closest to the pressure you are carrying.</p>
            <div className="cps-route-options">
              {["We need to change a priority process.","Our foundations are not ready for AI.","We need a system built and deployed.","We need local control and assurance.","We are ready to introduce governed agents."].map((item) => (
                <button className={route === item ? "active" : ""} onClick={() => setRoute(item)} key={item}>
                  {item}<ArrowRight size={16} />
                </button>
              ))}
            </div>
            {route && <p className="cps-route-response" aria-live="polite">Start there. We will bring the relevant operators, engineers and controls into the first conversation.</p>}
          </div>
          <div className="cps-route-image">
            <img src={assetUrl("/images/cognirise/cognirise-pulse-people.jpg")} alt="A group of professionals beneath flowing bands of light in a navy architectural space." />
          </div>
        </div>
      </section>

      <section className="cps-ways" id="ways">
        <div className="cps-ways-top">
          <div>
            <div className="cps-kicker">The work, connected</div>
            <h2>Different entries.<br />One operating model.</h2>
          </div>
          <p>Every engagement is shaped around what the work needs next—not around a fixed sequence of slides and hand-offs.</p>
        </div>
        <div className="cps-way-list">
          {["Find the decision that matters","Build the conditions to move","Deploy into the operating reality","Govern what changes"].map((item, index) => (
            <div className="cps-way" key={item}>
              <span>0{index + 1}</span>
              <h3>{item}</h3>
              <p>{["Frame the opportunity around a specific process, constraint and outcome.","Connect architecture, data and delivery capability to the need at hand.","Integrate people, systems and agents in the environment where work happens.","Make control, accountability and learning part of the production path."][index]}</p>
              <ArrowRight size={17} />
            </div>
          ))}
        </div>
      </section>

      <section className="cps-start" id="start">
        <div className="cps-start-inner">
          <div className="cps-kicker">The first move</div>
          <h2>Bring one process.<br /><em>Leave with a route.</em></h2>
          <p>Start with a process where urgency, complexity and value have already collided. In a focused working session, we will surface the opportunity, constraints and practical route to production.</p>
          <BrandButton href="/value-scan" variant="submit">
            Book a value scan
          </BrandButton>
        </div>
      </section>
    </main>
  );
}
