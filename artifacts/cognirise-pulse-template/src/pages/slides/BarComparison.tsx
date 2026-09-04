import React from 'react';
const base=import.meta.env.BASE_URL;
export default function BarComparison(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh] flex">
      
      <div className="w-[35vw] flex flex-col pr-[5vw] pb-[2vh]">
        <header>
          <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">BENCHMARK / 33</p>
        </header>
        <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw] mt-[2vh]"/>
        
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] mt-[6vh] leading-[1.05]">
          A fundamental <span className="text-accent">shift in velocity.</span>
        </h1>
        <p className="mt-[3vh] text-[calc(1.8*var(--slide-vw))] text-muted leading-[1.4]">
          Traditional transformation programs rely on linear headcount scaling. Agentic architectures decouple growth from operational cost.
        </p>
        
        <div className="mt-auto border-l-[0.3vw] border-accent pl-[1.5vw]">
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.4]">
            <b>Insight:</b> The Cognirise deployed architecture accelerates processing capability by 4.2x against legacy baselines without adding operational footprint.
          </p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center pl-[5vw] border-l border-[#dde2eb] pb-[2vh]">
        <p className="text-[calc(1.6*var(--slide-vw))] font-semibold mb-[4vh]">Processing Volume Capability (Normalized Index)</p>
        
        <div className="space-y-[3vh] w-[45vw]">
          {/* Bar 1 */}
          <div>
            <div className="flex justify-between items-end mb-[1vh]">
              <span className="text-[calc(1.6*var(--slide-vw))] font-semibold">Legacy Manual Baseline</span>
              <span className="text-[calc(1.8*var(--slide-vw))] font-display font-bold text-muted">100</span>
            </div>
            <div className="h-[4vh] w-full bg-[#dde2eb] relative">
              <div className="absolute top-0 left-0 h-full w-[24%] bg-primary opacity-30"></div>
            </div>
          </div>
          
          {/* Bar 2 */}
          <div>
            <div className="flex justify-between items-end mb-[1vh]">
              <span className="text-[calc(1.6*var(--slide-vw))] font-semibold">RPA / Scripted Automation</span>
              <span className="text-[calc(1.8*var(--slide-vw))] font-display font-bold text-muted">185</span>
            </div>
            <div className="h-[4vh] w-full bg-[#dde2eb] relative">
              <div className="absolute top-0 left-0 h-full w-[44%] bg-primary opacity-60"></div>
            </div>
          </div>
          
          {/* Bar 3 */}
          <div>
            <div className="flex justify-between items-end mb-[1vh]">
              <span className="text-[calc(1.6*var(--slide-vw))] font-semibold text-accent">Cognirise Agentic Architecture</span>
              <span className="text-[calc(2.2*var(--slide-vw))] font-display font-bold text-accent">420</span>
            </div>
            <div className="h-[4vh] w-full bg-[#dde2eb] relative">
              <div className="absolute top-0 left-0 h-full w-[100%] bg-accent"></div>
            </div>
          </div>
        </div>
        
        <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[4vh]">
          *Index based on Q4 throughput testing simulating peak enterprise workloads.
        </p>
      </div>
    </div>
  )
}