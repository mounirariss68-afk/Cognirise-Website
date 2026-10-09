export const MATURITY_STAGES = [
  { score: 1, name: "Exploring", test: "Opportunities are discussed, but value and ownership are not yet shown." },
  { score: 2, name: "Proving", test: "Selected use cases can produce evidence in controlled conditions." },
  { score: 3, name: "Activating", test: "Evidence is turned into adopted workflows with named controls and owners." },
  { score: 4, name: "Operating", test: "AI systems run reliably, are measured, and improve through managed feedback." },
  { score: 5, name: "Scaling", test: "The organisation reuses its foundations and operating practices again and again to keep the value." },
] as const;

export const MATURITY_DIMENSIONS = [
  { id: "value", name: "Value strategy", summary: "Every AI investment starts from a measurable outcome with a named owner.", question: "How often does AI investment begin with a measurable operating outcome?", evidence: "Named outcome owner, baseline, value hypothesis and review cadence.", improveAction: "Choose one material outcome, set its baseline and name the executive owner.", sustainAction: "Re-check outcome baselines and ownership as the portfolio changes; stop work whose value case no longer holds." },
  { id: "portfolio", name: "Use-case portfolio", summary: "Opportunities are compared, stopped and sequenced as one portfolio.", question: "How often are opportunities compared, stopped and sequenced as a portfolio?", evidence: "Visible opportunity register, selection criteria, stop decisions and dependency map.", improveAction: "Score current opportunities by value, feasibility, time to evidence, friction, control cost and reuse.", sustainAction: "Challenge the portfolio order and the stop decisions against fresh evidence, dependencies and reuse." },
  { id: "platform", name: "Data and platform readiness", summary: "Teams can reach approved data, tools and reusable production services.", question: "How reliably can teams reach approved data, tools and reusable production services?", evidence: "Approved access paths, quality measures, reusable interfaces and production support ownership.", improveAction: "Map the data and tool access the highest-value workflow needs and close its first blocking gap.", sustainAction: "Test whether reused data and platform services keep their quality, access controls and named support owners at scale." },
  { id: "operating", name: "Operating model", summary: "Delivery, product, operations, technology and risk share responsibility for the result.", question: "How clearly do delivery, product, operations, technology and risk share responsibility?", evidence: "Named decision rights, cross-functional team, acceptance gates and service ownership.", improveAction: "Name the team that owns the path from evidence through to operation, including its decision rights.", sustainAction: "Rehearse the shared decision rights through one failure, exception or major change before the next scale step." },
  { id: "workforce", name: "Workforce adoption", summary: "Real work has changed, not only the tools, the training or the communications.", question: "How much has real work changed, not only tools, training or communications?", evidence: "Redesigned roles, workflow measures, capability plans, adoption signals and feedback.", improveAction: "Redesign one role and handover around the target workflow, then measure use and operating impact.", sustainAction: "Check whether adoption and role measures still reflect useful work rather than tool use, then address the weakest team signal." },
  { id: "governance", name: "Authority and oversight", summary: "Authority, oversight, exceptions and fallback are set for each AI handover.", question: "How explicitly are authority, oversight, exceptions and fallback set for each AI handover?", evidence: "Handover inventory, authority ceilings, monitoring, exception path and automatic demotion.", improveAction: "Apply the Agent Authority Model to the highest-exposure handover and define its fallback.", sustainAction: "Reassess the highest-exposure handovers and prove that fallback, intervention and automatic demotion still work." },
  { id: "outcomes", name: "Measured outcomes", summary: "Leaders can connect live AI operation to business and service outcomes that last.", question: "How credibly can leaders connect live AI operation to lasting business and service outcomes?", evidence: "Operational baseline, outcome trend, control indicators, adoption measures and benefit owner.", improveAction: "Create one outcome ledger that links operating, adoption and control measures to the value hypothesis.", sustainAction: "Audit the outcome ledger for attribution drift and confirm that operating, adoption and control measures still predict value." },
] as const;

export type DimensionId = (typeof MATURITY_DIMENSIONS)[number]["id"];
export type MaturityAnswers = Partial<Record<DimensionId, number>>;

export function calculateMaturity(answers: MaturityAnswers) {
  const dimensions = MATURITY_DIMENSIONS.map((dimension) => ({
    ...dimension,
    score: answers[dimension.id] ?? 0,
    action: (answers[dimension.id] ?? 0) >= 4 ? dimension.sustainAction : dimension.improveAction,
  }));
  const answered = dimensions.filter((dimension) => dimension.score > 0);
  const average = answered.length ? answered.reduce((sum, dimension) => sum + dimension.score, 0) / answered.length : 0;
  const stageScore = Math.max(1, Math.min(5, Math.round(average))) as 1 | 2 | 3 | 4 | 5;
  const priorities = dimensions
    .filter((dimension) => dimension.score > 0)
    .sort((left, right) => left.score - right.score)
    .slice(0, average >= 4 ? 3 : 5);
  return { dimensions, average, stage: MATURITY_STAGES[stageScore - 1], priorities };
}
