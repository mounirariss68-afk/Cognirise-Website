import type { CmsDocumentKind } from "@workspace/api-zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Content = Record<string, any>;

function lines(value: unknown) {
  return Array.isArray(value) ? value.join("\n") : "";
}
function stringLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}
function pairLines(value: unknown, left: string, right: string) {
  return Array.isArray(value)
    ? value.map((item) => `${item?.[left] ?? ""} | ${item?.[right] ?? ""}`).join("\n")
    : "";
}
function parsePairs(value: string, left: string, right: string) {
  return stringLines(value).map((line) => {
    const [a, ...rest] = line.split("|");
    return { [left]: a.trim(), [right]: rest.join("|").trim() };
  }).filter((item) => item[left] && item[right]);
}
function tripleLines(value: unknown, first: string, second: string, third: string) {
  return Array.isArray(value)
    ? value.map((item) => `${item?.[first] ?? ""} | ${item?.[second] ?? ""} | ${item?.[third] ?? ""}`).join("\n")
    : "";
}
function parseTriples(value: string, first: string, second: string, third: string) {
  return stringLines(value).map((line) => {
    const [a, b, ...rest] = line.split("|");
    return { [first]: a?.trim(), [second]: b?.trim(), [third]: rest.join("|").trim() };
  }).filter((item) => item[first] && item[second] && item[third]);
}
function sourceLines(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => `${item.label ?? ""} | ${item.url ?? ""} | ${item.accessedAt ?? ""}`).join("\n")
    : "";
}
function parseSources(value: string) {
  return stringLines(value).map((line) => {
    const [label, url, accessedAt] = line.split("|").map((part) => part.trim());
    return { label, ...(url ? { url } : {}), ...(accessedAt ? { accessedAt } : {}) };
  }).filter((item) => item.label);
}
function industrySourceLines(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => `${item.label ?? ""} | ${item.publisher ?? ""} | ${item.kind ?? ""} | ${item.url ?? ""} | ${item.accessedAt ?? ""}`).join("\n")
    : "";
}
function parseIndustrySources(value: string) {
  return stringLines(value).map((line) => {
    const [label, publisher, kind, url, accessedAt] = line.split("|").map((part) => part.trim());
    return { label, publisher, kind, url, ...(accessedAt ? { accessedAt } : {}) };
  }).filter((item) => item.label && item.publisher && item.kind && item.url);
}
function richLines(value: unknown) {
  return Array.isArray(value)
    ? value.map((block) => `${block.type === "heading" ? `H${block.level ?? 2}` : block.type === "list" ? "LIST" : block.type === "quote" ? "QUOTE" : "P"}: ${block.text ?? (block.items ?? []).join("; ")}`).join("\n")
    : "";
}
function parseRich(value: string) {
  return stringLines(value).map((line) => {
    const [prefix, ...rest] = line.split(":");
    const text = rest.join(":").trim();
    if (/^H[23]$/i.test(prefix.trim())) return { type: "heading", level: Number(prefix.trim()[1]), text };
    if (prefix.trim().toUpperCase() === "LIST") return { type: "list", style: "bullet", items: text.split(";").map((item) => item.trim()).filter(Boolean) };
    if (prefix.trim().toUpperCase() === "QUOTE") return { type: "quote", text };
    return { type: "paragraph", text: text || line.trim() };
  }).filter((block) => ("text" in block ? block.text : block.items.length));
}
function evidenceLines(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => `${item.statement ?? ""} | ${item.source?.label ?? ""} | ${item.source?.url ?? ""} | ${item.approved ? "approved" : "needs-review"}`).join("\n")
    : "";
}
function parseEvidence(value: string) {
  return stringLines(value).map((line) => {
    const [statement, label, url, approval] = line.split("|").map((part) => part.trim());
    return {
      statement,
      source: { label, ...(url ? { url } : {}) },
      approved: approval.toLowerCase() === "approved",
    };
  }).filter((item) => item.statement && item.source.label);
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: unknown; onChange: (value: string) => void; placeholder?: string; type?: string;
}) {
  return <div className="space-y-2"><Label>{label}</Label><Input type={type} value={typeof value === "string" || typeof value === "number" ? value : ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}
function Area({ label, value, onChange, placeholder, rows = 4 }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number;
}) {
  return <div className="space-y-2"><Label>{label}</Label><Textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}
function Choice({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void;
}) {
  return <div className="space-y-2"><Label>{label}</Label><Select value={value || undefined} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem value={option} key={option}>{option.replaceAll("-", " ")}</SelectItem>)}</SelectContent></Select></div>;
}

export function ContentEditor({ kind, value, onChange, errors }: {
  kind: CmsDocumentKind;
  value: Content;
  onChange: (content: Content) => void;
  errors: string[];
}) {
  const set = (key: string, next: unknown) => onChange({ ...value, schemaVersion: 1, [key]: next });
  const common = (
    <section className="space-y-4 border-t pt-6">
      <h3 className="font-semibold">Governance and ordering</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice label="Visibility" value={value.visibility ?? "public"} options={["public", "hidden", "restricted"]} onChange={(next) => set("visibility", next)} />
        <Field label="Editorial order" type="number" value={value.order ?? 0} onChange={(next) => set("order", Number(next) || 0)} />
        <Field label="Verification date" type="date" value={value.verificationDate} onChange={(next) => set("verificationDate", next || undefined)} />
        <Field label="Next review date" type="date" value={value.reviewDate} onChange={(next) => set("reviewDate", next || undefined)} />
      </div>
      {kind !== "industry" && <Area label="Sources" value={sourceLines(value.sources)} onChange={(next) => set("sources", parseSources(next))} placeholder="Source label | https://source.example | YYYY-MM-DD" />}
      <Area label="Related record IDs" value={lines(value.relatedIds)} onChange={(next) => set("relatedIds", stringLines(next))} placeholder="One CMS record UUID per line" rows={3} />
    </section>
  );

  return (
    <div className="space-y-6">
      {errors.length > 0 && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4"><p className="font-semibold text-destructive">Fix these structured-content issues before saving:</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}

      {kind === "person" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Role" value={value.role ?? ""} options={["founder", "leader", "employee", "advisor"]} onChange={(next) => set("role", next)} />
          <Field label="Public title" value={value.title} onChange={(next) => set("title", next)} />
          <Field label="Identity media ID" value={value.identityMediaId} onChange={(next) => set("identityMediaId", next || undefined)} />
          <Choice label="Approved fallback" value={value.approvedFallback ?? ""} options={["initials", "brand-mark"]} onChange={(next) => set("approvedFallback", next)} />
        </div>
        <Area label="Biography" value={value.biography ?? ""} onChange={(next) => set("biography", next)} />
        <Area label="Contribution" value={value.contribution ?? ""} onChange={(next) => set("contribution", next)} />
        <Area label="Focus areas" value={pairLines(value.focusAreas, "title", "detail")} onChange={(next) => set("focusAreas", parsePairs(next, "title", "detail"))} placeholder="Focus title | Detail" />
        <Area label="Profile links" value={pairLines(value.profileLinks, "label", "url")} onChange={(next) => set("profileLinks", parsePairs(next, "label", "url"))} placeholder="LinkedIn | https://..." />
      </>}

      {kind === "partner" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Alliance category" value={value.allianceCategory} onChange={(next) => set("allianceCategory", next)} />
          <Choice label="Relationship status" value={value.relationshipStatus ?? ""} options={["active", "prospective", "paused", "ended"]} onChange={(next) => set("relationshipStatus", next)} />
          <Field label="Website" value={value.website} onChange={(next) => set("website", next || undefined)} />
          <Field label="Logo media ID" value={value.logoMediaId} onChange={(next) => set("logoMediaId", next || undefined)} />
        </div>
        <Area label="Positioning" value={value.positioning ?? ""} onChange={(next) => set("positioning", next)} />
        <Area label="Contribution" value={value.contribution ?? ""} onChange={(next) => set("contribution", next)} />
        <Area label="Facts" value={pairLines(value.facts, "value", "label")} onChange={(next) => set("facts", parsePairs(next, "value", "label"))} placeholder="2,000+ | full-time professionals" />
        <Area label="Coverage" value={lines(value.coverage)} onChange={(next) => set("coverage", stringLines(next))} placeholder="One area per line" />
        <Area label="Evidence" value={evidenceLines(value.evidence)} onChange={(next) => set("evidence", parseEvidence(next))} placeholder="Statement | Source label | https://... | approved or needs-review" />
      </>}

      {kind === "platform" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" value={value.category} onChange={(next) => set("category", next)} />
          <Choice label="Template" value={value.template ?? "standard"} options={["standard", "cognios-specialist"]} onChange={(next) => set("template", next)} />
          <Field label="Hero media ID" value={value.heroMediaId} onChange={(next) => set("heroMediaId", next || undefined)} />
          <Field label="CTA label" value={value.cta?.label} onChange={(next) => set("cta", next ? { label: next, href: value.cta?.href ?? "/value-scan" } : undefined)} />
          <Field label="CTA link" value={value.cta?.href} onChange={(next) => set("cta", next ? { label: value.cta?.label ?? "Learn more", href: next } : undefined)} />
        </div>
        <Area label="Summary" value={value.summary ?? ""} onChange={(next) => set("summary", next)} />
        <Area label="Capabilities" value={lines(value.capabilities)} onChange={(next) => set("capabilities", stringLines(next))} placeholder="One capability per line" />
        <Area label="Differentiators" value={lines(value.differentiators)} onChange={(next) => set("differentiators", stringLines(next))} placeholder="One differentiator per line" />
        <Area label="Standard page sections" value={Array.isArray(value.sections) ? value.sections.map((section: any) => `${section.heading}\n${richLines(section.body)}`).join("\n---\n") : ""} onChange={(next) => set("sections", next.split(/\n---\n/).map((section) => { const [heading, ...body] = section.split("\n"); return { heading: heading.trim(), body: parseRich(body.join("\n")) }; }).filter((section) => section.heading))} placeholder={"Section heading\nP: Paragraph\n---\nNext section"} rows={8} />
      </>}

      {kind === "publication" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Publication variant" value={value.variant ?? "article"} options={["article", "pov"]} onChange={(next) => set("variant", next)} />
          <Field label="Author" value={value.author} onChange={(next) => set("author", next)} />
          <Field label="Publication date" type="date" value={value.publicationDate} onChange={(next) => set("publicationDate", next)} />
          <Field label="Updated date" type="date" value={value.updatedDate} onChange={(next) => set("updatedDate", next || undefined)} />
          <Field label="Reading time (minutes)" type="number" value={value.readingTimeMinutes} onChange={(next) => set("readingTimeMinutes", next ? Number(next) : undefined)} />
          <Field label="Hero media ID" value={value.heroMediaId} onChange={(next) => set("heroMediaId", next || undefined)} />
          <Field label="POV PDF media ID" value={value.pdfMediaId} onChange={(next) => set("pdfMediaId", next || undefined)} />
        </div>
        <Area label="Teaser" value={value.teaser ?? ""} onChange={(next) => set("teaser", next)} />
        <Area label="Structured body" value={richLines(value.body)} onChange={(next) => set("body", parseRich(next))} placeholder={"P: Paragraph\nH2: Heading\nLIST: First; Second\nQUOTE: Quotation"} rows={12} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Area label="Topics" value={lines(value.topics)} onChange={(next) => set("topics", stringLines(next))} />
          <Area label="Sectors" value={lines(value.sectors)} onChange={(next) => set("sectors", stringLines(next))} />
        </div>
      </>}

      {kind === "case-study" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Case variant" value={value.variant ?? "summary"} options={["summary", "full"]} onChange={(next) => set("variant", next)} />
          <Choice label="Disclosure" value={value.disclosure ?? "restricted"} options={["named", "anonymized", "restricted"]} onChange={(next) => set("disclosure", next)} />
          <Field label="Hero media ID" value={value.heroMediaId} onChange={(next) => set("heroMediaId", next || undefined)} />
        </div>
        <Area label="Mandate" value={value.mandate ?? ""} onChange={(next) => set("mandate", next)} />
        <Area label="Context" value={value.context ?? ""} onChange={(next) => set("context", next)} />
        <Area label="Constraints" value={lines(value.constraints)} onChange={(next) => set("constraints", stringLines(next))} />
        <Area label="Work delivered" value={richLines(value.work)} onChange={(next) => set("work", parseRich(next))} rows={8} />
        <Area label="Controls" value={lines(value.controls)} onChange={(next) => set("controls", stringLines(next))} />
        <Area label="Outcomes" value={lines(value.outcomes)} onChange={(next) => set("outcomes", stringLines(next))} />
        <Area label="Approved evidence and claims" value={evidenceLines(value.evidence)} onChange={(next) => set("evidence", parseEvidence(next))} placeholder="Claim | Source label | https://... | approved or needs-review" />
        <Area label="Quote" value={value.quote ? `${value.quote.text} | ${value.quote.attribution ?? ""}` : ""} onChange={(next) => { const [text, attribution] = next.split("|").map((part) => part.trim()); set("quote", text ? { text, ...(attribution ? { attribution } : {}) } : undefined); }} placeholder="Quote | Attribution" />
      </>}

      {kind === "industry" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legacy path" value={value.legacyPath} onChange={(next) => set("legacyPath", next)} placeholder="/industries/legacy-slug" />
          <Field label="Public name" value={value.name} onChange={(next) => set("name", next)} />
          <Field label="Short name" value={value.shortName} onChange={(next) => set("shortName", next)} />
          <Field label="Thesis accent" value={value.accent} onChange={(next) => set("accent", next)} />
          <Field label="Fallback image path" value={value.image} onChange={(next) => set("image", next)} placeholder="/images/industry.jpg" />
          <Field label="Image alternative text" value={value.imageAlt} onChange={(next) => set("imageAlt", next)} />
          <Field label="Hero media ID" value={value.heroMediaId} onChange={(next) => set("heroMediaId", next || undefined)} />
          <Choice label="Editorial variant" value={value.variant ?? ""} options={["ledger", "network", "journey", "field", "factory"]} onChange={(next) => set("variant", next)} />
        </div>
        <Area label="Opening thesis" value={value.thesis ?? ""} onChange={(next) => set("thesis", next)} />
        <Area label="Editorial summary" value={value.dek ?? ""} onChange={(next) => set("dek", next)} />
        <Area label="Operating pressures" value={pairLines(value.pressures, "title", "body")} onChange={(next) => set("pressures", parsePairs(next, "title", "body"))} placeholder="Pressure title | Explanation (3–5 required)" rows={6} />
        <Area label="Documented reversal" value={value.reversal ? `${value.reversal.title} | ${value.reversal.body}` : ""} onChange={(next) => { const [title, ...body] = next.split("|"); set("reversal", { title: title.trim(), body: body.join("|").trim() }); }} placeholder="Title | Explanation" />
        <Area label="Myth and verdict" value={value.myth ? `${value.myth.claim} | ${value.myth.verdict}` : ""} onChange={(next) => { const [claim, ...verdict] = next.split("|"); set("myth", { claim: claim.trim(), verdict: verdict.join("|").trim() }); }} placeholder="Myth | Verdict" />
        <Area label="GCC context" value={value.gcc ?? ""} onChange={(next) => set("gcc", next)} />
        <Area label="Relevant service and first move" value={value.service ? `${value.service.label} | ${value.service.href} | ${value.service.firstMove}` : ""} onChange={(next) => set("service", parseTriples(next, "label", "href", "firstMove")[0] ?? {})} placeholder="Service label | /internal-path | First move" />
        <Area label="Use-case evidence" value={tripleLines(value.uses, "use", "evidence", "boundary")} onChange={(next) => set("uses", parseTriples(next, "use", "evidence", "boundary"))} placeholder="Use case | Evidence class | Required boundary" rows={6} />
        <Area label="Industry source trail" value={industrySourceLines(value.sources)} onChange={(next) => set("sources", parseIndustrySources(next))} placeholder="Label | Publisher | Official source / Independent study / Company-reported / Vendor claim | https://... | YYYY-MM-DD" rows={7} />
      </>}

      {common}
    </div>
  );
}