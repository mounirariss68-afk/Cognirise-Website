import React from "react";
import { useTelecomData } from "./TelecomData";

const labels = { target: "Illustrative KPI target", unresolved: "KPI under review", reported: "Reported telco outcome" };
export function CompactMetric({ id }: { id: string }) {
  const pov = useTelecomData();
  const metric = pov.metrics.find(item => item.id === id);
  if (!metric) return null;
  return <div className={`tv-metric tv-metric--${metric.classification}`}>
    <span className="tv-metric-name">{metric.name}</span>
    {metric.value && <strong className="tv-metric-value">{metric.value}</strong>}
    <span className="tv-metric-class">{labels[metric.classification]} · {metric.context}</span>
    <span className="tv-metric-class">{metric.definition}</span>
    {metric.classification === "reported" && metric.source && <a className="tv-metric-class" href={metric.source.url} target="_blank" rel="noreferrer">Source: {metric.source.operator}, {metric.source.date} — {metric.source.scope}</a>}
  </div>;
}
