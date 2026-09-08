import {
  type EBand,
  type HScore,
  type Oversight,
  type RScore,
  getCeiling,
  getEBand,
  isRequestedAboveCeiling,
} from "@workspace/api-zod";

export {
  type EBand,
  type HScore,
  type Oversight,
  type RScore,
  OVERSIGHT_LABELS,
  OVERSIGHT_ORDER,
  REACH_LABELS,
  REVERSIBILITY_LABELS,
  getCeiling,
  getEBand,
  isRequestedAboveCeiling,
} from "@workspace/api-zod";

export type HandoverType = "Knowledge" | "Decision" | "Action";

export interface AssessmentData {
  handoverDescription?: string;
  handoverType?: HandoverType;
  rScore?: RScore;
  hScore?: HScore;
  requestedOversight?: Oversight;
  interventionWindow?: string;
  artefact?: string;
  accountableRole?: string;
  promotionEvidence?: string;
  automaticDemotion?: string;
}

export interface AssessmentResult {
  handoverDescription: string;
  handoverType: HandoverType;
  rScore: RScore;
  hScore: HScore;
  eBand: EBand;
  ceiling: Oversight;
  requestedOversight: Oversight;
  aboveCeiling: boolean;
  artefactRequired: boolean;
  artefact?: string;
  interventionWindow?: string;
  accountableRole: string;
  promotionEvidence: string;
  automaticDemotion: string;
}

export function isRoleVague(role: string): boolean {
  const value = role.trim().toLowerCase();
  if (value.length < 4) return true;
  if (/\b(team|squad|pod|department|group|committee|everyone|business)\b/.test(value)) {
    return true;
  }
  return /^(operations|engineering|product|risk|compliance|management|leadership)$/.test(value);
}

export function getAssessmentErrors(data: AssessmentData): string[] {
  const errors: string[] = [];
  if (!data.handoverDescription?.trim()) errors.push("Describe the one handover being assessed.");
  if (!data.handoverType) errors.push("Classify the handover as Knowledge, Decision, or Action.");
  if (!data.rScore) errors.push("Choose a reversibility answer, including R1 when there is no external effect.");
  if (!data.hScore) errors.push("Choose who is affected, including H1 when only your own people are affected.");
  if (!data.requestedOversight) errors.push("Choose the authority requested for this handover.");

  if (data.rScore && data.hScore && data.requestedOversight) {
    const ceiling = getCeiling(getEBand(data.rScore, data.hScore));
    if (
      (ceiling === "on-loop" || data.requestedOversight === "on-loop") &&
      !data.interventionWindow?.trim()
    ) {
      errors.push("State the intervention window for on-the-loop operation.");
    }
    if (
      isRequestedAboveCeiling(data.requestedOversight, ceiling) &&
      !data.artefact?.trim()
    ) {
      errors.push("Name the approved artefact or control that carries authority above the ceiling.");
    }
  }

  if (!data.accountableRole?.trim()) {
    errors.push("Name the accountable owner by role.");
  } else if (isRoleVague(data.accountableRole)) {
    errors.push("A team or function name is not an accountable role.");
  }
  if (!data.promotionEvidence?.trim()) errors.push("State the evidence required before authority can climb.");
  if (!data.automaticDemotion?.trim()) errors.push("State the condition that automatically demotes authority.");
  return errors;
}

export function evaluateAssessment(data: AssessmentData): AssessmentResult | null {
  if (getAssessmentErrors(data).length > 0) return null;

  const handoverDescription = data.handoverDescription!.trim();
  const handoverType = data.handoverType!;
  const rScore = data.rScore!;
  const hScore = data.hScore!;
  const requestedOversight = data.requestedOversight!;
  const eBand = getEBand(rScore, hScore);
  const ceiling = getCeiling(eBand);
  const aboveCeiling = isRequestedAboveCeiling(requestedOversight, ceiling);

  return {
    handoverDescription,
    handoverType,
    rScore,
    hScore,
    eBand,
    ceiling,
    requestedOversight,
    aboveCeiling,
    artefactRequired: aboveCeiling,
    artefact: data.artefact?.trim() || undefined,
    interventionWindow: data.interventionWindow?.trim() || undefined,
    accountableRole: data.accountableRole!.trim(),
    promotionEvidence: data.promotionEvidence!.trim(),
    automaticDemotion: data.automaticDemotion!.trim(),
  };
}