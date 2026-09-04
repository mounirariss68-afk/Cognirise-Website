import React from 'react';
const base=import.meta.env.BASE_URL;
export default function Circular4(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-y-0 left-0 w-[50vw] px-[5vw] py-[5vh] flex flex-col z-10 bg-bg">
        <header className="flex justify-between items-center pr-[5vw]">
          <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">FRAMEWORK / 28</p>
          <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]"/>
        </header>
        
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] mt-[8vh] leading-[1.05]">
          Four vectors of <span className="text-accent">transformation.</span>
        </h1>
        <p className="mt-[3vh] text-[calc(1.8*var(--slide-vw))] text-muted w-[40vw] leading-[1.4]">
          Balancing rapid value creation with the defensive architecture required for long-term viability.
        </p>
        
        <div className="mt-auto mb-[2vh]">
          <p className="text-[calc(1.6*var(--slide-vw))] font-semibold">Strategic Imperative</p>
          <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh] border-t border-[#dde2eb] pt-[2vh] w-[40vw]">
            Over-indexing on any single quadrant creates systemic risk. True capability requires simultaneous advancement across all four vectors.
          </p>
        </div>
      </div>
      
      <div className="absolute inset-y-0 right-0 w-[50vw] bg-primary text-white p-[5vw] flex items-center justify-center">
        <div className="relative w-[40vw] h-[40vw] max-w-[70vh] max-h-[70vh]">
          <svg viewBox="0 0 800 800" className="w-full h-full">
            <g transform="translate(400 400)">
              {/* Grid lines */}
              <line x1="-350" y1="0" x2="350" y2="0" stroke="#253f6b" strokeWidth="2" strokeDasharray="8 8"/>
              <line x1="0" y1="-350" x2="0" y2="350" stroke="#253f6b" strokeWidth="2" strokeDasharray="8 8"/>
              <circle cx="0" cy="0" r="250" fill="none" stroke="#253f6b" strokeWidth="1"/>
              <circle cx="0" cy="0" r="100" fill="none" stroke="#db509e" strokeWidth="2"/>
              
              {/* Q1: Top Right */}
              <g transform="translate(150, -150)">
                <text x="0" y="-30" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff">Efficiency</text>
                <text x="0" y="0" textAnchor="middle" fontSize="16" fill="#dce4f0">Cost reduction</text>
                <text x="0" y="25" textAnchor="middle" fontSize="16" fill="#dce4f0">Process automation</text>
              </g>
              
              {/* Q2: Bottom Right */}
              <g transform="translate(150, 150)">
                <text x="0" y="-10" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff">Innovation</text>
                <text x="0" y="20" textAnchor="middle" fontSize="16" fill="#dce4f0">New revenue streams</text>
                <text x="0" y="45" textAnchor="middle" fontSize="16" fill="#dce4f0">Product enhancement</text>
              </g>
              
              {/* Q3: Bottom Left */}
              <g transform="translate(-150, 150)">
                <text x="0" y="-10" textAnchor="middle" fontSize="24" fontWeight="700" fill="#db509e">Governance</text>
                <text x="0" y="20" textAnchor="middle" fontSize="16" fill="#dce4f0">Risk management</text>
                <text x="0" y="45" textAnchor="middle" fontSize="16" fill="#dce4f0">Policy enforcement</text>
              </g>
              
              {/* Q4: Top Left */}
              <g transform="translate(-150, -150)">
                <text x="0" y="-30" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff">Capability</text>
                <text x="0" y="0" textAnchor="middle" fontSize="16" fill="#dce4f0">Talent upskilling</text>
                <text x="0" y="25" textAnchor="middle" fontSize="16" fill="#dce4f0">Cultural adoption</text>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
}