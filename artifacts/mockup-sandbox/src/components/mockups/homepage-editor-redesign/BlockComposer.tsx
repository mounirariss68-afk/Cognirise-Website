import "./_group.css";
import { useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, CircleAlert, CircleCheck,
  Clapperboard, ClipboardList, FileText, Film, GripVertical, Layers3, Link2,
  Plus, Save, Send, Settings2, ShieldCheck, Sparkles, X,
} from "lucide-react";

type Block = { id: string; name: string; sub: string; tag: string; source: string; };

const initialBlocks: Block[] = [
  { id: "hero", name: "Hero", sub: "Opening statement + primary action", tag: "Homepage content", source: "Named slots · hero eyebrow, heading, body, CTA" },
  { id: "proof", name: "Proof points", sub: "Four buyer commitments", tag: "Homepage content", source: "Named slots · four proof statements" },
  { id: "services", name: "Service lines", sub: "Strategy, engineering, platform", tag: "Service-line data", source: "Reusable service-line records" },
  { id: "industries", name: "Industries", sub: "Curated industry collection", tag: "Industry records", source: "Published Industry records" },
  { id: "closing", name: "Closing invitation", sub: "Final CTA + brand close", tag: "Homepage content", source: "Named slots · closing label, heading, CTA" },
];

const industryCards = [
  { name: "Financial services", slug: "financial-services", image: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-governed-ai-control-in-motion.jpg" },
  { name: "Telecommunications", slug: "telecoms", image: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-telecommunications-signal-field.jpg" },
  { name: "Travel & Hospitality", slug: "travel-hospitality", image: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-logistics-moving-network.jpg" },
  { name: "Energy & Resources", slug: "energy-resources", image: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-energy-balancing-force.jpg" },
  { name: "Public Sector", slug: "public-sector", image: "/__mockup/images/cognirise/site-government.jpg" },
  { name: "Education", slug: "education", image: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-knowledge-intelligence-living-index.jpg" },
];

const css = `
.bc{--navy:#102957;--navy2:#071936;--pink:#df3d75;--pinkwash:#f9e8ee;--paper:#f3f1ec;--card:#fffefa;--line:#d8d7d0;--muted:#737c8b;--green:#397865;color:#1a2b46;background:var(--paper);font-family:'DM Sans',sans-serif;min-height:100dvh}
.bc *{box-sizing:border-box}.bc button,.bc input,.bc select,.bc textarea{font:inherit}.bc button{cursor:pointer}.bc .mono{font-family:'IBM Plex Mono',monospace}
.bc-top{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}
.bc-brand{display:flex;align-items:center;gap:12px}.bc-mark{width:29px;height:29px;background:var(--navy);color:white;display:grid;place-items:center;font:700 11px 'IBM Plex Mono';letter-spacing:-1px}.bc-brandname{font-size:14px;font-weight:700;letter-spacing:-.04em;color:var(--navy)}.bc-divider{height:20px;width:1px;background:var(--line)}.bc-crumb{font-size:12px;color:#657084}.bc-edition{display:flex;align-items:center;gap:8px;border:1px solid #d9d7cf;border-radius:4px;padding:7px 9px;color:#36445a;font-size:11px;background:#fff}
.bc-topright{display:flex;align-items:center;gap:9px}.bc-status{font:10px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:#9a6231;background:#f7eddf;padding:6px 8px;border-radius:3px}.bc-avatar{width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:#f1dce3;color:#8a3152;font:700 10px 'IBM Plex Mono'}
.bc-layout{max-width:1440px;margin:auto;display:grid;grid-template-columns:207px minmax(350px,1fr) 306px;min-height:calc(100dvh - 58px)}
.bc-rail{background:#eae9e3;border-right:1px solid var(--line);padding:24px 13px;display:flex;flex-direction:column}.bc-rail-title{font:9px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:#8b9098;padding:0 10px 14px}.bc-nav{display:flex;gap:10px;align-items:center;padding:10px;border-radius:4px;color:#5a6677;font-size:12px;margin-bottom:3px}.bc-nav.active{background:var(--navy);color:white}.bc-nav svg{width:15px;height:15px}.bc-rail-foot{margin-top:auto;border-top:1px solid #d5d5ce;padding:14px 9px 0;font-size:10px;line-height:1.6;color:#79808a}
.bc-main{min-width:0;padding:23px clamp(15px,2.35vw,34px) 105px}.bc-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px}.bc-eyebrow{font:9px 'IBM Plex Mono';letter-spacing:.16em;text-transform:uppercase;color:var(--pink);margin-bottom:8px}.bc-heading h1{font-size:27px;line-height:1.08;letter-spacing:-.055em;color:var(--navy);margin:0}.bc-heading p{font-size:11px;color:#758091;margin:7px 0 0}.bc-utility{display:flex;gap:7px;align-items:center}.bc-quiet{border:1px solid var(--line);background:#fffefa;color:#536176;border-radius:3px;font-size:10px;padding:8px 10px;display:inline-flex;align-items:center;gap:6px}.bc-quiet svg{width:13px;height:13px}
.bc-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#f9e9ed;border:1px solid #edc6d3;border-left:3px solid var(--pink);padding:9px 12px;margin-bottom:15px;font-size:10px;color:#733550}.bc-banner strong{font-weight:700}.bc-banner svg{width:14px;height:14px;flex:none}
.bc-compose{display:grid;grid-template-columns:minmax(190px,.72fr) minmax(245px,1fr);gap:14px;align-items:start}
.bc-labelrow{display:flex;justify-content:space-between;align-items:center;margin:0 0 7px}.bc-labelrow h2{font:10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:#526176;margin:0}.bc-labelrow span{font:9px 'IBM Plex Mono';color:#9096a0}
.bc-stack{background:#eae9e3;border:1px solid #deddd6;padding:7px;border-radius:5px}.bc-block{background:var(--card);border:1px solid #deddd6;border-radius:4px;padding:10px 9px;margin-bottom:6px;display:grid;grid-template-columns:15px 1fr 19px;gap:8px;align-items:start;transition:transform .16s,background .16s}.bc-block:last-child{margin-bottom:0}.bc-block.selected{border-color:#d5507e;box-shadow:0 0 0 1px #d5507e;background:#fffafd}.bc-grip{color:#adb2ba;margin-top:1px}.bc-grip svg{width:13px;height:13px}.bc-block-title{font-size:11px;font-weight:700;color:#263c5c}.bc-block-sub{font-size:9px;color:#818997;margin-top:3px;line-height:1.4}.bc-chip{display:inline-flex;margin-top:6px;background:#eef0f3;color:#5c6675;padding:3px 5px;font:8px 'IBM Plex Mono';letter-spacing:.02em}.bc-order{display:flex;flex-direction:column;gap:1px}.bc-iconbtn{background:none;border:0;padding:2px;color:#9299a3;display:grid;place-items:center}.bc-iconbtn:hover{color:var(--pink)}.bc-iconbtn svg{width:12px;height:12px}.bc-add{margin-top:7px;width:100%;background:transparent;border:1px dashed #aab0b8;border-radius:4px;padding:8px;color:#46566d;font-size:10px;display:flex;align-items:center;justify-content:center;gap:7px}.bc-add svg{width:13px;height:13px}.bc-source-note{font-size:9px;line-height:1.5;color:#7c8491;margin:9px 3px 0}
.bc-editor{border:1px solid var(--line);background:var(--card);border-radius:5px;overflow:hidden}.bc-editor-head{padding:11px 13px;border-bottom:1px solid #e7e5de;display:flex;justify-content:space-between;align-items:center}.bc-editor-head b{font-size:11px;color:#253b5a}.bc-editor-head span{font:8px 'IBM Plex Mono';color:#778091;background:#f0f0ed;padding:4px 6px}.bc-editor-body{padding:12px 13px}.bc-field{margin-bottom:11px}.bc-field label{display:block;font:9px 'IBM Plex Mono';letter-spacing:.07em;text-transform:uppercase;color:#647084;margin-bottom:5px}.bc-field input,.bc-field textarea,.bc-field select{width:100%;border:1px solid #d9d9d3;background:#fff;border-radius:3px;padding:8px 9px;font-size:11px;color:#263a57;outline:none}.bc-field textarea{resize:vertical;min-height:57px;line-height:1.45}.bc-field input:focus,.bc-field textarea:focus,.bc-field select:focus{border-color:#c64972;box-shadow:0 0 0 2px #f7e0e8}.bc-smallhelp{font-size:9px;color:#89909a;line-height:1.45;margin-top:5px}.bc-inline{display:grid;grid-template-columns:1fr 1fr;gap:8px}.bc-subhead{font:9px 'IBM Plex Mono';text-transform:uppercase;letter-spacing:.12em;color:#687487;border-top:1px solid #e7e5de;padding-top:10px;margin:12px 0 8px}
.bc-switchrow{display:flex;gap:5px;background:#eeefeb;padding:3px;border-radius:4px;margin-bottom:10px}.bc-switchrow button{flex:1;border:0;border-radius:3px;background:transparent;padding:7px 5px;font-size:9px;color:#647084}.bc-switchrow button.on{background:#fffefa;color:var(--navy);box-shadow:0 1px 3px #11223b1c;font-weight:700}.bc-records{display:flex;flex-direction:column;gap:5px}.bc-record{display:grid;grid-template-columns:30px 1fr auto;gap:8px;align-items:center;background:#f3f2ee;border:1px solid #e3e1da;padding:5px 7px;border-radius:3px}.bc-thumb{height:27px;width:30px;object-fit:cover;background:#d6dbe0}.bc-record strong{display:block;font-size:9px;color:#2c405e}.bc-record code{font:8px 'IBM Plex Mono';color:#9297a0}.bc-record a{font-size:8px;color:#b63d68;text-decoration:none;border-bottom:1px solid #e7b6c7}.bc-record-actions{display:flex;align-items:center;gap:5px}.bc-count{font:9px 'IBM Plex Mono';color:#627087}
.bc-preview{background:#dfe4ec;border-left:1px solid #cbd1da;padding:18px 14px;min-width:0}.bc-previewbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.bc-previewbar h2{font:10px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:#4b5a70;margin:0}.bc-preview-live{font:8px 'IBM Plex Mono';text-transform:uppercase;letter-spacing:.08em;color:#467461;display:flex;align-items:center;gap:5px}.bc-preview-live:before{content:'';width:6px;height:6px;border-radius:50%;background:#4f9278}.bc-viewport{background:#fffefa;box-shadow:0 7px 24px #182d4a20;border:1px solid #cbd1d9;overflow:hidden}.bc-minihead{height:28px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-bottom:1px solid #e7e7e3;font-size:6px;font-weight:700;letter-spacing:.08em;color:#102957}.bc-minihead em{font-style:normal;color:#df3d75}.bc-hero{padding:16px 12px 10px;background:#f9f8f4}.bc-kicker{font:6px 'IBM Plex Mono';letter-spacing:.15em;color:#df3d75;text-transform:uppercase}.bc-hero h3{font-size:20px;line-height:.98;letter-spacing:-.07em;color:#102957;margin:8px 0 7px}.bc-hero p{font-size:7px;line-height:1.45;color:#53627a;margin:0 0 10px;max-width:200px}.bc-cta{display:inline-flex;padding:6px 8px;background:#102957;color:white;font-size:6px;letter-spacing:.06em}.bc-visual{height:77px;position:relative;overflow:hidden}.bc-visual img{width:100%;height:100%;object-fit:cover;object-position:center 45%}.bc-film-tag{position:absolute;bottom:6px;left:7px;background:#102957db;color:white;padding:4px 6px;font:6px 'IBM Plex Mono';display:flex;gap:4px;align-items:center}.bc-proof{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #cad0d9;border-bottom:1px solid #cad0d9}.bc-proof span{padding:6px 7px;font-size:6px;line-height:1.35;font-weight:600;border-bottom:1px solid #d7dce3}.bc-proof span:nth-child(odd){border-right:1px solid #d7dce3}.bc-mini-section{padding:11px 9px}.bc-mini-section h4{font-size:12px;line-height:1.05;letter-spacing:-.05em;color:#102957;margin:4px 0 8px}.bc-service-list{display:flex;gap:4px}.bc-service-list span{flex:1;padding:6px 4px;background:#f0f1f3;font-size:6px;line-height:1.3;color:#233b5c}.bc-industry-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}.bc-industry{height:49px;position:relative;overflow:hidden;background:#243954}.bc-industry img{height:100%;width:100%;object-fit:cover;opacity:.8}.bc-industry b{position:absolute;left:5px;bottom:5px;color:white;font-size:6px}.bc-close{background:#102957;color:white;padding:12px 9px}.bc-close label{font:6px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:#d5ddeb}.bc-close h4{font-size:18px;line-height:.96;letter-spacing:-.07em;margin:6px 0 9px;max-width:160px}.bc-source-list{margin-top:11px;border:1px solid #c9d1dd;background:#e8ebef;padding:9px}.bc-source-list h3{font:8px 'IBM Plex Mono';text-transform:uppercase;letter-spacing:.1em;color:#566479;margin:0 0 6px}.bc-source-list p{font-size:8px;line-height:1.5;color:#69778a;margin:0}.bc-checked{display:flex;gap:6px;align-items:center;font-size:8px;color:#437563;margin-top:8px}.bc-checked svg{width:11px;height:11px}
.bc-checks{border:1px solid var(--line);background:#fffefa;margin-top:14px;border-radius:4px;overflow:hidden}.bc-check-head{padding:10px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e6e5df}.bc-check-head h2{font:10px 'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:#485a72;margin:0}.bc-check-head span{font:9px 'IBM Plex Mono';color:#a95746}.bc-check-group{padding:9px 12px;border-bottom:1px solid #efeee9}.bc-check-group:last-child{border-bottom:0}.bc-check-group h3{font-size:9px;color:#435572;margin:0 0 6px}.bc-issue{display:grid;grid-template-columns:13px 1fr auto;gap:6px;align-items:start;margin-top:5px;font-size:9px;color:#5d6777}.bc-issue svg{width:12px;height:12px;color:#c8793c;margin-top:1px}.bc-issue code{font:8px 'IBM Plex Mono';color:#9a6570;white-space:nowrap}.bc-remedy{grid-column:2/4;font-size:8px;color:#a94868;margin-top:-3px}
.bc-footer{position:fixed;bottom:0;left:207px;right:306px;z-index:8;background:#fffefa;border-top:1px solid #d5d4ce;display:flex;justify-content:space-between;align-items:center;padding:10px 22px;box-shadow:0 -5px 18px #1325430a}.bc-footer-note{font-size:9px;color:#788191}.bc-footer-actions{display:flex;gap:7px}.bc-btn{border-radius:3px;padding:8px 11px;font-size:9px;display:inline-flex;align-items:center;gap:6px}.bc-btn svg{width:12px;height:12px}.bc-btn.outline{border:1px solid #cdd0d4;color:#536176;background:#fff}.bc-btn.draft{background:var(--navy);color:#fff;border:1px solid var(--navy)}.bc-btn.review{border:1px solid #c86d8a;color:#963a5b;background:#fff8fa}.bc-btn.release{background:#397865;color:white;border:1px solid #397865}.bc-toast{position:fixed;right:18px;bottom:70px;z-index:20;background:#112b52;color:#fff;padding:10px 14px;border-radius:3px;font-size:10px;box-shadow:0 5px 20px #16243c35}
.bc-modalback{position:fixed;inset:0;background:#10213e65;z-index:30;display:grid;place-items:center;padding:16px}.bc-modal{background:#fffefa;width:min(380px,100%);padding:20px;border-top:3px solid var(--pink);box-shadow:0 14px 45px #10213e35}.bc-modal h3{font-size:17px;letter-spacing:-.04em;color:var(--navy);margin:0 0 7px}.bc-modal p{font-size:11px;line-height:1.55;color:#677387;margin:0 0 14px}.bc-modalfoot{display:flex;justify-content:flex-end;gap:7px}
@media(max-width:1050px){.bc-layout{grid-template-columns:174px minmax(320px,1fr)}.bc-preview{grid-column:2;border-left:0;border-top:1px solid #cbd1da;display:grid;grid-template-columns:minmax(220px,1fr) minmax(180px,.7fr);gap:14px;align-items:start}.bc-previewbar{grid-column:1/-1;margin-bottom:-5px}.bc-source-list{margin-top:0}.bc-footer{right:0}.bc-layout{padding-bottom:0}}
@media(max-width:700px){.bc-top{padding:0 11px;height:54px}.bc-crumb,.bc-edition,.bc-topright .bc-status{display:none}.bc-layout{display:block;min-height:calc(100dvh - 54px)}.bc-rail{display:none}.bc-main{padding:17px 12px 140px}.bc-heading h1{font-size:24px}.bc-heading{display:block}.bc-utility{margin-top:12px}.bc-compose{grid-template-columns:1fr}.bc-preview{display:block;padding:14px 12px}.bc-viewport{max-width:420px;margin:auto}.bc-source-list{margin-top:10px}.bc-footer{left:0;right:0;padding:9px 10px;align-items:flex-start;flex-direction:column;gap:7px}.bc-footer-note{font-size:8px}.bc-footer-actions{width:100%;display:grid;grid-template-columns:1fr 1fr}.bc-btn{justify-content:center;padding:8px 5px;font-size:8px}.bc-inline{grid-template-columns:1fr}.bc-issue code{white-space:normal}}
`;

export function BlockComposer() {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [selected, setSelected] = useState("industries");
  const [mode, setMode] = useState<"manual" | "automatic">("manual");
  const [heading, setHeading] = useState("Built on expertise.");
  const [count, setCount] = useState("6");
  const [industryOrder, setIndustryOrder] = useState(industryCards);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<"media" | "review" | "release" | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [addedProof, setAddedProof] = useState(false);

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };
  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
    announce(`${next[target].name} moved in the proposed composition.`);
  };
  const moveIndustry = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= industryOrder.length) return;
    const next = [...industryOrder];
    [next[index], next[target]] = [next[target], next[index]];
    setIndustryOrder(next);
    announce(`${next[target].name} moved locally in this collection.`);
  };
  const addSupportedBlock = (type: "proof" | "media") => {
    if (type === "proof" && !blocks.some((block) => block.id === "proof")) {
      const insertAt = Math.max(1, blocks.findIndex((block) => block.id === "services"));
      const next = [...blocks];
      next.splice(insertAt, 0, { id: "proof", name: "Proof points", sub: "Four buyer commitments", tag: "Homepage content", source: "Named slots · four proof statements" });
      setBlocks(next);
      setAddedProof(true);
      setSelected("proof");
      announce("Proof points added locally to this composition.");
    }
    if (type === "media") setModal("media");
    setShowLibrary(false);
  };
  const selectedBlock = blocks.find((block) => block.id === selected);

  return (
    <div className="bc">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');${css}.bc .bc-footer-note{display:none}.bc .bc-footer .bc-btn{padding:7px 7px;font-size:8px;white-space:nowrap}`}</style>
      <header className="bc-top">
        <div className="bc-brand"><div className="bc-mark">CR</div><span className="bc-brandname">cognirise</span><div className="bc-divider" /><span className="bc-crumb">Pulse website <span style={{ color: "#a4a9b0" }}> / </span> Page studio</span></div>
        <div className="bc-edition"><span className="mono">EDITION</span><strong>UAE · English</strong><ChevronDown size={12} /></div>
        <div className="bc-topright"><span className="bc-status">Draft · not public</span><div className="bc-avatar">SR</div></div>
      </header>
      <div className="bc-layout">
        <aside className="bc-rail">
          <div className="bc-rail-title">Workspace</div>
          <div className="bc-nav"><Layers3 /> Content overview</div>
          <div className="bc-nav active"><ClipboardList /> Homepage composition</div>
          <div className="bc-nav"><FileText /> Page content</div>
          <div className="bc-nav"><ShieldCheck /> Reviews & releases</div>
          <div className="bc-rail-foot"><b>Governed page</b><br />Layout is code-owned. Editors can assemble supported blocks and edit named content slots.</div>
        </aside>

        <main className="bc-main">
          <div className="bc-heading">
            <div><div className="bc-eyebrow">Homepage / UAE English edition</div><h1>Compose the buyer-facing page</h1><p>Arrange supported content blocks. Preview reflects saved draft content only.</p></div>
            <div className="bc-utility"><button className="bc-quiet" onClick={() => announce("Buyer preview shown at right · local prototype.")}><Clapperboard /> Buyer preview</button><button className="bc-quiet" onClick={() => announce("No persistence in this exploration prototype.")}><Save /> Save draft</button></div>
          </div>
          <div className="bc-banner"><CircleAlert /><span><strong>Example media blocker</strong> · Required media is unavailable for this edition. Replace only if authorized, or request media review. Nothing is approved automatically.</span><button className="bc-iconbtn" aria-label="View media remedy" onClick={() => setModal("media")}><ChevronDown /></button></div>
          <div className="bc-compose">
            <section>
              <div className="bc-labelrow"><h2>Page composition</h2><span>5 supported blocks</span></div>
              <div className="bc-stack">
                {blocks.map((block, index) => <div key={block.id} className={`bc-block ${selected === block.id ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => setSelected(block.id)} onKeyDown={(event) => event.key === "Enter" && setSelected(block.id)} data-testid={`block-select-${block.id}`}>
                  <div className="bc-grip"><GripVertical /></div><div><div className="bc-block-title">{block.name}</div><div className="bc-block-sub">{block.sub}</div><span className="bc-chip">{block.tag}</span></div>
                  <div className="bc-order"><button className="bc-iconbtn" aria-label={`Move ${block.name} up`} onClick={(event) => { event.stopPropagation(); moveBlock(index, -1); }}><ArrowUp /></button><button className="bc-iconbtn" aria-label={`Move ${block.name} down`} onClick={(event) => { event.stopPropagation(); moveBlock(index, 1); }}><ArrowDown /></button></div>
                </div>)}
                <button className="bc-add" onClick={() => setShowLibrary(!showLibrary)}><Plus /> Add supported block <ChevronDown /></button>
                {showLibrary && <div style={{ background: "#fffefa", border: "1px solid #d8d7d0", padding: 8, marginTop: 6, borderRadius: 4 }}>
                  <button className="bc-add" style={{ margin: 0, border: 0, justifyContent: "flex-start" }} onClick={() => addSupportedBlock("proof")}><Sparkles /> Proof points <span style={{ color: "#8a909b", marginLeft: "auto" }}>Named homepage slots</span></button>
                  <button className="bc-add" style={{ margin: "3px 0 0", border: 0, justifyContent: "flex-start" }} onClick={() => addSupportedBlock("media")}><Film /> Hero film <span style={{ color: "#8a909b", marginLeft: "auto" }}>Request / replace media</span></button>
                </div>}
              </div>
              <p className="bc-source-note"><b>Not a freeform page builder.</b> Arbitrary layout or new block types need schema + renderer work. Industry cards remain governed records.</p>
            </section>
            <section className="bc-editor">
              <div className="bc-editor-head"><b>{selectedBlock?.name ?? "Block properties"}</b><span>SUPPORTED BLOCK</span></div>
              <div className="bc-editor-body">
                {selected === "industries" ? <>
                  <div className="bc-field"><label htmlFor="industries-heading">Section heading · homepage content</label><input id="industries-heading" value={heading} onChange={(event) => setHeading(event.target.value)} data-testid="input-industries-heading" /><div className="bc-smallhelp">Editor-owned heading; does not alter the page layout.</div></div>
                  <div className="bc-subhead">Card selection</div>
                  <div className="bc-switchrow"><button className={mode === "manual" ? "on" : ""} onClick={() => setMode("manual")}>Manual selection</button><button className={mode === "automatic" ? "on" : ""} onClick={() => setMode("automatic")}>Automatic selection</button></div>
                  <div className="bc-inline">
                    {mode === "manual" ? <div className="bc-field"><label>Chosen records</label><div className="bc-smallhelp">Reorder is local to this prototype. Each card links to its source record.</div></div> : <div className="bc-field"><label htmlFor="industry-count">Selection count</label><select id="industry-count" value={count} onChange={(event) => setCount(event.target.value)}><option value="3">3 industries</option><option value="4">4 industries</option><option value="6">6 industries</option></select><div className="bc-smallhelp">Automatically selects published Industry records.</div></div>}
                    {mode === "manual" && <div className="bc-field"><label>Visible count</label><select value={count} onChange={(event) => setCount(event.target.value)}><option value="3">3 industries</option><option value="4">4 industries</option><option value="6">6 industries</option></select></div>}
                  </div>
                  <div className="bc-records">{industryOrder.slice(0, Number(count)).map((industry, index) => <div className="bc-record" key={industry.slug}>
                    <img className="bc-thumb" src={industry.image} alt="" /><div><strong>{industry.name}</strong><code>industry / {industry.slug}</code></div>
                    <div className="bc-record-actions"><button className="bc-iconbtn" aria-label={`Move ${industry.name} up`} onClick={() => moveIndustry(index, -1)}><ArrowUp /></button><button className="bc-iconbtn" aria-label={`Move ${industry.name} down`} onClick={() => moveIndustry(index, 1)}><ArrowDown /></button><a href="#industry-record" onClick={(event) => { event.preventDefault(); announce(`Source record opened: ${industry.slug} · prototype.`); }}>Open record</a></div>
                  </div>)}</div>
                  <div className="bc-smallhelp" style={{ marginTop: 8 }}><Link2 size={10} style={{ verticalAlign: "middle", marginRight: 4 }} />Titles and images are owned by each Industry record, not duplicated here.</div>
                </> : selected === "hero" ? <>
                  <div className="bc-field"><label>Hero eyebrow · named slot</label><input defaultValue="Cognirise Pulse" /></div>
                  <div className="bc-field"><label>Hero heading · named slot</label><textarea defaultValue="Make AI work matter." /></div>
                  <div className="bc-field"><label>Supporting copy · named slot</label><textarea defaultValue="We turn AI potential into measurable business impact—with strategy, engineering and platform." /></div>
                  <div className="bc-subhead">Presentation source</div><div className="bc-smallhelp"><Settings2 size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />Hero layout and film placement are code-owned. Film asset is sourced from Site Configuration.</div>
                </> : selected === "services" ? <>
                  <div className="bc-field"><label>Section heading · homepage content</label><input defaultValue="We combine strategy, engineering and platform." /></div>
                  <div className="bc-subhead">Service tile source</div><div className="bc-records">{["Strategy & operating model", "Forward-deployed engineering", "CogniOS platform"].map((item) => <div className="bc-record" key={item}><div className="bc-thumb" /><div><strong>{item}</strong><code>service-line record</code></div><a href="#service-record" onClick={(event) => { event.preventDefault(); announce("Service-line source record · prototype."); }}>Open</a></div>)}</div>
                  <div className="bc-smallhelp">Tiles are rendered from service-line data; edit the reusable records to change their content.</div>
                </> : selected === "proof" ? <>
                  <div className="bc-field"><label>Proof point · named slot</label><input defaultValue="No long pilots. Prototype in 48 hours." /></div>
                  <div className="bc-field"><label>Proof point · named slot</label><input defaultValue="We deliver outcomes, not mandays." /></div>
                  <div className="bc-smallhelp">{addedProof ? "Added locally to this composition. Changes are not saved." : "Editor-owned copy slots; presentation remains code-owned."}</div>
                </> : <>
                  <div className="bc-field"><label>Closing heading · named slot</label><input defaultValue="Ready for a change?" /></div><div className="bc-field"><label>Action label</label><input defaultValue="Start a conversation" /></div><div className="bc-smallhelp">Closing layout and destination behavior remain governed by the renderer.</div>
                </>}
              </div>
            </section>
          </div>
          <section className="bc-checks">
            <div className="bc-check-head"><h2>Edition checks · UAE / English</h2><span>1 blocker · review is independent</span></div>
            <div className="bc-check-group"><h3>Hero / media</h3><div className="bc-issue"><CircleAlert /><span>Hero film asset is missing for this edition</span><code>siteConfiguration.heroFilm</code><div className="bc-remedy">Replace media if authorized, or request media review. No automatic approval.</div></div></div>
            <div className="bc-check-group"><h3>Industries / source records</h3><div className="bc-issue"><CircleCheck /><span>{count} published Industry records selected</span><code>content.industrySelection</code></div></div>
            <div className="bc-check-group"><h3>Workflow / release scope</h3><div className="bc-issue"><CircleCheck /><span>Draft is separate from reviewer approval and edition publication</span><code>edition.UAE.en</code></div></div>
          </section>
        </main>

        <aside className="bc-preview">
          <div className="bc-previewbar"><h2>Buyer view · saved draft</h2><span className="bc-preview-live">Local preview</span></div>
          <div className="bc-viewport">
            <div className="bc-minihead"><span>COGNIRISE <em>PULSE</em></span><span>WORK · THINK · DO</span></div>
            <div className="bc-hero"><div className="bc-kicker">Strategy · Engineering · Platform</div><h3>Make AI work matter.</h3><p>Turn AI potential into measurable business impact—with the people and platform to make it real.</p><span className="bc-cta">START A CONVERSATION</span></div>
            <div className="bc-visual"><img src="/__mockup/images/cognirise/pulse-hero.jpg" alt="Cognirise Pulse homepage visual" /><span className="bc-film-tag"><Film size={8} /> HERO FILM · SITE CONFIGURATION</span></div>
            <div className="bc-proof"><span>No long pilots. Prototype in 48 hours.</span><span>We deliver outcomes, not mandays.</span><span>Working solutions, not PowerPoints.</span><span>You own the platform.</span></div>
            <div className="bc-mini-section"><div className="bc-kicker">WHAT WE DO</div><h4>We combine strategy, engineering and platform.</h4><div className="bc-service-list"><span>Strategy & operating model</span><span>Forward-deployed engineering</span><span>CogniOS platform</span></div></div>
            <div className="bc-mini-section" style={{ paddingTop: 2 }}><div className="bc-kicker">INDUSTRIES</div><h4>{heading}</h4><div className="bc-industry-grid">{industryOrder.slice(0, Number(count)).map((industry) => <div className="bc-industry" key={industry.slug}><img src={industry.image} alt="" /><b>{industry.name}</b></div>)}</div></div>
            <div className="bc-close"><label>Start</label><h4>Ready for a change?</h4><span className="bc-cta" style={{ background: "#df3d75" }}>LET'S TALK</span></div>
          </div>
          <div className="bc-source-list"><h3>What is owned where</h3><p>Hero copy & named slots: homepage content<br />Hero film: Site Configuration<br />Service tiles: service-line data<br />Industry cards: published Industry records</p><div className="bc-checked"><Check /> Page layout and block rendering are code-owned</div></div>
        </aside>
      </div>
      <footer className="bc-footer">
        <span className="bc-footer-note">Draft edits are local to this exploration; no persistence or approval is implied.</span>
        <div className="bc-footer-actions">
          <button className="bc-btn outline" onClick={() => announce("Draft preview is a local prototype.")}>Preview saved draft</button>
          <button className="bc-btn draft" onClick={() => announce("Draft changes staged locally · not persisted.")}><Save /> Save draft</button>
          <button className="bc-btn review" onClick={() => setModal("review")}><Send /> Request independent review</button>
          <button className="bc-btn release" onClick={() => setModal("release")}><ShieldCheck /> Release Center</button>
        </div>
      </footer>
      {toast && <div className="bc-toast" role="status">{toast}</div>}
      {modal && <div className="bc-modalback" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><div className="bc-modal">
        <button className="bc-iconbtn" style={{ float: "right" }} aria-label="Close dialog" onClick={() => setModal(null)}><X /></button>
        {modal === "media" ? <><div className="bc-eyebrow">Media governance</div><h3>Hero film needs a governed remedy</h3><p>The UAE English edition has no approved hero film. If you are authorized, replace it with an approved asset from Site Configuration. Otherwise request media review. This editor cannot approve media or bypass review.</p><div className="bc-modalfoot"><button className="bc-btn outline" onClick={() => { setModal(null); announce("Media review request prepared locally."); }}>Request media review</button><button className="bc-btn draft" onClick={() => { setModal(null); announce("No asset replaced · use Site Configuration when authorized."); }}>Open Site Configuration</button></div></> : modal === "review" ? <><div className="bc-eyebrow">Independent review</div><h3>Send this exact edition for review?</h3><p>Reviewer approval is a separate workflow step. This request does not publish the UAE English edition, and the missing film remains a blocker.</p><div className="bc-modalfoot"><button className="bc-btn outline" onClick={() => setModal(null)}>Keep editing</button><button className="bc-btn review" onClick={() => { setModal(null); announce("Review request shown for exploration only · no workflow action occurred."); }}>Continue to review request</button></div></> : <><div className="bc-eyebrow">Scoped publication</div><h3>Release Center · UAE / English</h3><p>Edition publication and scoped Release Center publication are distinct. Release Center controls destination scope; nothing is published from this prototype. Reviewer approval and all required checks must be complete first.</p><div className="bc-modalfoot"><button className="bc-btn outline" onClick={() => setModal(null)}>Close</button><button className="bc-btn release" onClick={() => { setModal(null); announce("Release Center scope view · no publication occurred."); }}>Review release scope</button></div></>}
      </div></div>}
    </div>
  );
}