import type { CSSProperties, ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import type { FigureTag } from "@/site/content/types";

/** Small label with the brand gradient dash, as used across the site today. */
export function Kicker({ children, className = "text-[#102957]" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] ${className}`}>
      <span aria-hidden="true" className="h-[2px] w-[23px] shrink-0 bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
      {children}
    </div>
  );
}

export function SectionHeading({ id, children, className = "", size = "md" }: { id?: string; children: ReactNode; className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "text-[clamp(28px,3vw,42px)]",
    md: "text-[clamp(34px,4vw,58px)]",
    lg: "text-[clamp(42px,5vw,72px)]",
  };
  return (
    <h2 id={id} className={`font-display font-semibold leading-[0.98] tracking-[-0.06em] text-[#102957] ${sizes[size]} ${className}`}>
      {children}
    </h2>
  );
}

export function Lead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`max-w-[640px] text-[17px] leading-[1.6] text-[#405777] ${className}`}>{children}</p>;
}

/** A page section with the site's outer rail, a top rule and vertical rhythm. */
export function Section({
  id,
  children,
  className = "",
  tone = "paper",
  rule = true,
  labelledBy,
  ariaLabel,
  style,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: "paper" | "soft" | "deep";
  rule?: boolean;
  labelledBy?: string;
  ariaLabel?: string;
  style?: CSSProperties;
}) {
  const tones = {
    paper: "bg-[#fdfcfb] text-[#102957]",
    soft: "bg-[#eef0f5] text-[#102957]",
    deep: "bg-[#102957] text-white",
  };
  return (
    <section id={id} className={`${tones[tone]} ${className}`} aria-labelledby={labelledBy} aria-label={ariaLabel} style={style}>
      <div className={`home-layout-frame py-[64px] lg:py-[96px] ${rule && tone !== "deep" ? "border-t border-[#cbd3e1]" : ""}`}>{children}</div>
    </section>
  );
}

/** Heading row: optional kicker, heading and an optional lead to the right on wide screens. */
export function SectionHead({ id, kicker, heading, lead, size = "md" }: { id: string; kicker?: string; heading: string; lead?: ReactNode; size?: "sm" | "md" | "lg" }) {
  return (
    <div className={`grid gap-6 ${lead ? "lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-[6vw]" : ""}`}>
      <div>
        {kicker && <Kicker>{kicker}</Kicker>}
        <SectionHeading id={id} size={size} className={kicker ? "mt-5" : ""}>{heading}</SectionHeading>
      </div>
      {lead && <div className="text-[16px] leading-[1.6] text-[#405777] lg:pb-1">{lead}</div>}
    </div>
  );
}

/** The figure tag from the legend, rendered in italics after a figure. */
export function Tag({ tag }: { tag: FigureTag }) {
  return <em className="whitespace-nowrap font-sans text-[12px] font-medium not-italic text-[hsl(var(--brand-pink))]">{tag}</em>;
}

export function ArrowLink({ href, children, className = "", inverse = false }: { href: string; children: ReactNode; className?: string; inverse?: boolean }) {
  const colour = inverse ? "text-white hover:text-white/80" : "text-[#102957] hover:text-[hsl(var(--brand-pink))]";
  const external = /^https?:\/\//.test(href);
  const inner = (
    <>
      {children}
      <ArrowRight aria-hidden="true" size={15} className="transition-transform group-hover:translate-x-1" />
    </>
  );
  const cls = `group inline-flex items-center gap-2 text-[14px] font-semibold underline decoration-[hsl(var(--brand-pink))]/40 underline-offset-4 transition-colors hover:decoration-[hsl(var(--brand-pink))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2 ${colour} ${className}`;
  return external
    ? <a href={href} className={cls} target="_blank" rel="noreferrer">{inner}</a>
    : <Link href={href} className={cls}>{inner}</Link>;
}

/** Numbered list of short cards: title plus one or two sentences. */
export function CardGrid({ items, columns = 3, numbered = false, titleAs = "h3" }: { items: { title: string; body: string }[]; columns?: 2 | 3 | 4; numbered?: boolean; titleAs?: "h3" | "strong" }) {
  const cols = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-2 xl:grid-cols-4" }[columns];
  return (
    <ul className={`mt-10 grid grid-cols-1 gap-px border border-[#cbd3e1] bg-[#cbd3e1] ${cols}`}>
      {items.map((item, index) => (
        <li key={item.title} className="flex flex-col gap-3 bg-[#fdfcfb] p-6 lg:p-7">
          {numbered && <span className="text-[10px] font-semibold tracking-[0.12em] text-[hsl(var(--brand-pink))]">0{index + 1}</span>}
          {titleAs === "h3"
            ? <h3 className="font-display text-[20px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#102957]">{item.title}</h3>
            : <strong className="font-display text-[20px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#102957]">{item.title}</strong>}
          <p className="text-[14.5px] leading-[1.55] text-[#405777]">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}

/** A plain bulleted list in the site's type. */
export function BulletList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`space-y-3 border-t border-[#102957] pt-5 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[15px] leading-[1.55] text-[#30486d]">
          <span aria-hidden="true" className="mt-[10px] h-[2px] w-[14px] shrink-0 bg-[hsl(var(--brand-pink))]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A numbered rule list: "1. …" items, each a sentence. */
export function RuleList({ items }: { items: string[] }) {
  return (
    <ol className="mt-8 border-t border-[#102957]">
      {items.map((item, index) => (
        <li key={item} className="grid grid-cols-[48px_1fr] gap-3 border-b border-[#cbd3e1] py-4 text-[15.5px] leading-[1.5] text-[#30486d]">
          <span className="text-[10px] font-semibold tracking-[0.12em] text-[hsl(var(--brand-pink))] pt-[6px]">0{index + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}
