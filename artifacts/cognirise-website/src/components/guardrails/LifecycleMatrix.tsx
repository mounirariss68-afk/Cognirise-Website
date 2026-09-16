import React from "react";
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
  return (
    <div className="space-y-8" data-guardrails-tool="lifecycle-matrix">
      <div className="overflow-x-auto border border-[var(--gf-border)] shadow-sm bg-[var(--gf-surface)] rounded-xl" aria-label="Lifecycle matrix">
        <table className="w-full min-w-[55rem] table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--gf-border)]">
              {matrix.columnHeaders.map((header, index) => {
                const stage = index > 0 ? stages[index - 1] : null;
                return (
                  <th
                    key={header}
                    scope="col"
                    className="p-5 align-bottom text-[11px] font-bold uppercase tracking-[0.16em]"
                    style={{
                      color: stage ? stageAccent[stage] : "var(--gf-ink-muted)",
                    }}
                  >
                    <MarkdownInline text={header} />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.layerId} className="border-b border-[var(--gf-border)] last:border-0 hover:bg-[var(--gf-bg)] transition-colors">
                <th
                  scope="row"
                  className="p-5 align-top text-[15px] font-display font-semibold border-r border-[var(--gf-border)]"
                  style={{ color: layerAccent[row.layerId] }}
                >
                  <MarkdownInline text={row.layer} />
                </th>
                {stages.map((stage) => (
                  <td
                    key={stage}
                    className="p-5 align-top text-[14px] leading-[1.65] text-[var(--gf-ink)] border-r border-[var(--gf-border)] last:border-0"
                    data-guardrails-matrix-cell={`${row.layerId}-${stage}`}
                  >
                    <MarkdownInline text={row[stage]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
