export type RScore = 1 | 2 | 3 | 4;
export type HScore = 1 | 2 | 3 | 4 | 5;
export type EBand = 1 | 2 | 3 | 4 | 5;
export type Oversight =
  | "out-of-loop"
  | "on-loop"
  | "in-loop"
  | "in-loop-second"
  | "in-loop-external";

export const OVERSIGHT_ORDER = [
  "out-of-loop",
  "on-loop",
  "in-loop",
  "in-loop-second",
  "in-loop-external",
] as const satisfies readonly Oversight[];

export const OVERSIGHT_LABELS: Record<Oversight, string> = {
  "out-of-loop": "Out of the loop",
  "on-loop": "On the loop, with a stated intervention window",
  "in-loop": "In the loop",
  "in-loop-second": "In the loop + independent second control",
  "in-loop-external": "In the loop + external safety sign-off",
};

export const REVERSIBILITY_LABELS: Record<RScore, string> = {
  1: "We change it. No one noticed.",
  2: "We undo it ourselves, inside a known window.",
  3: "Another party must cooperate to undo it.",
  4: "It cannot be undone — sent, paid, published, filed, or acted on.",
};

export const REACH_LABELS: Record<HScore, string> = {
  1: "Only our own people.",
  2: "One named customer, patient, or citizen.",
  3: "A record a regulator can inspect.",
  4: "Anyone can see it, or an unnamed population.",
  5: "Physical safety, health, or an essential service.",
};

export function getEBand(rScore: RScore, hScore: HScore): EBand {
  if (hScore === 5) return 5;
  if (hScore === 4) return 4;
  if (rScore === 4 || hScore === 3) return 3;
  if (rScore === 3 || hScore === 2) return 2;
  return 1;
}

export function getCeiling(eBand: EBand): Oversight {
  return OVERSIGHT_ORDER[eBand - 1];
}

export function isRequestedAboveCeiling(requested: Oversight, ceiling: Oversight): boolean {
  return OVERSIGHT_ORDER.indexOf(requested) < OVERSIGHT_ORDER.indexOf(ceiling);
}