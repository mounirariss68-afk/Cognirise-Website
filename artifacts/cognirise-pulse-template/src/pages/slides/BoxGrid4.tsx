const base = import.meta.env.BASE_URL;

export default function BoxGrid4() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[4.5vh]">
      <div className="absolute left-0 top-[29vh] w-[1.1vw] h-[22vh] bg-accent" />
      <header className="flex items-center justify-between">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.14em] font-semibold">EXECUTIVE CHOICES / 04</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </header>

      <div className="mt-[4vh] flex items-end justify-between">
        <h1 className="font-display text-[calc(4.6*var(--slide-vw))] leading-[1] tracking-[-.07em] w-[70vw]">
          Four decisions make the <span className="text-accent">model executable.</span>
        </h1>
        <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.4] text-muted w-[17vw]">Leadership alignment before solution design</p>
      </div>

      <section className="grid grid-cols-2 grid-rows-2 gap-[1.2vw] mt-[5vh] h-[54vh]">
        <article className="border-[.12vw] border-[#cbd3e1] bg-white px-[2vw] py-[2.3vh] flex gap-[2vw]">
          <p className="font-display text-[calc(3.4*var(--slide-vw))] text-accent leading-none">01</p>
          <div>
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.11em] text-muted">VALUE</p>
            <h2 className="font-display text-[calc(2.65*var(--slide-vw))] leading-[1.08] mt-[1.3vh]">Which outcome matters first?</h2>
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] mt-[1.6vh]">Choose one measurable result and a named executive owner.</p>
          </div>
        </article>
        <article className="border-[.12vw] border-[#cbd3e1] bg-white px-[2vw] py-[2.3vh] flex gap-[2vw]">
          <p className="font-display text-[calc(3.4*var(--slide-vw))] text-accent leading-none">02</p>
          <div>
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.11em] text-muted">SCOPE</p>
            <h2 className="font-display text-[calc(2.65*var(--slide-vw))] leading-[1.08] mt-[1.3vh]">Where will we prove it?</h2>
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] mt-[1.6vh]">Start with a live journey where friction and evidence are visible.</p>
          </div>
        </article>
        <article className="border-[.12vw] border-[#cbd3e1] bg-white px-[2vw] py-[2.3vh] flex gap-[2vw]">
          <p className="font-display text-[calc(3.4*var(--slide-vw))] text-accent leading-none">03</p>
          <div>
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.11em] text-muted">AUTHORITY</p>
            <h2 className="font-display text-[calc(2.65*var(--slide-vw))] leading-[1.08] mt-[1.3vh]">What may the system decide?</h2>
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] mt-[1.6vh]">Set human checkpoints, risk tolerances and escalation rules.</p>
          </div>
        </article>
        <article className="bg-primary text-white px-[2vw] py-[2.3vh] flex gap-[2vw]">
          <p className="font-display text-[calc(3.4*var(--slide-vw))] text-[#ef6b6f] leading-none">04</p>
          <div>
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.11em] text-[#bbc8dd]">SCALE</p>
            <h2 className="font-display text-[calc(2.65*var(--slide-vw))] leading-[1.08] mt-[1.3vh]">What earns the next investment?</h2>
            <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-[#dce4f0] mt-[1.6vh]">Define adoption, value and control evidence before launch.</p>
          </div>
        </article>
      </section>
    </div>
  );
}