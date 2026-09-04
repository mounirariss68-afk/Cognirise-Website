const base = import.meta.env.BASE_URL;

export default function BoxGrid6() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#f8f7f4] text-text font-body px-[5vw] py-[4.5vh]">
      <div className="absolute right-0 bottom-0 w-[10vw] h-[10vw] bg-[#ef6b6f]" />
      <div className="absolute right-[10vw] bottom-0 w-[10vw] h-[10vw] bg-accent" />
      <header className="relative flex items-center justify-between">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.14em] font-semibold">TRANSFORMATION SYSTEM / 06</p>
        <img src={base + "images/logo-blue.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </header>

      <div className="relative mt-[3.8vh] flex items-end justify-between">
        <h1 className="font-display text-[calc(4.55*var(--slide-vw))] leading-[.98] tracking-[-.07em] w-[68vw]">
          Six capabilities turn pilots into <span className="text-accent">performance.</span>
        </h1>
        <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-muted w-[18vw] text-right">A practical blueprint for a service organisation</p>
      </div>

      <section className="relative grid grid-cols-3 grid-rows-2 gap-[1vw] mt-[4.5vh] h-[57vh] w-[90vw]">
        <article className="bg-primary text-white p-[1.7vw] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] text-[#bbc8dd]">01 / DIRECTION</p>
            <span className="w-[1.3vw] h-[1.3vw] rounded-full bg-[#ef6b6f]" />
          </div>
          <h2 className="font-display text-[calc(2.45*var(--slide-vw))] leading-[1.08]">Value-led portfolio</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-[#dce4f0]">Sequence work by outcome, feasibility and learning value.</p>
        </article>
        <article className="bg-white border-[.12vw] border-[#cbd3e1] p-[1.7vw] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] text-muted">02 / EXPERIENCE</p>
            <span className="w-[1.3vw] h-[1.3vw] rounded-full bg-accent" />
          </div>
          <h2 className="font-display text-[calc(2.45*var(--slide-vw))] leading-[1.08]">Journey ownership</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-muted">Give one team accountability from demand to resolution.</p>
        </article>
        <article className="bg-white border-[.12vw] border-[#cbd3e1] p-[1.7vw] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] text-muted">03 / DATA</p>
            <span className="w-[1.3vw] h-[1.3vw] rounded-full bg-accent" />
          </div>
          <h2 className="font-display text-[calc(2.45*var(--slide-vw))] leading-[1.08]">Trusted context</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-muted">Make policy, case history and evidence usable in the flow.</p>
        </article>
        <article className="bg-white border-[.12vw] border-[#cbd3e1] p-[1.7vw] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] text-muted">04 / TECHNOLOGY</p>
            <span className="w-[1.3vw] h-[1.3vw] rounded-full bg-accent" />
          </div>
          <h2 className="font-display text-[calc(2.45*var(--slide-vw))] leading-[1.08]">Composable platform</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-muted">Connect agents and workflow without another monolith.</p>
        </article>
        <article className="bg-white border-[.12vw] border-[#cbd3e1] p-[1.7vw] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] text-muted">05 / CONTROL</p>
            <span className="w-[1.3vw] h-[1.3vw] rounded-full bg-accent" />
          </div>
          <h2 className="font-display text-[calc(2.45*var(--slide-vw))] leading-[1.08]">Governed autonomy</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-muted">Embed permissions, review and traceability by design.</p>
        </article>
        <article className="bg-[#593981] text-white p-[1.7vw] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.1em] text-[#e7dff0]">06 / PEOPLE</p>
            <span className="w-[1.3vw] h-[1.3vw] rounded-full bg-[#ef6b6f]" />
          </div>
          <h2 className="font-display text-[calc(2.45*var(--slide-vw))] leading-[1.08]">Adoption in the work</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-[#eee8f3]">Coach teams on real cases and redesign roles as value lands.</p>
        </article>
      </section>
    </div>
  );
}