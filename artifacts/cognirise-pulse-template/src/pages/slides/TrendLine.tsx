import React from 'react';
const base=import.meta.env.BASE_URL;
export default function TrendLine(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body flex flex-col">
      <div className="px-[5vw] pt-[5vh] pb-[2vh] flex justify-between items-start z-10">
        <div>
          <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] leading-[1.05]">
            The compounding curve of <span className="text-accent">agent autonomy.</span>
          </h1>
          <p className="mt-[2vh] text-[calc(1.8*var(--slide-vw))] text-muted w-[50vw] leading-[1.4]">
            As trust layers stabilize, human intervention drops logarithmically while throughput scales exponentially.
          </p>
        </div>
        <div className="flex flex-col items-end gap-[2vh]">
          <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">PROJECTION / 34</p>
          <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]"/>
        </div>
      </div>
      
      <div className="flex-1 relative w-full mt-[2vh] mb-[4vh] px-[5vw]">
        <svg viewBox="0 0 1200 500" className="w-full h-full max-h-[65vh] mx-auto" preserveAspectRatio="none">
          <defs>
            <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#db509e" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#db509e" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="area-gradient-blue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#102957" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#102957" stopOpacity="0"/>
            </linearGradient>
          </defs>
          
          {/* Grid */}
          <line x1="100" y1="100" x2="1100" y2="100" stroke="#dde2eb" strokeWidth="1"/>
          <line x1="100" y1="200" x2="1100" y2="200" stroke="#dde2eb" strokeWidth="1"/>
          <line x1="100" y1="300" x2="1100" y2="300" stroke="#dde2eb" strokeWidth="1"/>
          <line x1="100" y1="400" x2="1100" y2="400" stroke="#dde2eb" strokeWidth="2"/>
          
          {/* Blue Line - Human Intervention (Decreasing) */}
          <path d="M100 150 C 400 150, 600 350, 1100 380" fill="none" stroke="#102957" strokeWidth="4"/>
          <path d="M100 150 C 400 150, 600 350, 1100 380 L1100 400 L100 400 Z" fill="url(#area-gradient-blue)"/>
          
          {/* Magenta Line - System Throughput (Increasing exponentially) */}
          <path d="M100 350 C 500 350, 800 100, 1100 50" fill="none" stroke="#db509e" strokeWidth="5"/>
          <path d="M100 350 C 500 350, 800 100, 1100 50 L1100 400 L100 400 Z" fill="url(#area-gradient)"/>
          
          {/* Inflection Point Marker */}
          <line x1="650" y1="50" x2="650" y2="400" stroke="#60708d" strokeWidth="2" strokeDasharray="6 6"/>
          <circle cx="650" cy="275" r="8" fill="#fff" stroke="#102957" strokeWidth="3"/>
          <text x="670" y="270" fontSize="16" fontWeight="700" fill="#102957">Inflection Point</text>
          <text x="670" y="295" fontSize="14" fill="#60708d">Autonomy exceeds human assist</text>
          
          {/* X Axis labels */}
          <text x="100" y="430" fontSize="16" fill="#60708d">Month 1</text>
          <text x="350" y="430" fontSize="16" fill="#60708d">Month 3</text>
          <text x="600" y="430" fontSize="16" fill="#60708d">Month 6</text>
          <text x="850" y="430" fontSize="16" fill="#60708d">Month 9</text>
          <text x="1100" y="430" fontSize="16" fill="#60708d" textAnchor="end">Month 12</text>
        </svg>
      </div>
    </div>
  )
}