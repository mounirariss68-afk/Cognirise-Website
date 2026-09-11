import React from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { BrandButton } from "@/components/ui/brand-button";
import { assetUrl } from "@/lib/assets";
import { useMarketStore, type Market } from "@/store/market";
import type { IndustryContent } from "@/content/industries";
import { projectIndustrySnapshotForMarket } from "@workspace/api-zod";

const SAUDI_EDUCATION_SOURCES: IndustryContent["sources"] = [
  { label: "National Strategy for Data and AI", publisher: "Saudi Data & AI Authority", kind: "Official source", url: "https://sdaia.gov.sa/en/SDAIA/SdaiaStrategies/Pages/NationalStrategyForDataAndAI.aspx" },
  { label: "Saudi Academic AI Qualifications Framework", publisher: "Saudi Data & AI Authority", kind: "Official source", url: "https://sdaia.gov.sa/en/Research/Pages/EducationIntelligence.aspx" },
];

const MARKET_LABELS: Record<string, string> = {
  uae: "UAE",
  ksa: "Saudi Arabia",
  turkiye: "Türkiye",
  europe: "Europe",
};

function isUaeSource(source: IndustryContent["sources"][number]) {
  return /\bUAE\b|United Arab Emirates/i.test(`${source.label} ${source.publisher}`);
}

function isSaudiSource(source: IndustryContent["sources"][number]) {
  return /\bSaudi\b/i.test(`${source.label} ${source.publisher}`);
}

export function resolveEducationMarketContent(view: IndustryContent, market: Market) {
  const marketLabel = MARKET_LABELS[market] ?? market.toUpperCase();
  const globalSources = view.sources.filter((source) => !isUaeSource(source) && !isSaudiSource(source));
  if (market === "uae") {
    return {
      label: marketLabel,
      regionalBody: view.gcc,
      convictionBody: "In the UAE, institutions can convert national ambition into talent, applied research and measurable public value.",
      supportingExample: "The UAE Ministry of Education’s NOVA initiative connects AI with unified workflows, decision insight and service improvement.",
      sources: view.sources.filter((source) => !isSaudiSource(source)),
    };
  }
  if (market === "ksa") {
    return {
      label: marketLabel,
      regionalBody: "Saudi Arabia can translate national AI ambition into talent, applied research and public value. Universities should treat agentic AI as a contribution to national capability—not only an efficiency agenda.",
      convictionBody: "In Saudi Arabia, institutions can convert national ambition into talent, applied research and measurable public value.",
      supportingExample: "Saudi Arabia’s Academic AI Qualifications Framework connects education pathways with the AI capabilities institutions and the national economy need.",
      sources: [...globalSources, ...SAUDI_EDUCATION_SOURCES],
    };
  }
  return {
    label: marketLabel,
    regionalBody: "Universities can translate national AI ambition into talent, applied research and public value. Agentic AI should contribute to national capability—not only an efficiency agenda.",
    convictionBody: "Institutions can convert national ambition into talent, applied research and measurable public value.",
    supportingExample: "A student-success agent can connect a permitted signal with timely support, coordinated action and an accountable outcome.",
    sources: globalSources,
  };
}

export function EducationEditorialView({ view: rawView, marketOverride }: { view: IndustryContent; marketOverride?: Market }) {
  const { market: selectedMarket } = useMarketStore();
  const market = marketOverride ?? selectedMarket;

  const view = projectIndustrySnapshotForMarket({ content: rawView }, market).content as IndustryContent;
  const pov = view.educationPov as NonNullable<IndustryContent["educationPov"]> & { version?: 2; introduction?: string; strategicShift?: string; patternQuote?: string; globalDirection?: string; applications?: { title: string; items: { title: string; body: string; sourceUrls: string[]; market?: string; }[]; }[]; };
  if (!pov) return null;

  const isV2 = pov.version === 2;
  const regional = resolveEducationMarketContent(view, market);

  // For v2, the projection has already filtered the arrays. For v1, we apply legacy overrides.
  const convictions = isV2
    ? pov.convictions
    : pov.convictions.map((item, index) =>
        index === pov.convictions.length - 1
          ? { ...item, body: regional.convictionBody }
          : item
      );

  const valueDomains = isV2
    ? pov.valueDomains
    : pov.valueDomains.map((item, index) =>
        index === pov.valueDomains.length - 1
          ? { ...item, examples: item.examples.map((example, exampleIndex) => exampleIndex === item.examples.length - 1 ? regional.supportingExample : example) }
          : item
      );

  const signals = pov.signals;

  const applications = isV2 && pov.applications
    ? pov.applications
    : [];

  const sources = isV2
    ? view.sources
    : regional.sources;

  return (
    <main className="edu">
      <style>{`
        .edu{--ink:#102957;--deep:#071936;--paper:#fdfbf7;--soft:#eef0f5;--line:#cbd3e1;--violet:#7659df;--pink:#a92d73;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}
        .edu *{box-sizing:border-box}.edu figure{margin:0}.edu h1,.edu h2,.edu h3{font-family:Comfortaa,sans-serif}.edu a{color:inherit}.edu :focus-visible{outline:3px solid var(--coral);outline-offset:4px}.edu-kicker{font-size:10px;letter-spacing:.13em;text-transform:uppercase;font-weight:700;display:flex;align-items:center;gap:10px}.edu-kicker:before{content:"";width:25px;height:2px;background:linear-gradient(90deg,var(--violet),var(--pink),var(--coral))}
        .edu-hero{padding:34px 4.8vw 54px;display:grid;grid-template-columns:.86fr 1.14fr;gap:5vw;align-items:end;min-height:690px}.edu-hero h1{font-size:clamp(49px,6vw,92px);line-height:.95;letter-spacing:-.075em;margin:32px 0 28px}.edu-hero p{max-width:590px;color:#405677;font-size:18px;line-height:1.65}.edu-image{height:610px;position:relative;overflow:hidden;clip-path:polygon(0 7%,92% 0,100% 100%,8% 94%);background:var(--deep)}.edu-image img{width:100%;height:100%;object-fit:cover}.edu-image:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(7,25,54,.48),transparent 55%)}.edu-image span{position:absolute;z-index:1;left:32px;bottom:30px;color:white;text-transform:uppercase;font-size:10px;letter-spacing:.13em}
        .edu-opportunity{margin:0 4.8vw;padding:88px 6vw;background:var(--deep);color:white;display:grid;grid-template-columns:.72fr 1.28fr;gap:8vw}.edu-opportunity h2,.edu-section h2,.edu-signals h2,.edu-roadmap h2{font-size:clamp(40px,5vw,70px);line-height:.98;letter-spacing:-.07em;margin:22px 0}.edu-opportunity p{font-size:clamp(20px,2vw,28px);line-height:1.55;color:#d7dfed;margin:0}
        .edu-section{padding:115px 4.8vw}.edu-head{display:grid;grid-template-columns:.72fr 1.28fr;gap:8vw}.edu-lead{color:#405677;font-size:19px;line-height:1.65;align-self:end}.edu-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line);margin-top:52px}.edu-card{background:var(--paper);padding:35px 29px;min-height:235px}.edu-card span{color:var(--pink);font-size:10px;letter-spacing:.12em}.edu-card h3{font-size:24px;line-height:1.15;letter-spacing:-.04em;margin:22px 0 13px}.edu-card p,.edu-card li{color:#506583;line-height:1.6}.edu-card ul{padding-left:18px}.edu-convictions .edu-grid{grid-template-columns:repeat(5,1fr)}.edu-convictions .edu-card{padding:30px 22px}.edu-domains{background:var(--soft)}.edu-domains .edu-card{min-height:410px}
        .edu-signals{padding:110px 4.8vw}.edu-signal-list{margin-top:45px;border-top:1px solid var(--ink)}.edu-signal{display:grid;grid-template-columns:.55fr 1fr 1.25fr 56px;gap:25px;padding:22px 10px;border-bottom:1px solid var(--line);align-items:start}.edu-signal h3{font-size:18px;margin:0}.edu-signal p{margin:0;color:#506583;line-height:1.5}.edu-signal-links{display:flex;gap:8px;justify-content:flex-end}.edu-signal-links a{padding:7px}
        .edu-target{background:var(--deep);color:white}.edu-target .edu-lead,.edu-target .edu-card p{color:#d7dfed}.edu-target .edu-grid{border-color:#ffffff30;background:#ffffff30}.edu-target .edu-card{background:#102957}
        .edu-region{margin:0 4.8vw;padding:80px 6vw;background:linear-gradient(115deg,#7659df,#db509e);color:white;display:grid;grid-template-columns:.75fr 1.25fr;gap:8vw}.edu-region h2{font-size:clamp(35px,4.5vw,62px);letter-spacing:-.065em;line-height:1;margin:20px 0}.edu-region p{font-size:20px;line-height:1.6;align-self:end}
        .edu-roadmap{padding:115px 4.8vw}.edu-roadmap-grid{display:grid;grid-template-columns:repeat(3,1fr);margin-top:48px}.edu-step{padding:36px;border-top:2px solid var(--coral);border-right:1px solid var(--line)}.edu-step:last-child{border-right:0}.edu-step strong{color:var(--pink);font-size:12px;letter-spacing:.1em;text-transform:uppercase}.edu-step h3{font-size:27px;margin:20px 0 12px}.edu-step p{color:#506583;line-height:1.6}.edu-test{margin-top:70px;border:1px solid var(--ink);padding:45px;display:grid;grid-template-columns:.45fr 1.55fr;gap:6vw}.edu-test p{font:600 clamp(22px,2.4vw,34px)/1.35 Comfortaa;margin:0}
        .edu-sources{padding:100px 4.8vw;background:var(--soft)}.edu-source-list{margin-top:35px;display:grid;grid-template-columns:1fr 1fr;gap:0 35px}.edu-source{display:grid;grid-template-columns:1fr 24px;gap:15px;padding:17px 5px;border-bottom:1px solid var(--line);text-decoration:none}.edu-source span{grid-column:1;color:#4e607c;font-size:12px}.edu-source svg{grid-column:2;grid-row:1}
        .edu-cta{background:var(--deep);color:white;padding:95px 4.8vw;display:grid;grid-template-columns:1.3fr .7fr;gap:45px;align-items:end}.edu-cta h2{font-size:clamp(43px,6vw,84px);line-height:.95;letter-spacing:-.075em;margin:20px 0}.edu-cta p{color:#d7dfed;line-height:1.65;max-width:720px}.edu-cta aside{border-left:2px solid var(--coral);padding-left:25px}.edu-cta aside a{display:block;margin-bottom:24px;font-weight:700}

        .edu-intro-quote { margin: 0 4.8vw; padding: 88px 6vw; background: var(--deep); color: white; display: grid; grid-template-columns: 1fr 1fr; gap: 8vw; align-items: center; }
        .edu-intro-quote .edu-intro p { font-size: clamp(20px, 2vw, 28px); line-height: 1.55; color: #d7dfed; margin: 0; }
        .edu-intro-quote .edu-quote { border-left: 2px solid var(--coral); padding-left: 30px; }
        .edu-intro-quote .edu-quote p { font-size: clamp(22px, 2.5vw, 30px); line-height: 1.4; color: white; font-family: Comfortaa, sans-serif; margin: 0; }

        .edu-apps { padding: 100px 4.8vw; background: var(--soft); }
        .edu-app-group { margin-top: 50px; }
        .edu-app-group h3 { font-size: 26px; margin-bottom: 25px; color: var(--ink); font-family: Comfortaa, sans-serif; }
        .edu-app-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); }
        .edu-app-card h4 { font-size: 19px; margin-bottom: 12px; margin-top: 0; color: var(--ink); }
        .edu-app-links { display: flex; gap: 8px; margin-top: 15px; }
        .edu-app-links a { padding: 7px; color: var(--violet); display: inline-flex; align-items: center; justify-content: center; }

        .edu-pattern { padding: 100px 4.8vw; text-align: center; background: var(--deep); color: white; }
        .edu-pattern h2 { font-size: clamp(32px, 4vw, 50px); max-width: 900px; margin: 0 auto; line-height: 1.3; letter-spacing: -0.04em; }

        .edu-signals-table { width: 100%; border-collapse: collapse; margin-top: 45px; text-align: left; }
        .edu-signals-table th { padding: 15px 15px 15px 0; border-bottom: 2px solid var(--ink); font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pink); }
        .edu-signals-table td { padding: 25px 15px 25px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
        .edu-signals-table td strong { display: block; font-size: 18px; margin-bottom: 8px; font-weight: 600; color: var(--ink); }
        .edu-signals-table .edu-signal-links { justify-content: flex-start; margin-top: 8px; }
        .edu-signals-table td p { margin: 0; color: #506583; line-height: 1.5; }

        .edu-target-container { display: grid; grid-template-columns: 1fr 380px; gap: 5vw; margin-top: 52px; align-items: start; }
        .edu-target-container .edu-grid { margin-top: 0; }
        .edu-target-container .edu-test { margin-top: 0; background: rgba(255,255,255,0.05); padding: 45px; display: block; }
        .edu-target-container .edu-test p { font: 600 clamp(22px,2.4vw,34px)/1.35 Comfortaa; margin: 20px 0 0; }

        .edu-global { padding: 80px 4.8vw; background: linear-gradient(115deg, #7659df, #db509e); color: white; }
        .edu-global p { font-size: clamp(22px, 2.5vw, 32px); line-height: 1.5; max-width: 1100px; margin: 0; font-family: Comfortaa, sans-serif; }

        @media(max-width:950px){
           .edu-intro-quote { grid-template-columns: 1fr; gap: 40px; }
           .edu-target-container { grid-template-columns: 1fr; }
           .edu-convictions .edu-grid { grid-template-columns: repeat(2,1fr); }
           .edu-app-grid { grid-template-columns: repeat(2,1fr); }
        }
        @media(max-width:760px){
           .edu-hero{display:flex;flex-direction:column;align-items:stretch;min-height:0;padding:34px 21px 36px}
           .edu-hero h1{font-size:50px}
           .edu-image{height:430px}
           .edu-opportunity,.edu-head,.edu-region,.edu-test,.edu-cta{display:block;margin:0}
           .edu-opportunity,.edu-section,.edu-signals,.edu-roadmap,.edu-sources,.edu-cta{padding:78px 21px}
           .edu-grid,.edu-convictions .edu-grid,.edu-roadmap-grid,.edu-source-list,.edu-app-grid{grid-template-columns:1fr}
           .edu-card,.edu-domains .edu-card{min-height:0}
           .edu-signal{grid-template-columns:1fr}
           .edu-signal-links{justify-content:flex-start}
           .edu-region{padding:75px 21px}
           .edu-step{border-right:0}
           .edu-test{margin-top:50px;padding:30px}
           .edu-test p{margin-top:25px}
           .edu-cta aside{margin-top:42px}
           .edu-intro-quote { padding: 78px 21px; }
           .edu-apps, .edu-pattern, .edu-global { padding: 78px 21px; }

           .edu-signals-table, .edu-signals-table tbody, .edu-signals-table tr, .edu-signals-table td, .edu-signals-table th { display: block; }
           .edu-signals-table th { display: none; }
           .edu-signals-table tr { margin-bottom: 25px; border-bottom: 1px solid var(--ink); padding-bottom: 20px; }
           .edu-signals-table td { border: none; padding: 10px 0; }
           .edu-signals-table td::before { content: attr(data-label); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--pink); display: block; margin-bottom: 6px; font-weight: 700; }
        }
        @media(prefers-reduced-motion:reduce){.edu *{scroll-behavior:auto!important}}
      `}</style>

      <section className="edu-hero" aria-labelledby="education-title">
        <div>
          <div className="edu-kicker">{regional.label} / {isV2 ? "Schools, Universities & Education Authorities" : "Higher education"}</div>
          <h1 id="education-title">{view.thesis}</h1>
          <p>{view.dek}</p>
        </div>
        <figure className="edu-image">
          <img src={assetUrl(view.image)} alt={view.imageAlt} />
          <span>Institution-wide perspective</span>
        </figure>
      </section>

      {isV2 ? (
        <section className="edu-intro-quote" aria-labelledby="education-opportunity">
          <div className="edu-intro">
            <h2 id="education-opportunity" className="sr-only">The strategic shift</h2>
            <p>{pov.introduction}</p>
          </div>
          <aside className="edu-quote">
            <p>“{pov.strategicShift}”</p>
          </aside>
        </section>
      ) : (
        <section className="edu-opportunity" aria-labelledby="education-opportunity">
          <div>
            <div className="edu-kicker">The strategic shift</div>
            <h2 id="education-opportunity">From isolated copilots to coordinated institutional action.</h2>
          </div>
          <p>{view.opportunity}</p>
        </section>
      )}

      <section className="edu-section edu-convictions" aria-labelledby="education-convictions">
        <div className="edu-head">
          <div>
            <div className="edu-kicker">Five convictions</div>
            <h2 id="education-convictions">{isV2 ? "Lead with educational purpose." : "Lead as a university."}</h2>
          </div>
          <p className="edu-lead">Academic mission and human purpose set the direction. Technology, operating design and assurance make that direction executable.</p>
        </div>
        <div className="edu-grid">
          {convictions.map((item, index) => (
            <article className="edu-card" key={item.title}>
              <span>0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="edu-section edu-domains" aria-labelledby="education-domains">
        <div className="edu-head">
          <div>
            <div className="edu-kicker">Where value becomes tangible</div>
            <h2 id="education-domains">Redesign complete institutional journeys.</h2>
          </div>
          <p className="edu-lead">The strongest opportunities connect specialist assistance with trusted context, core systems and accountable people.</p>
        </div>
        <div className="edu-grid">
          {valueDomains.map((item, index) => (
            <article className="edu-card" key={item.title}>
              <span>0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <ul>
                {item.examples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {isV2 && applications.length > 0 && (
        <section className="edu-apps" aria-labelledby="education-apps">
          <div className="edu-kicker">Tangible Applications</div>
          <h2 id="education-apps" style={{ fontSize: 'clamp(40px,5vw,70px)', letterSpacing: '-0.07em', margin: '22px 0', fontFamily: 'Comfortaa, sans-serif', color: 'var(--ink)' }}>Specialist assistance in practice.</h2>
          {applications.map(group => (
            <div className="edu-app-group" key={group.title}>
              <h3>{group.title}</h3>
              <div className="edu-app-grid">
                {group.items.map(item => (
                  <article className="edu-app-card edu-card" key={item.title}>
                    <h4>{item.title}</h4>
                    <p>{item.body}</p>
                    <div className="edu-app-links">
                      {item.sourceUrls.map((url, i) => (
                        <a href={url} target="_blank" rel="noreferrer" aria-label={`${item.title} source ${i + 1}`} key={url}>
                          <ExternalLink size={15} aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {isV2 && pov.patternQuote && (
        <section className="edu-pattern">
          <h2>“{pov.patternQuote}”</h2>
        </section>
      )}

      <section className="edu-signals" aria-labelledby="education-signals">
        <div className="edu-kicker">Institutional signals</div>
        <h2 id="education-signals">What leading institutions make visible.</h2>
        <p>These external examples are not Cognirise client work. Preliminary and institution-reported evidence is identified in the description.</p>

        {isV2 ? (
          <table className="edu-signals-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Strategic signal</th>
                <th>Implication</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((item) => (
                <tr key={item.institution}>
                  <td data-label="Source">
                    <strong>{item.institution}</strong>
                    <div className="edu-signal-links">
                      {item.sourceUrls.map((url, i) => (
                        <a href={url} target="_blank" rel="noreferrer" aria-label={`${item.institution} source ${i + 1}`} key={url}>
                          <ExternalLink size={16} aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </td>
                  <td data-label="Strategic signal"><p>{item.signal}</p></td>
                  <td data-label="Implication"><p>{item.implication}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="edu-signal-list">
            {signals.map((item) => (
              <article className="edu-signal" key={item.institution}>
                <h3>{item.institution}</h3>
                <p>{item.signal}</p>
                <p>{item.implication}</p>
                <div className="edu-signal-links">
                  {item.sourceUrls.map((url, index) => (
                    <a href={url} target="_blank" rel="noreferrer" aria-label={`${item.institution} source ${index + 1}`} key={url}>
                      <ExternalLink size={16} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="edu-section edu-target" aria-labelledby="education-target">
        <div className="edu-head">
          <div>
            <div className="edu-kicker">The target state</div>
            <h2 id="education-target">{isV2 ? "One shared layer. Seven reinforcing capabilities." : "One shared layer. Six reinforcing capabilities."}</h2>
          </div>
          <p className="edu-lead">A federated institutional layer supports specialised teaching, research, student-service and administrative agents without locking strategy to one product or provider.</p>
        </div>

        {isV2 ? (
          <div className="edu-target-container">
            <div className="edu-grid">
              {pov.targetState.map((item, index) => (
                <article className="edu-card" key={item.title}>
                  <span>0{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
            <aside className="edu-test">
              <div className="edu-kicker">Leadership test</div>
              <p>{pov.leadershipTest}</p>
            </aside>
          </div>
        ) : (
          <div className="edu-grid">
            {pov.targetState.map((item, index) => (
              <article className="edu-card" key={item.title}>
                <span>0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {isV2 && pov.globalDirection && (
        <section className="edu-global" aria-labelledby="education-global">
          <div className="edu-kicker" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '15px' }}>Global Direction</div>
          <p id="education-global">{pov.globalDirection}</p>
        </section>
      )}

      {!isV2 && (
        <section className="edu-region" aria-labelledby="education-region">
          <div>
            <div className="edu-kicker">{regional.label}</div>
            <h2 id="education-region">Turn national ambition into institutional capability.</h2>
          </div>
          <p>{regional.regionalBody}</p>
        </section>
      )}

      {pov.roadmap && pov.roadmap.length > 0 && (
        <section className="edu-roadmap" aria-labelledby="education-roadmap">
          <div className="edu-kicker">A practical sequence</div>
          <h2 id="education-roadmap">Establish. Build. Scale.</h2>
          <div className="edu-roadmap-grid">
            {pov.roadmap.map((step) => (
              <article className="edu-step" key={step.horizon}>
                <strong>{step.horizon}</strong>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
          {!isV2 && (
            <aside className="edu-test">
              <div className="edu-kicker">Leadership test</div>
              <p>{pov.leadershipTest}</p>
            </aside>
          )}
        </section>
      )}

      <section className="edu-sources" aria-labelledby="education-sources">
        <div className="edu-kicker">Evidence and source trail</div>
        <h2 id="education-sources">Read the sources behind this view.</h2>
        <div className="edu-source-list">
          {sources.map((source) => (
            <a className="edu-source" href={source.url} target="_blank" rel="noreferrer" key={source.url}>
              <strong>{source.label}</strong>
              <span>{source.publisher} · {source.kind}</span>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      <section className="edu-cta" aria-labelledby="education-cta">
        <div>
          <div className="edu-kicker">A practical first move</div>
          <h2 id="education-cta">{view.service.firstMove}</h2>
          <p>For schools, universities, school networks and education authorities: bring educational, research, service, technology and transformation owners around one journey. Start with a measurable redesign and a route from evidence-backed practice to institution-wide capability.</p>
        </div>
        <aside>
          <Link href={view.service.href}>
            Connect consulting, engineering, data, platform and change <ArrowRight size={14} />
          </Link>
          <BrandButton href="/value-scan">Start a Value Scan</BrandButton>
        </aside>
      </section>
    </main>
  );
}
