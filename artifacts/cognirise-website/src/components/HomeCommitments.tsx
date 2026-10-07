import { ArrowRight } from "lucide-react";

export const homeCommitments = [
  { before: "No man-days", after: "Outcomes" },
  { before: "No long pilots", after: "Prototypes in 48 hours" },
  { before: "No PowerPoints", after: "Working solutions" },
  { before: "No vendor lock-in", after: "You own the code" },
];

export function HomeCommitments() {
  return (
    <section id="home-commitments" className="home-layout-frame scroll-mt-28" aria-label="How Cognirise works">
      <div className="relative border-y border-[#102957] before:absolute before:inset-x-0 before:bottom-0 before:h-[2px] before:bg-gradient-to-r before:from-[hsl(var(--brand-violet))] before:via-[hsl(var(--brand-pink))] before:to-[hsl(var(--brand-coral))]">
        <ul className="grid grid-cols-2 lg:grid-cols-4">
          {homeCommitments.map(({ before, after }, index) => (
            <li key={before} className={`flex flex-col gap-4 px-4 py-7 sm:px-6 lg:py-8 border-[#102957]/15 ${index % 2 === 0 ? "border-r" : ""} ${index < 2 ? "border-b lg:border-b-0" : ""} lg:border-r lg:last:border-r-0`}>
              <p className="text-[13px] font-medium tracking-wide text-[#53627a]">{before}</p>
              <div className="flex items-start gap-2.5">
                <ArrowRight aria-hidden="true" className="mt-1 size-5 shrink-0 text-[hsl(var(--brand-pink))]" strokeWidth={1.5} />
                <p className="font-display text-[22px] font-semibold leading-[1.15] tracking-[-.035em] text-[#102957] sm:text-[25px]">{after}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
