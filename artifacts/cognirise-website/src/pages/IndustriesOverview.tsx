import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Plus } from "lucide-react";
import { useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { INDUSTRIES } from "@/content/industries";
import { contentRecord, useCmsCollection } from "@/lib/cms";
import { SpatialDisclosure, SpatialDisclosureItem, SpatialDisclosureTrigger, SpatialDisclosurePanel } from "@/components/ui/spatial-disclosure";
import { PulseImage } from "@/components/ui/pulse-image";

function IndustriesHeroFilm() {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const poster = assetUrl("/images/cognirise/industries-hero-flight-poster.jpg");

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  return (
    <div
      className={`io-hero-film ${videoReady && !videoFailed ? "is-ready" : ""}`}
      style={{ backgroundImage: `url("${poster}")` }}
    >
      {!reducedMotion && !videoFailed && (
        <video
          className="io-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
        >
          <source src={assetUrl("/videos/cognirise/industries-hero-flight.mp4")} type="video/mp4" />
          <source src={assetUrl("/videos/cognirise/industries-hero-flight.webm")} type="video/webm" />
        </video>
      )}
      <p className="io-film-messages" aria-label="Pressure reveals the route. Intelligence finds its place. Move consequential work into production.">
        <span className="io-film-message io-film-message-1" aria-hidden="true">Pressure reveals the route.</span>
        <span className="io-film-message io-film-message-2" aria-hidden="true">Intelligence finds its place.</span>
        <span className="io-film-message io-film-message-3" aria-hidden="true">Move consequential work into production.</span>
      </p>
      <div className="io-film-static">Pressure reveals the route.</div>
    </div>
  );
}

export default function IndustriesOverview() {
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const industryQuery = useCmsCollection("industry", INDUSTRIES, (item) => ({
    ...contentRecord(item, "industry"),
    slug: item.slug,
  }));
  const industryRecords = industryQuery.data.length === 6
    ? industryQuery.data
    : industryQuery.isAuthoritative ? industryQuery.data : INDUSTRIES;
  const sectors = industryRecords.map((industry, index) => ({
    num: String(index + 1).padStart(2, "0"),
    title: industry.name,
    url: `/industries/${industry.slug}`,
    view: industry.thesis,
    copy: industry.dek,
  }));

  return (
    <div className="io">
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
.io{--ink:#102957;--ink2:#071936;--paper:#fdfcfb;--soft:#f1f3f7;--line:#cbd3e1;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}.io *{box-sizing:border-box}.io button{font:inherit}.io button,.io a{color:inherit;text-decoration:none;}.io :focus-visible{outline:3px solid var(--coral);outline-offset:4px}.io h1,.io h2,.io h3{font-family:Comfortaa,sans-serif}
.io-primary{border:1px solid var(--ink);cursor:pointer;color:#fff;background:var(--ink);font-weight:700;font-size:12px;padding:4px 4px 4px 17px;min-height:46px;display:inline-flex;align-items:center;gap:15px;position:relative;isolation:isolate;overflow:hidden;transition:transform .24s cubic-bezier(.2,.8,.2,1),box-shadow .24s}.io-primary:before{content:"";position:absolute;z-index:-2;inset:-1px;background:linear-gradient(105deg,var(--violet),var(--pink),var(--coral));opacity:0;transition:opacity .24s}.io-primary:after{content:"";position:absolute;z-index:-1;inset:1px;background:var(--ink);transition:background .24s}.io-primary svg{width:36px;height:36px;padding:10px;background:#fff;color:var(--ink);transition:transform .24s,background .24s,color .24s}.io-primary:hover{transform:translate(-3px,-3px);box-shadow:6px 6px 0 var(--coral)}.io-primary:hover:before{opacity:1}.io-primary:hover:after{background:rgba(7,25,54,.94)}.io-primary:hover svg{transform:translate(3px,-3px);background:var(--coral);color:#fff}
.io-kicker{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;display:flex;align-items:center;gap:10px}.io-kicker:before{content:"";width:23px;height:1px;background:linear-gradient(90deg,var(--violet),var(--coral))}
.io-hero{padding:23px 4.8vw 0}.io-hero-grid{min-height:660px;display:grid;grid-template-columns:.87fr 1.13fr;gap:4vw;align-items:end;padding:0 0 34px}.io-hero-copy{padding:0 0 29px;position:relative;z-index:1}.io-hero h1{font-size:clamp(53px,6.5vw,101px);font-weight:600;line-height:.93;letter-spacing:-.082em;margin:31px 0 29px;max-width:700px}.io-hero h1 em{font-style:normal;color:var(--pink)}.io-hero p{font-size:16px;line-height:1.62;color:#415779;max-width:435px;margin:0}.io-hero-image{height:595px;position:relative;overflow:hidden;background:var(--ink2);clip-path:polygon(10% 0,100% 0,100% 91%,0 100%,0 13%)}.io-hero-film{position:absolute;inset:0;background-color:var(--ink2);background-size:cover;background-position:center}.io-hero-video{width:100%;height:100%;display:block;object-fit:cover;object-position:center;opacity:0;transition:opacity .5s ease}.io-hero-film.is-ready .io-hero-video{opacity:1}.io-hero-film:after{content:"";pointer-events:none;position:absolute;z-index:1;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.5),transparent 52%),linear-gradient(0deg,rgba(7,25,54,.65),transparent 46%)}.io-film-messages{position:absolute;z-index:2;left:34px;right:11%;bottom:72px;color:var(--coral);min-height:74px}.io-film-message{position:absolute;left:0;bottom:0;max-width:450px;color:var(--coral);font:600 clamp(23px,2.6vw,39px)/1.08 Comfortaa,sans-serif;letter-spacing:-.055em;text-wrap:balance;text-shadow:0 2px 16px rgba(7,25,54,.72),0 1px 2px rgba(7,25,54,.88);opacity:0;transform:translateY(13px);filter:blur(3px)}.io-hero-film:not(.is-ready) .io-film-message{animation-play-state:paused}.io-film-message-1{animation:ioMessage1 16s linear infinite}.io-film-message-2{animation:ioMessage2 16s linear infinite}.io-film-message-3{animation:ioMessage3 16s linear infinite}.io-film-static{position:absolute;z-index:2;left:34px;right:11%;bottom:72px;max-width:450px;color:var(--coral);font:600 clamp(23px,2.6vw,39px)/1.08 Comfortaa,sans-serif;letter-spacing:-.055em;text-shadow:0 2px 16px rgba(7,25,54,.72),0 1px 2px rgba(7,25,54,.88)}.io-hero-film.is-ready .io-film-static{display:none}.io-cap{position:absolute;z-index:2;left:34px;bottom:27px;color:#fff;font-size:10px;letter-spacing:.12em;text-transform:uppercase}.io-cap span{display:block;opacity:.75;margin-bottom:8px}.io-rail{margin:0 4.8vw;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);display:grid;grid-template-columns:1.18fr 1fr 1fr}.io-rail div{padding:18px 20px;border-right:1px solid var(--line);font-size:12px;line-height:1.4}.io-rail div:last-child{border:0}.io-rail b{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;margin-bottom:8px;color:#6a7891}
.io-intro{padding:148px 4.8vw 112px;display:grid;grid-template-columns:.95fr 1.15fr;gap:8vw}.io-intro h2,.io-sectors h2{font-size:clamp(43px,5vw,77px);font-weight:600;line-height:.97;letter-spacing:-.08em;margin:24px 0 0}.io-intro h2 em{font-style:normal;color:var(--coral)}.io-intro-copy{border-top:1px solid var(--line);padding-top:22px;align-self:end;font-size:21px;line-height:1.44;color:#30486d;max-width:540px}.io-intro-copy p{margin:0}.io-intro-copy small{display:block;margin-top:23px;font-size:14px;line-height:1.55;color:#647491}
.io-chapter{margin:0 4.8vw;height:min(635px,51vw);min-height:480px;position:relative;overflow:hidden;background:var(--ink2)}.io-chapter img{height:100%;width:100%;object-fit:cover}.io-chapter:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.9),rgba(7,25,54,.04) 70%)}.io-chapter-copy{position:absolute;z-index:1;color:#fff;left:6%;bottom:11%;max-width:595px}.io-chapter h2{font-size:clamp(43px,5vw,78px);font-weight:600;letter-spacing:-.08em;line-height:.96;margin:16px 0}.io-chapter p{font-size:15px;line-height:1.58;color:#dce4f0;max-width:430px}.io-chapter-index{position:absolute;z-index:1;right:4%;top:34px;color:#fff;font-size:10px;letter-spacing:.12em;writing-mode:vertical-rl}
.io-sectors{padding:125px 4.8vw 116px}.io-sector-head{display:grid;grid-template-columns:1fr .72fr;gap:40px;align-items:end}.io-sector-lead{font-size:16px;line-height:1.58;color:#42587b;max-width:395px;margin:0}.io-list{margin-top:64px;border-top:1px solid var(--ink)}.io-sector{width:100%;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);text-align:left;display:flex;flex-direction:column;transition:background .25s}.io-sector:hover,.io-sector.active{background:#f1effb}.io-sector-trigger{appearance:none;background:transparent;border:none;color:inherit;font:inherit;text-align:left;display:grid;grid-template-columns:68px 1.05fr .95fr 34px;gap:20px;align-items:center;padding:25px 8px;width:100%;cursor:pointer;transition:padding .25s}.io-sector.active .io-sector-trigger,.io-sector:hover .io-sector-trigger{padding-left:21px}.io-sector-trigger>span{font-size:10px;letter-spacing:.1em;color:#71819a}.io-sector-trigger h3{margin:0;font-size:clamp(20px,2.2vw,31px);line-height:1.03;font-weight:600;letter-spacing:-.06em}.io-sector-trigger p{font-size:13px;line-height:1.48;margin:0;color:#536887;max-width:320px}.io-sector-trigger svg{justify-self:end}.io-sector.active .io-sector-trigger svg{color:var(--pink)}
.io-pair{background:#eef0f5;padding:0 4.8vw 121px}.io-pair-inner{display:grid;grid-template-columns:1fr 1fr;min-height:570px}.io-pair-copy{padding:90px 9% 55px 0}.io-pair h2{font-size:clamp(42px,5vw,75px);font-weight:600;line-height:.97;letter-spacing:-.08em;margin:20px 0 27px}.io-pair p{max-width:413px;font-size:16px;line-height:1.6;color:#3e567b}.io-points{margin-top:38px;border-top:1px solid var(--ink)}.io-points div{padding:12px 0;border-bottom:1px solid var(--line);font-size:13px;font-weight:600}.io-points span{display:inline-block;width:54px;color:var(--pink);font-size:10px;letter-spacing:.1em}.io-pair-image{margin-top:-44px;position:relative;overflow:hidden;clip-path:polygon(0 8%,100% 0,100% 100%,9% 92%)}.io-pair-image img{width:100%;height:100%;object-fit:cover}.io-pair-image:after{content:"interdependent systems";position:absolute;right:24px;bottom:23px;color:#fff;font-size:10px;letter-spacing:.11em;text-transform:uppercase}
.io-view{padding:120px 4.8vw}.io-view-top{border-top:1px solid var(--ink);padding-top:25px;display:flex;justify-content:space-between;align-items:end;gap:30px}.io-view h2{font-size:clamp(40px,4.8vw,70px);font-weight:600;line-height:.98;letter-spacing:-.08em;margin:14px 0 0}.io-view-top p{max-width:330px;font-size:14px;line-height:1.55;color:#536887}.io-views{display:grid;grid-template-columns:1fr 1fr;margin-top:52px;border-top:1px solid var(--line)}.io-view-link{display:flex;align-items:center;gap:18px;padding:21px 10px;border-bottom:1px solid var(--line);font:600 17px Comfortaa,sans-serif;letter-spacing:-.04em;text-decoration:none;color:inherit}.io-view-link:nth-child(odd){border-right:1px solid var(--line)}.io-view-link span{font:10px Inter,sans-serif;letter-spacing:.1em;color:#77859c}.io-view-link svg{margin-left:auto;color:var(--coral)}.io-view-link:hover{color:var(--pink)}.io-view-link:hover svg{color:var(--pink)}
.io-start{background:var(--ink);color:#fff;padding:104px 4.8vw 104px;position:relative}.io-start:before{content:"ROUTE";position:absolute;right:-10px;bottom:-18px;font:600 19vw/.7 Comfortaa,sans-serif;letter-spacing:-.11em;color:rgba(255,255,255,.06)}.io-start-inner{position:relative;z-index:1;max-width:970px}.io-start h2{font-size:clamp(52px,7.4vw,112px);font-weight:600;letter-spacing:-.095em;line-height:.88;margin:25px 0}.io-start h2 em{font-style:normal;color:#ff8470}.io-start p{font-size:17px;line-height:1.55;max-width:500px;color:#d6deed}.io-start .io-primary{border-color:transparent;background:linear-gradient(100deg,var(--violet),var(--pink),var(--coral));margin-top:20px;font-size:13px;padding-left:19px}.io-start .io-primary:before{background:#fff}.io-start .io-primary:after{background:transparent}.io-start .io-primary:hover{box-shadow:6px 6px 0 #fff}
@keyframes ioReveal{from{clip-path:inset(0 100% 0 0);transform:scale(1.04)}to{clip-path:inset(0);transform:scale(1)}}@keyframes ioMessage1{0%,4%{opacity:0;transform:translateY(13px);filter:blur(3px)}8%,26%{opacity:1;transform:none;filter:none}31%,92%{opacity:0;transform:translateY(-8px);filter:blur(2px)}96%,100%{opacity:1;transform:none;filter:none}}@keyframes ioMessage2{0%,29%{opacity:0;transform:translateY(13px);filter:blur(3px)}34%,54%{opacity:1;transform:none;filter:none}59%,100%{opacity:0;transform:translateY(-8px);filter:blur(2px)}}@keyframes ioMessage3{0%,57%{opacity:0;transform:translateY(13px);filter:blur(3px)}62%,84%{opacity:1;transform:none;filter:none}89%,100%{opacity:0;transform:translateY(-8px);filter:blur(2px)}}@media(prefers-reduced-motion:reduce){.io *,.io *:before,.io *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.io-hero-video,.io-film-messages{display:none}.io-film-static{display:block}}
@media(max-width:760px){.io-hero{padding:33px 21px 0}.io-hero-grid{display:flex;flex-direction:column;min-height:0;align-items:stretch;gap:32px;padding-bottom:25px}.io-hero-copy{padding:0}.io-hero h1{font-size:54px;margin:25px 0 22px}.io-hero p{font-size:15px}.io-hero-image{height:440px;clip-path:polygon(11% 0,100% 0,100% 91%,0 100%,0 12%)}.io-hero-video{object-position:52% center}.io-film-messages,.io-film-static{left:23px;right:25px;bottom:70px}.io-film-message,.io-film-static{font-size:26px;max-width:330px}.io-cap{left:23px;bottom:25px}.io-rail{margin:0 21px;grid-template-columns:1fr 1fr}.io-rail div{padding:16px 12px}.io-rail div:last-child{grid-column:span 2;border-top:1px solid var(--line)}.io-rail div:nth-child(2){border-right:0}.io-intro{padding:86px 21px 73px;display:block}.io-intro h2{font-size:42px}.io-intro-copy{margin-top:43px;font-size:18px}.io-chapter{margin:0;height:520px;min-height:0}.io-chapter-copy{left:23px;right:23px;bottom:29px}.io-chapter h2{font-size:42px}.io-sectors{padding:82px 21px}.io-sector-head{display:block}.io-sectors h2{font-size:43px}.io-sector-lead{margin-top:29px}.io-list{margin-top:42px}.io-sector-trigger{grid-template-columns:35px 1fr 25px;gap:12px;padding:20px 0}.io-sector-trigger p{display:none}.io-sector-trigger h3{font-size:21px}.io-pair{padding:0 21px 78px}.io-pair-inner{display:flex;flex-direction:column;min-height:0}.io-pair-copy{padding:76px 0 42px}.io-pair h2{font-size:43px}.io-pair-image{margin:0;height:390px}.io-view{padding:0 21px 81px}.io-view-top{display:block}.io-view h2{font-size:42px}.io-view-top p{margin-top:24px}.io-views{display:block;margin-top:36px}.io-view-link{font-size:16px}.io-view-link:nth-child(odd){border-right:0}.io-start{padding:77px 21px 77px}.io-start h2{font-size:57px}}
      `}</style>

      <section className="io-hero">
        <div className="io-kicker">{marketLocation} / Industries</div>
        <div className="io-hero-grid">
          <div className="io-hero-copy">
            <h1>Pressure reveals where intelligence <em>belongs.</em></h1>
            <p>Cognirise combines AI-native advisory, forward-deployed engineering and governed agents to move consequential work into production—where speed matters and control cannot be an afterthought.</p>
          </div>
          <div className="io-hero-image">
            <IndustriesHeroFilm />
            <div className="io-cap">
              <span>01 / operating environments</span>
              Intelligence with a place to work
            </div>
          </div>
        </div>
      </section>

      <section className="io-rail" aria-label="Industry focus">
        <div><b>Built for</b><strong>Consequential enterprise work</strong></div>
        <div><b>Working where</b><strong>Urgency meets scrutiny</strong></div>
        <div><b>Starting point</b><strong>One process under pressure</strong></div>
      </section>

      <section className="io-intro">
        <div>
          <div className="io-kicker">The Cognirise point of view</div>
          <h2>The sector is the context. The work is the <em>question.</em></h2>
        </div>
        <div className="io-intro-copy">
          <p>Each industry carries its own obligations: trust, sovereignty, continuity, safety, service. We begin there—not with a generic AI pattern.</p>
          <small>Our teams work with the constraints already shaping the operating environment, then build a governed route from priority problem to production value.</small>
        </div>
      </section>

      <section className="io-chapter">
        <PulseImage src={assetUrl("/images/cognirise/site-financial.jpg")} alt="A secure financial mechanism with a vivid intelligence route moving through it." className="w-full h-full object-cover" />
        <div className="io-chapter-copy">
          <div className="io-kicker">Trust at speed</div>
          <h2>Make controls part of the flow.</h2>
          <p>In financial services and critical industries, intelligence only earns its place when it can work with the standards, data and accountability already in motion.</p>
        </div>
        <div className="io-chapter-index">02 / governed movement</div>
      </section>

      <section className="io-sectors" id="industries">
        <div className="io-sector-head">
          <div>
            <div className="io-kicker">Industry points of view</div>
            <h2>Different pressure. One accountable route.</h2>
          </div>
          <p className="io-sector-lead">Explore where the work is consequential—and where the right combination of people, systems and agents can shift it.</p>
        </div>
        <SpatialDisclosure defaultValue="00" preview className="io-list">
          {sectors.map((s, index) => {
            const id = String(index).padStart(2, "0");
            return (
              <SpatialDisclosureItem key={s.title} id={id} className={({ isActive }) => `io-sector ${isActive ? "active" : ""}`}>
                {({ isActive }) => (
                  <>
                    <SpatialDisclosureTrigger id={id} className="io-sector-trigger">
                      <span>{s.num}</span>
                      <h3>{s.title}</h3>
                      <p>{s.view}</p>
                      {isActive ? <Plus size={18} /> : <ArrowRight size={18} />}
                    </SpatialDisclosureTrigger>
                    <SpatialDisclosurePanel id={id} className="data-[state=inactive]:hidden pb-6 pl-[96px] pr-8 max-[760px]:pl-[55px] max-[760px]:pr-0">
                      <p className="text-[14px] leading-[1.58] text-[#536887] m-0 max-w-[500px]">{s.copy}</p>
                    </SpatialDisclosurePanel>
                  </>
                )}
              </SpatialDisclosureItem>
            );
          })}
        </SpatialDisclosure>
      </section>

      <section className="io-pair">
        <div className="io-pair-inner">
          <div className="io-pair-copy">
            <div className="io-kicker">Critical infrastructure</div>
            <h2>Work that cannot pause needs intelligence that can hold.</h2>
            <p>Across telecoms, energy, travel and complex enterprises, the systems that serve customers and communities are deeply interdependent. The route forward has to respect that reality.</p>
            <div className="io-points">
              <div><span>01</span>See the operational constraint</div>
              <div><span>02</span>Design for the people in the work</div>
              <div><span>03</span>Govern movement through the system</div>
            </div>
          </div>
          <div className="io-pair-image">
            <PulseImage src={assetUrl("/images/cognirise/site-infrastructure.jpg")} alt="Connected infrastructure routes carrying luminous intelligence across a large operating landscape." className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      <section className="io-view">
        <div className="io-view-top">
          <div>
            <div className="io-kicker">Find your operating context</div>
            <h2>Begin where the pressure is already visible.</h2>
          </div>
          <p>We do not need a blank page. Bring the process, service or operating decision where value and complexity have already collided.</p>
        </div>
        <div className="io-views">
          {sectors.map((s) => (
            <Link className="io-view-link" href={s.url} key={s.title}>
              <span>{s.num}</span>{s.title}<ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>

      <section className="io-start" id="start">
        <div className="io-start-inner">
          <div className="io-kicker">The first move</div>
          <h2>Bring one process.<br /><em>Leave with a route.</em></h2>
          <p>Start with a process where urgency, complexity and value have already collided. In one focused working session, we will surface the opportunity, constraints and practical route to production.</p>
          <Link href="/value-scan" className="io-primary">Book a value scan <ArrowRight size={16} /></Link>
        </div>
      </section>
    </div>
  );
}
