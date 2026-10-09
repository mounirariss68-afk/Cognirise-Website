import type { ReactNode } from "react";
import type { EvidenceRow, UseCaseRow } from "@/site/content/types";
import { Tag } from "./Primitives";

const th = "border-y border-[#102957] px-4 py-4 text-left text-[9px] font-semibold uppercase tracking-[0.13em] text-[#6f7d94]";
const td = "border-b border-[#cbd3e1] px-4 py-5 align-top text-[14.5px] leading-[1.5] text-[#405777]";
const tdStrong = "border-b border-[#cbd3e1] px-4 py-5 align-top font-display text-[17px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#102957]";

/** Shared styles that turn a table into stacked cards on a phone. */
export function TableStyles() {
  return (
    <style>{`
      .site-table { width: 100%; border-collapse: collapse; }
      @media (max-width: 767px) {
        .site-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
        .site-table tr { display: block; border: 1px solid #cbd3e1; border-bottom: 0; padding: 14px 16px 6px; }
        .site-table tr:last-child { border-bottom: 1px solid #cbd3e1; }
        .site-table td, .site-table th { display: block; border: 0; padding: 0 0 12px; }
        .site-table td[data-label]:before, .site-table th[data-label]:before { content: attr(data-label); display: block; font-size: 9px; font-weight: 600; letter-spacing: .13em; text-transform: uppercase; color: #6f7d94; margin-bottom: 4px; }
        .site-table td[data-label=""]:before, .site-table th[data-label=""]:before { display: none; }
      }
    `}</style>
  );
}

/** "Where AI pays off": the task, what AI does, what the person decides, how it is measured. */
export function UseCaseTable({ rows, note }: { rows: UseCaseRow[]; note?: string }) {
  const columns = ["Task", "What AI does", "What the person decides", "How it is measured"];
  return (
    <div className="mt-10">
      <TableStyles />
      <table className="site-table">
        <thead>
          <tr>{columns.map((column) => <th key={column} scope="col" className={th}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.task}>
              <th scope="row" data-label="" className={tdStrong}>{row.task}</th>
              <td data-label={columns[1]} className={td}>{row.aiDoes}</td>
              <td data-label={columns[2]} className={td}>{row.personDecides}</td>
              <td data-label={columns[3]} className={td}>{row.measured}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="mt-5 max-w-[640px] text-[14.5px] leading-[1.55] text-[#405777]">{note}</p>}
    </div>
  );
}

/** "What others have reported": who, what, reported outcome, source with its tag. */
export function EvidenceTable({ rows, legend }: { rows: EvidenceRow[]; legend?: string }) {
  const columns = ["Who", "What", "Reported outcome", "Source"];
  return (
    <div className="mt-10">
      <TableStyles />
      {legend && <p className="mb-6 max-w-[720px] text-[13px] leading-[1.55] text-[#647491]">{legend}</p>}
      <table className="site-table">
        <thead>
          <tr>{columns.map((column) => <th key={column} scope="col" className={th}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.who}-${row.what}`}>
              <th scope="row" data-label="" className={tdStrong}>{row.who}</th>
              <td data-label={columns[1]} className={td}>{row.what}</td>
              <td data-label={columns[2]} className={td}>{row.outcome}</td>
              <td data-label={columns[3]} className={td}>
                {row.url
                  ? <a href={row.url} target="_blank" rel="noreferrer" className="underline decoration-[hsl(var(--brand-pink))]/40 underline-offset-4 hover:text-[hsl(var(--brand-pink))]">{row.source}</a>
                  : row.source}
                {". "}
                <Tag tag={row.tag} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A plain two- or three-column table of short text, used for the test, the situations and the lifecycle. */
export function TextTable({ columns, rows, firstColumnStrong = true, caption }: { columns: string[]; rows: string[][]; firstColumnStrong?: boolean; caption?: ReactNode }) {
  return (
    <div className="mt-10">
      <TableStyles />
      <table className="site-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>{columns.map((column, index) => <th key={`${column}-${index}`} scope="col" className={th}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, index) => index === 0
                ? <th key={index} scope="row" data-label="" className={firstColumnStrong ? tdStrong : td}>{cell}</th>
                : <td key={index} data-label={columns[index]} className={td}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
