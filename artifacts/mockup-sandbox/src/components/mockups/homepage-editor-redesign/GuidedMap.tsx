import { useState } from "react";
import "./_group.css";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CheckCircle2, ChevronDown,
  CircleAlert, CircleHelp, Eye, FileText, Globe2, Image, Layers3, LockKeyhole,
  Menu, MoveUpRight, Play, Send, Settings2, ShieldCheck, Sparkles, X
} from "lucide-react";

type SectionId = "hero" | "proof" | "services" | "blueprint" | "capability" | "industries" | "start";
type Section = { id: SectionId; number: string; name: string; note: string; status: "ready" | "attention" | "code"; };

const sections: Section[] = [
  { id: "hero", number: "01", name: "Opening", note: "Hero copy + film", status: "attention" },
  { id: "proof", number: "02", name: "Proof ledger", note: "Four statements", status: "ready" },
  { id: "services", number: "03", name: "What we do", note: "Service line records", status: "ready" },
  { id: "blueprint", number: "04", name: "Blueprint", note: "Journey + media", status: "code" },
  { id: "capability", number: "05", name: "Our capability", note: "Narrative + visual", status: "ready" },
  { id: "industries", number: "06", name: "Industries", note: "Published records", status: "attention" },
  { id: "start", number: "07", name: "Start", note: "Closing invitation", status: "ready" },
];
const industries = [
  { title: "Financial services", detail: "Digital banking, risk & compliance", color: "#d8e5dc", initials: "FS" },
  { title: "Telecommunications", detail: "Connected services at national scale", color: "#e7dce9", initials: "TC" },
  { title: "Travel & Hospitality", detail: "Guest journeys and operations", color: "#e7e0d0", initials: "TH" },
  { title: "Energy & Resources", detail: "Resilient infrastructure and transition", color: "#d8e1eb", initials: "ER" },
  { title: "Public Sector", detail: "Services designed around citizens", color: "#e8d9d2", initials: "PS" },
  { title: "Education", detail: "Learning and institutional operations", color: "#dce3d7", initials: "ED" },
];
const statusLabel = (status: Section["status"]) => status === "ready" ? "Looks good" : status === "attention" ? "Needs a look" : "Code-owned";

export function GuidedMap() {
  const [active, setActive] = useState<SectionId>("hero");
  const [drawer, setDrawer] = useState<"media" | "industry" | "review" | "record" | null>(null);
  const [selectedRecord, setSelectedRecord] = useState("Financial services");
  const [heroTitle, setHeroTitle] = useState("We turn complex ambition into working reality.");
  const [heroEyebrow, setHeroEyebrow] = useState("COGNIRISE PULSE");
  const [industryHeading, setIndustryHeading] = useState("Built on expertise.");
  const [manualOrder, setManualOrder] = useState(false);
  const [industryCount, setIndustryCount] = useState(6);
  const [industryOrder, setIndustryOrder] = useState(industries.map((item) => item.title));
  const [mediaAction, setMediaAction] = useState("");
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const section = sections.find((item) => item.id === active) ?? sections[0];
  const selectSection = (id: SectionId) => {
    setActive(id);
    setDrawer(null);
  };
  const moveIndustry = (direction: -1 | 1) => {
    setIndustryOrder((previous) => {
      const from = previous.indexOf(selectedRecord);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= previous.length) return previous;
      const next = [...previous];
      [next[from], next[to]] = [next[to], next[from]];
      notify(`${selectedRecord} moved to position ${to + 1} in this local example`);
      return next;
    });
  };
  const orderedIndustries = industryOrder.map((title) => industries.find((record) => record.title === title)).filter((record): record is (typeof industries)[number] => Boolean(record));
  const previewIndustries = manualOrder ? orderedIndustries.slice(0, industryCount) : orderedIndustries;

  return (
    <div className="homepage-editor-redesign gm">
      <style>{`
        .gm{--ink:#102957;--paper:#f5f3ed;--line:#d9d9d2;--pink:#cf4d91;--mint:#e5eee7;--amber:#f2bd67;--soft:#788294;min-height:100vh;background:var(--paper);color:var(--ink);font-family:var(--app-font-sans);font-size:13px;overflow:hidden}
        .gm *{box-sizing:border-box}.gm button,.gm input,.gm textarea,.gm select{font:inherit}.gm button{cursor:pointer}
        .gm-top{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid var(--line);background:#faf9f5;position:relative;z-index:5}
        .gm-brand{display:flex;align-items:center;gap:12px;font-family:var(--app-font-display);font-size:15px;font-weight:700;letter-spacing:-.04em}.gm-brand-mark{width:26px;height:26px;border-radius:50%;background:var(--ink);color:white;display:grid;place-items:center;font-size:11px;letter-spacing:-.08em}
        .gm-crumb{font:10px var(--app-font-mono);text-transform:uppercase;letter-spacing:.08em;color:#768093;padding-left:13px;border-left:1px solid var(--line);margin-left:4px}
        .gm-top-right{display:flex;align-items:center;gap:11px}.gm-edition{display:flex;align-items:center;gap:8px;border:1px solid var(--line);background:#fff;border-radius:3px;padding:7px 10px;color:#394c69;font-size:11px}
        .gm-edition strong{font-size:11px;color:var(--ink)}.gm-unsaved{font-size:10px;color:#9b5b18;display:flex;align-items:center;gap:5px}
        .gm-button{border:1px solid var(--line);border-radius:3px;background:#fff;color:var(--ink);padding:8px 12px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:background .16s ease,transform .16s ease}
        .gm-button:hover{background:#f0f1ec;transform:translateY(-1px)}.gm-button.primary{background:var(--ink);border-color:var(--ink);color:#fff}.gm-button.primary:hover{background:#1a3a6e}
        .gm-button.pink{background:var(--pink);border-color:var(--pink);color:#fff}.gm-button:disabled{opacity:.45;cursor:not-allowed;transform:none}
        .gm-layout{height:calc(100vh - 58px);min-height:680px;display:grid;grid-template-columns:224px minmax(390px,1fr) 346px}
        .gm-side{border-right:1px solid var(--line);padding:20px 14px 16px 20px;display:flex;flex-direction:column;background:#f8f7f2;min-width:0}
        .gm-side-kicker,.gm-label{font:9px var(--app-font-mono);letter-spacing:.12em;text-transform:uppercase;color:#828b99}
        .gm-side-heading{font-family:var(--app-font-display);font-size:19px;line-height:1.15;letter-spacing:-.06em;margin:7px 0 5px}
        .gm-side-copy{font-size:10px;color:#69758a;line-height:1.5;margin:0 4px 17px 0}
        .gm-progress{height:3px;background:#e1e1db;margin:0 0 16px;overflow:hidden}.gm-progress span{display:block;height:100%;width:29%;background:var(--pink)}
        .gm-map{display:flex;flex-direction:column;gap:3px}
        .gm-map-item{border:1px solid transparent;background:transparent;width:100%;text-align:left;border-radius:4px;padding:9px 7px;display:grid;grid-template-columns:25px 1fr auto;align-items:center;gap:5px;color:#43516a;position:relative}
        .gm-map-item:hover{background:#f0efe9}.gm-map-item.selected{background:#fff;border-color:#dfded7;box-shadow:0 2px 8px #112b4b0b;color:var(--ink)}
        .gm-map-item.selected:before{content:"";position:absolute;left:-1px;top:8px;bottom:8px;width:3px;background:var(--pink);border-radius:0 3px 3px 0}
        .gm-step{font:9px var(--app-font-mono);color:#9299a4}.gm-map-name{display:block;font-size:11px;font-weight:650}.gm-map-note{display:block;font-size:9px;color:#828b99;margin-top:3px}.gm-dot{width:7px;height:7px;border-radius:50%;background:#5f9677}.gm-dot.attention{background:#df9d43}.gm-dot.code{background:#a6aab0}
        .gm-side-foot{margin-top:auto;border-top:1px solid var(--line);padding-top:13px}.gm-review-line{display:flex;align-items:center;gap:8px;color:#465572;font-size:10px;margin-bottom:10px}.gm-avatar{height:23px;width:23px;border-radius:50%;background:#e9d9e5;color:#8c3f72;display:grid;place-items:center;font-size:9px;font-weight:700}
        .gm-center{padding:23px 28px 36px;overflow:auto;min-width:0}.gm-center-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:1px solid var(--line);padding-bottom:17px;margin-bottom:20px}
        .gm-title-overline{font:9px var(--app-font-mono);text-transform:uppercase;letter-spacing:.11em;color:var(--pink);display:flex;align-items:center;gap:7px}
        .gm-center h1{font-family:var(--app-font-display);font-size:26px;line-height:1.04;letter-spacing:-.07em;margin:7px 0 5px}.gm-center-sub{font-size:11px;color:#717b8d;margin:0;line-height:1.5}
        .gm-step-pager{display:flex;gap:4px}.gm-icon-button{height:30px;width:31px;background:#fff;border:1px solid var(--line);border-radius:3px;color:#43516a;display:grid;place-items:center}
        .gm-buyer-note{display:flex;gap:9px;background:#eaf0eb;border:1px solid #d4e0d6;padding:10px 12px;border-radius:3px;margin-bottom:18px;font-size:10px;color:#45604d;line-height:1.45}
        .gm-field{margin:0 0 14px}.gm-field-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}.gm-field label{font-size:11px;font-weight:650}.gm-field small{font:9px var(--app-font-mono);color:#9299a4}
        .gm-input,.gm-textarea{display:block;width:100%;border:1px solid #d4d6d3;background:#fff;border-radius:3px;padding:10px 11px;color:var(--ink);outline:none;font-size:12px}
        .gm-input:focus,.gm-textarea:focus{border-color:#7588a4;box-shadow:0 0 0 2px #10295714}.gm-textarea{resize:vertical;min-height:86px;line-height:1.5}
        .gm-count{font:9px var(--app-font-mono);color:#8b93a0;text-align:right;margin-top:4px}.gm-source{display:inline-flex;align-items:center;gap:5px;font-size:9px;color:#68758c;background:#f1f1ec;padding:5px 7px;border-radius:2px}
        .gm-rule{border:0;border-top:1px solid var(--line);margin:17px 0}.gm-media-card{border:1px solid #dfc7a4;background:#fff9ee;padding:12px;border-radius:3px;display:flex;gap:11px;align-items:flex-start}
        .gm-media-thumb{height:44px;width:60px;flex:none;background:linear-gradient(135deg,#c9d5d2,#e6e4d9);display:grid;place-items:center;color:#64767a;border-radius:2px;position:relative;overflow:hidden}
        .gm-media-thumb:after{content:"";position:absolute;inset:0;background:linear-gradient(140deg,transparent 55%,#9aaba4 56%,#9aaba4 58%,transparent 59%)}
        .gm-media-title{font-size:11px;font-weight:650;margin:1px 0 4px}.gm-media-copy{font-size:10px;color:#737c89;line-height:1.4;margin:0}.gm-media-actions{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}
        .gm-small-btn{font-size:9px;border:1px solid #d9d2c6;background:#fff;padding:5px 7px;border-radius:2px;color:#526078;display:inline-flex;gap:5px;align-items:center}
        .gm-code-card{border:1px dashed #c7cbd0;background:#f7f7f3;border-radius:3px;padding:13px 14px;display:flex;align-items:flex-start;gap:10px}
        .gm-code-card strong{display:block;font-size:11px;margin:0 0 4px}.gm-code-card p{font-size:10px;color:#77808d;margin:0;line-height:1.45}
        .gm-record-list{display:grid;gap:7px;margin-top:11px}.gm-record-row{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:9px;padding:8px;border:1px solid #e1e1db;background:#fff;border-radius:3px}
        .gm-record-thumb{width:30px;height:30px;border-radius:2px;display:grid;place-items:center;font:9px var(--app-font-mono);color:#526078}.gm-record-title{font-size:10px;font-weight:650}.gm-record-sub{font-size:9px;color:#8a919b;margin-top:3px}
        .gm-fieldset{border:1px solid #dedfd9;border-radius:3px;padding:12px;margin:0 0 14px}.gm-fieldset legend{font-size:11px;font-weight:650;padding:0 5px}.gm-select-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.gm-select-wrap{position:relative}.gm-select{appearance:none;border:1px solid #d4d6d3;background:white;border-radius:3px;padding:7px 25px 7px 9px;font-size:10px;color:var(--ink)}
        .gm-switch{border:0;width:31px;height:17px;border-radius:99px;background:#bcc1c4;padding:2px;display:flex;align-items:center;transition:background .15s}.gm-switch.on{background:#577d65;justify-content:flex-end}.gm-switch span{width:13px;height:13px;border-radius:50%;background:white}
        .gm-checks{margin-top:22px;padding-top:15px;border-top:1px solid var(--line)}.gm-check-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}.gm-check-heading h2{font-size:12px;margin:0;font-weight:700}.gm-check-count{font:9px var(--app-font-mono);color:#a46820;background:#f7e8cf;padding:5px 7px;border-radius:2px}
        .gm-check-item{display:grid;grid-template-columns:16px 1fr auto;gap:7px;align-items:start;border-top:1px solid #e1e1db;padding:9px 0}.gm-check-item:first-of-type{border-top:0}
        .gm-check-item strong{display:block;font-size:10px;margin-bottom:3px}.gm-check-item p{font-size:9px;color:#7a8290;margin:0;line-height:1.45}.gm-check-item button{color:#596981;font-size:9px;border:0;background:none;text-decoration:underline;text-underline-offset:2px;padding:0}
        .gm-rail{border-left:1px solid var(--line);background:#f0efe9;display:flex;flex-direction:column;min-width:0}
        .gm-preview-head{height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 15px;border-bottom:1px solid var(--line);background:#f5f4ef}
        .gm-preview-title{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:700}.gm-preview-meta{font:8px var(--app-font-mono);color:#8b929e}
        .gm-preview{padding:15px 15px 20px;overflow:auto}.gm-browser{background:white;border:1px solid #d9dbdc;box-shadow:0 5px 18px #142e4a0e;min-height:440px;position:relative}
        .gm-browser-bar{height:24px;background:#f9f9f7;border-bottom:1px solid #e4e4e1;display:flex;align-items:center;padding:0 8px;gap:4px}.gm-browser-bar i{height:5px;width:5px;border-radius:50%;background:#c6c9c5}.gm-url{margin-left:6px;border-radius:2px;background:#eeefec;color:#868e98;font:7px var(--app-font-mono);padding:3px 7px;flex:1}
        .gm-page-nav{display:flex;justify-content:space-between;align-items:center;padding:11px 12px 8px}.gm-page-logo{font-family:var(--app-font-display);font-size:11px;font-weight:700;letter-spacing:-.05em}.gm-page-navlinks{display:flex;gap:8px;color:#6a7380;font-size:6px}
        .gm-hero-preview{padding:22px 14px 13px;min-height:177px;position:relative;overflow:hidden}.gm-hero-preview:after{content:"";position:absolute;width:105px;height:105px;right:-17px;top:25px;border:1px solid #d8dce4;transform:rotate(35deg);box-shadow:12px 11px 0 -1px #fff,13px 12px 0 #d8dce4,26px 24px 0 -1px #fff,27px 25px 0 #d8dce4}
        .gm-mini-kicker{font:6px var(--app-font-mono);letter-spacing:.12em;color:var(--pink)}.gm-hero-preview h3{font-family:var(--app-font-display);font-size:20px;line-height:1;letter-spacing:-.07em;max-width:180px;margin:10px 0 9px;position:relative;z-index:1}
        .gm-mini-copy{font-size:6px;color:#6d7785;line-height:1.45;max-width:160px;margin:0 0 10px}.gm-mini-cta{display:inline-flex;background:var(--ink);color:white;padding:6px 9px;border-radius:2px;font-size:6px}
        .gm-preview-highlight{position:absolute;inset:5px;border:1px solid var(--pink);pointer-events:none}.gm-highlight-tag{position:absolute;left:8px;top:3px;z-index:2;font:6px var(--app-font-mono);background:var(--pink);color:white;padding:3px 5px;letter-spacing:.08em}
        .gm-mini-proof{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #d6dce4;border-bottom:1px solid #d6dce4;margin:0 11px}.gm-mini-proof span{font-size:6px;line-height:1.35;padding:7px 6px;border-bottom:1px solid #e4e6e7}.gm-mini-proof span:nth-child(odd){border-right:1px solid #e4e6e7}.gm-mini-proof b{font-size:6px}
        .gm-mini-section{padding:15px 12px}.gm-mini-section h4{font-family:var(--app-font-display);font-size:12px;margin:4px 0 10px;letter-spacing:-.05em}.gm-mini-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.gm-mini-tile{height:54px;background:#e7ebef;padding:6px;display:flex;align-items:flex-end;font-size:6px;font-weight:650;color:#263b5b}
        .gm-mini-video{margin:0 11px;height:55px;background:linear-gradient(120deg,#d7dfe1,#edf0eb);display:grid;place-items:center;color:#607182;position:relative}.gm-play{width:19px;height:19px;border-radius:50%;background:#fff;display:grid;place-items:center}
        .gm-mini-industries{background:#f0f1f3;padding:11px 12px}.gm-mini-industries h4{font-family:var(--app-font-display);font-size:12px;margin:0 0 8px;letter-spacing:-.05em}.gm-mini-industry-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.gm-mini-industry{height:45px;display:flex;align-items:end;padding:4px;font-size:5px;font-weight:700;color:#35455e}
        .gm-mini-end{height:55px;background:var(--ink);color:white;margin-top:8px;padding:11px 12px}.gm-mini-end strong{font-family:var(--app-font-display);font-size:13px;letter-spacing:-.06em}.gm-mini-end small{display:block;font-size:6px;color:#d5dce7;margin-top:4px}
        .gm-preview-caption{display:flex;gap:7px;color:#737e8c;font-size:9px;line-height:1.4;margin:12px 1px 0}.gm-scope{border-top:1px solid var(--line);padding:13px 15px 15px;margin-top:auto;background:#f7f6f1}
        .gm-scope h3{font:9px var(--app-font-mono);letter-spacing:.1em;text-transform:uppercase;margin:0 0 8px;color:#778294}.gm-scope-row{display:flex;justify-content:space-between;font-size:9px;padding:4px 0;color:#657187}.gm-scope-row b{font-weight:650;color:var(--ink)}
        .gm-footer{border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;padding:12px 28px;gap:10px;background:#f8f7f2}
        .gm-footer-state{display:flex;align-items:center;gap:7px;color:#6c7686;font-size:10px}.gm-footer-actions{display:flex;gap:7px;align-items:center}
        .gm-release{background:#e6e7e3!important;border-color:#d1d3ce!important;color:#7c8285!important}
        .gm-shell{grid-column:1/-1;height:100%;min-height:0;display:flex;flex-direction:column}.gm-content{min-height:0;flex:1;display:grid;grid-template-columns:224px minmax(390px,1fr) 346px;overflow:hidden}
        .gm-overlay{position:fixed;inset:0;background:#10295745;z-index:10;display:flex;justify-content:flex-end}.gm-drawer{height:100%;width:min(400px,100vw);background:#faf9f5;padding:23px;box-shadow:-10px 0 30px #1029571a;display:flex;flex-direction:column;animation:gmIn .2s ease-out}
        @keyframes gmIn{from{transform:translateX(16px);opacity:.4}to{transform:translateX(0);opacity:1}}
        .gm-drawer-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.gm-drawer h2{font-family:var(--app-font-display);font-size:23px;letter-spacing:-.06em;margin:7px 0}.gm-drawer p{color:#69758a;line-height:1.55;font-size:11px}
        .gm-drawer-box{border:1px solid var(--line);background:#fff;padding:13px;border-radius:3px;margin:12px 0}.gm-drawer-box h3{font-size:11px;margin:0 0 6px}.gm-drawer-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:15px}
        .gm-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:var(--ink);color:white;padding:10px 14px;border-radius:3px;font-size:10px;z-index:20;box-shadow:0 5px 18px #1029572a}
        .gm-mobile-toggle{display:none}
        @media(max-width:1050px){.gm-layout,.gm-content{grid-template-columns:195px minmax(330px,1fr) 300px}.gm-center{padding:20px}.gm-side{padding-left:14px}.gm-top{padding:0 16px}}
        @media(max-width:800px){.gm{overflow:visible}.gm-layout{height:auto;min-height:calc(100vh - 58px);display:block}.gm-shell{height:auto;min-height:calc(100vh - 58px)}.gm-content{display:block;overflow:visible}.gm-side{display:none}.gm-side.mobile-open{display:flex;position:fixed;z-index:8;top:58px;bottom:0;left:0;width:260px;box-shadow:10px 0 25px #10295722}.gm-mobile-toggle{display:grid}.gm-top{padding:0 12px}.gm-crumb{display:none}.gm-top-right{gap:6px}.gm-edition{font-size:9px;padding:6px}.gm-unsaved{display:none}.gm-center{padding:19px 16px}.gm-rail{border-left:0;border-top:1px solid var(--line)}.gm-preview{max-width:520px;margin:auto;width:100%}.gm-preview-head{padding:0 16px}.gm-footer{padding:11px 14px;align-items:flex-start;flex-direction:column}.gm-footer-actions{width:100%;display:grid;grid-template-columns:1fr 1fr}.gm-footer-actions .gm-button{font-size:10px}.gm-footer-state{font-size:9px}.gm-center h1{font-size:23px}}
        @media(max-width:430px){.gm-brand{font-size:13px;gap:7px}.gm-brand-mark{width:23px;height:23px}.gm-top-right .gm-button{padding:7px 8px;font-size:9px}.gm-top-right .gm-button svg{display:none}.gm-center-head{gap:8px}.gm-step-pager{gap:3px}.gm-step-pager .gm-icon-button{width:27px}.gm-center h1{font-size:22px}.gm-buyer-note{font-size:9px}.gm-select-row{align-items:flex-start;flex-direction:column}}
      `}</style>
      <header className="gm-top">
        <div className="gm-brand">
          <button className="gm-icon-button gm-mobile-toggle" aria-label="Open section map" onClick={() => setMobileNav(!mobileNav)}><Menu size={15} /></button>
          <span className="gm-brand-mark">C</span><span>cognirise</span><span className="gm-crumb">Pulse / Homepage</span>
        </div>
        <div className="gm-top-right">
          <span className="gm-unsaved"><CircleAlert size={12} /> {saved ? "Local draft example" : "Unsaved example edits"}</span>
          <div className="gm-edition"><Globe2 size={13} /><span>Edition</span><strong>UAE · English</strong><ChevronDown size={12} /></div>
          <button className="gm-button" onClick={() => notify("Preview shows the current local example only")}><Eye size={13} /> Buyer preview</button>
        </div>
      </header>
      <div className="gm-layout">
        <div className={`gm-shell`}>
          <div className="gm-content">
            <aside className={`gm-side ${mobileNav ? "mobile-open" : ""}`}>
              <div className="gm-side-kicker">Homepage / UAE · EN</div>
              <div className="gm-side-heading">A page, in seven moments.</div>
              <p className="gm-side-copy">Walk through what buyers see. Each stop explains who owns the content and what needs attention.</p>
              <div className="gm-progress"><span /></div>
              <nav className="gm-map" aria-label="Homepage section map">
                {sections.map((item) => (
                  <button key={item.id} className={`gm-map-item ${active === item.id ? "selected" : ""}`} onClick={() => selectSection(item.id)} data-testid={`map-${item.id}`}>
                    <span className="gm-step">{item.number}</span><span><span className="gm-map-name">{item.name}</span><span className="gm-map-note">{item.note}</span></span>
                    <span title={statusLabel(item.status)} className={`gm-dot ${item.status}`} />
                  </button>
                ))}
              </nav>
              <div className="gm-side-foot">
                <div className="gm-review-line"><span className="gm-avatar">AR</span><span>Independent review required</span><CircleHelp size={13} /></div>
                <button className="gm-button" style={{ width: "100%" }} onClick={() => setDrawer("review")}><ShieldCheck size={13} /> Review & release path</button>
              </div>
            </aside>

            <main className="gm-center">
              <div className="gm-center-head">
                <div>
                  <div className="gm-title-overline"><span>{section.number}</span><span> / Guided page map</span></div>
                  <h1>{section.name}</h1>
                  <p className="gm-center-sub">{active === "hero" ? "Set the first impression. See where each line and visual comes from." : active === "industries" ? "Choose how the published Industry records appear in this fixed section." : section.note === "Code-owned" || section.status === "code" ? "This presentation is fixed in the website code today." : `Review the ${section.name.toLowerCase()} moment of the buyer page.`}</p>
                </div>
                <div className="gm-step-pager">
                  <button className="gm-icon-button" aria-label="Previous section" onClick={() => selectSection(sections[Math.max(0, sections.findIndex((s) => s.id === active) - 1)].id)}><ArrowLeft size={14} /></button>
                  <button className="gm-icon-button" aria-label="Next section" onClick={() => selectSection(sections[Math.min(sections.length - 1, sections.findIndex((s) => s.id === active) + 1)].id)}><ArrowRight size={14} /></button>
                </div>
              </div>

              <div className="gm-buyer-note"><Eye size={14} /><span><strong>Buyer view, not a schema view.</strong> The miniature shows the fixed homepage structure. Edits here are local examples; they are not saved to Cognirise.</span></div>

              {active === "hero" && <>
                <div className="gm-field">
                  <div className="gm-field-head"><label htmlFor="gm-eyebrow">Opening label</label><small>Editable homepage slot</small></div>
                  <input id="gm-eyebrow" className="gm-input" value={heroEyebrow} onChange={(e) => setHeroEyebrow(e.target.value)} />
                  <div className="gm-count">{heroEyebrow.length} characters</div>
                </div>
                <div className="gm-field">
                  <div className="gm-field-head"><label htmlFor="gm-hero-title">Hero headline</label><small>home-hero-heading</small></div>
                  <textarea id="gm-hero-title" className="gm-textarea" rows={3} value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
                  <div className="gm-count">{heroTitle.length} characters · Visible in the opening panel</div>
                </div>
                <div className="gm-field">
                  <div className="gm-field-head"><label>Hero film</label><span className="gm-source"><Settings2 size={11} /> Site Configuration</span></div>
                  <div className="gm-media-card">
                    <div className="gm-media-thumb"><Play size={15} /></div>
                    <div><p className="gm-media-title">Pulse opening film · example media issue</p><p className="gm-media-copy">If this reference is missing or unavailable for UAE English, publication remains blocked.</p>
                      <div className="gm-media-actions"><button className="gm-small-btn" onClick={() => setDrawer("media")}><Image size={11} /> Replace if authorized</button><button className="gm-small-btn" onClick={() => { setMediaAction("Media review requested for hero film"); notify("Media review request prepared in this prototype"); }}><Send size={11} /> Request media review</button></div>
                    </div>
                  </div>
                  {mediaAction && <div style={{ fontSize: 9, color: "#55715f", marginTop: 6, display: "flex", gap: 5, alignItems: "center" }}><Check size={11} /> {mediaAction} · prototype only</div>}
                </div>
                <div className="gm-field"><span className="gm-source"><FileText size={11} /> Source: Homepage landing slots · UAE / en</span></div>
              </>}

              {active === "industries" && <>
                <div className="gm-buyer-note"><Layers3 size={14} /><span>The homepage shows <strong>six published Industry records</strong>. Per-card title and image are not copied into homepage content; open the Industry record to change them.</span></div>
                <div className="gm-field"><div className="gm-field-head"><label htmlFor="gm-industry-heading">Section heading</label><small>Editable homepage slot</small></div><input id="gm-industry-heading" className="gm-input" value={industryHeading} onChange={(e) => setIndustryHeading(e.target.value)} /><div className="gm-count">{industryHeading.length} characters</div></div>
                <fieldset className="gm-fieldset"><legend>Industry selection</legend>
                  <div className="gm-select-row"><div><div style={{ fontWeight: 650, fontSize: 10 }}>Selection method</div><div style={{ color: "#818a97", fontSize: 9, marginTop: 3 }}>Choose which published records are shown</div></div>
                    <div className="gm-select-wrap"><select aria-label="Industry selection method" className="gm-select" value={manualOrder ? "manual" : "automatic"} onChange={(e) => setManualOrder(e.target.value === "manual")}><option value="automatic">Automatic · newest</option><option value="manual">Manual selection</option></select><ChevronDown size={11} style={{ position: "absolute", right: 8, top: 9, pointerEvents: "none" }} /></div>
                  </div>
                  {manualOrder && <div style={{ borderTop: "1px solid #e4e3de", paddingTop: 10, marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 10 }}>Selected records</span><select className="gm-select" aria-label="Number of industries to show" value={industryCount} onChange={(e) => setIndustryCount(Number(e.target.value))}><option value={3}>3 records</option><option value={4}>4 records</option><option value={6}>6 records</option></select></div>}
                </fieldset>
                <div className="gm-field-head"><label>Example published records</label><span className="gm-source">Record-owned details</span></div>
                <div className="gm-record-list">{orderedIndustries.slice(0, manualOrder ? industryCount : 3).map((record) => <div className="gm-record-row" key={record.title}><button type="button" className="gm-record-thumb" aria-label={`Select ${record.title} for ordering`} onClick={() => setSelectedRecord(record.title)} style={{ background: record.color, outline: selectedRecord === record.title ? "2px solid #cf4d91" : "none" }}>{record.initials}</button><div><button type="button" className="gm-record-title" style={{ border: 0, background: "transparent", padding: 0, textAlign: "left", color: "inherit" }} onClick={() => setSelectedRecord(record.title)}>{record.title}</button><div className="gm-record-sub">{record.detail}</div></div><button className="gm-icon-button" aria-label={`Open ${record.title} Industry record`} onClick={() => { setSelectedRecord(record.title); setDrawer("record"); }}><MoveUpRight size={13} /></button></div>)}</div>
                {manualOrder && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 9, fontSize: 9, color: "#727c8b" }}><span>Manual ordering · showing {industryCount} of 6 · selected {selectedRecord}</span><div style={{ display: "flex", gap: 4 }}><button className="gm-icon-button" aria-label="Move selected industry up" onClick={() => moveIndustry(-1)}><ArrowUp size={12} /></button><button className="gm-icon-button" aria-label="Move selected industry down" onClick={() => moveIndustry(1)}><ArrowDown size={12} /></button></div></div>}
              </>}

              {active === "proof" && <><div className="gm-code-card"><LockKeyhole size={16} /><div><strong>Four proof statements · layout is code-owned</strong><p>The four-cell ledger composition is fixed in the homepage renderer. This workspace can edit the named copy slots, not change its presentation.</p></div></div>{["No long pilots. Prototype in 48 hours.","We don’t bill mandays. We deliver outcomes.","We don’t build Power Points. We build working solutions","No vendor lock-in. You own the platform."].map((text,i)=><div className="gm-field" key={i}><div className="gm-field-head"><label>Statement {String(i+1).padStart(2,"0")}</label><small>home-proof-{["model","focus","platform","presence"][i]}</small></div><input className="gm-input" defaultValue={text} /><span className="gm-source" style={{ marginTop: 6 }}>Homepage landing slot · editable text</span></div>)}</>}

              {active === "services" && <><div className="gm-code-card"><Layers3 size={16} /><div><strong>Service tiles · reusable service-line records</strong><p>The tiles are rendered from service-line data. Edit the source record, not a duplicate homepage card.</p></div></div><div className="gm-field" style={{ marginTop: 15 }}><div className="gm-field-head"><label>Section heading</label><small>home-service-heading</small></div><input className="gm-input" defaultValue="We combine strategy, engineering and platform." /></div>{["Strategy & operating model advisory","Forward-deployed enterprise engineering","Proprietary CogniOS operating system"].map((item,i)=><div className="gm-record-row" key={item}><div className="gm-record-thumb" style={{ background: ["#e7dce9","#d8e5dc","#e7e0d0"][i] }}>{String(i+1).padStart(2,"0")}</div><div><div className="gm-record-title">{item}</div><div className="gm-record-sub">Service line record · published</div></div><button className="gm-icon-button" aria-label={`Open service line ${item}`} onClick={() => notify(`Open service-line record: ${item}`)}><MoveUpRight size={13} /></button></div>)}</>}

              {active === "blueprint" && <><div className="gm-code-card"><LockKeyhole size={16} /><div><strong>Blueprint journey · website presentation is code-owned</strong><p>The stage arrangement and layout are fixed by the website renderer. Stage media references are governed by this homepage edition.</p></div></div><div className="gm-field" style={{ marginTop: 14 }}><div className="gm-field-head"><label>Stage visual</label><span className="gm-source"><Settings2 size={11} /> Homepage media slots</span></div><div className="gm-media-card"><div className="gm-media-thumb"><Image size={15} /></div><div><p className="gm-media-title">Journey panorama · review status unknown</p><p className="gm-media-copy">Media approval is separate from this page map. If unavailable, release remains blocked.</p><div className="gm-media-actions"><button className="gm-small-btn" onClick={() => setDrawer("media")}>Open media source</button><button className="gm-small-btn" onClick={() => setDrawer("media")}><Send size={11} /> Request media review</button></div></div></div></div></>}

              {active === "capability" && <><div className="gm-field"><div className="gm-field-head"><label>Section label</label><small>home-convergence-label</small></div><input className="gm-input" defaultValue="Our capability" /></div><div className="gm-field"><div className="gm-field-head"><label>Headline</label><small>home-convergence-heading</small></div><textarea className="gm-textarea" defaultValue="We deploy teams who bridge the entire operating gap." /></div><div className="gm-field"><div className="gm-field-head"><label>Visual caption</label><span className="gm-source"><FileText size={11} /> Homepage landing slot</span></div><input className="gm-input" defaultValue="people + agents" /></div><div className="gm-media-card"><Image size={15} /><div><p className="gm-media-title">Capability visual</p><p className="gm-media-copy">Image reference managed through approved media. Open its source for review status.</p><button className="gm-small-btn" style={{ marginTop: 8 }} onClick={() => setDrawer("media")}>Open media source</button></div></div></>}

              {active === "start" && <><div className="gm-field"><div className="gm-field-head"><label>Closing label</label><small>home-start-label</small></div><input className="gm-input" defaultValue="Start" /></div><div className="gm-field"><div className="gm-field-head"><label>Closing headline</label><small>home-start-heading</small></div><input className="gm-input" defaultValue="Ready for a change?" /></div><div className="gm-code-card"><LockKeyhole size={16} /><div><strong>Closing composition · presentation is code-owned</strong><p>The deep navy panel, typography and background wordmark belong to the website renderer. Copy remains an editable homepage slot.</p></div></div></>}

              <div className="gm-checks">
                <div className="gm-check-heading"><h2>Checks for this moment</h2><span className="gm-check-count">{active === "hero" ? "2 blockers" : active === "industries" ? "1 check" : section.status === "code" ? "1 note" : "Clear"}</span></div>
                {active === "hero" ? <>
                  <div className="gm-check-item"><CircleAlert size={14} color="#c7802c" /><div><strong>Example: hero film · media availability</strong><p>Site Configuration · resolve any unavailable reference for UAE / en.</p><button onClick={() => setDrawer("media")}>Open media remedy</button></div><span className="gm-label">Publish</span></div>
                  <div className="gm-check-item"><CircleAlert size={14} color="#c7802c" /><div><strong>Headline · independent review</strong><p>Homepage slot home-hero-heading · draft changes must be reviewed by another person.</p><button onClick={() => setDrawer("review")}>View review path</button></div><span className="gm-label">Workflow</span></div>
                </> : active === "industries" ? <div className="gm-check-item"><CircleAlert size={14} color="#c7802c" /><div><strong>Industry selection · source records</strong><p>Confirm that selected Industry records are published and approved for UAE / en.</p><button onClick={() => notify("Industry source check opened in this prototype")}>Review source records</button></div><span className="gm-label">Edition</span></div> : <div className="gm-check-item"><CheckCircle2 size={14} color="#548364" /><div><strong>{section.status === "code" ? "Presentation constraint" : "No content checks shown for this section"}</strong><p>{section.status === "code" ? "This section cannot be rearranged or restyled in the current homepage renderer." : "Checks are scoped to the exact UAE English edition."}</p></div><span className="gm-label">{section.status === "code" ? "Code" : "Draft"}</span></div>}
              </div>
            </main>

            <aside className="gm-rail">
              <div className="gm-preview-head"><div className="gm-preview-title"><Eye size={13} /> Buyer page miniature</div><span className="gm-preview-meta">LOCAL EXAMPLE</span></div>
              <div className="gm-preview">
                <div className="gm-browser">
                  <div className="gm-browser-bar"><i/><i/><i/><span className="gm-url">cognirise.com/uae</span></div>
                  <div className="gm-page-nav"><span className="gm-page-logo">cognirise</span><span className="gm-page-navlinks"><span>What we do</span><span>Industries</span><span>About</span></span></div>
                  <div className="gm-hero-preview">
                    {active === "hero" && <><span className="gm-highlight-tag">YOU’RE HERE · {section.number}</span><div className="gm-preview-highlight" /></>}
                    <div className="gm-mini-kicker">{heroEyebrow || "COGNIRISE PULSE"}</div><h3>{heroTitle}</h3><p className="gm-mini-copy">We work alongside your teams to shape strategy, engineer capability and make change real.</p><span className="gm-mini-cta">Let’s talk <ArrowRight size={7} /></span>
                  </div>
                  <div className="gm-mini-proof"><span><b>No long pilots.</b><br/>Prototype in 48 hours.</span><span><b>Outcomes, not mandays.</b></span><span><b>Working solutions.</b></span><span><b>You own the platform.</b></span></div>
                  <div className="gm-mini-section"><span className="gm-mini-kicker">WHAT WE DO</span><h4>Strategy, engineering<br/>and platform.</h4><div className="gm-mini-tiles"><div className="gm-mini-tile">Strategy</div><div className="gm-mini-tile">Engineering</div><div className="gm-mini-tile">CogniOS</div></div></div>
                  <div className="gm-mini-video"><span className="gm-play"><Play size={8} fill="currentColor" /></span></div>
                  <div className="gm-mini-industries"><span className="gm-mini-kicker">INDUSTRIES · {previewIndustries.length} RECORDS</span><h4>{industryHeading}</h4><div className="gm-mini-industry-grid">{previewIndustries.map((item) => <div key={item.title} className="gm-mini-industry" style={{ background: item.color }}>{item.title}</div>)}</div></div>
                  <div className="gm-mini-end"><strong>Ready for a change?</strong><small>Start a conversation</small></div>
                </div>
                <div className="gm-preview-caption"><Sparkles size={12} /><span>Current selection: <strong>{section.name}</strong>. Miniature maps the real fixed page structure; it is not a live site renderer.</span></div>
              </div>
              <div className="gm-scope"><h3>Edition scope</h3><div className="gm-scope-row"><span>Market</span><b>United Arab Emirates</b></div><div className="gm-scope-row"><span>Language</span><b>English</b></div><div className="gm-scope-row"><span>Draft state</span><b>{saved ? "Local saved example" : "Unsubmitted edits"}</b></div></div>
            </aside>
          </div>

          <footer className="gm-footer">
            <div className="gm-footer-state"><span className="gm-dot attention" /> Draft example · not persisted <span style={{ color: "#a3a6aa" }}>—</span> Approval and edition publication are separate steps.</div>
            <div className="gm-footer-actions">
              <button className="gm-button" onClick={() => { setSaved(true); notify("Draft saved in local prototype state only"); }}><FileText size={13} /> Save draft example</button>
              <button className="gm-button" onClick={() => setDrawer("review")}><ShieldCheck size={13} /> Request independent review</button>
              <button className="gm-button gm-release" onClick={() => setDrawer("review")}><Globe2 size={13} /> Open scoped Release Center</button>
            </div>
          </footer>
        </div>
      </div>

      {drawer && <div className="gm-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setDrawer(null); }}>
        <section className="gm-drawer" role="dialog" aria-modal="true" aria-label={drawer === "media" ? "Media remedy" : drawer === "industry" ? "Industry record" : drawer === "record" ? `${selectedRecord} source record` : "Review and release path"}>
          <div className="gm-drawer-head"><div><div className="gm-side-kicker">{drawer === "media" ? "Source & remedy" : drawer === "record" ? "Published source record" : "Governance path"}</div><h2>{drawer === "media" ? "Resolve the media check" : drawer === "record" ? selectedRecord : drawer === "industry" ? "Industry records" : "From draft to release"}</h2></div><button className="gm-icon-button" onClick={() => setDrawer(null)} aria-label="Close panel"><X size={15} /></button></div>
          {drawer === "media" ? <>
            <p>The hero film comes from <strong>Site Configuration</strong>. This example shows how an unavailable reference would block the exact UAE · English release until resolved.</p>
            <div className="gm-drawer-box"><h3>Available remedies</h3><p><strong>Replace media</strong> only if your role is authorized to select an already-approved asset. This does not approve the new asset.</p><p><strong>Request media review</strong> when no approved replacement is available. An independent reviewer must approve the media.</p></div>
            <div className="gm-drawer-box"><h3>Exact source</h3><p>Site Configuration → Homepage hero film · UAE / en</p><p style={{ fontFamily: "var(--app-font-mono)", fontSize: 9 }}>status: approval required · scope: edition-specific</p></div>
            <div className="gm-drawer-actions"><button className="gm-button" onClick={() => { setDrawer(null); notify("Authorized replacement flow opened (prototype)"); }}><Image size={13} /> Select approved replacement</button><button className="gm-button primary" onClick={() => { setMediaAction("Media review requested for hero film"); setDrawer(null); notify("Media review request prepared; no approval granted"); }}><Send size={13} /> Request media review</button></div>
          </> : drawer === "record" ? <>
            <p>This card is a linked <strong>Industry record</strong>, not duplicated homepage copy. The title, image and industry details belong to that record.</p>
            <div className="gm-drawer-box"><h3>{selectedRecord}</h3><p>Example public description owned by the Industry record. Changes to its approved record flow to the homepage selection automatically.</p><span className="gm-source"><Layers3 size={11} /> Industry record · published source</span></div>
            <div className="gm-drawer-box"><h3>Homepage relationship</h3><p>Selected for the Industries section. To change its position, use manual selection in the page map. To change card content, open the source record.</p></div>
            <div className="gm-drawer-actions"><button className="gm-button" onClick={() => { setDrawer(null); notify(`Industry source ${selectedRecord} opened (prototype)`); }}><MoveUpRight size={13} /> Open Industry record</button><button className="gm-button primary" onClick={() => setDrawer(null)}>Back to page map</button></div>
          </> : <>
            <p>This workspace keeps four distinct states distinct. No action here auto-approves or publishes content.</p>
            <div className="gm-drawer-box"><h3><span className="gm-label">01 / Author</span><br/>Save a draft</h3><p>Draft edits stay private. A saved draft is not an approved edition and is not public.</p></div>
            <div className="gm-drawer-box"><h3><span className="gm-label">02 / Independent reviewer</span><br/>Review a specific revision</h3><p>A different person checks the exact revision and its edition-scoped content and media. Approval is an explicit reviewer decision.</p></div>
            <div className="gm-drawer-box"><h3><span className="gm-label">03 / Edition publication</span><br/>Publish the approved UAE · en edition</h3><p>Edition publication is a separate governed step, available only after independent approval and readiness checks pass.</p></div>
            <div className="gm-drawer-box"><h3><span className="gm-label">04 / Release Center</span><br/>Scoped public release</h3><p>The Release Center controls which approved edition is released. Its action is separate from saving and review.</p></div>
            <div className="gm-drawer-actions"><button className="gm-button" onClick={() => { setDrawer(null); notify("Review request prepared in local prototype state"); }}><Send size={13} /> Prepare review handoff</button><button className="gm-button primary" onClick={() => { setDrawer(null); notify("Release Center is a separate destination; prototype did not publish"); }}><Globe2 size={13} /> Continue to Release Center</button></div>
          </>}
        </section>
      </div>}
      {toast && <div className="gm-toast" role="status">{toast}</div>}
    </div>
  );
}

export default GuidedMap;