import React from "react";
import { Link } from "wouter";
import { ArrowRight, ExternalLink } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { assetUrl } from "@/lib/assets";
import { useMarketStore } from "@/store/market";
import type { IndustryContent } from "@/content/industries";
import { contentRecord, useCmsEntry } from "@/lib/cms";

export function IndustryEditorial({ industry }: { industry: IndustryContent }) {
  const cms = useCmsEntry("industry", industry.slug);
  const published = cms.data ? contentRecord(cms.data, "industry") : null;
  const view = published ? { ...industry, ...published, slug: industry.slug } : industry;
  if (cms.isAuthoritative && cms.delivery === "loading") {
    return <main className="min-h-[70vh] bg-[#fdfbf7] px-6 py-24 text-[#102957]" aria-busy="true"><p>Loading industry perspective…</p></main>;
  }
  if (cms.isAuthoritative && !published) {
    return (
      <main className="min-h-[70vh] bg-[#fdfbf7] px-6 py-24 text-[#102957]">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-5xl font-semibold">This industry perspective is under review.</h1>
          <p className="mt-6 max-w-xl text-lg text-[#506583]">It will return when an approved edition is published for this market.</p>
          <Link className="mt-8 inline-flex font-bold text-[#db509e]" href="/industries">Explore all industries <ArrowRight size={16} /></Link>
        </div>
      </main>
    );
  }
  return <IndustryEditorialView view={view} />;
}

export function IndustryEditorialView({ view }: { view: IndustryContent }) {
  const { market } = useMarketStore();
  return (
    <main className={`industry industry--${view.variant}`}>
      <style>{`
        .industry{--ink:#102957;--deep:#071936;--paper:#fdfbf7;--soft:#eef0f5;--line:#cbd3e1;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}
        .industry *{box-sizing:border-box}.industry h1,.industry h2,.industry h3{font-family:Comfortaa,sans-serif}.industry a{color:inherit}.industry :focus-visible{outline:3px solid var(--coral);outline-offset:4px}
        .ind-kicker{font-size:10px;letter-spacing:.13em;text-transform:uppercase;font-weight:700;display:flex;align-items:center;gap:10px}.ind-kicker:before{content:"";width:25px;height:2px;background:linear-gradient(90deg,var(--violet),var(--pink),var(--coral))}
        .ind-hero{padding:34px 4.8vw 50px;display:grid;grid-template-columns:.88fr 1.12fr;gap:5vw;align-items:end;min-height:690px}.ind-copy{padding-bottom:25px}.ind-copy h1{font-size:clamp(50px,6.2vw,96px);line-height:.94;letter-spacing:-.075em;margin:32px 0 28px}.ind-copy h1 em{font-style:normal;color:var(--pink)}.ind-copy p{max-width:570px;color:#405677;font-size:17px;line-height:1.65}.ind-image{height:610px;position:relative;overflow:hidden;clip-path:polygon(10% 0,100% 0,100% 91%,0 100%,0 12%);background:var(--deep)}.ind-image img{width:100%;height:100%;object-fit:cover;animation:ind-reveal 1s ease both}.ind-image:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.46),transparent 50%),linear-gradient(0deg,rgba(7,25,54,.5),transparent 48%)}.ind-image span{position:absolute;z-index:1;left:32px;bottom:30px;color:white;text-transform:uppercase;font-size:10px;letter-spacing:.13em}
        .ind-rail{margin:0 4.8vw;border-block:1px solid var(--ink);display:grid;grid-template-columns:repeat(3,1fr)}.ind-rail div{padding:18px 20px;border-right:1px solid var(--line);font-size:13px}.ind-rail div:last-child{border:0}.ind-rail b{display:block;color:#6a7891;font-size:9px;text-transform:uppercase;letter-spacing:.12em;margin-bottom:7px}
        .ind-pressure{padding:130px 4.8vw 110px;display:grid;grid-template-columns:.72fr 1.28fr;gap:8vw}.ind-pressure h2,.ind-evidence h2,.ind-gcc h2{font-size:clamp(42px,5vw,72px);line-height:.98;letter-spacing:-.07em;margin:22px 0}.ind-pressure-list{border-top:1px solid var(--ink)}.ind-pressure article{display:grid;grid-template-columns:55px 1fr;padding:28px 0;border-bottom:1px solid var(--line)}.ind-pressure article span{color:var(--pink);font-size:10px;letter-spacing:.12em}.ind-pressure h3{font-size:24px;letter-spacing:-.04em;margin:0 0 9px}.ind-pressure p{color:#506583;line-height:1.6;margin:0;max-width:560px}
        .ind-turn{margin:0 4.8vw;background:var(--deep);color:white;display:grid;grid-template-columns:1fr 1fr;min-height:420px;position:relative;overflow:hidden}.ind-turn:before{content:"REVERSAL";position:absolute;right:-20px;bottom:-12px;font:600 10vw/.8 Comfortaa;color:#ffffff0c}.ind-turn>div{padding:70px 7%;position:relative}.ind-turn>div:first-child{border-right:1px solid #ffffff30}.ind-turn h2{font-size:clamp(35px,4vw,58px);letter-spacing:-.065em;line-height:1;margin:20px 0}.ind-turn p{color:#d7dfed;line-height:1.65}.ind-verdict{border-top:2px solid var(--coral);align-self:center}.ind-verdict strong{display:block;font:600 clamp(25px,3vw,42px)/1.1 Comfortaa;margin-bottom:22px}
        .ind-evidence{padding:120px 4.8vw}.ind-evidence-head{display:flex;justify-content:space-between;align-items:end;gap:40px}.ind-evidence-head p{max-width:400px;color:#536887;line-height:1.6}.ind-table{width:100%;border-collapse:collapse;margin-top:45px;text-align:left}.ind-table th{font-size:9px;text-transform:uppercase;letter-spacing:.13em;color:#6f7d94;border-block:1px solid var(--ink);padding:16px}.ind-table td{padding:22px 16px;border-bottom:1px solid var(--line);vertical-align:top;line-height:1.5}.ind-table td:first-child{font:600 18px Comfortaa}.ind-table td:nth-child(2){color:#db509e;font-weight:700}
        .ind-gcc{background:var(--soft);padding:110px 4.8vw;display:grid;grid-template-columns:1fr 1fr;gap:8vw}.ind-gcc p{font-size:20px;line-height:1.55;color:#405677;align-self:end;border-top:1px solid var(--ink);padding-top:24px}
        .ind-sources{padding:110px 4.8vw}.ind-sources-list{margin-top:38px;border-top:1px solid var(--ink)}.ind-source{display:grid;grid-template-columns:1.3fr .8fr .6fr 30px;gap:20px;padding:19px 8px;border-bottom:1px solid var(--line);text-decoration:none;align-items:center}.ind-source span{font-size:12px;color:#647491}.ind-source strong{font-family:Comfortaa}.ind-source:hover strong{color:var(--pink)}
        .ind-cta{background:var(--deep);color:white;padding:95px 4.8vw;display:grid;grid-template-columns:1.3fr .7fr;gap:40px;align-items:end;position:relative}.ind-cta:before{content:"SIGNAL";position:absolute;right:-10px;bottom:-20px;font:600 16vw/.7 Comfortaa;color:#ffffff0b}.ind-cta>*{position:relative}.ind-cta h2{font-size:clamp(45px,6vw,88px);line-height:.94;letter-spacing:-.08em;margin:20px 0}.ind-cta p{color:#d7dfed;line-height:1.6}.ind-cta aside{border-left:2px solid var(--coral);padding-left:25px}.ind-cta aside a{display:block;margin-bottom:24px;font-weight:700}
        .industry--network .ind-hero{grid-template-columns:1.05fr .95fr}.industry--network .ind-image{clip-path:polygon(0 7%,92% 0,100% 100%,8% 94%)}.industry--network .ind-pressure article{grid-template-columns:80px 1fr;padding-left:5%}
        .industry--journey .ind-hero{grid-template-columns:.74fr 1.26fr}.industry--journey .ind-image{clip-path:polygon(5% 0,100% 7%,94% 100%,0 92%)}.industry--journey .ind-turn{grid-template-columns:1.25fr .75fr}
        .industry--field .ind-hero{grid-template-columns:1fr 1fr}.industry--field .ind-image{height:680px;clip-path:polygon(14% 0,100% 0,94% 100%,0 92%)}.industry--field .ind-pressure{background:linear-gradient(115deg,var(--paper) 0 57%,var(--soft) 57%)}
        .industry--factory .ind-hero{grid-template-columns:1.12fr .88fr}.industry--factory .ind-image{height:560px;clip-path:polygon(0 0,100% 10%,93% 100%,8% 92%)}.industry--factory .ind-pressure{grid-template-columns:.9fr 1.1fr}.industry--factory .ind-evidence-head{align-items:start}
        @keyframes ind-reveal{from{clip-path:inset(0 100% 0 0);transform:scale(1.05)}to{clip-path:inset(0);transform:none}}
        @media(max-width:760px){.ind-hero,.industry--network .ind-hero,.industry--journey .ind-hero,.industry--field .ind-hero,.industry--factory .ind-hero{display:flex;flex-direction:column;align-items:stretch;min-height:0;padding:34px 21px 36px}.ind-copy h1{font-size:51px}.ind-image,.industry--field .ind-image,.industry--factory .ind-image{height:430px}.ind-rail{margin:0 21px;grid-template-columns:1fr}.ind-rail div{border-right:0;border-bottom:1px solid var(--line)}.ind-pressure,.industry--factory .ind-pressure{display:block;padding:85px 21px}.industry--field .ind-pressure{background:var(--paper)}.ind-pressure-list{margin-top:40px}.ind-pressure article,.industry--network .ind-pressure article{grid-template-columns:38px 1fr;padding-left:0}.ind-turn{margin:0;display:block}.ind-turn>div{padding:60px 21px}.ind-turn>div:first-child{border-right:0;border-bottom:1px solid #ffffff30}.ind-evidence{padding:85px 21px}.ind-evidence-head{display:block}.ind-table,.ind-table tbody,.ind-table tr,.ind-table td{display:block}.ind-table thead{position:absolute;clip:rect(0 0 0 0)}.ind-table tr{border-bottom:1px solid var(--line);padding:18px 0}.ind-table td{border:0;padding:5px 0}.ind-table td:before{content:attr(data-label);display:block;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#70809a;margin-bottom:4px}.ind-gcc{display:block;padding:82px 21px}.ind-gcc p{margin-top:38px}.ind-sources{padding:82px 21px}.ind-source{grid-template-columns:1fr 24px}.ind-source span{grid-column:1}.ind-source svg{grid-column:2;grid-row:1}.ind-cta{display:block;padding:78px 21px}.ind-cta aside{margin-top:45px}}
        @media(prefers-reduced-motion:reduce){.industry *,.industry *:before,.industry *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
      `}</style>
      <section className="ind-hero" aria-labelledby="industry-title">
        <div className="ind-copy">
          <div className="ind-kicker">{market.toUpperCase()} / {view.name}</div>
          <h1 id="industry-title">{view.thesis}</h1>
          <p>{view.dek}</p>
        </div>
        <figure className="ind-image"><img src={assetUrl(view.image)} alt={view.imageAlt} /><span>01 / operating reality</span></figure>
      </section>
      <section className="ind-rail" aria-label={`${view.name} evidence approach`}>
        <div><b>Evidence rule</b>Claims keep their source label</div><div><b>Operating rule</b>Human authority stays explicit</div><div><b>Case studies</b>Shown only when Cognirise proof is approved</div>
      </section>
      <section className="ind-pressure" aria-labelledby="pressure-title">
        <div><div className="ind-kicker">Pressure points</div><h2 id="pressure-title">Where the operating model resists the demo.</h2></div>
        <div className="ind-pressure-list">{view.pressures.map((p, i) => <article key={p.title}><span>0{i + 1}</span><div><h3>{p.title}</h3><p>{p.body}</p></div></article>)}</div>
      </section>
      <section className="ind-turn" aria-label="Reversal and myth verdict">
        <div><div className="ind-kicker">Documented reversal</div><h2>{view.reversal.title}</h2><p>{view.reversal.body}</p></div>
        <div className="ind-verdict"><div className="ind-kicker">Myth / verdict</div><strong>{view.myth.claim}</strong><p>{view.myth.verdict}</p></div>
      </section>
      <section className="ind-evidence" aria-labelledby="evidence-title">
        <div className="ind-evidence-head"><div><div className="ind-kicker">Use-case evidence</div><h2 id="evidence-title">What is useful—and what must remain bounded.</h2></div><p>These are external operating patterns, not Cognirise client case studies. Evidence strength and decision boundaries stay visible.</p></div>
        <table className="ind-table"><thead><tr><th>Use case</th><th>Evidence</th><th>Required boundary</th></tr></thead><tbody>{view.uses.map((u) => <tr key={u.use}><td data-label="Use case">{u.use}</td><td data-label="Evidence">{u.evidence}</td><td data-label="Required boundary">{u.boundary}</td></tr>)}</tbody></table>
      </section>
      <section className="ind-gcc" aria-labelledby="gcc-title"><div><div className="ind-kicker">GCC context</div><h2 id="gcc-title">Ambition is not the same as realised evidence.</h2></div><p>{view.gcc}</p></section>
      <section className="ind-sources" aria-labelledby="sources-title"><div className="ind-kicker">Visible source trail</div><h2 id="sources-title">Read the evidence behind this view.</h2><div className="ind-sources-list">{view.sources.map((s) => <a className="ind-source" href={s.url} target="_blank" rel="noreferrer" key={s.url}><strong>{s.label}</strong><span>{s.publisher}</span><span>{s.kind}</span><ExternalLink size={15} aria-hidden="true" /></a>)}</div></section>
      <section className="ind-cta" aria-labelledby="cta-title"><div><div className="ind-kicker">Signal Rail / the first move</div><h2 id="cta-title">{view.service.firstMove}</h2><p>Bring the process, its evidence and the people accountable for the decision. Leave with a clearer route to a governed build.</p></div><aside><Link href={view.service.href}>Relevant service: {view.service.label} <ArrowRight size={14} /></Link><BrandButton href="/value-scan">Book a value scan</BrandButton></aside></section>
    </main>
  );
}