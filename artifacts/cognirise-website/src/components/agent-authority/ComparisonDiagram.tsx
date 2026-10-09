import type { FrameworkContent } from "@workspace/api-zod";

type GuardrailsContent = NonNullable<Extract<FrameworkContent, { template: "agent-authority" }>["guardrails"]>;

/**
 * The activities are deliberately shared by every render path. The legacy
 * profile wording stays available next to the plain-language reading cue;
 * the latter is what a visitor should be able to scan without decoding a
 * control taxonomy.
 */
const activities = [
  {
    name: "Answer a clinic question",
    profile: "Knowledge · R1 / H1",
    oversight: "out of the loop",
    plainOversight: "automatic",
  },
  { name: "Book an appointment", profile: "Action · R2 / H2", oversight: "on the loop", plainOversight: "monitored" },
  {
    name: "Cancel an appointment",
    profile: "Action · R3 / H2 · defined intervention window",
    oversight: "on the loop",
    plainOversight: "intervention window",
  },
  {
    name: "Issue a refund",
    profile: "Action · R4 / H3",
    oversight: "in the loop",
    plainOversight: "human approval",
  },
] as const;

/**
 * A single shared signal rail replaces the old two-panel illustration. The
 * common setting is named once, while each consequential handover keeps its
 * own profile and oversight cue. CSS grid becomes a vertical sequence below
 * the medium breakpoint so the rail never creates page-level horizontal
 * scrolling.
 */
export function ComparisonDiagram({ figure }: { figure: GuardrailsContent["firstFigure"] }) {
  return (
    <figure
      className="mt-9 min-w-0 text-[16px] leading-[1.55]"
      aria-label={figure.altText}
      data-guardrails-comparison
    >
      <div className="border-y border-[#cbd3e1] py-6 sm:py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#102957]">
            <span className="text-[#6f4188]">Illustrative pattern</span>{" "}
            <span aria-hidden="true">·</span>{" "}
            not a universal prescription{" "}
            <span aria-hidden="true">·</span>{" "}
            Front-Desk Agent
          </p>
          <p className="text-base text-[#536887]">Common setting → individually governed handovers</p>
        </div>
        <p className="mt-3 max-w-[62rem] text-sm leading-[1.5] text-[#536887]">
          <strong className="text-[#102957]">Common setting:</strong> One filter. One prompt. One limit. Applied to everything it does.{" "}
          <span className="font-semibold text-[#a63d28]">Warning:</span> the riskiest act inherits the posture of the safest.
          <strong className="ml-1 text-[#102957]">Individually governed:</strong> Each moment the output leaves the agent is governed on its own.
        </p>

        <ol className="mt-7 grid gap-0 md:grid-cols-4">
          {activities.map((activity, index) => (
            <li
              key={activity.name}
              className="relative border-l border-[#cbd3e1] px-4 py-3 first:border-l-0 sm:px-5 md:min-h-[142px] md:py-1 md:first:pl-0 md:last:pr-0"
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute -left-px top-0 hidden h-px w-5 -translate-x-full bg-gradient-to-r from-[#6f4188] via-[#d94c9f] to-[#ff775c] md:block"
                />
              ) : null}
              <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[#6f4188]">
                0{index + 1} · handover
              </span>
              <strong className="mt-2 block max-w-[14em] text-base leading-[1.3] text-[#102957]">
                {activity.name}
              </strong>
              <span className="mt-2 block text-base leading-[1.45] text-[#536887]">{activity.profile}</span>
              <span className="mt-3 inline-block border-l-2 border-[#ff775c] pl-2 text-base font-semibold text-[#a63d28]">
                {activity.plainOversight}
              </span>
              <span className="sr-only">({activity.oversight})</span>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="mt-5 border-t border-[#cbd3e1] pt-4 text-[#536887]">
        <strong>{figure.captionLabel}</strong>{" "}
        <em>{figure.captionLead}</em> {figure.captionBody}
      </figcaption>
    </figure>
  );
}