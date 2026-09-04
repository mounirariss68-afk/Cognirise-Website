import React from 'react';
const base=import.meta.env.BASE_URL;
export default function Circular5(){
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh] flex flex-col">
      <header className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">METHODOLOGY / 29</p>
        <img src={base+"images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]"/>
      </header>
      
      <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] mt-[4vh] w-[70vw]">
        Five phases to <span className="text-accent">production scale.</span>
      </h1>
      
      <div className="flex-1 mt-[4vh] flex items-end pb-[6vh] relative">
        <svg className="absolute top-[5vh] left-0 w-full h-[20vh]" viewBox="0 0 1000 200" preserveAspectRatio="none">
          <path d="M0,100 Q250,200 500,100 T1000,100" fill="none" stroke="#dde2eb" strokeWidth="2"/>
          <path d="M0,100 Q250,200 500,100" fill="none" stroke="#db509e" strokeWidth="4"/>
        </svg>
        
        <div className="w-full grid grid-cols-5 gap-[2vw] relative z-10">
          <div className="space-y-[2vh]">
            <span className="font-display text-[calc(3*var(--slide-vw))] font-bold text-accent">01</span>
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">Align</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted">Identify high-leverage domains and establish baseline security boundaries.</p>
          </div>
          <div className="space-y-[2vh] pt-[4vh]">
            <span className="font-display text-[calc(3*var(--slide-vw))] font-bold text-primary">02</span>
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">Ground</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted">Connect fragmented enterprise knowledge into a unified semantic layer.</p>
          </div>
          <div className="space-y-[2vh] pt-[8vh]">
            <span className="font-display text-[calc(3*var(--slide-vw))] font-bold text-primary">03</span>
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">Build</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted">Deploy reasoning agents with strict operational authority boundaries.</p>
          </div>
          <div className="space-y-[2vh] pt-[4vh]">
            <span className="font-display text-[calc(3*var(--slide-vw))] font-bold text-primary">04</span>
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">Verify</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted">Human-in-the-loop validation of deterministic outputs and logic.</p>
          </div>
          <div className="space-y-[2vh]">
            <span className="font-display text-[calc(3*var(--slide-vw))] font-bold text-primary">05</span>
            <p className="text-[calc(1.8*var(--slide-vw))] font-semibold">Scale</p>
            <p className="text-[calc(1.5*var(--slide-vw))] text-muted">Autonomous execution with continuous closed-loop feedback.</p>
          </div>
        </div>
      </div>
    </div>
  )
}