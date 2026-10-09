import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { assetUrl } from "@/lib/assets";
import { PulseImage } from "@/components/ui/pulse-image";
import {
  SpatialDisclosure,
  SpatialDisclosureItem,
  SpatialDisclosurePanel,
  SpatialDisclosureTrigger,
  useSpatialDisclosure,
} from "@/components/ui/spatial-disclosure";
import { HOME_SERVICES, type ServiceTile } from "@/site/content/home";

/**
 * The three animated service cards on the home page: Advise, Build, Run.
 * The tile animation and styling are the site's existing service tiles; only
 * the content changed, and a click now goes to the What we do page.
 */
export function ServiceTiles({ className = "" }: { className?: string }) {
  return (
    <SpatialDisclosure
      mode="editorial"
      orientation="horizontal"
      allowCollapse
      previewOverridesSelection
      previewExpands
      previewClearDelay={90}
      className={`cps-line-component cps-line-summary ${className}`}
    >
      <style>{`
        .cps-line-component{--ink:#102957;--paper:#fdfcfb;--line:#cad2df;--pink:#dc509f;--coral:#ff775d;color:var(--ink);font-family:Inter,sans-serif}
        .cps-line-component *{box-sizing:border-box}
        .cps-line-component a{color:inherit;text-decoration:none}
        .cps-line-component :focus-visible{outline:3px solid var(--coral);outline-offset:4px}
        .cps-line-component h3{font-family:Comfortaa,sans-serif}
        .cps-tiles{display:flex;flex-direction:column;gap:16px}
        .cps-tile{position:relative;min-width:0;background:var(--paper);border:1px solid var(--line);overflow:hidden;display:flex;flex:1 1 0%;flex-direction:column;cursor:pointer;transition:background .7s cubic-bezier(.19,1,.22,1)}
        .cps-tile:after{content:"";position:absolute;z-index:4;inset:0 auto 0 0;width:4px;background:linear-gradient(180deg,#7659df,var(--pink),var(--coral));transform:scaleY(0);transform-origin:top;transition:transform .18s ease;pointer-events:none}
        .cps-tile.active:after{transform:scaleY(1)}
        .cps-tile:hover:not(.active){background:#f8f9fc}
        .cps-tile-left{position:relative;z-index:2;display:flex;flex-direction:column;width:100%}
        .cps-tile-btn{appearance:none;background:transparent;border:none;text-align:left;width:100%;padding:0;cursor:pointer;outline:none;color:inherit;flex-shrink:0;font:inherit}
        .cps-tile-btn:focus-visible{outline:3px solid var(--coral);outline-offset:-3px}
        .cps-tile-header{padding:24px;display:flex;flex-direction:column;gap:12px;position:relative}
        .cps-tile-meta{display:flex;align-items:center}
        .cps-tile-no{font-size:11px;letter-spacing:.1em;color:var(--pink);font-weight:600}
        .cps-tile-header h3{font-size:clamp(26px,2.6vw,34px);line-height:1.05;font-weight:600;letter-spacing:-.04em;margin:0;max-width:100%}
        .cps-tile-orientation{font-size:13px;line-height:1.45;color:#526886;margin:0}
        .cps-tile-copy{display:flex;flex-direction:column;flex-grow:1;position:relative}
        .cps-tile-copy-inner{display:none;padding:0 24px 32px}
        .cps-tile.active .cps-tile-copy-inner{display:flex;flex-direction:column;animation:cpsTileFadeIn .5s ease forwards}
        .cps-tile-bullets{list-style:none;margin:0 0 24px;padding:0;display:flex;flex-direction:column;gap:9px}
        .cps-tile-bullets li{display:flex;gap:10px;font-size:14px;line-height:1.45;color:#30486d;font-weight:500}
        .cps-tile-bullets li:before{content:"";flex:0 0 14px;height:2px;margin-top:9px;background:var(--pink)}
        .cps-tile-dest{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;padding:2px 0;font-size:13px;line-height:1.35;font-weight:650;color:var(--ink);text-decoration:underline;text-decoration-color:rgba(220,80,159,.35);text-decoration-thickness:1px;text-underline-offset:4px;transition:color .2s ease,text-decoration-color .2s ease}
        .cps-tile-dest svg{flex:0 0 auto}
        .cps-tile-dest:hover{color:var(--pink);text-decoration-color:var(--pink)}
        .cps-tile-visual{position:relative;z-index:1;height:200px;overflow:hidden;background:#f3f1f7}
        .cps-tile-visual img{display:block;position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:cover;opacity:1;visibility:visible;transition:transform .7s cubic-bezier(.19,1,.22,1),filter .7s cubic-bezier(.19,1,.22,1)}
        .cps-tile.active .cps-tile-visual img{transform:scale(1.02)}
        .cps-tile[data-service="advise"] .cps-tile-visual img{filter:brightness(1.12) saturate(.9)}
        .cps-tile-visual:after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(0deg,rgba(8,26,58,.1),transparent 30%);pointer-events:none}
        @media (min-width:1024px){
          .cps-tiles{flex-direction:row;height:560px}
          .cps-tile{display:block;flex:0 0 auto;width:calc(18.519% - 5.926px);transition:width .7s cubic-bezier(.19,1,.22,1),background .7s cubic-bezier(.19,1,.22,1);will-change:width}
          .cps-tile.active{width:calc(62.963% - 20.148px);background:#fff}
          .cps-tiles.all-collapsed .cps-tile{width:calc(33.333% - 10.667px)}
          .cps-tile-left{position:absolute;inset:0;height:100%;transition:width .7s cubic-bezier(.19,1,.22,1)}
          .cps-tile.active .cps-tile-left{width:50%}
          .cps-tile-header{padding:32px 32px 24px;gap:14px;height:250px}
          .cps-tile.active .cps-tile-header{height:190px}
          .cps-tile-copy-inner{display:flex;position:absolute;inset:0;padding:0 32px 32px;opacity:0;visibility:hidden;transform:translateY(10px);transition:opacity .5s ease .2s,transform .5s ease .2s,visibility .5s ease .2s;min-width:340px;overflow-y:auto;animation:none!important}
          .cps-tile.active .cps-tile-copy-inner{opacity:1;visibility:visible;transform:translateY(0)}
          .cps-tile-visual{position:absolute;inset:250px 0 0;height:auto;transition:inset .7s cubic-bezier(.19,1,.22,1)}
          .cps-tile.active .cps-tile-visual{inset:0 0 0 50%}
          .cps-tile-visual:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#fff 0%,rgba(255,255,255,.95) 10%,rgba(255,255,255,.4) 25%,transparent 45%);opacity:0;transition:opacity .7s cubic-bezier(.19,1,.22,1);pointer-events:none;z-index:2}
          .cps-tile[data-service="advise"] .cps-tile-visual:before{background:linear-gradient(90deg,#fff 0%,rgba(255,255,255,.98) 17%,rgba(255,255,255,.76) 34%,rgba(255,255,255,.26) 52%,transparent 68%)}
          .cps-tile.active .cps-tile-visual:before{opacity:1}
        }
        @keyframes cpsTileFadeIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
        @media(prefers-reduced-motion:reduce){.cps-line-component *,.cps-line-component *:before,.cps-line-component *:after{animation:none!important;transition:none!important}}
      `}</style>
      <Tiles tiles={HOME_SERVICES.tiles} />
    </SpatialDisclosure>
  );
}

function Tiles({ tiles }: { tiles: ServiceTile[] }) {
  const { activeIndex, preview, toggle } = useSpatialDisclosure();
  return (
    <div className={`cps-tiles ${activeIndex === null ? "all-collapsed" : ""}`} role="group" aria-label="What we do">
      {tiles.map((tile, index) => {
        const id = String(index);
        return (
          <SpatialDisclosureItem
            key={tile.id}
            id={id}
            className={({ isActive, isSelected }) => `cps-tile ${isActive ? "active" : ""} ${isSelected ? "selected" : ""}`}
            data-service={tile.id}
            onMouseEnter={() => preview(id)}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a, button")) return;
              toggle(id);
            }}
          >
            {({ isActive }) => (
              <>
                <div className="cps-tile-left">
                  <SpatialDisclosureTrigger id={id} className="cps-tile-btn" tabIndex={index === 0 ? 0 : -1} data-testid={`service-trigger-${tile.id}`}>
                    <div className="cps-tile-header">
                      <div className="cps-tile-meta"><span className="cps-tile-no">0{index + 1}</span></div>
                      <h3 data-testid={`service-title-${tile.id}`}>{tile.label}</h3>
                      <p className="cps-tile-orientation">{tile.line}</p>
                    </div>
                  </SpatialDisclosureTrigger>
                  <div className="cps-tile-copy">
                    <SpatialDisclosurePanel id={id} className="cps-tile-copy-inner" data-testid={`service-panel-${tile.id}`}>
                      <ul className="cps-tile-bullets">
                        {tile.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                      </ul>
                      <Link href={tile.href} className="cps-tile-dest group mt-auto" tabIndex={isActive ? 0 : -1}>
                        {tile.linkLabel}
                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                      </Link>
                    </SpatialDisclosurePanel>
                  </div>
                </div>
                <div className="cps-tile-visual" aria-hidden="true">
                  <PulseImage src={assetUrl(tile.image)} alt="" className="h-full w-full object-cover" style={{ objectPosition: tile.imagePosition }} eager />
                </div>
              </>
            )}
          </SpatialDisclosureItem>
        );
      })}
    </div>
  );
}
