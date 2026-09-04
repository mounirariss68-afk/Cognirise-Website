import React from 'react';
const base = import.meta.env.BASE_URL;

export default function SwotAnalysis() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold uppercase">Strategic Position / SWOT Analysis</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      <div className="mt-[5vh]">
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] leading-[1]">Convert expertise into <span className="text-accent">repeatability.</span></h1>
      </div>
      
      <div className="grid grid-cols-2 grid-rows-2 mt-[6vh] h-[60vh] gap-[.2vw] bg-primary/20 border-[.2vw] border-primary">
        {/* Strengths */}
        <div className="bg-white p-[2.5vw] flex flex-col justify-center">
          <div className="flex justify-between items-baseline mb-[2vh]">
            <h2 className="font-display text-[calc(2.5*var(--slide-vw))] text-primary font-bold">Strengths</h2>
            <span className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] text-muted font-semibold uppercase">Internal / Helpful</span>
          </div>
          <ul className="text-[calc(1.6*var(--slide-vw))] space-y-[1.5vh] text-primary">
            <li className="flex gap-[1vw]">
              <span className="font-semibold text-accent">01</span>
              <span>Senior operators translate ambiguity into decisions</span>
            </li>
            <li className="flex gap-[1vw]">
              <span className="font-semibold text-accent">02</span>
              <span>Governance is embedded into delivery patterns</span>
            </li>
          </ul>
        </div>
        
        {/* Weaknesses */}
        <div className="bg-[#f3e4ed] p-[2.5vw] flex flex-col justify-center">
          <div className="flex justify-between items-baseline mb-[2vh]">
            <h2 className="font-display text-[calc(2.5*var(--slide-vw))] text-primary font-bold">Weaknesses</h2>
            <span className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] text-accent font-semibold uppercase">Internal / Harmful</span>
          </div>
          <ul className="text-[calc(1.6*var(--slide-vw))] space-y-[1.5vh] text-primary">
            <li className="flex gap-[1vw]">
              <span className="font-semibold text-muted">01</span>
              <span>Senior-led delivery limits parallel account scaling</span>
            </li>
            <li className="flex gap-[1vw]">
              <span className="font-semibold text-muted">02</span>
              <span>Brand awareness trails larger transformation firms</span>
            </li>
          </ul>
        </div>
        
        {/* Opportunities */}
        <div className="bg-white p-[2.5vw] flex flex-col justify-center">
          <div className="flex justify-between items-baseline mb-[2vh]">
            <h2 className="font-display text-[calc(2.5*var(--slide-vw))] text-primary font-bold">Opportunities</h2>
            <span className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] text-muted font-semibold uppercase">External / Helpful</span>
          </div>
          <ul className="text-[calc(1.6*var(--slide-vw))] space-y-[1.5vh] text-primary">
            <li className="flex gap-[1vw]">
              <span className="font-semibold text-accent">01</span>
              <span>Leaders need measurable ROI beyond isolated pilots</span>
            </li>
            <li className="flex gap-[1vw]">
              <span className="font-semibold text-accent">02</span>
              <span>Regulated workflows reward auditable AI delivery</span>
            </li>
          </ul>
        </div>
        
        {/* Threats */}
        <div className="bg-primary text-white p-[2.5vw] flex flex-col justify-center">
          <div className="flex justify-between items-baseline mb-[2vh]">
            <h2 className="font-display text-[calc(2.5*var(--slide-vw))] font-bold">Threats</h2>
            <span className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] text-[#dce4f0] font-semibold uppercase">External / Harmful</span>
          </div>
          <ul className="text-[calc(1.6*var(--slide-vw))] space-y-[1.5vh]">
            <li className="flex gap-[1vw]">
              <span className="font-semibold text-accent">01</span>
              <span>SaaS platforms absorb basic automation natively</span>
            </li>
            <li className="flex gap-[1vw]">
              <span className="font-semibold text-accent">02</span>
              <span>Public AI incidents increase enterprise buyer caution</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
