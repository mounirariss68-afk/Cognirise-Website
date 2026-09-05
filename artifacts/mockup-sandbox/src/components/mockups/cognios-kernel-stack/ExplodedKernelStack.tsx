import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, Crosshair, Layers3, ShieldCheck, Waypoints } from "lucide-react";
import { architectureLayers, architectureSpines, type ArchitectureComponent, type ArchitectureLayer } from "../../../../../cognirise-website/src/data/cognios-architecture";
import "./_group.css";

type ViewState = { layerId: string | null; componentId: string | null };

function Spine({ spine, side }: { spine: (typeof architectureSpines)[number]; side: "left" | "right" }) {
  return <div className={`pulse-spine pulse-spine-${side}`} aria-label={spine.name}>
    <span>{spine.number}</span><b>{spine.name}</b>
  </div>;
}

function Legend() {
  return <div className="pulse-legend" aria-label="Architecture notation legend">
    <span><i className="legend-slab" /> plate / layer</span>
    <span><i className="legend-rail" /> cross-cutting spine</span>
    <span><i className="legend-diamond">◇</i> membership</span>
    <span><i className="legend-e">E</i> documented engine</span>
  </div>;
}

function Plate({ layer, index, onSelect }: { layer: ArchitectureLayer; index: number; onSelect: () => void }) {
  return <button type="button" className={`pulse-plate plate-${index}`} onClick={onSelect} aria-label={`Focus ${layer.name}`}>
    <span className="plate-depth" />
    <span className="plate-glint" />
    <span className="plate-index">{layer.number}</span>
    <span className="plate-name">{layer.name}</span>
    <span className="plate-responsibility">{layer.responsibility}</span>
    <span className="plate-component-count">{layer.components.length} component families</span>
    <ChevronRight className="plate-chevron" size={21} aria-hidden="true" />
  </button>;
}

function Territory({ component, index, active, onSelect }: { component: ArchitectureComponent; index: number; active: boolean; onSelect: () => void }) {
  return <button type="button" className={`pulse-territory territory-${index} ${active ? "active" : ""}`} onClick={onSelect} aria-pressed={active}>
    <span className="territory-diamond">◇</span>
    <span className="territory-label">{component.name}</span>
    {component.engine && <span className="territory-engine">engine · {component.engine}</span>}
    <span className="territory-under" />
  </button>;
}

function Blueprint({ layer, selectedComponent, onComponent, onBack }: {
  layer: ArchitectureLayer;
  selectedComponent: ArchitectureComponent | null;
  onComponent: (component: ArchitectureComponent) => void;
  onBack: () => void;
}) {
  return <section className="pulse-blueprint" aria-label={`${layer.name} focused blueprint`}>
    <div className="blueprint-nav">
      <button type="button" className="pulse-back" onClick={onBack}><ArrowLeft size={17} /> System overview</button>
      <span><Crosshair size={15} /> focused layer / {layer.number}</span>
    </div>
    <div className="blueprint-title">
      <div><p className="pulse-kicker">Layer blueprint · {layer.number}</p><h2>{layer.name.replace(" layer", "")}<em> layer.</em></h2></div>
      <p>{layer.responsibility}</p>
    </div>
    <div className="blueprint-plane">
      <div className="blueprint-cut blueprint-cut-a" />
      <div className="blueprint-cut blueprint-cut-b" />
      <div className="blueprint-spine blueprint-spine-a"><span>A</span></div>
      <div className="blueprint-spine blueprint-spine-b"><span>B</span></div>
      <div className="blueprint-backbone">
        <small>shared layer backbone</small>
        <strong>{layer.principle}</strong>
        <div>{layer.controls.map((control) => <span key={control}>{control}</span>)}</div>
      </div>
      <div className="territory-map">
        {layer.components.map((component, index) => <Territory key={component.id} component={component} index={index} active={selectedComponent?.id === component.id} onSelect={() => onComponent(component)} />)}
      </div>
      {selectedComponent && <aside className="pulse-annotation" aria-live="polite">
        <div className="annotation-rule"><span>territory selected</span><span>{selectedComponent.engine ? `engine · ${selectedComponent.engine}` : "engine relationship not documented"}</span></div>
        <h3>{selectedComponent.name}</h3>
        <p>{selectedComponent.responsibility}</p>
        <div className="annotation-details">{selectedComponent.details.map((detail) => <span key={detail}><i />{detail}</span>)}</div>
      </aside>}
    </div>
  </section>;
}

export function ExplodedKernelStack() {
  const [view, setView] = useState<ViewState>({ layerId: null, componentId: null });
  const layer = useMemo(() => architectureLayers.find((item) => item.id === view.layerId) ?? null, [view.layerId]);
  const component = layer?.components.find((item) => item.id === view.componentId) ?? null;
  const overview = () => setView({ layerId: null, componentId: null });

  return <main className="pulse-kernel">
    <header className="pulse-kernel-header">
      <img src="/__mockup/images/cognirise/logo-blue.svg" alt="Cognirise" />
      <div className="pulse-header-center"><span>CogniOS</span><b>Exploded Kernel Stack</b></div>
      <span className="pulse-header-index">Reference architecture / 01</span>
    </header>
    <section className="pulse-kernel-intro">
      <div><p className="pulse-kicker">CogniOS · reference architecture</p><h1>One operating system.<br /><em>Six accountable planes.</em></h1></div>
      <p>Understand the operating model at a glance, then focus a layer and its component families without leaving the same spatial stage.</p>
    </section>
    {layer ? <Blueprint layer={layer} selectedComponent={component} onComponent={(next) => setView({ layerId: layer.id, componentId: next.id })} onBack={overview} /> : <section className="pulse-overview" aria-label="CogniOS six layer overview">
      <div className="overview-heading"><span>Bird’s-eye view / stable order</span><span>select a plate to focus</span></div>
      <div className="slab-machine">
        <Spine spine={architectureSpines[0]} side="left" /><Spine spine={architectureSpines[1]} side="right" />
        <div className="slab-stack">{architectureLayers.map((item, index) => <Plate key={item.id} layer={item} index={index} onSelect={() => setView({ layerId: item.id, componentId: null })} />)}</div>
      </div>
      <div className="machine-caption"><span>COGNIOS / KERNEL SECTION</span><strong>Six planes. One accountable machine.</strong><p>Layer order is stable; it does not imply sequence or data flow.</p></div>
    </section>}
    <section className="pulse-under-stage"><Legend /><div className="spine-note"><Waypoints size={17} /><span>Cross-cutting across all six layers:</span><b>AI governance & assurance</b><b>Platform engineering & operations</b></div></section>
    <section className="pulse-rationale"><div><p className="pulse-kicker">Research rationale</p><h2>Spatial clarity over<br /><em>simulated complexity.</em></h2></div><div className="rationale-copy"><div><b>Adopted</b><p>Stable bird’s-eye geometry, progressive disclosure, focus highlighting, locked architecture and semantic zoom.</p></div><div><b>Rejected</b><p>Invented personas and views, arbitrary canvas controls, animated traces, simulations, terminals, syscalls, schedulers, security rings and technical-stack claims.</p></div></div></section>
    <footer className="pulse-kernel-footer"><span><ShieldCheck size={15} /> Reference architecture · not a shipped-product capability claim</span><span>Cognirise / CogniOS</span></footer>
  </main>;
}