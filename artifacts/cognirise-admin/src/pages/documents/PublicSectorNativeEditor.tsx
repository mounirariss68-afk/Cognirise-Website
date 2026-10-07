import React from "react";
import type { PublicSectorNative } from "@workspace/api-zod";
import { belongsToIndustrySection, isIndustrySectionId } from "@workspace/api-zod";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
// The manuscript topology is versioned. Editors change regional prose and
// evidence, not arbitrary HTML or the structural discriminator.
const EDITABLE = new Set(["text", "href", "caption", "title", "kicker", "issuer", "label", "value", "status", "consequence", "declaration", "actionLabel", "marketLabel", "researchDateQualification"]);
function Fields({ value, path, onChange, name = "" }: { value: Json; path: string; onChange: (value: Json) => void; name?: string }) {
  if (Array.isArray(value)) return <div className="space-y-3">{value.map((entry, index) => <Fields key={index} value={entry} path={`${path}.${index}`} name={name} onChange={next => onChange(value.map((current, i) => i === index ? next : current))} />)}</div>;
  if (value && typeof value === "object") return <div className="space-y-3">{Object.entries(value).map(([key, entry]) => <Fields key={key} value={entry} path={`${path}.${key}`} name={key} onChange={next => onChange({ ...value, [key]: next })} />)}</div>;
  if (typeof value !== "string" || !EDITABLE.has(name)) return null;
  return <label className="block text-sm" htmlFor={path}>
    <span className="font-medium">{name.replace(/([A-Z])/g, " $1")}</span>
    <code className="my-1 block break-all text-[10px] text-muted-foreground">{path}</code>
    <textarea id={path} data-field-path={path} className="min-h-20 w-full rounded border bg-background p-2" value={value} onChange={event => onChange(event.target.value)} />
  </label>;
}
export function PublicSectorNativeEditor({ value, onChange, section }: { value: PublicSectorNative; onChange: (value: PublicSectorNative) => void; section?: string }) {
  const show = (path: string) => !section || (isIndustrySectionId(section) && belongsToIndustrySection(path, section));
  return <section className="space-y-5" aria-label="AI-native government regional manuscript">
    <p className="text-sm text-muted-foreground">English edition: {value.marketLabel}. Illustrative cards do not collect personal data. Research dates are inherited; publication still validates this exact revision and its media.</p>
    {show("publicSectorNative.marketLabel") && <Fields value={value.marketLabel} name="marketLabel" path="content.publicSectorNative.marketLabel" onChange={next => onChange({ ...value, marketLabel: next as string })} />}
    {value.sections.map((item, index) => show(`publicSectorNative.sections.${index}`) && <fieldset key={item.id} className="space-y-4 rounded border p-4">
      <legend className="px-2 font-semibold">{item.title}</legend>
      <Fields value={item as unknown as Json} path={`content.publicSectorNative.sections.${index}`} onChange={next => onChange({ ...value, sections: value.sections.map((current, i) => i === index ? next as unknown as typeof item : current) })} />
    </fieldset>)}
    {show("publicSectorNative.researchDateQualification") && <Fields value={value.researchDateQualification} name="researchDateQualification" path="content.publicSectorNative.researchDateQualification" onChange={next => onChange({ ...value, researchDateQualification: next as string })} />}
    {show("publicSectorNative.reviewBlockers") && <label className="block text-sm">Current unresolved review blockers (one per line)
      <textarea className="min-h-24 w-full rounded border bg-background p-2" data-field-path="content.publicSectorNative.reviewBlockers" value={value.reviewBlockers.join("\n")} onChange={event => onChange({ ...value, reviewBlockers: event.target.value.split("\n").map(line => line.trim()).filter(Boolean) })} />
    </label>}
  </section>;
}
