import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { assetUrl } from "@/lib/assets";
import { SERVICE_LINES } from "@/lib/serviceLines";

const SERVICE_VISUALS: Record<string, { img: string; pos: string }> = {
  "consulting-engineering": {
    img: assetUrl("/images/cognirise/cognirise-pulse-people.jpg"),
    pos: "85% 100%",
  },
  "sovereign-solutions": {
    img: assetUrl("/images/cognirise/cognirise-pulse-governance.jpg"),
    pos: "center center",
  },
  "ai-platforms": {
    img: assetUrl("/images/cognirise/site-infrastructure.jpg"),
    pos: "center center",
  },
};

export function ServiceLineTiles({ className = "" }: { className?: string }) {
  const [openService, setOpenService] = useState<number | null>(0);

  return (
    <div className={`cps-line-component ${className}`}>
      <style>{`
        .cps-line-component{--ink:#102957;--paper:#fdfcfb;--line:#cad2df;--pink:#dc509f;--coral:#ff775d;color:var(--ink);font-family:Inter,sans-serif}
        .cps-line-component *{box-sizing:border-box}
        .cps-line-component a{color:inherit;text-decoration:none}
        .cps-line-component :focus-visible{outline:3px solid var(--coral);outline-offset:4px}
        .cps-line-component h3{font-family:Comfortaa,sans-serif}
        .cps-tiles{display:flex;flex-direction:column;gap:16px}
        .cps-tile{position:relative;min-width:0;background:var(--paper);border:1px solid var(--line);overflow:hidden;display:flex;flex:1 1 0%;flex-direction:column;transition:background .85s cubic-bezier(.19,1,.22,1)}
        .cps-tile:hover:not(.active){background:#f8f9fc}
        .cps-tile:hover:not(.active) .cps-tile-visual img{transform:scale(1.03)}
        .cps-tile-left{position:relative;z-index:2;display:flex;flex-direction:column;width:100%}
        .cps-tile-btn{appearance:none;background:transparent;border:none;text-align:left;width:100%;padding:0;cursor:pointer;outline:none;color:inherit;flex-shrink:0;font:inherit}
        .cps-tile-btn:focus-visible{outline:3px solid var(--coral);outline-offset:-3px}
        .cps-tile-header{padding:24px;display:flex;flex-direction:column;gap:12px;position:relative}
        .cps-tile-no{font-size:11px;letter-spacing:.1em;color:var(--pink);font-weight:600}
        .cps-tile-header h3{font-size:clamp(22px,2.2vw,28px);line-height:1.1;font-weight:600;letter-spacing:-.04em;margin:0;max-width:100%}
        .cps-tile-copy{display:flex;flex-direction:column;flex-grow:1;position:relative}
        .cps-tile-copy-inner{display:none;padding:0 24px 32px}
        .cps-tile.active .cps-tile-copy-inner{display:flex;flex-direction:column;animation:cpsTileFadeIn .5s ease forwards}
        .cps-tile-short{font-size:14px;line-height:1.5;color:#30486d;font-weight:500;margin:0 0 24px;max-width:95%}
        .cps-tile-desc{display:flex;flex-direction:column;gap:16px;margin-bottom:28px}
        .cps-tile-desc strong,.cps-tile-dests-wrap strong{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--pink);display:block;margin-bottom:8px}
        .cps-tile-desc p{font-size:13px;line-height:1.55;color:#526886;margin:0}
        .cps-tile-dests{display:flex;flex-direction:column;gap:8px}
        .cps-tile-dest{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#fff;border:1px solid var(--line);font-size:12px;font-weight:600;color:var(--ink);transition:border-color .2s ease,color .2s ease}
        .cps-tile-dest:hover{border-color:var(--pink);color:var(--pink)}
        .cps-tile-visual{position:relative;z-index:1;height:200px;overflow:hidden;background:#f3f1f7}
        .cps-tile-visual img{display:block;position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:cover;opacity:1;visibility:visible;transition:transform .85s cubic-bezier(.19,1,.22,1),filter .85s cubic-bezier(.19,1,.22,1)}
        .cps-tile.active .cps-tile-visual img{transform:scale(1.035)}
        .cps-tile[data-service="consulting-engineering"] .cps-tile-visual img{filter:brightness(1.12) saturate(.9)}
        .cps-tile-visual:after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(0deg,rgba(8,26,58,.1),transparent 30%);pointer-events:none}
        @media (min-width:1024px){
          .cps-tiles{flex-direction:row;height:660px}
          .cps-tile{display:block;flex:0 0 auto;width:calc(18.519% - 5.926px);transition:width .85s cubic-bezier(.19,1,.22,1),background .85s cubic-bezier(.19,1,.22,1);will-change:width}
          .cps-tile.active{width:calc(62.963% - 20.148px);background:#fff}
          .cps-tiles.all-collapsed .cps-tile{width:calc(33.333% - 10.667px)}
          .cps-tile-left{position:absolute;inset:0;height:100%;transition:width .85s cubic-bezier(.19,1,.22,1)}
          .cps-tile.active .cps-tile-left{width:50%}
          .cps-tile-header{padding:32px 32px 24px;gap:14px;height:190px}
          .cps-tile.active .cps-tile-header{height:140px}
          .cps-tile-copy-inner{display:flex;position:absolute;inset:0;padding:0 32px 32px;opacity:0;visibility:hidden;transform:translateY(10px);transition:opacity .5s ease .2s,transform .5s ease .2s,visibility .5s ease .2s;min-width:340px;overflow-y:auto;animation:none!important}
          .cps-tile.active .cps-tile-copy-inner{opacity:1;visibility:visible;transform:translateY(0)}
          .cps-tile-visual{position:absolute;inset:190px 0 0;height:auto;transition:inset .85s cubic-bezier(.19,1,.22,1)}
          .cps-tile.active .cps-tile-visual{inset:0 0 0 50%}
          .cps-tile-visual:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#fff 0%,rgba(255,255,255,.95) 10%,rgba(255,255,255,.4) 25%,transparent 45%);opacity:0;transition:opacity .85s cubic-bezier(.19,1,.22,1);pointer-events:none;z-index:2}
          .cps-tile[data-service="consulting-engineering"] .cps-tile-visual:before{background:linear-gradient(90deg,#fff 0%,rgba(255,255,255,.98) 17%,rgba(255,255,255,.76) 34%,rgba(255,255,255,.26) 52%,transparent 68%)}
          .cps-tile.active .cps-tile-visual:before{opacity:1}
        }
        @keyframes cpsTileFadeIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
        @media(prefers-reduced-motion:reduce){.cps-line-component *,.cps-line-component *:before,.cps-line-component *:after{animation:none!important;transition:none!important}}
      `}</style>

      <div
        className={`cps-tiles ${openService === null ? "all-collapsed" : ""}`}
        role="tablist"
        aria-label="Service lines"
        aria-orientation="horizontal"
        onMouseLeave={(event) => {
          const focusedElement = document.activeElement;
          const hasKeyboardFocus = focusedElement instanceof HTMLElement
            && event.currentTarget.contains(focusedElement)
            && focusedElement.matches(":focus-visible");
          if (!hasKeyboardFocus) setOpenService(null);
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setOpenService(null);
          }
        }}
      >
        {SERVICE_LINES.map((service, index) => {
          const isActive = openService === index;
          const visual = SERVICE_VISUALS[service.id];

          return (
            <div
              key={service.id}
              id={service.id}
              data-service={service.id}
              className={`cps-tile ${isActive ? "active" : ""}`}
              onMouseEnter={() => setOpenService(index)}
            >
              <div className="cps-tile-left">
                <button
                  className="cps-tile-btn"
                  onClick={() => setOpenService(index)}
                  onFocus={() => setOpenService(index)}
                  onKeyDown={(event) => {
                    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const next = event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? SERVICE_LINES.length - 1
                        : (index + (event.key === "ArrowRight" ? 1 : -1) + SERVICE_LINES.length) % SERVICE_LINES.length;
                    document.getElementById(`service-tab-${next}`)?.focus();
                  }}
                  aria-expanded={isActive}
                  aria-selected={isActive}
                  aria-controls={`service-panel-${index}`}
                  id={`service-tab-${index}`}
                  tabIndex={isActive ? 0 : -1}
                  role="tab"
                >
                  <div className="cps-tile-header">
                    <span className="cps-tile-no">0{index + 1}</span>
                    <h3>{service.label}</h3>
                  </div>
                </button>
                <div className="cps-tile-copy">
                  <div
                    className="cps-tile-copy-inner"
                    id={`service-panel-${index}`}
                    role="tabpanel"
                    aria-labelledby={`service-tab-${index}`}
                    aria-hidden={!isActive}
                  >
                    <p className="cps-tile-short">{service.short}</p>
                    <div className="cps-tile-desc">
                      <div>
                        <strong>How we help</strong>
                        <p>{service.description}</p>
                      </div>
                      <div>
                        <strong>The difference</strong>
                        <p>{service.value}</p>
                      </div>
                    </div>
                    <div className="cps-tile-dests-wrap">
                      <strong>Supporting destinations</strong>
                      <div className="cps-tile-dests">
                        {service.destinations.map(([label, url]) => (
                          <Link href={url} key={label} className="cps-tile-dest group" tabIndex={isActive ? 0 : -1}>
                            {label}
                            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="cps-tile-visual" aria-hidden="true">
                <img src={visual.img} style={{ objectPosition: visual.pos }} alt="" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}