import React from 'react';
const base=import.meta.env.BASE_URL;
export default function ExecutiveDashboard(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh] flex flex-col">
      <header className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">EXECUTIVE SUMMARY / 37</p>
        <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]"/>
      </header>
      
      <div className="mt-[2vh] grid grid-cols-[1.5fr_1fr] gap-[6vw]">
        <h1 className="font-display text-[calc(4.2*var(--slide-vw))] tracking-[-.06em] leading-[1.05]">
          The intelligence layer is now <span className="text-accent">fully operational.</span>
        </h1>
        <p className="text-[calc(1.8*var(--slide-vw))] text-muted leading-[1.4] pt-[1vh]">
          Phase 1 deployment has concluded. The foundation is stable, governance models are active, and adoption metrics are compounding week over week.
        </p>
      </div>
      
      <div className="mt-[4vh] border-y border-[#dde2eb] py-[3vh] grid grid-cols-3 gap-[4vw] divide-x divide-[#dde2eb]">
        <div className="pr-[2vw]">
          <p className="text-[calc(1.5*var(--slide-vw))] font-semibold text-muted uppercase tracking-wider">Total Value Realized</p>
          <p className="font-display text-[calc(5*var(--slide-vw))] font-bold text-primary tracking-[-0.04em] mt-[1vh]">$4.2M</p>
          <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh]">Annualized run-rate savings</p>
        </div>
        <div className="px-[2vw]">
          <p className="text-[calc(1.5*var(--slide-vw))] font-semibold text-muted uppercase tracking-wider">Queries Resolved</p>
          <p className="font-display text-[calc(5*var(--slide-vw))] font-bold text-primary tracking-[-0.04em] mt-[1vh]">142k</p>
          <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh]">Zero-touch autonomous resolutions</p>
        </div>
        <div className="pl-[2vw]">
          <p className="text-[calc(1.5*var(--slide-vw))] font-semibold text-muted uppercase tracking-wider">System Precision</p>
          <p className="font-display text-[calc(5*var(--slide-vw))] font-bold text-accent tracking-[-0.04em] mt-[1vh]">99.8%</p>
          <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh]">Accuracy vs. human baseline</p>
        </div>
      </div>
      
      <div className="flex-1 mt-[4vh] grid grid-cols-2 gap-[8vw] mb-[2vh]">
        {/* Left: Trend */}
        <div className="flex flex-col justify-end">
          <div className="flex justify-between items-end mb-[2vh]">
            <p className="text-[calc(1.6*var(--slide-vw))] font-semibold">Adoption Velocity</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-accent font-semibold">+24% MoM</p>
          </div>
          <svg viewBox="0 0 400 100" className="w-full h-[12vh] max-h-[15vh]" preserveAspectRatio="none">
            <path d="M0 80 C 100 80, 200 60, 400 10" fill="none" stroke="#102957" strokeWidth="4"/>
            <path d="M0 80 C 100 80, 200 60, 400 10 L 400 100 L 0 100 Z" fill="#102957" fillOpacity="0.05"/>
          </svg>
        </div>
        
        {/* Right: Bar */}
        <div className="flex flex-col justify-end">
          <div className="flex justify-between items-end mb-[2vh]">
            <p className="text-[calc(1.6*var(--slide-vw))] font-semibold">Time to Resolution</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-accent font-semibold">-85%</p>
          </div>
          <div className="space-y-[1.5vh]">
            <div className="flex items-center gap-[1vw]">
              <span className="w-[6vw] text-[calc(1.4*var(--slide-vw))] text-muted">Legacy</span>
              <div className="h-[2vh] w-[70%] bg-[#dde2eb]"></div>
            </div>
            <div className="flex items-center gap-[1vw]">
              <span className="w-[6vw] text-[calc(1.4*var(--slide-vw))] font-semibold text-primary">Agentic</span>
              <div className="h-[2vh] w-[15%] bg-accent"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}