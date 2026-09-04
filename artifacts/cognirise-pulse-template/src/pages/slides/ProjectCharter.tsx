import React from 'react';
const base = import.meta.env.BASE_URL;

export default function ProjectCharter() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-muted uppercase">Project Charter / 40</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      
      <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.07em] leading-[1.05] mt-[4vh] w-[80vw]">
        A strictly bounded mandate for <span className="text-accent">unambiguous impact.</span>
      </h1>

      <div className="mt-[4vh] flex gap-[4vw] h-[60vh]">
        {/* Left bold statement */}
        <div className="w-[30vw] flex flex-col justify-between">
          <div>
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-semibold text-primary border-b-[.2vw] border-primary pb-[1vh]">THE MANDATE</p>
            <p className="font-display text-[calc(3*var(--slide-vw))] leading-[1.1] mt-[2vh] text-primary">Redesign service triage to fundamentally alter speed, quality, and auditability.</p>
          </div>
          <div className="bg-primary text-white p-[2vw]">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.12em] text-[#dce4f0] font-semibold mb-[1vh]">SUCCESS AT WEEK 10</p>
            <p className="text-[calc(2*var(--slide-vw))] leading-[1.3]">Live pilot demonstrates 40% faster handling with zero increase in control exceptions.</p>
          </div>
        </div>

        {/* Right Details Grid */}
        <div className="w-[56vw] flex flex-col">
          <div className="grid grid-cols-2 gap-[3vw] border-b-[.15vw] border-[#cbd3e1] pb-[2vh]">
            <div>
              <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.12em] text-muted font-semibold">IN SCOPE</p>
              <ul className="mt-[1.5vh] space-y-[1vh]">
                <li className="text-[calc(1.7*var(--slide-vw))] flex items-start gap-[1vw]"><span className="text-accent mt-[.5vh]">■</span> Intake and classification</li>
                <li className="text-[calc(1.7*var(--slide-vw))] flex items-start gap-[1vw]"><span className="text-accent mt-[.5vh]">■</span> Algorithmic routing</li>
                <li className="text-[calc(1.7*var(--slide-vw))] flex items-start gap-[1vw]"><span className="text-accent mt-[.5vh]">■</span> Agentic decision support</li>
                <li className="text-[calc(1.7*var(--slide-vw))] flex items-start gap-[1vw]"><span className="text-accent mt-[.5vh]">■</span> Automated evidence capture</li>
              </ul>
            </div>
            <div>
              <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.12em] text-muted font-semibold">OUT OF SCOPE</p>
              <ul className="mt-[1.5vh] space-y-[1vh] text-muted opacity-80">
                <li className="text-[calc(1.7*var(--slide-vw))] flex items-start gap-[1vw]"><span className="text-primary mt-[.5vh] opacity-50">□</span> Core platform replacement</li>
                <li className="text-[calc(1.7*var(--slide-vw))] flex items-start gap-[1vw]"><span className="text-primary mt-[.5vh] opacity-50">□</span> Enterprise-wide rollout</li>
                <li className="text-[calc(1.7*var(--slide-vw))] flex items-start gap-[1vw]"><span className="text-primary mt-[.5vh] opacity-50">□</span> Legacy policy redesign</li>
              </ul>
            </div>
          </div>
          
          <div className="flex pt-[3vh] gap-[4vw]">
            <div className="flex-1">
              <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] text-muted uppercase font-semibold">Accountable Sponsor</p>
              <p className="text-[calc(2.2*var(--slide-vw))] font-display mt-[1vh] text-primary">Chief Operating Officer</p>
            </div>
            <div className="flex-1">
              <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] text-muted uppercase font-semibold">Delivery Lead</p>
              <p className="text-[calc(2.2*var(--slide-vw))] font-display mt-[1vh] text-primary">VP, Automation Services</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
