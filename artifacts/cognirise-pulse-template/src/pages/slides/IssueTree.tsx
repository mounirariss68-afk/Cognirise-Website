import React from 'react';
const base = import.meta.env.BASE_URL;

export default function IssueTree() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold uppercase">Problem Structuring / Issue Tree</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      <div className="mt-[5vh]">
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] leading-[1]">Break ambiguity into <span className="text-accent">testable hypotheses.</span></h1>
      </div>
      
      <div className="relative mt-[8vh] w-[90vw] h-[55vh]">
        
        {/* Connectors (SVG for perfect scalable lines) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {/* Root to Branches */}
          <line x1="22%" y1="50%" x2="28%" y2="50%" stroke="var(--slide-primary)" strokeWidth="4" />
          <line x1="28%" y1="25%" x2="28%" y2="75%" stroke="var(--slide-primary)" strokeWidth="4" />
          <line x1="28%" y1="25%" x2="35%" y2="25%" stroke="var(--slide-primary)" strokeWidth="4" />
          <line x1="28%" y1="75%" x2="35%" y2="75%" stroke="var(--slide-primary)" strokeWidth="4" />
          
          {/* Top Branch to Leaves */}
          <line x1="57%" y1="25%" x2="62%" y2="25%" stroke="var(--slide-primary)" strokeWidth="3" opacity="0.4" />
          <line x1="62%" y1="12.5%" x2="62%" y2="37.5%" stroke="var(--slide-primary)" strokeWidth="3" opacity="0.4" />
          <line x1="62%" y1="12.5%" x2="67%" y2="12.5%" stroke="var(--slide-primary)" strokeWidth="3" opacity="0.4" />
          <line x1="62%" y1="37.5%" x2="67%" y2="37.5%" stroke="var(--slide-primary)" strokeWidth="3" opacity="0.4" />

          {/* Bottom Branch to Leaves */}
          <line x1="57%" y1="75%" x2="62%" y2="75%" stroke="var(--slide-primary)" strokeWidth="3" opacity="0.4" />
          <line x1="62%" y1="62.5%" x2="62%" y2="87.5%" stroke="var(--slide-primary)" strokeWidth="3" opacity="0.4" />
          <line x1="62%" y1="62.5%" x2="67%" y2="62.5%" stroke="var(--slide-primary)" strokeWidth="3" opacity="0.4" />
          <line x1="62%" y1="87.5%" x2="67%" y2="87.5%" stroke="var(--slide-primary)" strokeWidth="3" opacity="0.4" />
        </svg>

        {/* Level 1: Root */}
        <div className="absolute left-0 top-[50%] -translate-y-1/2 w-[22%] bg-primary text-white p-[2vw] border-t-[.4vw] border-accent shadow-md z-10">
          <p className="text-[calc(1.5*var(--slide-vw))] font-bold text-accent mb-[1.5vh] tracking-widest uppercase">Core Question</p>
          <h2 className="text-[calc(2*var(--slide-vw))] leading-[1.2] font-display">How can we reduce decision latency by 40%?</h2>
        </div>
        
        {/* Level 2: Branches */}
        <div className="absolute left-[35%] top-[25%] -translate-y-1/2 w-[22%] bg-white p-[1.5vw] border-t-[.4vw] border-primary shadow-sm z-10">
          <h3 className="text-[calc(1.8*var(--slide-vw))] font-display leading-[1.2] text-primary font-bold">1. Can we automate data gathering?</h3>
        </div>
        
        <div className="absolute left-[35%] top-[75%] -translate-y-1/2 w-[22%] bg-white p-[1.5vw] border-t-[.4vw] border-primary shadow-sm z-10">
          <h3 className="text-[calc(1.8*var(--slide-vw))] font-display leading-[1.2] text-primary font-bold">2. Can we accelerate risk assessment?</h3>
        </div>

        {/* Level 3: Leaves */}
        {/* Top group */}
        <div className="absolute left-[67%] top-[12.5%] -translate-y-1/2 w-[30%] bg-primary/[0.03] p-[1.5vw] border-l-[.4vw] border-accent shadow-sm z-10">
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.3] text-primary font-medium">1a. Ingest documents via OCR automatically</p>
        </div>
        <div className="absolute left-[67%] top-[37.5%] -translate-y-1/2 w-[30%] bg-primary/[0.03] p-[1.5vw] border-l-[.4vw] border-accent shadow-sm z-10">
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.3] text-primary font-medium">1b. Connect directly to credit bureaus via API</p>
        </div>
        
        {/* Bottom group */}
        <div className="absolute left-[67%] top-[62.5%] -translate-y-1/2 w-[30%] bg-primary/[0.03] p-[1.5vw] border-l-[.4vw] border-accent shadow-sm z-10">
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.3] text-primary font-medium">2a. Use deterministic rules engine for standard cases</p>
        </div>
        <div className="absolute left-[67%] top-[87.5%] -translate-y-1/2 w-[30%] bg-primary/[0.03] p-[1.5vw] border-l-[.4vw] border-accent shadow-sm z-10">
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.3] text-primary font-medium">2b. Deploy governed LLM to summarize history</p>
        </div>

      </div>
    </div>
  );
}
