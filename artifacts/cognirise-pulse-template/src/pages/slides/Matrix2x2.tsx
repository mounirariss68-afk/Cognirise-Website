import React from 'react';
const base = import.meta.env.BASE_URL;

export default function Matrix2x2() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold uppercase">Prioritisation / 2x2 Matrix</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      <div className="mt-[5vh]">
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] leading-[1]">Focus energy on <span className="text-accent">high-leverage initiatives.</span></h1>
      </div>
      
      <div className="relative mt-[6vh] w-[80vw] mx-auto h-[60vh]">
        {/* Axes */}
        <div className="absolute left-[5%] top-[50%] w-[90%] h-[.2vw] bg-primary -translate-y-1/2"></div>
        <div className="absolute left-[50%] top-[5%] w-[.2vw] h-[90%] bg-primary -translate-x-1/2"></div>
        
        {/* Arrows on axes */}
        <div className="absolute right-[5%] top-[50%] w-0 h-0 border-t-[.8vh] border-b-[.8vh] border-l-[1.2vh] border-y-transparent border-l-primary -translate-y-1/2"></div>
        <div className="absolute left-[50%] top-[5%] w-0 h-0 border-l-[.8vw] border-r-[.8vw] border-b-[1.2vw] border-x-transparent border-b-primary -translate-x-1/2"></div>

        {/* Axis Labels */}
        <div className="absolute left-[52%] top-0 text-[calc(1.5*var(--slide-vw))] font-semibold uppercase tracking-widest text-primary">High Strategic Value</div>
        <div className="absolute left-[52%] bottom-0 text-[calc(1.5*var(--slide-vw))] font-semibold uppercase tracking-widest text-muted">Low Strategic Value</div>
        
        <div className="absolute right-0 top-[52%] text-[calc(1.5*var(--slide-vw))] font-semibold uppercase tracking-widest text-primary text-right leading-[1.2]">
          <span className="block">High</span>
          <span className="block">Complexity</span>
        </div>
        <div className="absolute left-0 top-[52%] text-[calc(1.5*var(--slide-vw))] font-semibold uppercase tracking-widest text-muted leading-[1.2]">
          <span className="block">Low</span>
          <span className="block">Complexity</span>
        </div>

        {/* Quadrant Names */}
        <div className="absolute left-[15%] top-[10%] text-[calc(2.2*var(--slide-vw))] font-display font-bold text-accent/30 uppercase tracking-widest pointer-events-none">Quick Wins</div>
        <div className="absolute right-[15%] top-[10%] text-[calc(2.2*var(--slide-vw))] font-display font-bold text-primary/20 uppercase tracking-widest pointer-events-none">Strategic Bets</div>
        <div className="absolute left-[15%] bottom-[10%] text-[calc(2.2*var(--slide-vw))] font-display font-bold text-primary/10 uppercase tracking-widest pointer-events-none">Fill-ins</div>
        <div className="absolute right-[15%] bottom-[10%] text-[calc(2.2*var(--slide-vw))] font-display font-bold text-primary/20 uppercase tracking-widest pointer-events-none">Money Pits</div>

        {/* Plotted Initiatives */}
        {/* Quick Wins */}
        <div className="absolute flex items-center gap-[1vw] z-20" style={{ left: '20%', top: '25%', transform: 'translate(-50%, -50%)' }}>
          <div className="w-[1.8vw] h-[1.8vw] rounded-full border-[.3vw] shadow-md z-10 bg-accent border-white text-primary"></div>
          <div className="bg-white/90 backdrop-blur-sm px-[1vw] py-[.5vh] border border-primary/20 shadow-sm text-[calc(1.5*var(--slide-vw))] font-semibold whitespace-nowrap z-20 text-primary">Copilot rollout</div>
        </div>
        <div className="absolute flex items-center gap-[1vw] z-20" style={{ left: '35%', top: '35%', transform: 'translate(-50%, -50%)' }}>
          <div className="w-[1.8vw] h-[1.8vw] rounded-full border-[.3vw] shadow-md z-10 bg-accent border-white text-primary"></div>
          <div className="bg-white/90 backdrop-blur-sm px-[1vw] py-[.5vh] border border-primary/20 shadow-sm text-[calc(1.5*var(--slide-vw))] font-semibold whitespace-nowrap z-20 text-primary">Automated QA</div>
        </div>
        
        {/* Strategic */}
        <div className="absolute flex items-center gap-[1vw] z-20" style={{ left: '75%', top: '20%', transform: 'translate(-50%, -50%)' }}>
          <div className="w-[1.8vw] h-[1.8vw] rounded-full border-[.3vw] shadow-md z-10 bg-primary border-white text-primary"></div>
          <div className="bg-white/90 backdrop-blur-sm px-[1vw] py-[.5vh] border border-primary/20 shadow-sm text-[calc(1.5*var(--slide-vw))] font-semibold whitespace-nowrap z-20 text-primary">Core AI migration</div>
        </div>
        <div className="absolute flex items-center gap-[1vw] z-20" style={{ left: '60%', top: '40%', transform: 'translate(-50%, -50%)' }}>
          <div className="w-[1.8vw] h-[1.8vw] rounded-full border-[.3vw] shadow-md z-10 bg-primary border-white text-primary"></div>
          <div className="bg-white/90 backdrop-blur-sm px-[1vw] py-[.5vh] border border-primary/20 shadow-sm text-[calc(1.5*var(--slide-vw))] font-semibold whitespace-nowrap z-20 text-primary">LLM fine-tuning</div>
        </div>

        {/* Fill-ins */}
        <div className="absolute flex items-center gap-[1vw] z-20" style={{ left: '30%', top: '75%', transform: 'translate(-50%, -50%)' }}>
          <div className="w-[1.8vw] h-[1.8vw] rounded-full border-[.3vw] shadow-md z-10 bg-white border-primary text-primary"></div>
          <div className="bg-white/90 backdrop-blur-sm px-[1vw] py-[.5vh] border border-primary/20 shadow-sm text-[calc(1.5*var(--slide-vw))] font-semibold whitespace-nowrap z-20 text-primary">Minor UI tweaks</div>
        </div>

        {/* Money Pits */}
        <div className="absolute flex items-center gap-[1vw] z-20" style={{ left: '75%', top: '80%', transform: 'translate(-50%, -50%)' }}>
          <div className="w-[1.8vw] h-[1.8vw] rounded-full border-[.3vw] shadow-md z-10 bg-[#f3e4ed] border-accent text-accent"></div>
          <div className="bg-white/90 backdrop-blur-sm px-[1vw] py-[.5vh] border border-primary/20 shadow-sm text-[calc(1.5*var(--slide-vw))] font-semibold whitespace-nowrap z-20 text-primary">Blockchain sync</div>
        </div>

      </div>
    </div>
  );
}
