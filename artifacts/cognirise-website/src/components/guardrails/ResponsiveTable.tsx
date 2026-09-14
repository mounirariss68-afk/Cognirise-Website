import * as React from "react";
import { MarkdownInline } from "./MarkdownInline";

interface ResponsiveTableProps {
  headers: string[];
  rows: Array<{ id: string; [key: string]: any }>;
  rowColors?: Record<string, string>;
  columns: Array<{ key: string; isBold?: boolean }>;
}

export function ResponsiveTable({ headers, rows, rowColors, columns }: ResponsiveTableProps) {
  return (
    <div className="w-full">
      {/* Desktop View */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-[var(--gf-ink)]">
              {headers.map((header, i) => (
                <th key={i} className="p-4 font-bold text-[length:var(--gf-text-xs)] uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-ink-muted)]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--gf-border)] hover:bg-[var(--gf-surface)] transition-colors">
                {columns.map((col, cIdx) => (
                  <td
                    key={col.key}
                    className={`break-words p-4 align-top text-[length:var(--gf-text-sm)] leading-relaxed ${
                      col.isBold ? "font-bold" : "text-[var(--gf-ink-muted)]"
                    }`}
                    style={col.isBold && rowColors && rowColors[row.id] ? { color: rowColors[row.id] } : {}}
                  >
                    <MarkdownInline text={row[col.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden flex flex-col gap-6">
        {rows.map((row) => (
          <div key={row.id} className="border border-[var(--gf-border)] bg-[var(--gf-surface)] p-4 flex flex-col gap-4 shadow-sm">
            {columns.map((col, cIdx) => (
              <div key={col.key} className={cIdx !== 0 ? "border-t border-[var(--gf-border)] pt-3" : ""}>
                <span className="text-[length:var(--gf-text-kicker)] font-bold uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-ink-muted)] block mb-1">
                  {headers[cIdx]}
                </span>
                <div
                  className={`break-words text-[length:var(--gf-text-sm)] leading-relaxed ${
                    col.isBold ? "font-bold text-[length:var(--gf-text-base)]" : "text-[var(--gf-ink)]"
                  }`}
                  style={col.isBold && rowColors && rowColors[row.id] ? { color: rowColors[row.id] } : {}}
                >
                  <MarkdownInline text={row[col.key]} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
