import React from 'react';
const base = import.meta.env.BASE_URL;

export default function PestleAnalysis() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold uppercase">Macro Environment / PESTLE Analysis</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      <div className="mt-[5vh]">
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] leading-[1]">External shifts define <span className="text-accent">the available space.</span></h1>
      </div>
      
      <div className="grid grid-cols-6 mt-[6vh] h-[55vh] border-y-[.2vw] border-primary divide-x-[.15vw] divide-primary/30">
        <div className="p-[1vw] flex flex-col bg-white border-t-[.4vw] border-primary">
          <div className="text-[calc(2.5*var(--slide-vw))] font-display font-bold leading-[1] text-primary/20">P</div>
          <h2 className="font-display text-[calc(1.6*var(--slide-vw))] mt-[1vh] font-semibold text-primary">Political</h2>
          <ul className="mt-[2vh] space-y-[1.5vh]">
            <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary"><span className="inline-block w-[1vw] text-accent">•</span> Data sovereignty rules</li>
            <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary"><span className="inline-block w-[1vw] text-accent">•</span> AI infrastructure splits</li>
          </ul>
        </div>
        
        <div className="p-[1vw] flex flex-col bg-primary/[0.03] border-t-[.4vw] border-primary">
          <div className="text-[calc(2.5*var(--slide-vw))] font-display font-bold leading-[1] text-primary/20">E</div>
          <h2 className="font-display text-[calc(1.6*var(--slide-vw))] mt-[1vh] font-semibold text-primary">Economic</h2>
          <ul className="mt-[2vh] space-y-[1.5vh]">
            <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary"><span className="inline-block w-[1vw] text-accent">•</span> Margin pressure limits</li>
            <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary"><span className="inline-block w-[1vw] text-accent">•</span> Labor market shifts</li>
          </ul>
        </div>

        <div className="p-[1vw] flex flex-col bg-white border-t-[.4vw] border-primary">
          <div className="text-[calc(2.5*var(--slide-vw))] font-display font-bold leading-[1] text-primary/20">S</div>
          <h2 className="font-display text-[calc(1.6*var(--slide-vw))] mt-[1vh] font-semibold text-primary">Social</h2>
          <ul className="mt-[2vh] space-y-[1.5vh]">
            <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary"><span className="inline-block w-[1vw] text-accent">•</span> Trust deficit in media</li>
            <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary"><span className="inline-block w-[1vw] text-accent">•</span> Consumer-grade UX needs</li>
          </ul>
        </div>

        <div className="p-[1vw] flex flex-col bg-primary/[0.03] border-t-[.4vw] border-primary">
          <div className="text-[calc(2.5*var(--slide-vw))] font-display font-bold leading-[1] text-primary/20">T</div>
          <h2 className="font-display text-[calc(1.6*var(--slide-vw))] mt-[1vh] font-semibold text-primary">Technology</h2>
          <ul className="mt-[2vh] space-y-[1.5vh]">
            <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary"><span className="inline-block w-[1vw] text-accent">•</span> Base LLM commodity</li>
            <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary"><span className="inline-block w-[1vw] text-accent">•</span> Agent orchestration</li>
          </ul>
        </div>

        <div className="p-[1vw] flex flex-col bg-white border-t-[.4vw] border-primary">
          <div className="text-[calc(2.5*var(--slide-vw))] font-display font-bold leading-[1] text-primary/20">L</div>
          <h2 className="font-display text-[calc(1.6*var(--slide-vw))] mt-[1vh] font-semibold text-primary">Legal</h2>
          <ul className="mt-[2vh] space-y-[1.5vh]">
            <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary"><span className="inline-block w-[1vw] text-accent">•</span> EU AI Act compliance</li>
            <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-primary"><span className="inline-block w-[1vw] text-accent">•</span> Copyright litigation</li>
          </ul>
        </div>

        <div className="p-[1vw] flex flex-col bg-primary border-t-[.4vw] border-accent text-white">
          <div className="text-[calc(2.5*var(--slide-vw))] font-display font-bold leading-[1] text-accent">E</div>
          <h2 className="font-display text-[calc(1.6*var(--slide-vw))] mt-[1vh] font-semibold text-white">Environment</h2>
          <ul className="mt-[2vh] space-y-[1.5vh]">
            <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-white/90"><span className="inline-block w-[1vw] text-accent">•</span> Carbon footprint scrutiny</li>
            <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-white/90"><span className="inline-block w-[1vw] text-accent">•</span> Water usage limits</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
