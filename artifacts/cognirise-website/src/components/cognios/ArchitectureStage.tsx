import React, { useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { architectureLayers, architectureSpines } from "@/data/cognios-architecture";
import "./ArchitectureStage.css";

function getLayout(index: number, total: number) {
  if (total === 6) {
    const pos = ["top-left", "top-center", "top-right", "bottom-right", "bottom-center", "bottom-left"][index];
    const coords = [
      { cx: 20, cy: 25, dx: -1, dy: -1 },
      { cx: 50, cy: 12, dx: 0, dy: -1 },
      { cx: 80, cy: 25, dx: 1, dy: -1 },
      { cx: 80, cy: 75, dx: 1, dy: 1 },
      { cx: 50, cy: 88, dx: 0, dy: 1 },
      { cx: 20, cy: 75, dx: -1, dy: 1 },
    ][index];
    return { ...coords, pos };
  }
  const pos = ["top-left", "top-center", "top-right", "bottom-right", "bottom-left"][index];
  const coords = [
    { cx: 20, cy: 30, dx: -1, dy: -1 },
    { cx: 50, cy: 12, dx: 0, dy: -1 },
    { cx: 80, cy: 30, dx: 1, dy: -1 },
    { cx: 75, cy: 82, dx: 1, dy: 1 },
    { cx: 25, cy: 82, dx: -1, dy: 1 },
  ][index];
  return { ...coords, pos };
}

export function ArchitectureStage() {
  const search = useSearch();
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(search);

  const rawLayerId = params.get("layer");
  const rawCompId = params.get("component");

  // Validate URL state against active architecture rules
  const validLayer = architectureLayers.find(l => l.id === rawLayerId);
  const validatedLayerId = validLayer ? rawLayerId : null;

  const validComp = validLayer?.components.find(c => c.id === rawCompId);
  const validatedComponentId = validComp ? rawCompId : null;

  const prefersReducedMotion = useReducedMotion();
  
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const compRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  
  const prevLayerId = useRef(validatedLayerId);
  const prevCompId = useRef(validatedComponentId);

  const setParams = (layer: string | null, component: string | null) => {
    const newParams = new URLSearchParams(search);
    if (layer) newParams.set("layer", layer);
    else newParams.delete("layer");

    if (component) newParams.set("component", component);
    else newParams.delete("component");

    const qs = newParams.toString();
    const hash = window.location.hash || "#architecture";
    setLocation(location.split("?")[0] + (qs ? "?" + qs : "") + hash);
  };

  const closeLayer = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setParams(null, null);
  };
  
  const openLayer = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setParams(id, null);
  };
  
  const toggleComponent = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setParams(validatedLayerId, validatedComponentId === id ? null : id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (validatedComponentId) {
          setParams(validatedLayerId, null);
        } else if (validatedLayerId) {
          closeLayer();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [validatedLayerId, validatedComponentId, search, location]);

  useEffect(() => {
    if (window.location.hash === "#architecture" || validatedLayerId) {
      setTimeout(() => {
        stageRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (prevCompId.current && !validatedComponentId) {
      const el = compRefs.current[prevCompId.current];
      if (el) el.focus();
    }
    if (prevLayerId.current && !validatedLayerId && !validatedComponentId) {
      const el = layerRefs.current[prevLayerId.current];
      if (el) el.focus();
    }
    if (prevLayerId.current !== validatedLayerId && validatedLayerId) {
      const el = layerRefs.current[validatedLayerId];
      if (el) el.focus();
    }
    prevCompId.current = validatedComponentId;
    prevLayerId.current = validatedLayerId;
  }, [validatedLayerId, validatedComponentId]);

  return (
    <div className="co-stage" ref={stageRef} aria-label="CogniOS Architecture Stage">
      <div className="co-stage-spines">
        <div className={`co-stage-spine ops ${validatedLayerId ? "is-active" : ""}`}>{architectureSpines[1].name}</div>
        <div className={`co-stage-spine assurance ${validatedLayerId ? "is-active" : ""}`}>{architectureSpines[0].name}</div>
      </div>
      
      <div className="co-stage-planes">
        {architectureLayers.map((layer) => {
          const isActive = validatedLayerId === layer.id;
          const isOtherActive = validatedLayerId && !isActive;

          return (
            <div
              key={layer.id}
              className={`co-plane ${isActive ? "is-active" : ""} ${isOtherActive ? "is-collapsed" : ""}`}
              data-testid={`stage-layer-${layer.id}`}
            >
              <button
                className="co-plane-head"
                onClick={(e) => isActive ? closeLayer(e) : openLayer(layer.id, e)}
                aria-expanded={isActive}
                aria-controls={isActive ? `layer-body-${layer.id}` : undefined}
                data-testid={isActive ? "button-close-layer" : undefined}
                ref={(el) => { layerRefs.current[layer.id] = el; }}
              >
                <span className="co-plane-num">{layer.number}</span>
                <div>
                  <h3 className="co-plane-title">{layer.name}</h3>
                  <p className="co-plane-desc">{layer.responsibility}</p>
                </div>
                <div className="co-plane-action" aria-hidden="true">
                  {isActive ? <X size={20} /> : <ArrowRight size={18} />}
                </div>
              </button>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    id={`layer-body-${layer.id}`}
                    className={`co-constellation ${validatedComponentId ? "has-active" : ""}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
                  >
                    <svg className="co-constellation-lines hidden md:block absolute inset-0 w-full h-full pointer-events-none z-0">
                      {layer.components.map((c, i) => {
                        const layout = getLayout(i, layer.components.length);
                        const isCompActive = validatedComponentId === c.id;

                        return (
                          <g key={`line-${c.id}`} className={isCompActive ? "is-active" : ""} style={{ transition: 'opacity 0.3s' }}>
                            <line
                              x1="50%" y1="50%"
                              x2={`${layout.cx}%`} y2={`${layout.cy}%`}
                              stroke={isCompActive ? "hsl(var(--brand-coral))" : "rgba(255,255,255,0.3)"}
                              strokeWidth="1"
                            />
                            {c.engine && (
                              <line
                                x1={`${layout.cx}%`} y1={`${layout.cy}%`}
                                x2={`${layout.cx < 50 ? 8 : 92}%`} y2={`${layout.cy}%`}
                                stroke="hsl(var(--brand-pink))"
                                strokeOpacity="0.4"
                                strokeDasharray="2 4"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    <div className="co-engine-markers hidden md:block absolute inset-0 pointer-events-none z-10">
                      {layer.components.filter(c => c.engine).map((c) => {
                        const idx = layer.components.findIndex(x => x.id === c.id);
                        const layout = getLayout(idx, layer.components.length);
                        const isRight = layout.cx >= 50;
                        const ex = isRight ? 92 : 8;
                        const isOtherActive = validatedComponentId && validatedComponentId !== c.id;

                        return (
                          <div
                            key={`engine-${c.id}`}
                            className="absolute flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--brand-pink))] transition-opacity duration-300"
                            style={{
                              top: `${layout.cy}%`,
                              left: isRight ? 'auto' : `${ex}%`,
                              right: isRight ? `${100 - ex}%` : 'auto',
                              transform: 'translateY(-50%)',
                              opacity: isOtherActive ? 0.15 : 1
                            }}
                          >
                            {!isRight && <div className="w-1.5 h-1.5 border border-[hsl(var(--brand-pink))] rotate-45" />}
                            <span className="whitespace-nowrap">Engine: {c.engine}</span>
                            {isRight && <div className="w-1.5 h-1.5 border border-[hsl(var(--brand-pink))] rotate-45" />}
                          </div>
                        );
                      })}
                    </div>

                    <div className={`co-core ${validatedComponentId ? "is-faded" : ""}`}>
                      <h4>{layer.name}</h4>
                      <p>{layer.principle}</p>
                      <div className="co-core-controls">
                        Controls: {layer.controls.join(" · ")}
                      </div>
                    </div>

                    {layer.components.map((comp, i) => {
                      const layout = getLayout(i, layer.components.length);
                      const isCompActive = validatedComponentId === comp.id;
                      
                      return (
                        <div
                          key={comp.id}
                          className={`co-node-wrap ${isCompActive ? "is-active" : ""}`}
                          style={{
                            '--cx': `${layout.cx}%`,
                            '--cy': `${layout.cy}%`,
                            '--dx': layout.dx,
                            '--dy': layout.dy
                          } as React.CSSProperties}
                          data-pos={layout.pos}
                          data-mobile-side={i % 2 === 0 ? "left" : "right"}
                        >
                          <button
                            className="co-node-trigger"
                            onClick={(e) => toggleComponent(comp.id, e)}
                            aria-expanded={isCompActive}
                            aria-controls={isCompActive ? `comp-detail-${comp.id}` : undefined}
                            data-testid={`stage-component-${comp.id}`}
                            ref={(el) => { compRefs.current[comp.id] = el; }}
                          >
                            <div className="co-node-dot" />
                            <span className="co-node-title">
                              {comp.name}
                              {comp.engine && <span className="md:hidden block text-[9px] font-bold text-[hsl(var(--brand-pink))] tracking-widest uppercase mt-1">Engine: {comp.engine}</span>}
                            </span>
                          </button>

                          <AnimatePresence>
                            {isCompActive && (
                              <motion.div
                                id={`comp-detail-${comp.id}`}
                                className="co-node-details"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                              >
                                <h4 className="font-display text-xl text-white font-semibold mb-2">{comp.name}</h4>
                                <p className="text-[14px] text-[#aab8ce] mb-5 leading-relaxed">{comp.responsibility}</p>

                                {comp.engine && (
                                  <div className="mb-5 co-engine-detail">
                                    <span className="block text-[10px] uppercase tracking-widest text-[hsl(var(--brand-pink))] mb-1">Engine Relationship</span>
                                    <p className="text-[13px] text-[#e2e8f0]"><strong className="text-white">{comp.engine}</strong> is a related capability.</p>
                                  </div>
                                )}

                                <div>
                                  <span className="block text-[10px] uppercase tracking-widest text-[hsl(var(--brand-coral))] mb-3">Reference Details</span>
                                  <ul className="co-detail-list">
                                    {comp.details.map((d, idx) => (
                                      <li key={idx}>{d}</li>
                                    ))}
                                  </ul>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      
      <div className="co-stage-legend">
        <span className="flex items-center gap-2 text-white/70">
          <div className="w-[1px] h-3 bg-white/40" />
          Vertical rails = Continuous cross-cutting spines
        </span>
        <span className="flex items-center gap-2 text-white/70">
          <div className="w-4 h-[1px] bg-[hsl(var(--brand-coral))] opacity-80" />
          Solid spoke = Layer membership
        </span>
        <span className="hidden md:flex items-center gap-2 text-white/70">
          <div className="w-4 h-[1px] border-b border-dashed border-[hsl(var(--brand-pink))] opacity-80" />
          Dashed tether = Documented engine relationship
        </span>
      </div>
    </div>
  );
}
