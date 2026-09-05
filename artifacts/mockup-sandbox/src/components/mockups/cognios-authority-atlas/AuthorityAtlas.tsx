import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Crosshair, Info, MoveUpRight } from "lucide-react";
import { architectureLayers, architectureSpines, type ArchitectureComponent, type ArchitectureLayer } from "../../../../../cognirise-website/src/data/cognios-architecture";
import "./authority-atlas.css";

type Focus = { layer: string | null; component: string | null };

const districtClass = ["experience", "intelligence", "process", "knowledge", "integration", "foundation"];

function District({
  layer,
  index,
  active,
  onSelect,
}: {
  layer: ArchitectureLayer;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`atlas-district ${districtClass[index]} ${active ? "is-active" : ""}`}
      onClick={onSelect}
      aria-pressed={active}
      aria-label={`Open ${layer.name}`}
    >
      <span className="district-number">{layer.number}</span>
      <span className="district-label">{layer.name}</span>
      <span className="district-principle">{layer.principle}</span>
      <span className="district-components">
        {layer.components.slice(0, 3).map((component) => <i key={component.id}>{component.name}</i>)}
        <i className="district-more">+{layer.components.length - 3}</i>
      </span>
      <ArrowUpRight size={18} className="district-arrow" aria-hidden="true" />
    </button>
  );
}

function ComponentMarker({
  component,
  index,
  active,
  onSelect,
}: {
  component: ArchitectureComponent;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`atlas-marker marker-${index} ${active ? "is-active" : ""}`}
      aria-pressed={active}
    >
      <span className="marker-index">0{index + 1}</span>
      <strong>{component.name}</strong>
      {component.engine && <em>{component.engine}</em>}
    </button>
  );
}

function DetailView({
  layer,
  component,
  onComponent,
  onBack,
}: {
  layer: ArchitectureLayer;
  component: ArchitectureComponent | null;
  onComponent: (item: ArchitectureComponent) => void;
  onBack: () => void;
}) {
  return (
    <section className="atlas-detail" aria-label={`${layer.name} architecture detail`}>
      <div className="atlas-detail-top">
        <button type="button" onClick={onBack} className="atlas-back"><ArrowLeft size={17} /> All architecture</button>
        <span><Crosshair size={15} /> Layer focus / {layer.number}</span>
      </div>
      <div className="atlas-detail-heading">
        <div>
          <p>District study</p>
          <h2>{layer.name.replace(" layer", "")}<em> layer</em></h2>
        </div>
        <p>{layer.responsibility}</p>
      </div>

      <div className="atlas-detail-field">
        <div className="detail-governance"><span>A</span><b>{architectureSpines[0].name}</b></div>
        <div className="detail-operations"><span>B</span><b>{architectureSpines[1].name}</b></div>
        <div className="detail-principle">
          <small>Layer principle</small>
          <strong>{layer.principle}</strong>
          <div>{layer.controls.map((control) => <span key={control}>{control}</span>)}</div>
        </div>
        <div className="marker-field">
          {layer.components.map((item, index) => (
            <ComponentMarker
              key={item.id}
              component={item}
              index={index}
              active={component?.id === item.id}
              onSelect={() => onComponent(item)}
            />
          ))}
        </div>
        {component && (
          <aside className="atlas-callout" aria-live="polite">
            <div className="callout-line">
              <span>Component / {component.engine ? `documented engine · ${component.engine}` : "no documented engine relationship"}</span>
              <MoveUpRight size={15} />
            </div>
            <h3>{component.name}</h3>
            <p>{component.responsibility}</p>
            <ul>{component.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
          </aside>
        )}
      </div>
    </section>
  );
}

export function AuthorityAtlas() {
  const [focus, setFocus] = useState<Focus>({ layer: null, component: null });
  const selectedLayer = useMemo(
    () => architectureLayers.find((layer) => layer.id === focus.layer) ?? null,
    [focus.layer],
  );
  const selectedComponent = selectedLayer?.components.find((component) => component.id === focus.component) ?? null;
  const returnToMap = () => setFocus({ layer: null, component: null });

  return (
    <main className="authority-atlas">
      <header className="atlas-header">
        <img src="/__mockup/images/cognirise/logo-blue.svg" alt="Cognirise" />
        <div><span>CogniOS</span><strong>Reference architecture</strong></div>
        <small>01 / Authority atlas</small>
      </header>

      <section className="atlas-intro">
        <div>
          <p><span />CogniOS / a reference architecture</p>
          <h1>The architecture<br />of <em>accountability.</em></h1>
        </div>
        <div className="atlas-intro-copy">
          <p>Six distinct responsibilities, held inside one operating system. Select a district to examine the component families without losing the whole.</p>
          <small>Structural position shows responsibility. It does not show a process sequence, dependency, or product capability.</small>
        </div>
      </section>

      {selectedLayer ? (
        <DetailView
          layer={selectedLayer}
          component={selectedComponent}
          onComponent={(component) => setFocus({ layer: selectedLayer.id, component: component.id })}
          onBack={returnToMap}
        />
      ) : (
        <section className="atlas-stage" aria-label="CogniOS authority architecture overview">
          <div className="atlas-stage-head">
            <span>System plan / six districts</span>
            <span>Select a district to focus</span>
          </div>
          <div className="atlas-map">
            <div className="map-boundary-label">CogniOS / operating system boundary</div>
            <div className="governance-band">
              <span>A</span>
              <div><b>{architectureSpines[0].name}</b><small>{architectureSpines[0].description}</small></div>
            </div>
            <div className="operations-band">
              <span>B</span>
              <div><b>{architectureSpines[1].name}</b><small>{architectureSpines[1].description}</small></div>
            </div>
            <div className="atlas-district-grid">
              {architectureLayers.map((layer, index) => (
                <District
                  key={layer.id}
                  layer={layer}
                  index={index}
                  active={false}
                  onSelect={() => setFocus({ layer: layer.id, component: null })}
                />
              ))}
            </div>
            <div className="map-axis map-axis-x">cross-cutting disciplines / permanent structure</div>
            <div className="map-axis map-axis-y">six responsibilities / one boundary</div>
          </div>
          <div className="atlas-legend">
            <span><i className="legend-district" /> District / architecture layer</span>
            <span><i className="legend-band" /> Continuous band / cross-cutting spine</span>
            <span><i className="legend-name">Aa</i> Named component family</span>
            <span><i className="legend-engine">E</i> Documented engine relationship</span>
          </div>
        </section>
      )}

      <section className="atlas-research">
        <div>
          <p><span />Design rationale</p>
          <h2>Make the whole<br /><em>easy to hold.</em></h2>
        </div>
        <div className="research-notes">
          <article>
            <b>01 / Research principle</b>
            <p>Architecture views are meant to address stakeholders’ specific concerns. This view begins with the executive concern: where accountability sits and which disciplines cross every responsibility.</p>
          </article>
          <article>
            <b>02 / Perception principle</b>
            <p>Working memory is limited. Position, enclosure and contrast establish the six-part structure before any component detail asks for attention.</p>
          </article>
          <article>
            <b>03 / Interaction principle</b>
            <p>Focus is progressive, not navigational. The map stays intact conceptually while a district expands into its component study.</p>
          </article>
        </div>
      </section>

      <footer className="atlas-footer">
        <span><Info size={15} /> Reference architecture: documentation of structure, not a deployment, compliance or capability claim.</span>
        <span>© Cognirise</span>
      </footer>
    </main>
  );
}