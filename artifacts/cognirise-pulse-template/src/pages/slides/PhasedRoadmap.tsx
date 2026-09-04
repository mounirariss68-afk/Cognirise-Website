import React from 'react';
const base = import.meta.env.BASE_URL;

export default function PhasedRoadmap() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-muted uppercase">Phased Roadmap / 39</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      
      <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.07em] leading-[1.05] mt-[4vh] w-[80vw]">
        Delivery structured for <span className="text-accent">compounding momentum.</span>
      </h1>
      
      <div className="mt-[4vh] flex flex-col gap-[2vh] h-[62vh]">
        <div className="flex items-start">
          <div className="w-[15vw] pt-[1vh]">
            <p className="font-display text-[calc(4*var(--slide-vw))] leading-none text-primary opacity-20 font-bold">Q1</p>
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-semibold mt-[1vh]">ESTABLISH</p>
          </div>
          <div className="w-[75vw] border-t-[.3vw] border-primary pt-[1.5vh] flex gap-[4vw]">
            <div className="w-[22vw]">
              <p className="text-[calc(2*var(--slide-vw))] font-display font-semibold">Value Scan & Ontology</p>
              <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] leading-[1.4] text-muted">Identify high-friction nodes and establish data definitions.</p>
            </div>
            <div className="w-[22vw]">
              <p className="text-[calc(2*var(--slide-vw))] font-display font-semibold">Architecture Sprint</p>
              <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] leading-[1.4] text-muted">Deploy secure enterprise gateway and agent sandbox.</p>
            </div>
          </div>
        </div>

        <div className="flex items-start">
          <div className="w-[15vw] pt-[1vh]">
            <p className="font-display text-[calc(4*var(--slide-vw))] leading-none text-[#7659df] opacity-30 font-bold">Q2</p>
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-semibold mt-[1vh] text-[#7659df]">ACCELERATE</p>
          </div>
          <div className="w-[75vw] border-t-[.3vw] border-[#7659df] pt-[1.5vh] flex gap-[4vw] bg-white p-[1.5vw] shadow-sm">
            <div className="w-[22vw]">
              <p className="text-[calc(2*var(--slide-vw))] font-display font-semibold text-primary">Pilot Production</p>
              <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] leading-[1.4] text-muted">Launch single priority workstream to live users.</p>
            </div>
            <div className="w-[22vw]">
              <p className="text-[calc(2*var(--slide-vw))] font-display font-semibold text-primary">Governance Automation</p>
              <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] leading-[1.4] text-muted">Shift from manual audit to continuous compliance monitoring.</p>
            </div>
            <div className="w-[22vw] border-l-[.2vw] border-[#db509e] pl-[2vw]">
              <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] font-semibold text-accent">KEY MILESTONE</p>
              <p className="text-[calc(1.8*var(--slide-vw))] font-display mt-[1vh] leading-[1.2]">First measurable reduction in unit cost.</p>
            </div>
          </div>
        </div>

        <div className="flex items-start">
          <div className="w-[15vw] pt-[1vh]">
            <p className="font-display text-[calc(4*var(--slide-vw))] leading-none text-[#ff775d] opacity-40 font-bold">Q3+</p>
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-semibold mt-[1vh] text-[#ff775d]">SCALE</p>
          </div>
          <div className="w-[75vw] border-t-[.3vw] border-[#ff775d] pt-[1.5vh] flex gap-[4vw]">
            <div className="w-[48vw]">
              <p className="text-[calc(2*var(--slide-vw))] font-display font-semibold">Extend Across Adjacencies</p>
              <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] leading-[1.4] text-muted">Replicate the architecture to downstream teams. Fund adoption as an internal product, not a mandated IT rollout.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
