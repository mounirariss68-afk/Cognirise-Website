import { Link } from "wouter";
import { ArrowDown, ArrowRight, Plus } from "lucide-react";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { scrollToSection } from "@/lib/motion";
import { contentRecord, useCmsCollection } from "@/lib/cms";
import { useDynamicMetadata } from "@/lib/metadata";
import { SpatialDisclosure, SpatialDisclosureItem, SpatialDisclosureTrigger, SpatialDisclosurePanel } from "@/components/ui/spatial-disclosure";
import { PulseImage } from "@/components/ui/pulse-image";
import { useGovernedLanding } from "@/components/GovernedLandingRoute";
import { landingCta, landingMedia, landingNarrative, landingSeo, landingText } from "@/lib/cms";
import { WorkLibrary, type PublicCaseStudy } from "@/components/work/case-study-ui";

const patternFallback = [{
  title: "One process under pressure.",
  copy: "The record follows the mandate through constraints, build decisions, governed release and the outcome measures that the sponsor can stand behind.",
}];

export default function WorkProof() {
  const governedLanding = useGovernedLanding();
  const governedHero = governedLanding ? landingNarrative(governedLanding, "hero") : null;
  const heroVisual = landingMedia(governedLanding, "work-hero-visual", { src: assetUrl("/images/cognirise/site-work-proof.jpg"), alt: "A vivid violet-to-coral route moving through a white architectural model." });
  const proofRouteVisual = landingMedia(governedLanding, "work-proof-route-visual", { src: assetUrl("/images/cognirise/pulse-breakthrough.jpg"), alt: "A violet and coral current cutting through an architectural maze." });
  const outcomesVisual = landingMedia(governedLanding, "work-outcomes-visual", { src: assetUrl("/images/cognirise/cognirise-pulse-outcomes.jpg"), alt: "A coral route passing through a violet arch and a navy structure." });
  const patternVisual = landingMedia(governedLanding, "work-pattern-visual", { src: assetUrl("/images/cognirise/site-work-proof.jpg"), alt: "An architectural route joining different operating environments." });
  const heroProofCta = landingCta(governedLanding, "work-hero-proof-cta", { label: "See the proof model", href: "/work#proof" });
  const heroProcessCta = landingCta(governedLanding, "work-hero-process-cta", { label: "Bring one process", href: "/value-scan" });
  const closingCta = landingCta(governedLanding, "work-closing-cta", { label: "Book a value scan", href: "/value-scan" });
  const { market } = useMarketStore();
  const caseStudies = useCmsCollection<PublicCaseStudy>("case-study", [], (item) => {
    const record = contentRecord(item, "case-study") as PublicCaseStudy;
    return record.disclosure === "restricted" ? null : record;
  });
  const patterns = useCmsCollection("case-study", patternFallback, (item) => {
    const content = contentRecord(item, "case-study");
    return { title: item.title, copy: content.outcomes[0] || item.summary || "" };
  });
  const governedSeo = governedLanding ? landingSeo(governedLanding) : undefined;
  useDynamicMetadata({
    title: governedSeo?.title || "How Cognirise Delivers AI Transformation",
    description: governedSeo?.description || "See how Cognirise frames, builds and governs consequential AI transformation work.",
    canonicalUrl: governedSeo?.canonicalUrl,
    noIndex: governedSeo?.noIndex,
  });
  const featuredPattern = patterns.data[0];
  const proofPrinciples = [
    ["work-proof-starting-point-label", "Starting point", "work-proof-starting-point-value", "One consequential process"],
    ["work-proof-surface-label", "What we surface", "work-proof-surface-value", "Constraints before the build"],
    ["work-proof-change-label", "What changes", "work-proof-change-value", "Working systems, not slides"],
    ["work-proof-durability-label", "How it lasts", "work-proof-durability-value", "Governance in the flow"],
  ];
  const deliveryStages = [
    ["01", "work-ledger-mandate-heading", "Mandate", "work-ledger-mandate-body", "The priority work, the sponsor question and what a useful change needs to achieve."],
    ["02", "work-ledger-constraints-heading", "Constraints", "work-ledger-constraints-body", "The data, architecture, security, sovereignty and operating realities that define the possible."],
    ["03", "work-ledger-build-heading", "Build", "work-ledger-build-body", "Forward-deployed operators and engineers turn the route into a working system with the people who will run it."],
    ["04", "work-ledger-production-heading", "Governed production", "work-ledger-production-body", "Controls, ownership and accountability are embedded where the work happens—not added at the end."],
  ];
  const outcomes = [
    ["01", "work-outcomes-cost", "Cost"],
    ["02", "work-outcomes-capacity", "Capacity"],
    ["03", "work-outcomes-speed", "Speed"],
    ["04", "work-outcomes-risk", "Risk"],
  ];
  
  const marketLocation = getMarketLocationLabel(market);
  const closingHeading = landingText(governedLanding, "work-closing-heading", "Bring one process. Make the proof useful.");
  const [closingHeadingLead, ...closingHeadingRemainder] = closingHeading.split(/(?<=\.)\s+/);

  const goTo = scrollToSection;

  return (
    <main className="wp">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .wp{--ink:#102957;--deep:#071936;--paper:#fdfcfb;--mist:#f0f2f6;--line:#cbd3e1;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}
        .wp *{box-sizing:border-box}
        .wp button{font:inherit}
        .wp a{color:inherit;text-decoration:none}
        .wp :focus-visible{outline:3px solid var(--coral);outline-offset:4px}
        .wp-primary{border:1px solid var(--ink);cursor:pointer;color:#fff;background:var(--ink);font-weight:700;font-size:12px;padding:4px 4px 4px 17px;min-height:46px;display:inline-flex;align-items:center;gap:15px;position:relative;isolation:isolate;overflow:hidden;transition:transform .24s cubic-bezier(.2,.8,.2,1),box-shadow .24s}
        .wp-primary:before{content:"";position:absolute;z-index:-2;inset:-1px;background:linear-gradient(105deg,var(--violet),var(--pink),var(--coral));opacity:0;transition:opacity .24s}
        .wp-primary:after{content:"";position:absolute;z-index:-1;inset:1px;background:var(--ink);transition:background .24s}
        .wp-primary svg{width:36px;height:36px;padding:10px;background:#fff;color:var(--ink);transition:transform .24s,background .24s,color .24s}
        .wp-primary:hover{transform:translate(-3px,-3px);box-shadow:6px 6px 0 var(--coral)}
        .wp-primary:hover:before{opacity:1}
        .wp-primary:hover svg{transform:translate(3px,-3px);background:var(--coral);color:#fff}
        .wp-kicker{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;display:flex;gap:10px;align-items:center}
        .wp-kicker:before{content:"";width:23px;height:1px;background:linear-gradient(90deg,var(--violet),var(--coral))}
        .wp-hero{padding:23px 4.8vw 0}
        .wp-hero-grid{min-height:685px;display:grid;grid-template-columns:.82fr 1.18fr;gap:36px;align-items:end;padding-bottom:34px}
        .wp-hero-copy{padding-bottom:25px;position:relative;z-index:2}
        .wp h1,.wp h2,.wp h3{font-family:Comfortaa,sans-serif}
        .wp h1{font-size:clamp(50px,6.6vw,101px);letter-spacing:-.08em;line-height:.93;font-weight:600;margin:31px 0 28px;max-width:700px}
        .wp h1 em,.wp h2 em{font-style:normal;color:var(--pink)}
        .wp-hero-copy p{max-width:440px;font-size:16px;line-height:1.62;color:#415779;margin:0 0 30px}
        .wp-under{border:0;border-bottom:1px solid var(--ink);padding:8px 0;background:none;color:var(--ink);font-weight:700;font-size:12px;display:inline-flex;gap:9px;align-items:center;margin-left:17px;cursor:pointer}
        .wp-under:hover{color:var(--pink);border-color:var(--pink)}
        .wp-hero-art{height:638px;overflow:hidden;position:relative;background:var(--deep);clip-path:polygon(10% 0,100% 0,100% 91%,0 100%,0 12%)}
        .wp-hero-art img{width:100%;height:100%;object-fit:cover}
        .wp-hero-art:after{content:"";inset:0;position:absolute;background:linear-gradient(90deg,rgba(7,25,54,.4),transparent 54%),linear-gradient(0deg,rgba(7,25,54,.5),transparent 40%)}
        .wp-hero-word{position:absolute;z-index:1;right:-6px;top:50px;color:#fff;font:600 clamp(61px,9.5vw,155px)/.8 Comfortaa,sans-serif;letter-spacing:-.11em;mix-blend-mode:overlay}
        .wp-caption{position:absolute;z-index:1;bottom:29px;left:34px;color:white;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
        .wp-caption span{display:block;opacity:.72;margin-bottom:8px}
        .wp-proof{margin:0 4.8vw;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);display:grid;grid-template-columns:repeat(4,1fr)}
        .wp-proof div{padding:18px 20px;border-right:1px solid var(--line);font-size:12px;line-height:1.4}
        .wp-proof div:last-child{border:0}
        .wp-proof b{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:#6a7891;margin-bottom:8px}
        .wp-intro{padding:145px 4.8vw 105px;display:grid;grid-template-columns:1fr 1.1fr;gap:7vw}
        .wp-intro h2,.wp-outcome h2{font-size:clamp(42px,5.1vw,78px);line-height:.98;letter-spacing:-.08em;font-weight:600;margin:23px 0 0}
        .wp-intro-copy{align-self:end;border-top:1px solid var(--line);padding-top:22px;font-size:21px;line-height:1.46;color:#30486d;max-width:540px}
        .wp-intro-copy small{display:block;margin-top:23px;color:#647491;font-size:12px;line-height:1.55}
        .wp-image-break{margin:0 4.8vw;height:min(620px,48vw);min-height:470px;position:relative;overflow:hidden;background:var(--deep)}
        .wp-image-break img{width:100%;height:100%;object-fit:cover}
        .wp-image-break:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.85),rgba(7,25,54,.06) 74%)}
        .wp-break-copy{position:absolute;z-index:1;left:6%;bottom:11%;color:white;max-width:620px}
        .wp-break-copy h2{font-size:clamp(42px,5.1vw,76px);line-height:.97;letter-spacing:-.08em;font-weight:600;margin:18px 0}
        .wp-break-copy p{line-height:1.6;color:#dce4f0;max-width:470px}
        .wp-break-no{position:absolute;z-index:2;right:4%;top:34px;color:#fff;font-size:10px;letter-spacing:.12em;writing-mode:vertical-rl}
        .wp-ledger{padding:124px 4.8vw}
        .wp-ledger-head{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:end}
        .wp-ledger h2{font-size:clamp(42px,5vw,73px);line-height:.98;letter-spacing:-.08em;font-weight:600;margin:20px 0 0}
        .wp-ledger-lead{font-size:16px;line-height:1.58;max-width:410px;color:#42587b;margin:0}
        .wp-stages{margin-top:63px;border-top:1px solid var(--ink)}
        .wp-outcome{background:var(--mist);padding:0 4.8vw 115px}
        .wp-outcome-wrap{display:grid;grid-template-columns:1fr 1fr;gap:5vw;min-height:560px}
        .wp-outcome-copy{padding:88px 0 45px}
        .wp-outcome-copy p{color:#3e567b;max-width:400px;font-size:16px;line-height:1.6}
        .wp-outcome-image{margin-top:-42px;clip-path:polygon(0 8%,100% 0,100% 100%,9% 92%);overflow:hidden}
        .wp-outcome-image img{width:100%;height:100%;object-fit:cover}
        .wp-outcome-grid{margin-top:38px;border-top:1px solid var(--ink);display:grid;grid-template-columns:1fr 1fr}
        .wp-outcome-grid div{padding:15px 10px;border-bottom:1px solid var(--line);font-size:15px;font-weight:600}
        .wp-outcome-grid div:nth-child(odd){border-right:1px solid var(--line)}
        .wp-outcome-grid span{display:block;color:var(--pink);font-size:10px;letter-spacing:.1em;margin-bottom:7px}
        .wp-note{padding:115px 4.8vw 132px}
        .wp-note-head{border-top:1px solid var(--ink);padding-top:25px;display:flex;justify-content:space-between;gap:30px;align-items:end}
        .wp-note h2{font-size:clamp(41px,5vw,72px);line-height:.98;letter-spacing:-.08em;font-weight:600;margin:13px 0 0;max-width:730px}
        .wp-note-head p{max-width:300px;font-size:14px;line-height:1.55;color:#536887}
        .wp-note-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:13px;margin-top:48px}
        .wp-note-image{height:460px;overflow:hidden;position:relative;background:var(--deep)}
        .wp-note-image img{width:100%;height:100%;object-fit:cover;transition:transform .7s}
        .wp-note-image:hover img{transform:scale(1.05)}
        .wp-note-image:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(7,25,54,.72),transparent 55%)}
        .wp-note-image figcaption{position:absolute;z-index:1;bottom:22px;left:24px;color:#fff}
        .wp-note-image span{font-size:10px;letter-spacing:.12em;text-transform:uppercase;display:block;margin-bottom:8px}
        .wp-note-image strong{font:600 clamp(24px,3vw,43px)/1 Comfortaa,sans-serif;letter-spacing:-.06em}
        .wp-pattern{background:var(--deep);color:#fff;padding:43px 38px;display:flex;flex-direction:column;justify-content:space-between}
        .wp-pattern p{font:600 31px/1.1 Comfortaa,sans-serif;letter-spacing:-.06em;margin:25px 0}
        .wp-pattern small{color:#b9c6da;line-height:1.55;font-size:12px}
        .wp-start{background:var(--ink);color:#fff;padding:103px 4.8vw 28px;position:relative}
        .wp-start:before{content:"WORK";position:absolute;right:-10px;bottom:-18px;font:600 19vw/.7 Comfortaa,sans-serif;letter-spacing:-.11em;color:rgba(255,255,255,.06)}
        .wp-start-in{position:relative;z-index:1;max-width:970px}
        .wp-start h2{font-size:clamp(52px,7.5vw,112px);font-weight:600;letter-spacing:-.095em;line-height:.88;margin:26px 0}
        .wp-start p{font-size:17px;line-height:1.55;max-width:500px;color:#d6deed}
        .wp-start .wp-primary{margin-top:20px;background:linear-gradient(100deg,var(--violet),var(--pink),var(--coral));border:0}
        .wp-start .wp-primary:after{background:transparent}
        @media(max-width:760px){
          .wp-hero{padding:33px 21px 0}
          .wp-hero-grid{display:flex;flex-direction:column;min-height:0;gap:32px;padding-bottom:25px}
          .wp h1{font-size:54px}
          .wp-hero-art{height:440px}
          .wp-hero-word{font-size:71px}
          .wp-proof{margin:0 21px;grid-template-columns:1fr 1fr}
          .wp-proof div{padding:16px 12px}
          .wp-proof div:nth-child(2){border-right:0}
          .wp-proof div:nth-child(-n+2){border-bottom:1px solid var(--line)}
          .wp-intro{padding:86px 21px 73px;display:block}
          .wp-intro h2,.wp-outcome h2{font-size:42px}
          .wp-intro-copy{margin-top:43px;font-size:18px}
          .wp-image-break{height:520px;min-height:0;margin:0}
          .wp-break-copy{left:23px;right:23px;bottom:28px}
          .wp-break-copy h2{font-size:42px}
          .wp-ledger{padding:82px 21px}
          .wp-ledger-head{display:block}
          .wp-ledger h2{font-size:43px}
          .wp-ledger-lead{margin-top:29px}
          .wp-stages{margin-top:42px}
          .wp-outcome{padding:0 21px 80px}
          .wp-outcome-wrap{display:flex;flex-direction:column;min-height:0}
          .wp-outcome-copy{padding:76px 0 42px}
          .wp-outcome-image{height:390px;margin:0}
          .wp-note{padding:0 21px 82px}
          .wp-note-head{display:block}
          .wp-note h2{font-size:42px}
          .wp-note-grid{grid-template-columns:1fr;margin-top:36px}
          .wp-note-image{height:350px}
          .wp-pattern{min-height:270px}
          .wp-start{padding:77px 21px 22px}
          .wp-start h2{font-size:58px}
        }
      `}</style>
      
      <section className="wp-hero">
        <div className="wp-kicker">{landingText(governedLanding, "work-hero-kicker", `${marketLocation} / Work & proof`)}</div>
        <div className="wp-hero-grid">
          <div className="wp-hero-copy">
            <h1 data-governed-landing={governedLanding?.pagePath}>{governedHero?.heading ?? <>Proof lives in the <em>work.</em></>}</h1>
            <p>{governedHero?.text ?? "Cognirise combines AI-native advisory, forward-deployed engineering and governed agents to move consequential work into production—and documents the decisions, controls and outcomes along the way."}</p>
            <button className="wp-primary" onClick={() => heroProofCta.href.startsWith("#") ? goTo(heroProofCta.href.slice(1)) : window.location.assign(heroProofCta.href)}>{heroProofCta.label} <ArrowDown size={15} /></button>
            <Link href={heroProcessCta.href} className="wp-under">{heroProcessCta.label} <ArrowRight size={15} /></Link>
          </div>
          <div className="wp-hero-art">
            <PulseImage src={heroVisual.src} alt={heroVisual.alt} className="w-full h-full object-cover" />
            <div className="wp-hero-word">{landingText(governedLanding, "work-hero-art-word", "proof")}</div>
            <div className="wp-caption"><span>{landingText(governedLanding, "work-hero-caption-label", "01 / work in motion")}</span>{landingText(governedLanding, "work-hero-caption-body", "From mandate to governed production")}</div>
          </div>
        </div>
      </section>
      
      <section className="wp-proof" aria-label={landingText(governedLanding, "work-proof-aria-label", "Proof principles")}>
        {proofPrinciples.map(([labelSlot, label, valueSlot, value]) => (
          <div key={labelSlot}><b>{landingText(governedLanding, labelSlot, label)}</b><strong>{landingText(governedLanding, valueSlot, value)}</strong></div>
        ))}
      </section>
      
      <section className="wp-intro" id="proof">
        <div>
          <div className="wp-kicker">{landingText(governedLanding, "work-evidence-kicker", "Evidence, not theatre")}</div>
          <h2>{landingText(governedLanding, "work-principles-heading", "Change is only useful when it can be shown.")}</h2>
        </div>
        <div className="wp-intro-copy">
          {landingText(governedLanding, "work-evidence-body", "Every engagement begins with the work under pressure: the decision, process, data and control environment that must move together.")}
          <small>{landingText(governedLanding, "work-evidence-disclosure", "Where client details cannot be public, we describe the operating pattern clearly and label it as anonymized. We do not invent names, metrics or results.")}</small>
        </div>
      </section>
      
      <section className="wp-image-break">
        <PulseImage src={proofRouteVisual.src} alt={proofRouteVisual.alt} className="w-full h-full object-cover" />
        <div className="wp-break-copy">
          <div className="wp-kicker">{landingText(governedLanding, "work-proof-route-kicker", "The proof route")}</div>
          <h2>{landingText(governedLanding, "work-proof-route-heading", "Constraints are part of the brief.")}</h2>
          <p>{landingText(governedLanding, "work-proof-route-body", "Security, sovereignty, integration, accountability and adoption are not a postscript. They shape the route from the first working session through to production.")}</p>
        </div>
        <div className="wp-break-no">{landingText(governedLanding, "work-proof-route-caption", "02 / documented delivery")}</div>
      </section>
      
      <section className="wp-ledger">
        <div className="wp-ledger-head">
          <div>
            <div className="wp-kicker">{landingText(governedLanding, "work-ledger-kicker", "How work is evidenced")}</div>
            <h2>{landingText(governedLanding, "work-ledger-heading", "The delivery record, not the highlight reel.")}</h2>
          </div>
          <p className="wp-ledger-lead">{landingText(governedLanding, "work-ledger-body", "A useful proof story makes its context, choices and operating controls visible—so leaders can judge what it took to make progress stick.")}</p>
        </div>

        <SpatialDisclosure defaultValue="01" allowCollapse={true} preview className="wp-stages">
          {deliveryStages.map(([n, titleSlot, title, copySlot, copy]) => (
            <SpatialDisclosureItem key={n} id={n} className="group border-b border-[#cbd3e1] transition-colors data-[state=active]:bg-[#f2eff9]">
              <SpatialDisclosureTrigger id={n} className="w-full text-left grid grid-cols-[70px_1fr_32px] gap-[20px] items-center p-[25px_8px] max-[760px]:grid-cols-[35px_1fr_32px] max-[760px]:p-[20px_0]">
                <span className="text-[10px] tracking-[0.1em] text-[#697a96] pt-[7px]">{n}</span>
                <h3 className="font-semibold text-[clamp(22px,2.4vw,34px)] tracking-[-0.065em] leading-[1.05] m-0 group-hover:text-[hsl(var(--brand-pink))] transition-colors">{landingText(governedLanding, titleSlot, title)}</h3>
                <Plus className="h-5 w-5 justify-self-end text-muted-foreground group-data-[state=active]:rotate-45 group-data-[state=active]:text-[hsl(var(--brand-pink))] transition-transform" />
              </SpatialDisclosureTrigger>
              <SpatialDisclosurePanel id={n} className="data-[state=inactive]:hidden px-[25px] pb-[25px] pl-[98px] max-[760px]:pl-[55px] max-[760px]:px-0">
                <p className="text-[14px] leading-[1.52] text-[#536887] m-0 max-w-[410px]">{landingText(governedLanding, copySlot, copy)}</p>
              </SpatialDisclosurePanel>
            </SpatialDisclosureItem>
          ))}
        </SpatialDisclosure>
      </section>
      
      <section className="wp-outcome">
        <div className="wp-outcome-wrap">
          <div className="wp-outcome-copy">
            <div className="wp-kicker">{landingText(governedLanding, "work-outcomes-kicker", "Four ways work moves")}</div>
            <h2>{landingText(governedLanding, "work-outcomes-heading", "Outcomes with operating consequences.")}</h2>
            <p>{landingText(governedLanding, "work-outcomes-body", "We look for measurable movement in the forces that matter to an enterprise: cost, capacity, speed and risk. The right evidence depends on the mandate—not a predetermined dashboard.")}</p>
            <div className="wp-outcome-grid">
              {outcomes.map(([number, slot, label]) => <div key={number}><span>{number}</span>{landingText(governedLanding, slot, label)}</div>)}
            </div>
          </div>
          <div className="wp-outcome-image">
            <PulseImage src={outcomesVisual.src} alt={outcomesVisual.alt} className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      <WorkLibrary cases={caseStudies.data} />
      
      <section className="wp-note">
        <div className="wp-note-head">
          <div>
            <div className="wp-kicker">{landingText(governedLanding, "work-pattern-kicker", "Patterns, clearly labeled")}</div>
            <h2>{landingText(governedLanding, "work-pattern-heading", "Some work must remain private. The method does not.")}</h2>
          </div>
          <p>{landingText(governedLanding, "work-pattern-disclaimer", "These are anonymized engagement patterns—not named case studies or claimed performance figures.")}</p>
        </div>
        <div className="wp-note-grid">
          <figure className="wp-note-image">
            <PulseImage src={patternVisual.src} alt={patternVisual.alt} className="w-full h-full object-cover" />
            <figcaption>
              <span>{landingText(governedLanding, "work-pattern-caption", "Anonymized engagement pattern")}</span>
               <strong>{featuredPattern.title}</strong>
            </figcaption>
          </figure>
          <aside className="wp-pattern">
            <div>
              <div className="wp-kicker">{landingText(governedLanding, "work-pattern-panel-kicker", "What is documented")}</div>
              <p>{landingText(governedLanding, "work-pattern-panel-body", "Where work gets stuck. What can change. What must stay controlled.")}</p>
            </div>
             <small>{featuredPattern.copy}</small>
          </aside>
        </div>
      </section>
      
      <section className="wp-start" id="start">
        <div className="wp-start-in">
          <div className="wp-kicker">{landingText(governedLanding, "work-closing-kicker", "The first move")}</div>
          <h2>{closingHeadingLead}<br /><em>{closingHeadingRemainder.join(" ")}</em></h2>
          <p>{landingText(governedLanding, "work-closing-body", "Start with work where urgency, complexity and value have already collided. Together we can surface the mandate, constraints and practical route to production.")}</p>
          <Link href={closingCta.href} className="wp-primary">{closingCta.label} <ArrowRight size={16} /></Link>
        </div>
      </section>
    </main>
  );
}
