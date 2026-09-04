const base = import.meta.env.BASE_URL;

export default function Columns6() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-primary text-white font-body px-[5vw] py-[4.5vh]">
      <div className="absolute -right-[5vw] top-[22vh] w-[18vw] h-[18vw] rounded-full border-[3.2vw] border-[#593981] opacity-60" />
      <header className="relative flex items-center justify-between">
        <p className="text-[calc(1.5*var(--slide-vw))] tracking-[.14em] font-semibold text-[#dce4f0]">DELIVERY PLAN / 06</p>
        <img src={base + "images/logo-white.svg"} crossOrigin="anonymous" alt="Cognirise" className="w-[10vw]" />
      </header>

      <div className="relative mt-[5vh] flex justify-between items-end">
        <h1 className="font-display text-[calc(4.8*var(--slide-vw))] leading-[.98] tracking-[-.07em] w-[69vw]">
          Value starts in weeks, <span className="text-[#ef6b6f]">then compounds.</span>
        </h1>
        <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-[#bbc8dd] w-[16vw] text-right">A reusable 12-week mobilisation</p>
      </div>

      <section className="relative grid grid-cols-6 mt-[7vh] h-[49vh] border-t border-b border-[#60749a]">
        <article className="py-[3vh] pr-[1.2vw] border-r border-[#60749a] flex flex-col">
          <p className="text-[calc(1.5*var(--slide-vw))] text-[#ef6b6f] font-semibold">WEEK 01</p>
          <h2 className="font-display text-[calc(2.15*var(--slide-vw))] leading-[1.08] mt-[2.3vh]">Frame the value</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-[#bbc8dd] mt-auto">Agree outcome, owner and baseline.</p>
        </article>
        <article className="py-[3vh] px-[1.2vw] border-r border-[#60749a] flex flex-col">
          <p className="text-[calc(1.5*var(--slide-vw))] text-[#ef6b6f] font-semibold">WEEK 02</p>
          <h2 className="font-display text-[calc(2.15*var(--slide-vw))] leading-[1.08] mt-[2.3vh]">Follow the work</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-[#bbc8dd] mt-auto">Observe cases, handoffs and controls.</p>
        </article>
        <article className="py-[3vh] px-[1.2vw] border-r border-[#60749a] flex flex-col">
          <p className="text-[calc(1.5*var(--slide-vw))] text-[#ef6b6f] font-semibold">WEEKS 03–04</p>
          <h2 className="font-display text-[calc(2.15*var(--slide-vw))] leading-[1.08] mt-[2.3vh]">Prove the path</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-[#bbc8dd] mt-auto">Prototype the highest-friction journey.</p>
        </article>
        <article className="py-[3vh] px-[1.2vw] border-r border-[#60749a] flex flex-col bg-[#18366a]">
          <p className="text-[calc(1.5*var(--slide-vw))] text-[#ef6b6f] font-semibold">WEEKS 05–07</p>
          <h2 className="font-display text-[calc(2.15*var(--slide-vw))] leading-[1.08] mt-[2.3vh]">Build for use</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-[#bbc8dd] mt-auto">Integrate data, workflow and guardrails.</p>
        </article>
        <article className="py-[3vh] px-[1.2vw] border-r border-[#60749a] flex flex-col">
          <p className="text-[calc(1.5*var(--slide-vw))] text-[#ef6b6f] font-semibold">WEEKS 08–10</p>
          <h2 className="font-display text-[calc(2.15*var(--slide-vw))] leading-[1.08] mt-[2.3vh]">Launch with teams</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-[#bbc8dd] mt-auto">Coach users and resolve exceptions.</p>
        </article>
        <article className="py-[3vh] pl-[1.2vw] flex flex-col">
          <p className="text-[calc(1.5*var(--slide-vw))] text-[#ef6b6f] font-semibold">WEEKS 11–12</p>
          <h2 className="font-display text-[calc(2.15*var(--slide-vw))] leading-[1.08] mt-[2.3vh]">Scale what works</h2>
          <p className="text-[calc(1.5*var(--slide-vw))] leading-[1.35] text-[#bbc8dd] mt-auto">Evidence value and fund the next wave.</p>
        </article>
      </section>
    </div>
  );
}