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
      <div className="overflow-x-auto border border-[var(--gf-border)] bg-[var(--gf-surface)]">
        <table className="w-full min-w-[38rem] table-fixed border-collapse text-left sm:min-w-0">
          <caption className="sr-only">Lifecycle matrix. Select a layer and lifecycle stage to read its build, test, or re-test explanation.</caption>
          <thead>
            <tr className="border-b-2 border-[var(--gf-border)] bg-white">
              {matrix.columnHeaders.map((header, index) => {
                const stage = index > 0 ? stages[index - 1] : null;
                const columnSelected = stage === selected.stage;
                return (
                  <th
                    key={header}
                    scope="col"
                    className="p-3 align-bottom font-mono text-[10px] font-bold uppercase tracking-wider md:p-4"
                    style={{
                      color: stage ? stageAccent[stage] : "var(--gf-ink-muted)",
                      backgroundColor: columnSelected ? "var(--gf-bg)" : undefined,
                      boxShadow: columnSelected ? `inset 0 -3px 0 ${stageAccent[stage!]}` : undefined,
                    }}
                  >
                    <MarkdownInline text={header} />
                    {columnSelected && <span className="mt-1 block text-[8px] tracking-widest text-[var(--gf-ink-muted)]">Selected column</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row, rowIndex) => {
              const rowSelected = rowIndex === selected.row;
              return (
                <tr key={row.layerId} className="border-b border-[var(--gf-border)] last:border-0">
                  <th
                    scope="row"
                    className="p-3 align-top text-[length:var(--gf-text-sm)] font-bold md:p-4"
                    style={{
                      color: layerAccent[row.layerId],
                      backgroundColor: rowSelected ? "var(--gf-bg)" : "white",
                      boxShadow: rowSelected ? `inset 3px 0 0 ${layerAccent[row.layerId]}` : undefined,
                    }}
                  >
                    <MarkdownInline text={row.layer} />
                    {rowSelected && <span className="mt-1 block font-mono text-[8px] uppercase tracking-wider text-[var(--gf-ink-muted)]">Selected row</span>}
                  </th>
                  {stages.map((stage, stageIndex) => {
                    const cellSelected = rowSelected && stage === selected.stage;
                    return (
                      <td
                        key={stage}
                        className="p-1 align-top md:p-2"
                        style={{ backgroundColor: rowSelected || stage === selected.stage ? "var(--gf-bg)" : "white" }}
                      >
                        <button
                          ref={(element) => { controls.current[rowIndex * stages.length + stageIndex] = element; }}
                          type="button"
                          data-guardrails-matrix-cell={`${row.layerId}-${stage}`}
                          aria-pressed={cellSelected}
                          aria-controls="guardrails-matrix-detail"
                          onClick={() => setSelected({ row: rowIndex, stage })}
                          onKeyDown={(event) => onKeyDown(event, rowIndex, stageIndex)}
                          className="h-full min-h-20 w-full border border-transparent p-2 text-left text-[length:var(--gf-text-sm)] leading-relaxed text-[var(--gf-ink-muted)] transition-colors motion-reduce:transition-none hover:border-[var(--gf-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)]"
                          style={{
                            color: cellSelected ? "var(--gf-ink)" : undefined,
                            fontWeight: cellSelected ? 600 : undefined,
                            borderColor: cellSelected ? stageAccent[stage] : undefined,
                            boxShadow: cellSelected ? `inset 3px 0 0 ${stageAccent[stage]}` : undefined,
                          }}
                        >
                          <MarkdownInline text={row[stage]} />
                          {cellSelected && <span className="mt-2 block font-mono text-[8px] uppercase tracking-widest" style={{ color: stageAccent[stage] }}>Selected cell</span>}
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
        className="grid gap-4 border border-[var(--gf-border)] bg-[var(--gf-surface)] p-5 shadow-sm md:grid-cols-[12rem_minmax(0,1fr)]"
        style={{ borderLeft: `4px solid ${stageAccent[selected.stage]}` }}
      >
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--gf-ink-muted)]">Selected build / test / re-test explanation</p>
          <h3 className="mt-2 font-display text-[length:var(--gf-h4)] font-bold text-[var(--gf-ink)]"><MarkdownInline text={selectedRow.layer} /></h3>
          <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: stageAccent[selected.stage] }}><MarkdownInline text={selectedHeader} /></p>
        </div>
        <p className="text-[length:var(--gf-text-base)] leading-relaxed text-[var(--gf-ink)]"><MarkdownInline text={selectedText} /></p>
      </section>
    </div>
  );
}