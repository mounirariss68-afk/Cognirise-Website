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
    <div className="space-y-12" data-guardrails-tool="lifecycle-matrix">
      <div className="overflow-x-auto border border-[var(--gf-border)]" aria-label="Lifecycle matrix. Select a layer and lifecycle stage to read its build, test, or re-test explanation.">
        <table className="w-full min-w-[45rem] table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--gf-border)] bg-[var(--gf-surface)]">
              {matrix.columnHeaders.map((header, index) => {
                const stage = index > 0 ? stages[index - 1] : null;
                const columnSelected = stage === selected.stage;
                return (
                  <th
                    key={header}
                    scope="col"
                    className="p-4 align-bottom text-[11px] font-bold uppercase tracking-[0.16em] whitespace-nowrap"
                    style={{
                      color: stage ? stageAccent[stage] : "var(--gf-ink-muted)",
                      backgroundColor: columnSelected ? "var(--gf-bg)" : "transparent",
                    }}
                  >
                    <MarkdownInline text={header} />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row, rowIndex) => {
              const rowSelected = rowIndex === selected.row;
              return (
                <tr key={row.layerId} className="border-b border-[var(--gf-border)] last:border-0 group bg-[var(--gf-bg)]">
                  <th
                    scope="row"
                    className="p-4 align-top text-[16px] font-display font-semibold transition-colors"
                    style={{
                      color: layerAccent[row.layerId],
                      backgroundColor: rowSelected ? "var(--gf-surface)" : "transparent",
                    }}
                  >
                    <div className="relative z-10">
                      <MarkdownInline text={row.layer} />
                    </div>
                  </th>
                  {stages.map((stage, stageIndex) => {
                    const cellSelected = rowSelected && stage === selected.stage;
                    return (
                      <td
                        key={stage}
                        className="p-0 align-top transition-colors"
                        style={{ backgroundColor: rowSelected || stage === selected.stage ? "var(--gf-surface)" : "transparent" }}
                      >
                        <button
                          ref={(element) => { controls.current[rowIndex * stages.length + stageIndex] = element; }}
                          type="button"
                          data-guardrails-matrix-cell={`${row.layerId}-${stage}`}
                          aria-pressed={cellSelected}
                          aria-controls="guardrails-matrix-detail"
                          onClick={() => setSelected({ row: rowIndex, stage })}
                          onKeyDown={(event) => onKeyDown(event, rowIndex, stageIndex)}
                          className="relative h-full min-h-[5.5rem] w-full p-4 text-left text-[14px] leading-[1.5] transition-all hover:bg-[var(--gf-border)]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gf-accent)] focus-visible:outline-offset-[-2px] overflow-hidden"
                          style={{
                            color: cellSelected ? "var(--gf-ink)" : "var(--gf-ink-muted)",
                            fontWeight: cellSelected ? 600 : 400,
                            backgroundColor: cellSelected ? "var(--gf-bg)" : "transparent",
                          }}
                        >
                          {cellSelected && <div className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: stageAccent[stage] }} aria-hidden="true" />}
                          <span className="relative z-10 block line-clamp-3">
                            <MarkdownInline text={row[stage]} />
                          </span>
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
        className="grid gap-6 border-t border-[var(--gf-border)] pt-8 md:grid-cols-[14rem_minmax(0,1fr)]"
      >
        <div className="relative z-10">
          <h3 className="font-display text-[24px] font-semibold text-[var(--gf-ink)] mb-1 tracking-tight">
            <MarkdownInline text={selectedRow.layer} />
          </h3>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: stageAccent[selected.stage] }}>
            <MarkdownInline text={selectedHeader} />
          </p>
        </div>
        <div className="relative z-10 pl-6 border-l-2" style={{ borderColor: stageAccent[selected.stage] }}>
          <p className="text-[16px] leading-[1.65] text-[var(--gf-ink)] font-medium max-w-[45ch]">
            <MarkdownInline text={selectedText} />
          </p>
        </div>
      </section>
    </div>
  );
}