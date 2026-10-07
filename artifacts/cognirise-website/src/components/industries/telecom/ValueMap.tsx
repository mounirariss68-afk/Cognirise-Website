import React from "react";
import { useTelecomData } from "./TelecomData";
import type { TelecomPov } from "@workspace/api-zod";

const labels: Record<string, string> = { reported: "Reported operator outcome", target: "Illustrative KPI target", unresolved: "KPI under review" };
function Metric({ id }: { id: string }) {
  const data = useTelecomData();
  const metric = data.metrics.find(item => item.id === id);
  if (!metric) return null;
  return <div className={`vm-metric vm-${metric.classification}`}>
    <div className="vm-metric-head"><strong>{metric.name}</strong><span>{labels[metric.classification]}</span></div>
    {metric.value && <b className="vm-metric-value">{metric.value}</b>}
    <p className="vm-definition">{metric.definition}</p><p>{metric.context}</p>
    {metric.source && <small><a href={metric.source.url} target="_blank" rel="noreferrer">Source: {metric.source.operator}, {metric.source.date}</a></small>}
  </div>;
}

export function ValueMap() {
  const data = useTelecomData();
  const [selected, setSelected] = React.useState(0);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const pool = data.valuePools[selected];
  return <section className="telecom-exploration vm">
    <header className="vm-header">
      <div><span className="vm-kicker">Telecom value pools</span><h2>Six distinct telecom<br />value pools.</h2></div>
      <p>An equal-weight view of work across the enterprise around the network. The pools are distinct, not ranked or measured on one scale.</p>
    </header>
    <section className="vm-layout" aria-label="Six telecom value pools around the enterprise and network">
      <div className="vm-map">
        <svg className="vm-links vm-links-desktop" viewBox="0 0 720 460" preserveAspectRatio="none" aria-hidden="true">
          <path d="M270 211 L110 98 M360 190 L360 98 M450 211 L610 98 M270 249 L110 344 M360 270 L360 344 M450 249 L610 344" />
        </svg>
        <svg className="vm-links vm-links-mobile" viewBox="0 0 360 600" preserveAspectRatio="none" aria-hidden="true">
          <path d="M180 72 C180 95 90 95 90 128 M180 72 C180 95 270 95 270 128 M180 72 C180 175 90 175 90 278 M180 72 C180 175 270 175 270 278 M180 72 C180 255 90 255 90 428 M180 72 C180 255 270 255 270 428" />
        </svg>
        <div className="vm-core"><span>Business around</span><strong>the network</strong><small>Shared operating context</small></div>
        {data.valuePools.map((item, index) => <button
          key={item.title} data-testid={`value-pool-${index}`}
          type="button"
          className={`vm-node vm-node-${index} ${selected === index ? "is-selected" : ""} ${hovered === index ? "is-preview" : ""}`}
          aria-pressed={selected === index}
          aria-controls="vm-selected-pool"
          onMouseEnter={() => setHovered(index)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(index)}
          onBlur={() => setHovered(null)}
          onClick={() => setSelected(index)}
        ><span className="vm-node-n">{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><span className="vm-node-arrow" aria-hidden="true">↗</span></button>)}
        <p className="vm-map-caption">Conceptual relationships only · equal node and line weight</p>
      </div>
      <article className="vm-detail" id="vm-selected-pool" aria-live="polite">
        <span className="vm-detail-index">POOL {String(selected + 1).padStart(2, "0")} <i /></span>
        <h3>{pool.title}</h3>
        <p className="vm-body">{pool.body}</p>
        <div className="vm-kpi-label"><span>KPI lens</span><b>Scope before comparison</b></div>
        <div className="vm-metrics">{pool.metricIds.map((id) => <Metric key={id} id={id} />)}</div>
        <div className="vm-note"><strong>Reading the figures</strong><p>{data.note}</p></div>
      </article>
    </section>
  </section>;
}
