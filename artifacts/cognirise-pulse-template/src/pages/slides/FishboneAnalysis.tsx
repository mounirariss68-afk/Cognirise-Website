import React from 'react';
const base = import.meta.env.BASE_URL;

export default function FishboneAnalysis() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold uppercase">Root Cause / Fishbone Analysis</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      <div className="mt-[5vh]">
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] leading-[1]">Trace the effect back to <span className="text-accent">structural causes.</span></h1>
      </div>
      
      <div className="relative mt-[8vh] w-[90vw] h-[60vh]">
        {/* Main Spine */}
        <div className="absolute left-[5%] top-[50%] w-[70%] h-[.4vw] bg-primary -translate-y-1/2"></div>
        <div className="absolute left-[75%] top-[50%] w-0 h-0 border-t-[1vh] border-b-[1vh] border-l-[1.5vh] border-y-transparent border-l-primary -translate-y-1/2 -translate-x-[.2vw]"></div>
        
        {/* Effect Head */}
        <div className="absolute left-[77%] top-[50%] -translate-y-1/2 w-[23%] bg-accent text-white p-[2vw] shadow-md flex flex-col justify-center items-center text-center z-10 border-t-[.4vw] border-primary">
          <h2 className="text-[calc(2*var(--slide-vw))] font-display leading-[1.1] font-bold">High AI Initiative Failure Rate</h2>
        </div>

        {/* Top Bones Connectors */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <line x1="20%" y1="20%" x2="30%" y2="50%" stroke="var(--slide-primary)" strokeWidth="4" />
          <line x1="45%" y1="20%" x2="55%" y2="50%" stroke="var(--slide-primary)" strokeWidth="4" />
          <line x1="70%" y1="20%" x2="80%" y2="50%" stroke="var(--slide-primary)" strokeWidth="4" />
          
          {/* Bottom Bones Connectors */}
          <line x1="20%" y1="80%" x2="30%" y2="50%" stroke="var(--slide-primary)" strokeWidth="4" />
          <line x1="45%" y1="80%" x2="55%" y2="50%" stroke="var(--slide-primary)" strokeWidth="4" />
          <line x1="70%" y1="80%" x2="80%" y2="50%" stroke="var(--slide-primary)" strokeWidth="4" />
        </svg>

        {/* Top Bones */}
        <div className="absolute w-[20%]" style={{ left: '10%', top: '5%' }}>
          <div className="bg-white border-t-[.4vw] border-primary p-[1.5vw] shadow-sm relative z-10">
            <h3 className="text-[calc(1.8*var(--slide-vw))] font-display font-bold text-primary mb-[1vh]">People</h3>
            <ul className="space-y-[1vh]">
              <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-muted">• AI skill gaps</li>
              <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-muted">• Change resistance</li>
            </ul>
          </div>
        </div>

        <div className="absolute w-[20%]" style={{ left: '35%', top: '5%' }}>
          <div className="bg-white border-t-[.4vw] border-primary p-[1.5vw] shadow-sm relative z-10">
            <h3 className="text-[calc(1.8*var(--slide-vw))] font-display font-bold text-primary mb-[1vh]">Process</h3>
            <ul className="space-y-[1vh]">
              <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-muted">• Siloed planning</li>
              <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-muted">• Rigid procurement</li>
            </ul>
          </div>
        </div>

        <div className="absolute w-[20%]" style={{ left: '60%', top: '5%' }}>
          <div className="bg-white border-t-[.4vw] border-primary p-[1.5vw] shadow-sm relative z-10">
            <h3 className="text-[calc(1.8*var(--slide-vw))] font-display font-bold text-primary mb-[1vh]">Technology</h3>
            <ul className="space-y-[1vh]">
              <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-muted">• Legacy tech debt</li>
              <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-muted">• Fragmented data</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bones */}
        <div className="absolute w-[20%]" style={{ left: '10%', top: '80%', transform: 'translateY(-100%)' }}>
          <div className="bg-white border-t-[.4vw] border-accent p-[1.5vw] shadow-sm relative z-10">
            <h3 className="text-[calc(1.8*var(--slide-vw))] font-display font-bold text-primary mb-[1vh]">Management</h3>
            <ul className="space-y-[1vh]">
              <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-muted">• Unclear metrics</li>
              <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-muted">• Lack of mandate</li>
            </ul>
          </div>
        </div>

        <div className="absolute w-[20%]" style={{ left: '35%', top: '80%', transform: 'translateY(-100%)' }}>
          <div className="bg-white border-t-[.4vw] border-accent p-[1.5vw] shadow-sm relative z-10">
            <h3 className="text-[calc(1.8*var(--slide-vw))] font-display font-bold text-primary mb-[1vh]">Data</h3>
            <ul className="space-y-[1vh]">
              <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-muted">• Poor data quality</li>
              <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-muted">• Privacy constraints</li>
            </ul>
          </div>
        </div>

        <div className="absolute w-[20%]" style={{ left: '60%', top: '80%', transform: 'translateY(-100%)' }}>
          <div className="bg-white border-t-[.4vw] border-accent p-[1.5vw] shadow-sm relative z-10">
            <h3 className="text-[calc(1.8*var(--slide-vw))] font-display font-bold text-primary mb-[1vh]">Environment</h3>
            <ul className="space-y-[1vh]">
              <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-muted">• Regulatory shifts</li>
              <li className="text-[calc(1.5*var(--slide-vw))] leading-[1.2] text-muted">• Market hype</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
