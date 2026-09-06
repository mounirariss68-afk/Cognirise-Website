import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown, X } from "lucide-react";
import { useSearch } from "wouter";
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
  const params = new URLSearchParams(search);
  const viewParam = params.get("view");
  const validLayer = architectureLayers.find((layer) => layer.id === params.get("layer"));
  const validComponent = validLayer?.components.find((component) => component.id === params.get("component"));
  const layerId = validLayer?.id ?? null;
  const componentId = validComponent?.id ?? null;
  const [lens, setLens] = useState<Lens>(viewParam === "security" ? "security" : "capability");
  const [contextSelection, setContextSelection] = useState<ContextSelection>(null);
  const reducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const componentRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const requestedFocus = useRef<{ type: "layer" | "component"; id: string } | null>(null);
  const previousLayer = useRef(layerId);
  const previousComponent = useRef(componentId);
  const initialArchitectureState = useRef({ hasHash: window.location.hash === "#architecture", layerId });

  const setArchitectureState = useCallback((
    nextLayer: string | null,
    nextComponent: string | null,
    options?: { replace?: boolean },
  ) => {
    const next = new URLSearchParams(search);
    if (nextLayer) next.set("layer", nextLayer);
    else next.delete("layer");
    if (nextComponent) next.set("component", nextComponent);
    else next.delete("component");
    const query = next.toString();
    const href = `${window.location.pathname}${query ? `?${query}` : ""}#architecture`;
    window.history[options?.replace ? "replaceState" : "pushState"](
      window.history.state,
      "",
      href,
    );
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
  }, [search]);

  const closeLayer = useCallback(() => {
    if (layerId) requestedFocus.current = { type: "layer", id: layerId };
    setContextSelection(null);
    setArchitectureState(null, null, { replace: true });
  }, [layerId, setArchitectureState]);

  const closeComponent = useCallback(() => {
    if (componentId) requestedFocus.current = { type: "component", id: componentId };
    setContextSelection(null);
    setArchitectureState(layerId, null, { replace: true });
  }, [componentId, layerId, setArchitectureState]);

  const selectLens = (nextLens: Lens) => {
    setLens(nextLens);
    setContextSelection(null);
    const next = new URLSearchParams(window.location.search);
    if (nextLens === "security") {
      next.set("view", "security");
      next.delete("component");
    } else {
      next.delete("view");
    }
    const query = next.toString();
    const href = `${window.location.pathname}${query ? `?${query}` : ""}#architecture`;
    window.history.pushState(window.history.state, "", href);
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
  };

  useEffect(() => {
    setLens(viewParam === "security" ? "security" : "capability");
  }, [viewParam]);

  useEffect(() => {
    if (!initialArchitectureState.current.hasHash && !initialArchitectureState.current.layerId) return;
    const scrollToStage = () => stageRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    scrollToStage();
    const settleTimer = window.setTimeout(scrollToStage, 500);
    return () => window.clearTimeout(settleTimer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (contextSelection) setContextSelection(null);
      else if (componentId) closeComponent();
      else if (layerId) closeLayer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeComponent, closeLayer, componentId, contextSelection, layerId]);

  useEffect(() => {
    const priorComponent = previousComponent.current;
    const priorLayer = previousLayer.current;
    const focusRequest = requestedFocus.current;
    requestedFocus.current = null;
    const focusDelay = reducedMotion ? 0 : 80;
    const focusTimer = window.setTimeout(() => {
      if (focusRequest?.type === "component") {
        componentRefs.current[focusRequest.id]?.focus();
        return;
      }
      if (focusRequest?.type === "layer") {
        layerRefs.current[focusRequest.id]?.focus();
        return;
      }
      const currentFocus = document.activeElement;
      if (
        currentFocus &&
        currentFocus !== document.body &&
        stageRef.current?.contains(currentFocus)
      ) return;
      if (priorComponent && !componentId && priorLayer === layerId) componentRefs.current[priorComponent]?.focus();
      else if (priorLayer && !layerId) layerRefs.current[priorLayer]?.focus();
    }, focusDelay);
    previousComponent.current = componentId;
    previousLayer.current = layerId;
    return () => window.clearTimeout(focusTimer);
  }, [componentId, layerId, reducedMotion]);

  return (
    <section className="co-architecture-stage" ref={stageRef} aria-label="Interactive CogniOS reference architecture">
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

      <div className="co-system-boundary">
        <div className="co-boundary-label">
          <span>CogniOS / operating-system boundary</span>
          <span>{lens === "capability" ? "Layer → component → detail" : "Layer → principle → controls"}</span>
        </div>

        <div className="coa-spine-field" aria-label="Continuous control spines">
          {architectureSpines.map((spine, index) => (
            <Spine
              key={spine.id}
              side={index === 0 ? "left" : "right"}
              spine={spine}
              active={contextSelection?.type === "spine" && contextSelection.id === spine.id}
              onSelect={() => setContextSelection({ type: "spine", id: spine.id })}
            />
          ))}
        </div>

        <div className={`co-system-layers ${layerId ? "has-focus" : ""}`}>
          {architectureLayers.map((layer) => {
            const active = layer.id === layerId;
            const quiet = Boolean(layerId && !active);
            return (
              <article
                key={layer.id}
                className={`coa-layer ${active ? "is-active" : ""} ${quiet ? "is-quiet" : ""}`}
                data-testid={`stage-layer-${layer.id}`}
              >
                <button
                  ref={(element) => {
                    layerRefs.current[layer.id] = element;
                  }}
                  type="button"
                  className="coa-layer-plane"
                   aria-label={active ? `${layer.name} selected` : `Open ${layer.name}`}
                  aria-expanded={active}
                  aria-controls={active ? `architecture-layer-${layer.id}` : undefined}
                  onClick={() => {
                     if (active) return;
                    setContextSelection(null);
                     setArchitectureState(layer.id, null);
                  }}
                >
                  <span className="coa-layer-number">{layer.number}</span>
                  <span className="coa-layer-heading">
                    <strong>{layer.name}</strong>
                    <small>{lens === "capability" ? layer.responsibility : layer.principle}</small>
                  </span>
                   <span className="coa-component-presence" aria-hidden="true">
                     {layer.components.map((component) => <i key={component.id} />)}
                   </span>
                  <EngineMark engine={layer.engine} />
                  <span className="coa-layer-count">
                    {lens === "capability" ? `${layer.components.length} components` : `${layer.controls.length} controls`}
                  </span>
                  <span className="coa-layer-action" aria-hidden="true">
                     {!active && <ArrowRight size={16} />}
                  </span>
                </button>
                 {active && (
                   <button
                     type="button"
                     className="coa-layer-close"
                      data-testid="architecture-layer-close"
                     aria-label={`Close ${layer.name} and show all architecture layers`}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        closeLayer();
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (event.detail === 0) closeLayer();
                      }}
                   >
                     <X size={16} />
                   </button>
                 )}

                <AnimatePresence initial={false}>
                  {active && (
                    <motion.div
                      id={`architecture-layer-${layer.id}`}
                      className="coa-layer-reconfiguration"
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {lens === "capability" ? (
                        <CapabilityStudy
                          layer={layer}
                          selected={componentId}
                          componentRefs={componentRefs}
                          onSelect={(id) => setArchitectureState(layer.id, componentId === id ? null : id)}
                          onCloseDetail={closeComponent}
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

      </div>

      <div className="co-requirements" aria-label="Cross-cutting architecture requirements">
        {architectureRequirements.map((requirement, index) => (
          <button
            type="button"
            key={requirement.id}
            className={contextSelection?.type === "requirement" && contextSelection.id === requirement.id ? "is-active" : ""}
            onClick={() => setContextSelection({ type: "requirement", id: requirement.id })}
          >
            <span>0{index + 1}</span>
            <strong>{requirement.name}</strong>
            <ArrowRight size={14} />
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
      <div className="sr-only" aria-live="polite">
        {componentId
          ? `${validComponent?.name} component detail selected within ${validLayer?.name}.`
          : layerId
            ? `${validLayer?.name} selected.`
            : "Complete six-layer architecture shown."}
      </div>
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
      className={`coa-spine coa-spine-${side} ${active ? "is-active" : ""}`}
      aria-pressed={active}
      onClick={onSelect}
    >
      <span>{spine.number}</span>
      <strong>{spine.name}</strong>
      <ArrowRight size={14} />
    </button>
  );
}

function EngineMark({ engine }: { engine?: string }) {
  const related = engineFor(engine);
  if (!related) return null;
  return (
    <span className="co-engine-mark" style={{ "--engine": related.color } as React.CSSProperties}>
      <i />
      {related.name}
    </span>
  );
}

function CapabilityStudy({
  layer,
  selected,
  onSelect,
  componentRefs,
  onCloseDetail,
}: {
  layer: ArchitectureLayer;
  selected: string | null;
  onSelect: (id: string) => void;
  componentRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  onCloseDetail: () => void;
}) {
  const selectedComponent = layer.components.find((component) => component.id === selected);
  return (
    <div className={`co-capability-study ${selectedComponent ? "has-detail is-l3" : "is-l2"}`}>
       <div className="co-component-rail" aria-label={`${layer.name} components`}>
        {layer.components.map((component, index) => {
          const active = component.id === selected;
          return (
            <button
              key={component.id}
              type="button"
              ref={(element) => {
                componentRefs.current[component.id] = element;
              }}
              className={active ? "is-active" : ""}
              aria-expanded={active}
              aria-controls={active ? `architecture-component-${component.id}` : undefined}
              onClick={() => onSelect(component.id)}
            >
              <span className="co-component-index">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <strong>{component.name}</strong>
                <small>{component.responsibility}</small>
              </span>
              <EngineMark engine={component.engine} />
              <ChevronDown size={15} className="co-component-chevron" />
            </button>
          );
        })}
      </div>
      <AnimatePresence initial={false} mode="popLayout">
        {selectedComponent && (
          <ComponentDetail
            key={selectedComponent.id}
            layer={layer}
            component={selectedComponent}
             onClose={onCloseDetail}
          />
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
  const reducedMotion = useReducedMotion();
  return (
    <motion.aside
      ref={ref}
      id={`architecture-component-${component.id}`}
      className="co-component-detail"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.25 }}
    >
      <button
        type="button"
        className="co-component-detail-close"
         data-testid="architecture-component-close"
        aria-label={`Close ${component.name} detail and return to ${layer.name} components`}
         onPointerDown={(event) => {
           event.preventDefault();
           event.stopPropagation();
           onClose();
         }}
         onClick={(event) => {
           event.stopPropagation();
           if (event.detail === 0) onClose();
         }}
      >
        <X size={17} />
      </button>
      <span className="co-detail-crumb">Architecture / {layer.name} / component</span>
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
    </motion.aside>
  );
});

ComponentDetail.displayName = "ComponentDetail";

function SecurityStudy({ layer }: { layer: ArchitectureLayer }) {
  return (
    <div className="co-security-study">
      <div>
        <span className="co-study-label">Layer principle</span>
        <h3>{layer.principle}</h3>
        <p>These are the approved layer-level reference controls for the {layer.name.toLowerCase()}; component-specific applicability is not implied.</p>
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
    >
      <button type="button" onClick={onClose} aria-label="Close architecture note"><X size={16} /></button>
      <span>{spine ? "Cross-cutting spine" : "Cross-cutting requirement"}</span>
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