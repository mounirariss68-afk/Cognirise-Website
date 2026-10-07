import React from "react";
import { ExternalLink } from "lucide-react";
import type { TelecomPov } from "@workspace/api-zod";
type Metric = TelecomPov["metrics"][number];
const F = "content.telecomPov";
const CLASS_LABEL = {reported: "Reported telco outcome", target: "Illustrative KPI target", unresolved: "KPI under review"};
export const MetricsContext = React.createContext<Map<string, Metric>>(new Map());

function MetricChip({ id, detailed = false }: { id: string; detailed?: boolean }) {
  const metrics = React.useContext(MetricsContext);
  const metric = metrics.get(id);
  if (!metric) return null;
  const mi = [...metrics.keys()].indexOf(id);
  const mf = `${F}.metrics.${mi}`;
  return <span className={`tc-metric tc-metric--${metric.classification}`} data-testid={`metric-${metric.id}`} data-metric-classification={metric.classification}>
    <span className="tc-metric-name" data-cms-field={`${mf}.name`}>{metric.name}</span>
    {metric.value && <strong className="tc-metric-value" data-cms-field={`${mf}.value`}>{metric.value}</strong>}
    <span className="tc-metric-class">{CLASS_LABEL[metric.classification]}</span>
    {metric.classification === "reported" && metric.source && <a className="tc-metric-cite" href={metric.source.url} target="_blank" rel="noreferrer">{metric.source.operator}, {metric.source.date}<span className="sr-only"> (opens source)</span> <ExternalLink size={11} aria-hidden="true" /></a>}
    {detailed && <span className="tc-metric-context">{metric.definition} {metric.context}{metric.source ? ` Scope: ${metric.source.scope}. Basis: ${metric.source.measurementBasis}. ${metric.source.attribution}` : ""}</span>}
  </span>;
}

export function MetricList({ ids, detailed }: { ids: string[]; detailed?: boolean }) {
  if (!ids.length) return null;
  return <div className="tc-metric-list">{ids.map((id) => <MetricChip key={id} id={id} detailed={detailed} />)}</div>;
}

