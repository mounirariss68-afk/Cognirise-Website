import React, { useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { architectureLayers, architectureSpines } from "@/data/cognios-architecture";

export function ArchitectureStage() {
  const search = useSearch();
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const activeLayerId = params.get("layer");
  const activeComponentId = params.get("component");
  const prefersReducedMotion = useReducedMotion();
  
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const layerCloseRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const compRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  
  const prevLayerId = useRef(activeLayerId);
  const prevCompId = useRef(activeComponentId);

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
  
  const openLayer = (id: string) => setParams(id, null);
  
  const toggleComponent = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setParams(activeLayerId, activeComponentId === id ? null : id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeComponentId) {
          setParams(activeLayerId, null);
        } else if (activeLayerId) {
          closeLayer();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeLayerId, activeComponentId, search, location]);

  useEffect(() => {
    if (window.location.hash === "#architecture" || activeLayerId) {
      setTimeout(() => {
        stageRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      }, 100);
    }
  }, []);

  // Focus management
  useEffect(() => {
    // If a component was closed
    if (prevCompId.current && !activeComponentId) {
      const el = compRefs.current[prevCompId.current];
      if (el) el.focus();
    }
    // If a layer was closed
    if (prevLayerId.current && !activeLayerId && !activeComponentId) {
      const el = layerRefs.current[prevLayerId.current];
      if (el) el.focus();
    }
    // If a layer was opened or the active layer changed
    if (prevLayerId.current !== activeLayerId && activeLayerId) {
      const el = layerCloseRefs.current[activeLayerId];
      if (el) el.focus();
    }

    prevCompId.current = activeComponentId;
    prevLayerId.current = activeLayerId;
  }, [activeLayerId, activeComponentId]);

  return (
    <div className="co-stage" ref={stageRef} aria-label="CogniOS Architecture Stage">
      <style>{`
        .co-stage {
          margin-top: 56px;
          background: var(--deep);
          position: relative;
          min-height: 590px;
          overflow: hidden;
          clip-path: polygon(0 0, 100% 0, 100% 95%, 96% 100%, 0 100%);
          padding: 35px 12%;
          display: flex;
          flex-direction: column;
        }
        .co-stage:before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 52% 42%, rgba(118,89,223,.22), transparent 50%);
          pointer-events: none;
        }
        .co-stage-spines {
          position: absolute;
          top: 22px;
          bottom: 22px;
          left: 0;
          right: 0;
          pointer-events: none;
          z-index: 3;
        }
        .co-stage-spine {
          position: absolute;
          top: 0;
          bottom: 0;
          border-left: 1px solid rgba(255,255,255,.5);
          padding: 10px 5px;
          color: #fff;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .1em;
          writing-mode: vertical-rl;
          transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1);
        }
        .co-stage-spine:after {
          content: "";
          display: block;
          width: 6px;
          height: 6px;
          background: var(--coral);
          margin: 10px auto;
          box-shadow: 0 155px 0 var(--pink), 0 310px 0 var(--violet);
        }
        .co-stage-spine.ops { left: calc(12% + 22px); }
        .co-stage-spine.assurance { right: calc(12% + 22px); }

        .co-stage-planes {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 9px;
          flex: 1;
        }

        .co-stage-plane {
          position: relative;
          background: rgba(255,255,255,.075);
          border: 1px solid rgba(255,255,255,.28);
          clip-path: polygon(0 0, 100% 0, 97% 100%, 0 100%);
          display: flex;
          flex-direction: column;
          transition: background 0.3s;
        }
        .co-stage-plane.is-collapsed {
          opacity: 0.6;
        }
        .co-stage-plane.is-collapsed:hover {
          opacity: 1;
          background: rgba(118,89,223,.2);
        }
        .co-stage-plane.is-active {
          background: rgba(7,25,54,.95);
          border-color: rgba(118,89,223,.6);
          clip-path: polygon(0 0, 100% 0, 99% 100%, 0 100%);
        }

        /* Semantic trigger for entire collapsed plane */
        .co-plane-trigger {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 10;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .co-plane-trigger:focus-visible {
          outline: 3px solid var(--coral);
          outline-offset: 2px;
        }

        .co-plane-head {
          display: grid;
          grid-template-columns: 50px 1fr 32px;
          align-items: center;
          gap: 13px;
          padding: 15px 20px;
          position: relative;
        }
        .co-stage-plane.is-collapsed .co-plane-head {
          padding: 10px 20px;
        }
        .co-plane-head span.num {
          font-size: 10px;
          color: #ffad9c;
          letter-spacing: .1em;
          font-weight: 700;
        }
        .co-plane-head h3 {
          margin: 0;
          font-size: clamp(17px, 2vw, 27px);
          letter-spacing: -.06em;
          color: #fff;
          font-family: Comfortaa, sans-serif;
          font-weight: 600;
        }
        .co-stage-plane.is-active .co-plane-head h3 {
          font-size: clamp(22px, 3vw, 34px);
        }
        .co-plane-head p {
          margin: 4px 0 0;
          font-size: 12px;
          line-height: 1.4;
          color: #dbe4f0;
        }
        .co-stage-plane.is-collapsed .co-plane-head p {
          display: none;
        }
        
        .co-plane-action {
          justify-self: end;
          color: #fff;
          background: transparent;
          border: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          transition: background 0.2s;
          position: relative;
          z-index: 20; /* Above the expanded content */
        }
        .co-plane-action:hover {
          background: rgba(255,255,255,.1);
        }
        .co-plane-action:focus-visible {
          outline: 2px solid var(--coral);
          outline-offset: 2px;
        }
        
        .co-plane-body {
          padding: 0 20px 20px 83px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        
        /* Metadata */
        .co-plane-meta {
          display: flex;
          gap: 30px;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,.15);
        }
        .co-plane-meta > div {
          flex: 1;
        }
        .co-plane-meta strong {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .1em;
          color: var(--pink);
          margin-bottom: 6px;
        }
        .co-plane-meta p {
          font-size: 13px;
          line-height: 1.5;
          color: #dbe4f0;
          margin: 0;
        }
        
        /* Connected Signal Topology */
        .co-signal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          row-gap: 35px;
          position: relative;
          margin-top: 15px;
        }
        
        .co-signal-node {
          position: relative;
          padding: 20px 30px 0 0; /* padding-right bridges the gap for the continuous top border */
          border-top: 1px solid rgba(255,255,255,0.15); 
          text-align: left;
          background: transparent;
          border-left: none; border-right: none; border-bottom: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .co-signal-node:focus-visible {
          outline: none;
        }
        
        /* The diamond node */
        .co-signal-node::before {
          content: '';
          position: absolute;
          top: -5px; /* Centers on the 1px border */
          left: 0;
          width: 9px; height: 9px;
          border: 1px solid var(--violet);
          background: var(--deep);
          transform: rotate(45deg);
          transition: all 0.3s;
        }
        
        .co-signal-node:hover,
        .co-signal-node:focus-visible {
          border-top-color: var(--pink);
        }
        .co-signal-node:hover::before,
        .co-signal-node:focus-visible::before {
          background: var(--pink);
          border-color: var(--coral);
          box-shadow: 0 0 10px var(--pink);
        }
        
        .co-signal-node.is-active {
          border-top-color: var(--coral);
        }
        .co-signal-node.is-active::before {
          background: var(--coral);
          border-color: #fff;
          box-shadow: 0 0 12px var(--coral);
        }
        
        .co-signal-title {
          display: block;
          font-family: Comfortaa, sans-serif;
          font-weight: 600;
          font-size: 17px;
          color: #fff;
          letter-spacing: -0.03em;
          margin-bottom: 8px;
          transition: color 0.2s;
        }
        .co-signal-node:hover .co-signal-title,
        .co-signal-node:focus-visible .co-signal-title,
        .co-signal-node.is-active .co-signal-title {
          color: var(--coral);
        }
        
        .co-signal-desc {
          display: block;
          font-size: 13px;
          line-height: 1.5;
          color: #aab8ce;
        }
        
        /* Signal Chamber (Wing Detail) */
        .co-signal-wing {
          grid-column: 1 / -1;
          overflow: hidden;
        }
        .co-wing-inner {
          background: linear-gradient(135deg, rgba(7,25,54,0.9), rgba(118,89,223,0.15));
          border: 1px solid rgba(219,80,158,0.3);
          clip-path: polygon(0 15px, 15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%);
          padding: 35px 40px;
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          margin-bottom: 20px;
        }
        .co-wing-inner::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--violet), var(--pink), var(--coral));
        }
        
        .co-chamber-title {
          font-family: Comfortaa, sans-serif;
          font-size: clamp(24px, 3vw, 32px);
          font-weight: 600;
          color: #fff;
          letter-spacing: -0.05em;
          margin: 0 0 12px 0;
        }
        .co-chamber-desc {
          font-size: 16px;
          color: #fff;
          line-height: 1.55;
          margin: 0;
        }
        
        .co-chamber-list-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--coral);
          border-bottom: 1px solid rgba(255,119,93,0.3);
          padding-bottom: 8px;
          margin: 0 0 16px 0;
        }
        .co-chamber-list {
          list-style: none; 
          padding: 0; 
          margin: 0;
          display: flex; 
          flex-direction: column; 
          gap: 12px;
        }
        .co-chamber-list li {
          font-size: 14px;
          color: #e2e8f0;
          position: relative;
          padding-left: 18px;
          line-height: 1.45;
        }
        .co-chamber-list li::before {
          content: '';
          position: absolute;
          left: 0; 
          top: 7px;
          width: 5px; 
          height: 5px;
          background: var(--pink);
          clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
        }
        
        .co-stage-legend {
          position: absolute;
          z-index: 2;
          bottom: 17px;
          left: 12%;
          color: #cdd9ed;
          font-size: 9px;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        @media(max-width: 760px) {
          .co-stage {
            padding: 22px 48px;
            min-height: 610px;
          }
          .co-stage-spine {
            font-size: 0;
            width: 18px;
            padding: 4px;
          }
          .co-stage-spine.ops { left: 11px; }
          .co-stage-spine.assurance { right: 11px; }
          
          .co-plane-head {
            grid-template-columns: 30px 1fr 32px;
            padding: 13px 12px;
            gap: 7px;
          }
          .co-stage-plane.is-collapsed .co-plane-head {
            padding: 10px 12px;
          }
          .co-plane-body {
            padding: 0 12px 16px 49px;
          }
          .co-plane-meta {
            flex-direction: column;
            gap: 16px;
          }
          
          /* Mobile Vertical Topology */
          .co-signal-grid {
            display: flex;
            flex-direction: column;
            padding-left: 20px;
            margin-top: 20px;
            gap: 0;
          }
          .co-signal-grid::before {
            content: '';
            position: absolute;
            top: 10px;
            bottom: 10px;
            left: 4px;
            width: 1px;
            background: rgba(255,255,255,0.2);
          }
          .co-signal-node {
            border-top: none;
            padding: 15px 0 15px 0;
          }
          .co-signal-node::before {
            top: 23px; 
            left: -20px; 
          }
          
          .co-wing-inner {
            grid-template-columns: 1fr;
            gap: 30px;
            padding: 25px 20px;
            margin-left: -20px;
            width: calc(100% + 20px);
            clip-path: polygon(0 10px, 10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
          }
          
          .co-stage-legend {
            left: 48px;
          }
        }
        
        @media(prefers-reduced-motion: reduce) {
          .co-stage * {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
      
      <div className="co-stage-spines">
        <div className="co-stage-spine ops">{architectureSpines[1].name}</div>
        <div className="co-stage-spine assurance">{architectureSpines[0].name}</div>
      </div>
      
      <div className="co-stage-planes">
        <AnimatePresence initial={false}>
          {architectureLayers.map((layer) => {
            const isActive = activeLayerId === layer.id;
            const isOtherActive = activeLayerId && !isActive;
            const defaultX = (layer.number === "01" || layer.number === "03" || layer.number === "05") ? "4%" : "-3%";
            
            return (
              <motion.div 
                key={layer.id}
                className={`co-stage-plane ${isActive ? "is-active" : ""} ${isOtherActive ? "is-collapsed" : ""}`}
                initial={{ x: defaultX }}
                animate={{ x: isActive ? 0 : defaultX }}
                 transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: [0.19, 1, 0.22, 1] }}
                data-testid={`stage-layer-${layer.id}`}
              >
                {!isActive && (
                  <button 
                    className="co-plane-trigger"
                    onClick={() => openLayer(layer.id)}
                    aria-expanded="false"
                    aria-controls={`layer-body-${layer.id}`}
                    aria-label={`Expand ${layer.name}`}
                    ref={(el) => { layerRefs.current[layer.id] = el; }}
                  >
                    <span className="sr-only">Expand {layer.name}</span>
                  </button>
                )}
                
                <div className="co-plane-head">
                  <span className="num">{layer.number}</span>
                  <div>
                    <h3>{layer.name}</h3>
                    <p>{layer.responsibility}</p>
                  </div>
                  {isActive ? (
                    <button 
                      className="co-plane-action" 
                      onClick={closeLayer} 
                      aria-label={`Collapse ${layer.name}`} 
                      data-testid="button-close-layer"
                      ref={(el) => { layerCloseRefs.current[layer.id] = el; }}
                    >
                      <X size={20} />
                    </button>
                  ) : (
                    <div className="co-plane-action" aria-hidden="true">
                      <ArrowRight size={18} />
                    </div>
                  )}
                </div>
                
                <AnimatePresence>
                  {isActive && (
                    <motion.div 
                      id={`layer-body-${layer.id}`}
                      className="co-plane-body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                       transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: [0.19, 1, 0.22, 1] }}
                    >
                      <div className="co-plane-meta">
                        <div>
                          <strong>Layer Principle</strong>
                          <p>{layer.principle}</p>
                        </div>
                        <div>
                          <strong>Controls Carried Here</strong>
                          <p>{layer.controls.join(" · ")}</p>
                        </div>
                      </div>
                      
                      <div className="co-signal-grid">
                        {layer.components.map((comp) => {
                          const isCompActive = activeComponentId === comp.id;
                          return (
                            <React.Fragment key={comp.id}>
                              <button 
                                className={`co-signal-node ${isCompActive ? "is-active" : ""}`}
                                onClick={(e) => toggleComponent(comp.id, e)}
                                aria-expanded={isCompActive}
                                aria-controls={`comp-detail-${comp.id}`}
                                data-testid={`stage-component-${comp.id}`}
                                ref={(el) => { compRefs.current[comp.id] = el; }}
                              >
                                <b className="co-signal-title">{comp.name}</b>
                                <span className="co-signal-desc">{comp.responsibility}</span>
                              </button>
                              
                              <AnimatePresence>
                                {isCompActive && (
                                  <motion.div 
                                    id={`comp-detail-${comp.id}`}
                                    className="co-signal-wing"
                                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                    animate={{ height: "auto", opacity: 1, marginTop: 10 }}
                                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                     transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: [0.19, 1, 0.22, 1] }}
                                  >
                                    <div className="co-wing-inner">
                                      <div>
                                        <h4 className="co-chamber-title">{comp.name}</h4>
                                        <p className="co-chamber-desc">{comp.responsibility}</p>
                                        {comp.engine && (
                                          <div style={{ marginTop: "24px" }}>
                                            <h5 className="co-chamber-list-title">Engine Relationship</h5>
                                            <p style={{ fontSize: "13px", color: "#e2e8f0", margin: 0, lineHeight: 1.5 }}>
                                              <b style={{ color: "#fff" }}>{comp.engine}</b> is a related capability within this reference architecture.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <h5 className="co-chamber-list-title">Reference Details</h5>
                                        <ul className="co-chamber-list">
                                          {comp.details.map((detail, i) => (
                                            <li key={i}>{detail}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      <small className="co-stage-legend">Two continuous spines cross every plane.</small>
    </div>
  );
}

