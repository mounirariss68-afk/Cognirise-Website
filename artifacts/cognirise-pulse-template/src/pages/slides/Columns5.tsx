const base = import.meta.env.BASE_URL;

export default function Columns5() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[4.5vh]">
      <div className="absolute top-0 right-[18vw] w-[14vw] h-[1.1vh] bg-accent" />
      <header className="flex items-center justify-between">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.14em] font-semibold">VALUE LEVERS / 05</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </header>

      <div className="mt-[4.5vh] flex items-end justify-between">
        <h1 className="font-display text-[calc(4.7*var(--slide-vw))] leading-[.98] tracking-[-.07em] w-[72vw]">
          Five moves unlock <span className="text-accent">service capacity.</span>
        </h1>
        <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-muted text-right w-[15vw]">Illustrative claims operation</p>
      </div>

      <section className="grid grid-cols-5 mt-[5.5vh] h-[53vh] border-y-[.15vw] border-primary">
        <article className="py-[3.3vh] pr-[1.5vw] border-r border-[#cbd3e1] flex flex-col">
          <div className="w-[3.3vw] h-[3.3vw] rounded-full bg-primary text-white flex items-center justify-center text-[calc(1.5*var(--slide-vw))] font-semibold">01</div>
          <h2 className="font-display text-[calc(2.3*var(--slide-vw))] leading-[1.08] mt-[3vh]">Triage at intake</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.4] text-muted mt-auto">Route each claim by complexity, urgency and customer need.</p>
        </article>
        <article className="py-[3.3vh] px-[1.5vw] border-r border-[#cbd3e1] flex flex-col">
          <div className="w-[3.3vw] h-[3.3vw] rounded-full border-[.12vw] border-primary flex items-center justify-center text-[calc(1.5*var(--slide-vw))] font-semibold">02</div>
          <h2 className="font-display text-[calc(2.3*var(--slide-vw))] leading-[1.08] mt-[3vh]">Prepare the file</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.4] text-muted mt-auto">Assemble evidence and flag gaps before an expert opens the case.</p>
        </article>
        <article className="py-[3.3vh] px-[1.5vw] border-r border-[#cbd3e1] flex flex-col">
          <div className="w-[3.3vw] h-[3.3vw] rounded-full border-[.12vw] border-primary flex items-center justify-center text-[calc(1.5*var(--slide-vw))] font-semibold">03</div>
          <h2 className="font-display text-[calc(2.3*var(--slide-vw))] leading-[1.08] mt-[3vh]">Guide decisions</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.4] text-muted mt-auto">Put policy, precedent and next-best actions in one view.</p>
        </article>
        <article className="py-[3.3vh] px-[1.5vw] border-r border-[#cbd3e1] flex flex-col">
          <div className="w-[3.3vw] h-[3.3vw] rounded-full border-[.12vw] border-primary flex items-center justify-center text-[calc(1.5*var(--slide-vw))] font-semibold">04</div>
          <h2 className="font-display text-[calc(2.3*var(--slide-vw))] leading-[1.08] mt-[3vh]">Automate follow-up</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.4] text-muted mt-auto">Draft updates, chase documents and record every interaction.</p>
        </article>
        <article className="py-[3.3vh] pl-[1.5vw] flex flex-col bg-primary text-white px-[1.5vw]">
          <div className="w-[3.3vw] h-[3.3vw] rounded-full bg-accent flex items-center justify-center text-[calc(1.5*var(--slide-vw))] font-semibold">05</div>
          <h2 className="font-display text-[calc(2.3*var(--slide-vw))] leading-[1.08] mt-[3vh]">Learn every week</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.4] text-[#dce4f0] mt-auto">Use exceptions and outcomes to improve the operating rules.</p>
        </article>
      </section>
    </div>
  );
}