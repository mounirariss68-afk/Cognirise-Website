import { useState } from "react";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { Link } from "wouter";
import { useSubmitEnquiry } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { scrollToSection } from "@/lib/motion";
import { SERVICE_LINE_LABELS } from "@/lib/serviceLines";

export default function ValueScan() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    role: "",
    processArea: "",
    operatingContext: "",
    stakeholders: "",
    intendedDecision: "",
    consent: false,
    website: "",
  });
  
  const submitEnquiry = useSubmitEnquiry();
  const { toast } = useToast();
  const { market } = useMarketStore();
  
  const marketLocation = getMarketLocationLabel(market);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const challengeContext = `Context: ${formData.operatingContext}\nStakeholders: ${formData.stakeholders}\nIntended Decision: ${formData.intendedDecision}`;

    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.company ||
      !formData.processArea ||
      !formData.operatingContext ||
      !formData.consent
    ) {
      toast({
        title: "Required fields missing",
        description: "Complete the required fields and confirm consent.",
        variant: "destructive"
      });
      return;
    }

    submitEnquiry.mutate({
      data: {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        organization: formData.company,
        role: formData.role || undefined,
        market,
        processArea: formData.processArea,
        challenge: challengeContext,
        consent: true,
        sourcePage: window.location.pathname,
        website: formData.website,
      }
    }, {
      onSuccess: () => {
        setIsSubmitted(true);
      },
      onError: () => {
        toast({
          title: "Submission failed",
          description: "There was an error booking your scan. Please try again or contact us directly.",
          variant: "destructive"
        });
      }
    });
  };

  const goTo = scrollToSection;

  return (
    <main className="vs">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .vs{--ink:#102957;--deep:#071936;--paper:#fdfcfb;--soft:#f1f3f7;--line:#cbd3e1;--muted:#526786;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}.vs *{box-sizing:border-box}.vs button{font:inherit}.vs :focus-visible{outline:3px solid var(--coral);outline-offset:4px}.vs h1,.vs h2,.vs h3{font-family:Comfortaa,sans-serif}
        .vs-links{margin-left:auto;display:flex;gap:26px;align-items:center}.vs-links button,.vs-under{border:0;background:none;color:var(--ink);font-size:12px;font-weight:600;cursor:pointer;padding:10px 0}.vs-links button:hover,.vs-under:hover{color:var(--pink)}.vs-primary{border:1px solid var(--ink);cursor:pointer;color:#fff;background:var(--ink);font-weight:700;font-size:12px;padding:4px 4px 4px 17px;min-height:46px;display:inline-flex;align-items:center;gap:15px;position:relative;isolation:isolate;overflow:hidden;transition:transform .24s cubic-bezier(.2,.8,.2,1),box-shadow .24s;text-decoration:none}.vs-primary:before{content:"";position:absolute;z-index:-2;inset:-1px;background:linear-gradient(105deg,var(--violet),var(--pink),var(--coral));opacity:0;transition:opacity .24s}.vs-primary:after{content:"";position:absolute;z-index:-1;inset:1px;background:var(--ink);transition:background .24s}.vs-primary svg{width:36px;height:36px;padding:10px;background:#fff;color:var(--ink);transition:transform .24s,background .24s,color .24s}.vs-primary:hover{transform:translate(-3px,-3px);box-shadow:6px 6px 0 var(--coral)}.vs-primary:hover:before{opacity:1}.vs-primary:hover:after{background:rgba(7,25,54,.94)}.vs-primary:hover svg{transform:translate(3px,-3px);background:var(--coral);color:#fff}.vs-menu{display:none;border:0;background:none;color:var(--ink)}
        .vs-kicker{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;display:flex;gap:10px;align-items:center}.vs-kicker:before{content:"";width:23px;height:1px;background:linear-gradient(90deg,var(--violet),var(--coral))}.vs-hero{padding:22px 4.8vw 0}.vs-hero-grid{min-height:670px;display:grid;grid-template-columns:.87fr 1.13fr;gap:5vw;align-items:end;padding-bottom:34px}.vs-hero-copy{padding-bottom:19px;position:relative;z-index:1}.vs h1{font-size:clamp(50px,6.7vw,104px);font-weight:600;line-height:.91;letter-spacing:-.085em;margin:30px 0 27px;max-width:670px}.vs h1 em,.vs h2 em{font-style:normal;color:var(--pink)}.vs-lead{font-size:17px;line-height:1.58;color:#415779;max-width:440px;margin:0 0 29px}.vs-hero-image{height:620px;overflow:hidden;position:relative;clip-path:polygon(10% 0,100% 0,100% 91%,0 100%,0 12%);background:var(--deep)}.vs-hero-image img{width:100%;height:100%;object-fit:cover}.vs-hero-image:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.35),transparent 52%),linear-gradient(0deg,rgba(7,25,54,.6),transparent 36%)}.vs-word{position:absolute;z-index:1;right:-10px;top:54px;color:#fff;font:600 clamp(62px,9vw,145px)/.8 Comfortaa,sans-serif;letter-spacing:-.11em;mix-blend-mode:overlay}.vs-caption{position:absolute;z-index:2;left:32px;bottom:27px;color:#fff;font-size:10px;letter-spacing:.11em;text-transform:uppercase}.vs-caption span{display:block;opacity:.72;margin-bottom:7px}.vs-strip{margin:0 4.8vw;display:grid;grid-template-columns:1.05fr 1fr 1fr;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}.vs-strip div{padding:18px 20px;border-right:1px solid var(--line);font-size:12px;line-height:1.4}.vs-strip div:last-child{border:0}.vs-strip b{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:#6a7891;margin-bottom:8px}
        .vs-intro{padding:146px 4.8vw 112px;display:grid;grid-template-columns:1fr 1.08fr;gap:8vw}.vs h2{font-size:clamp(42px,5.3vw,79px);line-height:.96;letter-spacing:-.08em;font-weight:600;margin:23px 0 0}.vs-intro-copy{align-self:end;border-top:1px solid var(--line);padding-top:22px;font-size:21px;line-height:1.43;color:#30486d}.vs-intro-copy p{margin:0;max-width:570px}.vs-intro-copy small{display:block;margin-top:20px;font-size:12px;line-height:1.55;color:#667796;max-width:470px}
        .vs-break{height:min(610px,48vw);min-height:470px;margin:0 4.8vw;position:relative;overflow:hidden;background:var(--deep)}.vs-break img{height:100%;width:100%;object-fit:cover}.vs-break:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.88),rgba(7,25,54,.08) 72%)}.vs-break-copy{position:absolute;z-index:1;left:6%;bottom:12%;color:#fff;max-width:620px}.vs-break h2{margin:15px 0;font-size:clamp(42px,5.1vw,76px)}.vs-break p{font-size:15px;line-height:1.6;color:#dce4f0;max-width:440px}.vs-vertical{position:absolute;z-index:1;right:4%;top:35px;color:#fff;writing-mode:vertical-rl;font-size:10px;letter-spacing:.12em}
        .vs-session{padding:126px 4.8vw}.vs-session-head{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:end}.vs-session-head h2{max-width:710px}.vs-session-head p{font-size:16px;line-height:1.56;color:var(--muted);max-width:410px;margin:0}.vs-steps{margin-top:62px;border-top:1px solid var(--ink)}.vs-step{display:grid;grid-template-columns:75px 1fr 1fr;gap:22px;padding:25px 8px;border-bottom:1px solid var(--line);align-items:start}.vs-step span{font-size:10px;letter-spacing:.1em;color:#6d7b95}.vs-step h3{font-size:clamp(21px,2.3vw,31px);line-height:1.05;letter-spacing:-.06em;margin:0;font-weight:600}.vs-step p{margin:0;line-height:1.52;color:var(--muted);font-size:14px;max-width:370px}.vs-attend{background:var(--soft);padding:0 4.8vw 115px}.vs-attend-inner{display:grid;grid-template-columns:1fr 1fr;min-height:600px}.vs-attend-copy{padding:88px 10% 54px 0}.vs-attend-copy h2{margin-bottom:25px}.vs-attend-copy p{max-width:420px;color:var(--muted);font-size:16px;line-height:1.58}.vs-roles{border-top:1px solid var(--ink);margin-top:35px}.vs-role{padding:13px 0;border-bottom:1px solid var(--line);font-size:13px;font-weight:600}.vs-role span{color:var(--pink);font-size:10px;letter-spacing:.1em;display:inline-block;width:50px}.vs-attend-image{margin-top:-45px;position:relative;overflow:hidden;clip-path:polygon(0 8%,100% 0,100% 100%,9% 92%)}.vs-attend-image img{width:100%;height:100%;object-fit:cover;transition:transform .7s}.vs-attend-image:hover img{transform:scale(1.05)}.vs-attend-image:after{content:"one room · one priority";position:absolute;right:24px;bottom:22px;color:#fff;font-size:10px;letter-spacing:.11em;text-transform:uppercase}
        .vs-intake{padding:126px 4.8vw}.vs-intake-head{border-top:1px solid var(--ink);padding-top:25px;display:grid;grid-template-columns:1fr .72fr;gap:50px;align-items:end}.vs-intake-head h2{max-width:680px}.vs-intake-head p{font-size:14px;line-height:1.55;color:var(--muted);margin:0}.vs-lab{margin-top:52px;border:1px solid var(--ink);display:grid;grid-template-columns:.8fr 1.2fr;background:#fbfaf9}.vs-lab-aside{background:var(--deep);color:#fff;padding:37px 33px;min-height:420px}.vs-lab-aside b{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:#bfcbe0;margin-bottom:25px}.vs-lab-aside h3{font-size:31px;line-height:1.1;letter-spacing:-.06em;margin:0 0 24px}.vs-lab-aside p{font-size:13px;line-height:1.55;color:#d2dced;max-width:260px}.vs-lab-form{padding:32px 36px}.vs-lab-form>span{font-size:10px;letter-spacing:.1em;color:#73829d}.vs-choices{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:19px 0 25px}.vs-choice{cursor:pointer;text-align:left;border:1px solid var(--line);background:transparent;color:var(--ink);padding:15px;font-size:13px;transition:background .2s,border .2s}.vs-choice.active{background:#eeeafb;border-color:var(--violet)}.vs-choice b{display:block;font-size:10px;color:var(--pink);letter-spacing:.1em;margin-bottom:7px}.vs-route{border-top:1px solid var(--line);padding-top:18px;display:flex;align-items:center;justify-content:space-between;gap:20px}.vs-route small{font-size:12px;color:var(--muted);line-height:1.45;max-width:290px}.vs-lab-form .vs-primary{margin-top:25px}.vs-note{margin-top:12px;display:block;font-size:11px;line-height:1.45;color:#6e7d96}
        .vs-outcome{padding:0 4.8vw 126px}.vs-outcome-top{border-top:1px solid var(--ink);padding-top:25px;display:flex;align-items:end;justify-content:space-between;gap:30px}.vs-outcome h2{max-width:675px}.vs-outcome-top p{max-width:300px;font-size:14px;line-height:1.55;color:var(--muted)}.vs-outcome-grid{margin-top:49px;display:grid;grid-template-columns:1.2fr .8fr;grid-template-rows:280px 280px;gap:12px}.vs-outcome-grid figure{margin:0;position:relative;overflow:hidden;background:var(--deep)}.vs-outcome-grid figure:first-child{grid-row:span 2}.vs-outcome-grid img{width:100%;height:100%;object-fit:cover;transition:transform .7s}.vs-outcome-grid figure:hover img{transform:scale(1.05)}.vs-outcome-grid figure:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(7,25,54,.75),transparent 52%)}.vs-outcome-grid figcaption{position:absolute;z-index:1;left:23px;bottom:19px;color:#fff}.vs-outcome-grid figcaption span{display:block;text-transform:uppercase;letter-spacing:.11em;font-size:10px;opacity:.7;margin-bottom:8px}.vs-outcome-grid figcaption strong{font:600 clamp(18px,2.1vw,29px)/1 Comfortaa,sans-serif;letter-spacing:-.06em}.vs-outcome-grid figure:first-child strong{font-size:clamp(26px,3.3vw,46px)}
        .vs-close{background:var(--ink);color:#fff;padding:105px 4.8vw 120px;position:relative}.vs-close:before{content:"SCAN";position:absolute;right:-11px;bottom:-19px;font:600 20vw/.7 Comfortaa,sans-serif;letter-spacing:-.12em;color:rgba(255,255,255,.055)}.vs-close-inner{position:relative;z-index:1;max-width:970px}.vs-close h2{font-size:clamp(53px,7.5vw,112px);line-height:.87;margin:24px 0}.vs-close h2 em{color:#ff8470}.vs-close p{font-size:17px;line-height:1.55;color:#d6deed;max-width:500px}.vs-close .vs-primary{margin-top:22px;background:linear-gradient(105deg,var(--violet),var(--pink),var(--coral));border:0}.vs-close .vs-primary:after{background:transparent}.vs-close .vs-primary:hover{box-shadow:6px 6px 0 #fff}
        
        .vs-input{width:100%;background:transparent;border:0;border-bottom:1px solid var(--line);padding:0 0 10px;outline:none;font-size:13px;color:var(--ink);transition:border-color .2s;font-family:inherit}
        .vs-input:focus{border-bottom-color:var(--ink)}
        .vs-select{width:100%;background:transparent;border:0;border-bottom:1px solid var(--line);padding:0 0 10px;outline:none;font-size:13px;color:var(--ink);transition:border-color .2s;font-family:inherit;appearance:none;border-radius:0}
        .vs-select:focus{border-bottom-color:var(--ink)}
        .vs-label{display:flex;justify-content:space-between;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:8px}
        .vs-form-row{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
        .vs-form-group{margin-bottom:24px}
        .vs-textarea{width:100%;background:#f1f3f7;border:1px solid var(--line);padding:14px;outline:none;font-size:13px;color:var(--ink);resize:vertical;min-height:70px;font-family:inherit;transition:border-color .2s}
        .vs-textarea:focus{border-color:var(--ink)}
        .vs-checkbox-label{display:flex;gap:12px;align-items:flex-start;font-size:12px;color:var(--muted);line-height:1.45;cursor:pointer;margin-bottom:24px}
        .vs-checkbox-label input{margin-top:2px;accent-color:var(--pink)}
        
        @media(max-width:760px){.vs-hero{padding:33px 21px 0}.vs-hero-grid{display:flex;flex-direction:column;min-height:0;gap:31px;align-items:stretch;padding-bottom:25px}.vs h1{font-size:54px}.vs-lead{font-size:15px}.vs-hero-image{height:435px}.vs-word{font-size:72px}.vs-strip{margin:0 21px;grid-template-columns:1fr}.vs-strip div{border-right:0;border-bottom:1px solid var(--line);padding:15px 12px}.vs-strip div:last-child{border-bottom:0}.vs-intro{padding:85px 21px 74px;display:block}.vs h2{font-size:42px}.vs-intro-copy{font-size:18px;margin-top:40px}.vs-break{margin:0;height:510px;min-height:0}.vs-break-copy{left:23px;right:23px;bottom:28px}.vs-break h2{font-size:42px}.vs-session{padding:82px 21px}.vs-session-head{display:block}.vs-session-head p{margin-top:29px}.vs-steps{margin-top:41px}.vs-step{grid-template-columns:35px 1fr;padding:20px 0;gap:12px}.vs-step p{grid-column:2}.vs-attend{padding:0 21px 80px}.vs-attend-inner{display:flex;flex-direction:column}.vs-attend-copy{padding:76px 0 43px}.vs-attend-image{height:390px;margin:0}.vs-intake{padding:82px 21px}.vs-intake-head{display:block}.vs-intake-head p{margin-top:25px}.vs-lab{grid-template-columns:1fr;margin-top:34px}.vs-lab-aside{min-height:0;padding:30px 25px}.vs-lab-form{padding:27px 22px}.vs-form-row{grid-template-columns:1fr;gap:18px;margin-bottom:18px}.vs-outcome{padding:0 21px 82px}.vs-outcome-top{display:block}.vs-outcome-top p{margin-top:25px}.vs-outcome-grid{grid-template-columns:1fr;grid-template-rows:330px 225px 225px;margin-top:33px}.vs-outcome-grid figure:first-child{grid-row:auto}.vs-close{padding:77px 21px 60px}.vs-close h2{font-size:58px}}
      `}</style>

      <section className="vs-hero">
        <div className="vs-kicker">{marketLocation} / Value Scan</div>
        <div className="vs-hero-grid"><div className="vs-hero-copy"><h1>Start with one day.<br />Leave with a <em>business case.</em></h1><p className="vs-lead">Bring us one process where urgency, complexity and value have already collided. We will make the practical route visible.</p><button className="vs-primary" onClick={() => goTo("start")}>Explore the session <ArrowDown size={15} /></button></div><div className="vs-hero-image"><img src={assetUrl("/images/cognirise/site-services.jpg")} alt="A violet and coral current moving through a bright architectural environment." /><div className="vs-word">one day</div><div className="vs-caption"><span>01 / value scan</span>Bring the operating pressure</div></div></div>
      </section>
      <section className="vs-strip" aria-label="Value Scan details"><div><b>Format</b><strong>One focused working session</strong></div><div><b>Starting point</b><strong>One priority process</strong></div><div><b>Location</b><strong>UAE-first, in the room with your team</strong></div></section>
      <section className="vs-intro"><div><div className="vs-kicker">The first move</div><h2>Not a pitch.<br />A working <em>room.</em></h2></div><div className="vs-intro-copy"><p>The Value Scan creates enough shared clarity to decide what should change, what must hold, and what a credible business case needs to answer.</p><small>We look at the work as it exists: the people, process, data, systems and controls around it. The point is a decision, not another discovery deck.</small></div></section>
      <section className="vs-break"><img src={assetUrl("/images/cognirise/site-work-proof.jpg")} alt="A vivid path cutting through a white architectural model." /><div className="vs-break-copy"><div className="vs-kicker">One process under pressure</div><h2>Find the point where work can move.</h2><p>Choose a process with a real operating constraint—not a broad AI ambition. We use the day to expose the value, friction and governing conditions around it.</p></div><div className="vs-vertical">02 / make the route visible</div></section>
      <section className="vs-session" id="session"><div className="vs-session-head"><div><div className="vs-kicker">Inside the working session</div><h2>A day with a direction.</h2></div><p>Senior operators, engineers and the people closest to the work concentrate on the decisions that determine whether change can become real.</p></div><div className="vs-steps">{[["01","Frame the work","Name the process, pressure, owners and the decision that matters now."],["02","Trace the constraints","See where hand-offs, data, systems and controls are holding the work in place."],["03","Shape the intervention","Identify where people, engineering and governed agents can change the operating route."],["04","Make the case","Leave with a focused value hypothesis, delivery path and the questions to resolve next."]].map(([n,title,copy]) => <article className="vs-step" key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
      <section className="vs-attend"><div className="vs-attend-inner"><div className="vs-attend-copy"><div className="vs-kicker">Who should attend</div><h2>Bring the people who can see the work.</h2><p>The strongest sessions mix the accountable sponsor with the people who understand the operating reality and the conditions for change.</p><div className="vs-roles"><div className="vs-role"><span>01</span>Executive sponsor</div><div className="vs-role"><span>02</span>Process or operations leader</div><div className="vs-role"><span>03</span>Technology, data or risk counterpart</div></div></div><div className="vs-attend-image"><img src={assetUrl("/images/cognirise/site-services.jpg")} alt="An architectural environment activated by flowing violet and coral strands." /></div></div></section>
      
      <section className="vs-intake" id="start"><div className="vs-intake-head"><div><div className="vs-kicker">A small first step</div><h2>Bring the process. We will bring the questions.</h2></div><p>Start where urgency, complexity and value have converged. Provide your details and context on the process under pressure, and our team will arrange a working session.</p></div><div className="vs-lab">
        <aside className="vs-lab-aside">
          <b>Value Scan / intake</b>
          <h3>One priority. One room. One useful next move.</h3>
          <p>There is no need to prepare a polished brief. A plain description of where the work is under pressure is enough to start.</p>
        </aside>
        <div className="vs-lab-form">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit}>
              <div className="vs-form-row">
                <div>
                  <label className="vs-label" htmlFor="firstName">First Name <span style={{color: 'var(--pink)'}}>*</span></label>
                  <input className="vs-input" type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required placeholder="Given name" />
                </div>
                <div>
                  <label className="vs-label" htmlFor="lastName">Last Name <span style={{color: 'var(--pink)'}}>*</span></label>
                  <input className="vs-input" type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required placeholder="Family name" />
                </div>
              </div>
              <div className="vs-form-row">
                <div>
                  <label className="vs-label" htmlFor="email">Work Email <span style={{color: 'var(--pink)'}}>*</span></label>
                  <input className="vs-input" type="email" id="email" name="email" value={formData.email} onChange={handleChange} required placeholder="name@company.com" />
                </div>
                <div>
                  <label className="vs-label" htmlFor="company">Company / Organisation <span style={{color: 'var(--pink)'}}>*</span></label>
                  <input className="vs-input" type="text" id="company" name="company" value={formData.company} onChange={handleChange} required placeholder="Your organisation name" />
                </div>
              </div>
              <div className="vs-form-group">
                <label className="vs-label" htmlFor="role">Role / Title</label>
                <input className="vs-input" type="text" id="role" name="role" value={formData.role} onChange={handleChange} placeholder="e.g. Head of Operations" />
              </div>
              <div className="vs-form-group">
                <label className="vs-label" htmlFor="processArea">Process Area <span style={{color: 'var(--pink)'}}>*</span></label>
                <select className="vs-select" id="processArea" name="processArea" value={formData.processArea} onChange={handleChange} required>
                  <option value="">Select the closest fit</option>
                  {SERVICE_LINE_LABELS.map((label) => <option value={label} key={label}>{label}</option>)}
                  <option value="Not sure yet">Not sure yet</option>
                </select>
              </div>
              <div className="vs-form-group">
                <label className="vs-label" htmlFor="operatingContext">Operating Context <span style={{color: 'var(--pink)'}}>*</span></label>
                <textarea className="vs-textarea" id="operatingContext" name="operatingContext" value={formData.operatingContext} onChange={handleChange} required placeholder="Where does the work get stuck? What decisions, data or hand-offs are constraining the outcome?" />
              </div>
              <div className="vs-form-group">
                <label className="vs-label" htmlFor="stakeholders">Stakeholders (Optional)</label>
                <input className="vs-input" type="text" id="stakeholders" name="stakeholders" value={formData.stakeholders} onChange={handleChange} placeholder="Who holds accountability for this process today?" />
              </div>
              <div className="vs-form-group">
                <label className="vs-label" htmlFor="intendedDecision">Intended Decision (Optional)</label>
                <input className="vs-input" type="text" id="intendedDecision" name="intendedDecision" value={formData.intendedDecision} onChange={handleChange} placeholder="What specific outcome or decision are you trying to accelerate?" />
              </div>

              <label className="vs-checkbox-label">
                <input type="checkbox" checked={formData.consent} onChange={(e) => setFormData(prev => ({...prev, consent: e.target.checked}))} required />
                <span>I agree that Cognirise may contact me about this request.</span>
              </label>

              <input type="text" name="website" value={formData.website} onChange={handleChange} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{position: 'absolute', left: '-9999px'}} />

              <button type="submit" className="vs-primary" disabled={submitEnquiry.isPending} style={{ marginTop: 8 }}>
                {submitEnquiry.isPending ? "Submitting..." : "Submit request"} <ArrowRight size={15} />
              </button>
            </form>
          ) : (
            <div style={{ padding: "40px 0" }}>
              <Check size={48} color="var(--pink)" style={{ marginBottom: 24 }} />
              <h3 style={{ fontSize: 32, marginBottom: 16, fontWeight: 600, fontFamily: 'Comfortaa, sans-serif' }}>Request received.</h3>
              <p style={{ color: 'var(--muted)', fontSize: 16, marginBottom: 32, lineHeight: 1.5 }}>
                Thank you. Our team will review the details and contact you shortly to arrange the working session.
              </p>
              <button onClick={() => setIsSubmitted(false)} className="vs-under">Submit another request</button>
            </div>
          )}
        </div>
      </div></section>
      
      <section className="vs-outcome" id="outcomes"><div className="vs-outcome-top"><div><div className="vs-kicker">What you leave with</div><h2>A case that can move inside the business.</h2></div><p>Enough precision to align the next decision—and enough substance to avoid restarting the conversation from zero.</p></div><div className="vs-outcome-grid"><figure><img src={assetUrl("/images/cognirise/site-work-proof.jpg")} alt="A gradient route moving through a complex architectural model." /><figcaption><span>01 / opportunity</span><strong>A focused value hypothesis.</strong></figcaption></figure><figure><img src={assetUrl("/images/cognirise/site-services.jpg")} alt="Violet and coral strands moving decisively through a built structure." /><figcaption><span>02 / route</span><strong>A practical path to production.</strong></figcaption></figure><figure><img src={assetUrl("/images/cognirise/site-work-proof.jpg")} alt="A luminous corridor bridging two sides of an architectural model." /><figcaption><span>03 / decision</span><strong>The next questions, clearly owned.</strong></figcaption></figure></div></section>
      <section className="vs-close" id="close"><div className="vs-close-inner"><div className="vs-kicker">Make the first move</div><h2>Bring one process.<br /><em>Leave with a route.</em></h2><p>Start where operating pressure is already real. A Value Scan is a focused way to make the opportunity, constraints and practical route to production visible.</p><button className="vs-primary" onClick={() => goTo("start")}>Return to intake form <ArrowRight size={16} /></button></div></section>
    </main>
  );
}
