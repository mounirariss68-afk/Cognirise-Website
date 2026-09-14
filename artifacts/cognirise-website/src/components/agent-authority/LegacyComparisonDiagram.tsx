import type { FrameworkContent } from "@workspace/api-zod";

type GuardrailsContent = NonNullable<Extract<FrameworkContent, { template: "agent-authority" }>["guardrails"]>;

const activities = [
  { name: "Answer a clinic question", profile: "Knowledge · R1 / H1", oversight: "out of the loop" },
  { name: "Book an appointment", profile: "Action · R2 / H2", oversight: "on the loop" },
  { name: "Cancel an appointment", profile: "Action · R3 / H2 · defined intervention window", oversight: "on the loop" },
  { name: "Issue a refund", profile: "Action · R4 / H3", oversight: "in the loop" },
] as const;

/** Preserve the approved twin-panel illustration for legacy editions whose
 * captions and accessible description still describe that composition. */
export function LegacyComparisonDiagram({ figure }: { figure: GuardrailsContent["firstFigure"] }) {
  return (
    <figure className="mt-9 text-[16px] leading-[1.65]" aria-label={figure.altText} data-guardrails-comparison>
      <div className="grid gap-6 xl:grid-cols-2">
        {[false, true].map((individual) => (
          <div key={String(individual)} className={`min-w-0 border p-5 sm:p-8 ${individual ? "border-[#102957] bg-white" : "border-[#cbd3e1] bg-[#f9f7f4]"}`}>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6f4188]">{individual ? "The Agent Authority Model" : "The common pattern"}</p>
            <h4 className="mt-3 font-display text-[clamp(24px,2.5vw,32px)] font-semibold leading-[1.3]">
              {individual ? "Authority governs the handover" : "Guardrails govern the agent"}
            </h4>
            <p className="mt-4 text-[#405777]">{individual ? "Each moment the output leaves the agent is governed on its own." : "One filter. One prompt. One limit. Applied to everything it does."}</p>
            <div className={`mt-8 p-4 ${individual ? "border border-transparent" : "border-2 border-dashed border-[#ff775c]"}`}>
              <p className={`mb-3 text-xs font-bold uppercase tracking-[0.12em] ${individual ? "text-[#405777]" : "text-[#a63d28]"}`}>
                {individual ? "Separate handover profiles" : "Guardrail perimeter"}
              </p>
              <div className="bg-[#102957] p-5 text-center text-white">
                <strong className="block">Front-Desk Agent</strong>
                <span className="mt-1 block text-[#dce4f0]">{individual ? "four handovers, four profiles" : "one autonomy setting"}</span>
              </div>
            </div>
            <div className="ml-5 h-6 border-l border-[#8493ac]" aria-hidden="true" />
            <ol className="ml-5 border-l border-[#8493ac]">
              {activities.map((activity, index) => (
                <li key={activity.name} className="relative pb-4 pl-5 last:pb-0">
                  <span aria-hidden="true" className="absolute left-0 top-7 w-5 border-t border-[#8493ac]" />
                  <div className={`border p-4 ${index === 3 ? "border-[#ff775c] bg-[#fff3ef]" : "border-[#cbd3e1] bg-white"}`}>
                    <strong className="block">{activity.name}</strong>
                    {individual && <span className="mt-1 block text-[#405777]">{activity.profile}</span>}
                    <span className="mt-2 block font-semibold text-[#65468e]">{individual ? activity.oversight : "same authority"}</span>
                    {!individual && index === 3 && <span className="mt-2 block font-semibold text-[#a63d28]">Warning: the riskiest act inherits the posture of the safest.</span>}
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 border-t border-[#cbd3e1] pt-5">
              <p className="font-semibold">{individual ? "Authority attaches to the tool, not the agent." : "The riskiest act inherits the posture of the safest."}</p>
              <p className="mt-3 text-[#405777]">{individual ? "Same agent, same model, same guardrail technology — but the refund is now governed as a refund." : "Governance attaches to the wrong object, so the refund is protected exactly as well as the opening-hours question."}</p>
            </div>
          </div>
        ))}
      </div>
      <figcaption className="mt-6 border-t border-[#cbd3e1] pt-4 text-[#536887]">
        <strong>{figure.captionLabel}</strong> <em>{figure.captionLead}</em> {figure.captionBody}
      </figcaption>
    </figure>
  );
}