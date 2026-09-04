import React from 'react';
const base=import.meta.env.BASE_URL;
export default function Circular6(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh] flex">
      <div className="w-[50vw] h-full flex items-center justify-center relative pb-[2vh]">
        <svg viewBox="0 0 600 600" className="w-[40vw] h-[40vw] max-h-[70vh]">
          <g transform="translate(300 300)">
            <circle cx="0" cy="0" r="180" fill="none" stroke="#dde2eb" strokeWidth="2"/>
            
            {/* 6 nodes at 60 degree intervals */}
            {/* Node 1 */}
            <circle cx="0" cy="-180" r="8" fill="#db509e"/>
            <text x="0" y="-210" textAnchor="middle" fontSize="18" fontWeight="700" fill="#102957">Ingest</text>
            
            {/* Node 2 */}
            <circle cx="155.8" cy="-90" r="6" fill="#102957"/>
            <text x="180" y="-100" textAnchor="start" fontSize="18" fontWeight="700" fill="#102957">Structure</text>
            
            {/* Node 3 */}
            <circle cx="155.8" cy="90" r="6" fill="#102957"/>
            <text x="180" y="100" textAnchor="start" fontSize="18" fontWeight="700" fill="#102957">Embed</text>
            
            {/* Node 4 */}
            <circle cx="0" cy="180" r="6" fill="#102957"/>
            <text x="0" y="220" textAnchor="middle" fontSize="18" fontWeight="700" fill="#102957">Retrieve</text>
            
            {/* Node 5 */}
            <circle cx="-155.8" cy="90" r="6" fill="#102957"/>
            <text x="-180" y="100" textAnchor="end" fontSize="18" fontWeight="700" fill="#102957">Generate</text>
            
            {/* Node 6 */}
            <circle cx="-155.8" cy="-90" r="6" fill="#102957"/>
            <text x="-180" y="-100" textAnchor="end" fontSize="18" fontWeight="700" fill="#102957">Audit</text>
            
            {/* Inner connections */}
            <path d="M0 -180 L155.8 90 L-155.8 90 Z" fill="none" stroke="#db509e" strokeWidth="1" strokeOpacity="0.5"/>
            <path d="M0 180 L155.8 -90 L-155.8 -90 Z" fill="none" stroke="#102957" strokeWidth="1" strokeOpacity="0.2"/>
          </g>
        </svg>
      </div>
      
      <div className="w-[45vw] flex flex-col justify-center pl-[5vw] pb-[2vh]">
        <header className="absolute top-[5vh] right-[5vw] flex items-center gap-[2vw]">
          <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">PIPELINE / 30</p>
          <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]"/>
        </header>
        
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] leading-[1.05] mt-[4vh]">
          A closed loop for <span className="text-accent">continuous accuracy.</span>
        </h1>
        <p className="mt-[3vh] text-[calc(1.8*var(--slide-vw))] text-muted leading-[1.4]">
          Raw enterprise data must pass through six rigorous stages before it can safely influence automated decisioning.
        </p>
        
        <div className="mt-[5vh] space-y-[3vh]">
          <div className="border-l-[0.3vw] border-accent pl-[1.5vw]">
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">The Entry Point</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[0.5vh]">Ingestion is strictly governed, validating schema and sanitizing PII before vectors are generated.</p>
          </div>
          <div className="border-l-[0.3vw] border-[#dde2eb] pl-[1.5vw]">
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">The Exit Point</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[0.5vh]">Every generated output is logged, audited against policy, and fed back to improve future retrieval accuracy.</p>
          </div>
        </div>
      </div>
    </div>
  )
}