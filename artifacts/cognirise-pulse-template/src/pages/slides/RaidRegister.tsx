import React from 'react';
const base = import.meta.env.BASE_URL;

export default function RaidRegister() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-muted uppercase">RAID Register / 47</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      
      <h1 className="font-display text-[calc(4*var(--slide-vw))] tracking-[-.05em] leading-[1.1] mt-[3vh] w-[80vw]">
        Visibility into friction <span className="text-accent">protects delivery momentum.</span>
      </h1>

      <div className="mt-[3vh] grid grid-cols-2 gap-x-[4vw] gap-y-[2vh] h-[65vh]">
        {/* Risks */}
        <div className="bg-white p-[2vw] border-l-[.4vw] border-[#c83232] shadow-sm flex flex-col">
          <div className="flex items-baseline gap-[1vw] mb-[1vh]">
            <p className="font-display text-[calc(4*var(--slide-vw))] leading-none text-[#c83232]">R</p>
            <p className="text-[calc(1.8*var(--slide-vw))] tracking-[.1em] font-bold text-primary">RISKS</p>
          </div>
          <p className="text-[calc(1.7*var(--slide-vw))] font-semibold text-primary">Data privacy compliance block</p>
          <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh] leading-[1.4]">
            Mitigation: Implement PII scrubbing at the gateway level before vectors are generated. SecOps sign-off by Week 2.
          </p>
        </div>

        {/* Assumptions */}
        <div className="bg-white p-[2vw] border-l-[.4vw] border-[#7659df] shadow-sm flex flex-col">
          <div className="flex items-baseline gap-[1vw] mb-[1vh]">
            <p className="font-display text-[calc(4*var(--slide-vw))] leading-none text-[#7659df]">A</p>
            <p className="text-[calc(1.8*var(--slide-vw))] tracking-[.1em] font-bold text-primary">ASSUMPTIONS</p>
          </div>
          <p className="text-[calc(1.7*var(--slide-vw))] font-semibold text-primary">API availability of core systems</p>
          <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh] leading-[1.4]">
            Validation: We assume the legacy CRM exposes REST endpoints for read/write. If false, we pivot to RPA bridge for V1.
          </p>
        </div>

        {/* Issues */}
        <div className="bg-white p-[2vw] border-l-[.4vw] border-[#ff775d] shadow-sm flex flex-col">
          <div className="flex items-baseline gap-[1vw] mb-[1vh]">
            <p className="font-display text-[calc(4*var(--slide-vw))] leading-none text-[#ff775d]">I</p>
            <p className="text-[calc(1.8*var(--slide-vw))] tracking-[.1em] font-bold text-primary">ISSUES</p>
          </div>
          <p className="text-[calc(1.7*var(--slide-vw))] font-semibold text-primary">SME availability for ontology mapping</p>
          <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh] leading-[1.4]">
            Action: Escalate to Sponsor to secure 4 hours/week of dedicated time from the Head of Underwriting immediately.
          </p>
        </div>

        {/* Dependencies */}
        <div className="bg-white p-[2vw] border-l-[.4vw] border-primary shadow-sm flex flex-col">
          <div className="flex items-baseline gap-[1vw] mb-[1vh]">
            <p className="font-display text-[calc(4*var(--slide-vw))] leading-none text-primary">D</p>
            <p className="text-[calc(1.8*var(--slide-vw))] tracking-[.1em] font-bold text-primary">DEPENDENCIES</p>
          </div>
          <p className="text-[calc(1.7*var(--slide-vw))] font-semibold text-primary">Cloud infrastructure provisioning</p>
          <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh] leading-[1.4]">
            Status: Blocked until InfoSec approves the VPC architecture. Meeting scheduled for Thursday to unlock.
          </p>
        </div>
      </div>
    </div>
  );
}
