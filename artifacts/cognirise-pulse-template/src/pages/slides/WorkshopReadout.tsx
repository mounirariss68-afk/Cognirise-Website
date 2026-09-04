import React from 'react';
const base = import.meta.env.BASE_URL;

export default function WorkshopReadout() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-primary text-white font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center relative z-10">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-[#dce4f0] uppercase">Workshop Readout / 50</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw] brightness-0 invert" />
      </div>
      
      <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.05em] leading-[1.1] mt-[4vh] w-[85vw] relative z-10">
        Three definitive agreements <span className="text-accent">to unlock execution.</span>
      </h1>

      <div className="mt-[4vh] flex gap-[4vw] relative z-10">
        {/* Left Column: Quote */}
        <div className="w-[35vw] flex flex-col justify-center border-t-[.4vw] border-accent pt-[2vh]">
          <p className="font-display text-[calc(2.5*var(--slide-vw))] leading-[1.3] text-[#dce4f0]">
            "If we just build a faster way to do a broken process, we've failed. We must automate the <span className="text-white font-bold">decision</span>, not just the data entry."
          </p>
          <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] font-semibold text-accent mt-[2vh] uppercase">
            — VP, Operations (Workshop Day 1)
          </p>
        </div>

        {/* Right Column: Decisions */}
        <div className="w-[50vw] flex flex-col gap-[2vh]">
          <div className="bg-white/10 p-[2vw] border-l-[.3vw] border-[#ff775d]">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-[#ff775d] mb-[0.5vh]">DECISION 01</p>
            <p className="text-[calc(2*var(--slide-vw))] font-semibold">Proceed with "Triage" as the V1 Pilot.</p>
            <p className="text-[calc(1.6*var(--slide-vw))] text-[#dce4f0] mt-[1vh]">Highest volume, lowest complexity, clearest ROI baseline.</p>
          </div>
          
          <div className="bg-white/10 p-[2vw] border-l-[.3vw] border-[#7659df]">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-[#7659df] mb-[0.5vh]">DECISION 02</p>
            <p className="text-[calc(2*var(--slide-vw))] font-semibold">Strict "Human-in-the-loop" for Phase 1.</p>
            <p className="text-[calc(1.6*var(--slide-vw))] text-[#dce4f0] mt-[1vh]">Agents will recommend decisions; humans will approve them until a 99% accuracy threshold is proven.</p>
          </div>
          
          <div className="bg-white/10 p-[2vw] border-l-[.3vw] border-[#db509e]">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-[#db509e] mb-[0.5vh]">DECISION 03</p>
            <p className="text-[calc(2*var(--slide-vw))] font-semibold">No core system modifications.</p>
            <p className="text-[calc(1.6*var(--slide-vw))] text-[#dce4f0] mt-[1vh]">The AI layer will interact purely via existing API gateways. We will not delay for legacy tech debt cleanup.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
