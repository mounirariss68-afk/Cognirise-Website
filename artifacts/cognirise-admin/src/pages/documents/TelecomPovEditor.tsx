import { belongsToIndustrySection, isIndustrySectionId } from "@workspace/api-zod";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
const label = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

/** Every control names the exact saved path. Arrays retain their stable order;
 * inventory changes are deliberate rather than silently regenerating metrics. */
function NodeEditor({ value, path, onChange }: { value: Json; path: string; onChange: (value: Json) => void }) {
  const key = path.split(".").at(-1)!;
  if (Array.isArray(value)) return <fieldset className="space-y-3 border-l pl-3">
    <legend className="text-sm font-semibold">{label(key)}</legend>
    {value.map((row, i) => <details key={i} className="rounded border p-3" open={typeof row !== "object"}>
      <summary className="cursor-pointer text-sm">{typeof row === "object" && row && !Array.isArray(row) ? String(row.title || row.name || row.id || `Item ${i + 1}`) : `Item ${i + 1}`}</summary>
      <NodeEditor value={row} path={`${path}.${i}`} onChange={next => onChange(value.map((old, index) => index === i ? next : old))} />
      {["reviewBlockers", "metricIds"].includes(key) && <button type="button" className="mt-2 text-sm underline" onClick={() => onChange(value.filter((_, index) => index !== i))}>Remove item</button>}
    </details>)}
    {["reviewBlockers", "metricIds"].includes(key) && <button type="button" className="text-sm underline" onClick={() => onChange([...value, ""])}>Add item</button>}
  </fieldset>;
  if (value && typeof value === "object") return <div className="space-y-3 pt-3">{Object.entries(value).map(([k, v]) =>
    k === "version" ? <p key={k} className="text-xs">Telecom POV version {String(v)}</p> :
      <NodeEditor key={k} value={v} path={`${path}.${k}`} onChange={next => {
        const result = { ...value, [k]: next };
        if (k === "classification") {
          if (next === "reported" && !result.source) result.source = { url: "", operator: "", date: "", scope: "", measurementBasis: "", attribution: "" };
          if (next !== "reported") delete result.source;
          if (next === "unresolved") delete result.value;
          else if (!result.value) result.value = "";
        }
        onChange(result);
      }} />
  )}</div>;
  const options = key === "classification" ? ["reported", "target", "unresolved"] : key === "domain" ? ["Business", "Operations", "Foundations"] : null;
  return <label className="block text-sm" htmlFor={path}>
    <span className="font-medium">{label(key)}</span>
    <code className="my-1 block break-all text-[10px] text-muted-foreground">{path}</code>
    {options ? <select id={path} data-field-path={path} className="w-full rounded border bg-background p-2" value={String(value)} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select>
      : typeof value === "number" ? <input id={path} data-field-path={path} type="number" className="w-full rounded border bg-background p-2" value={value} onChange={e => onChange(Number(e.target.value))} />
      : <textarea id={path} data-field-path={path} className="min-h-20 w-full rounded border bg-background p-2" value={String(value ?? "")} onChange={e => onChange(e.target.value)} />}
  </label>;
}

export function TelecomPovEditor({ value, onChange, section }: {
  value: Record<string, Json>; onChange: (value: Record<string, Json>) => void; section?: string;
}) {
  return <section className="space-y-5" aria-label="Telecom POV fields">
    <p className="text-sm text-muted-foreground">Illustrative workflows, not delivered agents. Each metric is defined once in Sources and reused by ID. Clearing a review blocker is an editorial decision, not evidence creation.</p>
    {Object.entries(value).filter(([key]) => key !== "version" && (!section || (isIndustrySectionId(section) && belongsToIndustrySection(`telecomPov.${key}`, section)))).map(([key, entry]) =>
      <NodeEditor key={key} value={entry} path={`content.telecomPov.${key}`} onChange={next => onChange({ ...value, [key]: next })} />)}
  </section>;
}
