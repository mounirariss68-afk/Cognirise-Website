import React from 'react';
const base=import.meta.env.BASE_URL;
export default function KpiScorecard(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh] flex flex-col">
      <header className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">PERFORMANCE / 32</p>
        <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]"/>
      </header>
      
      <div className="mt-[4vh] flex justify-between items-end">
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] w-[50vw] leading-[1.05]">
          Impact measured in <span className="text-accent">momentum.</span>
        </h1>
        <p className="text-[calc(1.8*var(--slide-vw))] text-muted w-[35vw] leading-[1.4] pb-[1vh]">
          First-quarter operational metrics demonstrate rapid acceleration across efficiency and adoption vectors following the trust-layer deployment.
        </p>
      </div>
      
      <div className="flex-1 mt-[6vh] mb-[4vh] grid grid-cols-4 gap-[4vw]">
        {/* KPI 1 */}
        <div className="border-t-[0.4vw] border-accent pt-[3vh] flex flex-col">
          <p className="text-[calc(1.6*var(--slide-vw))] font-semibold uppercase tracking-widest text-muted">Cycle Time</p>
          <div className="mt-[2vh] flex items-baseline gap-[1vw]">
            <span className="font-display text-[calc(6*var(--slide-vw))] font-bold text-primary tracking-[-0.04em]">-42</span>
            <span className="text-[calc(2*var(--slide-vw))] font-semibold text-primary">%</span>
          </div>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[2vh] leading-[1.4]">Average resolution time for tier-2 support queries, shifted entirely to L1 agents.</p>
        </div>
        
        {/* KPI 2 */}
        <div className="border-t-[0.2vw] border-[#dde2eb] pt-[3vh] flex flex-col">
          <p className="text-[calc(1.6*var(--slide-vw))] font-semibold uppercase tracking-widest text-muted">Accuracy</p>
          <div className="mt-[2vh] flex items-baseline gap-[1vw]">
            <span className="font-display text-[calc(6*var(--slide-vw))] font-bold text-primary tracking-[-0.04em]">99.4</span>
            <span className="text-[calc(2*var(--slide-vw))] font-semibold text-primary">%</span>
          </div>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[2vh] leading-[1.4]">Deterministic precision in automated document extraction, outperforming human baseline by 2.1%.</p>
        </div>
        
        {/* KPI 3 */}
        <div className="border-t-[0.2vw] border-[#dde2eb] pt-[3vh] flex flex-col">
          <p className="text-[calc(1.6*var(--slide-vw))] font-semibold uppercase tracking-widest text-muted">Adoption</p>
          <div className="mt-[2vh] flex items-baseline gap-[1vw]">
            <span className="font-display text-[calc(6*var(--slide-vw))] font-bold text-primary tracking-[-0.04em]">8,450</span>
          </div>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[2vh] leading-[1.4]">Weekly active users interacting with the Copilot layer across enterprise channels.</p>
        </div>
        
        {/* KPI 4 */}
        <div className="border-t-[0.2vw] border-[#dde2eb] pt-[3vh] flex flex-col">
          <p className="text-[calc(1.6*var(--slide-vw))] font-semibold uppercase tracking-widest text-muted">Capacity</p>
          <div className="mt-[2vh] flex items-baseline gap-[1vw]">
            <span className="font-display text-[calc(6*var(--slide-vw))] font-bold text-primary tracking-[-0.04em]">+14</span>
            <span className="text-[calc(2*var(--slide-vw))] font-semibold text-primary">k</span>
          </div>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[2vh] leading-[1.4]">FTE hours released per month, reallocated to strategic high-touch initiatives.</p>
        </div>
      </div>
    </div>
  )
}