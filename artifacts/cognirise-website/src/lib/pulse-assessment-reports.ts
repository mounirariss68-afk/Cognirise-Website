import {
  OVERSIGHT_LABELS,
  REACH_LABELS,
  REVERSIBILITY_LABELS,
  type AssessmentResult,
} from "./agent-authority";
import { DIMENSIONS, getRecommendation, type UseCase } from "@/pages/AIUseCasePrioritization";
import {
  createPulseReportPdf,
  downloadPulseReportPdf,
  type PulseReport,
} from "./pulse-report-pdf";

export type ReadinessReportCondition = {
  id: string;
  title: string;
  ready: string;
  prepare: string;
  stop: string;
  resolve: string;
};

export type ReadinessReportRecord = {
  evidence: string;
  owner: string;
  reassessmentDate: string;
};

export type ReadinessReportInput = {
  legacyRecord?: boolean;
  answers: Record<string, "ready" | "prepare" | "stop">;
  conditions: ReadonlyArray<ReadinessReportCondition>;
  workflowScope: string;
  governanceReview: string;
  conditionRecords: Record<string, ReadinessReportRecord>;
  result: "proceed" | "prepare" | "stop";
  resultLabel: string;
  resultLine: string;
  resultDetail: string;
};

export function createPrioritizationPulseReport(useCases: UseCase[]): PulseReport {
  if (!useCases.length || useCases.some(item => !item.name.trim() || !item.description.trim() || DIMENSIONS.some(({ id }) => !Number.isInteger(item.scores[id]) || item.scores[id] < 1 || item.scores[id] > 5))) {
    throw new Error("Name each opportunity, describe its outcome and complete all six scores before downloading results.");
  }
  const recommendations = useCases.map((useCase) => ({ useCase, result: getRecommendation(useCase) }));
  const sorted = [...recommendations].sort((left, right) => right.result.score - left.result.score);
  return {
    methodId: "use-case-prioritization",
    title: "AI Use-Case Portfolio",
    eyebrow: "Cognirise Pulse · Portfolio decision",
    summary: "A working record of the opportunities, evidence and dependencies behind your current sequence.",
    resultLabel: `${useCases.length} opportunit${useCases.length === 1 ? "y" : "ies"} reviewed`,
    resultDetail: "Recommendations remain method-specific: score totals support comparison, while threshold rules determine Stop, Innovate, Demonstrate or Activate.",
    imagePath: "/images/cognirise/method-ucp-governed-ai-v3.jpg",
    filename: "cognirise-use-case-prioritization-results.pdf",
    sections: [
      {
        heading: "Portfolio criteria",
        paragraphs: [
          "Each opportunity is scored on a 1–5 planning scale. These are not market benchmarks, probabilities or a certification.",
          DIMENSIONS.map((dimension) => `${dimension.label}: ${dimension.low} → ${dimension.high} (${dimension.desc})`).join(" · "),
        ],
      },
      {
        heading: "Current opportunity record",
        answers: sorted.flatMap(({ useCase, result }, index) => [
          {
            label: `${String(index + 1).padStart(2, "0")} · ${useCase.name || "Unnamed opportunity"} · ${result.stage} · ${result.score} / 30`,
            value: useCase.description || "Outcome sought: not recorded.",
            detail: `${DIMENSIONS.map((dimension) => `${dimension.label} ${useCase.scores[dimension.id]}/5`).join(" · ")}${useCase.dependencies ? ` · Dependencies: ${useCase.dependencies}` : ""}${useCase.caveats ? ` · Caveat: ${useCase.caveats}` : ""}`,
          },
        ]),
      },
      {
        heading: "Interpretation",
        answers: sorted.map(({ useCase, result }) => ({
          label: `${useCase.name || "Unnamed opportunity"} · ${result.stage}`,
          value: result.reason,
          detail: result.link ? "Suggested delivery entry: IDAO stage review." : "No delivery entry is recommended until the stop condition changes.",
        })),
      },
    ],
    nextSteps: [
      "Record uncertainty as a caveat and revisit a score when evidence, dependencies or ownership changes.",
      "Bring the highest-value, best-evidenced opportunity to a separate Value Scan if a facilitated route to proof is useful.",
      "Use Agent Authority separately when a consequential handover exists; Control Burden is not an authority ceiling.",
    ],
    limitations: [
      "This is a transparent comparative planning tool, not a financial business case, ROI calculator or roadmap-to-delivery package.",
      "Answers and free-text opportunity evidence were generated locally from this page and are not sent to Cognirise.",
      "Method version: AI Use-Case Portfolio Prioritization · current public questionnaire.",
    ],
  };
}

export function createReadinessPulseReport(input: ReadinessReportInput): PulseReport {
  if (input.conditions.length !== 6 || input.conditions.some(condition => !["ready", "prepare", "stop"].includes(input.answers[condition.id]))) {
    throw new Error("Complete all six operating conditions before downloading results.");
  }
  const missing = input.legacyRecord ? "Not stored in this legacy record" : "Not recorded";
  const answerRows = input.conditions.map((condition) => {
    const answer = input.answers[condition.id];
    const record = input.conditionRecords[condition.id];
    const statement = answer === "ready" ? condition.ready : answer === "stop" ? condition.stop : condition.prepare;
    const details = `${answer === "ready" ? "No unresolved condition record is required." : condition.resolve} Evidence / governance note: ${record?.evidence || missing}. Accountable owner: ${record?.owner || missing}. Reassess: ${record?.reassessmentDate || missing}.`;
    return {
      label: `${condition.title} · ${(answer ?? "not answered").toUpperCase()}`,
      value: statement,
      detail: details,
    };
  });
  return {
    methodId: "agentic-operations-readiness",
    title: "Agentic Operations Readiness",
    eyebrow: "Cognirise Pulse · Workflow decision",
    summary: input.workflowScope || `Workflow scope: ${missing}.`,
    resultLabel: input.resultLabel,
    resultDetail: `${input.resultLine} ${input.resultDetail}`,
    imagePath: "/images/cognirise/method-aor-v2.jpg",
    filename: "cognirise-agentic-operations-readiness-results.pdf",
    sections: [
      { heading: "Workflow scope", paragraphs: [input.workflowScope || `${missing}.`] },
      { heading: "Six operating conditions", answers: answerRows },
      { heading: "Governance review", paragraphs: [input.governanceReview || `${missing}.`] },
    ],
    nextSteps: [
      "Resolve each Prepare or Stop condition with evidence, an accountable owner and a reassessment point.",
      "Carry a Proceed workflow into the appropriate IDAO stage; readiness does not set authority.",
      "Use Agent Authority separately for each consequential Knowledge, Decision or Action handover.",
    ],
    limitations: [
      "The six-condition structure, answer definitions and Proceed / Prepare / Stop logic are Cognirise proprietary method content.",
      "This personal report was generated locally. Scope, evidence, owners and dates were not submitted to Cognirise or analytics.",
      "Method version: Agentic Operations Readiness Framework · current public questionnaire.",
    ],
  };
}

export function createAuthorityPulseReport(result: AssessmentResult): PulseReport {
  return {
    methodId: "agent-authority",
    title: "Agent Authority Control Brief",
    eyebrow: "Cognirise Pulse · Handover assessment",
    summary: result.handoverDescription,
    resultLabel: `${result.handoverType} handover · E${result.eBand}`,
    resultDetail: result.aboveCeiling
      ? "The requested authority is above the calculated ceiling and is valid only when carried by the approved artefact or control."
      : "The requested authority is within the calculated ceiling for this handover.",
    imagePath: "/images/cognirise/method-haom-v2.jpg",
    filename: "cognirise-agent-authority-control-brief.pdf",
    sections: [
      {
        heading: "Calculated authority",
        answers: [
          { label: "Reversibility", value: `R${result.rScore} · ${REVERSIBILITY_LABELS[result.rScore]}` },
          { label: "Reach", value: `H${result.hScore} · ${REACH_LABELS[result.hScore]}` },
          { label: "Exposure band", value: `E${result.eBand}` },
          { label: "Permitted ceiling", value: OVERSIGHT_LABELS[result.ceiling] },
          { label: "Requested authority", value: OVERSIGHT_LABELS[result.requestedOversight] },
          { label: "Comparison", value: result.aboveCeiling ? "Above the ceiling; approved artefact required." : "Within the permitted ceiling." },
        ],
      },
      {
        heading: "Operating controls",
        answers: [
          { label: "Accountable owner", value: result.accountableRole },
          { label: "Intervention window", value: result.interventionWindow || "Not required at this ceiling." },
          { label: "Promotion evidence", value: result.promotionEvidence },
          { label: "Automatic demotion", value: result.automaticDemotion },
          { label: "Additional artefact / control", value: result.artefactRequired ? result.artefact! : "Not required for the requested authority." },
        ],
      },
      {
        heading: "Control instruction",
        paragraphs: [
          `Permit this ${result.handoverType.toLowerCase()} handover no further than ${result.ceiling}. ${result.aboveCeiling ? `The requested authority is only valid when carried by the approved ${result.artefact}.` : "The requested authority is within the calculated ceiling."} The ${result.accountableRole} owns promotion evidence and must demote authority automatically when: ${result.automaticDemotion}`,
        ],
      },
    ],
    nextSteps: [
      "Carry this control brief into the operating design for the one assessed handover.",
      "Reassess when the reach, reversibility, intervention window, artefact or accountable role changes.",
      "Repeat the assessment for every other consequential handover; this brief does not set a ceiling for an entire agent.",
    ],
    limitations: [
      "The questionnaire, calculation, exposure bands and authority rules are the approved Agent Authority Model and are unchanged.",
      "This report was generated locally from this page. Answers were not sent to Cognirise or stored in the browser.",
      "Method version: Agent Authority Model · current public questionnaire.",
    ],
  };
}

export function createPrioritizationResultsPdf(useCases: UseCase[]): Uint8Array {
  return createPulseReportPdf(createPrioritizationPulseReport(useCases));
}

export async function downloadPrioritizationResultsPdf(useCases: UseCase[]): Promise<void> {
  await downloadPulseReportPdf(createPrioritizationPulseReport(useCases));
}

export function createReadinessResultsPdf(input: ReadinessReportInput): Uint8Array {
  return createPulseReportPdf(createReadinessPulseReport(input));
}

export async function downloadReadinessResultsPdf(input: ReadinessReportInput): Promise<void> {
  await downloadPulseReportPdf(createReadinessPulseReport(input));
}

export function createAuthorityResultsPdf(result: AssessmentResult): Uint8Array {
  return createPulseReportPdf(createAuthorityPulseReport(result));
}

export async function downloadAuthorityResultsPdf(result: AssessmentResult): Promise<void> {
  await downloadPulseReportPdf(createAuthorityPulseReport(result));
}