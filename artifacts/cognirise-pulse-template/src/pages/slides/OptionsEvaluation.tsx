import React from 'react';
const base = import.meta.env.BASE_URL;

export default function OptionsEvaluation() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-muted uppercase">Options Evaluation / 45</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      
      <h1 className="font-display text-[calc(4*var(--slide-vw))] tracking-[-.05em] leading-[1.1] mt-[3vh] w-[90vw]">
        Option 2 is the only path that scales <span className="text-accent">without technical debt.</span>
      </h1>

      <div className="mt-[4vh] flex gap-[2vw]">
        {/* Option 1 */}
        <div className="w-[28vw] border-[.15vw] border-muted p-[2vw] flex flex-col opacity-60 mt-[1vh]">
          <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] font-semibold text-muted">OPTION 1</p>
          <p className="font-display text-[calc(2.2*var(--slide-vw))] text-primary mt-[1vh] leading-[1.2]">Point Solutions</p>
          <p className="text-[calc(1.6*var(--slide-vw))] text-muted mt-[1.5vh] leading-[1.4]">Procure off-the-shelf AI wrappers for individual department pain points.</p>
          <div className="mt-[2vh]">
            <p className="text-[calc(1.5*var(--slide-vw))] font-semibold text-[#c83232]">Drawbacks</p>
            <ul className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh] space-y-[.5vh]">
              <li>- Fragments data governance</li>
              <li>- Vendor lock-in risk</li>
              <li>- No compound learning across org</li>
            </ul>
          </div>
        </div>

        {/* Option 2 (Recommended) */}
        <div className="w-[32vw] bg-primary text-white px-[2vw] py-[2.5vw] flex flex-col relative shadow-2xl z-10 border-t-[.5vw] border-accent mt-[-1vh]">
          <div className="absolute top-[2vh] right-[2vw] bg-accent text-white text-[calc(1.5*var(--slide-vw))] tracking-[.1em] px-[1vw] py-[.5vh] font-bold rounded-sm">RECOMMENDED</div>
          <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] font-semibold text-[#dce4f0]">OPTION 2</p>
          <p className="font-display text-[calc(2.5*var(--slide-vw))] mt-[1vh] leading-[1.2]">Platform Native Architecture</p>
          <p className="text-[calc(1.7*var(--slide-vw))] text-[#dce4f0] mt-[1.5vh] leading-[1.4]">Build a central AI orchestration layer that routes secure context to any application.</p>
          <div className="mt-[2vh]">
            <p className="text-[calc(1.5*var(--slide-vw))] font-semibold text-accent">Strategic Advantages</p>
            <ul className="text-[calc(1.6*var(--slide-vw))] text-white mt-[1vh] space-y-[1vh]">
              <li className="flex gap-[1vw]"><span className="text-accent">✓</span> Centralized governance & security</li>
              <li className="flex gap-[1vw]"><span className="text-accent">✓</span> Model-agnostic flexibility</li>
              <li className="flex gap-[1vw]"><span className="text-accent">✓</span> Write once, deploy everywhere</li>
            </ul>
          </div>
        </div>

        {/* Option 3 */}
        <div className="w-[28vw] border-[.15vw] border-muted p-[2vw] flex flex-col opacity-60 mt-[1vh]">
          <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] font-semibold text-muted">OPTION 3</p>
          <p className="font-display text-[calc(2.2*var(--slide-vw))] text-primary mt-[1vh] leading-[1.2]">Custom LLM Build</p>
          <p className="text-[calc(1.6*var(--slide-vw))] text-muted mt-[1.5vh] leading-[1.4]">Train proprietary foundation models from scratch on internal infrastructure.</p>
          <div className="mt-[2vh]">
            <p className="text-[calc(1.5*var(--slide-vw))] font-semibold text-[#c83232]">Drawbacks</p>
            <ul className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[1vh] space-y-[.5vh]">
              <li>- Prohibitive capital expense</li>
              <li>- Massive talent requirement</li>
              <li>- Outpaced by open-source updates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
