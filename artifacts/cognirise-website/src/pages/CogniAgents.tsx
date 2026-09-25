import { ArrowRight, ArrowUpRight, Check, CornerDownRight, FileCheck2, Hand, Layers3, LockKeyhole, Route, ShieldCheck } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";

const differences = [
  {
    title: "Best practices, pre-built",
    body: "Each agent encodes how leading organisations run that function: the steps, the checks, the approvals and the KPIs. You start from a mature process, not a blank canvas.",
    label: "Start with a process",
  },
  {
    title: "Tailored to your business",
    body: "Workflows, rules, approval thresholds, tone and terminology are configured to your policies. Agents adapt to your process instead of forcing you into theirs.",
    label: "Make it yours",
  },
  {
    title: "Agents that act, not just answer",
    body: "CogniAgents read, decide and take action in your systems: they create tickets, update records, draft documents, route cases and trigger follow-ups.",
    label: "Finish the work",
  },
  {
    title: "Human in the loop, by design",
    body: "You define exactly where people review, approve or override. Every decision is logged with its reasoning and the sources it used.",
    label: "Keep people in control",
  },
  {
    title: "Grounded in your knowledge",
    body: "Built on CogniBase, every agent works from your own documents, data and systems, with citations, so outcomes are explainable and auditable.",
    label: "Know the source",
  },
  {
    title: "Sovereign and secure",
    body: "Agents can be deployed in an EU cloud, in your own tenant or on premises, with open-weight models where required. Role-based permissions limit what each agent can see and do.",
    label: "Define the boundary",
  },
];

const functions = [
  { title: "Finance", example: "Invoice intake and coding, three-way matching, expense review, collections follow-up, month-end close support and variance commentary.", category: "01 / Business operations" },
  { title: "Customer Service", example: "Ticket triage and routing, grounded answer drafting, case summarisation, escalation handling and quality review of resolved cases.", category: "01 / Business operations" },
  { title: "Sales", example: "Lead qualification, account research, personalised outreach drafting, CRM hygiene and conversational sales agents on web, WhatsApp and Telegram.", category: "01 / Business operations" },
  { title: "Insurance & Claims", example: "First notice of loss intake, document checks, claim triage, fraud signals and handler assistance across the claim file.", category: "02 / Specialist workflows" },
  { title: "Operations & Manufacturing", example: "Predictive maintenance alerts, anomaly detection, SOP guidance for field and plant teams, and BOM-to-QA checks.", category: "02 / Specialist workflows" },
  { title: "IT & Network Operations", example: "Incident triage, runbook execution, change-request drafting and network monitoring agents inside Microsoft Teams.", category: "02 / Specialist workflows" },
  { title: "People & HR", example: "Policy Q&A, onboarding workflows, candidate screening against defined criteria and HR case handling.", category: "03 / People & governance" },
  { title: "Risk & Compliance", example: "AML alert triage, KYC document review, regulatory change monitoring and audit evidence collection.", category: "03 / People & governance" },
  { title: "Project & Portfolio Management", example: "Status reporting, risk and dependency tracking, meeting follow-ups and portfolio health summaries.", category: "03 / People & governance" },
];

const phases = [
  { name: "Discover", copy: "In a short workshop, we map the function, its current process and the outcome it needs.", output: "A process worth improving" },
  { name: "Configure", copy: "We start from the best-practice agent and tailor its rules, approvals, systems and language to your organisation.", output: "Your rules, in the workflow" },
  { name: "Pilot", copy: "The agent runs on a defined scope with human review, measured against agreed KPIs.", output: "Evidence before rollout" },
  { name: "Scale", copy: "Proven agents are rolled out across teams, and new functions are added from the same foundation.", output: "More functions, one foundation" },
];

const deployments = [
  { name: "Managed EU cloud", copy: "Fastest start, hosted in European regions.", boundary: "European region" },
  { name: "Your cloud", copy: "Deployed into your own cloud tenant.", boundary: "Your tenant" },
  { name: "On-premises", copy: "Fully isolated, with open-weight models on your own hardware.", boundary: "Your hardware" },
];

const faqs = [
  { question: "Are these off-the-shelf or custom?", answer: "Both. Each agent starts from a best-practice template and is then tailored to your processes, systems and policies." },
  { question: "Can agents take action in our systems?", answer: "Yes, through CogniBase's integration layer, and always within permissions and approval rules you define." },
  { question: "How do we keep control?", answer: "Human checkpoints, role-based permissions and full decision logs are built into every workflow." },
  { question: "How quickly can we start?", answer: "A single-function pilot typically runs in weeks, starting with one process and clear KPIs." },
  { question: "Do you support the EU AI Act?", answer: "CogniAgents are designed with transparency, human oversight and logging, which support obligations under the EU AI Act." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="ca-eyebrow"><span className="ca-signal" aria-hidden="true" />{children}</span>;
}

export default function CogniAgents() {
  return (
    <main className="ca-page">
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
        .ca-agent-bars span{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 20px;background:var(--paper);border-left:3px solid var(--pink);font:600 15px/1.3 Comfortaa,sans-serif;letter-spacing:-.04em;box-shadow:6px 6px 0 rgba(16,41,87,.04)}
        .ca-agent-bars span:nth-child(2){margin-inline:22px -22px;border-color:var(--coral)}.ca-agent-bars span:nth-child(3){margin-inline:44px -44px;border-color:var(--violet)}
        .ca-agent-bars svg{color:var(--pink);flex:none}
        .ca-foundation-stem{height:45px;width:1px;background:var(--violet);margin:auto;position:relative}
        .ca-foundation-stem:after{content:"";position:absolute;bottom:0;left:-4px;width:9px;height:9px;border-radius:50%;background:var(--violet)}
        .ca-base-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--deep);color:var(--paper);padding:23px 26px}
        .ca-base-bar strong{font:600 22px Comfortaa,sans-serif;letter-spacing:-.05em}.ca-base-bar small{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#e8b8dd}
        .ca-base-key{display:flex;flex-wrap:wrap;gap:12px 25px;border-top:1px solid #c7bddc;padding-top:17px;margin-top:22px;font-size:11px;font-weight:700;color:#695d83}
        .ca-base-key span{display:flex;align-items:center;gap:7px}.ca-base-key svg{color:var(--pink)}
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
           .ca-foundation{padding-block:87px 93px}.ca-foundation-inner{display:block}.ca-foundation h2{font-size:clamp(43px,10vw,60px)}.ca-foundation p{font-size:16px}.ca-foundation-diagram{margin-top:55px}.ca-agent-bars{padding:0}.ca-agent-bars span{font-size:13px}.ca-agent-bars span:nth-child(2){margin-inline:12px 0}.ca-agent-bars span:nth-child(3){margin-inline:24px 0}.ca-base-bar strong{font-size:19px}
          .ca-deploy{padding-block:87px 99px}.ca-deploy .ca-intro{margin-bottom:41px}.ca-deploy-row{grid-template-columns:40px 1fr;gap:8px 10px;padding:25px 0}.ca-deploy-row h3{font-size:24px}.ca-deploy-row p{grid-column:2;font-size:13px}
          .ca-faq{padding-block:86px 99px}.ca-faq-inner{display:block}.ca-faq h2{font-size:47px}.ca-faq-intro{margin-bottom:37px}.ca-faq-item{display:block;padding:23px 0 25px}.ca-faq-item h3{font-size:19px;margin-bottom:10px}.ca-faq-item p{font-size:14px}
          .ca-close-inner{padding-block:88px 54px}.ca-close h2{font-size:clamp(46px,10.7vw,68px)}.ca-close p{font-size:16px}.ca-close-foot{margin-top:90px}
        }
        @media(max-width:390px){.ca-actions{gap:15px}.ca-map-stage{grid-template-columns:62px 1fr}.ca-map-stage small{font-size:9px}.ca-base-bar{padding:18px}.ca-base-bar small{font-size:8px}}
        @media(prefers-reduced-motion:reduce){.ca-page *,.ca-page *:before,.ca-page *:after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
      `}</style>

      <section className="ca-hero ca-wrap public-hero-shell" aria-labelledby="ca-title">
        <Eyebrow>Products / CogniAgents</Eyebrow>
        <div className="ca-hero-grid">
          <div className="ca-hero-copy">
            <h1 id="ca-title" className="ca-heading">Agentic workflows for every business function.</h1>
            <p>CogniAgents are ready-made AI workflows for finance, operations, customer service, sales, HR and IT. Each comes with proven best practices built in and is tailored to how your company actually works.</p>
            <div className="ca-actions">
              <BrandButton href="#agents-by-function" data-testid="link-cogniagents-explore-agents">Explore the agents</BrandButton>
              <a href="/contact" className="ca-jump" data-testid="link-cogniagents-book-workshop-hero">Book a workshop <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
            <div className="ca-hero-foot">A proven starting point. Your operating rules.</div>
          </div>
          <div className="ca-map" role="img" aria-label="Illustrative workflow: a defined process receives a case, the agent prepares a recommendation using grounded knowledge, a person reviews at an approval checkpoint, and an approved action is carried out within permissions.">
            <div className="ca-map-top"><span>CogniAgents / Work route</span><span>Illustrative flow</span></div>
            <p className="ca-map-title">The work moves forward. The decision stays visible.</p>
            <div className="ca-map-route">
              <div className="ca-map-stage"><small>01 / Intake</small><strong>Work enters a defined process</strong></div>
              <div className="ca-map-stage"><small>02 / Prepare</small><strong>Agent checks context and rules</strong></div>
              <div className="ca-map-stage ca-human"><Hand size={20} aria-hidden="true" /><div><small>Human checkpoint</small><strong>Review · approve · override</strong></div></div>
              <div className="ca-map-stage"><small>03 / Act</small><strong>Approved action in your systems</strong></div>
            </div>
            <div className="ca-map-bottom"><span>Permissions define the boundary</span><span>Decision logged</span></div>
          </div>
        </div>
        <div className="ca-proof" aria-label="CogniAgents at a glance">
          {["Function-specific", "Best practices built in", "Human-in-the-loop", "Runs on CogniBase", "Sovereign deployment"].map(item => <span key={item}><i aria-hidden="true" />{item}</span>)}
        </div>
      </section>

      <section className="ca-problem ca-wrap" aria-labelledby="ca-problem-title">
        <div><Eyebrow>The problem</Eyebrow><h2 id="ca-problem-title" className="ca-heading">An answer is not <em>finished work.</em></h2></div>
        <div className="ca-problem-copy">
          <p>Generic AI assistants answer questions, but they don't finish the work. Building agents from scratch takes months, and every team reinvents the same processes. Many pilots automate a broken process instead of a good one, and agents that act without oversight are a risk no compliance team will sign off on.</p>
          <strong>CogniAgents start from a proven way of running each function, then adapt it to yours.</strong>
        </div>
      </section>

      <section className="ca-difference" aria-labelledby="ca-difference-title">
        <div className="ca-wrap">
          <div className="ca-intro"><div><Eyebrow>What makes CogniAgents different</Eyebrow><h2 id="ca-difference-title" className="ca-heading">A better process, <em>already in motion.</em></h2></div><p>Start with how the work should run. Then configure the boundaries, knowledge and actions around your organisation.</p></div>
          <div className="ca-difference-list">
            {differences.map((item, index) => <article className="ca-difference-item" key={item.title}>
              <span>{String(index + 1).padStart(2, "0")} / 06</span><h3>{item.title}</h3><p>{item.body}</p><small>{item.label}</small>
            </article>)}
          </div>
        </div>
      </section>

      <section className="ca-functions" id="agents-by-function" aria-labelledby="ca-functions-title">
        <div className="ca-wrap">
          <div className="ca-intro"><div><Eyebrow>Agents by function</Eyebrow><h2 id="ca-functions-title" className="ca-heading">The work is specific. <em>So are the agents.</em></h2></div><p>One starting point per function, configured for the workflows, policies and systems your team actually uses.</p></div>
          {["01 / Business operations", "02 / Specialist workflows", "03 / People & governance"].map(group => <div className="ca-function-group" key={group}>
            <div className="ca-group-label">{group}</div>
            <div className="ca-function-items">{functions.filter(item => item.category === group).map(item => <article className="ca-function" key={item.title}><h3>{item.title}</h3><p>{item.example}</p></article>)}</div>
          </div>)}
        </div>
      </section>

      <section className="ca-method ca-wrap" aria-labelledby="ca-method-title">
        <div className="ca-intro"><div><Eyebrow>How it works</Eyebrow><h2 id="ca-method-title" className="ca-heading">Start narrow. <em>Earn the right to scale.</em></h2></div><p>Every stage has a purpose: define the work, fit the agent to your rules, measure it under review, then expand what has been proven.</p></div>
        <div className="ca-method-grid">
          {phases.map((phase, index) => <article className="ca-method-step" key={phase.name}>
            <span>{String(index + 1).padStart(2, "0")} / 04</span><h3>{phase.name}</h3><p>{phase.copy}</p><small><CornerDownRight size={16} aria-hidden="true" />{phase.output}</small>
          </article>)}
        </div>
      </section>

      <section className="ca-foundation" aria-labelledby="ca-foundation-title">
        <div className="ca-wrap ca-foundation-inner">
          <div><Eyebrow>Built on CogniBase</Eyebrow><h2 id="ca-foundation-title" className="ca-heading">One foundation. <em>More work done.</em></h2><p>Every CogniAgent draws on CogniBase for grounded knowledge, system integration and audit logging. Your first agent sets up the foundation, and every agent after it deploys faster.</p><a href="/platforms/cognibase" className="ca-foundation-link" data-testid="link-cogniagents-explore-cognibase">Explore CogniBase <ArrowUpRight size={16} aria-hidden="true" /></a></div>
          <div className="ca-foundation-diagram" role="img" aria-label="Illustrative relationship: function-specific agents share a CogniBase foundation for grounded knowledge, system integration and audit logging.">
            <small>Shared foundation / illustrative</small>
            <div className="ca-agent-bars"><span>Function-specific workflow <Route size={17} aria-hidden="true" /></span><span>Configured approvals <ShieldCheck size={17} aria-hidden="true" /></span><span>Actions within permissions <LockKeyhole size={17} aria-hidden="true" /></span></div>
            <div className="ca-foundation-stem" aria-hidden="true" />
            <div className="ca-base-bar"><strong>CogniBase</strong><small>Shared foundation</small></div>
            <div className="ca-base-key"><span><Layers3 size={15} aria-hidden="true" /> Grounded knowledge</span><span><ArrowRight size={15} aria-hidden="true" /> System integration</span><span><FileCheck2 size={15} aria-hidden="true" /> Audit logging</span></div>
          </div>
        </div>
      </section>

      <section className="ca-deploy ca-wrap" aria-labelledby="ca-deploy-title">
        <div className="ca-intro"><div><Eyebrow>Deployment options</Eyebrow><h2 id="ca-deploy-title" className="ca-heading">Deploy within <em>your boundary.</em></h2></div><p>Choose the environment that fits your infrastructure and sovereignty requirements.</p></div>
        <div className="ca-deploy-list">{deployments.map((item, index) => <article className="ca-deploy-row" key={item.name}><span>{String(index + 1).padStart(2, "0")} / 03</span><h3>{item.name}</h3><p>{item.copy}</p><small>{item.boundary}</small></article>)}</div>
      </section>

      <section className="ca-faq" aria-labelledby="ca-faq-title">
        <div className="ca-wrap ca-faq-inner"><div><Eyebrow>FAQ</Eyebrow><h2 id="ca-faq-title" className="ca-heading">Questions, <em>answered.</em></h2><p className="ca-faq-intro">The questions an operations and compliance team should ask before an agent takes on real work.</p></div>
          <div className="ca-faq-list">{faqs.map(item => <article className="ca-faq-item" key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></article>)}</div>
        </div>
      </section>

      <section className="ca-close" aria-labelledby="ca-close-title">
        <div className="ca-wrap ca-close-inner"><Eyebrow>Make the first move</Eyebrow><h2 id="ca-close-title" className="ca-heading">Start with one function. Prove it. Then scale.</h2><p>Pick the process that costs your team the most time, and we'll show you what an agent can do with it.</p><BrandButton href="/contact" data-testid="link-cogniagents-book-workshop-closing">Book a workshop</BrandButton><div className="ca-close-foot"><span>CogniAgents / Function-specific AI workflows</span><span>Human oversight, built in <Check size={12} aria-hidden="true" /></span></div></div>
      </section>
    </main>
  );
}