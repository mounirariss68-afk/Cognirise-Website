import { useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, ChevronRight, Crosshair, Layers3, ShieldCheck, Waypoints } from "lucide-react";
import { architectureLayers, architectureSpines, type ArchitectureComponent, type ArchitectureLayer } from "../../../../../cognirise-website/src/data/cognios-architecture";
import "./_group.css";

type ViewState = { layerId: string | null; componentId: string | null };

const pulseClasses = ["pulse-violet", "pulse-magenta", "pulse-coral", "pulse-navy", "pulse-violet", "pulse-magenta"];

function SpineRail({ spine, compact = false }: { spine: (typeof architectureSpines)[number]; compact?: boolean }) {
  return (
    <div className={`kernel-spine ${spine.id} ${compact ? "is-compact" : ""}`}>
      <span className="spine-cap">{spine.number}</span>
      <div>
        <strong>{spine.name}</strong>
        {!compact && <small>{spine.description}</small>}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="kernel-legend" aria-label="Architecture notation legend">
      <span><i className="legend-plate" /> plate = layer</span>
      <span><i className="legend-spine" /> spine = cross-cutting</span>
      <span><i className="legend-membership">◇</i> membership</span>
      <span><i className="legend-engine">E</i> documented engine</span>
    </div>
  );
}

function LayerPlate({ layer, index, selected, onSelect }: { layer: ArchitectureLayer; index: number; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      className={`kernel-plate ${selected ? "is-selected" : ""} ${pulseClasses[index]}`}
      style={{ "--plate-index": index } as CSSProperties}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Focus ${layer.name}`}
    >
      <span className="plate-edge" />
      <span className="plate-number">{layer.number}</span>
      <span className="plate-copy">
        <b>{layer.name}</b>
        <em>{layer.responsibility}</em>
      </span>
      <span className="plate-meta">{layer.components.length} territories {layer.engine ? `· ${layer.engine}` : "· shared foundation"}</span>
      <ChevronRight className="plate-arrow" size={17} aria-hidden="true" />
    </button>
  );
}

function ComponentTerritory({ component, index, active, onSelect }: { component: ArchitectureComponent; index: number; active: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`territory territory-${index % 6} ${active ? "is-active" : ""}`} onClick={onSelect} aria-pressed={active}>
      <span className="territory-mark">◇</span>
      <span className="territory-name">{component.name}</span>
      {component.engine && <span className="territory-engine">{component.engine}</span>}
      <span className="territory-rule" />
    </button>
  );
}

function FocusBlueprint({ layer, selectedComponent, setSelectedComponent, goBack }: {
  layer: ArchitectureLayer;
  selectedComponent: ArchitectureComponent | null;
  setSelectedComponent: (component: ArchitectureComponent) => void;
  goBack: () => void;
}) {
  const focusIndex = architectureLayers.findIndex((item) => item.id === layer.id);
  return (
    <section className="blueprint-stage" aria-label={`${layer.name} blueprint`}>
      <div className="blueprint-topline">
        <button className="back-button" type="button" onClick={goBack}><ArrowLeft size={16} /> System overview</button>
        <span className="focus-kicker">Focused plane / {layer.number}</span>
        <span className={`focus-signal ${pulseClasses[focusIndex]}`}><Crosshair size={14} /> semantic zoom</span>
      </div>
      <div className="blueprint-heading">
        <div>
          <p className="eyebrow">Layer blueprint · {layer.number}</p>
          <h2>{layer.name.replace(" layer", "")}<span> layer</span></h2>
        </div>
        <p>{layer.responsibility}</p>
      </div>
      <div className="blueprint-canvas">
        <div className="blueprint-spine spine-a-line"><span>A</span></div>
        <div className="blueprint-spine spine-b-line"><span>B</span></div>
        <div className="blueprint-backbone">
          <small>shared layer backbone</small>
          <strong>{layer.principle}</strong>
          <div>{layer.controls.map((control) => <span key={control}>{control}</span>)}</div>
        </div>
        <div className="territory-field">
          {layer.components.map((component, index) => (
            <ComponentTerritory
              component={component}
              index={index}
              active={selectedComponent?.id === component.id}
              onSelect={() => setSelectedComponent(component)}
              key={component.id}
            />
          ))}
        </div>
        {selectedComponent && (
          <aside className="component-annotation" aria-live="polite">
            <div className="annotation-top"><span>Selected territory</span><span>{selectedComponent.engine ? `engine · ${selectedComponent.engine}` : "no engine documented"}</span></div>
            <h3>{selectedComponent.name}</h3>
            <p>{selectedComponent.responsibility}</p>
            <div className="annotation-details">
              {selectedComponent.details.map((detail) => <span key={detail}><i />{detail}</span>)}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

export function ExplodedKernelStack() {
  const [view, setView] = useState<ViewState>({ layerId: null, componentId: null });
  const selectedLayer = useMemo(() => architectureLayers.find((layer) => layer.id === view.layerId) ?? null, [view.layerId]);
  const selectedComponent = selectedLayer?.components.find((component) => component.id === view.componentId) ?? null;

  const focusLayer = (layer: ArchitectureLayer) => setView({ layerId: layer.id, componentId: null });
  const overview = () => setView({ layerId: null, componentId: null });

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&display=swap"
      />
      <main className="kernel-shell">
      <header className="kernel-header">
        <div className="brand-lockup"><span className="brand-mark">C</span><div><strong>Cognirise</strong><small>reference architecture / 01</small></div></div>
        <div className="header-title"><span>CogniOS</span><b>Exploded Kernel Stack</b></div>
        <div className="header-status"><span className="status-dot" />truthful system view</div>
      </header>

      <section className="kernel-intro">
        <div>
          <p className="eyebrow">A spatial reference architecture</p>
          <h1>One operating system.<br /><i>Six accountable planes.</i></h1>
        </div>
        <p className="intro-copy">CogniOS makes an enterprise operating model legible without turning the architecture into a product promise. Select a plate to examine its territories in place.</p>
      </section>

      <div className="kernel-toolbar">
        <div className="toolbar-label"><Layers3 size={16} /> <span>{selectedLayer ? `Focused / ${selectedLayer.name}` : "Bird's-eye / all layers"}</span></div>
        {selectedLayer ? <button type="button" className="overview-link" onClick={overview}><ArrowLeft size={15} /> back to overview</button> : <span className="toolbar-note">click a plate to focus · no implied sequence</span>}
      </div>

      {selectedLayer ? (
        <FocusBlueprint layer={selectedLayer} selectedComponent={selectedComponent} setSelectedComponent={(component) => setView({ ...view, componentId: component.id })} goBack={overview} />
      ) : (
        <section className="overview-stage" aria-label="CogniOS six layer overview">
          <div className="stage-grid" />
          <div className="spine-column" aria-label="Cross-cutting spines">
            <SpineRail spine={architectureSpines[0]} />
            <SpineRail spine={architectureSpines[1]} />
          </div>
          <div className="plate-stack">
            {architectureLayers.map((layer, index) => <LayerPlate key={layer.id} layer={layer} index={index} selected={false} onSelect={() => focusLayer(layer)} />)}
          </div>
          <div className="stack-caption"><span>COGNIOS / KERNEL SECTION</span><b>Stable order. Shared authority.</b><small>Layers are planes of responsibility, not a data-flow sequence.</small></div>
        </section>
      )}

      <section className="under-stage">
        <Legend />
        <div className="spine-summary"><Waypoints size={15} /><span>Both spines remain present across every view:</span><b>AI governance & assurance</b><b>Platform engineering & operations</b></div>
      </section>

      <section className="rationale">
        <div className="rationale-heading"><p className="eyebrow">Research rationale</p><h2>Spatial clarity over<br /><i>simulated complexity.</i></h2></div>
        <div className="rationale-columns">
          <div><span className="rationale-tag adopted">adopted</span><p>Stable bird’s-eye geometry, progressive disclosure, focus highlighting, locked architecture and semantic zoom keep the reference model readable at executive distance.</p></div>
          <div><span className="rationale-tag rejected">rejected</span><p>Invented personas and views, arbitrary canvas controls, animated traces, simulations, terminals, syscalls, schedulers, security rings and technical-stack claims.</p></div>
        </div>
      </section>

      <footer className="kernel-footer"><span>COGNIRISE / COGNIOS</span><span>REFERENCE ARCHITECTURE · NOT A SHIPPED-PRODUCT CAPABILITY CLAIM</span><span><ShieldCheck size={14} /> governed by what is documented</span></footer>
      </main>
    </>
  );
}
