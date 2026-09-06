const base = import.meta.env.BASE_URL;

export default function SplitFlow() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <header className="relative flex items-center justify-between">
        <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">
          SPLIT FLOW / 63
        </p>
        <img
          src={`${base}images/logo-blue.svg`}
          crossOrigin="anonymous"
          alt="Cognirise"
          className="w-[10vw]"
        />
      </header>

      <div className="relative mt-[2.5vh]">
        <h1 className="font-display text-[calc(4.1*var(--slide-vw))] tracking-[-.055em] leading-[1.05]">
          One source. <span className="text-accent">Five clear destinations.</span>
        </h1>
        <p className="mt-[1.4vh] text-[calc(1.65*var(--slide-vw))] text-muted">
          A reusable pattern for rollout, distribution and coordinated activation.
        </p>
      </div>

      <div
        className="relative mt-[2.5vh] h-[60vh] w-full"
        role="img"
        aria-label="One labeled source splits through a distribution point into five clearly separated destinations"
      >
        <p className="absolute left-[1%] top-0 text-[calc(1.5*var(--slide-vw))] font-bold tracking-[.12em] text-muted">SOURCE</p>
        <p className="absolute right-[1%] top-0 text-[calc(1.5*var(--slide-vw))] font-bold tracking-[.12em] text-muted">DESTINATIONS</p>

        <div className="absolute left-0 top-[35%] h-[28%] w-[20%] rounded-[1.5vw] bg-primary shadow-[0_1.2vh_2.4vh_rgba(16,41,87,.18)]">
          <div className="absolute inset-[8%] rounded-[1vw] border-[0.22vw] border-accent" />
          <div className="absolute left-[18%] top-[36%] flex h-[28%] w-[15%] items-center justify-center rounded-full bg-accent text-[calc(2.4*var(--slide-vw))] font-bold leading-none text-white">+</div>
          <p className="absolute left-[38%] top-[28%] text-[calc(1.5*var(--slide-vw))] font-bold tracking-[.08em] text-white">SOURCE</p>
          <p className="absolute left-[38%] top-[54%] whitespace-nowrap text-[calc(1.3*var(--slide-vw))] text-[#dce4f0]">Central decision</p>
        </div>

        <div className="absolute left-[20%] top-[48.7%] h-[1.2%] w-[16%] bg-primary" />
        <div className="absolute left-[36%] top-[42.5%] h-[13.5%] w-[4.8%] rounded-full border-[0.42vw] border-primary bg-bg" />
        <div className="absolute left-[37.7%] top-[47.2%] h-[4.2%] w-[1.5%] rounded-full bg-accent" />
        <p className="absolute left-[33.5%] top-[58%] z-10 w-[10%] bg-bg text-center text-[calc(1.35*var(--slide-vw))] font-bold tracking-[.08em] text-muted">DISTRIBUTE</p>
        <div className="absolute left-[38.15%] top-[14%] h-[70%] w-[0.48%] bg-accent" />

        <div className="absolute left-[38.2%] top-[14%] h-[1.1%] w-[47.1%] bg-[#7b5cd6]" />
        <div className="absolute left-[83.3%] top-[14.25%] h-[0.65%] w-[1.6%] origin-right rotate-[40deg] bg-[#7b5cd6]" />
        <div className="absolute left-[83.3%] top-[14.25%] h-[0.65%] w-[1.6%] origin-right -rotate-[40deg] bg-[#7b5cd6]" />
        <div className="absolute right-0 top-[8.6%] flex h-[10.8%] w-[15.5%] items-center whitespace-nowrap rounded-[0.7vw] border-[0.18vw] border-[#7b5cd6] bg-white px-[0.9vw] text-[calc(1.35*var(--slide-vw))] font-semibold text-primary">Destination one</div>

        <div className="absolute left-[38.2%] top-[31.5%] h-[1.1%] w-[47.1%] bg-[#a758bc]" />
        <div className="absolute left-[83.3%] top-[31.75%] h-[0.65%] w-[1.6%] origin-right rotate-[40deg] bg-[#a758bc]" />
        <div className="absolute left-[83.3%] top-[31.75%] h-[0.65%] w-[1.6%] origin-right -rotate-[40deg] bg-[#a758bc]" />
        <div className="absolute right-0 top-[26.1%] flex h-[10.8%] w-[15.5%] items-center whitespace-nowrap rounded-[0.7vw] border-[0.18vw] border-[#a758bc] bg-white px-[0.9vw] text-[calc(1.35*var(--slide-vw))] font-semibold text-primary">Destination two</div>

        <div className="absolute left-[38.2%] top-[49%] h-[1.1%] w-[47.1%] bg-accent" />
        <div className="absolute left-[83.3%] top-[49.25%] h-[0.65%] w-[1.6%] origin-right rotate-[40deg] bg-accent" />
        <div className="absolute left-[83.3%] top-[49.25%] h-[0.65%] w-[1.6%] origin-right -rotate-[40deg] bg-accent" />
        <div className="absolute right-0 top-[43.6%] flex h-[10.8%] w-[15.5%] items-center whitespace-nowrap rounded-[0.7vw] border-[0.18vw] border-accent bg-white px-[0.9vw] text-[calc(1.35*var(--slide-vw))] font-semibold text-primary">Destination three</div>

        <div className="absolute left-[38.2%] top-[66.5%] h-[1.1%] w-[47.1%] bg-[#e26081]" />
        <div className="absolute left-[83.3%] top-[66.75%] h-[0.65%] w-[1.6%] origin-right rotate-[40deg] bg-[#e26081]" />
        <div className="absolute left-[83.3%] top-[66.75%] h-[0.65%] w-[1.6%] origin-right -rotate-[40deg] bg-[#e26081]" />
        <div className="absolute right-0 top-[61.1%] flex h-[10.8%] w-[15.5%] items-center whitespace-nowrap rounded-[0.7vw] border-[0.18vw] border-[#e26081] bg-white px-[0.9vw] text-[calc(1.35*var(--slide-vw))] font-semibold text-primary">Destination four</div>

        <div className="absolute left-[38.2%] top-[84%] h-[1.1%] w-[47.1%] bg-[#ef765f]" />
        <div className="absolute left-[83.3%] top-[84.25%] h-[0.65%] w-[1.6%] origin-right rotate-[40deg] bg-[#ef765f]" />
        <div className="absolute left-[83.3%] top-[84.25%] h-[0.65%] w-[1.6%] origin-right -rotate-[40deg] bg-[#ef765f]" />
        <div className="absolute right-0 top-[78.6%] flex h-[10.8%] w-[15.5%] items-center whitespace-nowrap rounded-[0.7vw] border-[0.18vw] border-[#ef765f] bg-white px-[0.9vw] text-[calc(1.35*var(--slide-vw))] font-semibold text-primary">Destination five</div>
      </div>
    </div>
  );
}