import {
  calculateMaturity,
  MATURITY_DIMENSIONS,
  MATURITY_STAGES,
  type MaturityAnswers,
} from "./value-to-scale";
import {
  createPulseReportPdf,
  downloadPulseReportPdf,
  type PulseReport,
} from "./pulse-report-pdf";

function isCompleteAnswers(answers: MaturityAnswers): boolean {
  return MATURITY_DIMENSIONS.every((dimension) => {
    const score = answers[dimension.id];
    return Number.isInteger(score) && (score ?? 0) >= 1 && (score ?? 0) <= 5;
  });
}

export function createVtsPulseReport(answers: MaturityAnswers): PulseReport {
  if (!isCompleteAnswers(answers)) {
    throw new Error("Complete all seven assessment dimensions before downloading your results.");
  }
  const result = calculateMaturity(answers);
  return {
    methodId: "value-to-scale",
    title: "AI Value-to-Scale",
    eyebrow: "Cognirise Pulse · Directional assessment",
    summary: "A personal evidence map for deciding what your organisation needs to earn next.",
    resultLabel: `${result.stage.name} · ${result.average.toFixed(1)} / 5`,
    resultDetail: `${result.stage.test} The label is a summary, not the decision: the dimension pattern and missing evidence determine the next work.`,
    imagePath: "/images/cognirise/method-vts-v2.jpg",
    filename: "cognirise-value-to-scale-results.pdf",
    sections: [
      {
        heading: "Your seven answers",
        answers: result.dimensions.map((dimension, index) => {
          const selectedStage = MATURITY_STAGES[dimension.score - 1];
          return {
            label: `${index + 1}. ${dimension.name} — ${dimension.score} / 5 · ${selectedStage.name}`,
            value: selectedStage.test,
            detail: `Evidence prompt: ${dimension.evidence}`,
          };
        }),
      },
      {
        heading: "Priorities, evidence and next actions",
        answers: result.priorities.map((item, index) => ({
          label: `${String(index + 1).padStart(2, "0")} · ${item.name} (${item.score} / 5)`,
          value: `Evidence check: ${item.score >= 4 ? "revalidate" : "confirm"} ${item.evidence.toLowerCase()}`,
          detail: `Next action: ${item.action}`,
        })),
      },
    ],
    nextSteps: [
      "Use the lowest-scoring dimensions to choose the next evidence review, not to claim a maturity benchmark.",
      "Optionally take the separate Value Scan when a facilitated value and delivery conversation is useful.",
      "Reassess after the evidence, ownership or operating context changes.",
    ],
    limitations: [
      "This is a planning tool, not an audit, a certification or a benchmark.",
      "Answers are generated locally from this page and are not sent to Cognirise or included in the separate Value Scan form.",
      "Method version: AI Value-to-Scale · current public questionnaire.",
    ],
  };
}

/**
 * Synchronous, dependency-free form retained for focused unit tests and
 * non-browser callers. The download action below uses the image-enabled
 * asynchronous variant so client reports receive the cinematic cover.
 */
export function createVtsResultsPdf(answers: MaturityAnswers): Uint8Array {
  return createPulseReportPdf(createVtsPulseReport(answers));
}

export async function downloadVtsResultsPdf(answers: MaturityAnswers): Promise<void> {
  await downloadPulseReportPdf(createVtsPulseReport(answers));
}