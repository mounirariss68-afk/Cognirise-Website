import React from 'react';
const base=import.meta.env.BASE_URL;
export default function DataFlow(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute left-0 top-0 bottom-0 w-[45vw] px-[5vw] py-[5vh] flex flex-col">
        <header>
          <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">DATA FLOW / 25</p>
        </header>
        <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw] mt-[2vh]"/>
        
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] mt-[8vh] leading-[1.05]">
          One governed path from <span className="text-accent">signal to action.</span>
        </h1>
        <p className="mt-[3vh] text-[calc(1.8*var(--slide-vw))] text-muted w-[35vw] leading-[1.4]">
          We isolate the trust layer from intelligence, ensuring every agent operates strictly within its delegated authority.
        </p>
        
        <div className="mt-auto mb-[2vh]">
          <p className="text-[calc(1.6*var(--slide-vw))] font-semibold">Decisive Action</p>
          <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh] border-t border-[#dde2eb] pt-[2vh] w-[35vw]">
            Make identity, lineage and policy explicit before scaling agent access across the enterprise.
          </p>
        </div>
      </div>
      
      <div className="absolute right-0 top-0 bottom-0 w-[55vw] bg-primary text-white p-[5vw] flex flex-col justify-center">
        <svg viewBox="0 0 800 600" className="w-full max-h-[80vh] mx-auto" role="img" aria-label="Data flow diagram">
          <defs>
            <marker id="df-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 2L8 5L0 8Z" fill="#db509e"/>
            </marker>
            <marker id="df-arrow-light" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 2L8 5L0 8Z" fill="#60708d"/>
            </marker>
          </defs>
          
          <rect x="50" y="100" width="160" height="120" rx="4" fill="none" stroke="#60708d" strokeWidth="2"/>
          <text x="130" y="140" textAnchor="middle" fontSize="18" fill="#60708d" fontWeight="600" letterSpacing="1">SOURCES</text>
          <text x="130" y="170" textAnchor="middle" fontSize="16" fill="#fff">Enterprise ERP</text>
          <text x="130" y="195" textAnchor="middle" fontSize="16" fill="#fff">Unstructured Data</text>
          
          <path d="M210 160 L320 160" stroke="#db509e" strokeWidth="3" markerEnd="url(#df-arrow)"/>
          
          <rect x="320" y="100" width="160" height="400" rx="4" fill="#18366d"/>
          <text x="400" y="140" textAnchor="middle" fontSize="18" fill="#fff" fontWeight="600" letterSpacing="1">TRUST LAYER</text>
          <text x="400" y="180" textAnchor="middle" fontSize="16" fill="#dce4f0">Identity Auth</text>
          <text x="400" y="215" textAnchor="middle" fontSize="16" fill="#dce4f0">Data Lineage</text>
          <text x="400" y="250" textAnchor="middle" fontSize="16" fill="#dce4f0">Access Policy</text>
          
          <path d="M480 160 L590 160" stroke="#db509e" strokeWidth="3" markerEnd="url(#df-arrow)"/>
          <path d="M480 360 L590 360" stroke="#db509e" strokeWidth="3" markerEnd="url(#df-arrow)"/>
          
          <rect x="590" y="100" width="160" height="120" rx="4" fill="none" stroke="#db509e" strokeWidth="2"/>
          <text x="670" y="140" textAnchor="middle" fontSize="18" fill="#db509e" fontWeight="600" letterSpacing="1">INTELLIGENCE</text>
          <text x="670" y="170" textAnchor="middle" fontSize="16" fill="#fff">Reasoning Agents</text>
          <text x="670" y="195" textAnchor="middle" fontSize="16" fill="#fff">Predictive Models</text>
          
          <rect x="590" y="300" width="160" height="120" rx="4" fill="#db509e"/>
          <text x="670" y="340" textAnchor="middle" fontSize="18" fill="#fff" fontWeight="600" letterSpacing="1">EXECUTION</text>
          <text x="670" y="370" textAnchor="middle" fontSize="16" fill="#fff">Automated Action</text>
          <text x="670" y="395" textAnchor="middle" fontSize="16" fill="#fff">Decision Logging</text>
          
          <path d="M670 220 L670 300" stroke="#db509e" strokeWidth="3" markerEnd="url(#df-arrow)"/>
          
          <path d="M670 420 C670 520 400 520 400 500" fill="none" stroke="#60708d" strokeWidth="2" strokeDasharray="6 6" markerEnd="url(#df-arrow-light)"/>
          <text x="500" y="490" textAnchor="middle" fontSize="14" fill="#60708d">Feedback loop updates lineage</text>
        </svg>
      </div>
    </div>
  )
}