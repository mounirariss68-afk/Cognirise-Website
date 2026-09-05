import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, ChevronRight, ArrowDown } from "lucide-react";
import { useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { useRef } from "react";

export default function Home() {
  const { market } = useMarketStore();
  const prefersReducedMotion = useReducedMotion();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const { scrollYProgress } = useScroll();
  
  // Create parallax values only if motion is enabled
  const yHeroText = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 200]);
  const yHeroImage = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 100]);
  const scaleHeroImage = useTransform(scrollYProgress, [0, 0.5], [1, prefersReducedMotion ? 1 : 1.05]);

  const outcomes = [
    ["01", "Architecture"],
    ["02", "Engineering"],
    ["03", "Assurance"],
    ["04", "Risk"]
  ];

  return (
    <div className="cp">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .cp{--ink:#102957;--ink2:#071936;--paper:#fdfcfb;--mist:#eef0f5;--line:#cbd3e1;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow-x:hidden}
        .cp *{box-sizing:border-box}.cp a,.cp button{text-decoration:none;font:inherit}.cp :focus-visible{outline:3px solid var(--coral);outline-offset:4px}
        .cp-primary{border:1px solid var(--ink);cursor:pointer;color:#fff;background:var(--ink);font-weight:700;font-size:12px;padding:4px 4px 4px 17px;min-height:46px;display:inline-flex;align-items:center;gap:15px;position:relative;isolation:isolate;overflow:hidden;transition:transform .24s,box-shadow .24s}.cp-primary:before{content:"";position:absolute;z-index:-2;inset:-1px;background:linear-gradient(105deg,var(--violet),var(--pink),var(--coral));opacity:0;transition:opacity .24s}.cp-primary:after{content:"";position:absolute;z-index:-1;inset:1px;background:var(--ink);transition:background .24s}.cp-primary svg{width:36px;height:36px;padding:10px;background:#fff;color:var(--ink);transition:transform .24s,background .24s,color .24s}.cp-primary:hover{transform:translate(-3px,-3px);box-shadow:6px 6px 0 var(--coral)}.cp-primary:hover:before{opacity:1}.cp-primary:hover:after{background:rgba(7,25,54,.94)}.cp-primary:hover svg{transform:translate(3px,-3px);background:var(--coral);color:#fff}
        .cp-kicker{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;display:flex;align-items:center;gap:10px}.cp-kicker:before{content:"";width:23px;height:1px;background:linear-gradient(90deg,var(--violet),var(--coral))}
        .cp-hero{padding:22px 4.8vw 0}.cp-hero-grid{display:grid;grid-template-columns:.94fr 1.06fr;gap:4vw;align-items:end;min-height:680px;padding-bottom:34px}
        .cp h1,.cp h2,.cp h3{font-family:Comfortaa,sans-serif}.cp-hero h1{font-weight:600;font-size:clamp(50px,6.3vw,100px);line-height:.94;letter-spacing:-.08em;margin:30px 0 28px}.cp-hero h1 em{font-style:normal;color:var(--pink)}.cp-hero p{font-size:16.5px;line-height:1.6;color:#405777;max-width:440px;margin-bottom:32px}.cp-hero p strong{color:var(--ink)}
        .cp-hero-image{height:640px;position:relative;overflow:hidden;background:#101d3b;clip-path:polygon(10% 0,100% 0,100% 91%,0 100%,0 12%)}.cp-hero-image img{width:100%;height:100%;object-fit:cover;animation:cpImage 1.4s cubic-bezier(.2,.7,.2,1) both}.cp-hero-image:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.42),transparent 35%),linear-gradient(0deg,rgba(7,25,54,.48),transparent 30%)}.cp-hero-caption{position:absolute;z-index:2;left:34px;bottom:29px;color:#fff;font-size:10px;letter-spacing:.12em;text-transform:uppercase}.cp-hero-caption span{display:block;opacity:.75;margin-bottom:7px}.cp-hero-word{font:600 clamp(58px,9.2vw,150px)/.8 Comfortaa,sans-serif;color:#fff;position:absolute;z-index:2;right:-10px;top:50px;letter-spacing:-.1em;mix-blend-mode:overlay;opacity:.87}
        .cp-proof{margin:0 4.8vw;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);display:grid;grid-template-columns:1.1fr 1fr 1fr 1fr}.cp-proof div{padding:18px 20px;border-right:1px solid var(--line);font-size:12px;line-height:1.4}.cp-proof div:last-child{border:0}.cp-proof b{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;margin-bottom:8px;color:#6a7891}.cp-proof strong{font-weight:600}
        .cp-statement{padding:150px 4.8vw 110px;display:grid;grid-template-columns:1fr 1.15fr;gap:7vw}.cp-statement h2{font-weight:600;font-size:clamp(42px,5vw,78px);letter-spacing:-.075em;line-height:.98;margin:25px 0 0}.cp-statement h2 em{font-style:normal;color:var(--coral)}.cp-statement-copy{align-self:end;border-top:1px solid var(--line);padding-top:22px;font-size:21px;line-height:1.44;color:#30486d;max-width:520px}.cp-statement-copy p{margin:0}.cp-statement-copy small{font-size:12px;display:block;line-height:1.55;margin-top:22px;color:#647491}
        .cp-break{margin:0 4.8vw;background:var(--ink2);height:min(650px,50vw);min-height:480px;position:relative;overflow:hidden}.cp-break img{width:100%;height:100%;object-fit:cover;opacity:.9;transform:scale(1.04);animation:cpBreath 8s ease-in-out infinite alternate}.cp-break:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,25,54,.87),rgba(7,25,54,.08) 70%)}.cp-break-copy{position:absolute;z-index:2;left:6%;bottom:11%;max-width:610px;color:#fff}.cp-break h2{font-weight:600;font-size:clamp(43px,5.3vw,80px);letter-spacing:-.075em;line-height:.96;margin:16px 0}.cp-break p{max-width:410px;font-size:15px;line-height:1.6;color:#dce4f0}.cp-break-mark{position:absolute;z-index:2;right:4%;top:34px;color:#fff;font-size:10px;letter-spacing:.12em;writing-mode:vertical-rl}
        .cp-model{padding:125px 4.8vw}.cp-model-head{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:end}.cp-model h2{font-size:clamp(42px,5vw,72px);line-height:.97;letter-spacing:-.08em;font-weight:600;margin:20px 0 0;max-width:700px}.cp-model-lead{font-size:16px;line-height:1.55;max-width:410px;color:#42587b;margin:0}.cp-services{margin-top:65px;border-top:1px solid var(--ink)}.cp-service{width:100%;text-align:left;display:grid;grid-template-columns:72px 1fr 1fr 40px;align-items:center;gap:20px;padding:23px 8px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;transition:padding .24s,background .24s}.cp-service:hover,.cp-service.active{padding-left:21px;background:#f1effb}.cp-service span{font-size:10px;letter-spacing:.1em;color:#697a96}.cp-service h3{font-size:clamp(20px,2.3vw,32px);line-height:1.05;font-weight:600;letter-spacing:-.06em;margin:0}.cp-service p{font-size:13px;line-height:1.45;color:#536887;margin:0;max-width:300px}.cp-service svg{justify-self:end}.cp-service.active svg{color:var(--pink)}
        .cp-clarity{margin:0 4.8vw 122px;border-top:1px solid var(--ink);display:grid;grid-template-columns:1.08fr .92fr;gap:7vw;padding-top:28px}.cp-clarity h2{font-size:clamp(37px,4.4vw,65px);line-height:.98;letter-spacing:-.075em;font-weight:600;margin:18px 0 25px;max-width:720px}.cp-clarity-copy{font-size:16px;line-height:1.65;color:#405777;max-width:590px}.cp-clarity-copy strong{color:var(--ink)}.cp-outcomes{align-self:end;border-top:1px solid var(--line);padding-top:22px}.cp-outcomes-intro{font-size:14px;line-height:1.55;color:#536887;margin:0 0 24px}.cp-outcome-row{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--line)}.cp-outcome-row div{padding:16px 8px;border-right:1px solid var(--line);font:600 15px Comfortaa,sans-serif}.cp-outcome-row div:last-child{border:0}.cp-outcome-row span{display:block;font:10px Inter,sans-serif;color:var(--pink);letter-spacing:.1em;margin-bottom:7px}
        .cp-image-ledger{padding:0 4.8vw 122px}.cp-image-ledger-head{padding:25px 0;border-top:1px solid var(--ink);display:flex;align-items:end;justify-content:space-between;gap:20px}.cp-image-ledger-head h2{font-size:clamp(39px,4.7vw,69px);line-height:.97;letter-spacing:-.08em;font-weight:600;margin:18px 0 0;max-width:660px}.cp-image-ledger-head p{max-width:290px;font-size:14px;line-height:1.5;color:#536887}.cp-image-ledger-grid{display:grid;grid-template-columns:1.2fr .8fr;grid-template-rows:310px 310px;gap:12px;margin-top:42px}.cp-ledger-image{position:relative;overflow:hidden;background:var(--ink2)}.cp-ledger-image:first-child{grid-row:span 2}.cp-ledger-image img{width:100%;height:100%;object-fit:cover;transition:transform .7s cubic-bezier(.2,.7,.2,1)}.cp-ledger-image:hover img{transform:scale(1.06)}.cp-ledger-image:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(7,25,54,.75),transparent 50%)}.cp-ledger-image figcaption{position:absolute;z-index:1;left:24px;bottom:20px;color:white}.cp-ledger-image figcaption span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.12em;opacity:.72;margin-bottom:9px}.cp-ledger-image figcaption strong{font:600 clamp(19px,2.2vw,30px)/1 Comfortaa,sans-serif;letter-spacing:-.06em}.cp-ledger-image:first-child figcaption strong{font-size:clamp(25px,3.4vw,48px)}
        .cp-converge{background:#eef0f5;padding:0 4.8vw 126px}.cp-converge-wrap{display:grid;grid-template-columns:1.1fr .9fr;min-height:590px}.cp-converge-copy{padding:90px 9% 60px 0}.cp-converge h2{font-weight:600;font-size:clamp(43px,5vw,76px);line-height:.97;letter-spacing:-.08em;margin:20px 0 28px}.cp-converge p{font-size:16px;line-height:1.6;color:#3e567b;max-width:410px}.cp-converge-points{margin-top:40px;border-top:1px solid var(--ink)}.cp-converge-points div{padding:12px 0;border-bottom:1px solid var(--line);font-size:13px;font-weight:600}.cp-converge-points span{display:inline-block;color:var(--pink);font-size:10px;letter-spacing:.1em;width:54px}.cp-converge-image{margin-top:-46px;position:relative;overflow:hidden;clip-path:polygon(0 8%,100% 0,100% 100%,9% 92%)}.cp-converge-image img{width:100%;height:100%;object-fit:cover}.cp-converge-image:after{content:"people + agents";position:absolute;right:24px;bottom:23px;color:#fff;font-size:10px;letter-spacing:.11em;text-transform:uppercase}
        .cp-industries{padding:0 4.8vw 130px}.cp-industry-top{border-top:1px solid var(--ink);padding-top:25px;display:flex;justify-content:space-between;gap:30px;align-items:end}.cp-industries h2{font-size:clamp(40px,4.8vw,70px);line-height:.98;letter-spacing:-.08em;font-weight:600;margin:12px 0 0}.cp-industry-top p{font-size:14px;line-height:1.5;max-width:280px;color:#536887}.cp-industry-list{margin-top:54px;display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line)}.cp-industry{border-bottom:1px solid var(--line);padding:21px 10px;display:flex;align-items:center;gap:18px;font-size:18px;font-family:Comfortaa,sans-serif;font-weight:600;letter-spacing:-.04em;transition:color 0.2s, background 0.2s;}.cp-industry:hover{background:#f2f4f8;color:var(--pink);}.cp-industry:nth-child(odd){border-right:1px solid var(--line)}.cp-industry span{font-family:Inter,sans-serif;font-size:10px;letter-spacing:.1em;color:#77859c}.cp-industry svg{margin-left:auto;color:var(--coral)}
        .cp-start{background:var(--ink);color:#fff;padding:104px 4.8vw 112px;position:relative}.cp-start:before{content:"PULSE";position:absolute;right:-10px;bottom:-18px;font:600 19vw/.7 Comfortaa,sans-serif;letter-spacing:-.11em;color:rgba(255,255,255,.06)}.cp-start-inner{position:relative;z-index:1;max-width:970px}.cp-start h2{font-size:clamp(52px,7.5vw,113px);font-weight:600;letter-spacing:-.095em;line-height:.88;margin:26px 0}.cp-start h2 em{font-style:normal;color:#ff8470}.cp-start p{font-size:17px;line-height:1.55;max-width:480px;color:#d6deed;margin-bottom:32px}
        @keyframes cpImage{from{clip-path:inset(0 100% 0 0);transform:scale(1.12)}to{clip-path:inset(0);transform:scale(1)}}@keyframes cpBreath{to{transform:scale(1.1) translateX(-1.4%)}}@media(prefers-reduced-motion:reduce){.cp *,.cp *:before,.cp *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
        @media(max-width:760px){.cp-hero{padding:33px 21px 0}.cp-hero-grid{display:flex;flex-direction:column;gap:32px;min-height:0;align-items:stretch;padding-bottom:25px}.cp-hero h1{font-size:54px;margin:25px 0 22px}.cp-hero p{font-size:15px}.cp-hero-image{height:440px;clip-path:polygon(10% 0,100% 0,100% 93%,0 100%,0 8%)}.cp-hero-word{font-size:71px}.cp-proof{margin:0 21px;grid-template-columns:1fr 1fr}.cp-proof div{padding:16px 12px}.cp-proof div:nth-child(2){border-right:0}.cp-proof div:nth-child(-n+2){border-bottom:1px solid var(--line)}.cp-statement{padding:86px 21px 73px;display:block}.cp-statement h2{font-size:42px}.cp-statement-copy{font-size:18px;margin-top:43px}.cp-break{margin:0;height:520px;min-height:0}.cp-break-copy{left:23px;right:23px;bottom:28px}.cp-break h2{font-size:42px}.cp-model{padding:82px 21px}.cp-model-head{display:block}.cp-model h2{font-size:43px}.cp-model-lead{margin-top:29px}.cp-services{margin-top:42px}.cp-service{grid-template-columns:35px 1fr 25px;gap:12px;padding:20px 0}.cp-service p{display:none}.cp-service h3{font-size:21px}.cp-image-ledger{padding:0 21px 82px}.cp-image-ledger-head{display:block}.cp-image-ledger-head h2{font-size:41px}.cp-image-ledger-grid{grid-template-columns:1fr;grid-template-rows:350px 240px 240px;gap:10px;margin-top:32px}.cp-ledger-image:first-child{grid-row:auto}.cp-converge{padding:0 21px 80px}.cp-converge-wrap{display:flex;flex-direction:column;min-height:0}.cp-converge-copy{padding:76px 0 42px}.cp-converge h2{font-size:43px}.cp-converge-image{height:390px;margin:0}.cp-industries{padding:0 21px 82px}.cp-industry-top{display:block}.cp-industries h2{font-size:42px}.cp-industry-list{display:block;margin-top:37px}.cp-industry{font-size:17px}.cp-industry:nth-child(odd){border-right:0}.cp-start{padding:77px 21px 82px}.cp-start h2{font-size:58px}}
      `}</style>
      <style>{`
        @media(max-width:760px){
          .cp-clarity{margin:0 21px 82px;display:block}
          .cp-clarity h2{font-size:40px}
          .cp-clarity-copy{font-size:15px}
          .cp-outcomes{margin-top:42px}
          .cp-outcome-row{grid-template-columns:1fr 1fr}
          .cp-outcome-row div:nth-child(2){border-right:0}
          .cp-outcome-row div:nth-child(-n+2){border-bottom:1px solid var(--line)}
        }
      `}</style>

      <section className="cp-hero overflow-hidden">
        <motion.div 
          className="cp-kicker"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {marketLocation} / AI-native advisory & engineering
        </motion.div>
        
        <div className="cp-hero-grid">
          <motion.div 
            className="cp-hero-copy"
            style={{ y: yHeroText }}
          >
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              Intelligence becomes <em>momentum.</em>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            >
              <strong>Cognirise is the AI-native advisory and engineering firm.</strong> Senior operators, forward-deployed engineers and governed agents move priority work from strategy into production.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link href="/what-we-do" className="cp-primary">Explore our practice <ArrowRight /></Link>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="cp-hero-image"
            style={{ y: yHeroImage }}
            initial={{ opacity: 0, clipPath: "polygon(10% 0, 100% 0, 100% 0, 0 0, 0 12%)" }}
            animate={{ opacity: 1, clipPath: "polygon(10% 0, 100% 0, 100% 91%, 0 100%, 0 12%)" }}
            transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <motion.img 
              src={assetUrl("/images/cognirise/hero-cognirise-pulse.jpg")} 
              alt="A luminous directional vector cutting through deep navy operational space." 
              style={{ scale: scaleHeroImage }}
            />
            <div className="cp-hero-word">pulse</div>
            <div className="cp-hero-caption">
              <span>Operating context</span>Direction and speed
            </div>
          </motion.div>
        </div>
      </section>

      <section className="cp-proof" aria-label="Cognirise company qualities">
        <div><b>Model</b><strong>Advisory + Engineering</strong></div>
        <div><b>Focus</b><strong>Complex enterprise & government</strong></div>
        <div><b>Platform</b><strong>CogniOS (Four native engines)</strong></div>
        <div><b>Presence</b><strong>Middle East & Europe</strong></div>
      </section>

      <section className="cp-statement">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="cp-kicker">The firm</div>
          <h2>We don't sell experimentation. <em>We sell operational reality.</em></h2>
        </motion.div>
        
        <motion.div 
          className="cp-statement-copy"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <p>Most AI programmes fail because they treat intelligence as software to be deployed rather than a capability to be governed. We bridge the gap between algorithmic potential and enterprise authority.</p>
          <small>We work with leaders who hold accountability for results, providing the advisory clarity to move and the engineering certainty to hold ground.</small>
        </motion.div>
      </section>

      <section className="cp-break">
        <motion.img 
          src={assetUrl("/images/cognirise/pulse-convergence.jpg")} 
          alt="A cinematic depiction of operational space." 
          initial={{ scale: 1.1 }}
          whileInView={{ scale: 1.04 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <motion.div 
          className="cp-break-copy"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="cp-kicker">Operating reality</div>
          <h2>Intelligence without authority is just an experiment.</h2>
          <p>Our engagements are structured around the moments where automated intent meets human accountability.</p>
        </motion.div>
        <div className="cp-break-mark">PULSE // COGNIRISE</div>
      </section>

      <section className="cp-model">
        <div className="cp-model-head">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cp-kicker">How we work</div>
            <h2>We combine strategy, engineering and platform.</h2>
          </motion.div>
          <motion.p 
            className="cp-model-lead"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            We don't hand over a presentation and wish you luck. We deploy senior teams who take accountability for the architecture, the code and the outcome.
          </motion.p>
        </div>
        
        <div className="cp-services">
          <Link href="/what-we-do/agentic-enterprise-transformation" className="cp-service block group relative overflow-hidden">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-[rgba(118,89,223,0.05)] to-transparent" 
              initial={{ x: "-100%" }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.4 }}
            />
            <span className="relative z-10">01</span>
            <h3 className="relative z-10 group-hover:text-[hsl(var(--brand-pink))] transition-colors">Agentic Enterprise Transformation</h3>
            <p className="relative z-10 group-hover:text-[#102957] transition-colors">Designing the operating model, governance and transition path for an AI-augmented enterprise.</p>
            <ArrowRight className="relative z-10 group-hover:translate-x-2 transition-transform" />
          </Link>
          
          <Link href="/what-we-do/engineering-with-ai" className="cp-service block group relative overflow-hidden">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-[rgba(118,89,223,0.05)] to-transparent" 
              initial={{ x: "-100%" }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.4 }}
            />
            <span className="relative z-10">02</span>
            <h3 className="relative z-10 group-hover:text-[hsl(var(--brand-pink))] transition-colors">Engineering & Modernisation</h3>
            <p className="relative z-10 group-hover:text-[#102957] transition-colors">Forward-deployed engineering to build new capabilities and safely retire legacy technical debt.</p>
            <ArrowRight className="relative z-10 group-hover:translate-x-2 transition-transform" />
          </Link>
          
          <Link href="/what-we-do/data-ai-foundations" className="cp-service block group relative overflow-hidden">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-[rgba(118,89,223,0.05)] to-transparent" 
              initial={{ x: "-100%" }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.4 }}
            />
            <span className="relative z-10">03</span>
            <h3 className="relative z-10 group-hover:text-[hsl(var(--brand-pink))] transition-colors">Data & AI Foundations</h3>
            <p className="relative z-10 group-hover:text-[#102957] transition-colors">Structuring enterprise knowledge and systems so they are ready to participate in intelligent work.</p>
            <ArrowRight className="relative z-10 group-hover:translate-x-2 transition-transform" />
          </Link>
          
          <Link href="/platforms" className="cp-service block group relative overflow-hidden">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-[rgba(118,89,223,0.05)] to-transparent" 
              initial={{ x: "-100%" }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.4 }}
            />
            <span className="relative z-10 text-[hsl(var(--brand-pink))] font-bold">04</span>
            <h3 className="relative z-10 group-hover:text-[hsl(var(--brand-pink))] transition-colors">CogniOS Platform</h3>
            <p className="relative z-10 group-hover:text-[#102957] transition-colors">Our proprietary architecture. A complete operating system for governed enterprise intelligence.</p>
            <ArrowRight className="relative z-10 text-[hsl(var(--brand-pink))] group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>
      </section>

      <section className="cp-clarity">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="cp-kicker">Operating conviction</div>
          <h2>We leave organisations <em>more capable</em> than we found them.</h2>
          <div className="cp-clarity-copy">
            We don't create dependencies. <strong>Every engagement is designed to transfer capability to your team.</strong> Whether we're advising the board or committing code alongside your engineers, our goal is to build an environment you can operate and scale yourselves.
          </div>
        </motion.div>
        
        <motion.div 
          className="cp-outcomes"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="cp-outcomes-intro">We embed our practices into your firm:</div>
          <div className="cp-outcome-row">
            {outcomes.map(([num, text], i) => (
              <motion.div 
                key={text}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.4 + (i * 0.1) }}
              >
                <span>{num}</span>{text}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="cp-image-ledger" aria-label="Cognirise outcomes in motion">
        <div className="cp-image-ledger-head">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cp-kicker">The system in motion</div>
            <h2>Three conditions for change that holds.</h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            We build the path, the controls and the capacity to keep the work moving after the first release.
          </motion.p>
        </div>
        <div className="cp-image-ledger-grid">
          <motion.figure 
            className="cp-ledger-image group"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src={assetUrl("/images/cognirise/cognirise-pulse-governance.jpg")} alt="Visual representation of operational boundaries." />
            <motion.figcaption
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <span>First condition</span>
              <strong className="group-hover:text-[hsl(var(--brand-pink))] transition-colors duration-300">Boundaries you can see.</strong>
            </motion.figcaption>
          </motion.figure>
          
          <motion.figure 
            className="cp-ledger-image group"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src={assetUrl("/images/cognirise/pulse-convergence.jpg")} alt="Visual representation of people and agents in a shared architecture." />
            <motion.figcaption
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <span>Second condition</span>
              <strong className="group-hover:text-[hsl(var(--brand-pink))] transition-colors duration-300">Work that flows.</strong>
            </motion.figcaption>
          </motion.figure>
          
          <motion.figure 
            className="cp-ledger-image group"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src={assetUrl("/images/cognirise/site-cognios.jpg")} alt="Visual representation of a durable system." />
            <motion.figcaption
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <span>Third condition</span>
              <strong className="group-hover:text-[hsl(var(--brand-pink))] transition-colors duration-300">A platform that remembers.</strong>
            </motion.figcaption>
          </motion.figure>
        </div>
      </section>

      <section className="cp-converge">
        <div className="cp-converge-wrap">
          <motion.div 
            className="cp-converge-copy"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cp-kicker">Our capability</div>
            <h2>We deploy teams who bridge the entire operating gap.</h2>
            <p>You don't need a strategy firm that can't code, or an engineering shop that doesn't understand governance. You need a team that takes the work all the way through.</p>
            <div className="cp-converge-points">
              <div><span>01</span>Strategy & operating model advisory</div>
              <div><span>02</span>Forward-deployed enterprise engineering</div>
              <div><span>03</span>CogniOS architecture & capability components</div>
            </div>
            <div className="mt-8">
              <Link href="/about" className="cp-primary">Meet the team <ArrowRight /></Link>
            </div>
          </motion.div>
          <motion.div 
            className="cp-converge-image"
            initial={{ opacity: 0, clipPath: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)" }}
            whileInView={{ opacity: 1, clipPath: "polygon(0 8%, 100% 0, 100% 100%, 9% 92%)" }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <img src={assetUrl("/images/cognirise/pulse-convergence.jpg")} alt="An abstract convergence of operational signals." />
          </motion.div>
        </div>
      </section>

      <section className="cp-industries">
        <div className="cp-industry-top">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cp-kicker">Industry context</div>
            <h2>We work where the rules matter.</h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Our architecture is built for highly regulated, high-stakes environments where "move fast and break things" is not a viable strategy.
          </motion.p>
        </div>
        
        <div className="cp-industry-list">
          <Link href="/industries/banking" className="cp-industry group">
            <span>01</span> Banking & Financial Services <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/industries/public-sector" className="cp-industry group">
            <span>02</span> Government & Public Sector <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/industries/telecoms" className="cp-industry group">
            <span>03</span> Telecommunications <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/industries/energy" className="cp-industry group">
            <span>04</span> Energy & Resources <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/industries/travel" className="cp-industry group">
            <span>05</span> Travel & Logistics <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/industries/manufacturing" className="cp-industry group">
            <span>06</span> Industrial & Manufacturing <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      <section className="cp-start">
        <div className="cp-start-inner">
          <motion.div 
            className="cp-kicker"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            Start the work
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Ready to bring <em>intelligence</em> into the enterprise?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            We don't need a year to prove value. Bring us a complex operational problem, and we'll architect a solution that respects your boundaries and accelerates your outcomes.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link href="/contact" className="cp-primary bg-white text-[hsl(var(--brand-deep))] border-transparent">
              Contact our advisory practice <ArrowRight />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}