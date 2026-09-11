import type { CmsDocumentKind } from "@workspace/api-zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addIndustryCapability,
  changeIndustryCapability,
  industryCapabilities,
  removeIndustryCapability,
} from "./capability-fields";
import { MediaField, type MediaSelection } from "./MediaField";
import { contentErrorMap } from "./authoring";
import { updateEducationPov } from "./education-fields";
import { newLandingNarrativeSection, updateLandingSection } from "./landing-section-fields";
import {
  addStringListItem,
  changeStringListItem,
  removeStringListItem,
  stringListItems,
} from "./string-list-fields";

type Content = Record<string, any>;

function lines(value: unknown) {
  return Array.isArray(value) ? value.join("\n") : "";
}
function stringLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
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

function Requirement({ required }: { required?: boolean }) {
  return <span className={required ? "text-destructive" : "text-muted-foreground"}>{required ? "(required)" : "(optional)"}</span>;
}
function Field({ label, value, onChange, placeholder, type = "text", required, error }: {
  label: string; value: unknown; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; error?: string;
}) {
  return <div className="space-y-2"><Label>{label} <Requirement required={required} /></Label><Input aria-label={label} aria-invalid={Boolean(error)} type={type} value={typeof value === "string" || typeof value === "number" ? value : ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}
function Area({ label, value, onChange, placeholder, rows = 4, required, error }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; required?: boolean; error?: string;
}) {
  return <div className="space-y-2"><Label>{label} <Requirement required={required} /></Label><Textarea aria-label={label} aria-invalid={Boolean(error)} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}
function Choice({ label, value, options, onChange, required, error }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void; required?: boolean; error?: string;
}) {
  return <div className="space-y-2"><Label>{label} <Requirement required={required} /></Label><Select value={value || undefined} onValueChange={onChange}><SelectTrigger aria-label={label} aria-invalid={Boolean(error)}><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem value={option} key={option}>{option.replaceAll("-", " ")}</SelectItem>)}</SelectContent></Select>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}

function StringList({ label, value, onChange, required = false, maximum }: {
  label: string; value: unknown; onChange: (value: string[]) => void; required?: boolean; maximum?: number;
}) {
  const items = stringListItems(value);
  return <section className="space-y-3"><div className="flex items-center justify-between"><Label>{label} <Requirement required={required} /></Label><Button type="button" size="sm" variant="outline" disabled={maximum !== undefined && items.length >= maximum} onClick={() => onChange(addStringListItem(items))}>Add item</Button></div>{items.map((item, index) => <div key={index} className="flex gap-2"><Input value={item} onChange={(event) => onChange(changeStringListItem(items, index, event.target.value))} aria-label={`${label} ${index + 1}`} /><Button type="button" variant="ghost" onClick={() => onChange(removeStringListItem(items, index))}>Remove</Button></div>)}{items.length === 0 && <p className="text-xs text-muted-foreground">No items added.</p>}</section>;
}
export function ContentEditor({ kind, value, onChange, errors }: {
  kind: CmsDocumentKind;
  value: Content;
  onChange: (content: Content) => void;
  errors: string[];
}) {
  const set = (key: string, next: unknown) => onChange({ ...value, schemaVersion: 1, [key]: next });
  const fieldErrors = contentErrorMap(errors);
  const capabilities = industryCapabilities(value.capabilities);
  const educationPov = value.educationPov ?? {
    convictions: [],
    valueDomains: [],
    signals: [],
    targetState: [],
    roadmap: [],
    leadershipTest: "",
  };
  const educationV2 = educationPov.version === 2;
  const common = (
    <section className="space-y-4 border-t pt-6">
      <h3 className="font-semibold">Governance and ordering</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice label="Visibility" value={value.visibility ?? "public"} options={["public", "hidden", "restricted"]} onChange={(next) => set("visibility", next)} />
        <Field label="Editorial order" type="number" value={value.order ?? 0} onChange={(next) => set("order", Number(next) || 0)} />
        <Field label="Verification date" type="date" value={value.verificationDate} onChange={(next) => set("verificationDate", next || undefined)} />
        <Field label="Next review date" type="date" value={value.reviewDate} onChange={(next) => set("reviewDate", next || undefined)} />
      </div>
      {kind !== "industry" && <RecordList label="Sources" value={value.sources} columns={[{ key: "label", label: "Label" }, { key: "url", label: "HTTP(S) URL" }, { key: "accessedAt", label: "Accessed date", type: "date" }]} onChange={(next) => set("sources", next)} />}
      <Area label="Related record IDs" value={lines(value.relatedIds)} onChange={(next) => set("relatedIds", stringLines(next))} placeholder="One CMS record UUID per line" rows={3} />
    </section>
  );

  return (
    <div className="space-y-6">
      {errors.length > 0 && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4"><p className="font-semibold text-destructive">Fix these structured-content issues before saving:</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}

      {kind === "person" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Role" required error={fieldErrors.role} value={value.role ?? ""} options={["founder", "leader", "employee", "advisor"]} onChange={(next) => set("role", next)} />
          <Field label="Public title" required error={fieldErrors.title} value={value.title} onChange={(next) => set("title", next)} />
          <Choice label="Approved fallback" value={value.approvedFallback ?? ""} options={["initials", "brand-mark"]} onChange={(next) => set("approvedFallback", next)} />
        </div>
        <MediaField label="Identity image" role="identity" value={value.identityMedia} onChange={(next) => set("identityMedia", next)} />
        <Area label="Biography" value={value.biography ?? ""} onChange={(next) => set("biography", next)} />
        <Area label="Contribution" value={value.contribution ?? ""} onChange={(next) => set("contribution", next)} />
        <PairList label="Focus areas" value={value.focusAreas} left="title" right="detail" onChange={(next) => set("focusAreas", next)} />
        <PairList label="Profile links" value={value.profileLinks} left="label" right="url" onChange={(next) => set("profileLinks", next)} />
      </>}

      {kind === "partner" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Alliance category" required error={fieldErrors.allianceCategory} value={value.allianceCategory} onChange={(next) => set("allianceCategory", next)} />
          <Choice label="Relationship status" required error={fieldErrors.relationshipStatus} value={value.relationshipStatus ?? ""} options={["active", "prospective", "paused", "ended"]} onChange={(next) => set("relationshipStatus", next)} />
          <Field label="Website" value={value.website} onChange={(next) => set("website", next || undefined)} />
        </div>
        <MediaField label="Partner logo" role="logo" value={value.logoMedia} onChange={(next) => set("logoMedia", next)} />
        <Area label="Positioning" required error={fieldErrors.positioning} value={value.positioning ?? ""} onChange={(next) => set("positioning", next)} />
        <Area label="Contribution" value={value.contribution ?? ""} onChange={(next) => set("contribution", next)} />
        <PairList label="Facts" value={value.facts} left="value" right="label" onChange={(next) => set("facts", next)} />
        <Area label="Coverage" value={lines(value.coverage)} onChange={(next) => set("coverage", stringLines(next))} placeholder="One area per line" />
        <RecordList label="Evidence" value={value.evidence} columns={[{ key: "statement", label: "Statement" }, { key: "source.label", label: "Source label" }, { key: "source.url", label: "Source URL" }, { key: "approved", label: "Approved", type: "checkbox" }]} onChange={(next) => set("evidence", next)} />
      </>}

      {kind === "office" && <>
        <Field label="City" required error={fieldErrors.city} value={value.city} onChange={(next) => set("city", next)} placeholder="Dubai" />
        <Area
          label="Full postal address"
          required
          error={fieldErrors.address}
          value={value.address ?? ""}
          onChange={(next) => set("address", next)}
          placeholder="Office, building, street, city, country"
          rows={4}
        />
        <Field label="Phone number (optional)" type="tel" value={value.phone} onChange={(next) => set("phone", next || undefined)} placeholder="+971 4 123 4567" />
      </>}

      {kind === "site-configuration" && !value.page && <>
        <div className="space-y-2">
          <Field
            label="Public website contact email"
            type="email"
            value={value.contactEmail}
            onChange={(next) => onChange({
              schemaVersion: 1,
              configuration: "contact-email",
              contactEmail: next,
            })}
            placeholder="hello@cognirise.ai"
          />
          <p className="text-sm text-muted-foreground">
            This address appears on the public Contact page only after this revision is approved and published.
          </p>
        </div>
      </>}

      {kind === "platform" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required error={fieldErrors.category} value={value.category} onChange={(next) => set("category", next)} />
          <Choice label="Template" value={value.template ?? "standard"} options={["standard", "cognios-specialist"]} onChange={(next) => set("template", next)} />
          <Field label="CTA label" value={value.cta?.label} onChange={(next) => set("cta", next ? { label: next, href: value.cta?.href ?? "/value-scan" } : undefined)} />
          <Field label="CTA link" value={value.cta?.href} onChange={(next) => set("cta", next ? { label: value.cta?.label ?? "Learn more", href: next } : undefined)} />
        </div>
        <MediaField
          label="Hero image"
          value={value.heroMedia}
          legacyMediaId={value.heroMediaId}
          onChange={(next) => {
            const updated: Content = { ...value, heroMedia: next };
            delete updated.heroMediaId;
            onChange(updated);
          }}
        />
        <Area label="Summary" required error={fieldErrors.summary} value={value.summary ?? ""} onChange={(next) => set("summary", next)} />
        <StringList label="Capabilities" value={value.capabilities} onChange={(next) => set("capabilities", next)} />
        <StringList label="Differentiators" value={value.differentiators} onChange={(next) => set("differentiators", next)} />
        <Area label="Standard page sections" value={Array.isArray(value.sections) ? value.sections.map((section: any) => `${section.heading}\n${richLines(section.body)}`).join("\n---\n") : ""} onChange={(next) => set("sections", next.split(/\n---\n/).map((section) => { const [heading, ...body] = section.split("\n"); return { heading: heading.trim(), body: parseRich(body.join("\n")) }; }).filter((section) => section.heading))} placeholder={"Section heading\nP: Paragraph\n---\nNext section"} rows={8} />
      </>}

      {kind === "publication" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Publication variant" required error={fieldErrors.variant} value={value.variant ?? "article"} options={["article", "pov"]} onChange={(next) => set("variant", next)} />
          <Field label="Author" required error={fieldErrors.author} value={value.author} onChange={(next) => set("author", next)} />
          <Field label="Publication date" required error={fieldErrors.publicationDate} type="date" value={value.publicationDate} onChange={(next) => set("publicationDate", next)} />
          <Field label="Updated date" type="date" value={value.updatedDate} onChange={(next) => set("updatedDate", next || undefined)} />
          <Field label="Reading time (minutes)" type="number" value={value.readingTimeMinutes} onChange={(next) => set("readingTimeMinutes", next ? Number(next) : undefined)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><MediaField label="Hero image" value={value.heroMedia} onChange={(next) => set("heroMedia", next)} /><MediaField label="POV PDF" role="document" accept="pdf" required={value.variant === "pov"} value={value.pdfMedia} onChange={(next) => set("pdfMedia", next)} /></div>
        <MediaField label="Social sharing image" role="og-image" value={value.social?.imageMedia} onChange={(next) => set("social", { ...value.social, imageMedia: next })} />
        <Area label="Teaser" required error={fieldErrors.teaser} value={value.teaser ?? ""} onChange={(next) => set("teaser", next)} />
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
          <Choice label="Sector" value={value.sector ?? ""} options={["Financial Services", "Telecoms", "Travel & Hospitality", "Public Sector", "Manufacturing & Industrial", "Life Sciences", "Retail & Consumer", "Professional Services", "Security & AI Infrastructure"]} onChange={(next) => set("sector", next)} />
          <Choice label="Internal engagement type" value={value.engagementType ?? ""} options={["client-delivery", "product-demonstration", "concept", "proposal-prototype"]} onChange={(next) => set("engagementType", next)} />
          <Choice label="Internal delivery stage" value={value.deliveryStage ?? ""} options={["production", "pilot", "proof-of-concept", "mvp", "demo", "concept", "proposal"]} onChange={(next) => set("deliveryStage", next)} />
          <Choice label="Internal impact classification" value={value.impactClassification ?? ""} options={["observed", "pilot-demo", "simulated", "projected", "unavailable"]} onChange={(next) => set("impactClassification", next)} />
          <Choice label="Internal evidence approval" value={value.publicEvidenceStatus ?? "needs-review"} options={["approved", "needs-review", "restricted"]} onChange={(next) => set("publicEvidenceStatus", next)} />
          <Field label="Organization descriptor" required error={fieldErrors.organizationDescriptor} value={value.organizationDescriptor} onChange={(next) => set("organizationDescriptor", next)} />
          <Choice label="Reconstruction template" value={value.visual?.template ?? ""} options={["knowledge-assistant", "analytics-dashboard", "workflow-console", "commerce-experience", "governance-console", "operations-console"]} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", template: next })} />
        </div>
        <MediaField label="Case-study hero image" value={value.heroMedia} onChange={(next) => set("heroMedia", next)} />
        <Area label="Public capability statement" required error={fieldErrors.impactStatement} value={value.impactStatement ?? ""} onChange={(next) => set("impactStatement", next)} />
        <Area label="Disclosure note" required error={fieldErrors.disclosureNote} value={value.disclosureNote ?? ""} onChange={(next) => set("disclosureNote", next)} />
        <StringList label="Related website industries" value={value.relatedIndustries} onChange={(next) => set("relatedIndustries", next)} />
        <Area label="Visual caption" value={value.visual?.caption ?? ""} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", caption: next })} />
        <Area label="Visual alternative text" value={value.visual?.altText ?? ""} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", altText: next })} />
        <Area label="Visual text equivalent" value={value.visual?.textEquivalent ?? ""} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", textEquivalent: next })} />
        <Area label="Anonymized fixture labels" value={lines(value.visual?.fixtureLabels)} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", fixtureLabels: stringLines(next) })} placeholder="One public-safe interface label per line" />
        <Area label="Mandate" value={value.mandate ?? ""} onChange={(next) => set("mandate", next)} />
        <Area label="Context" value={value.context ?? ""} onChange={(next) => set("context", next)} />
        <StringList label="Constraints" value={value.constraints} onChange={(next) => set("constraints", next)} />
        <Area label="Work delivered" value={richLines(value.work)} onChange={(next) => set("work", parseRich(next))} rows={8} />
        <StringList label="Controls" value={value.controls} onChange={(next) => set("controls", next)} />
        <StringList label="Outcomes" value={value.outcomes} onChange={(next) => set("outcomes", next)} />
        <RecordList label="Approved evidence and claims" value={value.evidence} columns={[{ key: "statement", label: "Claim" }, { key: "source.label", label: "Source label" }, { key: "source.url", label: "Source URL" }, { key: "approved", label: "Approved", type: "checkbox" }]} onChange={(next) => set("evidence", next)} />
        <div className="grid gap-4 sm:grid-cols-2"><Area label="Quote" value={value.quote?.text ?? ""} onChange={(text) => set("quote", text ? { ...value.quote, text } : undefined)} /><Field label="Quote attribution" value={value.quote?.attribution} onChange={(attribution) => set("quote", value.quote?.text ? { ...value.quote, attribution: attribution || undefined } : undefined)} /></div>
      </>}

      {kind === "industry" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legacy path" value={value.legacyPath} onChange={(next) => set("legacyPath", next)} placeholder="/industries/legacy-slug" />
          <Field label="Public name" value={value.name} onChange={(next) => set("name", next)} />
          <Field label="Short name" value={value.shortName} onChange={(next) => set("shortName", next)} />
          <Field label="Thesis accent" value={value.accent} onChange={(next) => set("accent", next)} />
          <Field label="Fallback image path" value={value.image} onChange={(next) => set("image", next)} placeholder="/images/industry.jpg" />
          <Field label="Image alternative text" value={value.imageAlt} onChange={(next) => set("imageAlt", next)} />
          <Choice label="Editorial variant" value={value.variant ?? ""} options={["ledger", "network", "journey", "field", "factory"]} onChange={(next) => set("variant", next)} />
        </div>
        <MediaField label="Industry hero image" value={value.heroMedia} onChange={(next) => set("heroMedia", next)} />
        <Area label="Opening thesis" value={value.thesis ?? ""} onChange={(next) => set("thesis", next)} />
        <Area label="Editorial summary" value={value.dek ?? ""} onChange={(next) => set("dek", next)} />
        <Area label="Value-led opportunity" value={value.opportunity ?? ""} onChange={(next) => set("opportunity", next)} placeholder="The client opportunity and value at stake" />
        <section className="space-y-3" aria-labelledby="industry-capabilities-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="industry-capabilities-heading" className="font-semibold">What Cognirise can build</h3>
              <p className="text-sm text-muted-foreground">Add 2–8 capabilities, each with a title and concise description.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set("capabilities", addIndustryCapability(value.capabilities))}
              disabled={capabilities.length >= 8}
              data-testid="button-add-industry-capability"
            >
              Add capability
            </Button>
          </div>
          <div className="space-y-4">
            {capabilities.map((capability, index) => {
              const titleId = `industry-capability-${index}-title`;
              const bodyId = `industry-capability-${index}-body`;
              return (
                <fieldset key={index} className="space-y-4 rounded-md border p-4" data-testid={`group-industry-capability-${index}`}>
                  <legend className="px-1 text-sm font-medium">Capability {index + 1}</legend>
                  <div className="space-y-2">
                    <Label htmlFor={titleId}>Title</Label>
                    <Input
                      id={titleId}
                      value={capability.title}
                      onChange={(event) => set("capabilities", changeIndustryCapability(value.capabilities, index, "title", event.target.value))}
                      placeholder="Capability title"
                      data-testid={`input-industry-capability-title-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={bodyId}>Description</Label>
                    <Textarea
                      id={bodyId}
                      rows={4}
                      value={capability.body}
                      onChange={(event) => set("capabilities", changeIndustryCapability(value.capabilities, index, "body", event.target.value))}
                      placeholder="Concise capability description"
                      data-testid={`textarea-industry-capability-body-${index}`}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => set("capabilities", removeIndustryCapability(value.capabilities, index))}
                    aria-label={`Remove capability ${index + 1}`}
                    data-testid={`button-remove-industry-capability-${index}`}
                  >
                    Remove capability
                  </Button>
                </fieldset>
              );
            })}
          </div>
        </section>
        <Area label="Selected work section description" value={value.selectedWork?.description ?? ""} onChange={(next) => set("selectedWork", { description: next })} placeholder="What evidence and disclosure this section should contain" />
        <PairList label="Operating pressures" value={value.pressures} left="title" right="body" onChange={(next) => set("pressures", next)} />
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Documented reversal title" required value={value.reversal?.title} onChange={(title) => set("reversal", { ...value.reversal, title })} /><Area label="Documented reversal explanation" required value={value.reversal?.body ?? ""} onChange={(body) => set("reversal", { ...value.reversal, body })} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Myth claim" required value={value.myth?.claim} onChange={(claim) => set("myth", { ...value.myth, claim })} /><Area label="Myth verdict" required value={value.myth?.verdict ?? ""} onChange={(verdict) => set("myth", { ...value.myth, verdict })} /></div>
        <Area label="GCC context" value={value.gcc ?? ""} onChange={(next) => set("gcc", next)} />
        <RecordList label="Relevant service and first move" value={value.service ? [value.service] : []} minimum={1} columns={[{ key: "label", label: "Service label" }, { key: "href", label: "Internal path" }, { key: "firstMove", label: "First move" }]} onChange={(next) => set("service", next[0] ?? {})} />
        <RecordList label="Use-case evidence" value={value.uses} minimum={1} columns={[{ key: "use", label: "Use case" }, { key: "evidence", label: "Evidence class" }, { key: "boundary", label: "Required boundary" }]} onChange={(next) => set("uses", next)} />
        <RecordList label="Industry source trail" value={value.sources} minimum={1} columns={[{ key: "label", label: "Label" }, { key: "publisher", label: "Publisher" }, { key: "kind", label: "Evidence kind" }, { key: "url", label: "URL" }, { key: "accessedAt", label: "Accessed date", type: "date" }, { key: "market", label: "Market", type: "market" }]} onChange={(next) => set("sources", next)} />
        {(value.educationPov || value.legacyPath === "/industries/education") && <section className="space-y-4 rounded-md border p-4">
          <h3 className="font-semibold">Higher education POV structure</h3>
          <p className="text-sm text-muted-foreground">Use the governed controls below. This specialist structure is used only by the Education page.</p>
          {!educationV2 && <Button type="button" variant="outline" onClick={() => set("educationPov", {
            ...educationPov,
            version: 2,
            introduction: "",
            strategicShift: "",
            patternQuote: "",
            globalDirection: "",
            valueDomains: [...educationPov.valueDomains, ...Array.from({ length: Math.max(0, 5 - educationPov.valueDomains.length) }, () => ({ title: "", body: "", examples: [] }))],
            targetState: [...educationPov.targetState, ...Array.from({ length: Math.max(0, 7 - educationPov.targetState.length) }, () => ({ title: "", body: "" }))],
          })}>Upgrade to Education POV v2</Button>}
          {educationV2 && <>
            <p className="text-sm font-medium">Education POV contract version 2</p>
            <Area label="Introduction" required value={educationPov.introduction ?? ""} onChange={(introduction) => set("educationPov", updateEducationPov(educationPov, { introduction }))} />
            <Area label="Strategic shift" required value={educationPov.strategicShift ?? ""} onChange={(strategicShift) => set("educationPov", updateEducationPov(educationPov, { strategicShift }))} />
            <Area label="Pattern quote" required value={educationPov.patternQuote ?? ""} onChange={(patternQuote) => set("educationPov", updateEducationPov(educationPov, { patternQuote }))} />
            <Area label="Global direction" required value={educationPov.globalDirection ?? ""} onChange={(globalDirection) => set("educationPov", updateEducationPov(educationPov, { globalDirection }))} />
          </>}
          <RecordList label="Five convictions" value={educationPov.convictions} minimum={5} columns={[{ key: "title", label: "Title" }, { key: "body", label: "Description" }, ...(educationV2 ? [{ key: "market", label: "Market", type: "market" as const }] : [])]} onChange={(next) => set("educationPov", { ...educationPov, convictions: next })} />
          <EducationDomains version={educationV2 ? 2 : undefined} value={educationPov.valueDomains} onChange={(valueDomains) => set("educationPov", { ...educationPov, valueDomains })} />
          {educationV2 && <EducationApplications value={educationPov.applications} onChange={(applications) => set("educationPov", { ...educationPov, applications })} />}
          <EducationSignals version={educationV2 ? 2 : undefined} value={educationPov.signals} onChange={(signals) => set("educationPov", { ...educationPov, signals })} />
          <PairList label={educationV2 ? "Seven target-state capabilities" : "Six target-state capabilities"} value={educationPov.targetState} left="title" right="body" onChange={(next) => set("educationPov", { ...educationPov, targetState: next })} />
          <RecordList label="Roadmap" value={educationPov.roadmap} minimum={3} columns={[{ key: "horizon", label: "Horizon" }, { key: "title", label: "Title" }, { key: "body", label: "Description" }]} onChange={(next) => set("educationPov", { ...educationPov, roadmap: next })} />
          <Area label="Leadership test" value={educationPov.leadershipTest} onChange={(next) => set("educationPov", { ...educationPov, leadershipTest: next })} />
        </section>}
      </>}

      {kind === "framework" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Framework template" value={value.template ?? ""} options={["agent-authority"]} onChange={(next) => set("template", next)} />
          <Field label="CTA label" value={value.cta?.label} onChange={(next) => set("cta", next ? { label: next, href: value.cta?.href ?? "/value-scan" } : undefined)} />
          <Field label="CTA link" value={value.cta?.href} onChange={(next) => set("cta", next ? { label: value.cta?.label ?? "Start a Value Scan", href: next } : undefined)} />
        </div>
        <MediaField label="Framework hero image" required value={value.heroMedia} onChange={(next) => set("heroMedia", next)} />
        <Area label="Teaser" value={value.teaser ?? ""} onChange={(next) => set("teaser", next)} />
        <Area label="Handover explanation" value={value.handoverExplanation ?? ""} onChange={(next) => set("handoverExplanation", next)} rows={6} />
        <Area label="Methodology narrative" value={richLines(value.methodology)} onChange={(next) => set("methodology", parseRich(next))} placeholder={"H2: Heading\nP: Governed explanation\nLIST: First; Second"} rows={12} />
        <RecordList label="Worked example" value={value.workedExample ? [value.workedExample] : []} minimum={1} columns={[{ key: "sector", label: "Sector" }, { key: "title", label: "Title" }, { key: "handover", label: "Handover type" }, { key: "reversibility", label: "Reversibility (R1–R4)" }, { key: "reach", label: "Reach (H1–H5)" }, { key: "exposureBand", label: "Exposure band" }, { key: "oversight", label: "Oversight" }, { key: "detail", label: "Explanation" }]} onChange={(next) => set("workedExample", { ...value.workedExample, ...(next[0] ?? {}) })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice
            label="Worked example requested authority"
            value={value.workedExample?.requestedAuthority ?? "out-of-loop"}
            options={["out-of-loop", "on-loop", "in-loop", "in-loop-second", "in-loop-external"]}
            onChange={(next) => set("workedExample", { ...value.workedExample, requestedAuthority: next })}
          />
          <Field label="Intervention window" value={value.workedExample?.interventionWindow} onChange={(next) => set("workedExample", { ...value.workedExample, interventionWindow: next || undefined })} />
          <Field label="Accountable operating role" value={value.workedExample?.accountableRole} onChange={(next) => set("workedExample", { ...value.workedExample, accountableRole: next })} />
          <Field label="Approved authority artefact (if above ceiling)" value={value.workedExample?.authorityArtefact} onChange={(next) => set("workedExample", { ...value.workedExample, authorityArtefact: next || undefined })} />
        </div>
        <Area label="Promotion evidence" value={value.workedExample?.promotionEvidence ?? ""} onChange={(next) => set("workedExample", { ...value.workedExample, promotionEvidence: next })} rows={4} />
        <Area label="Automatic-demotion condition" value={value.workedExample?.automaticDemotion ?? ""} onChange={(next) => set("workedExample", { ...value.workedExample, automaticDemotion: next })} rows={4} />
        <RecordList label="Sector examples" value={value.sectorExamples} columns={[{ key: "sector", label: "Sector" }, { key: "title", label: "Title" }, { key: "handover", label: "Handover type" }, { key: "reversibility", label: "Reversibility" }, { key: "reach", label: "Reach" }, { key: "exposureBand", label: "Exposure band" }, { key: "oversight", label: "Oversight" }, { key: "detail", label: "Explanation" }]} onChange={(next) => set("sectorExamples", next)} />
      </>}

      {kind === "landing-page" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Governed template" required error={fieldErrors.template} value={value.template ?? ""} options={["landing", "collection", "campaign", "legal", "methodologies"]} onChange={(next) => set("template", next)} />
          <Field label="Public page path" required error={fieldErrors.pagePath} value={value.pagePath} onChange={(next) => set("pagePath", next)} placeholder="/about" />
        </div>
        <Area label="Opening narrative" required error={fieldErrors.narrative} value={value.narrative ?? ""} onChange={(next) => set("narrative", next)} rows={5} />
        <LandingSections value={value.sections} onChange={(sections) => set("sections", sections)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CTA label" value={value.cta?.label} onChange={(next) => set("cta", next ? { label: next, href: value.cta?.href ?? "/value-scan", style: value.cta?.style ?? "primary" } : undefined)} />
          <Field label="CTA link" value={value.cta?.href} onChange={(next) => set("cta", next ? { label: value.cta?.label ?? "Learn more", href: next, style: value.cta?.style ?? "primary" } : undefined)} />
        </div>
        <Area label="SEO title" value={value.seo?.title ?? ""} onChange={(next) => set("seo", { ...value.seo, title: next || undefined })} />
        <Area label="SEO description" value={value.seo?.description ?? ""} onChange={(next) => set("seo", { ...value.seo, description: next || undefined })} rows={3} />
        <Area label="Legal disclaimer" value={value.legal?.disclaimer ?? ""} onChange={(next) => set("legal", { ...value.legal, disclaimer: next || undefined })} rows={3} />
        <p className="text-sm text-muted-foreground">Add approved visuals within a media section so their purpose and accessibility text travel with the exact revision.</p>
      </>}

      {common}
    </div>
  );
}

const educationMarkets = ["all-markets", "uae", "ksa", "turkiye", "europe"];

function EducationSignals({ value, onChange, version }: { value: unknown; onChange: (value: any[]) => void; version?: 2 }) {
  const items = Array.isArray(value) ? value : [];
  const update = (index: number, patch: Record<string, unknown>) => onChange(items.map((current, i) => i === index ? { ...current, ...patch } : current));
  return <section className="space-y-3"><div className="flex justify-between"><Label>Institutional signals <Requirement required /></Label><Button type="button" size="sm" variant="outline" disabled={items.length >= 10} onClick={() => onChange([...items, { institution: "", signal: "", implication: "", sourceUrls: [] }])}>Add signal</Button></div>{items.map((item, index) => <fieldset key={index} className="space-y-3 rounded-md border p-3"><legend>Signal {index + 1}</legend><Field label={`Signal ${index + 1} institution`} required value={item.institution} onChange={(institution) => update(index, { institution })} /><Area label={`Signal ${index + 1} statement`} required value={item.signal ?? ""} onChange={(signal) => update(index, { signal })} /><Area label={`Signal ${index + 1} implication`} required value={item.implication ?? ""} onChange={(implication) => update(index, { implication })} />{version === 2 && <Choice label={`Signal ${index + 1} market`} value={item.market ?? "all-markets"} options={educationMarkets} onChange={(market) => update(index, { market: market === "all-markets" ? undefined : market })} />}<StringList label={`Signal ${index + 1} source URLs`} required value={item.sourceUrls} onChange={(sourceUrls) => update(index, { sourceUrls })} /><Button type="button" variant="ghost" aria-label={`Remove signal ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove signal</Button></fieldset>)}</section>;
}

function EducationApplications({ value, onChange }: { value: unknown; onChange: (value: any[]) => void }) {
  const groups = Array.isArray(value) ? value : [];
  const replaceGroup = (index: number, next: Record<string, unknown>) =>
    onChange(groups.map((group, current) => current === index ? { ...group, ...next } : group));
  return <section className="space-y-3">
    <div className="flex justify-between"><Label>Application groups <Requirement required /></Label><Button type="button" size="sm" variant="outline" disabled={groups.length >= 6} onClick={() => onChange([...groups, { title: "", items: [] }])}>Add application group</Button></div>
    {groups.map((group, groupIndex) => {
      const items = Array.isArray(group.items) ? group.items : [];
      const updateItem = (itemIndex: number, patch: Record<string, unknown>) =>
        replaceGroup(groupIndex, { items: items.map((item: Record<string, unknown>, current: number) => current === itemIndex ? { ...item, ...patch } : item) });
      return <fieldset key={groupIndex} className="space-y-3 rounded-md border p-3">
        <legend>Application group {groupIndex + 1}</legend>
        <Field label={`Application group ${groupIndex + 1} title`} required value={group.title} onChange={(title) => replaceGroup(groupIndex, { title })} />
        <Button type="button" size="sm" variant="outline" disabled={items.length >= 12} onClick={() => replaceGroup(groupIndex, { items: [...items, { title: "", body: "", sourceUrls: [] }] })}>Add application</Button>
        {items.map((item: Record<string, any>, itemIndex: number) => <fieldset key={itemIndex} className="space-y-3 rounded-md border p-3">
          <legend>Application {itemIndex + 1}</legend>
          <Field label={`Application ${groupIndex + 1}.${itemIndex + 1} title`} required value={item.title} onChange={(title) => updateItem(itemIndex, { title })} />
          <Area label={`Application ${groupIndex + 1}.${itemIndex + 1} description`} required value={item.body ?? ""} onChange={(body) => updateItem(itemIndex, { body })} />
          <Choice label={`Application ${groupIndex + 1}.${itemIndex + 1} market`} value={item.market ?? "all-markets"} options={educationMarkets} onChange={(market) => updateItem(itemIndex, { market: market === "all-markets" ? undefined : market })} />
          <StringList label={`Application ${groupIndex + 1}.${itemIndex + 1} source URLs`} required maximum={4} value={item.sourceUrls} onChange={(sourceUrls) => updateItem(itemIndex, { sourceUrls })} />
          <Button type="button" variant="ghost" aria-label={`Remove application ${itemIndex + 1} from group ${groupIndex + 1}`} onClick={() => replaceGroup(groupIndex, { items: items.filter((_: unknown, current: number) => current !== itemIndex) })}>Remove application</Button>
        </fieldset>)}
        <Button type="button" variant="ghost" aria-label={`Remove application group ${groupIndex + 1}`} onClick={() => onChange(groups.filter((_: unknown, current: number) => current !== groupIndex))}>Remove application group</Button>
      </fieldset>;
    })}
  </section>;
}

function LandingSections({ value, onChange }: {
  value: unknown;
  onChange: (value: Array<Record<string, any>>) => void;
}) {
  const sections = Array.isArray(value) ? value as Array<Record<string, any>> : [];
  const update = (index: number, patch: Record<string, unknown>) =>
    onChange(updateLandingSection(sections, index, patch));
  const replace = (index: number, section: Record<string, unknown>) =>
    onChange(sections.map((currentSection, current) => current === index ? section : currentSection));
  const add = () => onChange([...sections, newLandingNarrativeSection(sections.length)]);
  return <section className="space-y-4">
    <div className="flex items-center justify-between">
      <div><Label>Governed page sections <Requirement required /></Label><p className="text-xs text-muted-foreground">Sections render in numeric order; IDs and order values must be unique.</p></div>
      <Button type="button" size="sm" variant="outline" onClick={add}>Add section</Button>
    </div>
    {sections.map((section, index) => <fieldset key={`${section.id}-${index}`} className="space-y-4 rounded-md border p-4">
      <legend className="px-1 text-sm font-medium">Section {index + 1}</legend>
      <div className="grid gap-4 sm:grid-cols-3">
        <Choice label="Type" required value={section.type ?? "narrative"} options={["narrative", "cta", "legal", "media"]} onChange={(type) => {
          const common = { id: section.id, order: section.order };
          replace(index, type === "narrative" ? { ...common, type, body: [{ type: "paragraph", text: "" }] }
            : type === "cta" ? { ...common, type, label: "", href: "/", style: "primary" }
            : type === "legal" ? { ...common, type, text: "", required: false }
            : { ...common, type, references: [] });
        }} />
        <Field label="Stable section ID" required value={section.id} onChange={(id) => update(index, { id })} />
        <Field label="Order" required type="number" value={section.order ?? index} onChange={(order) => update(index, { order: Number(order) || 0 })} />
      </div>
      {section.type === "narrative" && <>
        <Field label="Heading" value={section.heading} onChange={(heading) => update(index, { heading: heading || undefined })} />
        <Area label="Structured narrative" required value={richLines(section.body)} onChange={(body) => update(index, { body: parseRich(body) })} placeholder={"H2: Heading\nP: Paragraph\nLIST: First; Second"} rows={6} />
      </>}
      {section.type === "cta" && <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Label" required value={section.label} onChange={(label) => update(index, { label })} />
        <Field label="Destination" required value={section.href} onChange={(href) => update(index, { href })} />
        <Choice label="Style" value={section.style ?? "primary"} options={["primary", "secondary", "text"]} onChange={(style) => update(index, { style })} />
      </div>}
      {section.type === "legal" && <Area label="Legal text" required value={section.text ?? ""} onChange={(text) => update(index, { text })} />}
      {section.type === "media" && <div className="space-y-3">
        {(Array.isArray(section.references) ? section.references : []).map((reference: Record<string, any>, referenceIndex: number) =>
          <div key={referenceIndex} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
            <MediaField label={`Media ${referenceIndex + 1}`} role={reference.role ?? "supporting"} required value={reference.mediaId && reference.mediaVersionId ? reference as MediaSelection : undefined} onChange={(selection) => update(index, { references: section.references.map((item: any, current: number) => current === referenceIndex ? { ...item, ...selection } : item) })} />
            <Choice label="Role" value={reference.role ?? "supporting"} options={["hero", "supporting", "background", "icon", "og-image"]} onChange={(role) => update(index, { references: section.references.map((item: any, current: number) => current === referenceIndex ? { ...item, role } : item) })} />
            <Field label="Alternative text" value={reference.altText} onChange={(altText) => update(index, { references: section.references.map((item: any, current: number) => current === referenceIndex ? { ...item, altText: altText || undefined } : item) })} />
            <Button type="button" variant="ghost" onClick={() => update(index, { references: section.references.filter((_: unknown, current: number) => current !== referenceIndex) })}>Remove media</Button>
          </div>)}
        <Button type="button" size="sm" variant="outline" onClick={() => update(index, { references: [...(section.references ?? []), { mediaId: "", role: "supporting" }] })}>Add media</Button>
      </div>}
      <Button type="button" variant="ghost" onClick={() => onChange(sections.filter((_, current) => current !== index))}>Remove section</Button>
    </fieldset>)}
  </section>;
}

type RecordColumn = { key: string; label: string; type?: "text" | "date" | "checkbox" | "market" };

function RecordList({ label, value, columns, onChange, minimum = 0 }: {
  label: string; value: unknown; columns: RecordColumn[]; onChange: (value: Array<Record<string, any>>) => void; minimum?: number;
}) {
  const items = Array.isArray(value) ? value as Array<Record<string, any>> : [];
  const get = (item: Record<string, any>, path: string) => path.split(".").reduce((current, key) => current?.[key], item);
  const setPath = (item: Record<string, any>, path: string, next: unknown) => {
    const [head, tail] = path.split(".");
    return tail ? { ...item, [head]: { ...(item[head] ?? {}), [tail]: next } } : { ...item, [head]: next };
  };
  return <section className="space-y-3">
    <div className="flex items-center justify-between"><Label>{label} <Requirement required={minimum > 0} /></Label><Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, {}])}>Add row</Button></div>
    {items.map((item, index) => <fieldset key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
      <legend className="px-1 text-xs font-medium">{label} {index + 1}</legend>
      {columns.map((column) => <div key={column.key} className={column.key.includes("body") || column.key.includes("statement") ? "sm:col-span-2" : ""}>
        <Label className="text-xs">{column.label}</Label>
        {column.type === "checkbox"
          ? <input type="checkbox" className="ml-2" checked={Boolean(get(item, column.key))} onChange={(event) => onChange(items.map((current, currentIndex) => currentIndex === index ? setPath(current, column.key, event.target.checked) : current))} />
          : column.type === "market"
            ? <Choice label={`${label} ${index + 1} ${column.label}`} value={get(item, column.key) ?? "all-markets"} options={educationMarkets} onChange={(next) => onChange(items.map((current, currentIndex) => currentIndex === index ? setPath(current, column.key, next === "all-markets" ? undefined : next) : current))} />
            : <Input aria-label={`${label} ${index + 1} ${column.label}`} type={column.type ?? "text"} value={get(item, column.key) ?? ""} onChange={(event) => onChange(items.map((current, currentIndex) => currentIndex === index ? setPath(current, column.key, event.target.value) : current))} />}
      </div>)}
      <Button type="button" variant="ghost" className="sm:col-span-2" disabled={items.length <= minimum} onClick={() => onChange(items.filter((_, currentIndex) => currentIndex !== index))}>Remove row</Button>
    </fieldset>)}
  </section>;
}

function PairList({ label, value, left, right, onChange }: {
  label: string; value: unknown; left: string; right: string; onChange: (value: Array<Record<string, string>>) => void;
}) {
  const items = Array.isArray(value) ? value as Array<Record<string, string>> : [];
  const update = (index: number, key: string, next: string) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: next } : item));
  return <section className="space-y-3"><div className="flex items-center justify-between"><Label>{label} <Requirement /></Label><Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, { [left]: "", [right]: "" }])}>Add row</Button></div>{items.map((item, index) => <fieldset key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"><legend className="px-1 text-xs font-medium">{label} {index + 1}</legend><div><Label className="text-xs">{left.replaceAll(/([A-Z])/g, " $1")}</Label><Input value={item[left] ?? ""} onChange={(event) => update(index, left, event.target.value)} /></div><div><Label className="text-xs">{right.replaceAll(/([A-Z])/g, " $1")}</Label><Input value={item[right] ?? ""} onChange={(event) => update(index, right, event.target.value)} /></div><Button type="button" variant="ghost" className="sm:col-span-2" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>Remove row</Button></fieldset>)}</section>;
}

function EducationDomains({ value, onChange, version }: { value: unknown; onChange: (value: any[]) => void; version?: 2 }) {
  const items = Array.isArray(value) ? value : [];
  const maximum = version === 2 ? 5 : 3;
  return <section className="space-y-3"><div className="flex justify-between"><Label>{version === 2 ? "Five value domains" : "Three value domains"} <Requirement required /></Label><Button type="button" size="sm" variant="outline" disabled={items.length >= maximum} onClick={() => onChange([...items, { title: "", body: "", examples: [] }])}>Add domain</Button></div>{items.map((item, index) => <fieldset key={index} className="space-y-3 rounded-md border p-3"><legend>Domain {index + 1}</legend><Field label={`Domain ${index + 1} title`} required value={item.title} onChange={(title) => onChange(items.map((current, i) => i === index ? { ...current, title } : current))} /><Area label={`Domain ${index + 1} description`} required value={item.body ?? ""} onChange={(body) => onChange(items.map((current, i) => i === index ? { ...current, body } : current))} /><StringList label={`Domain ${index + 1} examples`} required={version !== 2} value={item.examples} onChange={(examples) => onChange(items.map((current, i) => i === index ? { ...current, examples } : current))} /><Button type="button" variant="ghost" aria-label={`Remove domain ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove domain</Button></fieldset>)}</section>;
}
