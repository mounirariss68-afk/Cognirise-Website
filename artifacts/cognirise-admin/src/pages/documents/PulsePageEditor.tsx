import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { cognibasePulsePageSchema, cogniagentsPulsePageSchema } from "@workspace/api-zod";

type Page = Record<string, any>;
type Pane = "hero" | "diagram" | "proof" | "sections" | "closing";
const panes: { id: Pane; title: string }[] = [
  { id: "hero", title: "01 · Hero" }, { id: "diagram", title: "02 · Diagram" },
  { id: "proof", title: "03 · Proof" }, { id: "sections", title: "04 · Sections" },
  { id: "closing", title: "05 · Closing" },
];
const labelize = (text: string) => text.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("-", " ");
const fieldId = (path: string) => `content-${path.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

export function PulsePageEditor({ page, onChange, errors }: {
  page: Page; onChange: (page: Page) => void; errors: string[];
}) {
  // The draft contract accepts partial pages and its union may collapse nested
  // errors to "Invalid input". Validate against the selected full-page schema
  // here so authors can reach the precise field before requesting review.
  const result = (page.variant === "cogniagents-pulse" ? cogniagentsPulsePageSchema : cognibasePulsePageSchema).safeParse(page);
  const pageIssues = result.success ? [] : result.error.issues.map((issue) => `pulsePage.${issue.path.join(".")}: ${issue.message}`);
  const allErrors = [...new Set([...errors, ...pageIssues])];
  const [pane, setPane] = useState<Pane>("hero");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const order: string[] = page.sectionOrder ?? [];
  const sectionId = selectedId && order.includes(selectedId) ? selectedId : order[0];
  const sectionIndex = (page.sections ?? []).findIndex((item: Page) => item.id === sectionId);
  const section = page.sections?.[sectionIndex];

  const update = (path: (string | number)[], value: unknown) => {
    const next = structuredClone(page);
    let node: any = next;
    for (const part of path.slice(0, -1)) node = node[part];
    node[path[path.length - 1]] = value;
    onChange(next);
  };
  const field = (label: string, path: (string | number)[], multiline = false, optional = false) => {
    const key = `pulsePage.${path.join(".")}`;
    const value = path.reduce<any>((node, part) => node?.[part], page) ?? "";
    const issue = allErrors.find((error) => error.startsWith(`${key}:`))?.split(":").slice(1).join(":").trim();
    return <div className="space-y-1.5" key={key}>
      <Label htmlFor={fieldId(key)} className="text-xs font-medium">{label}{optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}</Label>
      {multiline
        ? <Textarea id={fieldId(key)} data-field-path={`content.${key}`} data-testid={`input-${fieldId(key)}`} aria-invalid={Boolean(issue)} aria-label={label} rows={3} value={value} onChange={(event) => update(path, event.target.value || (optional ? undefined : ""))} />
        : <Input id={fieldId(key)} data-field-path={`content.${key}`} data-testid={`input-${fieldId(key)}`} aria-invalid={Boolean(issue)} aria-label={label} value={value} onChange={(event) => update(path, event.target.value || (optional ? undefined : ""))} />}
      {issue && <p role="alert" className="text-xs text-destructive">{issue}</p>}
    </div>;
  };
  const links = (title: string, path: (string | number)[], min: number, max: number) => {
    const values: { label: string; href: string }[] = path.reduce<any>((node, part) => node?.[part], page) ?? [];
    return <div className="space-y-3">
      <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">{title}</h4>
        <Button type="button" variant="outline" size="sm" disabled={values.length >= max} onClick={() => update(path, [...values, { label: "", href: "" }])}><Plus className="mr-1 h-3 w-3" /> Add link</Button>
      </div>
      {values.map((_, index) => <div key={index} className="rounded-lg border border-border/70 bg-background/60 p-3 space-y-3">
        <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">Link {index + 1}</span><Button type="button" variant="ghost" size="sm" disabled={values.length <= min} onClick={() => update(path, values.filter((_, i) => i !== index))} aria-label={`Remove ${title} link ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></Button></div>
        <div className="grid gap-3 sm:grid-cols-2">{field(`${title} link ${index + 1} label`, [...path, index, "label"])}{field(`${title} link ${index + 1} destination (safe URL or #anchor)`, [...path, index, "href"])}</div>
      </div>)}
    </div>;
  };
  const issues = allErrors.filter((error) => error.startsWith("pulsePage"));
  const revealIssue = (error: string) => {
    const path = error.split(":")[0];
    const nextPane = panes.find(({ id }) => path.startsWith(`pulsePage.${id}`))?.id
      ?? (path.startsWith("pulsePage.proofItems") ? "proof" : "hero");
    setPane(nextPane);
    const match = /^pulsePage\.sections\.(\d+)/.exec(path);
    if (match) setSelectedId(page.sections?.[Number(match[1])]?.id ?? null);
    const itemMatch = /^pulsePage\.sections\.(\d+)\.items\.(\d+)/.exec(path);
    if (itemMatch) setExpandedItem(`${page.sections?.[Number(itemMatch[1])]?.id}-${itemMatch[2]}`);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = document.getElementById(fieldId(path)) ?? document.getElementById(fieldId(`pulsePage.${nextPane}`));
      target?.scrollIntoView({ block: "center" });
      target?.focus();
    }));
  };

  return <section className="space-y-5 rounded-xl border border-border bg-card/70 p-4 sm:p-5" aria-label="Pulse page editor">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Full-page composition</p><h3 className="mt-1 text-lg font-semibold">Pulse page</h3><p className="text-xs text-muted-foreground">Edit one part at a time. Changes remain a draft until saved and reviewed. In the document editor, use <strong>Save and preview</strong> for the protected full-page rendering of the exact saved revision.</p></div>
      <div className="flex gap-2">
        {(["layout", "tone"] as const).map((key) => <div className="space-y-1" key={key}><Label htmlFor={fieldId(`pulsePage.${key}`)} className="text-xs capitalize">{key}</Label><Select value={page[key]} onValueChange={(value) => update([key], value)}><SelectTrigger id={fieldId(`pulsePage.${key}`)} data-testid={`select-pulse-${key}`} className="w-[135px] capitalize"><SelectValue /></SelectTrigger><SelectContent>{(key === "layout" ? ["editorial", "compact"] : ["evidence-led", "operational"]).map((option) => <SelectItem key={option} value={option}>{labelize(option)}</SelectItem>)}</SelectContent></Select></div>)}
      </div>
    </div>
    {issues.length > 0 && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"><p className="text-xs font-semibold text-destructive">{issues.length} Pulse field issue{issues.length === 1 ? "" : "s"} · choose one to edit</p><ul className="mt-2 max-h-36 space-y-1 overflow-auto">{issues.map((error, index) => <li key={`${error}-${index}`}><button type="button" className="text-left text-xs underline underline-offset-2" onClick={() => revealIssue(error)}>{error}</button></li>)}</ul></div>}
    <div className="flex gap-1 overflow-x-auto border-b border-border pb-2" role="tablist" aria-label="Pulse page areas">
      {panes.map(({ id, title }) => <Button type="button" key={id} role="tab" aria-selected={pane === id} data-testid={`tab-pulse-${id}`} variant={pane === id ? "secondary" : "ghost"} size="sm" className="shrink-0" onClick={() => setPane(id)}>{title}</Button>)}
    </div>
    <div className="space-y-5" role="tabpanel" id={fieldId(`pulsePage.${pane}`)} tabIndex={-1}>
      {pane === "hero" && <>
        <div className="grid gap-4 sm:grid-cols-2">{field("Hero eyebrow", ["hero", "eyebrow"])}{field("Hero headline", ["hero", "headline"])}</div>
        {field("Hero body", ["hero", "body"], true)}{field("Hero footnote", ["hero", "footnote"])}
        {links("Hero calls to action", ["hero", "ctas"], 1, 2)}
      </>}
      {pane === "diagram" && <>
        <p className="text-xs text-muted-foreground">Label positions are fixed by this template; edit their text and the accessible description.</p>
        {field("Diagram accessible description", ["diagram", "accessibleDescription"], true)}
        <div className="grid gap-3 sm:grid-cols-2">{(page.diagram?.labels ?? []).map((item: Page, index: number) => field(`Diagram · ${labelize(item.id)}`, ["diagram", "labels", index, "text"]))}</div>
      </>}
      {pane === "proof" && <>
        <p className="text-xs text-muted-foreground">Between three and eight short proof labels.</p>
        {(page.proofItems ?? []).map((_: string, index: number) => <div key={index} className="flex items-end gap-2"><div className="flex-1">{field(`Proof item ${index + 1}`, ["proofItems", index])}</div><Button type="button" variant="ghost" size="icon" disabled={page.proofItems.length <= 3} aria-label={`Remove proof item ${index + 1}`} onClick={() => update(["proofItems"], page.proofItems.filter((_: string, i: number) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}
        <Button type="button" variant="outline" size="sm" disabled={page.proofItems?.length >= 8} onClick={() => update(["proofItems"], [...page.proofItems, ""])}><Plus className="mr-1 h-4 w-4" /> Add proof item</Button>
      </>}
      {pane === "sections" && <div className="grid gap-5 md:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="space-y-1" aria-label="Section order">
          <p className="pb-2 text-xs text-muted-foreground">Page order · use arrows to rearrange</p>
          {order.map((id, index) => {
            const item = page.sections?.find((candidate: Page) => candidate.id === id);
            return <div key={id} className={`flex items-center rounded-md border ${sectionId === id ? "border-primary bg-primary/5" : "border-transparent"}`}>
              <button type="button" data-testid={`button-pulse-section-${id}`} className="min-w-0 flex-1 truncate p-2 text-left text-xs" onClick={() => setSelectedId(id)} aria-current={sectionId === id ? "true" : undefined}>{index + 1}. {labelize(id)}{item?.visible === false ? " · hidden" : ""}</button>
              <div className="flex flex-col"><button type="button" aria-label={`Move ${id} up`} disabled={index === 0} onClick={() => { const next = [...order]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; update(["sectionOrder"], next); }}><ChevronUp className="h-3.5 w-3.5" /></button><button type="button" aria-label={`Move ${id} down`} disabled={index === order.length - 1} onClick={() => { const next = [...order]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; update(["sectionOrder"], next); }}><ChevronDown className="h-3.5 w-3.5" /></button></div>
            </div>;
          })}
        </nav>
        {section && <div className="min-w-0 space-y-5">
          <div className="flex items-center justify-between border-b pb-3"><div><span className="text-[11px] uppercase tracking-widest text-muted-foreground">Section {order.indexOf(sectionId) + 1}</span><h4 className="font-semibold capitalize">{labelize(sectionId)}</h4></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" data-testid={`checkbox-pulse-visible-${sectionId}`} checked={section.visible !== false} onChange={(event) => update(["sections", sectionIndex, "visible"], event.target.checked)} /> Visible</label></div>
          <div className="grid gap-3 sm:grid-cols-2">{field("Eyebrow", ["sections", sectionIndex, "eyebrow"])}{field("Heading", ["sections", sectionIndex, "heading"])}</div>
          {field("Introduction", ["sections", sectionIndex, "body"], true)}
          {field("Highlighted text", ["sections", sectionIndex, "highlightedText"], true, true)}
          <div className="space-y-3">
            <div className="flex items-center justify-between"><h5 className="text-sm font-semibold">{sectionId === "faq" ? "Questions and answers" : "Items"}</h5><Button type="button" variant="outline" size="sm" disabled={section.items?.length >= 30} onClick={() => update(["sections", sectionIndex, "items"], [...section.items, { title: "", body: "" }])}><Plus className="mr-1 h-3 w-3" /> Add</Button></div>
            {(section.items ?? []).map((_: Page, index: number) => <details key={`${sectionId}-${index}`} className="rounded-lg border border-border/80 bg-background/50 p-3" open={expandedItem === `${sectionId}-${index}`}>
              <summary className="cursor-pointer text-sm font-medium" onClick={(event) => { event.preventDefault(); setExpandedItem(expandedItem === `${sectionId}-${index}` ? null : `${sectionId}-${index}`); }}>{sectionId === "faq" ? "Question" : "Item"} {index + 1} · {section.items[index].title || "Untitled"}</summary>
              <div className="mt-4 space-y-3">
                {field(sectionId === "faq" ? "Question" : "Title", ["sections", sectionIndex, "items", index, "title"])}
                {field(sectionId === "faq" ? "Answer" : "Body", ["sections", sectionIndex, "items", index, "body"], true)}
                <div className="grid gap-3 sm:grid-cols-2">{field("Label", ["sections", sectionIndex, "items", index, "label"], false, true)}{field("Detail", ["sections", sectionIndex, "items", index, "detail"], false, true)}</div>
                <Button type="button" size="sm" variant="ghost" disabled={section.items.length <= 1} onClick={() => update(["sections", sectionIndex, "items"], section.items.filter((_: Page, i: number) => i !== index))}><Trash2 className="mr-1 h-3.5 w-3.5" /> Remove item</Button>
              </div>
            </details>)}
          </div>
          {field("Section footer", ["sections", sectionIndex, "footer"], true, true)}
          {links("Section links", ["sections", sectionIndex, "links"], 0, 4)}
        </div>}
      </div>}
      {pane === "closing" && <>
        <div className="grid gap-3 sm:grid-cols-2">{field("Closing eyebrow", ["closing", "eyebrow"])}{field("Closing heading", ["closing", "heading"])}</div>
        {field("Closing body", ["closing", "body"], true)}
        <div className="grid gap-3 sm:grid-cols-2">{field("Closing CTA label", ["closing", "cta", "label"])}{field("Closing CTA destination", ["closing", "cta", "href"])}</div>
        <div className="grid gap-3 sm:grid-cols-2">{field("Footer left", ["closing", "footerLeft"])}{field("Footer right", ["closing", "footerRight"])}</div>
      </>}
    </div>
  </section>;
}