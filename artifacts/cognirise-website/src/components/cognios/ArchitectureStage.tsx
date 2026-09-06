import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, ChevronDown, X } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import {
  architectureEngines,
  architectureLayers,
  architectureRequirements,
  architectureSpines,
  type ArchitectureComponent,
  type ArchitectureLayer,
} from "@/data/cognios-architecture";
import "./ArchitectureStage.css";

type Lens = "capability" | "security";
type ContextSelection = { type: "spine" | "requirement"; id: string } | null;

const engineFor = (name?: string) =>
  name ? architectureEngines.find((engine) => engine.name === name) : undefined;

export function ArchitectureStage() {
  const search = useSearch();
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const viewParam = params.get("view");
  const validLayer = architectureLayers.find((layer) => layer.id === params.get("layer"));
  const validComponent = validLayer?.components.find((component) => component.id === params.get("component"));
  const layerId = validLayer?.id ?? null;
  const componentId = validComponent?.id ?? null;
  const activeLevel = componentId ? 2 : layerId ? 1 : 0;
  const [lens, setLens] = useState<Lens>(viewParam === "security" ? "security" : "capability");
  const [contextSelection, setContextSelection] = useState<ContextSelection>(null);
  const reducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const componentRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousLayer = useRef(layerId);
  const previousComponent = useRef(componentId);

  const setArchitectureState = (nextLayer: string | null, nextComponent: string | null) => {
    const next = new URLSearchParams(search);
    if (nextLayer) next.set("layer", nextLayer);
    else next.delete("layer");
    if (nextComponent) next.set("component", nextComponent);
    else next.delete("component");
    const query = next.toString();
    setLocation(`${location.split("?")[0]}${query ? `?${query}` : ""}#architecture`);
  };

  const selectLens = (nextLens: Lens) => {
    setLens(nextLens);
    setContextSelection(null);
    const next = new URLSearchParams(search);
    if (nextLens === "security") {
      next.set("view", "security");
      next.delete("component");
    } else {
      next.delete("view");
    }
    const query = next.toString();
    setLocation(`${location.split("?")[0]}${query ? `?${query}` : ""}#architecture`);
  };

  useEffect(() => {
    setLens(viewParam === "security" ? "security" : "capability");
  }, [viewParam]);

  useEffect(() => {
    if (window.location.hash !== "#architecture" && !layerId) return;
    const scrollToStage = () => stageRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    scrollToStage();
    const settleTimer = window.setTimeout(scrollToStage, 500);
    return () => window.clearTimeout(settleTimer);
  }, [layerId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (contextSelection) setContextSelection(null);
      else if (componentId) setArchitectureState(layerId, null);
      else if (layerId) setArchitectureState(null, null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [componentId, contextSelection, layerId, location, search]);

  useEffect(() => {
    if (previousComponent.current && !componentId) componentRefs.current[previousComponent.current]?.focus();
    if (previousLayer.current && !layerId) layerRefs.current[previousLayer.current]?.focus();
    previousComponent.current = componentId;
    previousLayer.current = layerId;
  }, [componentId, layerId]);

  return (
    <section className="co-architecture-stage" ref={stageRef} aria-label="Interactive CogniOS reference architecture" data-testid="architecture-stage">
      <header className="co-architecture-head">
        <div>
          <span className="co-architecture-kicker">CogniOS / reference architecture</span>
          <p>One operating system. Six responsibility layers. Two continuous control spines.</p>
        </div>
        <div className="co-lens-switch" aria-label="Architecture view">
          {(["capability", "security"] as Lens[]).map((item) => (
            <button
              key={item}
              type="button"
              className={lens === item ? "is-active" : ""}
              aria-pressed={lens === item}
              onClick={() => selectLens(item)}
              data-testid={`lens-${item}`}
            >
              {item} view
            </button>
          ))}
        </div>
      </header>

      <div className="co-engine-legend" aria-label="Engine relationship legend">
        <span className="co-legend-label">Engine association</span>
        {architectureEngines.map((engine) => (
          <span key={engine.id}>
            <i style={{ "--engine": engine.color } as React.CSSProperties} />
            {engine.name}
          </span>
        ))}
      </div>

      <div className="co-system-boundary" data-testid="system-boundary">
        <div className="co-boundary-label">
          <span>CogniOS / operating-system boundary</span>
          <div className="co-level-track" aria-label={`Architecture level L${activeLevel}`} data-testid="architecture-level">
            <span className={activeLevel === 0 ? "is-active" : ""}>L0 System</span>
            <i aria-hidden="true">→</i>
            <span className={activeLevel === 1 ? "is-active" : ""}>L1 Layer</span>
            <i aria-hidden="true">→</i>
            <span className={activeLevel === 2 ? "is-active" : ""}>L2 Component</span>
          </div>
        </div>

        <div className="co-system-grid">
          <Spine
            side="top"
            spine={architectureSpines[1]}
            active={contextSelection?.type === "spine" && contextSelection.id === architectureSpines[1].id}
            onSelect={() => setContextSelection({ type: "spine", id: architectureSpines[1].id })}
          />

          {architectureLayers.map((layer) => {
            const active = layer.id === layerId;
            const quiet = Boolean(layerId && !active);
            return (
              <React.Fragment key={layer.id}>
                <button
                  ref={(element) => {
                    layerRefs.current[layer.id] = element;
                  }}
                  type="button"
                  className={`coa-layer-btn ${active ? "is-active" : ""} ${quiet ? "is-quiet" : ""}`}
                  data-layer-id={layer.id}
                  aria-expanded={active}
                  aria-controls={active ? `architecture-layer-${layer.id}` : undefined}
                  aria-label={active ? `Close ${layer.name} study` : `Open ${layer.name} study`}
                  onClick={() => {
                    setContextSelection(null);
                    setArchitectureState(active ? null : layer.id, null);
                  }}
                  data-testid={`layer-btn-${layer.id}`}
                >
                  <div className="coa-layer-header">
                    <span className="coa-layer-number">{layer.number}</span>
                    <span className="coa-layer-action" aria-hidden="true">
                      {active ? <X size={16} /> : <ArrowDown size={16} />}
                    </span>
                  </div>
                  <div className="coa-layer-title">
                    <strong>{layer.name}</strong>
                  </div>
                  <div className="coa-layer-desc">
                    {lens === "capability" ? layer.responsibility : layer.principle}
                  </div>
                  <div className="coa-layer-footer">
                    <EngineMark engine={layer.engine} />
                    <span className="coa-layer-count">
                      {lens === "capability" ? `${layer.components.length} components` : `${layer.controls.length} controls`}
                    </span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {active && (
                    <motion.div
                      id={`architecture-layer-${layer.id}`}
                      className="coa-layer-expansion"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
                      data-testid={`layer-content-${layer.id}`}
                    >
                      {lens === "capability" ? (
                        <CapabilityStudy
                          layer={layer}
                          selected={componentId}
                          componentRefs={componentRefs}
                          onSelect={(id) => setArchitectureState(layer.id, componentId === id ? null : id)}
                        />
                      ) : (
                        <SecurityStudy layer={layer} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}

          <Spine
            side="bottom"
            spine={architectureSpines[0]}
            active={contextSelection?.type === "spine" && contextSelection.id === architectureSpines[0].id}
            onSelect={() => setContextSelection({ type: "spine", id: architectureSpines[0].id })}
          />
        </div>
      </div>

      <div className="co-requirements" aria-label="Cross-cutting architecture requirements">
        {architectureRequirements.map((requirement, index) => (
          <button
            type="button"
            key={requirement.id}
            className={`co-req-btn ${contextSelection?.type === "requirement" && contextSelection.id === requirement.id ? "is-active" : ""}`}
            onClick={() => setContextSelection({ type: "requirement", id: requirement.id })}
            data-testid={`req-btn-${requirement.id}`}
          >
            <span className="co-req-num">0{index + 1}</span>
            <strong className="co-req-title">{requirement.name}</strong>
            <ArrowRight size={14} className="co-req-arrow" />
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {contextSelection && (
          <ContextStudy
            key={`${contextSelection.type}-${contextSelection.id}`}
            selection={contextSelection}
            onClose={() => setContextSelection(null)}
          />
        )}
      </AnimatePresence>

      <footer className="co-notation">
        <span><i className="co-notation-spine" /> Continuous band = cross-cutting spine</span>
        <span><i className="co-notation-layer" /> Enclosure = component membership</span>
        <span><i className="co-notation-engine" /> Signal square = documented engine association</span>
      </footer>
    </section>
  );
}

function Spine({
  spine,
  side,
  active,
  onSelect,
}: {
  spine: (typeof architectureSpines)[number];
  side: "top" | "bottom";
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`coa-spine-band coa-spine-band-${side} ${active ? "is-active" : ""}`}
      aria-pressed={active}
      onClick={onSelect}
      data-testid={`spine-btn-${spine.id}`}
    >
      <span className="coa-spine-band-letter">{spine.number}</span>
      <span className="coa-spine-band-name">{spine.name}</span>
      <ArrowRight size={14} className="coa-spine-band-arrow" />
    </button>
  );
}

function EngineMark({ engine }: { engine?: string }) {
  const related = engineFor(engine);
  if (!related) return null;
  return (
    <span className="co-engine-mark" style={{ "--engine": related.color } as React.CSSProperties}>
      <i />
      <span>{related.name}</span>
    </span>
  );
}

function CapabilityStudy({
  layer,
  selected,
  onSelect,
  componentRefs,
}: {
  layer: ArchitectureLayer;
  selected: string | null;
  onSelect: (id: string) => void;
  componentRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
}) {
  return (
    <div className="co-capability-study" data-testid="capability-study">
       <div className="co-component-rail" aria-label={`${layer.name} components`}>
        {layer.components.map((component, index) => {
          const active = component.id === selected;
          return (
            <React.Fragment key={component.id}>
              <button
                ref={(element) => {
                  componentRefs.current[component.id] = element;
                }}
                type="button"
                className={`co-comp-btn ${active ? "is-active" : ""}`}
                aria-expanded={active}
                aria-controls={active ? `architecture-component-${component.id}` : undefined}
                aria-label={active ? `Close ${component.name} detail` : `Open ${component.name} detail`}
                onClick={() => onSelect(component.id)}
                data-testid={`component-btn-${component.id}`}
              >
                <div className="co-comp-header">
                  <span className="co-comp-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="co-comp-action" aria-hidden="true">{active ? <X size={14} /> : <ChevronDown size={14} />}</span>
                </div>
                <div className="co-comp-title">{component.name}</div>
                <div className="co-comp-desc">{component.responsibility}</div>
                <div className="co-comp-footer">
                  <EngineMark engine={component.engine} />
                </div>
              </button>
              
              <AnimatePresence initial={false}>
                {active && (
                  <motion.div
                    className="co-comp-expansion"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ComponentDetail
                      layer={layer}
                      component={component}
                      onClose={() => onSelect(component.id)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

const ComponentDetail = React.forwardRef<HTMLElement, {
  layer: ArchitectureLayer;
  component: ArchitectureComponent;
  onClose: () => void;
}>(function ComponentDetail({ layer, component, onClose }, ref) {
  return (
    <aside
      ref={ref}
      id={`architecture-component-${component.id}`}
      className="co-component-detail"
      data-testid={`component-detail-${component.id}`}
    >
      <header className="co-detail-header">
        <span className="co-detail-crumb">Architecture / {layer.name} / component</span>
        <button className="co-detail-close" onClick={onClose} aria-label="Close component detail" data-testid="close-detail-btn">
          <X size={16} />
        </button>
      </header>
      <h3>{component.name}</h3>
      <p className="co-detail-responsibility">{component.responsibility}</p>
      {component.engine && (
        <div className="co-detail-engine">
          <span>Documented engine association</span>
          <EngineMark engine={component.engine} />
        </div>
      )}
      <DetailBlock title="Reference details" items={component.details} />
      <div className="co-detail-principle">
        <span>Layer principle</span>
        <p>{layer.principle}</p>
      </div>
      <DetailBlock title="Controls at this layer" items={layer.controls} />
    </aside>
  );
});

ComponentDetail.displayName = "ComponentDetail";

function SecurityStudy({ layer }: { layer: ArchitectureLayer }) {
  return (
    <div className="co-security-study">
      <div>
        <span className="co-study-label">Layer principle</span>
        <h3>{layer.principle}</h3>
        <p>These controls apply to the complete {layer.name.toLowerCase()}, including every component shown in the capability view.</p>
      </div>
      <DetailBlock title="Architecture controls" items={layer.controls} />
    </div>
  );
}

function DetailBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="co-detail-block">
      <span>{title}</span>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function ContextStudy({
  selection,
  onClose,
}: {
  selection: NonNullable<ContextSelection>;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const spine = selection.type === "spine" ? architectureSpines.find((item) => item.id === selection.id) : undefined;
  const requirement = selection.type === "requirement" ? architectureRequirements.find((item) => item.id === selection.id) : undefined;
  return (
    <motion.aside
      className="co-context-study"
      initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      transition={{ duration: reducedMotion ? 0 : 0.24 }}
      data-testid={`context-study-${selection.id}`}
    >
      <button type="button" className="co-context-close" onClick={onClose} aria-label="Close architecture note" data-testid="close-context-btn"><X size={16} /></button>
      <span className="co-study-label">{spine ? "Cross-cutting spine" : "Cross-cutting requirement"}</span>
      <h3>{spine?.name ?? requirement?.name}</h3>
      <p>{spine?.description ?? requirement?.description}</p>
      {spine && (
        <div className="co-context-components">
          {spine.components.map((component) => <span key={component}>{component}</span>)}
        </div>
      )}
    </motion.aside>
  );
}
