import type { CmsDocumentKind } from "@workspace/api-zod";
import * as React from "react";
import { belongsToIndustrySection, isIndustrySectionId } from "@workspace/api-zod";
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
import { useOverrides } from "./OverridesContext";
import { updateEducationPov } from "./education-fields";
import { newLandingNarrativeSection, updateLandingSection } from "./landing-section-fields";
import {
  addStringListItem,
  changeStringListItem,
  removeStringListItem,
  stringListItems,
} from "./string-list-fields";
import {
  RichBlockEditor,
  RichListItems,
} from "./rich-block-controls";
import {
  removeRichBlock,
  richBlockValues,
} from "./rich-block-model";
import {
  EnumMultiSelect,
  RecordPicker,
  SafeDestinationField,
} from "./relationship-controls";

type Content = Record<string, any>;

/** Stable target shared with readiness actions for direct content correction. */
export function contentFieldId(path: string) {
  return `content-${path.replace(/^content\./, "").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function lines(value: unknown) {
  return Array.isArray(value) ? value.join("\n") : "";
}
function stringLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function readinessPath(error: string) {
  const separator = error.indexOf(":");
  const rawPath = (separator < 0 ? "content" : error.slice(0, separator)).trim() || "content";
  return rawPath.startsWith("content.") ? rawPath : `content.${rawPath}`;
}

function pathWords(path: string) {
  const leaf = path.split(".").at(-1)?.replace(/\[\d+\]/g, "") ?? "";
  return leaf.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
}

function isDirectContentField(path: string) {
  return /^content\.[^.[]+$/.test(path);
}

function Requirement({ required }: { required?: boolean }) {
  return <span className={required ? "text-destructive" : "text-muted-foreground"}>{required ? "(required)" : "(optional)"}</span>;
}
function Field({ label, value, onChange, placeholder, type = "text", required, error, path }: {
  label: string; value: unknown; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; error?: string; path?: string;
}) {
  const id = path ? contentFieldId(path) : undefined;
  return <div className="space-y-2"><Label htmlFor={id}>{label} <Requirement required={required} /></Label><Input id={id} data-field-path={path} aria-label={label} aria-invalid={Boolean(error)} type={type} value={typeof value === "string" || typeof value === "number" ? value : ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}
function Area({ label, value, onChange, placeholder, rows = 4, required, error, path }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; required?: boolean; error?: string; path?: string;
}) {
  const id = path ? contentFieldId(path) : undefined;
  return <div className="space-y-2"><Label htmlFor={id}>{label} <Requirement required={required} /></Label><Textarea id={id} data-field-path={path} aria-label={label} aria-invalid={Boolean(error)} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}
function Choice({ label, value, options, onChange, required, error, path }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void; required?: boolean; error?: string; path?: string;
}) {
  const id = path ? contentFieldId(path) : undefined;
  return <div className="space-y-2"><Label htmlFor={id}>{label} <Requirement required={required} /></Label><Select value={value || undefined} onValueChange={onChange}><SelectTrigger id={id} data-field-path={path} aria-label={label} aria-invalid={Boolean(error)}><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem value={option} key={option}>{option.replaceAll("-", " ")}</SelectItem>)}</SelectContent></Select>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}

function StringList({ label, value, onChange, required = false, maximum }: {
  label: string; value: unknown; onChange: (value: string[]) => void; required?: boolean; maximum?: number;
}) {
  const items = stringListItems(value);
  return <section className="space-y-3"><div className="flex items-center justify-between"><Label>{label} <Requirement required={required} /></Label><Button type="button" size="sm" variant="outline" disabled={maximum !== undefined && items.length >= maximum} onClick={() => onChange(addStringListItem(items))}>Add item</Button></div>{items.map((item, index) => <div key={index} className="flex gap-2"><Input value={item} onChange={(event) => onChange(changeStringListItem(items, index, event.target.value))} aria-label={`${label} ${index + 1}`} /><Button type="button" variant="ghost" onClick={() => onChange(removeStringListItem(items, index))}>Remove</Button></div>)}{items.length === 0 && <p className="text-xs text-muted-foreground">No items added.</p>}</section>;
}
export function ContentEditor({ kind, value, onChange, errors, readinessPaths = [], industrySection }: {
  kind: CmsDocumentKind;
  value: Content;
  onChange: (content: Content) => void;
  errors: string[];
  /** Canonical publish/edition paths used only to register direct focus targets. */
  readinessPaths?: string[];
  /** Industry documents are edited through the fixed visual workspace. */
  industrySection?: string;
}) {
  const overrides = useOverrides();
  const editorRef = React.useRef<HTMLDivElement>(null);
  // The regular document PATCH remains the persistence path.  This only keeps
  // the field indicator truthful while that PATCH is pending.
  const set = (key: string, next: unknown) => {
    overrides.onOverride?.(`content.${key}`, next);
    onChange({ ...value, schemaVersion: 1, [key]: next });
  };
  const fieldErrors = contentErrorMap(errors);
  React.useLayoutEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    for (const candidate of [...errors.map(readinessPath), ...readinessPaths]) {
      const path = candidate.startsWith("content.") ? candidate : `content.${candidate}`;
      if (root.querySelector(`[data-field-path="${path}"]`)) continue;
      // Nested records can contain repeated leaf names (for example,
      // hero.heading and sections[0].heading). Never guess which one owns a
      // readiness path; their action keeps focus on its named readiness row
      // until that control has explicit full-path metadata.
      if (!isDirectContentField(path)) continue;
      const words = pathWords(path);
      if (!words) continue;
      const controls = [...root.querySelectorAll<HTMLElement>("[aria-label]")]
        .filter((element) => !element.dataset.fieldPath && element.getAttribute("aria-label")?.toLowerCase().includes(words));
      if (controls.length === 1) {
        const control = controls[0];
        control.id = contentFieldId(path);
        control.dataset.fieldPath = path;
      }
    }
  }, [errors, readinessPaths]);
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
  const editingIndustryGovernance = kind === "industry" && industrySection === "governance";
  const showIndustryPath = (path: string) =>
    kind !== "industry" || (!editingIndustryGovernance && (!industrySection || (isIndustrySectionId(industrySection) && belongsToIndustrySection(path, industrySection))));
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
      <RecordPicker label="Related records" value={value.relatedIds} onChange={(next) => set("relatedIds", next)} />
    </section>
  );

  return (
    <div ref={editorRef} className="space-y-6">
      {errors.length > 0 && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4"><p className="font-semibold text-destructive">Fix these content-field issues before saving this draft:</p><p className="mt-1 text-xs text-muted-foreground">Drafts may remain incomplete; publication readiness is checked separately. These errors identify values that cannot be saved under the current contract.</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}

      {kind === "person" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Role" required error={fieldErrors.role} path="content.role" value={value.role ?? ""} options={["founder", "leader", "employee", "advisor"]} onChange={(next) => set("role", next)} />
          <Field label="Public title" required error={fieldErrors.title} path="content.title" value={value.title} onChange={(next) => set("title", next)} />
          <Choice label="Approved fallback" value={value.approvedFallback ?? ""} options={["initials", "brand-mark"]} onChange={(next) => set("approvedFallback", next)} />
        </div>
        <MediaField label="Identity image" role="identity" value={value.identityMedia} overridePath="content.identityMedia" onChange={(next) => set("identityMedia", next)} />
        <Area label="Biography" value={value.biography ?? ""} onChange={(next) => set("biography", next)} />
        <Area label="Contribution" value={value.contribution ?? ""} onChange={(next) => set("contribution", next)} />
        <PairList label="Focus areas" value={value.focusAreas} left="title" right="detail" onChange={(next) => set("focusAreas", next)} />
        <PairList label="Profile links" value={value.profileLinks} left="label" right="url" onChange={(next) => set("profileLinks", next)} />
      </>}

      {kind === "partner" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Alliance category" required error={fieldErrors.allianceCategory} path="content.allianceCategory" value={value.allianceCategory} onChange={(next) => set("allianceCategory", next)} />
          <Choice label="Relationship status" required error={fieldErrors.relationshipStatus} path="content.relationshipStatus" value={value.relationshipStatus ?? ""} options={["active", "prospective", "paused", "ended"]} onChange={(next) => set("relationshipStatus", next)} />
          <Field label="Website" value={value.website} onChange={(next) => set("website", next || undefined)} />
        </div>
        <MediaField label="Partner logo" role="logo" value={value.logoMedia} overridePath="content.logoMedia" onChange={(next) => set("logoMedia", next)} />
        <Area label="Positioning" required error={fieldErrors.positioning} path="content.positioning" value={value.positioning ?? ""} onChange={(next) => set("positioning", next)} />
        <Area label="Contribution" value={value.contribution ?? ""} onChange={(next) => set("contribution", next)} />
        <PairList label="Facts" value={value.facts} left="value" right="label" onChange={(next) => set("facts", next)} />
        <Area label="Coverage" value={lines(value.coverage)} onChange={(next) => set("coverage", stringLines(next))} placeholder="One area per line" />
        <RecordList label="Evidence" value={value.evidence} columns={[{ key: "statement", label: "Statement" }, { key: "source.label", label: "Source label" }, { key: "source.url", label: "Source URL" }, { key: "approved", label: "Approved", type: "checkbox" }]} onChange={(next) => set("evidence", next)} />
      </>}

      {kind === "office" && <>
        <Field label="City" required error={fieldErrors.city} path="content.city" value={value.city} onChange={(next) => set("city", next)} placeholder="Dubai" />
        <Area
          label="Full postal address"
          required
          error={fieldErrors.address}
          path="content.address"
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
            required
            error={fieldErrors.contactEmail}
            path="content.contactEmail"
            value={value.contactEmail}
            onChange={(next) => set("contactEmail", next)}
            placeholder="hello@cognirise.ai"
          />
          <p className="text-sm text-muted-foreground">
            This address appears on the public Contact page only after this revision is approved and published.
          </p>
        </div>
      </>}

      {kind === "platform" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required error={fieldErrors.category} path="content.category" value={value.category} onChange={(next) => set("category", next)} />
          <Choice label="Template" value={value.template ?? "standard"} options={["standard", "cognios-specialist"]} onChange={(next) => set("template", next)} />
          <Field label="CTA label" value={value.cta?.label} onChange={(next) => set("cta", next ? { label: next, href: value.cta?.href ?? "/value-scan" } : undefined)} />
          <SafeDestinationField label="CTA destination" value={value.cta?.href} onChange={(next) => set("cta", next ? { label: value.cta?.label ?? "Learn more", href: next } : undefined)} />
        </div>
        <MediaField
          label="Hero image"
          value={value.heroMedia}
          legacyMediaId={value.heroMediaId}
          overridePath="content.heroMedia"
          onChange={(next) => {
            const updated: Content = { ...value, heroMedia: next };
            delete updated.heroMediaId;
            onChange(updated);
          }}
        />
          <Area label="Summary" required error={fieldErrors.summary} path="content.summary" value={value.summary ?? ""} onChange={(next) => set("summary", next)} />
        <StringList label="Capabilities" value={value.capabilities} onChange={(next) => set("capabilities", next)} />
        <StringList label="Differentiators" value={value.differentiators} onChange={(next) => set("differentiators", next)} />
        <section className="space-y-4">
          <Label>Standard page sections</Label>
          {(Array.isArray(value.sections) ? value.sections : []).map((section: any, index: number) => (
            <fieldset key={index} className="space-y-3 rounded-md border p-3">
              <legend className="px-1 text-xs font-medium">Section {index + 1}</legend>
              <Field label={`Section ${index + 1} heading`} value={section.heading} onChange={(heading) => set("sections", value.sections.map((current: any, currentIndex: number) => currentIndex === index ? { ...current, heading } : current))} />
              <RichBlockEditor
                label={`Section ${index + 1} body`}
                value={section.body}
                onChange={(body) => set("sections", value.sections.map((current: any, currentIndex: number) => currentIndex === index ? { ...current, body } : current))}
              />
            </fieldset>
          ))}
          <Button type="button" variant="outline" onClick={() => set("sections", [...(Array.isArray(value.sections) ? value.sections : []), { heading: "", body: [{ type: "paragraph", text: "" }] }])}>Add section</Button>
        </section>
      </>}

      {kind === "publication" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Publication variant" required error={fieldErrors.variant} path="content.variant" value={value.variant ?? "article"} options={["article", "pov"]} onChange={(next) => set("variant", next)} />
          <Field label="Author" required error={fieldErrors.author} path="content.author" value={value.author} onChange={(next) => set("author", next)} />
          <Field label="Publication date" required error={fieldErrors.publicationDate} path="content.publicationDate" type="date" value={value.publicationDate} onChange={(next) => set("publicationDate", next)} />
          <Field label="Updated date" type="date" value={value.updatedDate} onChange={(next) => set("updatedDate", next || undefined)} />
          <Field label="Reading time (minutes)" type="number" value={value.readingTimeMinutes} onChange={(next) => set("readingTimeMinutes", next ? Number(next) : undefined)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><MediaField label="Hero image" value={value.heroMedia} overridePath="content.heroMedia" onChange={(next) => set("heroMedia", next)} /><MediaField label="POV PDF" role="document" accept="pdf" required={value.variant === "pov"} value={value.pdfMedia} overridePath="content.pdfMedia" onChange={(next) => set("pdfMedia", next)} /></div>
        <MediaField label="Social sharing image" role="og-image" value={value.social?.imageMedia} overridePath="content.social.imageMedia" onChange={(next) => set("social", { ...value.social, imageMedia: next })} />
        <Area label="Teaser" required error={fieldErrors.teaser} path="content.teaser" value={value.teaser ?? ""} onChange={(next) => set("teaser", next)} />
        <RichBlockEditor label="Structured body" value={value.body} onChange={(next) => set("body", next)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Area label="Topics" value={lines(value.topics)} onChange={(next) => set("topics", stringLines(next))} />
          <Area label="Sectors" value={lines(value.sectors)} onChange={(next) => set("sectors", stringLines(next))} />
        </div>
        <RecordPicker label="Related platforms" kind="platform" value={value.platformIds} onChange={(next) => set("platformIds", next)} />
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
        <MediaField label="Case-study hero image" value={value.heroMedia} overridePath="content.heroMedia" onChange={(next) => set("heroMedia", next)} />
        <Area label="Public capability statement" required error={fieldErrors.impactStatement} value={value.impactStatement ?? ""} onChange={(next) => set("impactStatement", next)} />
        <Area label="Disclosure note" required error={fieldErrors.disclosureNote} value={value.disclosureNote ?? ""} onChange={(next) => set("disclosureNote", next)} />
        <EnumMultiSelect
          label="Related website industries"
          value={value.relatedIndustries}
          options={["financial-services", "telecoms", "travel-hospitality", "energy-resources", "public-sector", "education"]}
          labels={{
            "financial-services": "Financial Services",
            telecoms: "Telecoms",
            "travel-hospitality": "Travel & Hospitality",
            "energy-resources": "Energy & Resources",
            "public-sector": "Public Sector",
            education: "Education",
          }}
          onChange={(next) => set("relatedIndustries", next)}
        />
        <Area label="Visual caption" value={value.visual?.caption ?? ""} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", caption: next })} />
        <Area label="Visual alternative text" value={value.visual?.altText ?? ""} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", altText: next })} />
        <Area label="Visual text equivalent" value={value.visual?.textEquivalent ?? ""} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", textEquivalent: next })} />
        <Area label="Anonymized fixture labels" value={lines(value.visual?.fixtureLabels)} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", fixtureLabels: stringLines(next) })} placeholder="One public-safe interface label per line" />
        <Area label="Mandate" value={value.mandate ?? ""} onChange={(next) => set("mandate", next)} />
        <Area label="Context" value={value.context ?? ""} onChange={(next) => set("context", next)} />
        <StringList label="Constraints" value={value.constraints} onChange={(next) => set("constraints", next)} />
        <RichBlockEditor label="Work delivered" value={value.work} onChange={(next) => set("work", next)} />
        <StringList label="Controls" value={value.controls} onChange={(next) => set("controls", next)} />
        <StringList label="Outcomes" value={value.outcomes} onChange={(next) => set("outcomes", next)} />
        <RecordList label="Approved evidence and claims" value={value.evidence} columns={[{ key: "statement", label: "Claim" }, { key: "source.label", label: "Source label" }, { key: "source.url", label: "Source URL" }, { key: "approved", label: "Approved", type: "checkbox" }]} onChange={(next) => set("evidence", next)} />
        <div className="grid gap-4 sm:grid-cols-2"><Area label="Quote" value={value.quote?.text ?? ""} onChange={(text) => set("quote", text ? { ...value.quote, text } : undefined)} /><Field label="Quote attribution" value={value.quote?.attribution} onChange={(attribution) => set("quote", value.quote?.text ? { ...value.quote, attribution: attribution || undefined } : undefined)} /></div>
      </>}

      {kind === "industry" && !editingIndustryGovernance && <>
        {showIndustryPath("legacyPath") && <section className="space-y-4" aria-labelledby="industry-hero-fields">
          <div><h3 id="industry-hero-fields" className="font-semibold">Hero and industry proposition</h3><p className="text-sm text-muted-foreground">The approved split-hero treatment uses these proposition and media fields.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legacy path" value={value.legacyPath} onChange={(next) => set("legacyPath", next)} placeholder="/industries/legacy-slug" />
          <Field label="Public name" value={value.name} onChange={(next) => set("name", next)} />
          <Field label="Short name" value={value.shortName} onChange={(next) => set("shortName", next)} />
          <Field label="Thesis accent" value={value.accent} onChange={(next) => set("accent", next)} />
          <Field label="Fallback image path" value={value.image} onChange={(next) => set("image", next)} placeholder="/images/industry.jpg" />
          <Field label="Image alternative text" value={value.imageAlt} onChange={(next) => set("imageAlt", next)} />
          <Choice label="Editorial variant" value={value.variant ?? ""} options={["ledger", "network", "journey", "field", "factory"]} onChange={(next) => set("variant", next)} />
        </div>
        <MediaField label="Industry hero image" value={value.heroMedia} overridePath="content.heroMedia" onChange={(next) => set("heroMedia", next ? { ...(value.heroMedia ?? {}), ...next } : undefined)} />
        <Area label="Opening thesis" value={value.thesis ?? ""} onChange={(next) => set("thesis", next)} />
        <Area label="Editorial summary" value={value.dek ?? ""} onChange={(next) => set("dek", next)} />
        </section>}
        {showIndustryPath("opportunity") && <section className="space-y-4">
          <div><h3 className="font-semibold">Opportunity and strategic shift</h3><p className="text-sm text-muted-foreground">This statement remains visible in the contrasting editorial panel.</p></div>
        <Area label="Value-led opportunity" value={value.opportunity ?? ""} onChange={(next) => set("opportunity", next)} placeholder="The client opportunity and value at stake" />
        </section>}
        {showIndustryPath("capabilities") && <section className="space-y-3" aria-labelledby="industry-capabilities-heading">
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
        }
        {showIndustryPath("uses") && <section className="space-y-4">
        <IndustryUsesEditor value={value.uses} onChange={(uses) => set("uses", uses)} />
        </section>}
        {showIndustryPath("pressures") && <section className="space-y-4">
        <PairList label="Operating pressures" value={value.pressures} left="title" right="body" onChange={(next) => set("pressures", next)} />
        </section>}
        {showIndustryPath("reversal") && <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Documented reversal title" required value={value.reversal?.title} onChange={(title) => set("reversal", { ...value.reversal, title })} /><Area label="Documented reversal explanation" required value={value.reversal?.body ?? ""} onChange={(body) => set("reversal", { ...value.reversal, body })} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Myth claim" required value={value.myth?.claim} onChange={(claim) => set("myth", { ...value.myth, claim })} /><Area label="Myth verdict" required value={value.myth?.verdict ?? ""} onChange={(verdict) => set("myth", { ...value.myth, verdict })} /></div>
        </section>}
        {showIndustryPath("gcc") && <section className="space-y-4">
        <Area label="GCC context" value={value.gcc ?? ""} onChange={(next) => set("gcc", next)} />
        </section>}
        {showIndustryPath("selectedWork") && <section className="space-y-4">
        <Area label="Selected work section description" value={value.selectedWork?.description ?? ""} onChange={(next) => set("selectedWork", { ...value.selectedWork, description: next })} placeholder="What evidence and disclosure this section should contain" />
         <RecordList label="Relevant service and first move" value={value.service ? [value.service] : []} minimum={1} columns={[{ key: "label", label: "Service label" }, { key: "href", label: "Internal path" }, { key: "firstMove", label: "First move" }]} onChange={(next) => set("service", next[0] ?? {})} />
        </section>}
        {showIndustryPath("sources") && <section className="space-y-4">
        <RecordList label="Industry source trail" value={value.sources} minimum={1} columns={[{ key: "label", label: "Label" }, { key: "publisher", label: "Publisher" }, { key: "kind", label: "Evidence kind" }, { key: "url", label: "URL" }, { key: "accessedAt", label: "Accessed date", type: "date" }, { key: "market", label: "Market", type: "market" }, { key: "supports", label: "Supports", type: "textarea" }, { key: "limitation", label: "Limitation", type: "textarea" }]} onChange={(next) => set("sources", next)} />
        </section>}
        {(value.educationPov || value.legacyPath === "/industries/education") && ["educationPov.introduction", "educationPov.strategicShift", "educationPov.convictions", "educationPov.valueDomains", "educationPov.applications", "educationPov.patternQuote", "educationPov.leadershipTest"].some(showIndustryPath) && <section className="space-y-4 rounded-md border p-4">
          <h3 className="font-semibold">Higher education POV structure</h3>
          <p className="text-sm text-muted-foreground">Use the governed controls below. This specialist structure is used only by the Education page.</p>
          {showIndustryPath("educationPov.introduction") && !educationV2 && <Button type="button" variant="outline" onClick={() => set("educationPov", {
            ...educationPov,
            version: 2,
            introduction: "",
            strategicShift: "",
            patternQuote: "",
            globalDirection: "",
            valueDomains: [...educationPov.valueDomains, ...Array.from({ length: Math.max(0, 5 - educationPov.valueDomains.length) }, () => ({ title: "", body: "", examples: [] }))],
            targetState: [...educationPov.targetState, ...Array.from({ length: Math.max(0, 7 - educationPov.targetState.length) }, () => ({ title: "", body: "" }))],
          })}>Upgrade to Education POV v2</Button>}
          {showIndustryPath("educationPov.introduction") && educationV2 && <>
            <p className="text-sm font-medium">Education POV contract version 2</p>
            <Area label="Introduction" required value={educationPov.introduction ?? ""} onChange={(introduction) => set("educationPov", updateEducationPov(educationPov, { introduction }))} />
          </>}
          {showIndustryPath("educationPov.strategicShift") && educationV2 && <>
            <Area label="Strategic shift" required value={educationPov.strategicShift ?? ""} onChange={(strategicShift) => set("educationPov", updateEducationPov(educationPov, { strategicShift }))} />
          </>}
          {showIndustryPath("educationPov.patternQuote") && educationV2 && <>
            <Area label="Pattern quote" required value={educationPov.patternQuote ?? ""} onChange={(patternQuote) => set("educationPov", updateEducationPov(educationPov, { patternQuote }))} />
            <Area label="Global direction" required value={educationPov.globalDirection ?? ""} onChange={(globalDirection) => set("educationPov", updateEducationPov(educationPov, { globalDirection }))} />
          </>}
          {showIndustryPath("educationPov.convictions") && <RecordList label="Five convictions" value={educationPov.convictions} minimum={5} columns={[{ key: "title", label: "Title" }, { key: "body", label: "Description" }, ...(educationV2 ? [{ key: "market", label: "Market", type: "market" as const }] : [])]} onChange={(next) => set("educationPov", { ...educationPov, convictions: next })} />}
          {showIndustryPath("educationPov.valueDomains") && <>{educationV2 && <EducationImageryEditor value={educationPov.imagery} onChange={(imagery) => set("educationPov", { ...educationPov, imagery })} />}
          <EducationDomains version={educationV2 ? 2 : undefined} value={educationPov.valueDomains} onChange={(valueDomains) => set("educationPov", { ...educationPov, valueDomains })} />
          <PairList label={educationV2 ? "Seven target-state capabilities" : "Six target-state capabilities"} value={educationPov.targetState} left="title" right="body" onChange={(next) => set("educationPov", { ...educationPov, targetState: next })} /></>}
          {showIndustryPath("educationPov.applications") && <><EducationApplications value={educationPov.applications} onChange={(applications) => set("educationPov", { ...educationPov, applications })} />
          <EducationSignals version={educationV2 ? 2 : undefined} value={educationPov.signals} onChange={(signals) => set("educationPov", { ...educationPov, signals })} /></>}
          {showIndustryPath("educationPov.roadmap") && <RecordList label="Roadmap" value={educationPov.roadmap} minimum={3} columns={[{ key: "horizon", label: "Horizon" }, { key: "title", label: "Title" }, { key: "body", label: "Description" }]} onChange={(next) => set("educationPov", { ...educationPov, roadmap: next })} />}
          {showIndustryPath("educationPov.leadershipTest") && <Area label="Leadership test" value={educationPov.leadershipTest} onChange={(next) => set("educationPov", { ...educationPov, leadershipTest: next })} />}
        </section>}
        {(value.bankingPov || value.legacyPath === "/industries/banking") && <BankingPovEditor
          value={value.bankingPov}
          onChange={(bankingPov) => set("bankingPov", bankingPov)}
          section={industrySection}
        />}
        {(value.name === "Public Sector" || value.legacyPath === "/industries/public-sector") && <PublicSectorPovEditor
          value={value.publicSectorPov}
          onChange={(publicSectorPov) => set("publicSectorPov", publicSectorPov)}
          section={industrySection}
        />}
      </>}

      {kind === "framework" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Framework template" value={value.template ?? ""} options={["agent-authority"]} onChange={(next) => set("template", next)} />
          <Field label="CTA label" value={value.cta?.label} onChange={(next) => set("cta", next ? { label: next, href: value.cta?.href ?? "/value-scan" } : undefined)} />
          <SafeDestinationField label="CTA destination" value={value.cta?.href} onChange={(next) => set("cta", next ? { label: value.cta?.label ?? "Start a Value Scan", href: next } : undefined)} />
        </div>
        <MediaField label="Framework hero image" required value={value.heroMedia} overridePath="content.heroMedia" onChange={(next) => set("heroMedia", next)} />
        <Area label="Teaser" value={value.teaser ?? ""} onChange={(next) => set("teaser", next)} />
        <Area label="Handover explanation" value={value.handoverExplanation ?? ""} onChange={(next) => set("handoverExplanation", next)} rows={6} />
        <RichBlockEditor label="Methodology narrative" value={value.methodology} onChange={(next) => set("methodology", next)} required />
        <GuardrailsAuthorityEditor value={value.guardrails} onChange={(next) => set("guardrails", next)} />
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
          <SafeDestinationField label="CTA destination" value={value.cta?.href} onChange={(next) => set("cta", next ? { label: value.cta?.label ?? "Learn more", href: next, style: value.cta?.style ?? "primary" } : undefined)} />
        </div>
        <Area label="SEO title" value={value.seo?.title ?? ""} onChange={(next) => set("seo", { ...value.seo, title: next || undefined })} />
        <Area label="SEO description" value={value.seo?.description ?? ""} onChange={(next) => set("seo", { ...value.seo, description: next || undefined })} rows={3} />
        <Area label="Legal disclaimer" value={value.legal?.disclaimer ?? ""} onChange={(next) => set("legal", { ...value.legal, disclaimer: next || undefined })} rows={3} />
        <p className="text-sm text-muted-foreground">Add approved visuals within a media section so their purpose and accessibility text travel with the exact revision.</p>
      </>}

      {kind !== "site-configuration" && (kind !== "industry" || editingIndustryGovernance) && common}
    </div>
  );
}

function GuardrailsAuthorityEditor({ value, onChange }: { value: Content | undefined; onChange: (value: Content | undefined) => void }) {
  const section = value ?? {};
  const set = (key: string, next: unknown) => onChange({ ...section, [key]: next });
  const interaction = section.interaction ?? {};
  const requiredControls = interaction.requiredControls ?? {};
  const compensatingControls = interaction.compensatingControls ?? {};
  const figure = (key: "firstFigure" | "secondFigure", asset: string, label: string) => {
    const current = section[key] ?? { asset, altText: "", captionLabel: "", captionLead: "", captionBody: "" };
    return <section className="space-y-3 border-t pt-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">Fixed local asset: {asset}. Its alternative text and caption segments are editable.</p>
      <Area label={`${label} alternative text`} value={current.altText ?? ""} onChange={(altText) => set(key, { ...current, asset, altText })} rows={3} />
      <Field label={`${label} caption label`} value={current.captionLabel} onChange={(captionLabel) => set(key, { ...current, asset, captionLabel })} />
      <Area label={`${label} italic caption opening`} value={current.captionLead ?? ""} onChange={(captionLead) => set(key, { ...current, asset, captionLead })} rows={3} />
      <Area label={`${label} caption remainder`} value={current.captionBody ?? ""} onChange={(captionBody) => set(key, { ...current, asset, captionBody })} rows={3} />
    </section>;
  };
  return (
    <section className="space-y-4 border-t pt-6">
      <div className="flex items-center justify-between gap-4">
        <div><h3 className="font-semibold">Guardrails and authority subsection</h3><p className="mt-1 text-xs text-muted-foreground">Optional structured content. It is omitted from the page until a complete valid subsection is saved.</p></div>
        {value ? <Button type="button" variant="outline" onClick={() => onChange(undefined)}>Remove subsection</Button> : <Button type="button" variant="outline" onClick={() => onChange({})}>Add subsection</Button>}
      </div>
      {value && <>
        <Field label="Subsection heading" value={section.heading} onChange={(heading) => set("heading", heading)} />
        <Area label="Opening paragraph" value={section.opening ?? ""} onChange={(opening) => set("opening", opening)} />
        <Area label="Definition paragraph" value={section.definition ?? ""} onChange={(definition) => set("definition", definition)} rows={6} />
        <Area label="Bank example before italic quote" value={section.bankExample?.beforeQuote ?? ""} onChange={(beforeQuote) => set("bankExample", { ...section.bankExample, beforeQuote })} rows={6} />
        <Field label="Bank example italic quote" value={section.bankExample?.quote} onChange={(quote) => set("bankExample", { ...section.bankExample, quote })} />
        <Area label="Bank example after italic quote" value={section.bankExample?.afterQuote ?? ""} onChange={(afterQuote) => set("bankExample", { ...section.bankExample, afterQuote })} rows={4} />
        <Field label="Comparison heading" value={section.comparisonHeading} onChange={(comparisonHeading) => set("comparisonHeading", comparisonHeading)} />
        <Field label="Comparison column: Guardrails" value={section.comparisonColumns?.guardrails} onChange={(guardrails) => set("comparisonColumns", { ...section.comparisonColumns, guardrails })} />
        <Field label="Comparison column: The Agent Authority Model" value={section.comparisonColumns?.authorityModel} onChange={(authorityModel) => set("comparisonColumns", { ...section.comparisonColumns, authorityModel })} />
        <RecordList label="Three comparison rows" value={section.comparisonRows} minimum={3} maximum={3} columns={[{ key: "label", label: "Row label" }, { key: "guardrails", label: "Guardrails" }, { key: "guardrailsEmphasis", label: "Guardrails emphasis", type: "emphasis" }, { key: "authorityModel", label: "The Agent Authority Model" }, { key: "authorityModelEmphasis", label: "Authority-model emphasis", type: "emphasis" }]} onChange={(comparisonRows) => set("comparisonRows", comparisonRows)} />
        <Field label="Unit heading" value={section.unit?.heading} onChange={(heading) => set("unit", { ...section.unit, heading })} />
        <Area label="Unit paragraph 1" value={section.unit?.paragraphs?.[0] ?? ""} onChange={(paragraph) => set("unit", { ...section.unit, paragraphs: [paragraph, section.unit?.paragraphs?.[1] ?? ""] })} rows={6} />
        <Area label="Unit paragraph 2" value={section.unit?.paragraphs?.[1] ?? ""} onChange={(paragraph) => set("unit", { ...section.unit, paragraphs: [section.unit?.paragraphs?.[0] ?? "", paragraph] })} rows={6} />
        <Field label="Unit closing emphasis" value={section.unit?.emphasis} onChange={(emphasis) => set("unit", { ...section.unit, emphasis })} />
        {figure("firstFigure", "aam-guardrails-vs-authority.svg", "Illustration 1")}
        <Field label="Interaction heading" value={interaction.heading} onChange={(heading) => set("interaction", { ...interaction, heading })} />
        <Area label="Interaction introduction" value={interaction.introduction ?? ""} onChange={(introduction) => set("interaction", { ...interaction, introduction })} />
        <Field label="Exposure rule emphasis" value={interaction.exposure?.lead} onChange={(lead) => set("interaction", { ...interaction, exposure: { ...interaction.exposure, lead } })} />
        <Area label="Exposure rule body" value={interaction.exposure?.body ?? ""} onChange={(body) => set("interaction", { ...interaction, exposure: { ...interaction.exposure, body } })} />
        <Field label="Evidence rule emphasis" value={interaction.evidence?.lead} onChange={(lead) => set("interaction", { ...interaction, evidence: { ...interaction.evidence, lead } })} />
        <Area label="Evidence rule body" value={interaction.evidence?.body ?? ""} onChange={(body) => set("interaction", { ...interaction, evidence: { ...interaction.evidence, body } })} />
        <Area label="Controls introduction" value={interaction.controlsIntroduction ?? ""} onChange={(controlsIntroduction) => set("interaction", { ...interaction, controlsIntroduction })} />
        <Field label="Required controls emphasis" value={requiredControls.lead} onChange={(lead) => set("interaction", { ...interaction, requiredControls: { ...requiredControls, lead } })} />
        <Area label="Required controls before examples" value={requiredControls.bodyBeforeExamples ?? ""} onChange={(bodyBeforeExamples) => set("interaction", { ...interaction, requiredControls: { ...requiredControls, bodyBeforeExamples } })} rows={6} />
        <Area label="Required-controls assurance example" value={requiredControls.assuranceExample ?? ""} onChange={(assuranceExample) => set("interaction", { ...interaction, requiredControls: { ...requiredControls, assuranceExample } })} />
        <Field label="Text between required-controls examples" value={requiredControls.betweenExamples} onChange={(betweenExamples) => set("interaction", { ...interaction, requiredControls: { ...requiredControls, betweenExamples } })} />
        <Area label="Required-controls testable example" value={requiredControls.controlExample ?? ""} onChange={(controlExample) => set("interaction", { ...interaction, requiredControls: { ...requiredControls, controlExample } })} />
        <Field label="Required-controls conclusion" value={requiredControls.conclusion} onChange={(conclusion) => set("interaction", { ...interaction, requiredControls: { ...requiredControls, conclusion } })} />
        <Field label="Compensating-controls emphasis" value={compensatingControls.lead} onChange={(lead) => set("interaction", { ...interaction, compensatingControls: { ...compensatingControls, lead } })} />
        <Area label="Compensating controls before emphasis" value={compensatingControls.bodyBeforeContent ?? ""} onChange={(bodyBeforeContent) => set("interaction", { ...interaction, compensatingControls: { ...compensatingControls, bodyBeforeContent } })} rows={6} />
        <Field label="Compensating-controls content emphasis" value={compensatingControls.content} onChange={(content) => set("interaction", { ...interaction, compensatingControls: { ...compensatingControls, content } })} />
        <Area label="Compensating controls after emphasis" value={compensatingControls.bodyAfterContent ?? ""} onChange={(bodyAfterContent) => set("interaction", { ...interaction, compensatingControls: { ...compensatingControls, bodyAfterContent } })} rows={6} />
        {figure("secondFigure", "aam-how-they-interact.svg", "Illustration 2")}
        <Field label="Design-rule heading" value={section.designRule?.heading} onChange={(heading) => set("designRule", { ...section.designRule, heading })} />
        <Area label="Design-rule pull quote" value={section.designRule?.quote ?? ""} onChange={(quote) => set("designRule", { ...section.designRule, quote })} rows={5} />
        <Area label="Design-rule conclusion" value={section.designRule?.conclusion ?? ""} onChange={(conclusion) => set("designRule", { ...section.designRule, conclusion })} rows={6} />
        <Area label="Design-rule failure paragraph" value={section.designRule?.failure ?? ""} onChange={(failure) => set("designRule", { ...section.designRule, failure })} rows={5} />
        <Field label="Closing emphasis" value={section.designRule?.closingEmphasis} onChange={(closingEmphasis) => set("designRule", { ...section.designRule, closingEmphasis })} />
      </>}
    </section>
  );
}

const bankingDomains = [
  ["credit-lending", "Credit & Lending"],
  ["risk-fraud", "Risk & Fraud"],
  ["operations-process", "Operations & Process"],
  ["customer-sales", "Customer & Sales"],
  ["engineering-it", "Engineering & IT"],
  ["compliance-regulation", "Compliance & Regulation"],
];
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

function EducationImageryEditor({ value, onChange }: { value: unknown; onChange: (value: Content) => void }) {
  const imagery = value && typeof value === "object" ? value as Content : {};
  const updateScene = (key: "educatorPractice" | "researchCoordination", patch: Content) =>
    onChange({ ...imagery, [key]: { ...(imagery[key] as Content | undefined), ...patch } });
  const scenes: Array<{ key: "educatorPractice" | "researchCoordination"; label: string }> = [
    { key: "educatorPractice", label: "Educator practice" },
    { key: "researchCoordination", label: "Research coordination" },
  ];
  return <section className="space-y-4 rounded-md border p-4">
    <div><h4 className="font-medium">Approved education scenes</h4><p className="text-xs text-muted-foreground">Each scene retains its revision-pinned supporting media and accessible alternative text.</p></div>
    {scenes.map(({ key, label }) => {
      const scene = imagery[key] && typeof imagery[key] === "object" ? imagery[key] as Content : {};
      return <fieldset key={key} className="space-y-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">{label}</legend>
        <Field label={`${label} source path`} required value={scene.src} onChange={(src) => updateScene(key, { src })} placeholder="/images/industries/education.jpg" />
        <Area label={`${label} alternative text`} required value={scene.altText ?? ""} onChange={(altText) => updateScene(key, { altText })} rows={2} />
        <MediaField
          label={`${label} approved image`}
          role="supporting"
          value={scene.media?.mediaId && scene.media?.mediaVersionId ? scene.media as MediaSelection : undefined}
          onChange={(media) => updateScene(key, { media: media ? { ...(scene.media ?? {}), ...media } : undefined })}
        />
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
        <RichBlockEditor label="Structured narrative" required value={section.body} onChange={(body) => update(index, { body })} />
      </>}
      {section.type === "cta" && <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Label" required value={section.label} onChange={(label) => update(index, { label })} />
        <SafeDestinationField label="Destination" required value={section.href} onChange={(href) => update(index, { href })} />
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

type RecordColumn = { key: string; label: string; type?: "text" | "date" | "checkbox" | "market" | "textarea" | "emphasis" };

function RecordList({ label, value, columns, onChange, minimum = 0, maximum }: {
  label: string; value: unknown; columns: RecordColumn[]; onChange: (value: Array<Record<string, any>>) => void; minimum?: number; maximum?: number;
}) {
  const items = Array.isArray(value) ? value as Array<Record<string, any>> : [];
  const get = (item: Record<string, any>, path: string) => path.split(".").reduce((current, key) => current?.[key], item);
  const setPath = (item: Record<string, any>, path: string, next: unknown) => {
    const [head, tail] = path.split(".");
    return tail ? { ...item, [head]: { ...(item[head] ?? {}), [tail]: next } } : { ...item, [head]: next };
  };
  return <section className="space-y-3">
    <div className="flex items-center justify-between"><Label>{label} <Requirement required={minimum > 0} /></Label><Button type="button" size="sm" variant="outline" disabled={maximum !== undefined && items.length >= maximum} onClick={() => onChange([...items, {}])}>Add row</Button></div>
    {items.map((item, index) => <fieldset key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
      <legend className="px-1 text-xs font-medium">{label} {index + 1}</legend>
      {columns.map((column) => <div key={column.key} className={column.key.includes("body") || column.key.includes("statement") ? "sm:col-span-2" : ""}>
        <Label className="text-xs">{column.label}</Label>
        {column.type === "checkbox"
          ? <input type="checkbox" className="ml-2" checked={Boolean(get(item, column.key))} onChange={(event) => onChange(items.map((current, currentIndex) => currentIndex === index ? setPath(current, column.key, event.target.checked) : current))} />
          : column.type === "market"
            ? <Choice label={`${label} ${index + 1} ${column.label}`} value={get(item, column.key) ?? "all-markets"} options={educationMarkets} onChange={(next) => onChange(items.map((current, currentIndex) => currentIndex === index ? setPath(current, column.key, next === "all-markets" ? undefined : next) : current))} />
            : column.type === "emphasis"
              ? <Choice label={`${label} ${index + 1} ${column.label}`} value={get(item, column.key) ?? "plain"} options={["plain", "italic"]} onChange={(next) => onChange(items.map((current, currentIndex) => currentIndex === index ? setPath(current, column.key, next) : current))} />
            : column.type === "textarea"
              ? <Textarea aria-label={`${label} ${index + 1} ${column.label}`} rows={3} value={get(item, column.key) ?? ""} onChange={(event) => onChange(items.map((current, currentIndex) => currentIndex === index ? setPath(current, column.key, event.target.value) : current))} />
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

function IndustryUsesEditor({ value, onChange }: {
  value: unknown;
  onChange: (value: Array<Record<string, any>>) => void;
}) {
  const items = Array.isArray(value) ? value as Array<Record<string, any>> : [];
  const update = (index: number, patch: Record<string, unknown>) =>
    onChange(items.map((item, current) => current === index ? { ...item, ...patch } : item));
  return <section className="space-y-3">
    <div className="flex items-center justify-between">
      <div><Label>Use-case evidence <Requirement required /></Label><p className="text-xs text-muted-foreground">Use source URLs from the industry source trail to keep each claim attributable.</p></div>
      <Button type="button" size="sm" variant="outline" disabled={items.length >= 12} onClick={() => onChange([...items, { use: "", description: "", evidence: "", boundary: "", sourceUrls: [] }])}>Add use case</Button>
    </div>
    {items.map((item, index) => <fieldset key={index} className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium">Use case {index + 1}</legend>
      <Field label={`Use case ${index + 1}`} required value={item.use} onChange={(use) => update(index, { use })} />
      <Area label={`Use case ${index + 1} description`} value={item.description ?? ""} onChange={(description) => update(index, { description: description || undefined })} rows={4} />
      <Area label={`Use case ${index + 1} evidence`} required value={item.evidence ?? ""} onChange={(evidence) => update(index, { evidence })} rows={5} />
      <Area label={`Use case ${index + 1} required boundary`} required value={item.boundary ?? ""} onChange={(boundary) => update(index, { boundary })} rows={3} />
      <StringList label={`Use case ${index + 1} source URLs`} required maximum={12} value={item.sourceUrls} onChange={(sourceUrls) => update(index, { sourceUrls })} />
      <Button type="button" variant="ghost" disabled={items.length <= 1} onClick={() => onChange(items.filter((_, current) => current !== index))}>Remove use case</Button>
    </fieldset>)}
  </section>;
}

const publicSectorMarkets = ["uae", "ksa", "turkiye", "europe"];

function publicSectorPovDraft(): Content {
  return {
    version: 1,
    market: "uae",
    marketLabel: "United Arab Emirates",
    opportunity: [],
    pressuresHeading: "",
    capabilitiesIntroduction: "",
    applicationsDisclaimer: "",
    marketHeading: "",
    marketContext: [],
    sourcesIntroduction: "",
    nextAction: [],
  };
}

type PublicSectorRichBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; style: "bullet" | "numbered"; items: string[] };

function publicSectorRichBlocks(value: unknown): unknown[] {
  return richBlockValues(value);
}

function isPublicSectorRichBlock(block: unknown): block is PublicSectorRichBlock {
  return Boolean(block)
    && typeof block === "object"
    && !Array.isArray(block)
    && ((block as Record<string, unknown>).type === "paragraph"
      || (block as Record<string, unknown>).type === "heading"
      || (block as Record<string, unknown>).type === "list");
}

function publicSectorRichBlockText(block: PublicSectorRichBlock) {
  return "text" in block ? block.text : block.items.join("\n");
}

function publicSectorRichBlockIsSupported(block: unknown): block is PublicSectorRichBlock {
  return isPublicSectorRichBlock(block);
}

function PublicSectorRichBlockEditor({ label, value, onChange, required }: {
  label: string;
  value: unknown;
  onChange: (value: unknown[]) => void;
  required?: boolean;
}) {
  const blocks = publicSectorRichBlocks(value);
  const update = (index: number, next: unknown) =>
    onChange(blocks.map((block, current) => current === index ? next : block));
  const changeType = (index: number, type: PublicSectorRichBlock["type"]) => {
    const current = blocks[index];
    if (!isPublicSectorRichBlock(current)) return;
    const text = publicSectorRichBlockText(current);
    update(index, type === "heading"
      ? { type, level: current.type === "heading" ? current.level : 2, text }
      : type === "list"
        ? { type, style: current.type === "list" ? current.style : "bullet", items: current.type === "list" ? current.items : [text] }
        : { type, text });
  };
  return <section className="space-y-3">
    <div className="flex items-center justify-between">
      <Label>{label} <Requirement required={required} /></Label>
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...blocks, { type: "paragraph", text: "" }])}>Add block</Button>
    </div>
    <p className="text-xs text-muted-foreground">Blocks and list items are edited individually. Line breaks, numbering, and punctuation are preserved exactly.</p>
    {blocks.map((block, index) => !publicSectorRichBlockIsSupported(block) ? (
      <fieldset key={index} className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <legend className="px-1 text-xs font-medium">Unsupported legacy block {index + 1}</legend>
        <p role="alert" className="text-sm text-amber-800 dark:text-amber-200">This block is preserved unchanged because it is outside the Public Sector contract.</p>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background p-2 text-xs">{JSON.stringify(block, null, 2)}</pre>
        <Button type="button" variant="ghost" onClick={() => onChange(removeRichBlock(value, index))}>Remove unsupported block</Button>
      </fieldset>
    ) : <fieldset key={index} className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium">{label} {index + 1}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice label={`${label} ${index + 1} type`} value={block.type} options={["paragraph", "heading", "list"]} onChange={(type) => changeType(index, type as PublicSectorRichBlock["type"])} />
        {block.type === "heading" && <Choice label={`${label} ${index + 1} level`} value={String(block.level)} options={["2", "3"]} onChange={(level) => update(index, { ...block, level: Number(level) as 2 | 3 })} />}
        {block.type === "list" && <Choice label={`${label} ${index + 1} style`} value={block.style} options={["bullet", "numbered"]} onChange={(style) => update(index, { ...block, style: style as "bullet" | "numbered" })} />}
      </div>
      {block.type === "list"
        ? <RichListItems label={`${label} ${index + 1} items`} value={block.items} onChange={(items) => update(index, { ...block, items })} />
        : <Area label={`${label} ${index + 1} text`} required value={block.text} onChange={(text) => update(index, { ...block, text })} rows={5} />}
      <Button type="button" variant="ghost" onClick={() => onChange(removeRichBlock(value, index))}>Remove block</Button>
    </fieldset>)}
    {blocks.length === 0 && <p className="text-xs text-muted-foreground">No blocks added.</p>}
  </section>;
}

function PublicSectorPovEditor({ value, onChange, section }: {
  value: Content | undefined;
  onChange: (value: Content | undefined) => void;
  section?: string;
}) {
  const show = (path: string) => !section || (isIndustrySectionId(section) && belongsToIndustrySection(path, section));
  if (!value) {
    if (!show("publicSectorPov.marketLabel")) return null;
    return <section className="space-y-3 rounded-md border p-4">
      <h3 className="font-semibold">Public Sector POV structure</h3>
      <p className="text-sm text-muted-foreground">This market-specific editorial structure is available only to Public Sector. Its evidence and preview remain pinned to the exact selected market.</p>
      <Button type="button" variant="outline" onClick={() => onChange(publicSectorPovDraft())}>Add Public Sector POV v1</Button>
    </section>;
  }
  const update = (patch: Content) => onChange({ ...value, ...patch });
  return <section className="space-y-4 rounded-md border p-4">
    <div>
      <h3 className="font-semibold">Public Sector POV structure</h3>
      <p className="text-sm text-muted-foreground">Version 1 uses exact market copy. It cannot fall back to a different Public Sector market.</p>
    </div>
    {show("publicSectorPov.marketLabel") && <div className="grid gap-4 sm:grid-cols-2">
      <Choice label="Public Sector market" required value={value.market ?? "uae"} options={publicSectorMarkets} onChange={(market) => update({ market })} />
      <Field label="Market label" required value={value.marketLabel} onChange={(marketLabel) => update({ marketLabel })} />
    </div>}
    {show("publicSectorPov.opportunity") && <PublicSectorRichBlockEditor label="Public Sector opportunity blocks" required value={value.opportunity} onChange={(opportunity) => update({ opportunity })} />}
    {show("publicSectorPov.pressuresHeading") && <Field label="Operating pressures heading" required value={value.pressuresHeading} onChange={(pressuresHeading) => update({ pressuresHeading })} />}
    {show("publicSectorPov.capabilitiesIntroduction") && <Area label="Capabilities introduction" required value={value.capabilitiesIntroduction ?? ""} onChange={(capabilitiesIntroduction) => update({ capabilitiesIntroduction })} rows={5} />}
    {show("publicSectorPov.applicationsDisclaimer") && <Area label="Applications disclaimer" required value={value.applicationsDisclaimer ?? ""} onChange={(applicationsDisclaimer) => update({ applicationsDisclaimer })} rows={5} />}
    {show("publicSectorPov.marketHeading") && <Field label="Market context heading" required value={value.marketHeading} onChange={(marketHeading) => update({ marketHeading })} />}
    {show("publicSectorPov.marketContext") && <PublicSectorRichBlockEditor label="Market context blocks" required value={value.marketContext} onChange={(marketContext) => update({ marketContext })} />}
    {show("publicSectorPov.sourcesIntroduction") && <Area label="Sources introduction" required value={value.sourcesIntroduction ?? ""} onChange={(sourcesIntroduction) => update({ sourcesIntroduction })} rows={5} />}
    {show("publicSectorPov.reviewBlockers") && <StringList label="Review blockers (publish gate)" maximum={30} value={value.reviewBlockers} onChange={(reviewBlockers) => update({ reviewBlockers: reviewBlockers.length ? reviewBlockers : undefined })} />}
    {show("publicSectorPov.nextAction") && <PublicSectorRichBlockEditor label="Next action blocks" required value={value.nextAction} onChange={(nextAction) => update({ nextAction })} />}
  </section>;
}

function EducationDomains({ value, onChange, version }: { value: unknown; onChange: (value: any[]) => void; version?: 2 }) {
  const items = Array.isArray(value) ? value : [];
  const maximum = version === 2 ? 5 : 3;
  return <section className="space-y-3"><div className="flex justify-between"><Label>{version === 2 ? "Five value domains" : "Three value domains"} <Requirement required /></Label><Button type="button" size="sm" variant="outline" disabled={items.length >= maximum} onClick={() => onChange([...items, { title: "", body: "", examples: [] }])}>Add domain</Button></div>{items.map((item, index) => <fieldset key={index} className="space-y-3 rounded-md border p-3"><legend>Domain {index + 1}</legend><Field label={`Domain ${index + 1} title`} required value={item.title} onChange={(title) => onChange(items.map((current, i) => i === index ? { ...current, title } : current))} /><Area label={`Domain ${index + 1} description`} required value={item.body ?? ""} onChange={(body) => onChange(items.map((current, i) => i === index ? { ...current, body } : current))} /><StringList label={`Domain ${index + 1} examples`} required={version !== 2} value={item.examples} onChange={(examples) => onChange(items.map((current, i) => i === index ? { ...current, examples } : current))} /><Button type="button" variant="ghost" aria-label={`Remove domain ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove domain</Button></fieldset>)}</section>;
}

const bankingStartingPoints = [
  ["core-banking-operations", "Core Banking Operations"],
  ["contact-centre", "Contact Centre"],
  ["software-delivery", "Software Delivery"],
  ["marketing-intelligence", "Marketing Intelligence"],
];

const bankingJourneys = [
  ["accounts-cards", "Accounts & cards"],
  ["payments-transfers", "Payments & transfers"],
  ["loans-deposits", "Loans & deposits"],
  ["fraud-card-security", "Fraud & card security"],
  ["digital-channel-support", "Digital channel support"],
  ["collections-reminders", "Collections & reminders"],
  ["campaigns-outbound", "Campaigns & outbound"],
];

function BankingProductionEditor({ value, onChange }: { value: Content; onChange: (value: Content) => void }) {
  const production = value ?? {};
  return <fieldset className="space-y-3 rounded-md border p-3"><legend>Production readiness — From permission to action</legend><Field label="Readiness eyebrow" required value={production.eyebrow} onChange={(eyebrow) => onChange({ ...production, eyebrow })} /><Field label="Readiness heading" required value={production.heading} onChange={(heading) => onChange({ ...production, heading })} /><Area label="Readiness narrative" required value={production.body ?? ""} onChange={(body) => onChange({ ...production, body })} /><StringList label="Production practices" required value={production.practices} onChange={(practices) => onChange({ ...production, practices })} /><MediaField label="Permission-to-action artwork" role="supporting" required value={production.image?.mediaId && production.image?.mediaVersionId ? production.image as MediaSelection : undefined} onChange={(image) => onChange({ ...production, image: image ? { ...(production.image ?? {}), ...image } : undefined })} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Artwork focal X (0–100)" required type="number" value={production.focalPoint?.x} onChange={(x) => onChange({ ...production, focalPoint: { ...production.focalPoint, x: Number(x) } })} /><Field label="Artwork focal Y (0–100)" required type="number" value={production.focalPoint?.y} onChange={(y) => onChange({ ...production, focalPoint: { ...production.focalPoint, y: Number(y) } })} /></div><Area label="Artwork annotation" required value={production.annotation ?? ""} onChange={(annotation) => onChange({ ...production, annotation })} /></fieldset>;
}

function BankingStartingPointEditor({ value, onChange }: { value: Content[]; onChange: (value: Content[]) => void }) {
  const points = Array.isArray(value) ? value : [];
  const update = (index: number, patch: Content) => onChange(points.map((item, current) => current === index ? { ...item, ...patch } : item));
  return <section className="space-y-3"><Label>Four image-led starting points <Requirement required /></Label>{points.map((item, index) => <fieldset key={item.id ?? index} className="space-y-3 rounded-md border p-3"><legend>{item.title || `Starting point ${index + 1}`}</legend><Field label={`${item.title || "Starting point"} value proposition`} required value={item.valueProposition} onChange={(valueProposition) => update(index, { valueProposition })} /><Area label={`${item.title || "Starting point"} problem`} required value={item.problem ?? ""} onChange={(problem) => update(index, { problem })} /><Area label={`${item.title || "Starting point"} Cognirise role`} required value={item.cogniriseRole ?? ""} onChange={(cogniriseRole) => update(index, { cogniriseRole })} /><StringList label={`${item.title || "Starting point"} required inputs`} required value={item.requiredInputs} onChange={(requiredInputs) => update(index, { requiredInputs })} /><Area label={`${item.title || "Starting point"} first deliverable`} required value={item.firstDeliverable ?? ""} onChange={(firstDeliverable) => update(index, { firstDeliverable })} /><StringList label={`${item.title || "Starting point"} measures`} required value={item.measures} onChange={(measures) => update(index, { measures })} /><Area label={`${item.title || "Starting point"} decision boundary`} required value={item.decisionBoundary ?? ""} onChange={(decisionBoundary) => update(index, { decisionBoundary })} /><div className="grid gap-4 sm:grid-cols-2"><Field label={`${item.title || "Starting point"} CTA label`} required value={item.action?.label} onChange={(label) => update(index, { action: { ...item.action, label } })} /><Field label={`${item.title || "Starting point"} CTA link`} required value={item.action?.href} onChange={(href) => update(index, { action: { ...item.action, href } })} /></div><MediaField label={`${item.title || "Starting point"} card image`} role="supporting" required value={item.image?.mediaId && item.image?.mediaVersionId ? item.image as MediaSelection : undefined} onChange={(image) => update(index, { image: image ? { ...(item.image ?? {}), ...image } : undefined })} /><div className="grid gap-4 sm:grid-cols-2"><Field label={`${item.title || "Starting point"} image focal X (0–100)`} required type="number" value={item.focalPoint?.x} onChange={(x) => update(index, { focalPoint: { ...item.focalPoint, x: Number(x) } })} /><Field label={`${item.title || "Starting point"} image focal Y (0–100)`} required type="number" value={item.focalPoint?.y} onChange={(y) => update(index, { focalPoint: { ...item.focalPoint, y: Number(y) } })} /></div></fieldset>)}</section>;
}

function BankingValueOutcomes({ value, onChange }: { value: Content[]; onChange: (value: Content[]) => void }) {
  const values = Array.isArray(value) ? value : [];
  return <section className="space-y-3"><Label>Three business value outcomes <Requirement required /></Label>{values.map((item, index) => <fieldset key={index} className="space-y-3 rounded-md border p-3"><legend>Outcome {index + 1}</legend><Field label={`Outcome ${index + 1} title`} required value={item.title} onChange={(title) => onChange(values.map((current, i) => i === index ? { ...current, title } : current))} /><Area label={`Outcome ${index + 1} explanation`} required value={item.body ?? ""} onChange={(body) => onChange(values.map((current, i) => i === index ? { ...current, body } : current))} /><StringList label={`Outcome ${index + 1} measures`} required value={item.measures} onChange={(measures) => onChange(values.map((current, i) => i === index ? { ...current, measures } : current))} /></fieldset>)}</section>;
}

function BankingPovEditor({ value, onChange, section }: { value: Content | undefined; onChange: (value: Content) => void; section?: string }) {
  const show = (path: string) => !section || (isIndustrySectionId(section) && belongsToIndustrySection(path, section));
  if (!value) {
    if (!show("bankingPov.hero")) return null;
    return <section className="space-y-3 rounded-md border p-4">
      <h3 className="font-semibold">Banking POV structure</h3>
      <p className="text-sm text-muted-foreground">This specialist structure is available only to Financial Services. It keeps evidence, controls, media pins, and the protected case receipt editable as structured fields.</p>
      <Button type="button" variant="outline" onClick={() => onChange(bankingPovDraft())}>Add Banking POV v1</Button>
    </section>;
  }
  const update = (patch: Content) => onChange({ ...value, ...patch });
  return <section className="space-y-5 rounded-md border p-4">
    <div>
      <h3 className="font-semibold">Banking POV structure</h3>
      <p className="text-sm text-muted-foreground">Publish requires the complete governed Banking POV, exact required sets, source associations, immutable approved media, and the captured public case receipt.</p>
    </div>
    {show("bankingPov.hero") && <><div className="grid gap-4 sm:grid-cols-2">
      <Field label="Banking descriptor" required value={value.descriptor} onChange={(descriptor) => update({ descriptor })} />
    </div>
    <fieldset className="space-y-3 rounded-md border p-3"><legend>Hero</legend>
      <Field label="Hero eyebrow" required value={value.hero?.eyebrow} onChange={(eyebrow) => update({ hero: { ...value.hero, eyebrow } })} />
      <Field label="Hero heading" required value={value.hero?.heading} onChange={(heading) => update({ hero: { ...value.hero, heading } })} />
      <Area label="Hero body" required value={value.hero?.body ?? ""} onChange={(body) => update({ hero: { ...value.hero, body } })} />
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Starting-points anchor label" required value={value.hero?.startingPointsAnchorLabel} onChange={(startingPointsAnchorLabel) => update({ hero: { ...value.hero, startingPointsAnchorLabel } })} /><Field label="Selected-work anchor label" required value={value.hero?.selectedWorkAnchorLabel} onChange={(selectedWorkAnchorLabel) => update({ hero: { ...value.hero, selectedWorkAnchorLabel } })} /></div>
    </fieldset></>}
    {show("bankingPov.evidenceSignals") && <RecordList label="Attributed evidence signals" value={value.evidenceSignals} minimum={1} columns={[{ key: "statement", label: "Claim supported" }, { key: "qualification", label: "Qualification" }, { key: "label", label: "Source title" }, { key: "publisher", label: "Publisher" }, { key: "publicationPeriod", label: "Publication period" }, { key: "accessedAt", label: "Accessed", type: "date" }, { key: "jurisdiction", label: "Jurisdiction" }, { key: "kind", label: "Evidence category" }, { key: "url", label: "Source URL" }]} onChange={(evidenceSignals) => update({ evidenceSignals })} />}
    {show("bankingPov.valueOutcomes") && <BankingValueOutcomes value={value.valueOutcomes} onChange={(valueOutcomes) => update({ valueOutcomes })} />}
    {show("bankingPov.adoptionLevels") && <BankingLevels value={value.adoptionLevels} onChange={(adoptionLevels) => update({ adoptionLevels })} />}
    {show("bankingPov.valueDomains") && <BankingDomains value={value.valueDomains} onChange={(valueDomains) => update({ valueDomains })} />}
    {show("bankingPov.startingPoints") && <BankingStartingPointEditor value={value.startingPoints} onChange={(startingPoints) => update({ startingPoints })} />}
    {show("bankingPov.voiceBanking") && <BankingVoiceEditor value={value.voiceBanking} onChange={(voiceBanking) => update({ voiceBanking })} />}
    {show("bankingPov.productionReadiness") && <BankingProductionEditor value={value.productionReadiness} onChange={(productionReadiness) => update({ productionReadiness })} />}
    {show("bankingPov.deliveryPath") && <fieldset className="space-y-3 rounded-md border p-3"><legend>Delivery path</legend><RecordList label="Named delivery stages" value={value.deliveryPath?.stages} minimum={4} columns={[{ key: "stage", label: "Stage" }, { key: "owner", label: "Owner" }, { key: "outcome", label: "Outcome" }]} onChange={(stages) => update({ deliveryPath: { ...value.deliveryPath, stages } })} /><StringList label="Delivery-path practices" required value={value.deliveryPath?.practices} onChange={(practices) => update({ deliveryPath: { ...value.deliveryPath, practices } })} /></fieldset>}
    {show("bankingPov.market") && <Choice label="Banking market" required value={value.market ?? "uae"} options={["uae", "ksa", "turkiye", "europe"]} onChange={(market) => update({ market })} />}
    {show("bankingPov.partners") && <RecordList label="Partner roles" value={value.partners} minimum={2} columns={[{ key: "name", label: "Partner" }, { key: "contribution", label: "Contribution" }, { key: "qualification", label: "Qualification" }, { key: "href", label: "External link" }]} onChange={(partners) => update({ partners })} />}
    {show("bankingPov.caseMembershipSnapshot") && <RecordList label="Protected published case receipt" value={value.caseMembershipSnapshot} minimum={1} columns={[{ key: "slug", label: "Case slug" }, { key: "title", label: "Published title" }, { key: "order", label: "Published order" }, { key: "digest", label: "Payload digest" }]} onChange={(caseMembershipSnapshot) => update({ caseMembershipSnapshot })} />}
    {show("bankingPov.cta") && <fieldset className="space-y-3 rounded-md border p-3"><legend>Existing Value Scan CTA</legend><Field label="CTA heading" required value={value.cta?.heading} onChange={(heading) => update({ cta: { ...value.cta, heading } })} /><Area label="CTA body" required value={value.cta?.body ?? ""} onChange={(body) => update({ cta: { ...value.cta, body }})} /><div className="grid gap-4 sm:grid-cols-2"><Field label="CTA label" required value={value.cta?.label} onChange={(label) => update({ cta: { ...value.cta, label } })} /><Field label="CTA destination" required value={value.cta?.href} onChange={(href) => update({ cta: { ...value.cta, href } })} /></div></fieldset>}
  </section>;
}

function BankingDomains({ value, onChange }: { value: Content[]; onChange: (value: Content[]) => void }) {
  const domains = Array.isArray(value) ? value : [];
  const update = (index: number, patch: Content) => onChange(domains.map((item, current) => current === index ? { ...item, ...patch } : item));
  return <section className="space-y-3"><Label>Six banking value domains <Requirement required /></Label>{domains.map((item, index) => <fieldset key={item.id ?? index} className="space-y-3 rounded-md border p-3"><legend>{item.title || `Domain ${index + 1}`}</legend><Area label={`${item.title || "Domain"} purpose`} required value={item.purpose ?? ""} onChange={(purpose) => update(index, { purpose })} /><StringList label={`${item.title || "Domain"} examples`} required value={item.examples} onChange={(examples) => update(index, { examples })} /><StringList label={`${item.title || "Domain"} observable measures`} required value={item.measures} onChange={(measures) => update(index, { measures })} /></fieldset>)}</section>;
}

function BankingVoiceEditor({ value, onChange }: { value: Content; onChange: (value: Content) => void }) {
  const voice = value ?? {};
  const journeys = Array.isArray(voice.journeys) ? voice.journeys : [];
  const updateJourney = (index: number, patch: Content) => onChange({ ...voice, journeys: journeys.map((item, current) => current === index ? { ...item, ...patch } : item) });
  return <section className="space-y-3"><Label>Voice banking explorer <Requirement required /></Label><fieldset className="space-y-3 rounded-md border p-3"><legend>Lupitor platform contribution</legend><Area label="Platform contribution" required value={voice.platform?.contribution ?? ""} onChange={(contribution) => onChange({ ...voice, platform: { ...voice.platform, name: "Lupitor", contribution } })} /><Field label="Platform link" required value={voice.platform?.href} onChange={(href) => onChange({ ...voice, platform: { ...voice.platform, name: "Lupitor", href } })} /><Area label="Platform claim qualification" required value={voice.platform?.qualification ?? ""} onChange={(qualification) => onChange({ ...voice, platform: { ...voice.platform, name: "Lupitor", qualification } })} /><Area label="Cognirise integration and operating role" required value={voice.cogniriseContribution ?? ""} onChange={(cogniriseContribution) => onChange({ ...voice, cogniriseContribution })} /></fieldset>{journeys.map((item, index) => <fieldset key={item.id ?? index} className="space-y-3 rounded-md border p-3"><legend>{item.title || `Voice journey ${index + 1}`}</legend><Area label={`${item.title || "Voice journey"} scope`} required value={item.scope ?? ""} onChange={(scope) => updateJourney(index, { scope })} /><StringList label={`${item.title || "Voice journey"} measures`} required value={item.measures} onChange={(measures) => updateJourney(index, { measures })} /><Area label={`${item.title || "Voice journey"} control boundary`} required value={item.controlBoundary ?? ""} onChange={(controlBoundary) => updateJourney(index, { controlBoundary })} /></fieldset>)}</section>;
}

function bankingPovDraft(): Content {
  return {
    version: 1, market: "uae", descriptor: "",
    hero: { eyebrow: "Banking POV", heading: "One bank. Three levels of AI value.", body: "", startingPointsAnchorLabel: "Explore four starting points", selectedWorkAnchorLabel: "See selected work" },
    evidenceSignals: [], valueOutcomes: [{ title: "", body: "", measures: [] }, { title: "", body: "", measures: [] }, { title: "", body: "", measures: [] }],
    adoptionLevels: [1, 2, 3].map((level) => ({ level, title: "", value: "", illustrativeWork: [], owner: "", readiness: [], measures: [], decisionBoundary: "" })),
    valueDomains: bankingDomains.map(([id, title]) => ({ id, title, purpose: "", examples: [], measures: [] })),
    startingPoints: bankingStartingPoints.map(([id, title]) => ({ id, title, valueProposition: "", problem: "", cogniriseRole: "", requiredInputs: [], firstDeliverable: "", measures: [], decisionBoundary: "", action: { label: "Discuss this workflow", href: "/value-scan" }, focalPoint: { x: 50, y: 50 } })),
    voiceBanking: { platform: { name: "Lupitor", contribution: "", href: "https://www.lupitor.com/industries/banking", qualification: "" }, cogniriseContribution: "", journeys: bankingJourneys.map(([id, title]) => ({ id, title, scope: "", measures: [], controlBoundary: "" })) },
    productionReadiness: { eyebrow: "Production readiness", heading: "From permission to action.", body: "", practices: [], focalPoint: { x: 50, y: 50 }, annotation: "" },
    deliveryPath: { stages: [{ stage: "Value discovery", owner: "", outcome: "" }, { stage: "Workflow design", owner: "", outcome: "" }, { stage: "Bounded pilot evaluation", owner: "", outcome: "" }, { stage: "Operational scaling", owner: "", outcome: "" }], practices: [] },
    partners: [{ name: "Lupitor", contribution: "", qualification: "", href: "https://www.lupitor.com/" }, { name: "Ekimetrics", contribution: "", qualification: "", href: "https://www.ekimetrics.com/en-us/industries/financial-services" }],
    cta: { heading: "", body: "", label: "Start a Value Scan", href: "/value-scan" },
    caseMembershipSnapshot: [],
  };
}

function BankingLevels({ value, onChange }: { value: Content[]; onChange: (value: Content[]) => void }) {
  const levels = Array.isArray(value) ? value : [];
  const update = (index: number, patch: Content) => onChange(levels.map((item, current) => current === index ? { ...item, ...patch } : item));
  return <section className="space-y-3"><Label>Three accountable adoption levels <Requirement required /></Label>{levels.map((item, index) => <fieldset key={item.level ?? index} className="space-y-3 rounded-md border p-3"><legend>Level {item.level ?? index + 1}</legend><Field label={`Level ${index + 1} title`} required value={item.title} onChange={(title) => update(index, { title })} /><Area label={`Level ${index + 1} value`} required value={item.value ?? ""} onChange={(value) => update(index, { value })} /><Field label={`Level ${index + 1} accountable owner`} required value={item.owner} onChange={(owner) => update(index, { owner })} /><StringList label={`Level ${index + 1} illustrative work`} required value={item.illustrativeWork} onChange={(illustrativeWork) => update(index, { illustrativeWork })} /><StringList label={`Level ${index + 1} readiness conditions`} required value={item.readiness} onChange={(readiness) => update(index, { readiness })} /><StringList label={`Level ${index + 1} measures`} required value={item.measures} onChange={(measures) => update(index, { measures })} /><Area label={`Level ${index + 1} decision boundary`} required value={item.decisionBoundary ?? ""} onChange={(decisionBoundary) => update(index, { decisionBoundary })} /></fieldset>)}</section>;
}
