import React from 'react';
const base = import.meta.env.BASE_URL;

export default function GovernanceRaci() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold text-muted uppercase">Governance RACI / 49</p>
        <img src={`${base}images/logo-blue.svg`} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      
      <h1 className="font-display text-[calc(4*var(--slide-vw))] tracking-[-.05em] leading-[1.1] mt-[3vh] w-[80vw]">
        Clear ownership is the only defense against <span className="text-accent">drift.</span>
      </h1>

      <div className="mt-[3vh] border-[.15vw] border-primary h-[65vh] flex flex-col">
        {/* Headers */}
        <div className="flex bg-primary text-white text-[calc(1.5*var(--slide-vw))] tracking-[.1em] font-bold uppercase">
          <div className="w-[30vw] py-[1vh] px-[1vw] border-r border-white/20">Decision Node</div>
          <div className="w-[17.5vw] py-[1vh] px-[1vw] border-r border-white/20 text-center">Executive Sponsor</div>
          <div className="w-[17.5vw] py-[1vh] px-[1vw] border-r border-white/20 text-center text-accent">Product Owner</div>
          <div className="w-[17.5vw] py-[1vh] px-[1vw] border-r border-white/20 text-center">Risk & Legal</div>
          <div className="w-[17.5vw] py-[1vh] px-[1vw] text-center">Engineering Lead</div>
        </div>
        
        {/* Rows - Static Inline JSX */}
        <div className="flex-1 flex flex-col">
          {/* Row 1 */}
          <div className="flex flex-1 border-b-[.1vw] border-muted/20 bg-white items-center text-[calc(1.6*var(--slide-vw))]">
            <div className="w-[30vw] py-[1.5vh] px-[2vw] font-semibold text-primary">Define business logic & ontology</div>
            <div className="w-[17.5vw] flex justify-center text-primary font-bold">
              <span className="bg-[#eef2f8] px-[1vw] py-[.5vh] rounded-full text-[calc(1.5*var(--slide-vw))]">Accountable</span>
            </div>
            <div className="w-[17.5vw] flex justify-center text-accent font-bold">
              <span className="border border-accent px-[1vw] py-[.5vh] rounded-full text-[calc(1.5*var(--slide-vw))]">Responsible</span>
            </div>
            <div className="w-[17.5vw] flex justify-center text-[#7659df] font-bold">
              Consulted
            </div>
            <div className="w-[17.5vw] flex justify-center text-primary font-bold">
              <span className="text-muted">Informed</span>
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex flex-1 border-b-[.1vw] border-muted/20 bg-white items-center text-[calc(1.6*var(--slide-vw))]">
            <div className="w-[30vw] py-[1.5vh] px-[2vw] font-semibold text-primary">Approve production deployment</div>
            <div className="w-[17.5vw] flex justify-center text-primary font-bold">
              <span className="bg-[#eef2f8] px-[1vw] py-[.5vh] rounded-full text-[calc(1.5*var(--slide-vw))]">Accountable</span>
            </div>
            <div className="w-[17.5vw] flex justify-center text-accent font-bold">
              <span className="text-muted">Informed</span>
            </div>
            <div className="w-[17.5vw] flex justify-center text-[#7659df] font-bold">
              <span className="border border-[#7659df] px-[1vw] py-[.5vh] rounded-full text-[calc(1.5*var(--slide-vw))]">Responsible</span>
            </div>
            <div className="w-[17.5vw] flex justify-center text-primary font-bold">
              Consulted
            </div>
          </div>

          {/* Row 3 */}
          <div className="flex flex-1 border-b-[.1vw] border-muted/20 bg-white items-center text-[calc(1.6*var(--slide-vw))]">
            <div className="w-[30vw] py-[1.5vh] px-[2vw] font-semibold text-primary">Determine architectural patterns</div>
            <div className="w-[17.5vw] flex justify-center text-primary font-bold">
              <span className="text-muted">Informed</span>
            </div>
            <div className="w-[17.5vw] flex justify-center text-accent font-bold">
              Consulted
            </div>
            <div className="w-[17.5vw] flex justify-center text-[#7659df] font-bold">
              <span className="text-muted">Informed</span>
            </div>
            <div className="w-[17.5vw] flex justify-center text-primary font-bold">
              <span className="border border-primary px-[1vw] py-[.5vh] rounded-full text-[calc(1.5*var(--slide-vw))]">Responsible</span>
            </div>
          </div>

          {/* Row 4 */}
          <div className="flex flex-1 bg-white items-center text-[calc(1.6*var(--slide-vw))]">
            <div className="w-[30vw] py-[1.5vh] px-[2vw] font-semibold text-primary">Monitor model accuracy & drift</div>
            <div className="w-[17.5vw] flex justify-center text-primary font-bold">
              <span className="text-muted">Informed</span>
            </div>
            <div className="w-[17.5vw] flex justify-center text-accent font-bold">
              <span className="border border-accent px-[1vw] py-[.5vh] rounded-full text-[calc(1.5*var(--slide-vw))]">Responsible</span>
            </div>
            <div className="w-[17.5vw] flex justify-center text-[#7659df] font-bold">
              Consulted
            </div>
            <div className="w-[17.5vw] flex justify-center text-primary font-bold">
              <span className="bg-[#eef2f8] px-[1vw] py-[.5vh] rounded-full text-[calc(1.5*var(--slide-vw))]">Accountable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
