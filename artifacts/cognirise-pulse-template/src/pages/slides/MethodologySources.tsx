import React from 'react';
const base = import.meta.env.BASE_URL;

export default function MethodologySources() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-muted uppercase">Methodology & Sources / 51</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      
      <h1 className="font-display text-[calc(3.5*var(--slide-vw))] tracking-[-.04em] leading-[1.1] mt-[4vh] w-[80vw]">
        Rigorous data foundations ensure <span className="text-accent">defensible projections.</span>
      </h1>

      <div className="mt-[4vh] border-t-[.15vw] border-primary pt-[2vh] grid grid-cols-[1fr_2fr] gap-[6vw] h-[62vh]">
        {/* Methodology */}
        <div>
          <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-primary mb-[1.5vh]">MODEL METHODOLOGY</p>
          <p className="text-[calc(1.6*var(--slide-vw))] leading-[1.5] text-muted mb-[1.5vh]">
            All business case projections in this document are built using a bottom-up activity-based costing model. We isolated 14 key triage activities and applied measured agentic time-savings benchmarks derived from 3 comparable live deployments.
          </p>
          <p className="text-[calc(1.6*var(--slide-vw))] leading-[1.5] text-muted">
            The ROI calculation aggressively discounts potential capacity release by 30% to account for change-management friction and learning curves during the first 6 months.
          </p>
        </div>

        {/* Sources Grid */}
        <div>
          <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-primary mb-[1.5vh]">CITATIONS & BENCHMARKS</p>
          <div className="grid grid-cols-2 gap-x-[3vw] gap-y-[1.5vh]">
            <div className="border-l-[.2vw] border-muted/30 pl-[1.5vw]">
              <p className="text-[calc(1.5*var(--slide-vw))] font-bold text-primary">[1] Internal Time-and-Motion Study</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[.5vh]">Q3 Operations Review, capturing 4,200 hours of manual intake processing. Used as the current-state baseline.</p>
            </div>
            <div className="border-l-[.2vw] border-muted/30 pl-[1.5vw]">
              <p className="text-[calc(1.5*var(--slide-vw))] font-bold text-primary">[2] Cognirise FinServ Benchmark Index</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[.5vh]">Aggregated performance telemetry from 3 comparable agentic RAG deployments in regulated financial environments.</p>
            </div>
            <div className="border-l-[.2vw] border-muted/30 pl-[1.5vw]">
              <p className="text-[calc(1.5*var(--slide-vw))] font-bold text-primary">[3] Cloud Compute Pricing Forecast</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[.5vh]">Projected token and inference costs based on current enterprise agreements with Azure OpenAI services, padded by 15%.</p>
            </div>
            <div className="border-l-[.2vw] border-muted/30 pl-[1.5vw]">
              <p className="text-[calc(1.5*var(--slide-vw))] font-bold text-primary">[4] Industry Risk Standard (ISO 31000)</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[.5vh]">Risk mitigation framework applied to the RAID register and Governance RACI structures presented herein.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
