import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { METHODS_ARTICLES, METHODS_CLOSING, METHODS_HERO, METHODS_TOOLS } from "@/site/content/methods";
import { PageHero } from "@/site/components/PageHero";
import { ClosingBand } from "@/site/components/ClosingBand";
import { TableStyles } from "@/site/components/Tables";
import { Section, SectionHeading } from "@/site/components/Primitives";

export default function MethodsPage() {
  return (
    <div className="bg-[#fdfcfb] text-[#102957]">
      <PageHero {...METHODS_HERO} />

      <Section labelledBy="articles-heading">
        <SectionHeading id="articles-heading">{METHODS_ARTICLES.heading}</SectionHeading>
        <ul className="mt-8 divide-y divide-[#cbd3e1] border-y border-[#102957]">
          {METHODS_ARTICLES.items.map((article) => (
            <li key={article.href} className="grid gap-3 py-6 md:grid-cols-[1fr_120px] md:items-start md:gap-8">
              <div>
                <h3 className="font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.035em] text-[#102957]">
                  <Link href={article.href} className="group inline-flex items-start gap-2 hover:text-[hsl(var(--brand-pink))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">
                    {article.title}
                    <ArrowRight aria-hidden="true" size={16} className="mt-[7px] shrink-0 transition-transform group-hover:translate-x-1" />
                  </Link>
                </h3>
                <p className="mt-2 max-w-[700px] text-[15px] leading-[1.55] text-[#405777]">{article.body}</p>
              </div>
              <span className="text-[12px] font-semibold text-[#6f7d94] md:pt-2 md:text-right">{article.minutes} minutes</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="soft" labelledBy="tools-heading">
        <SectionHeading id="tools-heading">{METHODS_TOOLS.heading}</SectionHeading>
        <TableStyles />
        <table className="site-table mt-10">
          <thead>
            <tr>{METHODS_TOOLS.columns.map((column) => <th key={column} scope="col" className="border-y border-[#102957] px-4 py-4 text-left text-[9px] font-semibold uppercase tracking-[0.13em] text-[#6f7d94]">{column}</th>)}</tr>
          </thead>
          <tbody>
            {METHODS_TOOLS.items.map((tool) => (
              <tr key={tool.name}>
                <th scope="row" data-label="" className="border-b border-[#cbd3e1] px-4 py-5 text-left align-top">
                  <Link href={tool.href} className="group inline-flex items-start gap-2 font-display text-[17px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#102957] hover:text-[hsl(var(--brand-pink))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">
                    {tool.name}
                    <ArrowRight aria-hidden="true" size={15} className="mt-[3px] shrink-0 transition-transform group-hover:translate-x-1" />
                  </Link>
                </th>
                <td data-label={METHODS_TOOLS.columns[1]} className="border-b border-[#cbd3e1] px-4 py-5 align-top text-[14.5px] leading-[1.5] text-[#405777]">{tool.asks}</td>
                <td data-label={METHODS_TOOLS.columns[2]} className="border-b border-[#cbd3e1] px-4 py-5 align-top text-[14.5px] leading-[1.5] text-[#405777]">{tool.gives}</td>
                <td data-label={METHODS_TOOLS.columns[3]} className="border-b border-[#cbd3e1] px-4 py-5 align-top text-[14.5px] leading-[1.5] text-[#405777]">{tool.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 max-w-[640px] text-[14.5px] leading-[1.55] text-[#405777]">{METHODS_TOOLS.note}</p>
      </Section>

      <ClosingBand heading={METHODS_CLOSING.heading} body={METHODS_CLOSING.body} cta={METHODS_CLOSING.cta} watermark="METHODS" />
    </div>
  );
}
