import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown, X } from "lucide-react";
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
  const [, forceHistorySync] = useState(0);
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
    const next = new URLSearchParams(window.location.search);
    if (nextLayer) next.set("layer", nextLayer);
    else next.delete("layer");
    if (nextComponent) next.set("component", nextComponent);
    else next.delete("component");
    const query = next.toString();
    setLocation(`${window.location.pathname}${query ? `?${query}` : ""}#architecture`);
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
    const syncFromHistory = () => forceHistorySync((version) => version + 1);
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);

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
      const current = new URLSearchParams(window.location.search);
      const currentLayer = current.get("layer");
      const currentComponent = current.get("component");
      if (contextSelection) setContextSelection(null);
      else if (currentComponent) setArchitectureState(currentLayer, null);
      else if (currentLayer) setArchitectureState(null, null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [componentId, contextSelection, layerId, location, search]);

  useEffect(() => {
    const componentToRestore = previousComponent.current && !componentId
      ? componentRefs.current[previousComponent.current]
      : null;
    const layerToRestore = previousLayer.current && !layerId
      ? layerRefs.current[previousLayer.current]
      : null;

    const focusFrame = window.requestAnimationFrame(() => {
      if (componentToRestore?.isConnected) componentToRestore.focus();
      else if (layerToRestore?.isConnected) layerToRestore.focus();
    });

    previousComponent.current = componentId;
    previousLayer.current = layerId;
    return () => window.cancelAnimationFrame(focusFrame);
  }, [componentId, layerId]);

  return (
    <section className="coas-stage" ref={stageRef} aria-label="Interactive CogniOS reference architecture" data-testid="architecture-stage">
      <header className="coas-header">
        <div>
          <span className="coas-kicker">CogniOS / reference architecture</span>
          <p>One operating system. Six responsibility layers. Two continuous control spines.</p>
        </div>
        <div className="coas-lens-switch" aria-label="Architecture view">
          {(["capability", "security"] as Lens[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`coas-lens-btn ${lens === item ? "is-active" : ""}`}
              aria-pressed={lens === item}
              onClick={() => selectLens(item)}
              data-testid={`lens-${item}`}
            >
              {item} view
            </button>
          ))}
        </div>
      </header>

      <div className="coas-engine-legend" aria-label="Engine relationship legend">
        <span className="coas-legend-label">Engine association</span>
        {architectureEngines.map((engine) => (
          <span key={engine.id} className="coas-engine-mark" style={{ "--engine": engine.color } as React.CSSProperties}>
            <i />
            <span>{engine.name}</span>
          </span>
        ))}
      </div>

      <div className="coas-boundary" data-testid="system-boundary">
        <div className="coas-boundary-top">
          <span className="coas-label">CogniOS / operating-system boundary</span>
          <div className="coas-level-track" aria-label={`Architecture level L${activeLevel}`} data-testid="architecture-level">
            <span className={activeLevel === 0 ? "is-active" : ""}>L0 System</span>
            <i aria-hidden="true">→</i>
            <span className={activeLevel === 1 ? "is-active" : ""}>L1 Layer</span>
            <i aria-hidden="true">→</i>
            <span className={activeLevel === 2 ? "is-active" : ""}>L2 Component</span>
          </div>
        </div>

        <div className="coas-system-grid">
          <Spine
            side="left"
            spine={architectureSpines[0]}
            active={contextSelection?.type === "spine" && contextSelection.id === architectureSpines[0].id}
            onSelect={() => setContextSelection({ type: "spine", id: architectureSpines[0].id })}
          />

          <div className="coas-layers">
            {architectureLayers.map((layer) => {
              const active = layer.id === layerId;
              const quiet = Boolean(layerId && !active);
              return (
                <article
                  key={layer.id}
                  className={`coas-layer ${active ? "is-active" : ""} ${quiet ? "is-quiet" : ""}`}
                  data-layer-id={layer.id}
                  data-testid={`stage-layer-${layer.id}`}
                >
                  <button
                    ref={(element) => {
                      layerRefs.current[layer.id] = element;
                    }}
                    type="button"
                    className="coas-layer-btn"
                    aria-expanded={active}
                    aria-controls={active ? `architecture-layer-${layer.id}` : undefined}
                    aria-label={active ? `Close ${layer.name} layer study` : `Open ${layer.name} layer study`}
                    onClick={() => {
                      setContextSelection(null);
                      setArchitectureState(active ? null : layer.id, null);
                    }}
                    data-testid={`layer-btn-${layer.id}`}
                  >
                    <span className="coas-layer-num">{layer.number}</span>
                    <div className="coas-layer-title">
                      <strong>{layer.name}</strong>
                      <small>{lens === "capability" ? layer.responsibility : layer.principle}</small>
                    </div>
                    <div className="coas-layer-meta">
                      <EngineMark engine={layer.engine} />
                      <span className="coas-layer-count">
                        {lens === "capability" ? `${layer.components.length} components` : `${layer.controls.length} controls`}
                      </span>
                    </div>
                    <span className="coas-layer-action" aria-hidden="true">
                      {active ? <X size={16} /> : <ArrowRight size={16} />}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {active && (
                      <motion.div
                        id={`architecture-layer-${layer.id}`}
                        className="coas-layer-study"
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
                </article>
              );
            })}
          </div>

          <Spine
            side="right"
            spine={architectureSpines[1]}
            active={contextSelection?.type === "spine" && contextSelection.id === architectureSpines[1].id}
            onSelect={() => setContextSelection({ type: "spine", id: architectureSpines[1].id })}
          />
        </div>
      </div>

      <div className="coas-reqs" aria-label="Cross-cutting architecture requirements">
        {architectureRequirements.map((requirement, index) => (
          <button
            type="button"
            key={requirement.id}
            className={`coas-req-btn ${contextSelection?.type === "requirement" && contextSelection.id === requirement.id ? "is-active" : ""}`}
            onClick={() => setContextSelection({ type: "requirement", id: requirement.id })}
            data-testid={`req-btn-${requirement.id}`}
          >
            <span className="coas-req-num">0{index + 1}</span>
            <strong className="coas-req-title">{requirement.name}</strong>
            <ArrowRight size={14} className="coas-req-arr" />
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

      <footer className="coas-notation">
        <span><i className="coas-notation-spine" /> Continuous band = cross-cutting spine</span>
        <span><i className="coas-notation-layer" /> Enclosure = component membership</span>
        <span><i className="coas-notation-engine" /> Signal square = documented engine association</span>
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
  side: "left" | "right";
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`coas-spine coas-spine-${side} ${active ? "is-active" : ""}`}
      aria-pressed={active}
      onClick={onSelect}
      data-testid={`spine-btn-${spine.id}`}
    >
      <span className="coas-spine-letter">{spine.number}</span>
      <span className="coas-spine-name">{spine.name}</span>
      <ArrowRight size={14} className="coas-spine-arrow" />
    </button>
  );
}

function EngineMark({ engine }: { engine?: string }) {
  const related = engineFor(engine);
  if (!related) return null;
  return (
    <span className="coas-engine-mark" style={{ "--engine": related.color } as React.CSSProperties}>
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
  const selectedComponent = layer.components.find(c => c.id === selected);

  return (
    <div className="coas-study-inner" data-testid="capability-study">
       <div className="coas-component-rail" aria-label={`${layer.name} components`}>
        {layer.components.map((component, index) => {
          const active = component.id === selected;
          return (
            <button
              key={component.id}
              ref={(element) => {
                componentRefs.current[component.id] = element;
              }}
              type="button"
              className={`coas-comp-btn ${active ? "is-active" : ""}`}
              aria-expanded={active}
              aria-controls={active ? `architecture-component-${component.id}` : undefined}
              aria-label={active ? `Close ${component.name} component detail` : `Open ${component.name} component detail`}
              onClick={() => onSelect(component.id)}
              data-testid={`component-btn-${component.id}`}
            >
              <div className="coas-comp-head">
                <span className="coas-comp-idx">{String(index + 1).padStart(2, "0")}</span>
                <span className="coas-comp-act" aria-hidden="true">{active ? <X size={14} /> : <ChevronDown size={14} />}</span>
              </div>
              <div className="coas-comp-title">{component.name}</div>
              <div className="coas-comp-desc">{component.responsibility}</div>
              <div className="coas-comp-foot">
                <EngineMark engine={component.engine} />
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {selectedComponent && (
          <motion.div
            className="coas-comp-detail-wrap"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <ComponentDetail
              layer={layer}
              component={selectedComponent}
              onClose={() => onSelect(selectedComponent.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
      className="coas-detail-panel"
      data-testid={`component-detail-${component.id}`}
    >
      <header className="coas-detail-head">
        <span className="coas-detail-crumb">Architecture / {layer.name} / component</span>
        <button className="coas-detail-close" onClick={onClose} aria-label="Close component detail" data-testid="close-detail-btn">
          <X size={16} />
        </button>
      </header>
      <div className="coas-detail-summary">
        <div>
          <h3>{component.name}</h3>
          <p className="coas-detail-resp">{component.responsibility}</p>
        </div>
        {component.engine && (
          <div className="coas-detail-engine">
            <span className="coas-detail-label">Documented engine association</span>
            <EngineMark engine={component.engine} />
          </div>
        )}
      </div>

      <div className="coas-detail-grid">
        <DetailBlock title="Reference details" items={component.details} />
        <div className="coas-detail-principle">
          <span className="coas-detail-label">Layer principle</span>
          <p className="coas-detail-principle-text">{layer.principle}</p>
        </div>
        <DetailBlock title="Controls at this layer" items={layer.controls} />
      </div>
    </aside>
  );
});

ComponentDetail.displayName = "ComponentDetail";

function SecurityStudy({ layer }: { layer: ArchitectureLayer }) {
  return (
    <div className="coas-security-study">
      <div>
        <span className="coas-label">Layer principle</span>
        <h3>{layer.principle}</h3>
        <p>These controls apply to the complete {layer.name.toLowerCase()}, including every component shown in the capability view.</p>
      </div>
      <DetailBlock title="Architecture controls" items={layer.controls} />
    </div>
  );
}

function DetailBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="coas-detail-block">
      <span className="coas-detail-label">{title}</span>
      <ul className="coas-detail-list">
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
      className="coas-context"
      initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      transition={{ duration: reducedMotion ? 0 : 0.24 }}
      data-testid={`context-study-${selection.id}`}
    >
      <button type="button" className="coas-context-close" onClick={onClose} aria-label="Close architecture note" data-testid="close-context-btn">
        <X size={16} />
      </button>
      <span className="coas-label">{spine ? "Cross-cutting spine" : "Cross-cutting requirement"}</span>
      <h3>{spine?.name ?? requirement?.name}</h3>
      <p>{spine?.description ?? requirement?.description}</p>
      {spine && (
        <div className="coas-context-tags">
          {spine.components.map((component) => <span key={component}>{component}</span>)}
        </div>
      )}
    </motion.aside>
  );
}
