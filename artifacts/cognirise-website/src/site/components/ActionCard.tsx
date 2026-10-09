import { useState } from "react";
import { PUBLIC_SECTOR_SERVICE } from "@/site/content/public-sector";

/**
 * One government service as a pre-filled card. A toggle switches between what
 * the owner sees and where each field comes from. The button on the card does
 * nothing; the caption says so once.
 */
export function ActionCard() {
  const { card, caption } = PUBLIC_SECTOR_SERVICE;
  const [view, setView] = useState<0 | 1>(0);
  const showSources = view === 1;

  return (
    <figure className="mt-10 max-w-[560px]">
      <div className="mb-4 inline-flex border border-[#102957] text-[12px] font-semibold" role="group" aria-label="Card view">
        {card.toggles.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={view === index}
            onClick={() => setView(index as 0 | 1)}
            className={`px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] ${view === index ? "bg-[#102957] text-white" : "bg-[#fdfcfb] text-[#102957] hover:bg-[#eef0f5]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="border border-[#102957] bg-white p-6 shadow-[0_18px_40px_rgba(16,41,87,0.08)]">
        <dl className="divide-y divide-[#cbd3e1]">
          {card.facts.map((fact) => (
            <div key={fact.label} className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-3">
              <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6f7d94]">{fact.label}</dt>
              <dd className="text-right text-[15px] font-medium text-[#102957]">
                {showSources ? <span className="text-[13px] font-normal text-[hsl(var(--brand-pink))]">{fact.from}</span> : fact.value}
              </dd>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-3">
            <dt className="text-[14px] text-[#102957]">{card.question.label}</dt>
            <dd className="text-right text-[15px] font-medium text-[#102957]">
              {showSources ? <span className="text-[13px] font-normal text-[hsl(var(--brand-pink))]">{card.question.from}</span> : card.question.value}
            </dd>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-3">
            <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6f7d94]">Fee</dt>
            <dd className="text-right font-display text-[20px] font-semibold text-[#102957]">
              {showSources ? <span className="font-sans text-[13px] font-normal text-[hsl(var(--brand-pink))]">{card.fee.from}</span> : card.fee.value}
            </dd>
          </div>
        </dl>
        <label className="mt-4 flex items-start gap-3 text-[13.5px] text-[#30486d]">
          <input type="checkbox" checked readOnly aria-label={card.declaration} className="mt-[3px] h-4 w-4 accent-[#102957]" />
          <span>{card.declaration}</span>
        </label>
        <div className="mt-5 inline-flex cursor-default select-none items-center bg-[#102957] px-5 py-3 text-[13px] font-semibold text-white" aria-hidden="true">
          {card.button}
        </div>
      </div>
      <figcaption className="mt-3 text-[12px] text-[#6f7d94]">{caption}</figcaption>
    </figure>
  );
}
