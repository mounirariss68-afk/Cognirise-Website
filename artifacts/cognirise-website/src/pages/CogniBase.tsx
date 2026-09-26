import { ArrowDown, ArrowRight, ArrowUpRight, Check, Database, FileText, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { PulseHeading, PulseLinks } from "@/components/cms/PulseCopy";
import { cognibasePulsePageDraft, type CogniBasePulsePage } from "@workspace/api-zod";

function Kicker({ children }: { children: React.ReactNode }) {
  return <span className="cb-kicker"><span className="cb-kicker-line" aria-hidden="true" />{children}</span>;
}

export default function CogniBase({ page = cognibasePulsePageDraft, preview = false }: { page?: CogniBasePulsePage; preview?: boolean }) {
  const sections = Object.fromEntries(page.sections.map(section => [section.id, section])) as Record<CogniBasePulsePage["sections"][number]["id"], CogniBasePulsePage["sections"][number]>;
  const diagram = Object.fromEntries(page.diagram.labels.map(label => [label.id, label.text])) as Record<CogniBasePulsePage["diagram"]["labels"][number]["id"], string>;
  const renderSection = (id: CogniBasePulsePage["sections"][number]["id"]) => {
    const section = sections[id];
    if (!section.visible) return null;
    switch (id) {
      case "problem": return <section className="cb-problem cb-frame" key={id} aria-labelledby="cb-problem-title"><div><Kicker>{section.eyebrow}</Kicker><h2 id="cb-problem-title" className="cb-display"><PulseHeading text={section.heading} /></h2></div><div className="cb-problem-copy"><p>{section.body}</p>{section.items.map((item, i) => <strong key={i}>{item.title}</strong>)}<PulseLinks links={section.links} className="cb-text-link" /></div></section>;
      case "capabilities": return <section className="cb-capabilities" key={id} aria-labelledby="cb-capabilities-title"><div className="cb-frame"><div className="cb-section-head"><div><Kicker>{section.eyebrow}</Kicker><h2 id="cb-capabilities-title" className="cb-display"><PulseHeading text={section.heading} /></h2></div><p className="cb-muted">{section.body}</p></div><div className="cb-cap-list">{section.items.map((item, i) => <article className="cb-cap" key={i}><span className="cb-cap-number">{item.label ? String(i + 1).padStart(2, "0") + " / " + String(section.items.length).padStart(2, "0") : String(i + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.body}</p><span className="cb-cap-tag">{item.label}</span></article>)}</div><PulseLinks links={section.links} className="cb-text-link" /></div></section>;
      case "how-it-works": return <section className="cb-how cb-frame" id="how-it-works" key={id} aria-labelledby="cb-how-title"><div className="cb-section-head"><div><Kicker>{section.eyebrow}</Kicker><h2 id="cb-how-title" className="cb-display"><PulseHeading text={section.heading} /></h2></div><p className="cb-muted">{section.body}</p></div><div className="cb-flow">{section.items.map((item, i) => <article className="cb-step" key={i}><span className="cb-step-node" aria-hidden="true" /><small>{item.label}</small><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>{section.footer && <div className="cb-flow-note"><FileText size={16} aria-hidden="true" />{section.footer}</div>}<PulseLinks links={section.links} className="cb-text-link" /></section>;
      case "teams": return <section className="cb-teams" key={id} aria-labelledby="cb-teams-title"><div className="cb-frame"><div className="cb-section-head"><div><Kicker>{section.eyebrow}</Kicker><h2 id="cb-teams-title" className="cb-display"><PulseHeading text={section.heading} /></h2></div><p className="cb-muted">{section.body}</p></div><div className="cb-team-list">{section.items.map((item, i) => <article className="cb-team" key={i}><ArrowUpRight aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}</div><PulseLinks links={section.links} className="cb-text-link" /></div></section>;
      case "deployment": return <section className="cb-deploy cb-frame" key={id} aria-labelledby="cb-deploy-title"><div className="cb-section-head"><div><Kicker>{section.eyebrow}</Kicker><h2 id="cb-deploy-title" className="cb-display"><PulseHeading text={section.heading} /></h2></div><p className="cb-muted">{section.body}</p></div><div className="cb-deploy-list">{section.items.map((item, i) => <article className="cb-deploy-row" key={i}><span>{item.label}</span><h3>{item.title}</h3><p>{item.body}</p><small>{item.detail}</small></article>)}</div><PulseLinks links={section.links} className="cb-text-link" /></section>;
      case "trust": return <section className="cb-trust" key={id} aria-labelledby="cb-trust-title"><div className="cb-trust-inner cb-frame"><div><Kicker>{section.eyebrow}</Kicker><h2 id="cb-trust-title" className="cb-display"><PulseHeading text={section.heading} /></h2><p>{section.body}</p><PulseLinks links={section.links} className="cb-text-link" /></div><div className="cb-trust-rail" aria-label={section.eyebrow}>{section.items.map((item, i) => <div key={i}><ShieldCheck size={18} aria-hidden="true" />{item.title}</div>)}</div></div></section>;
      case "faq": return <section className="cb-faq cb-frame" key={id} aria-labelledby="cb-faq-title"><div><Kicker>{section.eyebrow}</Kicker><h2 id="cb-faq-title" className="cb-display"><PulseHeading text={section.heading} /></h2><p className="cb-faq-intro">{section.body}</p></div><div className="cb-faq-list">{section.items.map((item, i) => <article className="cb-faq-item" key={i} data-testid={`faq-cognibase-${i + 1}`}><span className="cb-faq-number">{String(i + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}<PulseLinks links={section.links} className="cb-text-link" /></div></section>;
    }
  };
  return (
    <main className="cb-page" data-layout={page.layout} data-tone={page.tone} data-preview={preview ? "draft" : undefined}>
      <style>{`
        .cb-page{--cb-ink:#102957;--cb-deep:#071936;--cb-paper:#fdfcfb;--cb-lilac:#f2effb;--cb-blush:#faf0f0;--cb-mist:#eef1f6;--cb-line:#cbd3e1;--cb-violet:#7659df;--cb-pink:#db509e;--cb-coral:#ff775d;background:var(--cb-paper);color:var(--cb-ink);font-family:Inter,sans-serif;overflow:clip}
        .cb-page *{box-sizing:border-box}.cb-page :focus-visible{outline:3px solid var(--cb-coral);outline-offset:4px}
        .cb-page h1,.cb-page h2,.cb-page h3,.cb-page p{margin-top:0}.cb-page h1,.cb-page h2,.cb-page h3{font-family:Comfortaa,sans-serif}
        .cb-frame{max-width:1440px;margin:0 auto;padding-left:4.8vw;padding-right:4.8vw}
        .cb-kicker{display:inline-flex;align-items:center;gap:11px;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;line-height:1.5}
        .cb-kicker-line{display:inline-block;width:25px;height:2px;background:linear-gradient(90deg,var(--cb-violet),var(--cb-pink),var(--cb-coral));flex:none}
        .cb-display{font-weight:600;letter-spacing:-.075em;line-height:1.035}
        .cb-display em{font-style:normal;color:var(--cb-pink)}
        .cb-muted{color:#526786}
        .cb-section-head{display:grid;grid-template-columns:1fr .7fr;gap:7vw;align-items:end}
        .cb-section-head h2{font-size:clamp(38px,4.8vw,70px);max-width:750px;margin:19px 0 0}
        .cb-section-head p{font-size:16px;line-height:1.65;max-width:430px;margin:0 0 6px}
        .cb-hero{padding-top:27px;padding-bottom:48px}
        .cb-hero-grid{display:grid;grid-template-columns:minmax(0,.94fr) minmax(0,1.06fr);align-items:center;gap:5.2vw;min-height:650px}
        .cb-hero-copy{padding:36px 0 48px}
        .cb-hero h1{font-size:clamp(53px,6.1vw,91px);max-width:740px;margin:32px 0 30px}
        .cb-hero h1 em{display:block}
        .cb-hero-copy>p{font-size:clamp(17px,1.4vw,20px);line-height:1.62;max-width:550px;color:#405777;margin-bottom:36px}
        .cb-actions{display:flex;align-items:center;flex-wrap:wrap;gap:24px}
        .cb-text-link{font-size:14px;font-weight:700;display:inline-flex;align-items:center;gap:10px;border-bottom:1px solid var(--cb-ink);padding:8px 0;color:var(--cb-ink);text-decoration:none;transition:color .2s,border-color .2s}
        .cb-text-link:hover{color:var(--cb-pink);border-color:var(--cb-pink)}.cb-text-link svg{transition:transform .2s}.cb-text-link:hover svg{transform:translateY(3px)}
        .cb-hero-aside{display:flex;gap:10px;align-items:center;margin-top:64px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#697b98}
        .cb-hero-aside span{width:32px;height:1px;background:var(--cb-line)}
        .cb-system{position:relative;min-height:582px;padding:44px 33px 32px;background:linear-gradient(140deg,#f0edfa 0%,#f8f3f7 55%,#eef1f6 100%);clip-path:polygon(9% 0,100% 0,100% 91%,91% 100%,0 100%,0 9%);overflow:hidden}
        .cb-system:before{content:"";position:absolute;inset:0;background-image:linear-gradient(to right,rgba(16,41,87,.045) 1px,transparent 1px),linear-gradient(to bottom,rgba(16,41,87,.045) 1px,transparent 1px);background-size:38px 38px;pointer-events:none}
        .cb-system-top{position:relative;display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #b9c3d5;padding-bottom:15px;font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}
        .cb-system-top span:last-child{color:var(--cb-pink)}
        .cb-system-query{position:relative;margin:24px 0 19px;padding:15px 18px;background:var(--cb-deep);color:#fff;display:flex;justify-content:space-between;gap:20px;align-items:center;font-family:Comfortaa;font-size:clamp(12px,1.15vw,16px);line-height:1.4}
        .cb-system-query svg{color:var(--cb-coral);flex:none}
        .cb-system-middle{position:relative;display:grid;grid-template-columns:1fr 54px 1fr;align-items:center;min-height:164px}
        .cb-source-stack{display:grid;gap:8px}.cb-source{background:rgba(253,252,251,.88);border-left:3px solid var(--cb-violet);padding:10px 12px;box-shadow:0 4px 12px rgba(16,41,87,.04)}
        .cb-source:nth-child(2){margin-left:15px;border-color:var(--cb-pink)}.cb-source:nth-child(3){margin-left:29px;border-color:var(--cb-coral)}
        .cb-source b{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
        .cb-source small{font-size:10px;color:#647693}.cb-system-transfer{display:flex;justify-content:center;color:var(--cb-pink)}
        .cb-retrieval{border:1px solid #aca0df;background:#e9e3fa;padding:16px 13px;min-height:139px;display:flex;flex-direction:column;justify-content:center;gap:11px}
        .cb-retrieval-label{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#5946a8}
        .cb-retrieval div{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600}
        .cb-retrieval div span{height:4px;flex:1;background:linear-gradient(90deg,var(--cb-violet),var(--cb-pink),var(--cb-coral))}
        .cb-system-down{height:36px;display:flex;align-items:center;justify-content:center;color:var(--cb-pink)}
        .cb-answer{position:relative;background:var(--cb-paper);border:1px solid #b9c3d5;padding:18px 19px 17px;box-shadow:10px 10px 0 rgba(118,89,223,.1)}
        .cb-answer-head{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#5e6f88;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid var(--cb-line);padding-bottom:10px}
        .cb-answer-head span:last-child{display:flex;align-items:center;gap:5px;color:#316c66}
        .cb-answer p{font-family:Comfortaa;font-size:clamp(14px,1.25vw,18px);font-weight:600;line-height:1.4;letter-spacing:-.04em;margin:14px 0}
        .cb-citation{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:10px;color:#5946a8}
        .cb-citation span{border:1px solid #c8bdeb;background:#f2effb;padding:5px 7px;font-weight:700}
        .cb-system-foot{position:relative;margin-top:21px;display:flex;justify-content:space-between;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6c7d96}
        .cb-proof{border-top:1px solid var(--cb-ink);border-bottom:1px solid var(--cb-ink);display:grid;grid-template-columns:repeat(5,1fr)}
        .cb-proof span{padding:19px 14px 19px 0;font-size:12px;font-weight:700;line-height:1.3;display:flex;align-items:center;gap:11px;border-right:1px solid var(--cb-line);margin-right:16px}
        .cb-proof span:last-child{border:0;margin-right:0}.cb-proof i{height:5px;width:5px;flex:none;background:var(--cb-pink);border-radius:50%}
        .cb-problem{padding-top:142px;padding-bottom:143px;display:grid;grid-template-columns:.9fr 1.1fr;gap:10vw}
        .cb-problem h2{font-size:clamp(41px,5.3vw,77px);margin:25px 0 0;max-width:600px}
        .cb-problem h2 em{font-style:normal;color:var(--cb-pink)}
        .cb-problem-copy{border-top:1px solid var(--cb-ink);padding-top:25px;align-self:end}
        .cb-problem-copy p{font-size:clamp(17px,1.6vw,22px);line-height:1.55;color:#344d70;max-width:640px;margin-bottom:26px}
        .cb-problem-copy strong{font:600 clamp(20px,2vw,27px)/1.35 Comfortaa;color:var(--cb-ink);letter-spacing:-.045em}
        .cb-capabilities{background:var(--cb-lilac);padding-top:111px;padding-bottom:124px}
        .cb-capabilities .cb-section-head{padding-bottom:63px}
        .cb-cap-list{border-top:1px solid var(--cb-ink)}
        .cb-cap{display:grid;grid-template-columns:75px minmax(0,.95fr) minmax(0,1.05fr) 160px;gap:24px;align-items:start;border-bottom:1px solid #c9c4df;padding:31px 4px 34px;transition:background .2s,padding .2s}
        .cb-cap:hover{background:rgba(253,252,251,.48);padding-left:15px;padding-right:15px}
        .cb-cap-number{font-size:11px;font-weight:700;color:var(--cb-pink);letter-spacing:.12em;padding-top:8px}
        .cb-cap h3{font-size:clamp(20px,2.05vw,30px);font-weight:600;line-height:1.2;letter-spacing:-.055em;max-width:390px;margin:0}
        .cb-cap p{font-size:14px;line-height:1.67;color:#405777;max-width:510px;margin:2px 0 0}
        .cb-cap-tag{text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#77689d;padding-top:8px}
         .cb-how{padding-top:130px;padding-bottom:136px;scroll-margin-top:82px}
        .cb-how .cb-section-head{margin-bottom:64px}
        .cb-flow{position:relative;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--cb-ink)}
        .cb-flow:before{content:"";position:absolute;top:41px;left:4%;right:4%;height:1px;background:linear-gradient(90deg,var(--cb-violet),var(--cb-pink),var(--cb-coral));pointer-events:none}
        .cb-step{position:relative;padding:27px 29px 0 0;min-height:280px;border-right:1px solid var(--cb-line)}
        .cb-step:not(:first-child){padding-left:29px}.cb-step:last-child{border:0}
        .cb-step-node{position:relative;display:block;width:30px;height:30px;background:var(--cb-paper);border:2px solid var(--cb-pink);border-radius:50%;margin:0 0 52px;z-index:1}
        .cb-step-node:after{content:"";position:absolute;width:8px;height:8px;inset:9px;background:var(--cb-pink);border-radius:50%}
        .cb-step:nth-child(1) .cb-step-node{border-color:var(--cb-violet)}.cb-step:nth-child(1) .cb-step-node:after{background:var(--cb-violet)}
        .cb-step:nth-child(4) .cb-step-node{border-color:var(--cb-coral)}.cb-step:nth-child(4) .cb-step-node:after{background:var(--cb-coral)}
        .cb-step small{font-size:10px;font-weight:700;letter-spacing:.12em;color:#8a77a9}
        .cb-step h3{font-size:clamp(25px,2.4vw,35px);font-weight:600;letter-spacing:-.06em;margin:13px 0 16px}
        .cb-step p{font-size:14px;line-height:1.6;color:#526786;max-width:230px}
        .cb-flow-note{border-top:1px solid var(--cb-line);padding-top:17px;margin-top:29px;display:flex;align-items:center;gap:12px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:#7d688d}
        .cb-flow-note svg{color:var(--cb-pink)}
        .cb-teams{background:var(--cb-mist);padding-top:111px;padding-bottom:128px}
        .cb-teams .cb-section-head{margin-bottom:65px}
        .cb-team-list{display:grid;grid-template-columns:1fr 1fr;column-gap:8vw;border-top:1px solid var(--cb-ink)}
        .cb-team{display:grid;grid-template-columns:42px 1fr;gap:13px;border-bottom:1px solid var(--cb-line);padding:29px 0 32px}
        .cb-team svg{width:17px;height:17px;color:var(--cb-pink);margin-top:4px;transition:transform .2s}
        .cb-team:hover svg{transform:translate(3px,-3px)}
        .cb-team h3{font-size:clamp(19px,1.8vw,25px);letter-spacing:-.055em;line-height:1.2;margin:0 0 11px}
        .cb-team p{font-size:14px;line-height:1.6;color:#526786;max-width:430px;margin:0}
        .cb-deploy{padding-top:126px;padding-bottom:143px}
        .cb-deploy .cb-section-head{margin-bottom:64px}
        .cb-deploy-list{border-top:1px solid var(--cb-ink)}
        .cb-deploy-row{display:grid;grid-template-columns:90px 1fr 1fr 160px;gap:20px;align-items:center;border-bottom:1px solid var(--cb-line);padding:28px 3px}
        .cb-deploy-row>span:first-child{font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--cb-pink)}
        .cb-deploy-row h3{font-size:clamp(23px,2.5vw,35px);letter-spacing:-.06em;margin:0}
        .cb-deploy-row p{font-size:14px;line-height:1.5;color:#526786;margin:0}
        .cb-deploy-row small{text-align:right;color:#86789a;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
        .cb-trust{background:var(--cb-deep);color:#fdfcfb;position:relative;overflow:hidden}
        .cb-trust:before{content:"";position:absolute;right:-8%;top:-62%;width:60%;aspect-ratio:1;border:1px solid rgba(219,80,158,.2);border-radius:50%;box-shadow:0 0 0 95px rgba(118,89,223,.035),0 0 0 190px rgba(255,119,93,.025);pointer-events:none}
        .cb-trust-inner{position:relative;display:grid;grid-template-columns:1.1fr .9fr;gap:9vw;padding-top:116px;padding-bottom:117px}
        .cb-trust h2{font-size:clamp(42px,5vw,73px);margin:25px 0 25px;max-width:650px}
        .cb-trust h2 em{color:#f487ba}
        .cb-trust p{font-size:17px;line-height:1.7;color:#d4deee;max-width:660px;margin:0}
        .cb-trust .cb-kicker{color:#f9bdce}
        .cb-trust-rail{align-self:end;border-top:1px solid rgba(255,255,255,.35)}
        .cb-trust-rail div{display:flex;align-items:center;gap:17px;border-bottom:1px solid rgba(255,255,255,.25);padding:20px 0;font:600 clamp(16px,1.5vw,21px)/1.35 Comfortaa;letter-spacing:-.035em}
        .cb-trust-rail svg{color:#ff9985;flex:none}
        .cb-faq{padding-top:127px;padding-bottom:143px;display:grid;grid-template-columns:.68fr 1.32fr;gap:8vw}
        .cb-faq h2{font-size:clamp(40px,5vw,73px);margin:22px 0}
        .cb-faq-intro{font-size:15px;line-height:1.6;color:#526786;max-width:300px}
        .cb-faq-list{border-top:1px solid var(--cb-ink)}
         .cb-faq-item{display:grid;grid-template-columns:55px 1fr;gap:15px;border-bottom:1px solid var(--cb-line);padding:26px 1px 30px}
         .cb-faq-number{font-size:11px;letter-spacing:.12em;font-weight:700;color:var(--cb-pink);padding-top:5px}
         .cb-faq-item h3{font-size:clamp(18px,1.65vw,23px);font-weight:600;line-height:1.35;letter-spacing:-.04em;margin:0 0 10px}
         .cb-faq-item p{font-size:15px;line-height:1.7;color:#526786;max-width:650px;margin:0}
        .cb-close{background:var(--cb-blush);position:relative;overflow:hidden}
        .cb-close:before{content:"";position:absolute;right:-120px;bottom:-265px;width:570px;height:570px;border:1px solid rgba(219,80,158,.24);border-radius:50%;box-shadow:0 0 0 76px rgba(219,80,158,.045),0 0 0 154px rgba(118,89,223,.04);pointer-events:none}
        .cb-close-inner{position:relative;padding-top:112px;padding-bottom:124px}
        .cb-close h2{font-size:clamp(45px,6.3vw,94px);max-width:950px;margin:25px 0}
        .cb-close p{font-size:19px;line-height:1.6;color:#405777;margin:0 0 33px}
        .cb-close-bottom{margin-top:98px;border-top:1px solid var(--cb-ink);padding-top:18px;display:flex;justify-content:space-between;gap:20px;font-size:10px;letter-spacing:.13em;text-transform:uppercase;font-weight:700;color:#6e7290}
        @media(max-width:1000px){.cb-cap{grid-template-columns:55px 1fr 1.15fr}.cb-cap-tag{display:none}.cb-deploy-row{grid-template-columns:55px 1fr 1fr}.cb-deploy-row small{display:none}.cb-system{padding:35px 25px;min-height:555px}.cb-hero-grid{gap:3vw}}
        @media(max-width:767px){
          .cb-frame{padding-left:24px;padding-right:24px}.cb-hero{padding-top:31px;padding-bottom:35px}.cb-hero-grid{display:block;min-height:0}.cb-hero-copy{padding:0 0 36px}.cb-hero h1{font-size:clamp(47px,11vw,69px);margin:25px 0}.cb-hero h1 em{display:inline}.cb-hero-copy>p{font-size:16px;margin-bottom:28px}.cb-hero-aside{margin-top:38px}.cb-system{min-height:0;padding:30px 24px 31px;margin:0 -24px;clip-path:polygon(7% 0,100% 0,100% 94%,93% 100%,0 100%,0 6%)}
          .cb-system-query{font-size:13px}.cb-system-middle{grid-template-columns:1fr 36px 1fr}.cb-source{padding:8px}.cb-source b,.cb-source small{font-size:9px}.cb-source:nth-child(2){margin-left:7px}.cb-source:nth-child(3){margin-left:14px}.cb-retrieval{padding:10px;min-height:132px}.cb-retrieval div{font-size:9px}.cb-retrieval-label{font-size:9px}.cb-answer p{font-size:15px}
          .cb-proof{grid-template-columns:1fr 1fr;gap:0}.cb-proof span{min-height:62px;padding:13px 8px 13px 0;margin-right:10px;font-size:11px}.cb-proof span:nth-child(even){border:0;margin-right:0}.cb-proof span:nth-child(-n+4){border-bottom:1px solid var(--cb-line)}
          .cb-section-head{display:block}.cb-section-head h2{font-size:clamp(38px,9vw,52px)}.cb-section-head p{margin-top:25px}
          .cb-problem{padding-top:86px;padding-bottom:95px;display:block}.cb-problem h2{font-size:clamp(42px,10vw,62px)}.cb-problem-copy{margin-top:43px}.cb-problem-copy p{font-size:18px}
          .cb-capabilities{padding-top:82px;padding-bottom:95px}.cb-capabilities .cb-section-head{padding-bottom:42px}.cb-cap{grid-template-columns:41px 1fr;gap:12px;padding:25px 0 28px}.cb-cap:hover{padding-left:0;padding-right:0;background:transparent}.cb-cap h3{font-size:21px}.cb-cap p{grid-column:2;font-size:13px;margin:0}
          .cb-how{padding-top:88px;padding-bottom:95px}.cb-how .cb-section-head{margin-bottom:45px}.cb-flow{display:block;border-top:0;border-left:1px solid var(--cb-ink);margin-left:14px}.cb-flow:before{top:0;bottom:0;left:0;right:auto;width:1px;height:auto}.cb-step,.cb-step:not(:first-child){min-height:0;padding:0 0 37px 35px;border-right:0}.cb-step-node{position:absolute;left:-15px;top:0;margin:0}.cb-step h3{font-size:27px;margin:10px 0}.cb-step p{max-width:460px}.cb-flow-note{margin-top:0}
          .cb-teams{padding-top:82px;padding-bottom:92px}.cb-teams .cb-section-head{margin-bottom:42px}.cb-team-list{display:block}.cb-team{padding:23px 0}.cb-team h3{font-size:21px}
          .cb-deploy{padding-top:87px;padding-bottom:99px}.cb-deploy .cb-section-head{margin-bottom:42px}.cb-deploy-row{grid-template-columns:39px 1fr;gap:10px;padding:25px 0}.cb-deploy-row h3{font-size:24px}.cb-deploy-row p{grid-column:2;font-size:13px;margin-top:-5px}
          .cb-trust-inner{display:block;padding-top:86px;padding-bottom:91px}.cb-trust h2{font-size:clamp(43px,10vw,60px)}.cb-trust p{font-size:15px}.cb-trust-rail{margin-top:43px}.cb-trust-rail div{font-size:17px}
           .cb-faq{display:block;padding-top:87px;padding-bottom:99px}.cb-faq h2{font-size:47px}.cb-faq-intro{margin-bottom:36px}.cb-faq-item{grid-template-columns:36px 1fr;gap:10px;padding:23px 0}.cb-faq-item h3{font-size:18px}.cb-faq-item p{font-size:14px}
          .cb-close-inner{padding-top:88px;padding-bottom:55px}.cb-close h2{font-size:clamp(47px,11vw,70px)}.cb-close p{font-size:16px}.cb-close-bottom{margin-top:83px}
        }
        @media(max-width:390px){.cb-system{padding-left:18px;padding-right:18px}.cb-system-middle{grid-template-columns:1fr 22px 1fr}.cb-system-transfer svg{width:16px}.cb-source small{display:none}.cb-retrieval div span{display:none}.cb-actions{gap:15px}}
        @media(prefers-reduced-motion:reduce){.cb-page *,.cb-page *:before,.cb-page *:after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
      `}</style>

      <section className="cb-hero cb-frame public-hero-shell" aria-labelledby="cb-title">
        <Kicker>Products / CogniBase</Kicker>
        <div className="cb-hero-grid">
          <div className="cb-hero-copy">
            <h1 id="cb-title" className="cb-display">Enterprise knowledge, <em>answered with proof.</em></h1>
            <p>CogniBase connects AI to your documents, databases and business systems, and returns grounded answers with the source cited. It runs in your cloud, on your premises, under your control.</p>
            <div className="cb-actions">
              <BrandButton href="/contact" data-testid="link-cognibase-demo-hero">Book a demo</BrandButton>
              <a href="#how-it-works" className="cb-text-link" data-testid="link-cognibase-how-it-works">See how it works <ArrowDown size={15} aria-hidden="true" /></a>
            </div>
            <div className="cb-hero-aside"><span aria-hidden="true" />Knowledge in. Evidence out.</div>
          </div>
          <div className="cb-system" role="img" aria-label="A question retrieves passages from controlled enterprise sources through hybrid search and reranking, producing an answer with source citations.">
             <div className="cb-system-top"><span>CogniBase / Evidence route</span><span>Illustrative flow</span></div>
            <div className="cb-system-query"><span>What does the policy actually say?</span><Search size={20} aria-hidden="true" /></div>
            <div className="cb-system-middle">
              <div className="cb-source-stack">
                 <div className="cb-source"><b>Policy / PDF</b><small>Page · passage</small></div>
                 <div className="cb-source"><b>Internal wiki</b><small>Section · article</small></div>
                 <div className="cb-source"><b>Records / SQL</b><small>Record · source</small></div>
              </div>
              <div className="cb-system-transfer"><ArrowRight size={22} aria-hidden="true" /></div>
              <div className="cb-retrieval">
                <span className="cb-retrieval-label">Retrieve &amp; rerank</span>
                <div><Search size={13} aria-hidden="true" /> Keyword <span /></div>
                <div><Database size={13} aria-hidden="true" /> Semantic <span /></div>
                <div><Check size={13} aria-hidden="true" /> Relevant evidence <span /></div>
              </div>
            </div>
            <div className="cb-system-down"><ArrowDown size={17} aria-hidden="true" /></div>
            <div className="cb-answer">
              <div className="cb-answer-head"><span>Grounded answer</span><span><ShieldCheck size={13} aria-hidden="true" /> Source linked</span></div>
              <p>An answer you can trace back to the exact passage, page or record.</p>
               <div className="cb-citation"><span>↗ Policy · page</span><span>↗ Wiki · section</span></div>
            </div>
            <div className="cb-system-foot"><span>Access rights preserved</span><span>Not in the data? No guess.</span></div>
          </div>
        </div>
        <div className="cb-proof" aria-label="CogniBase at a glance">
          {["Cited answers", "Hybrid retrieval", "Self-hostable", "EU data residency", "Teams-native"].map(item => <span key={item}><i aria-hidden="true" />{item}</span>)}
        </div>
      </section>

      <section className="cb-problem cb-frame" aria-labelledby="cb-problem-title">
        <div><Kicker>The problem</Kicker><h2 id="cb-problem-title" className="cb-display">A plausible answer is <em>not enough.</em></h2></div>
        <div className="cb-problem-copy">
          <p>Most enterprise AI pilots stall for the same three reasons. Answers can't be traced back to a source, so nobody trusts them. The knowledge they need is scattered across SharePoint, ERP, CRM, wikis and databases. And data can't leave the building, which rules out most off-the-shelf tools.</p>
          <strong>CogniBase is built for exactly these constraints.</strong>
        </div>
      </section>

      <section className="cb-capabilities" aria-labelledby="cb-capabilities-title">
        <div className="cb-frame">
          <div className="cb-section-head">
            <div><Kicker>Core capabilities</Kicker><h2 id="cb-capabilities-title" className="cb-display">From scattered sources to <em>defensible answers.</em></h2></div>
            <p className="cb-muted">Retrieval, integration, sovereignty and evaluation are designed as parts of the same knowledge system.</p>
          </div>
          <div className="cb-cap-list">
            {capabilities.map(item => (
              <article className="cb-cap" key={item.number}>
                <span className="cb-cap-number">{item.number} / 06</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <span className="cb-cap-tag">{item.tag}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cb-how cb-frame" id="how-it-works" aria-labelledby="cb-how-title">
        <div className="cb-section-head">
          <div><Kicker>How it works</Kicker><h2 id="cb-how-title" className="cb-display">A clear path from source to <em>answer.</em></h2></div>
          <p className="cb-muted">Every step keeps the evidence and its boundaries in view.</p>
        </div>
        <div className="cb-flow">
          {steps.map(step => (
            <article className="cb-step" key={step.number}>
              <span className="cb-step-node" aria-hidden="true" />
              <small>{step.number} / 04</small>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
        <div className="cb-flow-note"><FileText size={16} aria-hidden="true" /> The answer keeps its route back to the evidence.</div>
      </section>

      <section className="cb-teams" aria-labelledby="cb-teams-title">
        <div className="cb-frame">
          <div className="cb-section-head">
            <div><Kicker>Built for every team</Kicker><h2 id="cb-teams-title" className="cb-display">One knowledge layer. <em>Many ways to work.</em></h2></div>
            <p className="cb-muted">Different questions, same standard of traceability.</p>
          </div>
          <div className="cb-team-list">
            {teams.map(team => (
              <article className="cb-team" key={team.title}>
                <ArrowUpRight aria-hidden="true" />
                <div><h3>{team.title}</h3><p>{team.body}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cb-deploy cb-frame" aria-labelledby="cb-deploy-title">
        <div className="cb-section-head">
          <div><Kicker>Deployment options</Kicker><h2 id="cb-deploy-title" className="cb-display">Your environment sets <em>the boundary.</em></h2></div>
          <p className="cb-muted">Choose the operating model that fits your infrastructure and sovereignty requirements.</p>
        </div>
        <div className="cb-deploy-list">
          {deployments.map(option => (
            <article className="cb-deploy-row" key={option.number}>
              <span>{option.number} / 03</span><h3>{option.title}</h3><p>{option.body}</p><small>{option.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="cb-trust" aria-labelledby="cb-trust-title">
        <div className="cb-trust-inner cb-frame">
          <div>
            <Kicker>Trust and compliance</Kicker>
            <h2 id="cb-trust-title" className="cb-display">Control is part of the <em>architecture.</em></h2>
            <p>CogniBase is designed for regulated industries. It keeps data in the region you choose, gives you traceability for every answer, logs every query for audit, and uses architecture patterns that support GDPR and EU AI Act obligations.</p>
          </div>
          <div className="cb-trust-rail" aria-label="Trust principles">
            <div><LockKeyhole size={18} aria-hidden="true" /> Data in the region you choose</div>
            <div><FileText size={18} aria-hidden="true" /> Traceability for every answer</div>
            <div><ShieldCheck size={18} aria-hidden="true" /> Every query logged for audit</div>
          </div>
        </div>
      </section>

      <section className="cb-faq cb-frame" aria-labelledby="cb-faq-title">
        <div><Kicker>FAQ</Kicker><h2 id="cb-faq-title" className="cb-display">The practical questions.</h2><p className="cb-faq-intro">The details that matter before you put knowledge into production.</p></div>
        <div className="cb-faq-list">
           {faqs.map((item, index) => (
             <article className="cb-faq-item" key={item.question} data-testid={`faq-cognibase-${index + 1}`}>
               <span className="cb-faq-number">{String(index + 1).padStart(2, "0")}</span>
               <div><h3>{item.question}</h3><p>{item.answer}</p></div>
             </article>
           ))}
        </div>
      </section>

      <section className="cb-close" aria-labelledby="cb-close-title">
        <div className="cb-close-inner cb-frame">
          <Kicker>Start with evidence</Kicker>
          <h2 id="cb-close-title" className="cb-display">Put your enterprise knowledge <em>to work.</em></h2>
          <p>Start with one team and one knowledge domain, then measure the results.</p>
          <BrandButton href="/contact" data-testid="link-cognibase-demo-closing">Book a demo</BrandButton>
          <div className="cb-close-bottom"><span>CogniBase / Cognirise</span><span>Answers you can account for <ArrowRight size={12} aria-hidden="true" style={{display:"inline-block",verticalAlign:"middle",marginLeft:5}} /></span></div>
        </div>
      </section>
    </main>
  );
}