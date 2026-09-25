import { ArrowUpRight, Check, CornerDownRight, Hand, Layers3, LockKeyhole, Route, ShieldCheck } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { PulseHeading, PulseLinks } from "@/components/cms/PulseCopy";
import { cogniagentsPulsePageDraft, type CogniAgentsPulsePage } from "@workspace/api-zod";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="ca-eyebrow"><span className="ca-signal" aria-hidden="true" />{children}</span>;
}

export default function CogniAgents({ page = cogniagentsPulsePageDraft, preview = false }: { page?: CogniAgentsPulsePage; preview?: boolean }) {
  const sections = Object.fromEntries(page.sections.map(section => [section.id, section])) as Record<CogniAgentsPulsePage["sections"][number]["id"], CogniAgentsPulsePage["sections"][number]>;
  const diagram = Object.fromEntries(page.diagram.labels.map(label => [label.id, label.text])) as Record<CogniAgentsPulsePage["diagram"]["labels"][number]["id"], string>;
  const renderSection = (id: CogniAgentsPulsePage["sections"][number]["id"]) => {
    const section = sections[id];
    if (!section.visible) return null;
    switch (id) {
      case "problem": return <section className="ca-problem ca-wrap" key={id} aria-labelledby="ca-problem-title"><div><Eyebrow>{section.eyebrow}</Eyebrow><h2 id="ca-problem-title" className="ca-heading"><PulseHeading text={section.heading} /></h2></div><div className="ca-problem-copy"><p>{section.body}</p>{section.items.map((item, i) => <div key={i}><strong>{item.title}</strong>{item.body !== item.title && <p>{item.body}</p>}</div>)}<PulseLinks links={section.links} className="ca-jump" /></div></section>;
      case "differences": return <section className="ca-difference" key={id} aria-labelledby="ca-difference-title"><div className="ca-wrap"><div className="ca-intro"><div><Eyebrow>{section.eyebrow}</Eyebrow><h2 id="ca-difference-title" className="ca-heading"><PulseHeading text={section.heading} /></h2></div><p>{section.body}</p></div><div className="ca-difference-list">{section.items.map((item, i) => <article className="ca-difference-item" key={i}><span>{String(i + 1).padStart(2, "0")} / {String(section.items.length).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.body}</p><small>{item.label}</small></article>)}</div><PulseLinks links={section.links} className="ca-jump" /></div></section>;
      case "functions": {
        const groups = [...new Set(section.items.map(item => item.label ?? ""))];
        return <section className="ca-functions" id="agents-by-function" key={id} aria-labelledby="ca-functions-title"><div className="ca-wrap"><div className="ca-intro"><div><Eyebrow>{section.eyebrow}</Eyebrow><h2 id="ca-functions-title" className="ca-heading"><PulseHeading text={section.heading} /></h2></div><p>{section.body}</p></div>{groups.map(group => <div className="ca-function-group" key={group}><div className="ca-group-label">{group}</div><div className="ca-function-items">{section.items.filter(item => (item.label ?? "") === group).map((item, i) => <article className="ca-function" key={i}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></div>)}<PulseLinks links={section.links} className="ca-jump" /></div></section>;
      }
      case "how-it-works": return <section className="ca-method ca-wrap" id="how-it-works" key={id} aria-labelledby="ca-method-title"><div className="ca-intro"><div><Eyebrow>{section.eyebrow}</Eyebrow><h2 id="ca-method-title" className="ca-heading"><PulseHeading text={section.heading} /></h2></div><p>{section.body}</p></div><div className="ca-method-grid">{section.items.map((item, i) => <article className="ca-method-step" key={i}><span>{item.label}</span><h3>{item.title}</h3><p>{item.body}</p>{item.detail && <small><CornerDownRight size={16} aria-hidden="true" />{item.detail}</small>}</article>)}</div><PulseLinks links={section.links} className="ca-jump" /></section>;
      case "foundation": return <section className="ca-foundation" key={id} aria-labelledby="ca-foundation-title">
        <div className="ca-wrap ca-foundation-inner">
          <div><Eyebrow>{section.eyebrow}</Eyebrow><h2 id="ca-foundation-title" className="ca-heading"><PulseHeading text={section.heading} /></h2><p>{section.body}</p><PulseLinks links={section.links} className="ca-foundation-link"><ArrowUpRight size={16} aria-hidden="true" /></PulseLinks></div>
          <div className="ca-foundation-diagram" role="group" aria-label={section.heading}>
            <small>{section.items[3]?.title}</small>
            {section.items[3]?.body !== section.items[3]?.title && <p className="ca-foundation-detail">{section.items[3]?.body}</p>}
            <div className="ca-agent-bars">{section.items.slice(0, 3).map((item, i) => <div className="ca-agent-bar" key={i}><span className="ca-agent-bar-copy"><strong>{item.title}</strong>{item.body !== item.title && <small>{item.body}</small>}{item.detail && <small>{item.detail}</small>}</span>{[<Route size={17} aria-hidden="true" />, <ShieldCheck size={17} aria-hidden="true" />, <LockKeyhole size={17} aria-hidden="true" />][i]}</div>)}</div>
            <div className="ca-foundation-stem" aria-hidden="true" />
            <div className="ca-base-bar"><div><strong>{section.items[4]?.title}</strong>{section.items[4]?.body !== section.items[4]?.title && <p>{section.items[4]?.body}</p>}</div><small>{section.items[4]?.label}</small></div>
            <div className="ca-base-key">{section.items.slice(5).map((item, i) => <span key={i}><Layers3 size={15} aria-hidden="true" /><span>{item.title}{item.body !== item.title && <small>{item.body}</small>}{item.detail && <small>{item.detail}</small>}</span></span>)}</div>
          </div>
        </div>
      </section>;
      case "deployment": return <section className="ca-deploy ca-wrap" key={id} aria-labelledby="ca-deploy-title"><div className="ca-intro"><div><Eyebrow>{section.eyebrow}</Eyebrow><h2 id="ca-deploy-title" className="ca-heading"><PulseHeading text={section.heading} /></h2></div><p>{section.body}</p></div><div className="ca-deploy-list">{section.items.map((item, i) => <article className="ca-deploy-row" key={i}><span>{item.label}</span><h3>{item.title}</h3><p>{item.body}</p><small>{item.detail}</small></article>)}</div><PulseLinks links={section.links} className="ca-jump" /></section>;
      case "faq": return <section className="ca-faq" key={id} aria-labelledby="ca-faq-title"><div className="ca-wrap ca-faq-inner"><div><Eyebrow>{section.eyebrow}</Eyebrow><h2 id="ca-faq-title" className="ca-heading"><PulseHeading text={section.heading} /></h2><p className="ca-faq-intro">{section.body}</p></div><div className="ca-faq-list">{section.items.map((item, i) => <article className="ca-faq-item" key={i}><h3>{item.label && <small className="block">{item.label}</small>}{item.title}</h3><div><p>{item.body}</p>{item.detail && <small>{item.detail}</small>}</div></article>)}<PulseLinks links={section.links} className="ca-jump" /></div></div></section>;
    }
    return null;
  };
  return (
    <main className="ca-page" data-layout={page.layout} data-tone={page.tone} data-preview={preview ? "draft" : undefined}>
      <style>{`
        .ca-page{--paper:#fdfbf8;--ink:#102957;--deep:#0b2148;--body:#435a7a;--line:#c8d0dc;--violet:#7659df;--pink:#d8519b;--coral:#f27b64;--lilac:#f0ecfa;--blush:#f9eded;background:var(--paper);color:var(--ink);overflow:clip;font-family:Inter,sans-serif}
        .ca-page *{box-sizing:border-box}.ca-page :focus-visible{outline:3px solid var(--coral);outline-offset:4px}
        .ca-page h1,.ca-page h2,.ca-page h3,.ca-page p{margin-top:0}.ca-page h1,.ca-page h2,.ca-page h3{font-family:Comfortaa,sans-serif}
        .ca-wrap{width:min(100%,1440px);margin-inline:auto;padding-inline:4.8vw}
        .ca-eyebrow{display:inline-flex;align-items:center;gap:11px;font-size:10px;font-weight:700;line-height:1.5;letter-spacing:.15em;text-transform:uppercase}
        .ca-signal{width:26px;height:2px;flex:none;background:linear-gradient(90deg,var(--violet),var(--pink),var(--coral))}
        .ca-heading{font-weight:600;line-height:1.045;letter-spacing:-.073em}
        .ca-heading em{font-style:normal;color:var(--pink)}
        .ca-intro{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.55fr);gap:8vw;align-items:end}
        .ca-intro h2{font-size:clamp(38px,5vw,72px);margin:22px 0 0}
        .ca-intro p{color:var(--body);font-size:16px;line-height:1.7;max-width:435px;margin:0 0 5px}
        .ca-hero{padding-top:30px}
        .ca-hero-grid{display:grid;grid-template-columns:minmax(0,.98fr) minmax(0,1.02fr);gap:5vw;align-items:center;min-height:645px;padding:36px 0 66px}
        .ca-hero-copy h1{font-size:clamp(54px,6vw,91px);max-width:700px;margin:30px 0 29px}
        .ca-hero-copy>p{max-width:590px;font-size:clamp(17px,1.45vw,20px);line-height:1.65;color:var(--body);margin-bottom:35px}
        .ca-actions{display:flex;align-items:center;gap:25px;flex-wrap:wrap}
        .ca-jump{display:inline-flex;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid var(--ink);color:var(--ink);font-size:14px;font-weight:700;text-decoration:none;transition:color .2s,border-color .2s}
         .ca-jump:hover{color:var(--pink);border-color:var(--pink)}.ca-jump svg{transition:transform .2s}.ca-jump:hover svg{transform:translate(2px,-2px)}
        .ca-hero-foot{margin-top:64px;display:flex;align-items:center;gap:12px;color:#72819b;font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}
        .ca-hero-foot:before{content:"";width:32px;height:1px;background:var(--line)}
        .ca-map{position:relative;isolation:isolate;min-height:538px;padding:28px 27px 27px;background:linear-gradient(150deg,#f1ecfa 0%,#f9f3f6 52%,#e9eef5 100%);clip-path:polygon(8% 0,100% 0,100% 92%,92% 100%,0 100%,0 8%);overflow:hidden;animation:ca-arrive .85s cubic-bezier(.16,1,.3,1) both}
        @keyframes ca-arrive{from{opacity:0;transform:translate3d(0,16px,0)}to{opacity:1;transform:translate3d(0,0,0)}}
        .ca-map:before{content:"";position:absolute;inset:0;z-index:-1;background-image:linear-gradient(90deg,rgba(16,41,87,.05) 1px,transparent 1px),linear-gradient(rgba(16,41,87,.05) 1px,transparent 1px);background-size:42px 42px}
        .ca-map-top,.ca-map-bottom{display:flex;justify-content:space-between;gap:15px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em}
        .ca-map-top{padding:8px 0 18px;border-bottom:1px solid #abb7cb}.ca-map-top span:last-child{color:#9b548b}
        .ca-map-bottom{border-top:1px solid #abb7cb;padding-top:17px;color:#667997}
        .ca-map-title{font:600 clamp(20px,2.15vw,30px)/1.25 Comfortaa,sans-serif;letter-spacing:-.055em;margin:30px 0 24px;max-width:370px}
        .ca-map-route{position:relative;padding-left:36px;margin-left:13px;border-left:2px solid #b5a5e7}
        .ca-map-stage{position:relative;display:grid;grid-template-columns:96px 1fr;gap:15px;align-items:center;min-height:76px;padding:10px 0;border-bottom:1px solid rgba(16,41,87,.16)}
        .ca-map-stage:last-child{border-bottom:0}
        .ca-map-stage:before{content:"";position:absolute;left:-44px;top:50%;width:14px;height:14px;border-radius:50%;background:var(--violet);border:4px solid #f4eff9;transform:translateY(-50%)}
        .ca-map-stage:nth-child(3):before{background:var(--coral)}.ca-map-stage:nth-child(4):before{background:var(--pink)}
        .ca-map-stage small{font-size:10px;text-transform:uppercase;letter-spacing:.11em;font-weight:700;color:#657594}
        .ca-map-stage strong{font:600 clamp(14px,1.25vw,18px)/1.35 Comfortaa,sans-serif;letter-spacing:-.035em}
        .ca-map-stage.ca-human{background:#fdfbf8;box-shadow:8px 8px 0 rgba(118,89,223,.12);padding:14px 15px;margin:11px 0 11px -15px;border:1px solid #d9c7df;grid-template-columns:28px 1fr}
        .ca-human svg{color:var(--pink)}.ca-human div{display:flex;flex-direction:column;gap:4px}.ca-human strong{color:var(--ink)}.ca-human small{color:#9d4e84}
        .ca-map-bottom{margin-top:24px}
        .ca-proof{display:grid;grid-template-columns:repeat(5,1fr);border-block:1px solid var(--ink)}
        .ca-proof span{display:flex;align-items:center;gap:10px;min-height:65px;padding:12px 13px 12px 0;margin-right:16px;border-right:1px solid var(--line);font-size:12px;font-weight:700;line-height:1.35}
        .ca-proof span:last-child{border:0;margin-right:0}.ca-proof i{width:5px;height:5px;flex:none;background:var(--pink);border-radius:50%}
        .ca-problem{display:grid;grid-template-columns:1fr 1fr;gap:10vw;padding-block:140px 145px}
        .ca-problem h2{font-size:clamp(42px,5.4vw,77px);margin:26px 0 0;max-width:600px}
        .ca-problem-copy{align-self:end;border-top:1px solid var(--ink);padding-top:27px}
        .ca-problem-copy p{color:#344e72;font-size:clamp(17px,1.6vw,22px);line-height:1.6;margin-bottom:27px}
        .ca-problem-copy strong{display:block;font:600 clamp(21px,2vw,28px)/1.38 Comfortaa,sans-serif;letter-spacing:-.05em}
        .ca-difference{background:#f1eef8;padding-block:116px 130px}
        .ca-difference .ca-intro{margin-bottom:65px}
        .ca-difference-list{border-top:1px solid var(--ink)}
        .ca-difference-item{display:grid;grid-template-columns:110px minmax(0,.8fr) minmax(0,1.15fr) 140px;gap:26px;align-items:start;border-bottom:1px solid #c9c5d9;padding:32px 3px 33px}
        .ca-difference-item>span:first-child{color:var(--pink);font-size:11px;font-weight:700;letter-spacing:.12em;padding-top:7px}
        .ca-difference-item h3{font-size:clamp(20px,2vw,29px);line-height:1.25;letter-spacing:-.055em;margin:0}
        .ca-difference-item p{font-size:14px;line-height:1.68;color:var(--body);margin:1px 0 0}
        .ca-difference-item small{text-align:right;color:#81749a;font-size:10px;font-weight:700;line-height:1.5;letter-spacing:.1em;text-transform:uppercase;padding-top:7px}
        .ca-functions{scroll-margin-top:90px;background:var(--deep);color:var(--paper);padding-block:122px 145px;position:relative;overflow:hidden}
        .ca-functions:before{content:"";position:absolute;width:740px;height:740px;border:1px solid rgba(216,81,155,.14);border-radius:50%;right:-390px;top:-330px;box-shadow:0 0 0 95px rgba(118,89,223,.035),0 0 0 190px rgba(242,123,100,.025);pointer-events:none}
        .ca-functions .ca-intro{position:relative;margin-bottom:70px}
        .ca-functions .ca-intro p{color:#c2cde1}.ca-functions .ca-heading em{color:#f18bb8}
        .ca-function-group{position:relative;display:grid;grid-template-columns:240px 1fr;border-top:1px solid rgba(255,255,255,.43)}
        .ca-group-label{padding:32px 24px 0 0;color:#f294ba;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.14em}
        .ca-function-items{border-left:1px solid rgba(255,255,255,.21)}
        .ca-function{display:grid;grid-template-columns:minmax(0,.82fr) minmax(0,1.18fr);gap:5vw;align-items:start;padding:31px 0 34px 34px;border-bottom:1px solid rgba(255,255,255,.22)}
        .ca-function:last-child{border-bottom:0}
        .ca-function h3{font-size:clamp(22px,2.5vw,34px);line-height:1.2;letter-spacing:-.055em;margin:0}
        .ca-function p{font-size:14px;line-height:1.7;color:#d2dbea;margin:0}
        .ca-function h3:before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--coral);margin:0 14px 5px 0}
        .ca-method{padding-block:125px 140px}
        .ca-method .ca-intro{margin-bottom:67px}
        .ca-method-grid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--ink);border-left:1px solid var(--line)}
        .ca-method-step{position:relative;min-height:290px;padding:34px clamp(25px,4vw,60px) 34px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);display:flex;flex-direction:column;align-items:flex-start}
        .ca-method-step:nth-child(2){background:#f7f3fa}.ca-method-step:nth-child(3){background:#f9f0ef}
        .ca-method-step>span{font-size:11px;letter-spacing:.13em;font-weight:700;color:var(--pink)}
        .ca-method-step h3{font-size:clamp(32px,3vw,45px);letter-spacing:-.065em;margin:31px 0 14px}
        .ca-method-step p{font-size:15px;line-height:1.68;color:var(--body);max-width:490px;margin-bottom:25px}
        .ca-method-step small{margin-top:auto;display:flex;align-items:center;gap:9px;font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:700;color:#826f98}
        .ca-method-step small svg{color:var(--pink)}
        .ca-foundation{background:var(--lilac);padding-block:115px 121px}
        .ca-foundation-inner{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:10vw;align-items:center}
        .ca-foundation h2{font-size:clamp(42px,5vw,72px);margin:25px 0}
        .ca-foundation p{font-size:18px;line-height:1.68;color:#415676;max-width:600px;margin-bottom:30px}
        .ca-foundation-link{display:inline-flex;align-items:center;gap:9px;border-bottom:1px solid currentColor;padding-bottom:7px;color:var(--ink);font-size:13px;font-weight:700;text-decoration:none;transition:color .2s}
        .ca-foundation-link:hover{color:var(--pink)}
        .ca-foundation-diagram{position:relative;padding:28px 0 0}
        .ca-foundation-diagram>small{display:block;font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#78688f;margin-bottom:18px}
        .ca-agent-bars{display:grid;gap:10px;padding:0 17px}
        .ca-agent-bars .ca-agent-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 20px;background:var(--paper);border-left:3px solid var(--pink);font:600 15px/1.3 Comfortaa,sans-serif;letter-spacing:-.04em;box-shadow:6px 6px 0 rgba(16,41,87,.04)}
        .ca-agent-bars .ca-agent-bar:nth-child(2){margin-inline:22px -22px;border-color:var(--coral)}.ca-agent-bars .ca-agent-bar:nth-child(3){margin-inline:44px -44px;border-color:var(--violet)}
        .ca-agent-bar-copy{display:grid;gap:6px;min-width:0}.ca-agent-bar-copy strong{font-weight:600}.ca-agent-bar-copy small,.ca-base-key small{display:block;font:400 12px/1.5 Inter,sans-serif;letter-spacing:0;color:var(--body)}.ca-foundation-diagram .ca-foundation-detail{font-size:13px;line-height:1.5;margin:-7px 0 17px;color:var(--body)}
        .ca-agent-bars svg{color:var(--pink);flex:none}
        .ca-foundation-stem{height:45px;width:1px;background:var(--violet);margin:auto;position:relative}
        .ca-foundation-stem:after{content:"";position:absolute;bottom:0;left:-4px;width:9px;height:9px;border-radius:50%;background:var(--violet)}
        .ca-base-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--deep);color:var(--paper);padding:23px 26px}
        .ca-base-bar strong{font:600 22px Comfortaa,sans-serif;letter-spacing:-.05em}.ca-base-bar small{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#e8b8dd}.ca-base-bar p{font:400 12px/1.5 Inter,sans-serif;color:#d2dbea;margin:7px 0 0}
        .ca-base-key{display:flex;flex-wrap:wrap;gap:12px 25px;border-top:1px solid #c7bddc;padding-top:17px;margin-top:22px;font-size:11px;font-weight:700;color:#695d83}
        .ca-base-key>span{display:flex;align-items:flex-start;gap:7px}.ca-base-key>span>span{display:block}.ca-base-key svg{color:var(--pink);flex:none}
        .ca-deploy{padding-block:126px 140px}.ca-deploy .ca-intro{margin-bottom:59px}
        .ca-deploy-list{border-top:1px solid var(--ink)}
        .ca-deploy-row{display:grid;grid-template-columns:75px minmax(0,1fr) minmax(0,1fr) 160px;align-items:center;gap:20px;border-bottom:1px solid var(--line);padding:29px 3px}
        .ca-deploy-row>span{color:var(--pink);font-size:11px;font-weight:700;letter-spacing:.12em}
        .ca-deploy-row h3{font-size:clamp(22px,2.6vw,35px);letter-spacing:-.055em;margin:0}.ca-deploy-row p{font-size:14px;line-height:1.55;color:var(--body);margin:0}
        .ca-deploy-row small{text-align:right;color:#7b6e90;font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:700}
        .ca-faq{background:#f4f2f7;padding-block:122px 139px}.ca-faq-inner{display:grid;grid-template-columns:.65fr 1.35fr;gap:8vw}
        .ca-faq h2{font-size:clamp(45px,5vw,72px);margin:25px 0}.ca-faq-intro{color:var(--body);font-size:15px;line-height:1.65;max-width:320px}
        .ca-faq-list{border-top:1px solid var(--ink)}
        .ca-faq-item{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:35px;padding:27px 2px 31px;border-bottom:1px solid var(--line)}
        .ca-faq-item h3{font-size:clamp(18px,1.7vw,23px);letter-spacing:-.045em;line-height:1.4;margin:0}
        .ca-faq-item p{font-size:14px;line-height:1.72;color:var(--body);margin:0}
        .ca-close{position:relative;overflow:hidden;background:var(--blush)}
        .ca-close:before{content:"";position:absolute;width:600px;height:600px;border:1px solid rgba(216,81,155,.2);border-radius:50%;right:-170px;bottom:-335px;box-shadow:0 0 0 80px rgba(216,81,155,.045),0 0 0 160px rgba(118,89,223,.035);pointer-events:none}
        .ca-close-inner{position:relative;padding-block:116px 60px}
        .ca-close h2{font-size:clamp(46px,6.2vw,91px);max-width:1000px;margin:27px 0 27px}
        .ca-close p{font-size:19px;line-height:1.6;color:#405777;max-width:650px;margin-bottom:35px}
        .ca-close-foot{margin-top:112px;border-top:1px solid var(--ink);padding-top:18px;display:flex;justify-content:space-between;gap:20px;color:#79758e;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em}
        .ca-section-extras{padding-block:22px 32px;border-top:1px solid var(--line);font-size:15px;line-height:1.6;color:var(--body)}.ca-section-extras strong{font-family:Comfortaa,sans-serif;color:var(--ink)}.ca-section-extras p{margin:8px 0 0}
        .ca-page[data-layout="compact"] .ca-problem,.ca-page[data-layout="compact"] .ca-difference,.ca-page[data-layout="compact"] .ca-functions,.ca-page[data-layout="compact"] .ca-method,.ca-page[data-layout="compact"] .ca-foundation,.ca-page[data-layout="compact"] .ca-deploy,.ca-page[data-layout="compact"] .ca-faq{padding-top:75px;padding-bottom:80px}
        .ca-page[data-tone="evidence-led"] .ca-signal,.ca-page[data-tone="evidence-led"] .ca-proof i{background:var(--violet)}
        @media(max-width:1100px){.ca-difference-item{grid-template-columns:65px .9fr 1.1fr}.ca-difference-item small{display:none}.ca-function-group{grid-template-columns:180px 1fr}.ca-deploy-row{grid-template-columns:55px 1fr 1fr}.ca-deploy-row small{display:none}}
        @media(max-width:767px){
          .ca-wrap{padding-inline:24px}.ca-hero{padding-top:30px}.ca-hero-grid{display:block;min-height:0;padding:0 0 38px}.ca-hero-copy h1{font-size:clamp(46px,10.8vw,68px);margin:25px 0}.ca-hero-copy>p{font-size:16px;margin-bottom:28px}.ca-hero-foot{margin:36px 0 38px}
          .ca-map{margin-inline:-24px;padding:31px 24px;min-height:0}.ca-map-title{font-size:23px}.ca-map-stage{grid-template-columns:72px 1fr;gap:9px}.ca-map-stage strong{font-size:14px}
          .ca-proof{grid-template-columns:1fr 1fr}.ca-proof span{font-size:11px;min-height:62px;margin-right:10px}.ca-proof span:nth-child(even){border-right:0;margin-right:0}.ca-proof span:not(:last-child){border-bottom:1px solid var(--line)}
          .ca-intro{display:block}.ca-intro h2{font-size:clamp(38px,9vw,53px)}.ca-intro p{margin-top:25px}
          .ca-problem{display:block;padding-block:87px 96px}.ca-problem h2{font-size:clamp(43px,10vw,62px)}.ca-problem-copy{margin-top:43px}.ca-problem-copy p{font-size:18px}
          .ca-difference{padding-block:83px 94px}.ca-difference .ca-intro{margin-bottom:42px}.ca-difference-item{grid-template-columns:40px 1fr;gap:9px 13px;padding:25px 0}.ca-difference-item h3{font-size:21px}.ca-difference-item p{grid-column:2;font-size:13px}
          .ca-functions{padding-block:84px 95px}.ca-functions .ca-intro{margin-bottom:47px}.ca-function-group{display:block}.ca-group-label{padding:23px 0 17px}.ca-function-items{border-left:0}.ca-function{display:block;padding:22px 0 25px}.ca-function h3{font-size:24px;margin-bottom:12px}.ca-function p{font-size:13px;padding-left:21px}
          .ca-method{padding-block:88px 96px}.ca-method .ca-intro{margin-bottom:42px}.ca-method-grid{display:block}.ca-method-step{min-height:0;padding:25px 26px 28px}.ca-method-step h3{font-size:32px;margin:22px 0 12px}.ca-method-step p{font-size:14px}.ca-method-step small{margin-top:24px}
           .ca-foundation{padding-block:87px 93px}.ca-foundation-inner{display:block}.ca-foundation h2{font-size:clamp(43px,10vw,60px)}.ca-foundation p{font-size:16px}.ca-foundation-diagram{margin-top:55px}.ca-agent-bars{padding:0}.ca-agent-bars .ca-agent-bar{font-size:13px}.ca-agent-bars .ca-agent-bar:nth-child(2){margin-inline:12px 0}.ca-agent-bars .ca-agent-bar:nth-child(3){margin-inline:24px 0}.ca-base-bar strong{font-size:19px}
          .ca-deploy{padding-block:87px 99px}.ca-deploy .ca-intro{margin-bottom:41px}.ca-deploy-row{grid-template-columns:40px 1fr;gap:8px 10px;padding:25px 0}.ca-deploy-row h3{font-size:24px}.ca-deploy-row p{grid-column:2;font-size:13px}
          .ca-faq{padding-block:86px 99px}.ca-faq-inner{display:block}.ca-faq h2{font-size:47px}.ca-faq-intro{margin-bottom:37px}.ca-faq-item{display:block;padding:23px 0 25px}.ca-faq-item h3{font-size:19px;margin-bottom:10px}.ca-faq-item p{font-size:14px}
          .ca-close-inner{padding-block:88px 54px}.ca-close h2{font-size:clamp(46px,10.7vw,68px)}.ca-close p{font-size:16px}.ca-close-foot{margin-top:90px}
        }
        @media(max-width:390px){.ca-actions{gap:15px}.ca-map-stage{grid-template-columns:62px 1fr}.ca-map-stage small{font-size:9px}.ca-base-bar{padding:18px}.ca-base-bar small{font-size:8px}}
        @media(prefers-reduced-motion:reduce){.ca-page *,.ca-page *:before,.ca-page *:after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
      `}</style>

      <section className="ca-hero ca-wrap public-hero-shell" aria-labelledby="ca-title">
        <Eyebrow>{page.hero.eyebrow}</Eyebrow>
        <div className="ca-hero-grid">
          <div className="ca-hero-copy">
            <h1 id="ca-title" className="ca-heading"><PulseHeading text={page.hero.headline} /></h1>
            <p>{page.hero.body}</p>
            <div className="ca-actions">
              {page.hero.ctas[0] && <BrandButton href={page.hero.ctas[0].href} data-testid="link-cogniagents-explore-agents">{page.hero.ctas[0].label}</BrandButton>}
              {page.hero.ctas.slice(1).map((cta, index) => <a href={cta.href} key={index} className="ca-jump" data-testid="link-cogniagents-book-workshop-hero">{cta.label} <ArrowUpRight size={16} aria-hidden="true" /></a>)}
            </div>
            <div className="ca-hero-foot">{page.hero.footnote}</div>
          </div>
          <div className="ca-map" role="img" aria-label={page.diagram.accessibleDescription}>
            <div className="ca-map-top"><span>{diagram.topBrand}</span><span>{diagram.topCaption}</span></div>
            <p className="ca-map-title">{diagram.title}</p>
            <div className="ca-map-route">
              <div className="ca-map-stage"><small>{diagram.intakeStep}</small><strong>{diagram.intake}</strong></div>
              <div className="ca-map-stage"><small>{diagram.prepareStep}</small><strong>{diagram.prepare}</strong></div>
              <div className="ca-map-stage ca-human"><Hand size={20} aria-hidden="true" /><div><small>{diagram.humanCheckpoint}</small><strong>{diagram.humanReview}</strong></div></div>
              <div className="ca-map-stage"><small>{diagram.actStep}</small><strong>{diagram.act}</strong></div>
            </div>
            <div className="ca-map-bottom"><span>{diagram.permissions}</span><span>{diagram.decisionLogged}</span></div>
          </div>
        </div>
        <div className="ca-proof" aria-label="CogniAgents at a glance">
          {page.proofItems.map((item, index) => <span key={index}><i aria-hidden="true" />{item}</span>)}
        </div>
      </section>
      {page.sectionOrder.map(id => sections[id].visible && <div className="ca-section-slot" key={id}>{renderSection(id)}{(sections[id].highlightedText || sections[id].footer) && <aside className="ca-wrap ca-section-extras">{sections[id].highlightedText && <strong>{sections[id].highlightedText}</strong>}{sections[id].footer && <p>{sections[id].footer}</p>}</aside>}</div>)}

      <section className="ca-close" aria-labelledby="ca-close-title">
        <div className="ca-wrap ca-close-inner"><Eyebrow>{page.closing.eyebrow}</Eyebrow><h2 id="ca-close-title" className="ca-heading"><PulseHeading text={page.closing.heading} /></h2><p>{page.closing.body}</p><BrandButton href={page.closing.cta.href} data-testid="link-cogniagents-book-workshop-closing">{page.closing.cta.label}</BrandButton><div className="ca-close-foot"><span>{page.closing.footerLeft}</span><span>{page.closing.footerRight} <Check size={12} aria-hidden="true" /></span></div></div>
      </section>
    </main>
  );
}