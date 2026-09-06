const base = import.meta.env.BASE_URL;

type HumanAgentTeamProps = {
  illustrationSide?: "left" | "right";
};

export function HumanAgentTeamLayout({ illustrationSide = "right" }: HumanAgentTeamProps) {
  const isRight = illustrationSide === "right";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg">
      <div
        className={
          isRight
            ? "absolute inset-0 bg-[radial-gradient(circle_at_74%_50%,rgba(219,80,158,0.11),transparent_28%)]"
            : "absolute inset-0 bg-[radial-gradient(circle_at_26%_50%,rgba(219,80,158,0.11),transparent_28%)]"
        }
      />
      <div
        className={
          isRight
            ? "absolute left-[73%] top-1/2 h-[76vh] w-[44vw] -translate-x-1/2 -translate-y-1/2 rounded-full border-[.16vw] border-[#7659df]/20"
            : "absolute left-[27%] top-1/2 h-[76vh] w-[44vw] -translate-x-1/2 -translate-y-1/2 rounded-full border-[.16vw] border-[#7659df]/20"
        }
      />
      <div
        className={
          isRight
            ? "absolute left-[73%] top-1/2 h-[66vh] w-[38vw] -translate-x-1/2 -translate-y-1/2 rounded-full border-[.16vw] border-[#db509e]/20"
            : "absolute left-[27%] top-1/2 h-[66vh] w-[38vw] -translate-x-1/2 -translate-y-1/2 rounded-full border-[.16vw] border-[#db509e]/20"
        }
      />
      <div
        className={
          isRight
            ? "absolute left-[73%] top-[12vh] h-[.58vh] w-[8vw] -translate-x-1/2 rounded-full bg-[#7659df]"
            : "absolute left-[27%] top-[12vh] h-[.58vh] w-[8vw] -translate-x-1/2 rounded-full bg-[#7659df]"
        }
      />
      <div
        className={
          isRight
            ? "absolute left-[73%] top-[14vh] h-[.58vh] w-[8vw] -translate-x-1/2 rounded-full bg-[#db509e]"
            : "absolute left-[27%] top-[14vh] h-[.58vh] w-[8vw] -translate-x-1/2 rounded-full bg-[#db509e]"
        }
      />
      <div
        className={
          isRight
            ? "absolute left-[73%] top-[16vh] h-[.58vh] w-[8vw] -translate-x-1/2 rounded-full bg-[#ff775d]"
            : "absolute left-[27%] top-[16vh] h-[.58vh] w-[8vw] -translate-x-1/2 rounded-full bg-[#ff775d]"
        }
      />
      <img
        src={`${base}images/human-ai-split-portrait.png`}
        crossOrigin="anonymous"
        alt="Head-and-shoulders portrait with a human left half and robotic right half"
        className={
          isRight
            ? "absolute left-[73%] top-1/2 h-[76vh] w-[44vw] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_2.2vh_2.8vh_rgba(16,41,87,.18)]"
            : "absolute left-[27%] top-1/2 h-[76vh] w-[44vw] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_2.2vh_2.8vh_rgba(16,41,87,.18)]"
        }
      />
    </div>
  );
}

export default function HumanAgentTeam() {
  return <HumanAgentTeamLayout illustrationSide="right" />;
}