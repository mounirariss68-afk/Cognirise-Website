import React from 'react';
const base=import.meta.env.BASE_URL;
export default function DoughnutComposition(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh] flex">
      <div className="w-[45vw] flex flex-col z-10 pb-[2vh]">
        <header>
          <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">COMPOSITION / 35</p>
        </header>
        <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw] mt-[2vh]"/>
        
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] mt-[6vh] leading-[1.05]">
          Where the <span className="text-accent">friction lives.</span>
        </h1>
        <p className="mt-[3vh] text-[calc(1.8*var(--slide-vw))] text-muted w-[35vw] leading-[1.4]">
          Analysis of 10,000+ support interactions reveals that data synthesis—not complex decisioning—consumes the vast majority of human effort.
        </p>
        
        <div className="mt-auto space-y-[2.5vh]">
          <div className="flex gap-[2vw] items-start">
            <div className="w-[1.5vw] h-[1.5vw] bg-accent mt-[0.5vh] rounded-sm shrink-0"></div>
            <div>
              <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">Data Retrieval &amp; Synthesis (68%)</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[0.5vh] w-[30vw]">Hours lost navigating disparate systems to assemble context. The primary target for autonomous agents.</p>
            </div>
          </div>
          <div className="flex gap-[2vw] items-start">
            <div className="w-[1.5vw] h-[1.5vw] bg-primary mt-[0.5vh] rounded-sm shrink-0"></div>
            <div>
              <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">Strategic Decisioning (22%)</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[0.5vh] w-[30vw]">High-value human judgment applied to synthesized context.</p>
            </div>
          </div>
          <div className="flex gap-[2vw] items-start">
            <div className="w-[1.5vw] h-[1.5vw] bg-[#60708d] mt-[0.5vh] rounded-sm shrink-0"></div>
            <div>
              <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">Administrative Execution (10%)</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[0.5vh] w-[30vw]">Data entry and system updates post-decision.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative pb-[2vh]">
        <svg viewBox="0 0 800 800" className="w-[45vw] h-[45vw] max-h-[70vh] drop-shadow-2xl">
          <g transform="translate(400,400) rotate(-90)">
            {/* Base circle (10%) - Gray */}
            <circle cx="0" cy="0" r="250" fill="none" stroke="#60708d" strokeWidth="80" />
            
            {/* Primary circle (22%) - Navy */}
            {/* Total circ = 2 * pi * 250 = 1570.8 */}
            <circle cx="0" cy="0" r="250" fill="none" stroke="#102957" strokeWidth="80" strokeDasharray="345.5 1570.8" strokeDashoffset="-157.1" />
            
            {/* Accent circle (68%) - Magenta */}
            <circle cx="0" cy="0" r="250" fill="none" stroke="#db509e" strokeWidth="100" strokeDasharray="1068.1 1570.8" strokeDashoffset="-502.6" />
          </g>
          {/* Center text */}
          <text x="400" y="380" textAnchor="middle" fontSize="90" fontWeight="700" fill="#102957" fontFamily="var(--font-display)">68%</text>
          <text x="400" y="440" textAnchor="middle" fontSize="24" fill="#60708d">Synthesis Burden</text>
        </svg>
      </div>
    </div>
  )
}