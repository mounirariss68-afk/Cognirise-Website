import React from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown, ExternalLink, Search } from "lucide-react";
import type { TelecomPov } from "@workspace/api-zod";
import { BrandButton } from "@/components/ui/brand-button";
import { assetUrl } from "@/lib/assets";
import { marketAwareDestination } from "@/lib/marketDestination";
import { useMarketStore, type Market } from "@/store/market";
import type { IndustryContent } from "@/content/industries";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { industryStyles } from "@/components/industries/IndustryEditorial";

import { TelecomDataProvider } from "./telecom/TelecomData";
import { ValueMap } from "./telecom/ValueMap";
import { PriorityMap } from "./telecom/PriorityMap";
import { WorkforceMap } from "./telecom/WorkforceMap";
import { ArchitectureTrace } from "./telecom/ArchitectureTrace";
import { WorkflowLanes } from "./telecom/WorkflowLanes";
import { InvestigationPaths } from "./telecom/InvestigationPaths";

type Metric = TelecomPov["metrics"][number];
type Scenario = TelecomPov["scenarios"][number];
type Department = TelecomPov["departments"][number];
const F = "content.telecomPov";
const DOMAINS = ["Business", "Operations", "Foundations"] as const;
const STAGES = [
  ["detect", "Detect"], ["investigate", "Investigate"], ["propose", "Propose"],
  ["approveExecute", "Approve / execute"], ["verify", "Verify"],
] as const;
const CLASS_LABEL: Record<Metric["classification"], string> = {
  reported: "Reported telco outcome",
  target: "Illustrative KPI target",
  unresolved: "KPI under review",
};
export const TELECOM_FIGURES_NOTE = "Figures are sourced outcomes reported at other operators or illustrative KPI targets. They are not Cognirise delivery results or guarantees; applicability depends on operator context.";

const MetricsContext = React.createContext<Map<string, Metric>>(new Map());

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

function MetricList({ ids, detailed }: { ids: string[]; detailed?: boolean }) {
  if (!ids.length) return null;
  return <div className="tc-metric-list">{ids.map((id) => <MetricChip key={id} id={id} detailed={detailed} />)}</div>;
}

export function TelecomEditorial({ view, marketOverride }: { view: IndustryContent; marketOverride?: Market }) {
  const store = useMarketStore();
  const market = marketOverride ?? store.market;
  const pov = view.telecomPov as TelecomPov;
  const href = (path: string) => marketAwareDestination(path, market, store.locale);
  const metrics = React.useMemo(() => new Map(pov.metrics.map((m) => [m.id, m])), [pov.metrics]);
  const imageSource = /^https?:\/\//.test(view.image) ? view.image : assetUrl(view.image);
  const thesisParts = view.thesis.split(" — ");
  const opportunityValue = view.opportunity as unknown as string | { title: string; body: string };
  const opportunity = typeof opportunityValue === "string" ? { title: "The enterprise around the network", body: opportunityValue } : opportunityValue;
  const marketLabel = market.toUpperCase();
  const heroKicker = cleanHeroIdentifier(`${marketLabel} / ${view.name}`, { marketLocation: marketLabel });
  const reportedSources = pov.metrics.filter((m) => m.classification === "reported" && m.source);

  return (
    <TelecomDataProvider value={pov}><MetricsContext.Provider value={metrics}>
      <main className={`industry industry--${view.variant} telecom`} data-telecom-editorial="">
        <style>{industryStyles}{telecomStyles}</style>
        <section className="ind-hero public-hero-shell" style={{ alignItems: "stretch" }} data-industry-section="hero" aria-labelledby="industry-title">
          <div className="ind-copy flex flex-col">
            <div className="flex flex-col gap-7"><NavigationBackControl embedded /><div className="ind-kicker">{heroKicker}</div></div>
            <div className="mt-14 lg:mt-auto">
              <h1 id="industry-title" data-cms-field="content.thesis">{thesisParts.map((part, i) => <React.Fragment key={`${part}-${i}`}>{i > 0 && <> <span className="ind-thesis-dash">—</span> </>}{part}</React.Fragment>)}</h1>
              <p data-cms-field="content.dek">{view.dek}</p>
              <div className="tc-hero-actions">
                <a className="tc-anchor" href="#telecom-workforce" data-testid="link-explore-workforce">Explore the workforce <ChevronDown size={14} aria-hidden="true" /></a>
                <BrandButton href={href("/value-scan")}>Book a value scan</BrandButton>
              </div>
            </div>
          </div>
          <figure className="ind-image"><img src={imageSource} alt={view.imageAlt} /><span>01 / industry perspective</span></figure>
        </section>

        <section className="ind-opportunity tc-opportunity" data-industry-section="opportunity" aria-labelledby="opportunity-title">
          <div><div className="ind-kicker">Industry opportunity</div><h2 id="opportunity-title">{opportunity.title}</h2></div>
          <div><p data-cms-field={typeof opportunityValue === "string" ? "content.opportunity" : undefined}>{opportunity.body}</p></div>
          <div className="telecom-approved" id="telecom-value-pools"><ValueMap /></div>
        </section>

        <section className="ind-pressure" data-industry-section="pressures" aria-labelledby="pressure-title">
          <div><div className="ind-kicker">Operating pressures</div><h2 id="pressure-title">Margin, service and integration pull in different directions.</h2></div>
          <div className="ind-pressure-list">{view.pressures.map((p, i) => <article key={p.title}><span>0{i + 1}</span><div><h3 data-cms-field={`content.pressures.${i}.title`}>{p.title}</h3><p data-cms-field={`content.pressures.${i}.body`}>{p.body}</p></div></article>)}</div>
          <div className="telecom-approved" id="telecom-prioritisation"><PriorityMap /></div>
        </section>

        <section className="ind-capabilities tc-approved-section" data-industry-section="capabilities" aria-label="Enterprise workforce and architecture">
          <div className="telecom-approved" id="telecom-workforce"><WorkforceMap /></div>
          <div className="telecom-approved" id="telecom-architecture"><ArchitectureTrace /></div>
        </section>

        <section className="ind-evidence tc-approved-section" data-industry-section="applications" aria-label="Illustrative telecom workflows">
          <div className="telecom-approved" id="telecom-flagships"><WorkflowLanes /></div>
          <div className="telecom-approved" id="telecom-rafm"><InvestigationPaths /></div>
          <div className="ind-nested-module" id="telecom-adaptations">
            <div className="ind-kicker">Cross-industry adaptations</div>
            <h3>Hypotheses to test, not ready-made plays.</h3>
            <div className="tc-adapt">{pov.adaptations.map((a, i) => <article key={a.title}><h4 data-cms-field={`${F}.adaptations.${i}.title`}>{a.title}</h4><p data-cms-field={`${F}.adaptations.${i}.body`}>{a.body}</p><p className="tc-constraint"><strong>Constraints:</strong> <span data-cms-field={`${F}.adaptations.${i}.constraints`}>{a.constraints}</span></p><MetricList ids={a.metricIds} /></article>)}</div>
          </div>
          <OutcomesMatrix departments={pov.departments} />
        </section>

        <section className="ind-perspective" data-industry-section="perspective" aria-labelledby="perspective-title">
          <CapabilityRange range={pov.capabilityRange} />
          <div className="tc-delivery">
            <div className="ind-kicker">Delivery</div>
            <h3>Innovate. Demonstrate. Activate. Operate.</h3>
            <ol>{(["innovate", "demonstrate", "activate", "operate"] as const).map((k, i) => <li key={k}><span>0{i + 1}</span><h4>{k[0].toUpperCase() + k.slice(1)}</h4><p data-cms-field={`${F}.delivery.${k}`}>{pov.delivery[k]}</p></li>)}</ol>
            <p className="tc-small tc-small--inv">Data and governance work runs through every stage. Milestones depend on scope and are agreed in Innovate. <Link href={href("/methodologies/idao")}>Read the IDAO methodology <ArrowRight size={13} aria-hidden="true" /></Link></p>
          </div>
        </section>

        <section className="ind-gcc" data-industry-section="market" aria-labelledby="market-title">
          <div><div className="ind-kicker">Market context / {marketLabel}</div><h2 id="market-title">Deployment follows the edition's rules.</h2></div>
          <div className="tc-market"><p data-cms-field="content.gcc">{view.gcc}</p><p data-cms-field={`${F}.marketConstraints`}>{pov.marketConstraints}</p></div>
        </section>

        <section className="ind-sources" data-industry-section="sources" aria-labelledby="sources-title">
          <div className="ind-kicker">Supporting evidence / source trail</div><h2 id="sources-title">Observations, targets and sources.</h2>
          <p className="ind-sources-introduction">{TELECOM_FIGURES_NOTE}</p>
          {reportedSources.length > 0 && <><h3 className="tc-sub">Reported telco outcomes</h3><table className="ind-table"><thead><tr><th scope="col">Metric</th><th scope="col">Figure</th><th scope="col">Operator and scope</th><th scope="col">Source</th></tr></thead><tbody>{reportedSources.map((m) => <tr key={m.id}><th scope="row" data-label="Metric">{m.name}</th><td data-label="Figure">{m.value} <span className="tc-tag">Reported telco outcome</span></td><td data-label="Operator and scope">{m.source!.operator}; {m.source!.scope}; {m.source!.measurementBasis}. {m.source!.attribution}</td><td data-label="Source"><a href={m.source!.url} target="_blank" rel="noreferrer">{m.source!.date} <ExternalLink size={12} aria-hidden="true" /></a></td></tr>)}</tbody></table></>}
          <h3 className="tc-sub">Illustrative KPI targets</h3>
          <p className="tc-small">Targets are agreed in discovery against the operator's baseline and validated in a scoped pilot. They are not achieved results, forecasts or guarantees.</p>
          <MetricList ids={pov.metrics.filter((m) => m.classification !== "reported").map((m) => m.id)} detailed />
          <div className="ind-sources-list">{view.sources.map((s) => <a className="ind-source" href={s.url} target="_blank" rel="noreferrer" key={s.url}><strong>{s.label}</strong><span>{s.publisher}</span><span>{s.kind}</span><ExternalLink size={15} aria-hidden="true" /></a>)}</div>
          <Link className="ind-case-link" href={href("/industries#selected-work")}>Explore consolidated industry case studies <ArrowRight size={15} /></Link>
        </section>

        <section className="ind-cta" data-industry-section="cta" aria-labelledby="cta-title">
          <div><div className="ind-kicker">Relevant next action</div><h2 id="cta-title" data-cms-field="content.service.firstMove">{view.service.firstMove}</h2>
            <ul className="tc-entry">{pov.entryPoints.map((e, i) => <li key={e.title}><strong data-cms-field={`${F}.entryPoints.${i}.title`}>{e.title}</strong><span data-cms-field={`${F}.entryPoints.${i}.body`}>{e.body}</span></li>)}</ul>
          </div>
          <aside><Link href={href(view.service.href)}>Relevant service: {view.service.label} <ArrowRight size={14} /></Link><BrandButton href={href("/value-scan")}>Book a value scan</BrandButton></aside>
        </section>
      </main>
    </MetricsContext.Provider></TelecomDataProvider>
  );
}

function OutcomesMatrix({ departments }: { departments: Department[] }) {
  const metrics = React.useContext(MetricsContext);
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [domain, setDomain] = React.useState("all");
  const rows = departments.filter((d) => (domain === "all" || d.domain === domain) && (!q || [d.title, ...d.metricIds.map((m) => metrics.get(m)?.name ?? "")].join(" ").toLowerCase().includes(q.toLowerCase())));
  return <div className="ind-nested-module" id="telecom-outcomes">
    <button type="button" className="tc-expand" aria-expanded={open} aria-controls="telecom-outcomes-table" onClick={() => setOpen(!open)} data-testid="button-toggle-outcomes">Outcomes matrix: {departments.length} departments <ChevronDown size={18} aria-hidden="true" /></button>
    {open && <div id="telecom-outcomes-table">
      <div className="tc-filters">
        <label><Search size={15} aria-hidden="true" /><span className="sr-only">Search departments and KPIs</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search departments or KPIs" data-testid="input-outcomes-search" /></label>
        <label>Domain <select value={domain} onChange={(e) => setDomain(e.target.value)} data-testid="select-outcomes-domain"><option value="all">All domains</option>{DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
        <span aria-live="polite">{rows.length} of {departments.length} shown</span>
      </div>
      {rows.length ? <table className="ind-table tc-out"><caption className="sr-only">Department KPIs with classification</caption><thead><tr><th scope="col">Department</th><th scope="col">Domain</th><th scope="col">KPIs and classification</th></tr></thead><tbody>{rows.map((d) => <tr key={d.id}><th scope="row" data-label="Department">{d.title}</th><td data-label="Domain">{d.domain}</td><td data-label="KPIs"><MetricList ids={d.metricIds} /></td></tr>)}</tbody></table> : <p className="tc-empty">No departments match. <button type="button" onClick={() => { setQ(""); setDomain("all"); }}>Clear filters</button></p>}
    </div>}
  </div>;
}

function CapabilityRange({ range }: { range: TelecomPov["capabilityRange"] }) {
  const [sel, setSel] = React.useState(0);
  const r = range[sel];
  return <div className="tc-range">
    <div className="ind-kicker">Operating-capability range</div>
    <h2 id="perspective-title">Five positions. Choose by exposure, not ambition.</h2>
    <p className="tc-small tc-small--inv">A conceptual range, not an empirical value curve or authority score. More autonomy is not the objective: exposure sets the ceiling and evidence earns authority within it.</p>
    <div className="tc-range-track" role="group" aria-label="Capability positions">{range.map((x, i) => <button key={x.title} type="button" aria-pressed={i === sel} className={i === sel ? "active" : ""} onClick={() => setSel(i)} data-testid={`button-range-${i}`}><span>0{i + 1}</span>{x.title}</button>)}</div>
    <div className="tc-range-detail" aria-live="polite"><h3 data-cms-field={`${F}.capabilityRange.${sel}.title`}>{r.title}</h3><p data-cms-field={`${F}.capabilityRange.${sel}.body`}>{r.body}</p><dl className="tc-dl"><div><dt>Appropriate when</dt><dd data-cms-field={`${F}.capabilityRange.${sel}.appropriate`}>{r.appropriate}</dd></div><div><dt>Controls</dt><dd data-cms-field={`${F}.capabilityRange.${sel}.controls`}>{r.controls}</dd></div></dl></div>
  </div>;
}

const telecomStyles = `
.telecom :is(h1,h2,h3,h4,p,dd,dt,td,th,button,a){overflow-wrap:anywhere;min-width:0}
.telecom :is(section,div,li,dl,figure){min-width:0}
.telecom .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.tc-hero-actions{display:flex;flex-wrap:wrap;gap:22px;align-items:center;margin-top:30px}.tc-anchor{display:inline-flex;gap:6px;align-items:center;font-weight:700;border-bottom:2px solid var(--coral);padding:8px 0;text-decoration:none}
.tc-head{display:grid;grid-template-columns:.72fr 1.28fr;gap:8vw;align-items:end}.tc-head p{color:#536887;line-height:1.6;max-width:560px}
.tc-pools{grid-column:1/-1;margin-top:20px;padding-top:50px;border-top:1px solid #ffffff30}.tc-opportunity .tc-pools p{font-size:16px;line-height:1.6}.tc-opportunity .tc-head p,.tc-opportunity .tc-pool p{color:#c4cee0}.tc-opportunity .tc-note{background:#ffffff10;color:#e6ebf4;border-left-color:var(--coral)}.tc-opportunity .tc-pool-list{border-top-color:#ffffff60}.tc-opportunity .tc-pool{border-bottom-color:#ffffff26}.tc-opportunity .tc-small{color:#9fb0cc}.tc-opportunity .tc-metric-cite{color:#ffb4d9}.tc-pools h3{color:#fff;font-size:clamp(36px,4.4vw,64px);line-height:1;letter-spacing:-.065em;margin:20px 0}
.tc-note{margin:30px 0 0;padding:14px 18px;border-left:3px solid var(--violet);background:var(--soft);color:#405677;font-size:14px;line-height:1.55;max-width:860px}
.tc-pool-list{list-style:none;padding:0;margin:40px 0 0;border-top:1px solid var(--ink)}.tc-pool{display:grid;grid-template-columns:55px 1.1fr 120px 1fr;gap:24px;padding:26px 0;border-bottom:1px solid var(--line);align-items:start}.tc-pool h4{color:#fff;font-size:22px;letter-spacing:-.04em;margin:0 0 8px}.tc-pool p{margin:0;color:#506583;line-height:1.6}.tc-num{color:var(--pink);font-size:11px;letter-spacing:.12em;font-weight:700}.tc-rail{height:2px;margin-top:14px;background:linear-gradient(90deg,var(--violet),var(--pink),var(--coral))}
.tc-small{font-size:13px;color:#647491;line-height:1.55;margin:16px 0 0}.tc-small--inv{color:#c4cee0}.tc-small--inv a{color:#fff;font-weight:700;display:inline-flex;align-items:center;gap:4px}
.tc-metric-list{display:flex;flex-wrap:wrap;gap:8px}.tc-metric{display:inline-flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;padding:7px 10px;border:1px solid var(--line);background:var(--paper);font-size:13px;line-height:1.35;max-width:100%;color:var(--ink)}.tc-metric-value{font-family:Comfortaa;font-size:15px}.tc-metric-class{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 6px}.tc-metric--reported{border-left:3px solid var(--ink)}.tc-metric--reported .tc-metric-class{background:var(--ink);color:#fff}.tc-metric--target{border-style:dashed}.tc-metric--target .tc-metric-class{border:1px dashed var(--pink);color:#a3306f}.tc-metric--unresolved .tc-metric-class{color:#647491;border:1px solid var(--line)}.tc-metric-cite{color:var(--pink);font-size:12px;text-decoration:underline;display:inline-flex;align-items:center;gap:3px}.tc-metric-context{flex-basis:100%;color:#506583;font-size:12.5px}
.tc-matrix-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:24px}.tc-plot{position:relative;aspect-ratio:1;border-left:2px solid var(--ink);border-bottom:2px solid var(--ink);background:linear-gradient(var(--line),var(--line)) 50% 0/1px 100% no-repeat,linear-gradient(var(--line),var(--line)) 0 50%/100% 1px no-repeat;margin:0 0 30px 30px}.tc-q{position:absolute;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#647491;padding:10px}.tc-q--tr{right:0;top:0;color:var(--pink)}.tc-q--tl{left:0;top:0}.tc-q--br{right:0;bottom:0}.tc-q--bl{left:0;bottom:0}.tc-axis{position:absolute;font-size:11px;color:#405677;font-weight:700}.tc-axis--x{bottom:-26px;right:0}.tc-axis--y{left:-28px;top:0;writing-mode:vertical-rl;transform:rotate(180deg)}
.tc-dot{position:absolute;width:44px;height:44px;margin:0 0 -22px -22px;border-radius:50%;border:2px solid var(--ink);background:var(--paper);font-weight:700;color:var(--ink);cursor:pointer;transition:transform .2s ease}.tc-dot.active{background:var(--ink);color:#fff;box-shadow:0 0 0 4px var(--paper),0 0 0 6px var(--coral)}
.tc-cand-list,.tc-scen-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:22px}.tc-cand-list button,.tc-scen-list button,.tc-range-track button,.tc-stages button,.tc-lane button{min-height:44px;border:1px solid var(--line);background:var(--paper);color:var(--ink);padding:8px 12px;text-align:left;cursor:pointer;font:600 13px Inter}.tc-cand-list button span{color:var(--pink);margin-right:6px}.tc-cand-list .active,.tc-scen-list .active,.tc-lane .active,.tc-stages .active{background:var(--ink);color:#fff;border-color:var(--ink)}
.tc-detail h4,.tc-dept h3,.tc-walk h4{font-size:26px;letter-spacing:-.04em;margin:0 0 14px}.tc-detail dl,.tc-dl{margin:0;display:grid;gap:0}.tc-detail dl div,.tc-dl div{display:grid;grid-template-columns:150px 1fr;gap:16px;padding:12px 0;border-top:1px solid var(--line)}dt{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#647491}dd{margin:0;color:#405677;line-height:1.55}
.tc-workforce{display:grid;grid-template-columns:1.1fr 1fr;gap:1px;margin-top:50px;background:var(--line);border:1px solid var(--line);scroll-margin-top:110px}.tc-lanes{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line)}.tc-lane{background:var(--paper);padding:20px;display:flex;flex-direction:column;gap:6px}.tc-lane h3{font-size:16px;margin:0 0 10px;display:flex;justify-content:space-between}.tc-lane h3 span{color:var(--pink);font-family:Inter}.tc-lane button{display:flex;flex-direction:column;gap:2px}.tc-lane small{font-weight:400;font-size:11px;opacity:.75}
.tc-dept{background:var(--paper);padding:32px}.tc-lead{color:#405677;line-height:1.6;font-size:17px;max-width:720px}.tc-dept h4,.tc-arch h4{font-size:14px;letter-spacing:0;margin:22px 0 10px;font-family:Inter;text-transform:uppercase;font-size:11px;letter-spacing:.1em;color:#647491}.tc-roles{list-style:none;padding:0;margin:0;border-top:1px solid var(--line)}.tc-roles li{padding:10px 0;border-bottom:1px solid var(--line);display:grid;gap:3px}.tc-roles span{color:#506583;font-size:14px;line-height:1.5}
.tc-select{display:inline-flex;flex-wrap:wrap;gap:10px;align-items:center;font-weight:700;font-size:13px}.tc-select select,.tc-filters select,.tc-filters input{min-height:44px;border:1px solid var(--ink);background:var(--paper);padding:0 12px;font:14px Inter;color:var(--ink)}
.tc-layers{list-style:none;padding:0;margin:24px 0 0;display:grid;gap:0;border-top:1px solid var(--ink)}.tc-layers li{padding:22px 0 22px 26px;border-bottom:1px solid var(--line);position:relative}.tc-layers li.lit:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--violet),var(--pink),var(--coral))}.tc-layers h4{margin:0 0 6px!important}.tc-layers p{margin:0;color:#405677;line-height:1.55}.tc-route{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.tc-route span{padding:6px 10px;border:1px solid var(--line);font-size:13px}.tc-route .on{border-color:var(--pink);color:#a3306f;font-weight:700}.tc-route-note{margin-top:10px!important}
.tc-walk{margin-top:36px}.tc-walk-body{display:grid;grid-template-columns:.9fr 1.1fr;gap:40px;border-top:1px solid var(--ink);padding-top:28px}.tc-walk-meta p{color:#506583}.tc-walk-meta .tc-metric-list{margin-top:16px}.tc-tag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border:1px dashed var(--pink);color:#a3306f;padding:3px 7px;margin-bottom:10px}
.tc-stages{display:flex;flex-wrap:wrap;gap:4px}.tc-stages button span{color:var(--pink);margin-right:6px;font-size:11px}.tc-stages .active span{color:#ffb4a6}.tc-stage-panel{padding:24px 0;border-bottom:1px solid var(--line)}.tc-stage-panel p{font-size:17px;line-height:1.6;color:#405677;margin:0}.tc-stage-nav{display:flex;gap:10px;margin-top:18px}.tc-stage-nav button,.tc-empty button{min-height:44px;padding:0 14px;border:1px solid var(--ink);background:transparent;color:var(--ink);font-weight:700;cursor:pointer}.tc-stage-nav button:disabled{opacity:.4;cursor:default}
.tc-adapt{display:grid;grid-template-columns:repeat(2,1fr);border-top:1px solid var(--ink)}.tc-adapt article{padding:24px 24px 24px 0;border-bottom:1px solid var(--line)}.tc-adapt h4{font-size:20px;margin:0 0 8px}.tc-adapt p{color:#506583;line-height:1.55;margin:0 0 10px}.tc-constraint{font-size:14px}
.tc-expand{width:100%;display:flex;justify-content:space-between;align-items:center;min-height:60px;border:0;border-block:1px solid var(--ink);background:transparent;font:600 22px Comfortaa;color:var(--ink);cursor:pointer;text-align:left}.tc-expand[aria-expanded=true] svg{transform:rotate(180deg)}.tc-filters{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:22px;font-size:13px;font-weight:700}.tc-filters label{display:inline-flex;gap:8px;align-items:center}.tc-out td:first-of-type{color:#405677;font-weight:400}.tc-empty{padding:30px 0;color:#506583}
.tc-range{margin:0 4.8vw;padding:90px 7% 50px}.tc-range h2{font-size:clamp(35px,4vw,58px);letter-spacing:-.065em;line-height:1;margin:20px 0}.tc-range-track{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;margin-top:32px;background:#ffffff30;position:relative}.tc-range-track button{background:#0b2246;color:#fff;border:0;min-height:90px;display:flex;flex-direction:column;gap:8px;justify-content:flex-end}.tc-range-track button span{color:var(--pink);font-size:11px}.tc-range-track .active{background:#fdfbf7;color:var(--ink)}.tc-range-detail{padding:30px 0}.tc-range-detail h3{font-size:28px;margin:0 0 10px}.tc-range-detail p{color:#d7dfed;line-height:1.6}.tc-range-detail dt{color:#9fb0cc}.tc-range-detail dd{color:#e6ebf4}.tc-range-detail .tc-dl div{border-color:#ffffff30}
.tc-delivery{margin:0 4.8vw;padding:0 7% 90px}.tc-delivery h3{font-size:clamp(28px,3vw,42px);letter-spacing:-.055em;margin:18px 0 28px}.tc-delivery ol{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid;border-image:linear-gradient(90deg,var(--violet),var(--pink),var(--coral)) 1}.tc-delivery li{padding:20px 20px 0 0}.tc-delivery li span{color:var(--pink);font-size:11px;font-weight:700}.tc-delivery h4{font-size:20px;margin:8px 0}.tc-delivery li p{color:#d7dfed;line-height:1.55;margin:0}
.tc-market p{font-size:18px!important}.tc-market p+p{margin-top:20px}.tc-sub{font-size:24px;margin:44px 0 0}.ind-sources .tc-metric-list{margin-top:18px}.tc-entry{list-style:none;padding:0;margin:24px 0 0;display:grid;gap:12px;color:#d7dfed;max-width:760px}.tc-entry li{display:grid;gap:4px;padding-top:12px;border-top:1px solid #ffffff30}.tc-entry strong{color:#fff}
.telecom [id]{scroll-margin-top:110px}
@media(max-width:900px){.tc-head,.tc-matrix-grid,.tc-workforce,.tc-walk-body{grid-template-columns:1fr}.tc-pool{grid-template-columns:40px 1fr}.tc-rail{display:none}.tc-pool .tc-metric-list{grid-column:2}.tc-lanes{grid-template-columns:1fr}.tc-adapt,.tc-delivery ol{grid-template-columns:1fr}.tc-range-track{grid-template-columns:1fr}.tc-range-track button{min-height:52px;flex-direction:row;justify-content:flex-start;align-items:center}.tc-detail dl div,.tc-dl div{grid-template-columns:1fr;gap:4px}.tc-range,.tc-delivery{margin:0 21px;padding-left:0;padding-right:0}}
@media(prefers-reduced-motion:reduce){.telecom *{transition:none!important;animation:none!important}}
`;
