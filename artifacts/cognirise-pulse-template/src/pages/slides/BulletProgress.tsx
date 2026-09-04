import React from 'react';
const base=import.meta.env.BASE_URL;
export default function BulletProgress(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh] flex flex-col">
      <header className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">TARGETS / 36</p>
        <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]"/>
      </header>
      
      <div className="mt-[4vh] flex justify-between items-end">
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] w-[60vw] leading-[1.05]">
          Pacing ahead of <span className="text-accent">operational targets.</span>
        </h1>
        <p className="text-[calc(1.8*var(--slide-vw))] text-muted w-[30vw] leading-[1.4] pb-[1vh]">
          Current deployment velocity has surpassed Q2 commitments across all three major workstreams.
        </p>
      </div>
      
      <div className="flex-1 mt-[6vh] flex flex-col justify-center gap-[4vh] mb-[4vh]">
        {/* Bullet 1 */}
        <div>
          <div className="flex justify-between items-end mb-[1vh]">
            <div>
              <p className="text-[calc(2*var(--slide-vw))] font-semibold text-primary">Knowledge Grounding</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted">Documents vectorized and indexed in the semantic layer.</p>
            </div>
            <p className="text-[calc(2*var(--slide-vw))] font-display font-bold">125k <span className="text-[calc(1.5*var(--slide-vw))] text-muted font-body font-normal">/ 100k target</span></p>
          </div>
          <div className="h-[5vh] w-full bg-[#dde2eb] relative flex items-center">
            {/* Background ranges (poor, satisfactory, good) */}
            <div className="absolute left-0 h-full w-[60%] bg-[#cbd3e1] opacity-40"></div>
            <div className="absolute left-[60%] h-full w-[25%] bg-[#cbd3e1] opacity-20"></div>
            
            {/* Target Line */}
            <div className="absolute left-[80%] h-[7vh] w-[0.4vw] bg-primary z-20 top-[-1vh]"></div>
            
            {/* Actual Progress */}
            <div className="absolute left-0 h-[2.5vh] w-[95%] bg-primary z-10 ml-[0.5vw]"></div>
          </div>
        </div>
        
        {/* Bullet 2 */}
        <div>
          <div className="flex justify-between items-end mb-[1vh]">
            <div>
              <p className="text-[calc(2*var(--slide-vw))] font-semibold text-primary">Agent Workflows</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted">Production-grade workflows deployed to active users.</p>
            </div>
            <p className="text-[calc(2*var(--slide-vw))] font-display font-bold">42 <span className="text-[calc(1.5*var(--slide-vw))] text-muted font-body font-normal">/ 50 target</span></p>
          </div>
          <div className="h-[5vh] w-full bg-[#dde2eb] relative flex items-center">
            <div className="absolute left-0 h-full w-[50%] bg-[#cbd3e1] opacity-40"></div>
            <div className="absolute left-[50%] h-full w-[30%] bg-[#cbd3e1] opacity-20"></div>
            
            {/* Target Line */}
            <div className="absolute left-[80%] h-[7vh] w-[0.4vw] bg-primary z-20 top-[-1vh]"></div>
            
            {/* Actual Progress */}
            <div className="absolute left-0 h-[2.5vh] w-[67%] bg-accent z-10 ml-[0.5vw]"></div>
          </div>
        </div>
        
        {/* Bullet 3 */}
        <div>
          <div className="flex justify-between items-end mb-[1vh]">
            <div>
              <p className="text-[calc(2*var(--slide-vw))] font-semibold text-primary">Active Users</p>
              <p className="text-[calc(1.5*var(--slide-vw))] text-muted">Employees utilizing the platform daily.</p>
            </div>
            <p className="text-[calc(2*var(--slide-vw))] font-display font-bold">8,450 <span className="text-[calc(1.5*var(--slide-vw))] text-muted font-body font-normal">/ 5,000 target</span></p>
          </div>
          <div className="h-[5vh] w-full bg-[#dde2eb] relative flex items-center">
            <div className="absolute left-0 h-full w-[40%] bg-[#cbd3e1] opacity-40"></div>
            <div className="absolute left-[40%] h-full w-[20%] bg-[#cbd3e1] opacity-20"></div>
            
            {/* Target Line */}
            <div className="absolute left-[60%] h-[7vh] w-[0.4vw] bg-primary z-20 top-[-1vh]"></div>
            
            {/* Actual Progress */}
            <div className="absolute left-0 h-[2.5vh] w-[100%] bg-primary z-10 ml-[0.5vw]"></div>
          </div>
        </div>
        
      </div>
    </div>
  )
}