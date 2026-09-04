import React from 'react';
const base=import.meta.env.BASE_URL;
export default function RadarAssessment(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh] flex flex-col">
      <header className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">READINESS / 26</p>
        <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]"/>
      </header>
      
      <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] mt-[4vh] w-[80vw]">
        Strong ambition. <span className="text-accent">Thin foundations.</span>
      </h1>
      
      <div className="flex-1 flex items-center justify-between mt-[2vh] mb-[2vh]">
        <div className="w-[45vw] h-full flex flex-col justify-center">
          <svg viewBox="0 0 600 600" className="w-full max-h-[60vh]" role="img" aria-label="Radar assessment current versus target">
            <g transform="translate(300 300)">
              <polygon points="0,-40 38,-12 24,32 -24,32 -38,-12" fill="none" stroke="#dde2eb" strokeWidth="1"/>
              <polygon points="0,-80 76,-25 47,65 -47,65 -76,-25" fill="none" stroke="#dde2eb" strokeWidth="1"/>
              <polygon points="0,-120 114,-37 71,97 -71,97 -114,-37" fill="none" stroke="#dde2eb" strokeWidth="1"/>
              <polygon points="0,-160 152,-50 94,129 -94,129 -152,-50" fill="none" stroke="#dde2eb" strokeWidth="1"/>
              <polygon points="0,-200 190,-62 118,162 -118,162 -190,-62" fill="none" stroke="#dde2eb" strokeWidth="1"/>
              
              <path d="M0 0 L0 -200 M0 0 L190 -62 M0 0 L118 162 M0 0 L-118 162 M0 0 L-190 -62" stroke="#dde2eb" strokeWidth="1"/>
              
              {/* Target State */}
              <polygon points="0,-160 171,-56 94,129 -106,146 -133,-43" fill="#db509e" fillOpacity="0.1" stroke="#db509e" strokeWidth="3"/>
              
              {/* Current State */}
              <polygon points="0,-120 76,-25 71,97 -47,65 -95,-31" fill="#102957" fillOpacity="0.2" stroke="#102957" strokeWidth="4"/>
              
              <text x="0" y="-220" textAnchor="middle" fontSize="18" fontWeight="700" fill="#102957">Strategy</text>
              <text x="210" y="-62" textAnchor="start" fontSize="18" fontWeight="700" fill="#102957">Data</text>
              <text x="130" y="180" textAnchor="start" fontSize="18" fontWeight="700" fill="#102957">Technology</text>
              <text x="-130" y="180" textAnchor="end" fontSize="18" fontWeight="700" fill="#102957">Governance</text>
              <text x="-210" y="-62" textAnchor="end" fontSize="18" fontWeight="700" fill="#102957">Adoption</text>
            </g>
          </svg>
        </div>
        
        <div className="w-[40vw] space-y-[4vh] pr-[2vw]">
          <div>
            <div className="flex gap-[1vw] items-center text-[calc(1.6*var(--slide-vw))] font-semibold">
              <i className="w-[2vw] border-t-[.4vw] border-primary"/> Current State
            </div>
            <p className="mt-[1.5vh] text-[calc(1.6*var(--slide-vw))] text-muted leading-[1.4]">
              Initial experimentation has driven basic adoption, but governance and underlying data structures remain immature.
            </p>
          </div>
          
          <div>
            <div className="flex gap-[1vw] items-center text-[calc(1.6*var(--slide-vw))] font-semibold">
              <i className="w-[2vw] border-t-[.4vw] border-accent"/> 12-Month Target
            </div>
            <p className="mt-[1.5vh] text-[calc(1.6*var(--slide-vw))] text-muted leading-[1.4]">
              Aggressive remediation of control planes and data pipelines to safely support enterprise-wide scale.
            </p>
          </div>
          
          <div className="border-t border-[#dde2eb] pt-[3vh]">
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold text-primary">Key Action</p>
            <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] leading-[1.4]">
              Close the governance and technology gaps before injecting further momentum into business adoption.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}