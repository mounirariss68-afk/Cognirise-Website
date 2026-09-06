const base = import.meta.env.BASE_URL;

export default function ConvergingFlow() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg text-text font-body px-[5vw] py-[5vh]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_57%,rgba(219,80,158,0.09),transparent_27%)]" />
      <header className="relative flex items-center justify-between">
        <p className="text-[calc(1.5*var(--slide-vw))] font-semibold tracking-[.13em] text-muted">
          CONVERGING FLOW / 62
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
          Many flows. <span className="text-accent">One orchestrated core.</span>
        </h1>
        <p className="mt-[1.4vh] text-[calc(1.65*var(--slide-vw))] text-muted">
          A reusable pattern for transformation, processing and coordinated delivery.
        </p>
      </div>

      <div
        className="relative mt-[2.2vh] h-[47vh] w-full"
        role="img"
        aria-label="Five editable input flows pass through one orchestration core and emerge as five editable outputs"
      >
        <p className="absolute left-0 top-0 text-[calc(1.5*var(--slide-vw))] font-bold tracking-[.13em] text-muted">
          INPUTS
        </p>
        <p className="absolute right-0 top-0 text-[calc(1.5*var(--slide-vw))] font-bold tracking-[.13em] text-muted">
          OUTPUTS
        </p>

        <div className="absolute left-0 top-[4.5vh] flex h-[5.7vh] w-[13.5vw] items-center rounded-[.7vw] border-[.12vw] border-[#d9deea] bg-white px-[1.2vw] text-[calc(1.55*var(--slide-vw))] font-semibold text-primary shadow-[0_.7vh_1.5vh_rgba(16,41,87,.08)]">
          Input one
        </div>
        <div className="absolute left-0 top-[12.9vh] flex h-[5.7vh] w-[13.5vw] items-center rounded-[.7vw] border-[.12vw] border-[#d9deea] bg-white px-[1.2vw] text-[calc(1.55*var(--slide-vw))] font-semibold text-primary shadow-[0_.7vh_1.5vh_rgba(16,41,87,.08)]">
          Input two
        </div>
        <div className="absolute left-0 top-[21.3vh] flex h-[5.7vh] w-[13.5vw] items-center rounded-[.7vw] border-[.12vw] border-[#d9deea] bg-white px-[1.2vw] text-[calc(1.55*var(--slide-vw))] font-semibold text-primary shadow-[0_.7vh_1.5vh_rgba(16,41,87,.08)]">
          Input three
        </div>
        <div className="absolute left-0 top-[29.7vh] flex h-[5.7vh] w-[13.5vw] items-center rounded-[.7vw] border-[.12vw] border-[#d9deea] bg-white px-[1.2vw] text-[calc(1.55*var(--slide-vw))] font-semibold text-primary shadow-[0_.7vh_1.5vh_rgba(16,41,87,.08)]">
          Input four
        </div>
        <div className="absolute left-0 top-[38.1vh] flex h-[5.7vh] w-[13.5vw] items-center rounded-[.7vw] border-[.12vw] border-[#d9deea] bg-white px-[1.2vw] text-[calc(1.55*var(--slide-vw))] font-semibold text-primary shadow-[0_.7vh_1.5vh_rgba(16,41,87,.08)]">
          Input five
        </div>

        <div className="absolute left-[13.5vw] top-[7.1vh] h-[.62vh] w-[23.5vw] rounded-full bg-[#7659df]" />
        <div className="absolute left-[13.5vw] top-[15.5vh] h-[.62vh] w-[23.5vw] rounded-full bg-[#a758bc]" />
        <div className="absolute left-[13.5vw] top-[23.9vh] h-[.62vh] w-[23.5vw] rounded-full bg-[#db509e]" />
        <div className="absolute left-[13.5vw] top-[32.3vh] h-[.62vh] w-[23.5vw] rounded-full bg-[#e26081]" />
        <div className="absolute left-[13.5vw] top-[40.7vh] h-[.62vh] w-[23.5vw] rounded-full bg-[#ff775d]" />

        <div className="absolute left-[35.95vw] top-[6.7vh] h-[.55vh] w-[1.1vw] origin-right rotate-45 rounded-full bg-[#7659df]" />
        <div className="absolute left-[35.95vw] top-[7.55vh] h-[.55vh] w-[1.1vw] origin-right -rotate-45 rounded-full bg-[#7659df]" />
        <div className="absolute left-[35.95vw] top-[15.1vh] h-[.55vh] w-[1.1vw] origin-right rotate-45 rounded-full bg-[#a758bc]" />
        <div className="absolute left-[35.95vw] top-[15.95vh] h-[.55vh] w-[1.1vw] origin-right -rotate-45 rounded-full bg-[#a758bc]" />
        <div className="absolute left-[35.95vw] top-[23.5vh] h-[.55vh] w-[1.1vw] origin-right rotate-45 rounded-full bg-[#db509e]" />
        <div className="absolute left-[35.95vw] top-[24.35vh] h-[.55vh] w-[1.1vw] origin-right -rotate-45 rounded-full bg-[#db509e]" />
        <div className="absolute left-[35.95vw] top-[31.9vh] h-[.55vh] w-[1.1vw] origin-right rotate-45 rounded-full bg-[#e26081]" />
        <div className="absolute left-[35.95vw] top-[32.75vh] h-[.55vh] w-[1.1vw] origin-right -rotate-45 rounded-full bg-[#e26081]" />
        <div className="absolute left-[35.95vw] top-[40.3vh] h-[.55vh] w-[1.1vw] origin-right rotate-45 rounded-full bg-[#ff775d]" />
        <div className="absolute left-[35.95vw] top-[41.15vh] h-[.55vh] w-[1.1vw] origin-right -rotate-45 rounded-full bg-[#ff775d]" />

        <div className="absolute left-[37vw] top-[3.5vh] h-[40.8vh] w-[16vw] rounded-[1.8vw] bg-primary shadow-[0_1.2vh_2.4vh_rgba(16,41,87,.2)]">
          <div className="absolute inset-[1.1vw] rounded-[1.2vw] border-[.22vw] border-[#db509e]" />
          <div className="absolute left-1/2 top-[7.2vh] h-[4.2vh] w-[2.4vw] -translate-x-1/2 rounded-full bg-accent" />
          <div className="absolute left-1/2 top-[8.8vh] h-[.5vh] w-[1.35vw] -translate-x-1/2 rounded-full bg-white" />
          <div className="absolute left-1/2 top-[7.85vh] h-[2.4vh] w-[.28vw] -translate-x-1/2 rounded-full bg-white" />
          <p className="absolute left-1/2 top-[18vh] w-[14vw] -translate-x-1/2 text-center text-[calc(1.5*var(--slide-vw))] font-bold tracking-[.03em] text-white">
            ORCHESTRATION
          </p>
          <p className="absolute left-1/2 top-[23.2vh] w-[10vw] -translate-x-1/2 text-center text-[calc(1.5*var(--slide-vw))] text-[#dce4f0]">
            Central element
          </p>
          <div className="absolute bottom-[5.2vh] left-1/2 h-[.45vh] w-[6.8vw] -translate-x-1/2 rounded-full bg-[#7659df]" />
          <div className="absolute bottom-[3.9vh] left-1/2 h-[.45vh] w-[6.8vw] -translate-x-1/2 rounded-full bg-[#db509e]" />
          <div className="absolute bottom-[2.6vh] left-1/2 h-[.45vh] w-[6.8vw] -translate-x-1/2 rounded-full bg-[#ff775d]" />
        </div>

        <div className="absolute left-[53vw] top-[7.1vh] h-[.62vh] w-[23.5vw] rounded-full bg-[#7659df]" />
        <div className="absolute left-[53vw] top-[15.5vh] h-[.62vh] w-[23.5vw] rounded-full bg-[#a758bc]" />
        <div className="absolute left-[53vw] top-[23.9vh] h-[.62vh] w-[23.5vw] rounded-full bg-[#db509e]" />
        <div className="absolute left-[53vw] top-[32.3vh] h-[.62vh] w-[23.5vw] rounded-full bg-[#e26081]" />
        <div className="absolute left-[53vw] top-[40.7vh] h-[.62vh] w-[23.5vw] rounded-full bg-[#ff775d]" />

        <div className="absolute left-[75.45vw] top-[6.7vh] h-[.55vh] w-[1.1vw] origin-right rotate-45 rounded-full bg-[#7659df]" />
        <div className="absolute left-[75.45vw] top-[7.55vh] h-[.55vh] w-[1.1vw] origin-right -rotate-45 rounded-full bg-[#7659df]" />
        <div className="absolute left-[75.45vw] top-[15.1vh] h-[.55vh] w-[1.1vw] origin-right rotate-45 rounded-full bg-[#a758bc]" />
        <div className="absolute left-[75.45vw] top-[15.95vh] h-[.55vh] w-[1.1vw] origin-right -rotate-45 rounded-full bg-[#a758bc]" />
        <div className="absolute left-[75.45vw] top-[23.5vh] h-[.55vh] w-[1.1vw] origin-right rotate-45 rounded-full bg-[#db509e]" />
        <div className="absolute left-[75.45vw] top-[24.35vh] h-[.55vh] w-[1.1vw] origin-right -rotate-45 rounded-full bg-[#db509e]" />
        <div className="absolute left-[75.45vw] top-[31.9vh] h-[.55vh] w-[1.1vw] origin-right rotate-45 rounded-full bg-[#e26081]" />
        <div className="absolute left-[75.45vw] top-[32.75vh] h-[.55vh] w-[1.1vw] origin-right -rotate-45 rounded-full bg-[#e26081]" />
        <div className="absolute left-[75.45vw] top-[40.3vh] h-[.55vh] w-[1.1vw] origin-right rotate-45 rounded-full bg-[#ff775d]" />
        <div className="absolute left-[75.45vw] top-[41.15vh] h-[.55vh] w-[1.1vw] origin-right -rotate-45 rounded-full bg-[#ff775d]" />

        <div className="absolute right-0 top-[4.5vh] flex h-[5.7vh] w-[13.5vw] items-center rounded-[.7vw] border-[.12vw] border-[#d9deea] bg-white px-[1.2vw] text-[calc(1.55*var(--slide-vw))] font-semibold text-primary shadow-[0_.7vh_1.5vh_rgba(16,41,87,.08)]">
          Output one
        </div>
        <div className="absolute right-0 top-[12.9vh] flex h-[5.7vh] w-[13.5vw] items-center rounded-[.7vw] border-[.12vw] border-[#d9deea] bg-white px-[1.2vw] text-[calc(1.55*var(--slide-vw))] font-semibold text-primary shadow-[0_.7vh_1.5vh_rgba(16,41,87,.08)]">
          Output two
        </div>
        <div className="absolute right-0 top-[21.3vh] flex h-[5.7vh] w-[13.5vw] items-center rounded-[.7vw] border-[.12vw] border-[#d9deea] bg-white px-[1.2vw] text-[calc(1.55*var(--slide-vw))] font-semibold text-primary shadow-[0_.7vh_1.5vh_rgba(16,41,87,.08)]">
          Output three
        </div>
        <div className="absolute right-0 top-[29.7vh] flex h-[5.7vh] w-[13.5vw] items-center rounded-[.7vw] border-[.12vw] border-[#d9deea] bg-white px-[1.2vw] text-[calc(1.55*var(--slide-vw))] font-semibold text-primary shadow-[0_.7vh_1.5vh_rgba(16,41,87,.08)]">
          Output four
        </div>
        <div className="absolute right-0 top-[38.1vh] flex h-[5.7vh] w-[13.5vw] items-center rounded-[.7vw] border-[.12vw] border-[#d9deea] bg-white px-[1.2vw] text-[calc(1.55*var(--slide-vw))] font-semibold text-primary shadow-[0_.7vh_1.5vh_rgba(16,41,87,.08)]">
          Output five
        </div>
      </div>
    </div>
  );
}