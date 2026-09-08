import type { CSSProperties } from "react";
import { assetUrl } from "@/lib/assets";
import {
  SpatialDisclosure,
  SpatialDisclosureItem,
  SpatialDisclosurePanel,
  SpatialDisclosureTrigger,
} from "@/components/ui/spatial-disclosure";

const stages = [
  {
    id: 1,
    num: "01",
    title: "Innovate",
    subtitle: "Spot the value",
    time: "1 day",
    tagline: "Don’t boil the ocean.",
    description:
      "Frame the highest-value opportunity and the decision it needs to unlock. We keep discovery deliberately narrow so effort moves toward proof, not an expanding scope.",
    outcome: "A prioritised opportunity and a clear decision boundary.",
    accent: "#7659df",
    image: "/images/cognirise/blueprint-innovate.jpg",
    imageAlt:
      "A mixed client and Cognirise team prioritising opportunities together around a workshop table.",
    imagePosition: "50% 48%",
  },
  {
    id: 2,
    num: "02",
    title: "Demonstrate",
    subtitle: "Prototype",
    time: "48 hours",
    tagline: "See it before you buy it.",
    description:
      "In 48 hours, stakeholders get a tangible, decision-ready prototype they can see and test—enough to validate value and direction before committing to a larger build.",
    outcome: "A working proof stakeholders can test, challenge and decide on.",
    accent: "#db509e",
    highlight: true,
    image: "/images/cognirise/blueprint-demonstrate.jpg",
    imageAlt:
      "A client team testing a working prototype on a large tablet in a bright studio.",
    imagePosition: "50% 45%",
  },
  {
    id: 3,
    num: "03",
    title: "Activate",
    subtitle: "Build the solution",
    time: "2–4 weeks (MVP)",
    tagline: "Human judgement. Agent scale.",
    description:
      "Forward-deployed engineers turn the validated direction into a governed MVP, combining accountable human judgement with the speed and scale of agents.",
    outcome: "A usable MVP with the engineering and controls needed to operate.",
    accent: "#e74f91",
    image: "/images/cognirise/blueprint-activate.jpg",
    imageAlt:
      "A forward-deployed engineer and client product owner reviewing orchestrated agent workflows and human approval gates for a live MVP.",
    imagePosition: "50% 52%",
  },
  {
    id: 4,
    num: "04",
    title: "Operate",
    subtitle: "Scale & operationalize",
    time: "4–12 weeks",
    tagline: "No lock-in. Full ownership.",
    description:
      "We harden the capability, transfer the operating knowledge and leave it in your environment. Your team owns the system and the path to scale it.",
    outcome: "A client-owned capability, operating model and scale plan.",
    accent: "#ff775d",
    image: "/images/cognirise/blueprint-operate.jpg",
    imageAlt:
      "Client leaders transferring ownership as connected teams work across a multi-level operations hub.",
    imagePosition: "50% 48%",
  },
];

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
            width: 100%; height: 100%; object-fit: cover;
            filter: saturate(1.02) contrast(0.99) brightness(1.04);
            transform: scale(1.08);
            transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), filter 0.45s ease;
          }
          .blueprint-item.active .blueprint-visual img {
            filter: saturate(1.08) contrast(1) brightness(1.02);
            transform: scale(1);
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
            text-align: left; cursor: pointer; align-self: end;
          }
          .blueprint-trigger:focus-visible { outline: 3px solid hsl(var(--brand-coral)); outline-offset: -4px; }

          .blueprint-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
          .blueprint-num { font: 700 12px/1 Inter, sans-serif; letter-spacing: 0.12em; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
          .blueprint-time { font: 600 11px/1 Inter, sans-serif; letter-spacing: 0.05em; color: rgba(255,255,255,0.75); text-transform: uppercase; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }

          .blueprint-title { font: 600 clamp(24px, 2.5vw, 32px)/1.02 Comfortaa, sans-serif; letter-spacing: -0.05em; margin: 0; text-shadow: 0 2px 12px rgba(0,0,0,0.6); transition: color 0.3s; }
          .blueprint-subtitle { font-size: 14px; color: rgba(255,255,255,0.85); margin: 0; text-shadow: 0 1px 8px rgba(0,0,0,0.6); font-weight: 500; transition: color 0.3s; }

          .blueprint-item.active .blueprint-title { color: white; text-shadow: 0 2px 16px rgba(0,0,0,0.9); }
          .blueprint-item.active .blueprint-subtitle { color: rgba(255,255,255,0.95); }

          .blueprint-panel { display: grid; grid-template-rows: 0fr; min-height: 0; transition: grid-template-rows 0.58s cubic-bezier(0.16, 1, 0.3, 1); }
          .blueprint-item.active .blueprint-panel { grid-template-rows: 1fr; }
          .blueprint-panel-inner { min-height: 0; overflow: hidden; }
          .blueprint-panel-content { padding: 0 24px 24px; display: flex; flex-direction: column; gap: 14px; }

          .blueprint-tagline { font: 600 18px/1.2 Comfortaa, sans-serif; letter-spacing: -0.03em; color: white; margin: 0; text-shadow: 0 1px 8px rgba(0,0,0,0.5); }
          .blueprint-description { font-size: 13.5px; line-height: 1.5; color: rgba(255,255,255,0.85); margin: 0; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }

          .blueprint-outcome-box { margin-top: 4px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.15); }
          .blueprint-outcome-label { display: block; font: 700 9px/1 Inter, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: var(--bp-accent, #7659df); margin-bottom: 6px; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
          .blueprint-outcome { font-size: 12.5px; font-weight: 600; line-height: 1.4; color: white; margin: 0; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }

          @media (min-width: 1024px) {
            .blueprint-row { flex-direction: row; height: 560px; }
            .blueprint-item { border-bottom: 0; border-right: 1px solid rgba(255,255,255,0.15); }
            .blueprint-tagline { font-size: 21px; }
            .blueprint-description { font-size: 14.5px; }
            .blueprint-outcome { font-size: 13.5px; }
            .blueprint-trigger { padding: 30px 28px 24px; }
            .blueprint-panel-content { padding: 0 28px 28px; }
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
          className="blueprint-row"
        >
          {stages.map((stage) => (
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
