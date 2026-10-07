import React from "react";
import { BrandButton } from "@/components/ui/brand-button";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { assetUrl } from "@/lib/assets";
import { marketAwareDestination } from "@/lib/marketDestination";
import { useMarketStore, type Market } from "@/store/market";
import type { IndustryContent } from "@/content/industries";
import type { PublicSectorNode, PublicSectorRun } from "@workspace/api-zod";

const ROOT = "content.publicSectorNative";
type Ctx = { market: string; locale: string };
const CtxC = React.createContext<Ctx>({ market: "uae", locale: "en" });

function Runs({ runs, path }: { runs: PublicSectorRun[]; path: string }) {
  const { market, locale } = React.useContext(CtxC);
  return <>{runs.map((r, i) => {
    const f = `${path}.runs.${i}.text`;
    let el: React.ReactNode = r.text;
    if (r.strong) el = <strong>{el}</strong>;
    if (r.emphasis) el = <em>{el}</em>;
    if (r.href) {
      if (r.href === "/contact") return <a key={i} href={marketAwareDestination("/contact", market, locale)} data-cms-field={f}>{el}</a>;
      if (r.href === "#ps-start") return <a key={i} href="#ps-start" data-cms-field={f}>{el}</a>;
      if (/^https:\/\//.test(r.href)) return <a key={i} href={r.href} target="_blank" rel="noopener noreferrer" data-cms-field={f}>{el}</a>;
    }
    return <span key={i} data-cms-field={f}>{el}</span>;
  })}</>;
}

function Nodes({ nodes, path }: { nodes: PublicSectorNode[]; path: string }) {
  return <>{nodes.map((n, i) => <Node key={i} node={n} path={`${path}.${i}`} />)}</>;
}

function Node({ node, path }: { node: PublicSectorNode; path: string }) {
  switch (node.type) {
    case "copy":
      return <p className={`ps-copy ps-copy--${node.style}`}><Runs runs={node.runs} path={path} /></p>;
    case "heading": {
      const T = (`h${node.level}`) as "h2" | "h3" | "h4";
      return <T className={`ps-h ps-h--${node.level}`}><Runs runs={node.runs} path={path} /></T>;
    }
    case "list": {
      const L = node.numbered ? "ol" : "ul";
      return <L className="ps-list">{node.items.map((it, i) => <li key={i}><Nodes nodes={it} path={`${path}.items.${i}`} /></li>)}</L>;
    }
    case "table":
      return <div className="ps-table-region" role="region" tabIndex={0} aria-label={node.caption}>
        <table className="ps-table">
          <caption data-cms-field={`${path}.caption`}>{node.caption}</caption>
          <thead><tr>{node.headers.map((h, i) => <th scope="col" key={i}><Nodes nodes={h} path={`${path}.headers.${i}`} /></th>)}</tr></thead>
          <tbody>{node.rows.map((row, r) => <tr key={r}>{row.map((c, ci) => ci === 0
            ? <th scope="row" key={ci}><Nodes nodes={c} path={`${path}.rows.${r}.${ci}`} /></th>
            : <td key={ci}><Nodes nodes={c} path={`${path}.rows.${r}.${ci}`} /></td>)}</tr>)}</tbody>
        </table>
      </div>;
    case "panel":
      return <div className={`ps-panel ps-panel--${node.layout}`}><Nodes nodes={node.blocks} path={`${path}.blocks`} /></div>;
    case "action-card":
      return <article className={`ps-action ps-action--${node.tone}`} aria-label={`Illustration: ${node.title}`}>
        <p className="ps-action-flag">Illustration only, not a working form</p>
        <p className="ps-action-kicker" data-cms-field={`${path}.kicker`}>{node.kicker}</p>
        <h4 data-cms-field={`${path}.title`}>{node.title}</h4>
        <p className="ps-action-issuer" data-cms-field={`${path}.issuer`}>{node.issuer}</p>
        <dl>{node.fields.map((f, i) => <div key={i} className={`ps-fld${f.editableExample ? " is-edit" : ""}`}>
          <dt data-cms-field={`${path}.fields.${i}.label`}>{f.label}</dt>
          <dd data-cms-field={`${path}.fields.${i}.value`}>{f.value}</dd>
          {f.status && <dd className="ps-fld-status" data-cms-field={`${path}.fields.${i}.status`}>{f.status}</dd>}
        </div>)}</dl>
        <p className="ps-action-cons" data-cms-field={`${path}.consequence`}>{node.consequence}</p>
        <p className="ps-action-decl" data-cms-field={`${path}.declaration`}>{node.declaration}</p>
        <div className="ps-action-btn" data-cms-field={`${path}.actionLabel`}>{node.actionLabel}</div>
      </article>;
  }
}

export function PublicSectorNativeEditorial({ view, marketOverride }: { view: IndustryContent; marketOverride?: Market }) {
  const store = useMarketStore();
  const market = marketOverride ?? store.market;
  const ctx = React.useMemo(() => ({ market, locale: store.locale }), [market, store.locale]);
  const ps = view.publicSectorNative!;
  const img = /^https?:\/\//.test(view.image) ? view.image : assetUrl(view.image);
  React.useEffect(() => {
    if (window.location.pathname.startsWith("/preview/")) return;
    const title = `The AI-Native Government · ${ps.marketLabel} | Cognirise`;
    document.title = title;
    for (const [selector, attribute, value] of [
      ['meta[name="description"]', "name", view.dek],
      ['meta[property="og:title"]', "property", title],
      ['meta[property="og:description"]', "property", view.dek],
      ['meta[property="og:image"]', "property", img],
    ]) {
      let node = document.head.querySelector<HTMLMetaElement>(selector);
      if (!node) {
        node = document.createElement("meta");
        node.setAttribute(attribute, selector.match(/="([^"]+)"/)![1]);
        document.head.appendChild(node);
      }
      node.content = value;
    }
  }, [ps.marketLabel, view.dek, img]);
  return (
    <CtxC.Provider value={ctx}>
      <main className="ps-native" data-market={ps.market} data-industry="public-sector">
        <section className="ps-hero" data-industry-section="hero" aria-labelledby="ps-hero-title">
          <div className="ps-hero-copy">
            <div className="ps-hero-top">
              <NavigationBackControl embedded />
              <p className="ps-kicker" data-cms-field={`${ROOT}.marketLabel`}>{ps.marketLabel}</p>
            </div>
            <div className="ps-hero-bottom">
              <h1 id="ps-hero-title" data-cms-field="content.thesis">{view.thesis}</h1>
              <p data-cms-field="content.dek">{view.dek}</p>
              <div className="ps-hero-actions">
                <BrandButton href={marketAwareDestination("/contact", market, store.locale)}>Discuss a service to redesign</BrandButton>
                <a className="ps-text-link" href="#ps-start">How to start</a>
              </div>
            </div>
          </div>
          <figure className="ps-hero-image"><img src={img} alt={view.imageAlt} decoding="async" /></figure>
        </section>
        {ps.sections.map((s, i) => {
          const sp = `${ROOT}.sections.${i}`;
          return (
            <section key={s.id} id={s.id === "tracks" ? "ps-start" : `ps-${s.id}`} className={`ps-section ps-section--${s.surface} ps-section--${s.id}`}
              data-industry-section={s.id} aria-label={s.title}>
              <div className="ps-body"><Nodes nodes={s.blocks} path={`${sp}.blocks`} /></div>
              {s.id === "research" && <div className="ps-research-date">
                <p data-cms-field={`${ROOT}.researchDateQualification`}>{ps.researchDateQualification}</p>
                <p className="ps-source-date">Source check date: <time dateTime={ps.sourceDate} data-cms-field={`${ROOT}.sourceDate`}>{ps.sourceDate}</time></p>
              </div>}
            </section>
          );
        })}
      </main>
    </CtxC.Provider>
  );
}
