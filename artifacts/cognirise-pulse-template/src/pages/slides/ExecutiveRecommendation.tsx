import React from 'react';
const base = import.meta.env.BASE_URL;

export default function ExecutiveRecommendation() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-primary text-white font-body px-[5vw] py-[5vh]">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_100%_0%,#db509e_0%,transparent_50%)]"></div>
      
      <div className="flex justify-between items-center relative z-10">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-[#dce4f0] uppercase">Executive Recommendation / 41</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw] brightness-0 invert" />
      </div>
      
      <h1 className="font-display text-[calc(5*var(--slide-vw))] tracking-[-.05em] leading-[1.1] mt-[4vh] w-[85vw] relative z-10">
        Bypass incremental upgrades. 
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#db509e] to-[#ff775d] block mt-[0.5vh]">Fund the autonomous tier directly.</span>
      </h1>

      <div className="mt-[6vh] grid grid-cols-[1fr_1.5fr] gap-[6vw] relative z-10">
        <div>
          <p className="text-[calc(2*var(--slide-vw))] leading-[1.4] text-[#dce4f0]">
            The current system cannot scale linearly. Adding headcount or marginally faster legacy software will not alter the fundamental cost curve of decision-making.
          </p>
          <div className="mt-[2vh] p-[1.5vw] border-l-[.3vw] border-[#db509e] bg-white/5">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-semibold text-[#db509e] mb-[1vh]">THE ASK</p>
            <p className="font-display text-[calc(2.2*var(--slide-vw))] leading-[1.2]">
              Approve $1.2M seed capital for Q1 architecture and pilot launch.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col gap-[2vh]">
          <div className="border-t-[.1vw] border-white/20 pt-[1.5vh] flex gap-[3vw]">
            <p className="font-display text-[calc(3*var(--slide-vw))] text-[#7659df] w-[5vw]">01</p>
            <div>
              <p className="text-[calc(2*var(--slide-vw))] font-semibold">Target highest-friction paths first.</p>
              <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] text-[#dce4f0]">Avoid broad transformations. Focus the AI engine entirely on the 20% of workflows that generate 80% of delay.</p>
            </div>
          </div>
          <div className="border-t-[.1vw] border-white/20 pt-[1.5vh] flex gap-[3vw]">
            <p className="font-display text-[calc(3*var(--slide-vw))] text-[#db509e] w-[5vw]">02</p>
            <div>
              <p className="text-[calc(2*var(--slide-vw))] font-semibold">Enforce hard API boundaries.</p>
              <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] text-[#dce4f0]">Do not build bespoke integrations. Expose core systems through governed APIs that any agent can securely consume.</p>
            </div>
          </div>
          <div className="border-t-[.1vw] border-white/20 pt-[1.5vh] flex gap-[3vw]">
            <p className="font-display text-[calc(3*var(--slide-vw))] text-[#ff775d] w-[5vw]">03</p>
            <div>
              <p className="text-[calc(2*var(--slide-vw))] font-semibold">Govern algorithms, not humans.</p>
              <p className="text-[calc(1.6*var(--slide-vw))] mt-[1vh] text-[#dce4f0]">Shift risk management from sampling human errors to mathematically verifying agent decision parameters.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
