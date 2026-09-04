import React from 'react';
const base = import.meta.env.BASE_URL;

export default function BusinessModelCanvas() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[4vw] py-[4vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold uppercase">Venture Design / Business Model Canvas</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      <div className="mt-[2vh]">
        <h1 className="font-display text-[calc(4.2*var(--slide-vw))] tracking-[-.06em] leading-[1.05]">
          A model built around <span className="text-accent">measured outcomes.</span>
        </h1>
      </div>
      
      <div className="mt-[3vh] h-[55vh] border-[.2vw] border-primary flex flex-col bg-primary/20 gap-[.2vw]">
        {/* Top Half: 5 logical columns */}
        <div className="flex-[2.2] flex min-h-0 gap-[.2vw]">
          {/* Key Partners */}
          <div className="flex-1 bg-white p-[1.5vw] flex flex-col min-h-0">
            <h2 className="font-bold text-[calc(1.5*var(--slide-vw))] text-accent mb-[1.5vh] uppercase tracking-wider">Key Partners</h2>
            <ul className="space-y-[1.5vh] text-[calc(1.5*var(--slide-vw))] text-primary font-medium">
              <li>• Cloud providers</li>
              <li>• ERP integrators</li>
              <li>• Risk specialists</li>
            </ul>
          </div>
          
          {/* Column 2: Activities & Resources */}
          <div className="flex-1 flex flex-col min-h-0 gap-[.2vw]">
            <div className="flex-1 bg-white p-[1.2vw] min-h-0">
              <h2 className="font-bold text-[calc(1.5*var(--slide-vw))] text-accent mb-[1vh] uppercase tracking-wider">Key Activities</h2>
              <ul className="space-y-[.5vh] text-[calc(1.5*var(--slide-vw))] text-primary font-medium">
                <li>• Diagnose & build workflows</li>
              </ul>
            </div>
            <div className="flex-1 bg-white p-[1.2vw] min-h-0">
              <h2 className="font-bold text-[calc(1.5*var(--slide-vw))] text-accent mb-[1vh] uppercase tracking-wider">Key Resources</h2>
              <ul className="space-y-[.5vh] text-[calc(1.5*var(--slide-vw))] text-primary font-medium">
                <li>• Senior operators & IP</li>
              </ul>
            </div>
          </div>
          
          {/* Value Proposition */}
          <div className="flex-[1.2] bg-primary text-white p-[1.5vw] flex flex-col justify-center border-t-[.4vw] border-accent relative z-10 min-h-0">
            <h2 className="font-bold text-[calc(1.5*var(--slide-vw))] text-[#e7b8d3] mb-[1.5vh] uppercase tracking-wider">Value Proposition</h2>
            <p className="font-display text-[calc(2*var(--slide-vw))] leading-[1.2] font-semibold mb-[1.5vh]">
              Senior-led transformation moving decisions into production.
            </p>
            <ul className="space-y-[.5vh] text-[calc(1.5*var(--slide-vw))] text-white/80">
              <li>• Faster cycles</li>
              <li>• Released capacity</li>
              <li>• Control evidence</li>
            </ul>
          </div>
          
          {/* Column 4: Relationships & Channels */}
          <div className="flex-1 flex flex-col min-h-0 gap-[.2vw]">
            <div className="flex-1 bg-white p-[1.2vw] min-h-0">
              <h2 className="font-bold text-[calc(1.5*var(--slide-vw))] text-accent mb-[1vh] uppercase tracking-wider">Relationships</h2>
              <ul className="space-y-[.5vh] text-[calc(1.5*var(--slide-vw))] text-primary font-medium">
                <li>• Embedded delivery</li>
              </ul>
            </div>
            <div className="flex-1 bg-white p-[1.2vw] min-h-0">
              <h2 className="font-bold text-[calc(1.5*var(--slide-vw))] text-accent mb-[1vh] uppercase tracking-wider">Channels</h2>
              <ul className="space-y-[.5vh] text-[calc(1.5*var(--slide-vw))] text-primary font-medium">
                <li>• Executive referrals</li>
              </ul>
            </div>
          </div>
          
          {/* Customer Segments */}
          <div className="flex-1 bg-[#f3e4ed] p-[1.5vw] flex flex-col border-t-[.4vw] border-primary relative z-10 min-h-0">
            <h2 className="font-bold text-[calc(1.5*var(--slide-vw))] text-primary mb-[1.5vh] uppercase tracking-wider">Customer Segments</h2>
            <ul className="space-y-[1.5vh] text-[calc(1.5*var(--slide-vw))] text-primary font-medium">
              <li>• COO/CFO sponsors</li>
              <li>• Regulated orgs</li>
              <li>• High-exception teams</li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Half: 2 columns */}
        <div className="flex-[1] flex min-h-0 gap-[.2vw]">
          {/* Cost Structure */}
          <div className="flex-1 bg-white p-[1.5vw] flex flex-col justify-center min-h-0">
            <h2 className="font-bold text-[calc(1.5*var(--slide-vw))] text-accent mb-[1vh] uppercase tracking-wider">Cost Structure</h2>
            <div className="grid grid-cols-2 gap-[1.5vw] text-[calc(1.5*var(--slide-vw))] text-primary font-medium">
              <span>• Senior talent</span>
              <span>• Secure tooling</span>
            </div>
          </div>
          {/* Revenue Streams */}
          <div className="flex-1 bg-white p-[1.5vw] flex flex-col justify-center min-h-0">
            <h2 className="font-bold text-[calc(1.5*var(--slide-vw))] text-accent mb-[1vh] uppercase tracking-wider">Revenue Streams</h2>
            <div className="grid grid-cols-2 gap-[1.5vw] text-[calc(1.5*var(--slide-vw))] text-primary font-medium">
              <span>• Diagnostic fees</span>
              <span>• Retainers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
