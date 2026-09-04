import React from 'react';
const base=import.meta.env.BASE_URL;
export default function Circular3(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh] flex">
      <div className="w-[45vw] flex flex-col z-10 pb-[2vh]">
        <header>
          <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">OPERATING MODEL / 27</p>
        </header>
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] mt-[4vh] leading-[1.05]">
          The intelligence <span className="text-accent">flywheel.</span>
        </h1>
        <p className="mt-[3vh] text-[calc(1.8*var(--slide-vw))] text-muted w-[35vw] leading-[1.4]">
          Value accelerates when context, reasoning, and action form a continuous, governed loop.
        </p>
        
        <div className="mt-auto space-y-[2.5vh] w-[38vw]">
          <div className="flex gap-[2vw]">
            <span className="text-[calc(2*var(--slide-vw))] font-display font-bold text-accent">01</span>
            <div>
              <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">Contextualize</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[0.5vh]">Ground generic models in proprietary organizational memory and live enterprise state.</p>
            </div>
          </div>
          <div className="flex gap-[2vw]">
            <span className="text-[calc(2*var(--slide-vw))] font-display font-bold text-primary">02</span>
            <div>
              <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">Reason</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[0.5vh]">Apply domain-specific heuristics and policy constraints to generate confident recommendations.</p>
            </div>
          </div>
          <div className="flex gap-[2vw]">
            <span className="text-[calc(2*var(--slide-vw))] font-display font-bold text-primary">03</span>
            <div>
              <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">Act</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[0.5vh]">Execute deterministically via APIs, capturing outcome data to refine future context.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute right-[-5vw] top-[15vh] w-[50vw] h-[70vh]">
        <svg viewBox="0 0 800 800" className="w-full h-full max-h-[75vh]" role="img" aria-label="3 part circular process">
          <defs>
            <marker id="c3-arrow-accent" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M0 2 L10 6 L0 10 Z" fill="#db509e"/>
            </marker>
            <marker id="c3-arrow-primary" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M0 2 L10 6 L0 10 Z" fill="#102957"/>
            </marker>
          </defs>
          <g transform="translate(400 400)">
            {/* Arc 1 */}
            <path d="M 0 -280 A 280 280 0 0 1 242.5 140" fill="none" stroke="#db509e" strokeWidth="6" markerEnd="url(#c3-arrow-accent)" />
            <text x="160" y="-130" fontSize="24" fontWeight="700" fill="#db509e">01. Contextualize</text>
            
            {/* Arc 2 */}
            <path d="M 242.5 140 A 280 280 0 0 1 -242.5 140" fill="none" stroke="#102957" strokeWidth="4" markerEnd="url(#c3-arrow-primary)"/>
            <text x="0" y="220" fontSize="24" fontWeight="700" fill="#102957" textAnchor="middle">02. Reason</text>
            
            {/* Arc 3 */}
            <path d="M -242.5 140 A 280 280 0 0 1 0 -280" fill="none" stroke="#102957" strokeWidth="4" markerEnd="url(#c3-arrow-primary)"/>
            <text x="-220" y="-90" fontSize="24" fontWeight="700" fill="#102957" textAnchor="end">03. Act</text>
            
            {/* Inner decorative circle */}
            <circle cx="0" cy="0" r="180" fill="none" stroke="#dde2eb" strokeWidth="1" strokeDasharray="10 10"/>
          </g>
        </svg>
      </div>
      
      <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="absolute right-[5vw] top-[5vh] w-[10vw]"/>
    </div>
  )
}