import type { CSSProperties } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { assetUrl } from "@/lib/assets";
import { useLaunchImageRegion, launchStageImage } from "@/lib/launch-region";
import {
  SpatialDisclosure,
  SpatialDisclosureItem,
  SpatialDisclosurePanel,
  SpatialDisclosureTrigger,
} from "@/components/ui/spatial-disclosure";
import { STEPS } from "@/site/content/steps";
import type { Cta } from "@/site/content/types";
import { SectionHeading } from "./Primitives";

const STAGE_KEYS = ["innovate", "demonstrate", "activate", "operate"] as const;

function useStepImages() {
  const region = useLaunchImageRegion();
  return (index: number) => region ? launchStageImage(region, STAGE_KEYS[index]) : assetUrl(STEPS[index].image);
}

/**
 * The four-step stepper on How we work. The timings are always visible; a
 * click or the arrow keys open one step and show what we do, what you do and
 * what you have at the end. The look is the site's existing delivery blueprint.
 */
export function FourSteps({ heading, afterTable }: { heading: string; afterTable?: string[] }) {
  const imageFor = useStepImages();
  return (
    <section id="steps" className="bg-[#fdfcfb] text-[#102957]" aria-labelledby="steps-heading">
      <div className="home-layout-frame border-t border-[#cbd3e1] py-[64px] lg:py-[96px]">
        <SectionHeading id="steps-heading">{heading}</SectionHeading>

        <div className="mt-10 lg:mt-14">
          <StepStyles />
          <SpatialDisclosure mode="editorial" orientation="horizontal" allowCollapse preview={false} defaultValue="1" className="blueprint-disclosure blueprint-row">
            {STEPS.map((step, index) => (
              <SpatialDisclosureItem
                key={step.id}
                id={String(step.id)}
                className={({ isActive, isSelected }) => `blueprint-item ${isActive ? "active" : ""} ${isSelected ? "selected" : ""}`}
                style={{ "--bp-accent": step.accent } as CSSProperties}
              >
                {() => (
                  <>
                    <figure className="blueprint-visual">
                      <img src={imageFor(index)} alt={step.imageAlt} className="h-full w-full object-cover" style={{ objectPosition: step.imagePosition }} loading="lazy" decoding="async" />
                    </figure>
                    <SpatialDisclosureTrigger id={String(step.id)} className="blueprint-trigger" data-testid={`step-trigger-${step.id}`}>
                      <div className="blueprint-meta">
                        <span className="blueprint-num" style={{ color: step.accent }}>0{step.id}</span>
                        <span className={`blueprint-time ${step.id === 2 ? "blueprint-time--highlight" : ""}`}>{step.time}</span>
                      </div>
                      <h3 className="blueprint-title">{step.name}</h3>
                      <p className="blueprint-subtitle">{step.summary}</p>
                    </SpatialDisclosureTrigger>
                    <SpatialDisclosurePanel id={String(step.id)} className="blueprint-panel" data-testid={`step-panel-${step.id}`}>
                      <div className="blueprint-panel-inner">
                        <div className="blueprint-panel-content">
                          <div className="blueprint-field"><span className="blueprint-field-label">What we do</span><p>{step.weDo}</p></div>
                          <div className="blueprint-field"><span className="blueprint-field-label">What you do</span><p>{step.youDo}</p></div>
                          <div className="blueprint-field"><span className="blueprint-field-label">What you have at the end</span><p>{step.youHave}</p></div>
                        </div>
                      </div>
                    </SpatialDisclosurePanel>
                  </>
                )}
              </SpatialDisclosureItem>
            ))}
          </SpatialDisclosure>
        </div>

        {afterTable && (
          <div className="mt-10 max-w-[720px] space-y-4 text-[15.5px] leading-[1.6] text-[#405777]">
            {afterTable.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        )}
      </div>
    </section>
  );
}

/** The compact strip on the home page: step, time, one line, a link to How we work. */
export function StepsStrip({ heading, lead, link }: { heading: string; lead: string; link: Cta }) {
  return (
    <section id="how-we-work" className="bg-[#fdfcfb] text-[#102957]" aria-labelledby="steps-strip-heading">
      <div className="home-layout-frame border-t border-[#cbd3e1] py-[64px] lg:py-[96px]">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-[6vw]">
          <SectionHeading id="steps-strip-heading">{heading}</SectionHeading>
          <p className="text-[16px] leading-[1.6] text-[#405777] lg:pb-1">{lead}</p>
        </div>
        <ol className="mt-10 grid grid-cols-1 border-t border-[#102957] md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.id} className="flex flex-col gap-3 border-b border-[#cbd3e1] py-6 pr-6 md:border-r md:last:border-r-0 xl:border-b-0">
              <div className="flex items-baseline gap-3">
                <span className="text-[11px] font-semibold tracking-[0.1em]" style={{ color: step.accent }}>0{step.id}</span>
                <span className="text-[13px] font-semibold text-[#102957]">{step.time}</span>
              </div>
              <h3 className="font-display text-[24px] font-semibold leading-[1.05] tracking-[-0.04em]">{step.name}</h3>
              <p className="text-[14px] leading-[1.5] text-[#405777]">{step.summary}</p>
            </li>
          ))}
        </ol>
        <Link href={link.href} className="group mt-8 inline-flex items-center gap-2 text-[14px] font-semibold text-[#102957] underline decoration-[hsl(var(--brand-pink))]/40 underline-offset-4 hover:text-[hsl(var(--brand-pink))]">
          {link.label}
          <ArrowRight aria-hidden="true" size={15} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

function StepStyles() {
  return (
    <style>{`
      .blueprint-disclosure { --bp-ink: #102957; --bp-paper: #fdfcfb; --bp-line: #cbd3e1; }
      .blueprint-row { display: flex; flex-direction: column; border: 1px solid var(--bp-ink); border-radius: 4px; overflow: hidden; background: #071936; }
      .blueprint-item { position: relative; isolation: isolate; display: grid; grid-template-rows: 1fr 0fr; min-width: 0; flex: 1 1 0; overflow: hidden; background: #071936; color: white; transition: flex 0.75s cubic-bezier(0.16, 1, 0.3, 1), grid-template-rows 0.58s cubic-bezier(0.16, 1, 0.3, 1); border-bottom: 1px solid rgba(255,255,255,0.15); }
      .blueprint-item:last-child { border-bottom: 0; border-right: 0; }
      .blueprint-row:has(.blueprint-item.active) .blueprint-item { flex-grow: 0.7; }
      .blueprint-row:has(.blueprint-item.active) .blueprint-item.active { flex-grow: 1.8; grid-template-rows: minmax(100px, 1fr) auto; }
      .blueprint-visual { position: absolute; z-index: -3; inset: 0; margin: 0; overflow: hidden; background: #071936; }
      .blueprint-visual img { position: absolute; left: 50%; top: 0; width: clamp(560px, 46vw, 720px); max-width: none; height: 100%; object-fit: cover; filter: saturate(1.02) contrast(0.99) brightness(1.04); transform: translateX(-50%); transition: filter 0.45s ease; }
      .blueprint-item.active .blueprint-visual img { filter: saturate(1.08) contrast(1) brightness(1.02); }
      .blueprint-visual:after { content: ""; position: absolute; z-index: 2; inset: 0; background: linear-gradient(0deg, rgba(7,25,54,0.95) 0%, rgba(7,25,54,0.6) 35%, transparent 70%); opacity: 0.9; pointer-events: none; transition: opacity 0.5s ease, background 0.5s ease; }
      .blueprint-item.active .blueprint-visual:after { background: linear-gradient(0deg, rgba(7,25,54,0.98) 0%, rgba(7,25,54,0.85) 55%, transparent 90%); opacity: 1; }
      .blueprint-visual:before { content: ""; position: absolute; z-index: 1; inset: 0; background: var(--bp-accent, #7659df); mix-blend-mode: overlay; opacity: 0.15; transition: opacity 0.45s ease; }
      .blueprint-item.active .blueprint-visual:before { opacity: 0.35; }
      .blueprint-trigger { appearance: none; border: 0; background: transparent; color: white; width: 100%; min-width: 0; padding: 25px 24px 20px; display: grid; grid-template-columns: 1fr; grid-template-rows: auto auto auto; gap: 6px; text-align: left; cursor: pointer; align-self: end; z-index: 3; }
      .blueprint-trigger:before { content: ""; position: absolute; inset: 0; cursor: pointer; }
      .blueprint-trigger:focus-visible { outline: 3px solid hsl(var(--brand-coral)); outline-offset: -4px; }
      .blueprint-meta { position: absolute; top: 24px; left: 24px; right: 24px; display: flex; align-items: baseline; flex-wrap: wrap; gap: 7px; min-width: 0; font-family: Inter, sans-serif; text-shadow: 0 1px 6px rgba(0,0,0,0.85); }
      .blueprint-num { font-size: 14px; font-weight: 750; line-height: 1.25; letter-spacing: 0.04em; }
      .blueprint-time { display: inline; min-width: 0; max-width: 100%; color: white; font-size: 14px; font-weight: 700; line-height: 1.25; letter-spacing: 0.01em; white-space: normal; text-wrap: balance; }
      .blueprint-time:before { content: "—"; margin-right: 7px; color: var(--bp-accent, #7659df); }
      .blueprint-time--highlight { color: white; font-weight: 750; text-decoration: underline; text-decoration-color: var(--bp-accent, #db509e); text-decoration-thickness: 2px; text-underline-offset: 4px; }
      .blueprint-title { min-width: 0; font: 600 clamp(24px, 2.5vw, 32px)/1.02 Comfortaa, sans-serif; letter-spacing: -0.05em; margin: 0; overflow-wrap: anywhere; text-shadow: 0 2px 12px rgba(0,0,0,0.6); }
      .blueprint-subtitle { min-width: 0; font-size: 14px; color: rgba(255,255,255,0.85); margin: 0; overflow-wrap: anywhere; text-shadow: 0 1px 8px rgba(0,0,0,0.6); font-weight: 500; }
      .blueprint-panel { position: relative; z-index: 4; pointer-events: none; display: grid; grid-template-rows: 0fr; min-height: 0; transition: grid-template-rows 0.58s cubic-bezier(0.16, 1, 0.3, 1); }
      .blueprint-item.active .blueprint-panel { grid-template-rows: 1fr; }
      .blueprint-panel-inner { min-height: 0; overflow: hidden; }
      .blueprint-panel-content { padding: 0 24px 24px; display: flex; flex-direction: column; gap: 14px; }
      .blueprint-field { padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.15); }
      .blueprint-field-label { display: block; font: 700 9px/1 Inter, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: var(--bp-accent, #7659df); margin-bottom: 6px; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
      .blueprint-field p { font-size: 13.5px; line-height: 1.5; color: rgba(255,255,255,0.92); margin: 0; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
      @media (min-width: 1024px) {
        .blueprint-disclosure { --blueprint-active-width: calc((90.4vw - 3px) * 0.4615); }
        .blueprint-row { flex-direction: row; height: 560px; }
        .blueprint-item { border-bottom: 0; border-right: 1px solid rgba(255,255,255,0.15); }
        .blueprint-field p { font-size: 14.5px; }
        .blueprint-trigger { padding: 30px 28px 24px; }
        .blueprint-meta { top: 28px; left: 28px; right: 28px; }
        .blueprint-trigger > * { width: 100%; }
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
  );
}
