import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { IndustryPicker } from "@/components/IndustryPicker";
import { useEffect, useRef, useState } from "react";
import { contentRecord, useCmsCollection, usePublishedHeroFilm } from "@/lib/cms";
import { CaseStudyRail, type PublicCaseStudy } from "@/components/work/case-study-ui";
import { approvedPublishedCases } from "@/components/work/case-study-model";
import { BrandButton } from "@/components/ui/brand-button";

function IndustriesHeroFilm() {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const film = usePublishedHeroFilm("industries", {
    mp4: assetUrl("/videos/cognirise/industries-hero-flight.mp4"),
    webm: assetUrl("/videos/cognirise/industries-hero-flight.webm"),
    poster: assetUrl("/images/cognirise/industries-hero-flight-poster.jpg"),
  });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    setVideoReady(false);
    setVideoFailed(false);
  }, [film.mp4, film.webm, film.poster]);

  useEffect(() => {
    if (reducedMotion) return;
    const playbackAttempt = window.setTimeout(() => {
      const video = videoRef.current;
      if (!video || !video.paused) return;
      void video.play().catch(() => setVideoFailed(true));
    }, 250);
    const loadingGuard = window.setTimeout(() => {
      if ((videoRef.current?.readyState ?? 0) < HTMLMediaElement.HAVE_CURRENT_DATA) {
        setVideoFailed(true);
      }
    }, 8000);
    return () => {
      window.clearTimeout(playbackAttempt);
      window.clearTimeout(loadingGuard);
    };
  }, [reducedMotion, film.mp4, film.webm]);

  return (
    <div
      className={`io-hero-film ${videoReady && !videoFailed ? "is-ready" : ""}`}
      style={{ backgroundImage: `url("${film.poster}")` }}
    >
      {!reducedMotion && !videoFailed && (
        <video
          ref={videoRef}
          key={`${film.mp4}:${film.webm}:${film.poster}`}
          className="io-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={film.poster}
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
        >
          <source src={film.mp4} type="video/mp4" />
          <source src={film.webm} type="video/webm" />
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
  const marketLocation = getMarketLocationLabel(market);
  const caseStudies = useCmsCollection<PublicCaseStudy>("case-study", [], (item) => {
    const record = contentRecord(item, "case-study") as PublicCaseStudy;
    return record;
  });
  const approvedCases = approvedPublishedCases(caseStudies.data);

  return (
    <div className="io">
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
.io{--ink:#102957;--ink2:#071936;--paper:#fdfcfb;--soft:#f1f3f7;--line:#cbd3e1;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}.io *{box-sizing:border-box}.io button{font:inherit}.io button,.io a{color:inherit;text-decoration:none;}.io :focus-visible{outline:3px solid var(--coral);outline-offset:4px}.io h1,.io h2,.io h3{font-family:Comfortaa,sans-serif}
.io-kicker{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;display:flex;align-items:center;gap:10px}.io-kicker:before{content:"";width:23px;height:1px;background:linear-gradient(90deg,var(--violet),var(--coral))}
.io-hero{padding:23px 4.8vw 0}.io-hero-grid{min-height:660px;display:grid;grid-template-columns:.87fr 1.13fr;gap:4vw;align-items:end;padding:0 0 34px}.io-hero-copy{padding:0 0 29px;position:relative;z-index:1}.io-hero h1{font-size:clamp(53px,6.5vw,101px);font-weight:600;line-height:.93;letter-spacing:-.082em;margin:31px 0 29px;max-width:700px}.io-hero h1 em{font-style:normal;color:var(--pink)}.io-hero p{font-size:16px;line-height:1.62;color:#415779;max-width:435px;margin:0}.io-hero-image{height:595px;position:relative;overflow:hidden;background:var(--ink2);clip-path:polygon(10% 0,100% 0,100% 91%,0 100%,0 13%)}.io-hero-film{position:absolute;inset:0;background-color:var(--ink2);background-size:cover;background-position:center}.io-hero-video{width:100%;height:100%;display:block;object-fit:cover;object-position:center;opacity:0;transition:opacity .5s ease}.io-hero-film.is-ready .io-hero-video{opacity:1}.io-hero-film:after{content:"";pointer-events:none;position:absolute;z-index:1;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.5),transparent 52%),linear-gradient(0deg,rgba(7,25,54,.65),transparent 46%)}.io-film-messages{position:absolute;z-index:2;left:34px;right:11%;bottom:72px;color:var(--coral);min-height:74px}.io-film-message{position:absolute;left:0;bottom:0;max-width:450px;color:var(--coral);font:600 clamp(23px,2.6vw,39px)/1.08 Comfortaa,sans-serif;letter-spacing:-.055em;text-wrap:balance;text-shadow:0 2px 16px rgba(7,25,54,.72),0 1px 2px rgba(7,25,54,.88);opacity:0;transform:translateY(13px);filter:blur(3px)}.io-hero-film:not(.is-ready) .io-film-message{animation-play-state:paused}.io-film-message-1{animation:ioMessage1 16s linear infinite}.io-film-message-2{animation:ioMessage2 16s linear infinite}.io-film-message-3{animation:ioMessage3 16s linear infinite}.io-film-static{position:absolute;z-index:2;left:34px;right:11%;bottom:72px;max-width:450px;color:var(--coral);font:600 clamp(23px,2.6vw,39px)/1.08 Comfortaa,sans-serif;letter-spacing:-.055em;text-shadow:0 2px 16px rgba(7,25,54,.72),0 1px 2px rgba(7,25,54,.88)}.io-hero-film.is-ready .io-film-static{display:none}.io-cap{position:absolute;z-index:2;left:34px;bottom:27px;color:#fff;font-size:10px;letter-spacing:.12em;text-transform:uppercase}.io-cap span{display:block;opacity:.75;margin-bottom:8px}.io-rail{margin:0 4.8vw;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);display:grid;grid-template-columns:1.18fr 1fr 1fr}.io-rail div{padding:18px 20px;border-right:1px solid var(--line);font-size:12px;line-height:1.4}.io-rail div:last-child{border:0}.io-rail b{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;margin-bottom:8px;color:#6a7891}
.io-intro{padding:148px 4.8vw 112px;display:grid;grid-template-columns:.95fr 1.15fr;gap:8vw}.io-intro h2{font-size:clamp(43px,5vw,77px);font-weight:600;line-height:.97;letter-spacing:-.08em;margin:24px 0 0}.io-intro h2 em{font-style:normal;color:var(--coral)}.io-intro-copy{border-top:1px solid var(--line);padding-top:22px;align-self:end;font-size:21px;line-height:1.44;color:#30486d;max-width:540px}.io-intro-copy p{margin:0}.io-intro-copy small{display:block;margin-top:23px;font-size:14px;line-height:1.55;color:#647491}
.io-capability{background:#eef0f5;padding:105px 4.8vw 112px}.io-capability-head{display:grid;grid-template-columns:1fr 1fr;gap:7vw;align-items:end}.io-capability h2{font-size:clamp(42px,5vw,75px);font-weight:600;line-height:.97;letter-spacing:-.08em;margin:20px 0 0}.io-capability-lead{max-width:470px;font-size:17px;line-height:1.58;color:#30486d;margin:0}.io-capability-grid{display:grid;grid-template-columns:repeat(4,1fr);margin-top:54px;border-top:1px solid var(--ink)}.io-capability-card{padding:25px 24px 8px 0;border-right:1px solid var(--line);min-height:190px}.io-capability-card+.io-capability-card{padding-left:24px}.io-capability-card:last-child{border-right:0}.io-capability-card span{display:block;color:var(--pink);font-size:10px;font-weight:700;letter-spacing:.11em;margin-bottom:22px}.io-capability-card h3{font-size:18px;line-height:1.15;letter-spacing:-.04em;margin:0 0 12px}.io-capability-card p{font-size:13px;line-height:1.55;color:#536887;margin:0}
 .io-start{background:var(--ink);color:#fff;padding:104px 4.8vw 104px;position:relative}.io-start:before{content:"ROUTE";position:absolute;right:-10px;bottom:-18px;font:600 19vw/.7 Comfortaa,sans-serif;letter-spacing:-.11em;color:rgba(255,255,255,.06)}.io-start-inner{position:relative;z-index:1;max-width:970px}.io-start h2{font-size:clamp(52px,7.4vw,112px);font-weight:600;letter-spacing:-.095em;line-height:.88;margin:25px 0}.io-start h2 em{font-style:normal;color:#ff8470}.io-start p{font-size:17px;line-height:1.55;max-width:500px;color:#d6deed}
@keyframes ioReveal{from{clip-path:inset(0 100% 0 0);transform:scale(1.04)}to{clip-path:inset(0);transform:scale(1)}}@keyframes ioMessage1{0%,4%{opacity:0;transform:translateY(13px);filter:blur(3px)}8%,26%{opacity:1;transform:none;filter:none}31%,92%{opacity:0;transform:translateY(-8px);filter:blur(2px)}96%,100%{opacity:1;transform:none;filter:none}}@keyframes ioMessage2{0%,29%{opacity:0;transform:translateY(13px);filter:blur(3px)}34%,54%{opacity:1;transform:none;filter:none}59%,100%{opacity:0;transform:translateY(-8px);filter:blur(2px)}}@keyframes ioMessage3{0%,57%{opacity:0;transform:translateY(13px);filter:blur(3px)}62%,84%{opacity:1;transform:none;filter:none}89%,100%{opacity:0;transform:translateY(-8px);filter:blur(2px)}}@media(prefers-reduced-motion:reduce){.io *,.io *:before,.io *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.io-hero-video,.io-film-messages{display:none}.io-film-static{display:block}}
@media(max-width:760px){.io-hero{padding:33px 21px 0}.io-hero-grid{display:flex;flex-direction:column;min-height:0;align-items:stretch;gap:32px;padding-bottom:25px}.io-hero-copy{padding:0}.io-hero h1{font-size:54px;margin:25px 0 22px}.io-hero p{font-size:15px}.io-hero-image{height:440px;clip-path:polygon(11% 0,100% 0,100% 91%,0 100%,0 12%)}.io-hero-video{object-position:52% center}.io-film-messages,.io-film-static{left:23px;right:25px;bottom:70px}.io-film-message,.io-film-static{font-size:26px;max-width:330px}.io-cap{left:23px;bottom:25px}.io-rail{margin:0 21px;grid-template-columns:1fr 1fr}.io-rail div{padding:16px 12px}.io-rail div:last-child{grid-column:span 2;border-top:1px solid var(--line)}.io-rail div:nth-child(2){border-right:0}.io-intro{padding:86px 21px 73px;display:block}.io-intro h2{font-size:42px}.io-intro-copy{margin-top:43px;font-size:18px}.io-capability{padding:78px 21px}.io-capability-head{display:block}.io-capability h2{font-size:43px}.io-capability-lead{margin-top:28px}.io-capability-grid{grid-template-columns:1fr 1fr;margin-top:40px}.io-capability-card{padding:22px 18px 24px 0;min-height:0;border-bottom:1px solid var(--line)}.io-capability-card+.io-capability-card{padding-left:18px}.io-capability-card:nth-child(2){border-right:0}.io-capability-card:nth-child(n+3){border-bottom:0}.io-start{padding:77px 21px 77px}.io-start h2{font-size:57px}}
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

      <IndustryPicker
        id="industries"
        kicker="Industry points of view"
        heading="Different pressure. One accountable route."
        introduction="Explore where the work is consequential—and where the right combination of people, systems and agents can shift it."
        compact
      />

      {caseStudies.delivery === "loading" ? (
        <section className="case-study-rail" id="selected-work" tabIndex={-1} aria-labelledby="case-studies-title" aria-busy="true">
          <div className="case-study-rail__heading"><span className="case-study-rail__kicker">Cross-sector delivery</span><h2 id="case-studies-title">Case studies</h2><p role="status">Loading approved case studies…</p></div>
        </section>
      ) : caseStudies.issue ? (
        <section className="case-study-rail" id="selected-work" tabIndex={-1} aria-labelledby="case-studies-title">
          <div className="case-study-rail__heading"><span className="case-study-rail__kicker">Cross-sector delivery</span><h2 id="case-studies-title">Case studies</h2><p role="alert">Approved case studies are temporarily unavailable. Please try again later.</p></div>
        </section>
      ) : approvedCases.length ? (
        <CaseStudyRail cases={approvedCases} />
      ) : (
        <section className="case-study-rail" id="selected-work" tabIndex={-1} aria-labelledby="case-studies-title">
          <div className="case-study-rail__heading"><span className="case-study-rail__kicker">Cross-sector delivery</span><h2 id="case-studies-title">Case studies</h2><p role="status">No approved case studies are currently published for this market.</p></div>
        </section>
      )}

      <section className="io-capability">
        <div className="io-capability-head">
          <div>
            <div className="io-kicker">One cross-industry capability</div>
            <h2>Build intelligence that can act—and be trusted.</h2>
          </div>
          <p className="io-capability-lead">Across sectors, we connect strategy to production through a single accountable delivery model: the platform, controls, engineering and operating capability move together.</p>
        </div>
        <div className="io-capability-grid">
          <article className="io-capability-card">
            <span>01</span>
            <h3>Agentic platforms</h3>
            <p>Governed agents and reusable platform services turn priority workflows into durable operating capability.</p>
          </article>
          <article className="io-capability-card">
            <span>02</span>
            <h3>Sovereign & regulated AI</h3>
            <p>Architecture respects residency, authority, assurance and the obligations specific to each environment.</p>
          </article>
          <article className="io-capability-card">
            <span>03</span>
            <h3>AI-native consulting & engineering</h3>
            <p>Senior operators and forward-deployed engineers carry decisions through to working production systems.</p>
          </article>
          <article className="io-capability-card">
            <span>04</span>
            <h3>Responsible delivery</h3>
            <p>Human accountability, measurable value and capability transfer are designed into every release.</p>
          </article>
        </div>
      </section>

      <section className="io-start" id="start">
        <div className="io-start-inner">
          <div className="io-kicker">The first move</div>
          <h2>Bring one process.<br /><em>Leave with a route.</em></h2>
          <p>Start with a process where urgency, complexity and value have already collided. In one focused working session, we will surface the opportunity, constraints and practical route to production.</p>
          <BrandButton href="/value-scan" variant="inverse" className="mt-5">Book a value scan</BrandButton>
        </div>
      </section>
    </div>
  );
}
