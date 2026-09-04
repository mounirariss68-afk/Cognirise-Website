import React from 'react';
const base = import.meta.env.BASE_URL;

export default function IntegratedWorkstreamPlan() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-muted uppercase">Integrated Workstream Plan / 46</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      
      <h1 className="font-display text-[calc(3.5*var(--slide-vw))] tracking-[-.04em] leading-[1.1] mt-[3vh] w-[90vw]">
        Parallel execution ensures <span className="text-accent">day-1 operational readiness.</span>
      </h1>

      <div className="mt-[3vh] border-t-[.2vw] border-primary pt-[1.5vh]">
        {/* Timeline Header */}
        <div className="flex ml-[25vw] mb-[1.5vh]">
          <div className="w-[20vw] text-[calc(1.5*var(--slide-vw))] font-bold text-muted border-l-[.2vw] border-muted/30 pl-[1vw]">
            MONTH 1
            <span className="block font-normal text-[calc(1.5*var(--slide-vw))] mt-[.5vh]">Discover & Design</span>
          </div>
          <div className="w-[20vw] text-[calc(1.5*var(--slide-vw))] font-bold text-muted border-l-[.2vw] border-muted/30 pl-[1vw]">
            MONTH 2
            <span className="block font-normal text-[calc(1.5*var(--slide-vw))] mt-[.5vh]">Build & Test</span>
          </div>
          <div className="w-[20vw] text-[calc(1.5*var(--slide-vw))] font-bold text-muted border-l-[.2vw] border-muted/30 pl-[1vw]">
            MONTH 3
            <span className="block font-normal text-[calc(1.5*var(--slide-vw))] mt-[.5vh]">Deploy & Scale</span>
          </div>
        </div>

        <div className="space-y-[1.5vh] relative">
          {/* Vertical Guides */}
          <div className="absolute top-0 bottom-0 left-[25vw] w-[.1vw] bg-muted/20 z-0"></div>
          <div className="absolute top-0 bottom-0 left-[45vw] w-[.1vw] bg-muted/20 z-0"></div>
          <div className="absolute top-0 bottom-0 left-[65vw] w-[.1vw] bg-muted/20 z-0"></div>

          {/* Workstream 1 */}
          <div className="flex items-center relative z-10">
            <div className="w-[24vw] pr-[2vw]">
              <p className="font-display text-[calc(1.8*var(--slide-vw))] font-semibold text-primary leading-[1.2]">Architecture & Security</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[0.5vh]">Gateway, IAM, Network</p>
            </div>
            <div className="w-[60vw] relative h-[4vh]">
              <div className="absolute left-[1vw] w-[25vw] h-full bg-primary flex items-center px-[1vw] text-white text-[calc(1.5*var(--slide-vw))]">Foundation setup</div>
              <div className="absolute left-[26vw] w-[15vw] h-full bg-[#1a3a75] flex items-center px-[1vw] text-white text-[calc(1.5*var(--slide-vw))]">Pen testing</div>
            </div>
          </div>

          {/* Workstream 2 */}
          <div className="flex items-center relative z-10">
            <div className="w-[24vw] pr-[2vw]">
              <p className="font-display text-[calc(1.8*var(--slide-vw))] font-semibold text-primary leading-[1.2]">Data Ontology & Ingestion</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[0.5vh]">Vector db, RAG pipelines</p>
            </div>
            <div className="w-[60vw] relative h-[4vh]">
              <div className="absolute left-[5vw] w-[18vw] h-full bg-[#7659df] flex items-center px-[1vw] text-white text-[calc(1.5*var(--slide-vw))]">Index corp data</div>
              <div className="absolute left-[23vw] w-[25vw] h-full bg-[#5d46b0] flex items-center px-[1vw] text-white text-[calc(1.5*var(--slide-vw))]">Optimize retrieval</div>
            </div>
          </div>

          {/* Workstream 3 */}
          <div className="flex items-center relative z-10">
            <div className="w-[24vw] pr-[2vw]">
              <p className="font-display text-[calc(1.8*var(--slide-vw))] font-semibold text-primary leading-[1.2]">Business Change & Ops</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[0.5vh]">SOPs, Training, Comms</p>
            </div>
            <div className="w-[60vw] relative h-[4vh]">
              <div className="absolute left-[10vw] w-[15vw] h-[.2vw] bg-accent top-1/2"></div>
              <div className="absolute left-[25vw] w-[35vw] h-full bg-accent flex items-center px-[1vw] text-white text-[calc(1.5*var(--slide-vw))] font-bold">User adoption & Change comms</div>
            </div>
          </div>
          
          {/* Workstream 4 */}
          <div className="flex items-center relative z-10">
            <div className="w-[24vw] pr-[2vw]">
              <p className="font-display text-[calc(1.8*var(--slide-vw))] font-semibold text-primary leading-[1.2]">Governance & Risk</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[0.5vh]">Legal, Compliance, Ethics</p>
            </div>
            <div className="w-[60vw] relative h-[4vh]">
              <div className="absolute left-[0] w-[20vw] h-full bg-[#ff775d] flex items-center px-[1vw] text-white text-[calc(1.5*var(--slide-vw))]">Policy definition</div>
              <div className="absolute left-[20vw] w-[40vw] h-[.2vw] bg-[#ff775d] top-1/2"></div>
              <div className="absolute left-[55vw] w-[5vw] h-full bg-[#ff775d] flex items-center justify-center text-white text-[calc(1.5*var(--slide-vw))] font-bold">Audit</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
