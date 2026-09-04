import React from 'react';
const base = import.meta.env.BASE_URL;

export default function CurrentToTarget() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-muted uppercase">Current vs Target State / 42</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      
      <h1 className="font-display text-[calc(4*var(--slide-vw))] tracking-[-.05em] leading-[1.05] mt-[3vh] w-[90vw]">
        From disjointed manual effort to <span className="text-accent">orchestrated intelligence.</span>
      </h1>

      <div className="mt-[4vh] flex h-[62vh]">
        {/* Current State */}
        <div className="w-[42vw] bg-[#eef2f8] p-[3vw] flex flex-col justify-between border-t-[.5vw] border-muted">
          <div>
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-muted mb-[3vh]">CURRENT STATE</p>
            <div className="space-y-[2vh]">
              <div>
                <p className="text-[calc(1.8*var(--slide-vw))] font-semibold text-primary">Human routing</p>
                <p className="text-[calc(1.6*var(--slide-vw))] text-muted mt-[.5vh]">Triage teams spend hours reading documents to determine the correct queue.</p>
              </div>
              <div>
                <p className="text-[calc(1.8*var(--slide-vw))] font-semibold text-primary">Siloed data gathering</p>
                <p className="text-[calc(1.6*var(--slide-vw))] text-muted mt-[.5vh]">Analysts swivel-chair across 4 systems to build a complete case file.</p>
              </div>
              <div>
                <p className="text-[calc(1.8*var(--slide-vw))] font-semibold text-primary">Post-facto audit</p>
                <p className="text-[calc(1.6*var(--slide-vw))] text-muted mt-[.5vh]">Compliance reviews 5% of decisions weeks after execution.</p>
              </div>
            </div>
          </div>
          <p className="text-[calc(2.5*var(--slide-vw))] font-display text-muted">Days per decision.</p>
        </div>

        {/* Transition Arrow Space */}
        <div className="w-[6vw] flex items-center justify-center relative">
          <div className="absolute w-[4vw] h-[.2vw] bg-accent z-0"></div>
          <div className="w-[3vw] h-[3vw] bg-bg rounded-full border-[.2vw] border-accent flex items-center justify-center z-10 text-accent font-bold text-[calc(1.5*var(--slide-vw))]">→</div>
        </div>

        {/* Target State */}
        <div className="w-[42vw] bg-primary p-[3vw] flex flex-col justify-between border-t-[.5vw] border-accent text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-[10vw] -bottom-[10vw] w-[30vw] h-[30vw] bg-[#db509e] opacity-10 rounded-full blur-[4vw]"></div>
          <div className="relative z-10">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.15em] font-bold text-accent mb-[3vh]">TARGET STATE</p>
            <div className="space-y-[2vh]">
              <div>
                <p className="text-[calc(1.8*var(--slide-vw))] font-semibold text-white">Algorithmic intent parsing</p>
                <p className="text-[calc(1.6*var(--slide-vw))] text-[#dce4f0] mt-[.5vh]">Agents instantly classify inbound requests and trigger appropriate workflows.</p>
              </div>
              <div>
                <p className="text-[calc(1.8*var(--slide-vw))] font-semibold text-white">Pre-computed context</p>
                <p className="text-[calc(1.6*var(--slide-vw))] text-[#dce4f0] mt-[.5vh]">Decision makers receive a synthesized brief with all dependencies attached.</p>
              </div>
              <div>
                <p className="text-[calc(1.8*var(--slide-vw))] font-semibold text-white">Inline invisible governance</p>
                <p className="text-[calc(1.6*var(--slide-vw))] text-[#dce4f0] mt-[.5vh]">Policy checks happen concurrently during assembly. 100% systemic audit.</p>
              </div>
            </div>
          </div>
          <p className="text-[calc(2.5*var(--slide-vw))] font-display text-white relative z-10">Minutes per decision.</p>
        </div>
      </div>
    </div>
  );
}
