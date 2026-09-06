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

      <svg
        viewBox="0 0 1728 650"
        className="relative mt-[2.5vh] h-[60vh] w-full"
        role="img"
        aria-label="Five labeled inputs converge into a central orchestration core and emerge as five labeled outputs"
      >
        <defs>
          <linearGradient id="cfEnergy" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7b5cd6" />
            <stop offset="0.52" stopColor="#db509e" />
            <stop offset="1" stopColor="#ef765f" />
          </linearGradient>
          <linearGradient id="cfCore" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#18366d" />
            <stop offset="1" stopColor="#102957" />
          </linearGradient>
          <marker id="cfArrowViolet" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0 1L9 5L0 9Z" fill="#7b5cd6" />
          </marker>
          <marker id="cfArrowMagenta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0 1L9 5L0 9Z" fill="#db509e" />
          </marker>
          <marker id="cfArrowCoral" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0 1L9 5L0 9Z" fill="#ef765f" />
          </marker>
          <filter id="cfShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#102957" floodOpacity=".18" />
          </filter>
        </defs>

        <text x="18" y="25" fontSize="25" fontWeight="700" letterSpacing="3" fill="#60708d">INPUTS</text>
        <text x="1710" y="25" textAnchor="end" fontSize="25" fontWeight="700" letterSpacing="3" fill="#60708d">OUTPUTS</text>

        <rect x="0" y="59" width="250" height="68" rx="12" fill="#ffffff" stroke="#d9deea" strokeWidth="2" />
        <text x="24" y="102" fontSize="27" fontWeight="600" fill="#102957">Input one</text>
        <rect x="0" y="170" width="250" height="68" rx="12" fill="#ffffff" stroke="#d9deea" strokeWidth="2" />
        <text x="24" y="213" fontSize="27" fontWeight="600" fill="#102957">Input two</text>
        <rect x="0" y="281" width="250" height="68" rx="12" fill="#ffffff" stroke="#d9deea" strokeWidth="2" />
        <text x="24" y="324" fontSize="27" fontWeight="600" fill="#102957">Input three</text>
        <rect x="0" y="392" width="250" height="68" rx="12" fill="#ffffff" stroke="#d9deea" strokeWidth="2" />
        <text x="24" y="435" fontSize="27" fontWeight="600" fill="#102957">Input four</text>
        <rect x="0" y="503" width="250" height="68" rx="12" fill="#ffffff" stroke="#d9deea" strokeWidth="2" />
        <text x="24" y="546" fontSize="27" fontWeight="600" fill="#102957">Input five</text>

        <path d="M250 93H420C535 93 585 205 704 265" fill="none" stroke="#7b5cd6" strokeWidth="8" markerEnd="url(#cfArrowViolet)" />
        <path d="M250 204H455C555 204 600 260 704 292" fill="none" stroke="#a758bc" strokeWidth="8" markerEnd="url(#cfArrowViolet)" />
        <path d="M250 315H704" fill="none" stroke="#db509e" strokeWidth="8" markerEnd="url(#cfArrowMagenta)" />
        <path d="M250 426H455C555 426 600 370 704 338" fill="none" stroke="#e26081" strokeWidth="8" markerEnd="url(#cfArrowCoral)" />
        <path d="M250 537H420C535 537 585 425 704 365" fill="none" stroke="#ef765f" strokeWidth="8" markerEnd="url(#cfArrowCoral)" />

        <rect x="718" y="193" width="292" height="244" rx="34" fill="url(#cfCore)" filter="url(#cfShadow)" />
        <rect x="742" y="217" width="244" height="196" rx="24" fill="none" stroke="url(#cfEnergy)" strokeWidth="4" />
        <circle cx="864" cy="274" r="23" fill="#db509e" />
        <path d="M850 274H878M864 260V288" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <text x="864" y="338" textAnchor="middle" fontSize="29" fontWeight="700" letterSpacing="1.5" fill="#ffffff">ORCHESTRATION</text>
        <text x="864" y="376" textAnchor="middle" fontSize="25" fill="#dce4f0">Central element</text>

        <path d="M1024 265C1143 205 1193 93 1308 93H1478" fill="none" stroke="#7b5cd6" strokeWidth="8" markerEnd="url(#cfArrowViolet)" />
        <path d="M1024 292C1128 260 1173 204 1273 204H1478" fill="none" stroke="#a758bc" strokeWidth="8" markerEnd="url(#cfArrowViolet)" />
        <path d="M1024 315H1478" fill="none" stroke="#db509e" strokeWidth="8" markerEnd="url(#cfArrowMagenta)" />
        <path d="M1024 338C1128 370 1173 426 1273 426H1478" fill="none" stroke="#e26081" strokeWidth="8" markerEnd="url(#cfArrowCoral)" />
        <path d="M1024 365C1143 425 1193 537 1308 537H1478" fill="none" stroke="#ef765f" strokeWidth="8" markerEnd="url(#cfArrowCoral)" />

        <rect x="1478" y="59" width="250" height="68" rx="12" fill="#ffffff" stroke="#d9deea" strokeWidth="2" />
        <text x="1502" y="102" fontSize="27" fontWeight="600" fill="#102957">Output one</text>
        <rect x="1478" y="170" width="250" height="68" rx="12" fill="#ffffff" stroke="#d9deea" strokeWidth="2" />
        <text x="1502" y="213" fontSize="27" fontWeight="600" fill="#102957">Output two</text>
        <rect x="1478" y="281" width="250" height="68" rx="12" fill="#ffffff" stroke="#d9deea" strokeWidth="2" />
        <text x="1502" y="324" fontSize="27" fontWeight="600" fill="#102957">Output three</text>
        <rect x="1478" y="392" width="250" height="68" rx="12" fill="#ffffff" stroke="#d9deea" strokeWidth="2" />
        <text x="1502" y="435" fontSize="27" fontWeight="600" fill="#102957">Output four</text>
        <rect x="1478" y="503" width="250" height="68" rx="12" fill="#ffffff" stroke="#d9deea" strokeWidth="2" />
        <text x="1502" y="546" fontSize="27" fontWeight="600" fill="#102957">Output five</text>
      </svg>
    </div>
  );
}