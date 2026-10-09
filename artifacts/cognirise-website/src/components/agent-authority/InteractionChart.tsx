import React from "react";
import type { FrameworkContent } from "@workspace/api-zod";
import {
  getCeiling,
  OVERSIGHT_LABELS,
  type EBand,
} from "@/lib/agent-authority";

type GuardrailsContent = NonNullable<Extract<FrameworkContent, { template: "agent-authority" }>["guardrails"]>;

/**
 * The plot intentionally has three human-oversight rows. E4 and E5 still use
 * the canonical ceilings from the model; their extra safeguards are described
 * in the column labels rather than introducing a second, five-row scale.
 */
const AUTHORITY_ROWS = [
  { label: "out of the loop", desc: "fully automatic" },
  { label: "on the loop", desc: "auto, sampled review" },
  { label: "in the loop", desc: "a person approves" },
] as const;

const EXPOSURE_COLUMNS = [
  {
    band: "E1",
    eBand: 1 as EBand,
    rule: "R1–R2 and H1",
    meaning: "Internal, reversible",
  },
  {
    band: "E2",
    eBand: 2 as EBand,
    rule: "R3, or H2",
    meaning: "One person is affected",
  },
  {
    band: "E3",
    eBand: 3 as EBand,
    rule: "R4, or H3",
    meaning: "A regulator can see it",
  },
  {
    band: "E4",
    eBand: 4 as EBand,
    rule: "H4",
    meaning: "Public reach",
  },
  {
    band: "E5",
    eBand: 5 as EBand,
    rule: "H5",
    meaning: "Safety, health, or essential service",
  },
] as const;

const ILLUSTRATIVE_BUCKETS = [
  ["R1–R2 · H1", "undone at will, internal only"],
  ["R2–R3 · H2", "undone at a cost, one customer"],
  ["R4 · H2", "irreversible, one customer"],
  ["R3–R4 · H3+", "regulator-visible, public or safety"],
] as const;

export function InteractionChart({ figure }: { figure: GuardrailsContent["secondFigure"] }) {
  const chartId = React.useId().replace(/:/g, "");

  return (
    <figure
      className="mt-9 min-w-0 max-w-full border border-white/15 bg-[#0b2247] p-4 text-white sm:p-6 lg:p-9"
      aria-label={figure.altText}
      aria-labelledby={`${chartId}-title`}
       aria-describedby={`${chartId}-governed-description ${chartId}-description ${chartId}-legend`}
    >
       <p id={`${chartId}-governed-description`} className="sr-only">{figure.altText}</p>
      <header className="mb-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-8">
        <div>
          <span className="text-sm font-bold uppercase tracking-[0.14em] text-[#ff9fcf]">
            How the two interact
          </span>
          <h3
            id={`${chartId}-title`}
            className="mt-2 max-w-[25em] font-display text-[clamp(24px,3vw,34px)] font-semibold leading-[1.18] tracking-[-0.04em] text-white"
          >
            Exposure sets the ceiling. Evidence earns the climb. Guardrails do both jobs.
          </h3>
          <p
            id={`${chartId}-description`}
            className="mt-3 max-w-[42em] text-base leading-[1.6] text-[#b9c7db]"
          >
            The five canonical exposure bands run left to right. Authority is shown in three human-oversight
            rows; the pink staircase is the exposure ceiling, and everything beneath it is permitted.
          </p>
        </div>
        <p className="border-l-2 border-[#ff9fcf] pl-4 text-base leading-[1.6] text-[#d6deea]">
          Read the plot from the profile, not from the agent&apos;s confidence. A handover can climb on evidence,
          while an approved compensating artefact is the only way to carry authority above its exposure ceiling.
        </p>
      </header>

       <p className="mb-3 text-base leading-[1.6] text-[#b9c7db] lg:hidden">Scroll horizontally to explore the chart. Keyboard: focus the chart, then use Left and Right arrows.</p>
       <div
        className="max-w-full overflow-x-auto overscroll-x-contain pb-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff775d] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b2247]"
        role="region"
        tabIndex={0}
        aria-label="Scrollable interaction chart. Use horizontal scrolling to read every exposure band."
         onKeyDown={(event) => {
           const region = event.currentTarget;
           if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
             event.preventDefault();
             region.scrollLeft += (event.key === "ArrowRight" ? 1 : -1) * 160;
           } else if (event.key === "Home" || event.key === "End") {
             event.preventDefault();
             region.scrollLeft = event.key === "Home" ? 0 : region.scrollWidth;
           }
         }}
      >
        {/* em-based width and height keep the composition readable when text is enlarged. */}
        <div className="min-w-[64em] pr-2">
          <div className="grid grid-cols-[12em_minmax(0,1fr)] gap-x-4">
            <div className="flex items-end pb-2 text-sm font-bold uppercase tracking-[0.14em] text-white/60">
              Authority ↑
            </div>
            <div className="flex items-end pb-2 text-sm font-bold uppercase tracking-[0.14em] text-white/60">
              Exposure — how hard to undo, and who is exposed →
            </div>

             <div className="grid min-h-[31em] grid-rows-3 bg-[#0b2247]">
              {AUTHORITY_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col justify-center border-b border-white/20 pr-4 text-right last:border-b-0"
                >
                  <strong className="text-base font-bold uppercase tracking-[0.08em] text-white">{row.label}</strong>
                  <span className="mt-1 text-sm leading-[1.4] text-white/60">{row.desc}</span>
                </div>
              ))}
            </div>

            <div
              className="relative min-h-[31em] border border-white/40"
              aria-label="Authority plot with the permitted region below the pink exposure ceiling"
            >
              <div className="absolute inset-0 grid grid-cols-5 grid-rows-3">
                {AUTHORITY_ROWS.map((_, rowIndex) =>
                  EXPOSURE_COLUMNS.map((col, colIndex) => {
                    const canonicalCeiling = getCeiling(col.eBand);
                     const ceilingRow = canonicalCeiling === "out-of-loop" ? 0 : canonicalCeiling === "on-loop" ? 1 : 2;
                    const permitted = rowIndex >= ceilingRow;
                    return (
                      <div
                        key={`${rowIndex}-${col.band}`}
                        title={`${col.band}: ${permitted ? "permitted" : "not permitted by exposure"}; canonical ceiling ${OVERSIGHT_LABELS[canonicalCeiling]}`}
                        className={`border-b border-r border-white/20 ${
                          rowIndex === AUTHORITY_ROWS.length - 1 ? "border-b-0" : ""
                        } ${colIndex === EXPOSURE_COLUMNS.length - 1 ? "border-r-0" : ""} ${
                          permitted ? "bg-white/[0.08]" : "bg-[#ff775d]/[0.04]"
                        }`}
                      />
                    );
                  }),
                )}
              </div>

              {/* CSS-only staircase: top of E1, the E2 row boundary, then the E3–E5 boundary. */}
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="absolute left-0 top-0 h-0 w-[20%] border-t-[0.22em] border-[#ff9fcf]" />
                <div className="absolute left-[20%] top-0 h-[33.333%] w-0 border-l-[0.22em] border-[#ff9fcf]" />
                <div className="absolute left-[20%] top-[33.333%] h-0 w-[20%] border-t-[0.22em] border-[#ff9fcf]" />
                <div className="absolute left-[40%] top-[33.333%] h-[33.333%] w-0 border-l-[0.22em] border-[#ff9fcf]" />
                <div className="absolute left-[40%] top-[66.666%] h-0 w-[60%] border-t-[0.22em] border-[#ff9fcf]" />
              </div>

               <div className="absolute left-[61%] top-[54%] w-[36%] text-center text-sm font-bold uppercase leading-[1.25] tracking-[0.08em] text-[#ff9fcf]">
                The ceiling set by exposure
              </div>
              <div className="absolute left-[61%] top-[6%] w-[17%] text-center text-sm leading-[1.35] text-white/65">
                not permitted by exposure
              </div>

              {/* A: required controls remain in the permitted area, not in a separate scoring system. */}
              <div className="absolute left-[2%] top-[43%] w-[16%] text-sm leading-[1.35] text-white/85">
                <strong className="block text-sm font-bold uppercase leading-[1.25] tracking-[0.06em] text-white">
                  A · Required Controls
                </strong>
                <div className="mt-2 flex flex-wrap gap-1">
                  {["universal", "by type", "by authority", "by exposure"].map((label) => (
                    <span key={label} className="border border-white/35 bg-white/10 px-1.5 py-1 text-sm">
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* B: E2 promotion begins in the in-loop row and ends exactly at the E2 ceiling. */}
              <div className="pointer-events-none absolute left-[30%] top-[33.333%] h-[50%] w-0 border-l-[0.18em] border-dashed border-[#db509e]" />
              <div className="pointer-events-none absolute left-[30%] top-[33.333%] -translate-x-1/2 border-x-[0.48em] border-b-[0.75em] border-x-transparent border-b-[#db509e]" />
              <div className="pointer-events-none absolute left-[30%] top-[80%] h-[0.9em] w-[0.9em] -translate-x-1/2 -translate-y-1/2 rotate-45 border-[0.16em] border-[#db509e] bg-[#0b2247]" />
               <div className="absolute left-[22%] top-[88%] w-[17%] text-center text-sm leading-[1.3] text-[#ff9fcf]">
                 <strong className="block font-bold uppercase tracking-[0.06em]">B · Promotion</strong>
              </div>

              {/* C: a violet dashed connector makes the artefact-carried exception explicit. */}
              <div className="pointer-events-none absolute left-[50%] top-[48%] h-[18.666%] w-0 border-l-[0.18em] border-dashed border-[#7659df]" />
              <div className="pointer-events-none absolute left-[50%] top-[48%] h-[1em] w-[1em] -translate-x-1/2 -translate-y-1/2 rotate-45 border-[0.16em] border-[#7659df] bg-[#7659df] shadow-[0_0_0_0.3em_rgba(118,89,223,0.22)]" />
               <div className="absolute left-[42%] top-[24%] w-[17%] text-center text-sm leading-[1.3] text-[#b7a9ff]">
                <strong className="block font-bold uppercase tracking-[0.06em]">C · Compensation</strong>
              </div>

              <div className="absolute left-[80%] top-[8%] w-[18%] border border-[#ff775d] bg-[#ff775d]/10 p-2 text-center text-sm font-semibold leading-[1.35] text-[#ff9c88]">
                A better model does not raise the ceiling.
              </div>
            </div>

            <div aria-hidden="true" />
            <div className="mt-3 grid grid-cols-5">
              {EXPOSURE_COLUMNS.map((col) => {
                const canonicalCeiling = getCeiling(col.eBand);
                return (
                  <div key={col.band} className="border-r border-white/20 px-2 text-center last:border-r-0">
                    <strong className="block text-base font-bold text-white">{col.band}</strong>
                    <span className="mt-1 block text-sm font-semibold leading-[1.35] text-[#ff9fcf]">{col.rule}</span>
                    <span className="mt-1 block text-sm leading-[1.4] text-white/65">{col.meaning}</span>
                    <span className="mt-2 block text-sm leading-[1.4] text-white/45">
                      Canonical ceiling: {OVERSIGHT_LABELS[canonicalCeiling]}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>

         </div>
       </div>
           <section
            className="mt-5 border-t border-white/20 pt-5"
            aria-label="Original illustrative exposure buckets"
          >
            <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-white/70">
              Illustrative exposure buckets — annotations, not axes
            </h4>
             <p className="mt-4 text-sm leading-[1.6] text-white/65">
               Five canonical bands; illustrative buckets below are examples, not alternative axes.
             </p>
             <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {ILLUSTRATIVE_BUCKETS.map(([profile, description]) => (
                <div key={profile} className="border border-white/15 px-3 py-3">
                  <strong className="block text-base font-semibold text-white">{profile}</strong>
                  <span className="mt-1 block text-sm leading-[1.45] text-white/65">{description}</span>
                </div>
              ))}
            </div>
          </section>

      <section
        id={`${chartId}-legend`}
        className="mt-8 grid gap-5 border-t border-white/20 pt-6 md:grid-cols-3"
        aria-label="Interaction chart legend"
      >
        <article aria-labelledby={`${chartId}-legend-a`}>
          <h4 id={`${chartId}-legend-a`} className="text-base font-bold text-[#ff9fcf]">
            A <span className="text-white">Permitted</span>
          </h4>
          <p className="mt-2 text-base leading-[1.6] text-white/80">
            Everything under the staircase is permitted. The controls required here are read off the profile, not
             chosen. Required controls sit in here — the guardrails the profile makes mandatory — universal, by type, by
            authority, and by exposure.
          </p>
        </article>

        <article aria-labelledby={`${chartId}-legend-b`}>
          <h4 id={`${chartId}-legend-b`} className="text-base font-bold text-[#ff9fcf]">
            B <span className="text-white">Promotion</span>
          </h4>
          <p className="mt-2 text-base leading-[1.6] text-white/80">
            Evidence earns the climb. Guardrails as required controls: meet them, hold the evidence, and the handover
            climbs one level — launching one level below target. A better model does not raise the ceiling; promotion
            never moves it.
          </p>
        </article>

        <article aria-labelledby={`${chartId}-legend-c`}>
          <h4 id={`${chartId}-legend-c`} className="text-base font-bold text-[#b7a9ff]">
            C <span className="text-white">Compensation</span>
          </h4>
          <p className="mt-2 text-base leading-[1.6] text-white/80">
             A compensating control raises the ceiling. Guardrails that carry the authority themselves. Only these move the ceiling: only compensation, through
            an approved artefact, may carry authority above it — never unrestricted agent discretion. Example:
            recall message to a patient — no free text, approved template, blocking gate on every send.
          </p>
        </article>
      </section>

      <p className="mt-6 text-sm leading-[1.5] text-white/50">
        Reversibility R1–R4 and reach H1–H5 as defined in the Agent Authority Model. Handovers shown are illustrative.
      </p>

      <figcaption className="mt-8 border-t border-white/20 px-1 pt-4 text-base leading-[1.6] text-[#b9c7db]">
        <strong className="text-white">{figure.captionLabel}</strong>{" "}
        <em className="text-white/85">{figure.captionLead}</em> {figure.captionBody}
      </figcaption>
    </figure>
  );
}