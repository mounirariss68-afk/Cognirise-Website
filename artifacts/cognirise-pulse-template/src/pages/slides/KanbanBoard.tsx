import React from 'react';
const base = import.meta.env.BASE_URL;

export default function KanbanBoard() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="flex justify-between items-center">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.13em] font-semibold uppercase">Delivery Management / Kanban</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </div>
      <div className="mt-[5vh] flex justify-between items-end">
        <h1 className="font-display text-[calc(4.5*var(--slide-vw))] tracking-[-.06em] leading-[1]">Move work by <span className="text-accent">pull, not push.</span></h1>
        <div className="border-l-[.3vw] border-accent pl-[1.5vw] w-[30vw]">
          <p className="text-[calc(1.5*var(--slide-vw))] font-semibold">POLICY</p>
          <p className="text-[calc(1.5*var(--slide-vw))] text-muted mt-[.5vh]">Strict WIP limits. Expedite only for customer harm.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-5 mt-[6vh] border-y-[.2vw] border-primary h-[58vh] divide-x-[.15vw] divide-primary/30">
        {/* Backlog */}
        <div className="p-[1.2vw] flex flex-col gap-[1.5vh]">
          <div className="flex justify-between items-center mb-[1vh]">
            <h2 className="font-display text-[calc(2*var(--slide-vw))]">Backlog</h2>
            <span className="text-[calc(1.5*var(--slide-vw))] text-muted font-semibold">∞</span>
          </div>
          <div className="p-[1vw] bg-white border-t-[.3vw] border-primary text-primary shadow-sm">
            <p className="text-[calc(1.5*var(--slide-vw))] font-bold leading-[1.2]">Audit existing pipelines</p>
            <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-muted">Owner: A. Shah</p>
          </div>
          <div className="p-[1vw] bg-white border-t-[.3vw] border-primary text-primary shadow-sm">
            <p className="text-[calc(1.5*var(--slide-vw))] font-bold leading-[1.2]">Design integration layer</p>
            <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-muted">Owner: M. Green</p>
          </div>
        </div>

        {/* Ready */}
        <div className="p-[1.2vw] flex flex-col gap-[1.5vh] bg-primary/[0.02]">
          <div className="flex justify-between items-center mb-[1vh]">
            <h2 className="font-display text-[calc(2*var(--slide-vw))]">Ready</h2>
            <span className="text-[calc(1.5*var(--slide-vw))] text-muted font-semibold">2/4</span>
          </div>
          <div className="p-[1vw] bg-white border-t-[.3vw] border-primary text-primary shadow-sm">
            <p className="text-[calc(1.5*var(--slide-vw))] font-bold leading-[1.2]">Validate duplicate invoices</p>
            <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-muted">Owner: J. Cole</p>
            <p className="text-[calc(1.5*var(--slide-vw))] mt-[.5vh] text-primary">Done: 50-case sample</p>
          </div>
          <div className="p-[1vw] bg-white border-t-[.3vw] border-primary text-primary shadow-sm">
            <p className="text-[calc(1.5*var(--slide-vw))] font-bold leading-[1.2]">Map approval exceptions</p>
            <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-muted">Owner: L. Wu</p>
          </div>
        </div>

        {/* In Progress */}
        <div className="p-[1.2vw] flex flex-col gap-[1.5vh] bg-primary/[0.04]">
          <div className="flex justify-between items-center mb-[1vh]">
            <h2 className="font-display text-[calc(2*var(--slide-vw))]">In Progress</h2>
            <span className="text-[calc(1.5*var(--slide-vw))] text-accent font-bold">3/3</span>
          </div>
          <div className="p-[1vw] bg-primary text-white border-t-[.3vw] border-accent shadow-sm">
            <p className="text-[calc(1.5*var(--slide-vw))] font-bold leading-[1.2]">Build supplier match rule</p>
            <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-white/80">Owner: M. Green</p>
          </div>
          <div className="p-[1vw] bg-white border-t-[.3vw] border-primary text-primary shadow-sm">
            <p className="text-[calc(1.5*var(--slide-vw))] font-bold leading-[1.2]">Draft reviewer playbook</p>
            <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-muted">Owner: L. Wu</p>
          </div>
        </div>

        {/* Review */}
        <div className="p-[1.2vw] flex flex-col gap-[1.5vh] bg-primary/[0.02]">
          <div className="flex justify-between items-center mb-[1vh]">
            <h2 className="font-display text-[calc(2*var(--slide-vw))]">Review</h2>
            <span className="text-[calc(1.5*var(--slide-vw))] text-muted font-semibold">1/2</span>
          </div>
          <div className="p-[1vw] bg-[#f3e4ed] text-primary border-t-[.3vw] border-accent shadow-sm">
            <p className="text-[calc(1.5*var(--slide-vw))] font-bold leading-[1.2]">Exception routing test</p>
            <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-muted">Owner: R. Diaz</p>
            <p className="text-[calc(1.5*var(--slide-vw))] mt-[.5vh] text-accent font-semibold">Blocked: Security</p>
          </div>
        </div>

        {/* Done */}
        <div className="p-[1.2vw] flex flex-col gap-[1.5vh]">
          <div className="flex justify-between items-center mb-[1vh]">
            <h2 className="font-display text-[calc(2*var(--slide-vw))]">Done</h2>
            <span className="text-[calc(1.5*var(--slide-vw))] text-muted font-semibold uppercase">This Week</span>
          </div>
          <div className="p-[1vw] bg-white border-t-[.3vw] border-primary text-primary shadow-sm">
            <p className="text-[calc(1.5*var(--slide-vw))] font-bold leading-[1.2]">Baseline cycle time</p>
            <p className="text-[calc(1.5*var(--slide-vw))] mt-[1vh] text-muted">Owner: P. Young</p>
            <p className="text-[calc(1.5*var(--slide-vw))] mt-[.5vh] text-primary">Completed Tue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
