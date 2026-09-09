import type { CSSProperties } from "react";
import { assetUrl } from "@/lib/assets";
import { IDAO_STAGES } from "@/content/idao";
import {
  SpatialDisclosure,
  SpatialDisclosureItem,
  SpatialDisclosurePanel,
  SpatialDisclosureTrigger,
} from "@/components/ui/spatial-disclosure";

export function BlueprintJourney() {
  return (
    <section
      id="delivery-blueprint"
      className="bg-[#fdfcfb] px-6 py-[82px] md:px-[4.8vw] lg:py-[125px]"
      aria-labelledby="blueprint-heading"
    >
      <div className="grid grid-cols-1 gap-8 border-t border-[#102957] pt-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-[7vw]">
        <div>
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#102957]">
            <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
            Delivery blueprint
          </div>
          <h2
            id="blueprint-heading"
            className="mt-5 max-w-[760px] font-display text-[clamp(42px,5vw,72px)] font-semibold leading-[0.97] tracking-[-0.08em]"
          >
            From a sharp question to{" "}
            <em className="not-italic text-[hsl(var(--brand-pink))]">
              operational value.
            </em>
          </h2>
        </div>
        <div className="self-end border-t border-[#cbd3e1] pt-6">
          <p className="m-0 max-w-[470px] text-[16px] leading-[1.6] text-[#405777]">
            Four controlled stages turn intent into something leaders can see,
            test and own. The pivotal moment comes early: a decision-ready
            prototype in 48 hours.
          </p>
        </div>
      </div>

      <div className="mt-12 lg:mt-[72px]">
        <style>{`
          .blueprint-disclosure { --bp-ink: #102957; --bp-paper: #fdfcfb; --bp-line: #cbd3e1; }
          .blueprint-row { display: flex; flex-direction: column; border: 1px solid var(--bp-ink); border-radius: 4px; overflow: hidden; background: #071936; }
          .blueprint-item {
            position: relative;
            isolation: isolate;
            display: grid;
            grid-template-rows: 1fr 0fr;
            min-width: 0;
            flex: 1 1 0;
            overflow: hidden;
            background: #071936;
            color: white;
            transition: flex 0.75s cubic-bezier(0.16, 1, 0.3, 1), grid-template-rows 0.58s cubic-bezier(0.16, 1, 0.3, 1);
            border-bottom: 1px solid rgba(255,255,255,0.15);
          }
          .blueprint-item:last-child { border-bottom: 0; border-right: 0; }
          .blueprint-row:has(.blueprint-item.active) .blueprint-item { flex-grow: 0.7; }
          .blueprint-row:has(.blueprint-item.active) .blueprint-item.active {
            flex-grow: 1.8;
            grid-template-rows: minmax(100px, 1fr) auto;
          }

          .blueprint-visual { position: absolute; z-index: -3; inset: 0; margin: 0; overflow: hidden; background: #071936; }
          .blueprint-visual img {
            position: absolute; left: 50%; top: 0;
            width: clamp(560px, 46vw, 720px); max-width: none; height: 100%; object-fit: cover;
            filter: saturate(1.02) contrast(0.99) brightness(1.04);
            transform: translateX(-50%);
            transition: filter 0.45s ease;
          }
          .blueprint-item.active .blueprint-visual img {
            filter: saturate(1.08) contrast(1) brightness(1.02);
          }
          .blueprint-visual:after {
            content: ""; position: absolute; z-index: 2; inset: 0;
            background: linear-gradient(0deg, rgba(7,25,54,0.95) 0%, rgba(7,25,54,0.6) 35%, transparent 70%);
            opacity: 0.9; pointer-events: none;
            transition: opacity 0.5s ease, background 0.5s ease;
          }
          .blueprint-item.active .blueprint-visual:after {
            background: linear-gradient(0deg, rgba(7,25,54,0.98) 0%, rgba(7,25,54,0.85) 55%, transparent 90%);
            opacity: 1;
          }
          .blueprint-visual:before {
            content: ""; position: absolute; z-index: 1; inset: 0;
            background: var(--bp-accent, #7659df); mix-blend-mode: overlay; opacity: 0.15;
            transition: opacity 0.45s ease;
          }
          .blueprint-item.active .blueprint-visual:before { opacity: 0.35; }

          .blueprint-trigger {
            appearance: none; border: 0; background: transparent; color: white;
            width: 100%; min-width: 0; padding: 25px 24px 20px;
            display: grid; grid-template-columns: 1fr; grid-template-rows: auto auto auto; gap: 6px;
            text-align: left; cursor: pointer; align-self: end; z-index: 3;
          }
          .blueprint-trigger:before {
            content: ""; position: absolute; inset: 0; cursor: pointer;
          }
          .blueprint-trigger:focus-visible { outline: 3px solid hsl(var(--brand-coral)); outline-offset: -4px; }

          .blueprint-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
          .blueprint-num { font: 700 12px/1 Inter, sans-serif; letter-spacing: 0.12em; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
          .blueprint-time { font: 600 11px/1 Inter, sans-serif; letter-spacing: 0.05em; color: rgba(255,255,255,0.75); text-transform: uppercase; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }

          .blueprint-title { font: 600 clamp(24px, 2.5vw, 32px)/1.02 Comfortaa, sans-serif; letter-spacing: -0.05em; margin: 0; text-shadow: 0 2px 12px rgba(0,0,0,0.6); transition: color 0.3s; }
          .blueprint-subtitle { font-size: 14px; color: rgba(255,255,255,0.85); margin: 0; text-shadow: 0 1px 8px rgba(0,0,0,0.6); font-weight: 500; transition: color 0.3s; }

          .blueprint-item.active .blueprint-title { color: white; text-shadow: 0 2px 16px rgba(0,0,0,0.9); }
          .blueprint-item.active .blueprint-subtitle { color: rgba(255,255,255,0.95); }

          .blueprint-panel { position: relative; z-index: 4; pointer-events: none; display: grid; grid-template-rows: 0fr; min-height: 0; transition: grid-template-rows 0.58s cubic-bezier(0.16, 1, 0.3, 1); }
          .blueprint-item.active .blueprint-panel { grid-template-rows: 1fr; }
          .blueprint-panel-inner { min-height: 0; overflow: hidden; }
          .blueprint-panel-content { padding: 0 24px 24px; display: flex; flex-direction: column; gap: 14px; }

          .blueprint-tagline { font: 600 18px/1.2 Comfortaa, sans-serif; letter-spacing: -0.03em; color: white; margin: 0; text-shadow: 0 1px 8px rgba(0,0,0,0.5); }
          .blueprint-description { font-size: 13.5px; line-height: 1.5; color: rgba(255,255,255,0.85); margin: 0; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }

          .blueprint-outcome-box { margin-top: 4px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.15); }
          .blueprint-outcome-label { display: block; font: 700 9px/1 Inter, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: var(--bp-accent, #7659df); margin-bottom: 6px; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
          .blueprint-outcome { font-size: 12.5px; font-weight: 600; line-height: 1.4; color: white; margin: 0; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
           .blueprint-client { padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.15); }
           .blueprint-client-label { display: block; font: 700 9px/1 Inter, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.65); margin-bottom: 6px; }
           .blueprint-client-copy { font-size: 12.5px; line-height: 1.45; color: rgba(255,255,255,0.9); margin: 0; }

          @media (min-width: 1024px) {
            .blueprint-disclosure { --blueprint-active-width: calc((90.4vw - 3px) * 0.4615); }
            .blueprint-row { flex-direction: row; height: 560px; }
            .blueprint-item { border-bottom: 0; border-right: 1px solid rgba(255,255,255,0.15); }
            .blueprint-tagline { font-size: 21px; }
            .blueprint-description { font-size: 14.5px; }
            .blueprint-outcome { font-size: 13.5px; }
            .blueprint-trigger { padding: 30px 28px 24px; }
            .blueprint-trigger > * { width: calc(var(--blueprint-active-width) - 56px); }
            .blueprint-panel-content { width: calc(var(--blueprint-active-width) - 56px); padding: 0 28px 28px; }
          }
          @media (max-width: 1023px) {
            .blueprint-item { min-height: 220px; grid-template-rows: minmax(220px, 1fr) 0fr; }
            .blueprint-row:has(.blueprint-item.active) .blueprint-item { flex-grow: 1; min-height: 140px; }
            .blueprint-row:has(.blueprint-item.active) .blueprint-item.active { grid-template-rows: minmax(140px, 1fr) auto; }
          }
          @media (prefers-reduced-motion: reduce) {
            .blueprint-item, .blueprint-panel, .blueprint-visual img, .blueprint-visual:after, .blueprint-visual:before { transition: none !important; }
          }
        `}</style>

        <SpatialDisclosure
          mode="editorial"
          orientation="horizontal"
          allowCollapse
          preview
          previewOverridesSelection
          previewExpands
          defaultValue="2"
          className="blueprint-disclosure blueprint-row"
        >
          {IDAO_STAGES.map((stage) => (
            <SpatialDisclosureItem
              key={stage.id}
              id={String(stage.id)}
              className={({ isActive, isSelected, isPreview }) =>
                `blueprint-item ${isActive ? "active" : ""} ${
                  isSelected ? "selected" : ""
                } ${isPreview ? "preview" : ""}`
              }
              style={{ "--bp-accent": stage.accent } as CSSProperties}
            >
              {() => (
                <>
                  <figure className="blueprint-visual">
                    <img
                      src={assetUrl(stage.image)}
                      alt={stage.imageAlt}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: stage.imagePosition }}
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                  <SpatialDisclosureTrigger
                    id={String(stage.id)}
                    className="blueprint-trigger"
                    data-testid={`blueprint-trigger-${stage.id}`}
                  >
                    <div className="blueprint-meta">
                      <span
                        className="blueprint-num"
                        style={{ color: stage.accent }}
                      >
                        {stage.num}
                      </span>
                      <span className="blueprint-time">{stage.time}</span>
                    </div>
                    <h3 className="blueprint-title">{stage.title}</h3>
                    <p className="blueprint-subtitle">{stage.subtitle}</p>
                  </SpatialDisclosureTrigger>
                  <SpatialDisclosurePanel
                    id={String(stage.id)}
                    className="blueprint-panel"
                    data-testid={`blueprint-panel-${stage.id}`}
                  >
                    <div className="blueprint-panel-inner">
                      <div className="blueprint-panel-content">
                        <h4 className="blueprint-tagline">{stage.tagline}</h4>
                        <p className="blueprint-description">{stage.description}</p>
                         <div className="blueprint-client">
                           <span className="blueprint-client-label">
                             Your role
                           </span>
                           <p className="blueprint-client-copy">{stage.clientRole}</p>
                         </div>
                        <div className="blueprint-outcome-box">
                          <span className="blueprint-outcome-label">
                            What you have in hand
                          </span>
                          <p className="blueprint-outcome">{stage.outcome}</p>
                        </div>
                      </div>
                    </div>
                  </SpatialDisclosurePanel>
                </>
              )}
            </SpatialDisclosureItem>
          ))}
        </SpatialDisclosure>
      </div>

    </section>
  );
}
