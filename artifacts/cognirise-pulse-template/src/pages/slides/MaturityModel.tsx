import React from 'react';
const base = import.meta.env.BASE_URL;

export default function MaturityModel() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[4vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold uppercase">Capability Assessment / Maturity Model</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      <div className="mt-[3vh]">
        <h1 className="font-display text-[calc(4.2*var(--slide-vw))] tracking-[-.06em] leading-[1.05]">
          Progress requires moving through, <span className="text-accent">not skipping, stages.</span>
        </h1>
      </div>
      
      <div className="flex items-end mt-[4vh] h-[52vh] gap-[1vw]">
        {/* Level 1 */}
        <div className="flex-1 flex flex-col h-full relative">
          <div className="p-[1.2vw] bg-white border-t-[.4vw] border-primary shadow-sm mb-[1.5vh] z-10">
            <span className="text-[calc(1.5*var(--slide-vw))] font-bold text-muted mb-[.5vh] block">01</span>
            <h2 className="font-display text-[calc(1.8*var(--slide-vw))] font-bold leading-[1.1] mb-[1vh]">Ad Hoc</h2>
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary">Individual pilots. No governance.</p>
          </div>
          <div className="flex-1 flex flex-col justify-end min-h-0">
            <div className="w-full bg-[#f3e4ed] relative" style={{ height: '20%' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-[1vw] py-[.5vh] text-[calc(1.5*var(--slide-vw))] font-bold tracking-widest uppercase z-20 border-[.2vw] border-white shadow-sm whitespace-nowrap">CURRENT</div>
            </div>
          </div>
        </div>

        {/* Level 2 */}
        <div className="flex-1 flex flex-col h-full relative">
          <div className="p-[1.2vw] bg-white border-t-[.4vw] border-primary shadow-sm mb-[1.5vh] z-10">
            <span className="text-[calc(1.5*var(--slide-vw))] font-bold text-muted mb-[.5vh] block">02</span>
            <h2 className="font-display text-[calc(1.8*var(--slide-vw))] font-bold leading-[1.1] mb-[1vh]">Exploratory</h2>
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary">Sanctioned pilots. Isolated value.</p>
          </div>
          <div className="flex-1 flex flex-col justify-end min-h-0">
            <div className="w-full bg-primary/10 relative" style={{ height: '40%' }}></div>
          </div>
        </div>

        {/* Level 3 */}
        <div className="flex-1 flex flex-col h-full relative">
          <div className="p-[1.2vw] bg-white border-t-[.4vw] border-primary shadow-sm mb-[1.5vh] z-10">
            <span className="text-[calc(1.5*var(--slide-vw))] font-bold text-muted mb-[.5vh] block">03</span>
            <h2 className="font-display text-[calc(1.8*var(--slide-vw))] font-bold leading-[1.1] mb-[1vh]">Defined</h2>
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary">Standardized patterns. Governance.</p>
          </div>
          <div className="flex-1 flex flex-col justify-end min-h-0">
            <div className="w-full bg-primary/20 relative" style={{ height: '60%' }}></div>
          </div>
        </div>

        {/* Level 4 */}
        <div className="flex-1 flex flex-col h-full relative">
          <div className="p-[1.2vw] bg-white border-t-[.4vw] border-primary shadow-sm mb-[1.5vh] z-10">
            <span className="text-[calc(1.5*var(--slide-vw))] font-bold text-accent mb-[.5vh] block">04</span>
            <h2 className="font-display text-[calc(1.8*var(--slide-vw))] font-bold leading-[1.1] mb-[1vh] text-accent">Integrated</h2>
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary">Agents in workflows. Visible ROI.</p>
          </div>
          <div className="flex-1 flex flex-col justify-end min-h-0">
            <div className="w-full bg-accent text-white border-t-[.4vw] border-primary relative" style={{ height: '80%' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-white px-[1vw] py-[.5vh] text-[calc(1.5*var(--slide-vw))] font-bold tracking-widest uppercase z-20 border-[.2vw] border-white shadow-sm whitespace-nowrap">TARGET</div>
            </div>
          </div>
        </div>

        {/* Level 5 */}
        <div className="flex-1 flex flex-col h-full relative">
          <div className="p-[1.2vw] bg-white border-t-[.4vw] border-primary shadow-sm mb-[1.5vh] z-10">
            <span className="text-[calc(1.5*var(--slide-vw))] font-bold text-muted mb-[.5vh] block">05</span>
            <h2 className="font-display text-[calc(1.8*var(--slide-vw))] font-bold leading-[1.1] mb-[1vh]">Optimized</h2>
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary">Continuous learning. AI fabric.</p>
          </div>
          <div className="flex-1 flex flex-col justify-end min-h-0">
            <div className="w-full bg-primary text-white border-t-[.4vw] border-accent relative" style={{ height: '100%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
