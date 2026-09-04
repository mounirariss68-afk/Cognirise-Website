import React from 'react';
const base = import.meta.env.BASE_URL;

export default function PrioritizationMatrix() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-muted uppercase">Prioritization Model / 44</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      
      <h1 className="font-display text-[calc(4*var(--slide-vw))] tracking-[-.05em] leading-[1.1] mt-[3vh] w-[80vw]">
        Execute only where <span className="text-accent">feasibility meets material value.</span>
      </h1>

      <div className="mt-[4vh] flex gap-[1vw] h-[62vh]">
        {/* Must Do */}
        <div className="w-[30vw] bg-primary text-white p-[2vw] flex flex-col relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-[#1a3a75] z-0"></div>
          <div className="relative z-10">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-accent mb-[2vh]">01 / ACT NOW</p>
            <p className="font-display text-[calc(2.5*var(--slide-vw))] leading-[1.1] mb-[2vh]">
              High Value,<span className="block">High Feasibility</span>
            </p>
            <ul className="space-y-[1.5vh]">
              <li className="text-[calc(1.6*var(--slide-vw))] border-l-[.2vw] border-accent pl-[1vw]">Service intake classification</li>
              <li className="text-[calc(1.6*var(--slide-vw))] border-l-[.2vw] border-accent pl-[1vw]">First-line QA automation</li>
              <li className="text-[calc(1.6*var(--slide-vw))] border-l-[.2vw] border-accent pl-[1vw]">Standard reporting generation</li>
            </ul>
          </div>
        </div>

        {/* Strategic */}
        <div className="w-[30vw] bg-white text-primary p-[2vw] flex flex-col border-y-[.2vw] border-primary">
          <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-[#7659df] mb-[2vh]">02 / INCUBATE</p>
          <p className="font-display text-[calc(2.5*var(--slide-vw))] leading-[1.1] mb-[2vh]">
            High Value,<span className="block">Low Feasibility</span>
          </p>
          <ul className="space-y-[1.5vh]">
            <li className="text-[calc(1.6*var(--slide-vw))] border-l-[.2vw] border-[#7659df] pl-[1vw]">End-to-end autonomous negotiation</li>
            <li className="text-[calc(1.6*var(--slide-vw))] border-l-[.2vw] border-[#7659df] pl-[1vw]">Complex regulatory interpretation</li>
            <li className="text-[calc(1.6*var(--slide-vw))] border-l-[.2vw] border-[#7659df] pl-[1vw]">Unstructured voice synthesis</li>
          </ul>
          <div className="mt-auto pt-[1.5vh] border-t border-muted/20">
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted">Requires data foundation rebuild first.</p>
          </div>
        </div>

        {/* Ignore */}
        <div className="w-[30vw] bg-[#eef2f8] text-muted p-[2vw] flex flex-col">
          <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold mb-[2vh]">03 / DE-PRIORITIZE</p>
          <p className="font-display text-[calc(2.5*var(--slide-vw))] leading-[1.1] mb-[2vh] text-primary">
            Low Value,<span className="block">Any Feasibility</span>
          </p>
          <ul className="space-y-[1.5vh]">
            <li className="text-[calc(1.6*var(--slide-vw))] border-l-[.2vw] border-muted pl-[1vw]">Legacy system cosmetic wrappers</li>
            <li className="text-[calc(1.6*var(--slide-vw))] border-l-[.2vw] border-muted pl-[1vw]">Internal HR knowledge bots (solved)</li>
            <li className="text-[calc(1.6*var(--slide-vw))] border-l-[.2vw] border-muted pl-[1vw]">Low-volume bespoke edge cases</li>
          </ul>
          <div className="mt-auto pt-[1.5vh]">
            <p className="text-[calc(1.5*var(--slide-vw))] italic">Do not distract engineering capacity.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
