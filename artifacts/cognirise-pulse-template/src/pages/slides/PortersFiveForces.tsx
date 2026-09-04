import React from 'react';
const base = import.meta.env.BASE_URL;

export default function PortersFiveForces() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[4vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold uppercase">Competitive Dynamics / Porter's Five Forces</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      <div className="mt-[3vh]">
        <h1 className="font-display text-[calc(4.2*var(--slide-vw))] tracking-[-.06em] leading-[1.05] w-[85vw]">
          Structural margins reflect <span className="text-accent">power, not just product.</span>
        </h1>
      </div>
      
      <div className="relative mt-[4vh] mx-auto w-[85vw] h-[52vh] grid grid-cols-[1fr_1.2fr_1fr] grid-rows-[1fr_1.2fr_1fr] gap-[1.5vw]">
        {/* Cross lines in background */}
        <div className="absolute top-[50%] left-[15%] right-[15%] h-[.2vw] bg-primary/20 -translate-y-1/2 z-0"></div>
        <div className="absolute left-[50%] top-[15%] bottom-[15%] w-[.2vw] bg-primary/20 -translate-x-1/2 z-0"></div>

        {/* Top: New Entrants */}
        <div className="col-start-2 row-start-1 bg-white border-t-[.4vw] border-primary py-[1.5vh] px-[1.5vw] shadow-sm z-10 flex flex-col justify-center items-center text-center">
          <h2 className="font-display text-[calc(1.7*var(--slide-vw))] text-primary font-bold leading-[1.1]">Threat of New Entrants</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[.5vh] text-accent font-semibold uppercase tracking-wider">Moderate</p>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-muted">High capital need</p>
        </div>

        {/* Left: Suppliers */}
        <div className="col-start-1 row-start-2 bg-white border-t-[.4vw] border-primary py-[1.5vh] px-[1.5vw] shadow-sm z-10 flex flex-col justify-center items-center text-center">
          <h2 className="font-display text-[calc(1.7*var(--slide-vw))] text-primary font-bold leading-[1.1]">Power of Suppliers</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[.5vh] text-accent font-semibold uppercase tracking-wider">High</p>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-muted">Concentrated compute</p>
        </div>

        {/* Center: Rivalry */}
        <div className="col-start-2 row-start-2 bg-primary text-white border-t-[.4vw] border-accent py-[1.5vh] px-[1.5vw] shadow-md z-10 flex flex-col justify-center items-center text-center">
          <h2 className="font-display text-[calc(2*var(--slide-vw))] font-bold leading-[1.1]">Industry Rivalry</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-accent font-semibold uppercase tracking-wider">High</p>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-white/80">Intense price wars</p>
        </div>

        {/* Right: Buyers */}
        <div className="col-start-3 row-start-2 bg-white border-t-[.4vw] border-primary py-[1.5vh] px-[1.5vw] shadow-sm z-10 flex flex-col justify-center items-center text-center">
          <h2 className="font-display text-[calc(1.7*var(--slide-vw))] text-primary font-bold leading-[1.1]">Power of Buyers</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[.5vh] text-primary font-semibold uppercase tracking-wider">Moderate</p>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-muted">Seeking proven ROI</p>
        </div>

        {/* Bottom: Substitutes */}
        <div className="col-start-2 row-start-3 bg-white border-t-[.4vw] border-primary py-[1.5vh] px-[1.5vw] shadow-sm z-10 flex flex-col justify-center items-center text-center">
          <h2 className="font-display text-[calc(1.7*var(--slide-vw))] text-primary font-bold leading-[1.1]">Threat of Substitutes</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[.5vh] text-primary font-semibold uppercase tracking-wider">Low</p>
          <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-muted">High switching costs</p>
        </div>
      </div>
    </div>
  );
}
