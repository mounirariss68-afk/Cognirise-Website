import React from "react";
import "./_group.css";
import "./ValueEditorial.css";
import content from "./_shared/content.json";

const data = content.telecomPov;
type TelecomMetric = (typeof data.metrics)[number] & {
  source?: { operator: string; date: string; url: string; scope?: string };
};
const metricById = new Map<string, TelecomMetric>(
  data.metrics.map((metric): [string, TelecomMetric] => [metric.id, metric as TelecomMetric]),
);
const classification: Record<string, string> = { reported: "Reported operator outcome", target: "Illustrative KPI target", unresolved: "KPI under review" };

function Metric({ id }: { id: string }) {
  const metric = metricById.get(id);
  if (!metric) return null;
  return <div className={`ve-metric ve-${metric.classification}`}>
    <div className="ve-meta"><span>{classification[metric.classification]}</span>{metric.value && <strong>{metric.value}</strong>}</div>
    <h3>{metric.name}</h3><p>{metric.definition}</p><p className="ve-context">{metric.context}</p>
    {metric.source && <small>Source: {metric.source.operator}, {metric.source.date} · {metric.source.scope}</small>}
  </div>;
}

export function ValueEditorial() {
  const [active, setActive] = React.useState(1);
  const pool = data.valuePools[active];
  return <main className="telecom-exploration ve">
    <div className="ve-topline"><span>Option B · Value pools</span><span>Six distinct questions, one at a time</span></div>
    <header className="ve-header">
      <div><span className="ve-kicker">Enterprise value, in working terms</span><h1>Choose the work.<br /><em>Then define the measure.</em></h1></div>
      <p>Each pool is a different operating conversation. Select one to see the work it contains and the KPI lens that could make it testable.</p>
    </header>
    <section className="ve-explorer">
      <nav className="ve-index" aria-label="Choose a telecom value pool">
        <div className="ve-index-label"><span>THE SIX POOLS</span><span>01—06</span></div>
        {data.valuePools.map((item, index) => <button key={item.title} type="button" aria-pressed={active === index} aria-controls="ve-detail" onClick={() => setActive(index)} className={active === index ? "active" : ""}>
          <span className="ve-number">{String(index + 1).padStart(2, "0")}</span><span className="ve-name">{item.title}</span><span className="ve-arrow" aria-hidden="true">↗</span>
        </button>)}
        <p className="ve-index-note">Equal footing. No common numeric scale.</p>
      </nav>
      <article className="ve-feature" id="ve-detail" aria-live="polite">
        <div className="ve-feature-head">
          <span className="ve-counter">{String(active + 1).padStart(2, "0")} <i /> 06</span>
          <span className="ve-tag">Selected opportunity</span>
        </div>
        <h2>{pool.title}</h2>
        <p className="ve-description">{pool.body}</p>
        <div className="ve-rule"><span>What to measure</span><b>Scope and baseline first</b></div>
        <div className="ve-kpis">{pool.metricIds.map((id) => <Metric key={id} id={id} />)}</div>
        <aside className="ve-source-note"><b>Figures are not delivery claims.</b> {data.note}</aside>
      </article>
    </section>
  </main>;
}
