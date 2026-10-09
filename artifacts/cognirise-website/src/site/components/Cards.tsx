import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { assetUrl } from "@/lib/assets";
import { PulseImage } from "@/components/ui/pulse-image";
import type { CaseCard, Cta, StatTile, Milestone } from "@/site/content/types";
import type { IndustryCard } from "@/site/content/industries-hub";
import { ArrowLink, Tag } from "./Primitives";

/** Case cards: the problem, what was built and the result, with the legend tag. */
export function CaseCards({ cards, columns = 2, link }: { cards: CaseCard[]; columns?: 2 | 3 | 4; link?: Cta }) {
  const cols = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-2 xl:grid-cols-4" }[columns];
  return (
    <div className="mt-10">
      <ul className={`grid grid-cols-1 gap-px border border-[#cbd3e1] bg-[#cbd3e1] ${cols}`}>
        {cards.map((card) => (
          <li key={card.title} className="flex flex-col gap-3 bg-[#fdfcfb] p-6 lg:p-7">
            {card.industry && <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f7d94]">{card.industry}</span>}
            <h3 className="font-display text-[19px] font-semibold leading-[1.2] tracking-[-0.03em] text-[#102957]">{card.title}</h3>
            <p className="text-[14.5px] leading-[1.55] text-[#405777]">{card.body}</p>
            <div className="mt-auto pt-2"><Tag tag={card.tag} /></div>
          </li>
        ))}
      </ul>
      {link && <div className="mt-6"><ArrowLink href={link.href}>{link.label}</ArrowLink></div>}
    </div>
  );
}

/** Industry cards on the hub and the home page: the existing card style with the industry image. */
export function IndustryCards({ cards, compact = false }: { cards: IndustryCard[]; compact?: boolean }) {
  return (
    <ul className={`mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 ${compact ? "xl:grid-cols-4" : "lg:grid-cols-3"}`}>
      {cards.map((card) => (
        <li key={card.slug} className="group relative flex flex-col overflow-hidden border border-[#cbd3e1] bg-[#fdfcfb]">
          <div className={`relative overflow-hidden bg-[#071936] ${compact ? "h-[150px]" : "h-[190px]"}`}>
            <PulseImage src={assetUrl(card.image)} alt={card.imageAlt} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071936]/55 via-transparent to-transparent" />
          </div>
          <div className="flex flex-1 flex-col gap-3 p-6">
            <h3 className="font-display text-[22px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#102957]">
              <Link href={card.href} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">{card.name}</Link>
            </h3>
            <p className="text-[14px] leading-[1.5] text-[#405777]">{card.line}</p>
            <div className="mt-auto flex items-center justify-between pt-2 text-[12px] font-semibold text-[#6f7d94]">
              <span>{card.cases}</span>
              <ArrowRight aria-hidden="true" size={15} className="text-[hsl(var(--brand-pink))] transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Three stat tiles: the figure, its label and its source. */
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <ul className="mt-8 grid grid-cols-1 gap-px border border-[#cbd3e1] bg-[#cbd3e1] md:grid-cols-3">
      {tiles.map((tile) => (
        <li key={tile.figure + tile.label} className="flex flex-col gap-2 bg-[#fdfcfb] p-6">
          <strong className="font-display text-[clamp(30px,3.2vw,44px)] font-semibold leading-none tracking-[-0.05em] text-[#102957]">{tile.figure}</strong>
          <span className="text-[14px] leading-[1.45] text-[#30486d]">{tile.label}</span>
          <span className="text-[11.5px] text-[#6f7d94]">{tile.source}</span>
        </li>
      ))}
    </ul>
  );
}

/** Four dated milestones with their sources. */
export function Timeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <ol className="mt-8 grid grid-cols-1 border-t border-[#102957] md:grid-cols-4">
      {milestones.map((m, index) => (
        <li key={m.period} className="flex flex-col gap-2 border-b border-[#cbd3e1] py-5 pr-5 md:border-b-0 md:border-r md:last:border-r-0 md:pl-5 md:first:pl-0">
          <span className="text-[10px] font-semibold tracking-[0.12em] text-[hsl(var(--brand-pink))]">0{index + 1}</span>
          <strong className="font-display text-[18px] font-semibold tracking-[-0.03em] text-[#102957]">{m.period}</strong>
          <p className="text-[14px] leading-[1.5] text-[#30486d]">{m.what}</p>
          <span className="text-[11.5px] text-[#6f7d94]">{m.source}</span>
        </li>
      ))}
    </ol>
  );
}
