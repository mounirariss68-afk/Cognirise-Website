import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

const assets = [
  {
    number: "01",
    name: "Innovate", file: "cognirise-pulse-stage-01-innovate.png", note: "Spot the value",
    timing: "1 day", quote: "Don’t boil the ocean.",
    description: "Frame the highest-value opportunity and decision boundary.",
    outcome: "A prioritised opportunity and a clear decision boundary.",
    position: "center 52%",
  },
  {
    number: "02",
    name: "Demonstrate", file: "cognirise-pulse-stage-02-demonstrate.png", note: "Prototype",
    timing: "48 hours", quote: "See it before you buy it.",
    description: "Give stakeholders a tangible proof they can test and decide on.",
    outcome: "A working proof stakeholders can test, challenge and decide on.",
    position: "center 50%",
  },
  {
    number: "03",
    name: "Activate", file: "cognirise-pulse-stage-03-activate.png", note: "Build the solution",
    timing: "2–4 weeks (MVP)", quote: "Human judgement. Agent scale.",
    description: "Build a governed MVP through accountable human judgment and agents.",
    outcome: "A usable MVP with the engineering and controls needed to operate.",
    position: "center 54%",
  },
  {
    number: "04",
    name: "Operate", file: "cognirise-pulse-stage-04-operate.png", note: "Scale & operationalize",
    timing: "4–12 weeks", quote: "No lock-in. Full ownership.",
    description: "Harden, transfer knowledge, and leave the capability in the client environment.",
    outcome: "A client-owned capability, operating model and scale plan.",
    position: "center 51%",
  },
] as const;

const base = `${String(import.meta.env.BASE_URL || "/").replace(/\/?$/, "/")}images/cognirise-pulse-modular/`;

function AssetImage({
  src,
  alt,
  className,
  style,
  dataSelected,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  dataSelected?: boolean;
}) {
  return (
    <img
      className={className}
      style={style}
      data-selected={dataSelected}
      src={`${base}${src}`}
      alt={alt}
      draggable={false}
    />
  );
}

export function ModularDrawings() {
  const [selected, setSelected] = useState(1);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = assets[selected];
  const choose = (index: number) => setSelected((index + assets.length) % assets.length);
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = (index + 1) % assets.length;
      choose(next); tabRefs.current[next]?.focus();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = (index - 1 + assets.length) % assets.length;
      choose(next); tabRefs.current[next]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      choose(1); tabRefs.current[1]?.focus();
    }
  };
  return (
    <main className="pulse-review">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap');
        .pulse-review {
          --ink: #17213d; --muted: #6e7890; --line: #d9dce5; --paper: #f5f3ed;
          --violet: #7952bb; --coral: #ef9288; --cream: #fcf8ef;
          min-height: 100dvh; box-sizing: border-box; overflow: hidden; color: var(--ink);
          background: var(--paper); font-family: Manrope, sans-serif; padding: 32px 4.7vw 62px;
          background-image: radial-gradient(circle at 86% 0%, rgba(239,146,136,.16), transparent 29rem), radial-gradient(circle at 5% 58%, rgba(121,82,187,.10), transparent 30rem);
        }
        .pulse-review * { box-sizing: border-box; }
        .pulse-review img { user-select: none; }
        .pulse-topline { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding-bottom:18px; animation: rise .75s .04s both; }
        .brand { display:flex; align-items:center; gap:11px; font-weight:700; letter-spacing:-.05em; font-size:18px; }
        .brand-mark { width:22px; height:22px; border:2px solid var(--ink); border-radius:50%; position:relative; }
        .brand-mark:after { content:""; width:7px; height:7px; background:var(--coral); border-radius:50%; position:absolute; right:-4px; top:-3px; }
        .eyebrow, .meta { font-family:"DM Mono", monospace; text-transform:uppercase; letter-spacing:.11em; font-size:10px; color:var(--muted); }
        .top-meta { display:flex; gap:26px; align-items:center; }
        .top-meta strong { color:var(--ink); font-weight:500; }
        .hero-copy { display:grid; grid-template-columns: 1fr auto; align-items:end; gap:28px; padding:43px 0 28px; animation:rise .8s .12s both; }
        h1 { font-family:"Playfair Display", serif; font-size:clamp(39px,5.1vw,70px); line-height:.95; letter-spacing:-.055em; font-weight:500; max-width:820px; margin:9px 0 0; }
        h1 em { color:var(--violet); font-weight:500; }
        .intro { max-width:290px; font-size:12px; line-height:1.7; color:#536078; margin-bottom:3px; }
        .intro b { color:var(--ink); font-weight:700; }
        .stage { background:rgba(252,248,239,.74); border:1px solid rgba(23,33,61,.13); box-shadow:0 18px 60px rgba(42,40,72,.08); padding:16px; animation:rise .9s .2s both; }
         .stage-bar { display:flex; justify-content:space-between; align-items:center; padding:1px 3px 14px; }
         .stage-tabs { display:flex; gap:4px; padding:0 0 12px; overflow-x:auto; }
         .stage-tab { appearance:none; border:0; border-bottom:2px solid transparent; background:transparent; color:var(--muted); cursor:pointer; padding:8px 12px 7px; font:500 10px "DM Mono",monospace; letter-spacing:.08em; text-transform:uppercase; white-space:nowrap; transition:color .25s ease,border-color .25s ease,background .25s ease; }
         .stage-tab:hover, .stage-tab:focus-visible { color:var(--ink); background:rgba(121,82,187,.07); outline:none; }
         .stage-tab[aria-selected="true"] { color:var(--violet); border-color:var(--violet); background:rgba(121,82,187,.08); }
         .stage-tab[data-pivotal="true"] { border-image:linear-gradient(90deg,#7952bb,#db509e) 1; }
        .stage-bar span:last-child { color:var(--violet); }
         .panorama { width:100%; aspect-ratio:4096 / 1400; position:relative; overflow:hidden; background:linear-gradient(115deg,#f8f1e4 0%,#fffdf7 49%,#f4eee9 100%); }
        .panorama:before, .panorama:after { content:""; position:absolute; z-index:1; pointer-events:none; }
        .panorama:before { inset:0; background:linear-gradient(90deg,rgba(252,248,239,.55),transparent 16%,transparent 84%,rgba(252,248,239,.55)); }
        .panorama:after { left:0; right:0; bottom:0; height:32%; background:linear-gradient(transparent,rgba(220,205,207,.20)); }
         .spine { position:absolute; z-index:2; width:108%; height:auto; left:-4%; top:36%; opacity:.38; mix-blend-mode:multiply; }
         .assembly-strip { position:absolute; inset:0; z-index:4; display:flex; align-items:stretch; }
         .scene { position:relative; height:100%; object-fit:fill; filter:drop-shadow(0 15px 16px rgba(36,33,59,.12)); transition:filter .35s ease, opacity .35s ease; }
         .scene[data-selected="true"] { filter:drop-shadow(0 18px 20px rgba(121,82,187,.24)) saturate(1.06); }
         .scene[data-selected="false"] { opacity:.86; }
         .scene.one { width:30.078125%; } .scene.two { width:19.7265625%; }
         .scene.three { width:24.4140625%; } .scene.four { width:25.78125%; }
         .stage-zones { position:absolute; inset:0; z-index:5; display:grid; grid-template-columns:30.078125fr 19.7265625fr 24.4140625fr 25.78125fr; }
         .stage-zone { cursor:pointer; transition:background .25s ease; }
         .stage-zone:hover { background:rgba(255,255,255,.08); }
         .stage-zone[data-selected="true"] { background:rgba(121,82,187,.025); }
        .stage-caption { display:flex; justify-content:space-between; gap:20px; padding:14px 3px 0; font-size:11px; color:var(--muted); }
        .stage-caption b { color:var(--ink); font-weight:600; }
        .asset-head { display:flex; justify-content:space-between; align-items:end; margin:56px 0 17px; animation:rise .85s .33s both; }
        h2 { margin:6px 0 0; font:500 clamp(25px,2.5vw,36px)/1 "Playfair Display",serif; letter-spacing:-.045em; }
        .asset-grid { display:grid; grid-template-columns:repeat(5,1fr); border-top:1px solid var(--line); border-left:1px solid var(--line); animation:rise .9s .42s both; }
        .asset-card { min-width:0; padding:13px; border-right:1px solid var(--line); border-bottom:1px solid var(--line); background:rgba(252,248,239,.46); transition:background .35s ease, transform .35s ease; }
        .asset-card:hover { background:#fffaf2; transform:translateY(-5px); }
        .asset-info { display:flex; justify-content:space-between; align-items:baseline; gap:8px; min-height:30px; }
        .asset-title { font-size:11px; font-weight:700; letter-spacing:-.025em; }
        .tile { height:clamp(140px,16vw,228px); margin:12px 0 13px; overflow:hidden; position:relative; background-color:#fcfbf7; background-image:linear-gradient(45deg,#e4e4e3 25%,transparent 25%),linear-gradient(-45deg,#e4e4e3 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e4e4e3 75%),linear-gradient(-45deg,transparent 75%,#e4e4e3 75%); background-size:16px 16px; background-position:0 0,0 8px,8px -8px,-8px 0; }
        .tile img { width:100%; height:100%; object-fit:contain; position:relative; z-index:1; transition:transform .55s cubic-bezier(.2,.8,.2,1); }
        .asset-card:hover .tile img { transform:scale(1.06); }
        .asset-footer { display:flex; justify-content:space-between; gap:5px; align-items:center; font:9px "DM Mono",monospace; letter-spacing:.04em; color:var(--muted); }
        .spine-card .tile { background-size:14px 14px; }
        .spine-card .tile img { width:133%; max-width:none; margin-left:-16.5%; object-fit:cover; }
        .spine-card { background:rgba(121,82,187,.045); }
         .rule { height:4px; width:34px; margin-top:10px; background:linear-gradient(90deg,var(--violet),var(--coral)); }
         .detail-panel { display:grid; grid-template-columns:minmax(170px,.65fr) 1fr; gap:25px; align-items:start; min-height:82px; padding:16px 4px 1px; animation:detail-in .3s both; }
         .detail-kicker { color:var(--violet); font:500 10px "DM Mono",monospace; text-transform:uppercase; letter-spacing:.1em; }
         .detail-quote { margin:4px 0 0; font:500 clamp(18px,2vw,25px)/1.1 "Playfair Display",serif; letter-spacing:-.03em; }
         .detail-copy { margin:0; color:#536078; font-size:11px; line-height:1.55; max-width:600px; }
         .detail-copy strong { color:var(--ink); font-weight:700; }
         @keyframes detail-in { from { opacity:0; transform:translateY(5px) } to { opacity:1; transform:translateY(0) } }
         @media (prefers-reduced-motion: reduce) { .pulse-review *, .pulse-review *::before, .pulse-review *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; } }
        @keyframes rise { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @media(max-width:760px) {
          .pulse-review { padding:22px 18px 42px; } .top-meta span:first-child { display:none; } .hero-copy { grid-template-columns:1fr; padding:34px 0 23px; } .intro { max-width:390px; }
          .stage { padding:10px; } .panorama { min-height:260px; }
          .asset-head { margin-top:42px; } .asset-grid { grid-template-columns:repeat(2,1fr); } .asset-card:last-child { grid-column:span 2; } .tile { height:190px; }
        }
      `}</style>

      <header className="pulse-topline">
        <div className="brand"><span className="brand-mark" />Cognirise Pulse</div>
        <div className="top-meta meta"><span>Brand system / Visual library</span><strong>Asset review 01—05</strong></div>
      </header>

      <section className="hero-copy">
        <div>
          <p className="eyebrow">Modular drawing direction / approval surface</p>
          <h1>One delivery journey.<br /><em>Four moments of proof.</em></h1>
        </div>
        <p className="intro"><b>A visual language for governed momentum.</b> Each transparent drawing holds alone; together, they form the operating picture.</p>
      </section>

      <section className="stage" onMouseLeave={() => choose(1)}>
        <div className="stage-bar eyebrow"><span>Pulse delivery journey / spatial disclosure</span><span>Default view · 02</span></div>
        <div className="stage-tabs" role="tablist" aria-label="Pulse delivery stages">
          {assets.map((asset, index) => (
            <button
              key={asset.file}
              ref={(element) => { tabRefs.current[index] = element; }}
              className="stage-tab"
              id={`stage-tab-${asset.number}`}
              role="tab"
              aria-selected={selected === index}
              aria-controls="stage-panel"
              data-pivotal={index === 1}
              tabIndex={selected === index ? 0 : -1}
              onClick={() => choose(index)}
              onMouseEnter={() => choose(index)}
              onFocus={() => choose(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {asset.number} / {asset.name}
            </button>
          ))}
        </div>
        <div className="panorama">
          <AssetImage className="spine" src="cognirise-pulse-delivery-spine.png" alt="" />
          <div className="assembly-strip">
            {assets.map((asset, index) => (
              <AssetImage
                key={asset.file}
                className={`scene ${["one", "two", "three", "four"][index]}`}
                dataSelected={selected === index}
                src={asset.file}
                alt={`${asset.name} stage drawing`}
              />
            ))}
          </div>
          <div className="stage-zones" aria-hidden="true">
            {assets.map((asset, index) => (
              <div
                className="stage-zone"
                data-selected={selected === index}
                key={asset.file}
                onClick={() => choose(index)}
                onMouseEnter={() => choose(index)}
              />
            ))}
          </div>
        </div>
        <div className="detail-panel" id="stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${current.number}`} key={current.file}>
          <div><div className="detail-kicker">{current.number} / {current.name} · {current.timing}</div><p className="detail-quote">“{current.quote}”</p></div>
          <p className="detail-copy">{current.description}<br /><strong>Outcome:</strong> {current.outcome}</p>
        </div>
      </section>

      <section>
        <div className="asset-head">
          <div><p className="eyebrow">Reusable transparent rasters</p><h2>Individual asset inspection</h2><div className="rule" /></div>
          <p className="meta">Checker field indicates transparent pixel area</p>
        </div>
        <div className="asset-grid">
          {assets.map((asset) => (
            <article className="asset-card" key={asset.file}>
              <div className="asset-info"><span className="asset-title">{asset.name}</span><span className="meta">{asset.number}</span></div>
              <div className="tile"><AssetImage src={asset.file} alt={`${asset.name} transparent raster drawing`} style={{ objectPosition: asset.position }} /></div>
              <div className="asset-footer"><span>{asset.note}</span><span>PNG / α</span></div>
            </article>
          ))}
          <article className="asset-card spine-card">
            <div className="asset-info"><span className="asset-title">Delivery spine</span><span className="meta">05</span></div>
            <div className="tile"><AssetImage src="cognirise-pulse-delivery-spine.png" alt="Delivery spine transparent raster drawing" /></div>
            <div className="asset-footer"><span>Compositional underlay</span><span>PNG / α</span></div>
          </article>
        </div>
      </section>
    </main>
  );
}

export default ModularDrawings;