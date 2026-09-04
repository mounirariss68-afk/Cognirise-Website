import React from 'react';

const base = import.meta.env.BASE_URL;

export default function StrategyOnPage() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      {/* Header (Approx 4vh) */}
      <div className="flex justify-between items-center h-[4vh]">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-muted uppercase">Strategy On A Page / 38</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      
      {/* Title (Approx 8vh total footprint with margin) */}
      <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.07em] leading-[1.05] mt-[3vh] w-[85vw]">
        Scale requires collapsing <span className="text-accent">three siloes into one.</span>
      </h1>
      
      {/* Main Content (Strict 50vh constraint to guarantee safety. Total sum <= 75vh) */}
      <div className="flex mt-[4vh] h-[50vh]">
        {/* Navy Block */}
        <div className="w-[35vw] bg-primary text-white p-[2.5vw] flex flex-col justify-between relative">
          <div className="absolute top-0 right-0 w-[.5vw] h-full bg-gradient-to-b from-[#db509e] to-[#ff775d]"></div>
          <div>
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] text-[#dce4f0] font-semibold mb-[1.5vh]">12-MONTH AMBITION</p>
            <p className="font-display text-[calc(2.5*var(--slide-vw))] leading-[1.2]">Unify intake, decision, and audit into a single agentic loop.</p>
          </div>
          <div>
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.12em] text-[#dce4f0]">THE NORTH STAR</p>
            <p className="text-[calc(1.8*var(--slide-vw))] mt-[1vh] leading-[1.3] text-white font-semibold">Zero human touch for routine approvals.</p>
          </div>
        </div>
        
        {/* Asymmetric right side */}
        <div className="w-[55vw] pl-[4vw] flex flex-col justify-between">
          <div className="border-t-[.15vw] border-primary pt-[1.5vh]">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.12em] text-muted font-semibold">THE THREE PIVOTS</p>
            <div className="grid grid-cols-2 mt-[2vh] gap-[3vw]">
              <div>
                <p className="text-[calc(2.2*var(--slide-vw))] font-display leading-[1.1] text-primary">01. Service redesign</p>
                <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] leading-[1.4] text-muted">Optimize the end-to-end journey for machine readability.</p>
              </div>
              <div>
                <p className="text-[calc(2.2*var(--slide-vw))] font-display leading-[1.1] text-primary">02. Unified ontology</p>
                <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] leading-[1.4] text-muted">Eliminate translation layers in business logic.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-[#eef2f8] p-[2vw] border-l-[.4vw] border-accent">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.12em] font-semibold text-primary">PROOF OF VALUE BASELINE</p>
            <p className="text-[calc(1.8*var(--slide-vw))] mt-[1vh] leading-[1.3] text-primary">Measure success purely on <span className="font-semibold">cycle time</span> and <span className="font-semibold">unit cost</span>, holding control exceptions flat.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
