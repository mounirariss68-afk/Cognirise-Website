import { z } from "zod";

const text = z.string().trim().min(1);
const item = z.object({ title: text, body: text });
export const telecomMetricSchema = z.object({
  id: text,
  name: text,
  definition: text,
  classification: z.enum(["reported", "target", "unresolved"]),
  value: text.optional(),
  context: text,
  source: z.object({
    url: z.string().url(), operator: text, date: text, scope: text,
    measurementBasis: text, attribution: text,
  }).optional(),
}).superRefine((metric, ctx) => {
  if (metric.classification !== "unresolved" && !metric.value)
    ctx.addIssue({ code: "custom", path: ["value"], message: "A classified figure requires a value." });
  if (metric.classification === "reported" && !metric.source)
    ctx.addIssue({ code: "custom", path: ["source"], message: "Reported outcomes require exact operator evidence." });
  if (metric.classification === "unresolved" && metric.value)
    ctx.addIssue({ code: "custom", path: ["value"], message: "Unresolved figures belong in the private review inventory, not public content." });
});
export const telecomPovSchema = z.object({
  version: z.literal(1),
  note: text,
  valuePools: z.array(item.extend({ metricIds: z.array(text) })).length(6),
  candidates: z.array(z.object({
    id: text, title: text, valueHypothesis: text, readiness: text,
    dependencies: text, authority: text, validation: text,
    valuePosition: z.number().min(0).max(100), feasibilityPosition: z.number().min(0).max(100),
  })).length(8),
  departments: z.array(z.object({
    id: text, title: text, domain: z.enum(["Business", "Operations", "Foundations"]),
    challenge: text, roles: z.array(item).min(1), systems: text,
    actions: text, controls: text, metricIds: z.array(text).min(1),
  })).length(18),
  architecture: z.object({ orchestration: text, domains: text, foundation: text, execution: text }),
  scenarios: z.array(z.object({
    id: text, title: text, departmentId: text, owner: text, boundary: text,
    auditRecovery: text, metricIds: z.array(text),
    stages: z.object({ detect: text, investigate: text, propose: text, approveExecute: text, verify: text }),
  })).length(8),
  rafm: z.object({ title: text, body: text, scenarioIds: z.array(text).min(1) }),
  adaptations: z.array(item.extend({ constraints: text, metricIds: z.array(text) })).length(8),
  capabilityRange: z.array(item.extend({ controls: text, appropriate: text })).length(5),
  delivery: z.object({ innovate: text, demonstrate: text, activate: text, operate: text }),
  marketConstraints: text,
  entryPoints: z.array(item).min(1),
  metrics: z.array(telecomMetricSchema).min(1),
  reviewBlockers: z.array(text),
}).superRefine((pov, ctx) => {
  const unique = (rows: { id: string }[], path: string) => {
    if (new Set(rows.map(x => x.id)).size !== rows.length)
      ctx.addIssue({ code: "custom", path: [path], message: "Identifiers must be unique." });
  };
  unique(pov.metrics, "metrics"); unique(pov.departments, "departments");
  unique(pov.scenarios, "scenarios"); unique(pov.candidates, "candidates");
  const metrics = new Set(pov.metrics.map(x => x.id));
  for (const group of ["valuePools", "departments", "scenarios", "adaptations"] as const)
    pov[group].forEach((row, index) => row.metricIds.forEach(id => {
      if (!metrics.has(id)) ctx.addIssue({ code: "custom", path: [group, index, "metricIds"], message: `Unknown metric ${id}` });
    }));
  pov.scenarios.forEach((row, index) => {
    if (!pov.departments.some(d => d.id === row.departmentId))
      ctx.addIssue({ code: "custom", path: ["scenarios", index, "departmentId"], message: "Unknown department." });
  });
  if (pov.rafm.scenarioIds.some(id => !pov.scenarios.some(s => s.id === id)))
    ctx.addIssue({ code: "custom", path: ["rafm", "scenarioIds"], message: "Unknown scenario." });
});
export type TelecomPov = z.infer<typeof telecomPovSchema>;
