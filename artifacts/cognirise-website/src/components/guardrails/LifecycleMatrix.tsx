import React, { useRef, useState } from "react";
import type { SetProveHoldGuardrailsContent } from "@workspace/api-zod";
import { MarkdownInline } from "./MarkdownInline";

type Matrix = SetProveHoldGuardrailsContent["lifecycleMatrix"];
type Stage = "set" | "prove" | "hold";

const stages: Stage[] = ["set", "prove", "hold"];
const stageAccent: Record<Stage, string> = {
  set: "var(--gf-accent-violet)",
  prove: "var(--gf-accent)",
  hold: "var(--gf-accent-coral)",
};
const layerAccent: Record<Matrix["rows"][number]["layerId"], string> = {
  policy: "var(--gf-ink)",
  prompt: "var(--gf-layer-prompt)",
  runtime: "var(--gf-layer-runtime)",
  architecture: "var(--gf-layer-arch)",
};

export function LifecycleMatrix({ matrix }: { matrix: Matrix }) {
  const [selected, setSelected] = useState({ row: 0, stage: "set" as Stage });
  const controls = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedRow = matrix.rows[selected.row] ?? matrix.rows[0];
  const selectedHeader = matrix.columnHeaders[stages.indexOf(selected.stage) + 1];
  const selectedText = selectedRow?.[selected.stage] ?? "";

  if (!selectedRow) return null;

  const focusCell = (row: number, stageIndex: number) => {
    const safeRow = (row + matrix.rows.length) % matrix.rows.length;
    const safeStage = (stageIndex + stages.length) % stages.length;
    setSelected({ row: safeRow, stage: stages[safeStage] });
    controls.current[safeRow * stages.length + safeStage]?.focus();
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, row: number, stageIndex: number) => {
    if (event.key === "ArrowRight") { event.preventDefault(); focusCell(row, stageIndex + 1); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); focusCell(row, stageIndex - 1); }
    else if (event.key === "ArrowDown") { event.preventDefault(); focusCell(row + 1, stageIndex); }
    else if (event.key === "ArrowUp") { event.preventDefault(); focusCell(row - 1, stageIndex); }
    else if (event.key === "Home") { event.preventDefault(); focusCell(0, 0); }
    else if (event.key === "End") { event.preventDefault(); focusCell(matrix.rows.length - 1, stages.length - 1); }
  };

  return (
    <div className="space-y-6" data-guardrails-tool="lifecycle-matrix">
      <div className="overflow-x-auto border border-[var(--gf-border)] bg-[var(--gf-surface)] shadow-sm relative z-10" aria-label="Lifecycle matrix. Select a layer and lifecycle stage to read its build, test, or re-test explanation.">
        <table className="w-full min-w-[50rem] table-fixed border-collapse text-left text-[length:var(--gf-text-sm)] sm:min-w-0">
          <thead>
            <tr className="border-b-2 border-[var(--gf-border)] bg-[var(--gf-bg)]">
              {matrix.columnHeaders.map((header, index) => {
                const stage = index > 0 ? stages[index - 1] : null;
                const columnSelected = stage === selected.stage;
                return (
                  <th
                    key={header}
                    scope="col"
                    className="p-4 md:p-5 align-bottom font-mono text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap transition-colors duration-300"
                    style={{
                      color: stage ? stageAccent[stage] : "var(--gf-ink-muted)",
                      backgroundColor: columnSelected ? "var(--gf-surface)" : "transparent",
                      boxShadow: columnSelected ? `inset 0 -3px 0 ${stageAccent[stage!]}` : undefined,
                    }}
                  >
                    <MarkdownInline text={header} />
                    {columnSelected && <span className="mt-2 block text-[9px] tracking-widest text-[var(--gf-ink-muted)]">Selected column</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row, rowIndex) => {
              const rowSelected = rowIndex === selected.row;
              return (
                <tr key={row.layerId} className="border-b border-[var(--gf-border)] last:border-0 group">
                  <th
                    scope="row"
                    className="p-4 md:p-5 align-top text-[length:var(--gf-text-base)] font-display tracking-tight font-bold transition-colors duration-300 relative"
                    style={{
                      color: layerAccent[row.layerId],
                      backgroundColor: rowSelected ? "var(--gf-surface)" : "var(--gf-bg)",
                    }}
                  >
                    {rowSelected && <div className="absolute inset-y-0 left-0 w-1 shadow-sm" style={{ backgroundColor: layerAccent[row.layerId] }} aria-hidden="true" />}
                    <div className="relative z-10">
                      <MarkdownInline text={row.layer} />
                      {rowSelected && <span className="mt-2 block font-mono text-[9px] uppercase tracking-wider text-[var(--gf-ink-muted)]">Selected row</span>}
                    </div>
                  </th>
                  {stages.map((stage, stageIndex) => {
                    const cellSelected = rowSelected && stage === selected.stage;
                    return (
                      <td
                        key={stage}
                        className="p-2 md:p-3 align-top transition-colors duration-300"
                        style={{ backgroundColor: rowSelected || stage === selected.stage ? "var(--gf-surface)" : "var(--gf-bg)" }}
                      >
                        <button
                          ref={(element) => { controls.current[rowIndex * stages.length + stageIndex] = element; }}
                          type="button"
                          data-guardrails-matrix-cell={`${row.layerId}-${stage}`}
                          aria-pressed={cellSelected}
                          aria-controls="guardrails-matrix-detail"
                          onClick={() => setSelected({ row: rowIndex, stage })}
                          onKeyDown={(event) => onKeyDown(event, rowIndex, stageIndex)}
                          className="relative h-full min-h-[5.5rem] w-full border p-4 text-left text-[length:var(--gf-text-sm)] leading-relaxed transition-all duration-300 motion-reduce:transition-none hover:border-[var(--gf-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] group-hover:bg-[var(--gf-surface)] overflow-hidden"
                          style={{
                            color: cellSelected ? "var(--gf-ink)" : "var(--gf-ink-muted)",
                            fontWeight: cellSelected ? 600 : 400,
                            borderColor: cellSelected ? stageAccent[stage] : "transparent",
                            backgroundColor: cellSelected ? "var(--gf-bg)" : "transparent",
                          }}
                        >
                          {cellSelected && <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: stageAccent[stage] }} aria-hidden="true" />}
                          <span className="relative z-10 block line-clamp-3">
                            <MarkdownInline text={row[stage]} />
                          </span>
                          {cellSelected && <span className="mt-3 block font-mono text-[9px] uppercase tracking-widest relative z-10" style={{ color: stageAccent[stage] }}>Selected cell</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section
        id="guardrails-matrix-detail"
        aria-live="polite"
        className="grid gap-6 lg:gap-10 border border-[var(--gf-border)] bg-[var(--gf-surface)] p-6 md:p-10 shadow-sm md:grid-cols-[14rem_minmax(0,1fr)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: stageAccent[selected.stage] }} aria-hidden="true" />
        <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.03] rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none" style={{ backgroundColor: stageAccent[selected.stage] }} aria-hidden="true" />
        
        <div className="relative z-10">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gf-ink-muted)] mb-4">Selected detail</p>
          <h3 className="font-display text-[length:var(--gf-h4)] font-bold text-[var(--gf-ink)] mb-2 tracking-tight"><MarkdownInline text={selectedRow.layer} /></h3>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--gf-border)] bg-[var(--gf-bg)] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageAccent[selected.stage] }} />
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: stageAccent[selected.stage] }}><MarkdownInline text={selectedHeader} /></p>
          </div>
        </div>
        <div className="relative z-10 border-l-[3px] border-[var(--gf-border)] pl-6 py-2 bg-gradient-to-r from-[var(--gf-bg)] to-transparent">
          <p className="text-[length:var(--gf-text-lg)] leading-relaxed text-[var(--gf-ink)] font-medium max-w-[45ch]"><MarkdownInline text={selectedText} /></p>
        </div>
      </section>
    </div>
  );
}