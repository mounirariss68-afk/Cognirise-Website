import React from 'react';
const base = import.meta.env.BASE_URL;

export default function StakeholderImpact() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-muted uppercase">Stakeholder Impact / 48</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      
      <h1 className="font-display text-[calc(4*var(--slide-vw))] tracking-[-.05em] leading-[1.1] mt-[3vh] w-[80vw]">
        Change is experienced differently <span className="text-accent">at every level.</span>
      </h1>

      <div className="mt-[4vh] flex flex-col gap-[1.5vh] h-[62vh]">
        {/* Executive */}
        <div className="flex items-center gap-[3vw] bg-primary text-white p-[2vw] w-full">
          <div className="w-[15vw]">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-accent">EXECUTIVE</p>
            <p className="font-display text-[calc(2.2*var(--slide-vw))] mt-[1vh]">Sponsors</p>
          </div>
          <div className="w-[.2vw] h-[6vh] bg-white/20"></div>
          <div className="flex-1">
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">From intuition to real-time telemetry.</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-[#dce4f0] mt-[1vh]">Visibility shifts from monthly lagging reports to live dashboards tracking automated throughput and exception rates.</p>
          </div>
        </div>

        {/* Management */}
        <div className="flex items-center gap-[3vw] bg-white border-[.1vw] border-muted/30 p-[2vw] w-[90%] ml-auto">
          <div className="w-[15vw]">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-[#7659df]">MANAGEMENT</p>
            <p className="font-display text-[calc(2.2*var(--slide-vw))] mt-[1vh] text-primary">Process Owners</p>
          </div>
          <div className="w-[.2vw] h-[6vh] bg-muted/20"></div>
          <div className="flex-1">
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold text-primary">From managing backlog to optimizing logic.</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh]">Leaders stop moving people to cover spikes, and start adjusting agent thresholds and guardrails to improve flow.</p>
          </div>
        </div>

        {/* Operations */}
        <div className="flex items-center gap-[3vw] bg-[#eef2f8] border-l-[.4vw] border-[#ff775d] p-[2vw] w-[80%] ml-auto">
          <div className="w-[15vw]">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-[#ff775d]">OPERATIONS</p>
            <p className="font-display text-[calc(2.2*var(--slide-vw))] mt-[1vh] text-primary">Frontline Staff</p>
          </div>
          <div className="w-[.2vw] h-[6vh] bg-muted/30"></div>
          <div className="flex-1">
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold text-primary">From rote execution to complex resolution.</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh]">Repetitive triage is automated entirely. Humans only engage when the system encounters true ambiguity or edge cases.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
