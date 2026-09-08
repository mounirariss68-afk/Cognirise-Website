import { useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { assetUrl } from "@/lib/assets";

const stages = [
  {
    id: 1,
    num: "01",
    title: "Innovate",
    subtitle: "Spot the value",
    time: "1 day",
    tagline: "Don’t boil the ocean.",
    description:
      "Frame the highest-value opportunity and the decision it needs to unlock. We keep discovery deliberately narrow so effort moves toward proof, not an expanding scope.",
    outcome: "A prioritised opportunity and a clear decision boundary.",
    accent: "#7659df",
    image: "/images/cognirise/blueprint-innovate.jpg",
    imageAlt:
      "A mixed client and Cognirise team prioritising opportunities together around a workshop table.",
    imagePosition: "50% 48%",
  },
  {
    id: 2,
    num: "02",
    title: "Demonstrate",
    subtitle: "Prototype",
    time: "48 hours",
    tagline: "See it before you buy it.",
    description:
      "In 48 hours, stakeholders get a tangible, decision-ready prototype they can see and test—enough to validate value and direction before committing to a larger build.",
    outcome: "A working proof stakeholders can test, challenge and decide on.",
    accent: "#db509e",
    highlight: true,
    image: "/images/cognirise/blueprint-demonstrate.jpg",
    imageAlt:
      "A client team closely testing a working prototype on a large tablet in a bright studio.",
    imagePosition: "50% 45%",
  },
  {
    id: 3,
    num: "03",
    title: "Activate",
    subtitle: "Build the solution",
    time: "2–4 weeks (MVP)",
    tagline: "Human judgement. Agent scale.",
    description:
      "Forward-deployed engineers turn the validated direction into a governed MVP, combining accountable human judgement with the speed and scale of agents.",
    outcome: "A usable MVP with the engineering and controls needed to operate.",
    accent: "#e74f91",
    image: "/images/cognirise/blueprint-activate.jpg",
    imageAlt:
      "Client operators overseeing governed software running in a live automated production facility.",
    imagePosition: "50% 52%",
  },
  {
    id: 4,
    num: "04",
    title: "Operate",
    subtitle: "Scale & operationalize",
    time: "4–12 weeks",
    tagline: "No lock-in. Full ownership.",
    description:
      "We harden the capability, transfer the operating knowledge and leave it in your environment. Your team owns the system and the path to scale it.",
    outcome: "A client-owned capability, operating model and scale plan.",
    accent: "#ff775d",
    image: "/images/cognirise/blueprint-operate.jpg",
    imageAlt:
      "Client leaders transferring ownership as connected teams work across a multi-level operations hub.",
    imagePosition: "50% 48%",
  },
];

export function BlueprintJourney() {
  const [activeStage, setActiveStage] = useState(2);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reducedMotion = useReducedMotion();
  const active = stages[activeStage - 1];

  const selectAdjacent = (
    event: KeyboardEvent<HTMLButtonElement>,
    id: number,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setActiveStage(2);
      buttonRefs.current[1]?.focus();
      return;
    }

    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const backwards = event.key === "ArrowLeft" || event.key === "ArrowUp";
    const next = backwards ? (id === 1 ? 4 : id - 1) : id === 4 ? 1 : id + 1;
    setActiveStage(next);
    buttonRefs.current[next - 1]?.focus();
  };

  return (
    <section
      id="delivery-blueprint"
      className="bg-[#fdfcfb] px-6 py-[82px] md:px-[4.8vw] lg:py-[125px]"
      aria-labelledby="blueprint-heading"
    >
      <div className="grid grid-cols-1 gap-8 border-t border-[#102957] pt-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-[7vw]">
        <div>
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#102957]">
            <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
            Delivery blueprint
          </div>
          <h2
            id="blueprint-heading"
            className="mt-5 max-w-[760px] font-display text-[clamp(42px,5vw,72px)] font-semibold leading-[0.97] tracking-[-0.08em]"
            style={{ fontSize: "clamp(42px, 5vw, 72px)" }}
          >
            From a sharp question to{" "}
            <em className="not-italic text-[hsl(var(--brand-pink))]">
              operational value.
            </em>
          </h2>
        </div>
        <div className="self-end border-t border-[#cbd3e1] pt-6">
          <p className="m-0 max-w-[470px] text-[16px] leading-[1.6] text-[#405777]">
            Four controlled stages turn intent into something leaders can see,
            test and own. The pivotal moment comes early: a decision-ready
            prototype in 48 hours.
          </p>
        </div>
      </div>

      <div
        className="mt-12 lg:mt-[72px]"
        onMouseLeave={() => setActiveStage(2)}
      >
        <div
          className="grid grid-cols-2 border-y border-[#102957] lg:grid-cols-4"
          role="tablist"
          aria-label="Cognirise delivery stages"
        >
          {stages.map((stage, index) => {
            const selected = stage.id === activeStage;
            return (
              <button
                key={stage.id}
                ref={(node) => {
                  buttonRefs.current[index] = node;
                }}
                type="button"
                id={`blueprint-tab-${stage.id}`}
                role="tab"
                aria-selected={selected}
                aria-controls="blueprint-detail"
                tabIndex={selected ? 0 : -1}
                onMouseEnter={() => setActiveStage(stage.id)}
                onFocus={() => setActiveStage(stage.id)}
                onClick={() => setActiveStage(stage.id)}
                onKeyDown={(event) => selectAdjacent(event, stage.id)}
                className={`relative min-h-[104px] border-[#cbd3e1] px-3 py-5 text-left outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--brand-coral))] sm:px-5 lg:min-h-[92px] lg:border-r lg:px-6 lg:last:border-r-0 ${
                  index % 2 === 0 ? "border-r" : ""
                } ${index < 2 ? "border-b lg:border-b-0" : ""} ${
                  selected ? "bg-[#f4f1fb]" : "hover:bg-[#f8f6fa]"
                }`}
              >
                <span
                  className="block text-[10px] font-bold tracking-[0.12em]"
                  style={{ color: stage.accent }}
                >
                  {stage.num}
                </span>
                <span className="mt-2 block font-display text-[17px] font-semibold leading-none tracking-[-0.045em] text-[#102957] lg:text-[22px]">
                  {stage.title}
                </span>
                <span className="mt-2 block text-[11px] leading-tight text-[#647491] lg:hidden">
                  {stage.subtitle}
                </span>
                <span
                  className={`absolute inset-x-0 bottom-0 h-[3px] ${
                    selected || stage.highlight ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    background: stage.highlight
                      ? "linear-gradient(90deg, #7659df, #db509e)"
                      : stage.accent,
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-7 grid grid-cols-2 gap-1.5 overflow-hidden bg-[#f8f5f1] sm:gap-2 lg:grid-cols-4 lg:gap-1">
          {stages.map((stage) => {
            const selected = stage.id === activeStage;
            return (
              <figure
                key={stage.id}
                onMouseEnter={() => setActiveStage(stage.id)}
                onClick={() => setActiveStage(stage.id)}
                className={`group relative m-0 min-h-[210px] cursor-pointer overflow-hidden bg-[#102957] sm:min-h-[260px] lg:min-h-[360px] ${
                  selected ? "z-10" : ""
                }`}
              >
                <motion.img
                  src={assetUrl(stage.image)}
                  alt={stage.imageAlt}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  animate={{
                    scale: selected && !reducedMotion ? 1.025 : 1,
                    opacity: selected ? 1 : 0.78,
                  }}
                  transition={{ duration: reducedMotion ? 0 : 0.45 }}
                  className="absolute inset-0 h-full w-full select-none object-cover"
                  style={{ objectPosition: stage.imagePosition }}
                />
                <div
                  className={`pointer-events-none absolute inset-0 transition-opacity ${
                    selected ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    boxShadow: `inset 0 -5px 0 ${stage.accent}, inset 0 0 0 1px rgba(255,255,255,.35)`,
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071936]/35 via-transparent to-white/5" />
              </figure>
            );
          })}
        </div>

        <div className="relative mt-5 grid grid-cols-4 items-start gap-0" aria-label="Delivery timing">
          <div
            className="absolute left-[6%] right-[6%] top-[7px] h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, #1765dd 0%, #7659df 32%, #db509e 65%, #ff775d 100%)",
            }}
          />
          {stages.map((stage) => (
            <div key={stage.id} className="relative px-1 text-center">
              <span
                className={`mx-auto mb-3 block h-4 w-4 rounded-full border-[4px] border-[#fdfcfb] ${
                  stage.highlight
                    ? "scale-125 shadow-[0_0_0_3px_rgba(219,80,158,0.18)]"
                    : "bg-[#102957]"
                }`}
                style={stage.highlight ? { backgroundColor: stage.accent } : undefined}
              />
              <span
                className={`block text-[9px] font-bold leading-tight sm:text-[11px] lg:text-[12px] ${
                  stage.highlight ? "text-[#a82d78]" : "text-[#536887]"
                }`}
              >
                {stage.time}
              </span>
            </div>
          ))}
        </div>

        <div
          id="blueprint-detail"
          role="tabpanel"
          aria-labelledby={`blueprint-tab-${active.id}`}
          className="mt-9 min-h-[230px] border-t border-[#102957] pt-7 lg:min-h-[180px]"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reducedMotion ? 0 : 0.22 }}
              className="grid grid-cols-1 gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:gap-[7vw]"
            >
              <div>
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: active.accent }}
                >
                  {active.num} / {active.time}
                </span>
                <h3 className="mt-3 font-display text-[clamp(27px,3vw,44px)] font-semibold leading-[1.02] tracking-[-0.065em] text-[#102957]">
                  {active.tagline}
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-5 border-t border-[#cbd3e1] pt-5 sm:grid-cols-[1.25fr_0.75fr]">
                <p className="m-0 text-[15px] leading-[1.65] text-[#405777]">
                  {active.description}
                </p>
                <div>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#77859c]">
                    What you have in hand
                  </span>
                  <p className="mb-0 mt-2 text-[12px] font-semibold leading-[1.5] text-[#102957]">
                    {active.outcome}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}