import React from 'react';
const base = import.meta.env.BASE_URL;

export default function ForceFieldAnalysis() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold uppercase">Change Dynamics / Force Field Analysis</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      <div className="mt-[5vh]">
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] leading-[1]">Understand the balance of <span className="text-accent">competing forces.</span></h1>
      </div>
      
      <div className="flex items-center justify-between mt-[10vh] h-[50vh]">
        
        {/* Driving Forces (Left) */}
        <div className="w-[30vw] flex flex-col gap-[3vh]">
          <h2 className="font-display text-[calc(2.2*var(--slide-vw))] text-primary text-right font-bold border-b-[.2vw] border-primary pb-[1vh]">Driving Forces</h2>
          
          <div className="flex items-center justify-end gap-[1.5vw]">
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-right text-primary font-medium">Competitor AI adoption</p>
            <div className="relative flex items-center justify-end w-[12.5vw]">
              <div className="h-[2vh] w-full bg-primary"></div>
              <div className="absolute right-[-1vw] w-0 h-0 border-t-[1.5vh] border-b-[1.5vh] border-l-[1vw] border-y-transparent border-l-primary"></div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-[1.5vw]">
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-right text-primary font-medium">Margin pressure constraints</p>
            <div className="relative flex items-center justify-end w-[10vw]">
              <div className="h-[2vh] w-full bg-primary"></div>
              <div className="absolute right-[-1vw] w-0 h-0 border-t-[1.5vh] border-b-[1.5vh] border-l-[1vw] border-y-transparent border-l-primary"></div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-[1.5vw]">
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-right text-primary font-medium">Customer speed demands</p>
            <div className="relative flex items-center justify-end w-[10vw]">
              <div className="h-[2vh] w-full bg-primary"></div>
              <div className="absolute right-[-1vw] w-0 h-0 border-t-[1.5vh] border-b-[1.5vh] border-l-[1vw] border-y-transparent border-l-primary"></div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-[1.5vw]">
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-right text-primary font-medium">Foundation model access</p>
            <div className="relative flex items-center justify-end w-[7.5vw]">
              <div className="h-[2vh] w-full bg-primary"></div>
              <div className="absolute right-[-1vw] w-0 h-0 border-t-[1.5vh] border-b-[1.5vh] border-l-[1vw] border-y-transparent border-l-primary"></div>
            </div>
          </div>
        </div>

        {/* The Change (Center) */}
        <div className="w-[22vw] h-[38vh] bg-primary text-white p-[2.5vw] flex flex-col justify-center text-center shadow-lg border-t-[.5vw] border-accent z-10">
          <span className="text-[calc(1.5*var(--slide-vw))] tracking-widest text-accent font-bold mb-[2vh]">PROPOSED CHANGE</span>
          <h3 className="font-display text-[calc(2.2*var(--slide-vw))] font-bold leading-[1.2]">Migrate core underwriting to AI-assisted workflows</h3>
        </div>

        {/* Restraining Forces (Right) */}
        <div className="w-[30vw] flex flex-col gap-[3vh]">
          <h2 className="font-display text-[calc(2.2*var(--slide-vw))] text-accent font-bold border-b-[.2vw] border-accent pb-[1vh]">Restraining Forces</h2>
          
          <div className="flex items-center gap-[1.5vw] flex-row-reverse">
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-left text-primary font-medium flex-1">Data privacy concerns</p>
            <div className="relative flex items-center justify-start w-[12.5vw]">
              <div className="h-[2vh] w-full bg-[#f3e4ed]"></div>
              <div className="absolute left-[-1vw] w-0 h-0 border-t-[1.5vh] border-b-[1.5vh] border-r-[1vw] border-y-transparent border-r-[#f3e4ed]"></div>
            </div>
          </div>

          <div className="flex items-center gap-[1.5vw] flex-row-reverse">
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-left text-primary font-medium flex-1">Legacy integration debt</p>
            <div className="relative flex items-center justify-start w-[10vw]">
              <div className="h-[2vh] w-full bg-[#f3e4ed]"></div>
              <div className="absolute left-[-1vw] w-0 h-0 border-t-[1.5vh] border-b-[1.5vh] border-r-[1vw] border-y-transparent border-r-[#f3e4ed]"></div>
            </div>
          </div>

          <div className="flex items-center gap-[1.5vw] flex-row-reverse">
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-left text-primary font-medium flex-1">Fear of job displacement</p>
            <div className="relative flex items-center justify-start w-[7.5vw]">
              <div className="h-[2vh] w-full bg-[#f3e4ed]"></div>
              <div className="absolute left-[-1vw] w-0 h-0 border-t-[1.5vh] border-b-[1.5vh] border-r-[1vw] border-y-transparent border-r-[#f3e4ed]"></div>
            </div>
          </div>

          <div className="flex items-center gap-[1.5vw] flex-row-reverse">
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-left text-primary font-medium flex-1">Lack of AI engineers</p>
            <div className="relative flex items-center justify-start w-[10vw]">
              <div className="h-[2vh] w-full bg-[#f3e4ed]"></div>
              <div className="absolute left-[-1vw] w-0 h-0 border-t-[1.5vh] border-b-[1.5vh] border-r-[1vw] border-y-transparent border-r-[#f3e4ed]"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
