import React from 'react';
const base = import.meta.env.BASE_URL;

export default function OutcomeCaseStudy() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-muted uppercase">Outcome Case Study / 43</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      
      <h1 className="font-display text-[calc(4*var(--slide-vw))] tracking-[-.05em] leading-[1.1] mt-[4vh] w-[70vw]">
        The blueprint is proven. Similar architectures yield <span className="text-accent">outsized returns.</span>
      </h1>

      <div className="flex mt-[4vh] gap-[4vw] h-[60vh]">
        {/* Large Stats */}
        <div className="w-[40vw] flex flex-col justify-between">
          <div className="border-t-[.3vw] border-primary pt-[1.5vh]">
            <p className="font-display text-[calc(7*var(--slide-vw))] leading-none text-primary tracking-tighter">-65%</p>
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold mt-[1vh] text-primary uppercase tracking-wide">End-to-End Cycle Time</p>
            <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] text-muted">From 14 days to under 5 days on average.</p>
          </div>
          <div className="border-t-[.3vw] border-[#7659df] pt-[1.5vh]">
            <p className="font-display text-[calc(7*var(--slide-vw))] leading-none text-[#7659df] tracking-tighter">4.2x</p>
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold mt-[1vh] text-primary uppercase tracking-wide">Throughput per Analyst</p>
            <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] text-muted">Automated context gathering removes repetitive search.</p>
          </div>
        </div>

        {/* Story */}
        <div className="w-[45vw] bg-white p-[3vw] shadow-sm border-l-[.4vw] border-accent flex flex-col justify-center relative">
          <div className="absolute top-[3vh] right-[3vw] text-[calc(6*var(--slide-vw))] text-muted opacity-10 font-display font-bold leading-none">"</div>
          <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-accent mb-[2vh]">GLOBAL FINANCIAL SERVICES CLIENT</p>
          <h2 className="font-display text-[calc(2.5*var(--slide-vw))] leading-[1.2] text-primary">
            "By replacing a 12-step manual triage with an LLM-driven classification gateway, we didn't just save time—we unlocked the capacity to handle double the volume with zero new hires."
          </h2>
          <div className="mt-[3vh] pt-[1.5vh] border-t-[.1vw] border-muted/30">
            <p className="text-[calc(1.6*var(--slide-vw))] font-semibold text-primary">Implementation timeline: 14 weeks</p>
            <p className="text-[calc(1.6*var(--slide-vw))] text-muted mt-[.5vh]">From initial value scan to live production deployment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
