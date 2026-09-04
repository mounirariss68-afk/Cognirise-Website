import React from 'react';
const base=import.meta.env.BASE_URL;
export default function ArchitectureL123(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute top-0 left-0 right-0 h-[20vh] px-[5vw] py-[5vh] z-10 flex justify-between">
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] w-[60vw]">
          Three-tier <span className="text-accent">cognitive architecture.</span>
        </h1>
        <div className="flex flex-col items-end gap-[2vh]">
          <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">ARCHITECTURE / 31</p>
          <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]"/>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-[76vh] flex px-[5vw] gap-[4vw] items-end pb-[4vh]">
        
        <div className="w-[30vw] space-y-[4vh] pb-[4vh]">
          <div>
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold text-accent">L3: Experience Layer</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh] leading-[1.4]">The interface where human intent meets machine capability. Omnichannel delivery via conversational UI, API, or embedded widgets.</p>
          </div>
          <div>
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">L2: Intelligence Layer</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh] leading-[1.4]">The orchestration engine routing requests to appropriate models, managing context windows, and enforcing guardrails.</p>
          </div>
          <div>
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">L1: Data Foundation</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh] leading-[1.4]">The unalterable bedrock of enterprise truth. Unified vector stores, knowledge graphs, and role-based access controls.</p>
          </div>
        </div>
        
        <div className="flex-1 h-[70vh] bg-primary rounded-t-xl relative p-[4vw]">
          <svg viewBox="0 0 800 570" className="w-full h-full max-h-[62vh]" preserveAspectRatio="xMidYMid meet">
            <g transform="translate(400, 10)">
              {/* L3: Experience */}
              <g transform="translate(0, 0)">
                <polygon points="0,0 200,60 0,120 -200,60" fill="#db509e" fillOpacity="0.9"/>
                <polygon points="-200,60 0,120 0,140 -200,80" fill="#a83c78" />
                <polygon points="200,60 0,120 0,140 200,80" fill="#c6448c" />
                <text x="0" y="65" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff">L3: EXPERIENCE</text>
                
                {/* Connecting lines */}
                <line x1="0" y1="140" x2="0" y2="180" stroke="#db509e" strokeWidth="2" strokeDasharray="4 4"/>
                <line x1="-100" y1="110" x2="-100" y2="150" stroke="#db509e" strokeWidth="2" strokeDasharray="4 4"/>
                <line x1="100" y1="110" x2="100" y2="150" stroke="#db509e" strokeWidth="2" strokeDasharray="4 4"/>
              </g>
              
              {/* L2: Intelligence */}
              <g transform="translate(0, 160)">
                <polygon points="0,0 240,72 0,144 -240,72" fill="#253f6b" fillOpacity="0.9"/>
                <polygon points="-240,72 0,144 0,174 -240,102" fill="#182a48" />
                <polygon points="240,72 0,144 0,174 240,102" fill="#1f3458" />
                <text x="0" y="80" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff">L2: INTELLIGENCE</text>
                
                {/* Connecting lines */}
                <line x1="0" y1="174" x2="0" y2="220" stroke="#60708d" strokeWidth="2" strokeDasharray="4 4"/>
              </g>
              
              {/* L1: Data Foundation */}
              <g transform="translate(0, 330)">
                <polygon points="0,0 280,84 0,168 -280,84" fill="#40587e" fillOpacity="0.9"/>
                <polygon points="-280,84 0,168 0,208 -280,124" fill="#2d3f5c" />
                <polygon points="280,84 0,168 0,208 280,124" fill="#364b6c" />
                <text x="0" y="90" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff">L1: DATA FOUNDATION</text>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
}