import {
  HOMEPAGE_INDUSTRY_IDS,
  methodologyEditorialDefinition,
  type CmsDocumentKind,
  type MethodologySlot,
} from "@workspace/api-zod";
import type { ReactNode } from "react";
import { useState } from "react";
import { TelecomPovEditor } from "./TelecomPovEditor";
import { PublicSectorNativeEditor } from "./PublicSectorNativeEditor";
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
import { PulsePageEditor } from "./PulsePageEditor";
import { hasAuthoredPlatformContent, replacePlatformTemplate, type PulseTemplate } from "./pulse-authoring";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { updateEducationPov } from "./education-fields";
import { governedLandingSlotType, newLandingNarrativeSection, updateLandingSection } from "./landing-section-fields";
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
import { guardrailsEditableTextPaths } from "./guardrails-editor-inventory";
export {
  guardrailsEditableTextPaths,
  guardrailsRevisionInventory,
  type GuardrailsRevisionInventoryEntry,
} from "./guardrails-editor-inventory";
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

function Requirement({ required }: { required?: boolean }) {
  return <span className={required ? "text-destructive" : "text-muted-foreground"}>{required ? "(required before publishing)" : "(optional)"}</span>;
}

function RestoreField({ path, label }: { path?: string; label: string }) {
  const overrides = useOverrides();
  if (!path || !overrides.isAdapted || !overrides.operations.some((operation) => operation.path === path || operation.path.startsWith(`${path}.`) || operation.path.startsWith(`${path}[`))) return null;
  return <Button type="button" size="sm" variant="link" className="h-auto px-0 text-xs" disabled={!overrides.canEdit} onClick={() => overrides.onReset?.(path)} aria-label={`Restore ${label} to shared content`}>Restore to shared content</Button>;
}
function Field({ label, value, onChange, placeholder, type = "text", required, error, path, readOnly = false }: {
  label: string; value: unknown; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; error?: string; path?: string; readOnly?: boolean;
}) {
  const id = path ? contentFieldId(path) : undefined;
  return <div className="space-y-2"><Label htmlFor={id}>{label} <Requirement required={required} /></Label><Input id={id} data-field-path={path} aria-label={label} aria-invalid={Boolean(error)} type={type} value={typeof value === "string" || typeof value === "number" ? value : ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} readOnly={readOnly} />{readOnly && <p className="text-xs text-muted-foreground">This date is historical evidence. Record the current editor confirmation in Settings.</p>}{error && <p role="alert" className="text-xs text-destructive">{error}</p>}<RestoreField path={path} label={label} /></div>;
}
function Area({ label, value, onChange, placeholder, rows = 4, required, error, path }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; required?: boolean; error?: string; path?: string;
}) {
  const id = path ? contentFieldId(path) : undefined;
  return <div className="space-y-2"><Label htmlFor={id}>{label} <Requirement required={required} /></Label><Textarea id={id} data-field-path={path} aria-label={label} aria-invalid={Boolean(error)} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{error && <p role="alert" className="text-xs text-destructive">{error}</p>}<RestoreField path={path} label={label} /></div>;
}
function Choice({ label, value, options, onChange, required, error, path }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void; required?: boolean; error?: string; path?: string;
}) {
  const id = path ? contentFieldId(path) : undefined;
  return <div className="space-y-2"><Label htmlFor={id}>{label} <Requirement required={required} /></Label><Select value={value || undefined} onValueChange={onChange}><SelectTrigger id={id} data-field-path={path} aria-label={label} aria-invalid={Boolean(error)}><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem value={option} key={option}>{option.replaceAll("-", " ")}</SelectItem>)}</SelectContent></Select>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}<RestoreField path={path} label={label} /></div>;
}

function StringList({ label, value, onChange, required = false, maximum, path }: {
  label: string; value: unknown; onChange: (value: string[]) => void; required?: boolean; maximum?: number; path?: string;
}) {
  const items = stringListItems(value);
  return <section id={path ? contentFieldId(path) : undefined} data-field-path={path} tabIndex={path ? -1 : undefined} className="space-y-3"><div className="flex items-center justify-between"><Label>{label} <Requirement required={required} /></Label><Button type="button" size="sm" variant="outline" disabled={maximum !== undefined && items.length >= maximum} onClick={() => onChange(addStringListItem(items))}>Add item</Button></div>{items.map((item, index) => <div key={index} className="flex gap-2"><Input id={path ? contentFieldId(`${path}.${index}`) : undefined} data-field-path={path ? `${path}.${index}` : undefined} value={item} onChange={(event) => onChange(changeStringListItem(items, index, event.target.value))} aria-label={`${label} ${index + 1}`} /><Button type="button" variant="ghost" onClick={() => onChange(removeStringListItem(items, index))}>Remove</Button></div>)}{items.length === 0 && <p className="text-xs text-muted-foreground">No items added.</p>}</section>;
}
export type ContentEditorPresentation = "content" | "settings" | "all";

export function ContentEditor({ kind, value, onChange, errors, publicationErrors = [], industrySection, presentation = "all" }: {
  kind: CmsDocumentKind;
  value: Content;
  onChange: (content: Content) => void;
  errors: string[];
  publicationErrors?: string[];
  /** Industry documents are edited through the fixed visual workspace. */
  industrySection?: string;
  /**
   * `content` is the ordinary public-writing surface. Governance and
   * schema-only relationships are intentionally rendered by Settings.
   * `all` retains the legacy integrated editor during the shell transition.
   */
  presentation?: ContentEditorPresentation;
}) {
  const [pendingTemplate, setPendingTemplate] = useState<"standard" | "cognios-specialist" | PulseTemplate | null>(null);
  const overrides = useOverrides();
  const compactValidation = ["partner", "platform", "industry", "framework", "office", "case-study", "publication"].includes(kind);
  // The regular document PATCH remains the persistence path.  This only keeps
  // the field indicator truthful while that PATCH is pending.
  const set = (key: string, next: unknown) => {
    overrides.onOverride?.(`content.${key}`, next);
    onChange({ ...value, schemaVersion: 1, [key]: next });
  };
  const fieldErrors = contentErrorMap([...errors, ...publicationErrors.map((error) => error.replace(/^content\./, ""))]);
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
  const showContent = presentation !== "settings";
  const showSettings = presentation !== "content";
  const showIndustryPath = (path: string) =>
    kind !== "industry" || (!editingIndustryGovernance && (!industrySection || (isIndustrySectionId(industrySection) && belongsToIndustrySection(path, industrySection))));
  const common = (
    <section className="space-y-4 border-t pt-6">
      <h3 className="font-semibold">Governance and ordering</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice label="Visibility" path="content.visibility" value={value.visibility ?? "public"} options={["public", "hidden", "restricted"]} onChange={(next) => set("visibility", next)} />
        <Field label="Editorial order" path="content.order" type="number" value={value.order ?? 0} onChange={(next) => set("order", Number(next) || 0)} />
        <Field label="Historical verification date" path="content.verificationDate" type="date" value={value.verificationDate} onChange={(next) => set("verificationDate", next || undefined)} readOnly />
        <Field label="Next review date" path="content.reviewDate" type="date" value={value.reviewDate} onChange={(next) => set("reviewDate", next || undefined)} />
      </div>
      {kind !== "industry" && <RecordList label="Sources" path="content.sources" value={value.sources} columns={[{ key: "label", label: "Label" }, { key: "url", label: "HTTP(S) URL" }, { key: "accessedAt", label: "Accessed date", type: "date" }]} onChange={(next) => set("sources", next)} />}
      <RecordPicker label="Related records" path="content.relatedIds" value={value.relatedIds} onChange={(next) => set("relatedIds", next)} />
    </section>
  );

  return (
    <div className="space-y-6">
      <AlertDialog open={Boolean(pendingTemplate)} onOpenChange={(open) => { if (!open) setPendingTemplate(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Replace the platform page?</AlertDialogTitle><AlertDialogDescription>Changing the template replaces existing page copy and composition with the selected template’s owner-supplied draft. This will not save, submit, approve, or publish the document. Governance fields stay as they are.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep current content</AlertDialogCancel><AlertDialogAction onClick={() => { if (pendingTemplate) onChange(replacePlatformTemplate(value, pendingTemplate)); setPendingTemplate(null); }}>Replace page draft</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      {showContent && errors.length > 0 && (compactValidation
        ? <details className="rounded-md border border-destructive/30 p-3"><summary className="cursor-pointer text-xs text-destructive">{errors.length} field{errors.length === 1 ? "" : "s"} need attention before saving</summary><ul className="mt-2 space-y-1 text-xs">{errors.map((error) => <li key={error}><button type="button" className="text-left underline" onClick={() => { const target = document.getElementById(contentFieldId(readinessPath(error))); target?.scrollIntoView({ block: "center" }); target?.focus(); }}>{error}</button></li>)}</ul></details>
        : <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4"><p className="font-semibold text-destructive">Fix these content-field issues before saving this draft:</p><p className="mt-1 text-xs text-muted-foreground">Drafts may remain incomplete; publication readiness is checked separately. These errors identify values that cannot be saved under the current contract.</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>)}

      {showContent && <>{kind === "person" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Role" required error={fieldErrors.role} path="content.role" value={value.role ?? ""} options={["founder", "leader", "employee", "advisor"]} onChange={(next) => set("role", next)} />
          <Field label="Public title" required error={fieldErrors.title} path="content.title" value={value.title} onChange={(next) => set("title", next)} />
          <Choice label="Approved fallback" path="content.approvedFallback" value={value.approvedFallback ?? ""} options={["initials", "brand-mark"]} onChange={(next) => set("approvedFallback", next)} />
        </div>
        <MediaField label="Identity image" role="identity" value={value.identityMedia} overridePath="content.identityMedia" onChange={(next) => set("identityMedia", next)} />
        <Area label="Biography" path="content.biography" value={value.biography ?? ""} onChange={(next) => set("biography", next)} />
        <Area label="Contribution" path="content.contribution" value={value.contribution ?? ""} onChange={(next) => set("contribution", next)} />
        <PairList label="Focus areas" path="content.focusAreas" value={value.focusAreas} left="title" right="detail" onChange={(next) => set("focusAreas", next)} />
        <PairList label="Profile links" path="content.profileLinks" value={value.profileLinks} left="label" right="url" onChange={(next) => set("profileLinks", next)} />
      </>}

      {kind === "partner" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Alliance category" required error={fieldErrors.allianceCategory} path="content.allianceCategory" value={value.allianceCategory} onChange={(next) => set("allianceCategory", next)} />
          <Choice label="Relationship status" required error={fieldErrors.relationshipStatus} path="content.relationshipStatus" value={value.relationshipStatus ?? ""} options={["active", "prospective", "paused", "ended"]} onChange={(next) => set("relationshipStatus", next)} />
          <Field label="Website" path="content.website" value={value.website} onChange={(next) => set("website", next || undefined)} />
        </div>
        <MediaField label="Partner logo" role="logo" value={value.logoMedia} overridePath="content.logoMedia" onChange={(next) => set("logoMedia", next)} />
        <Area label="Positioning" required error={fieldErrors.positioning} path="content.positioning" value={value.positioning ?? ""} onChange={(next) => set("positioning", next)} />
        <Area label="Contribution" path="content.contribution" value={value.contribution ?? ""} onChange={(next) => set("contribution", next)} />
        <PairList label="Facts" path="content.facts" value={value.facts} left="value" right="label" onChange={(next) => set("facts", next)} />
        <Area label="Coverage" path="content.coverage" value={lines(value.coverage)} onChange={(next) => set("coverage", stringLines(next))} placeholder="One area per line" />
        <RecordList label="Evidence" path="content.evidence" value={value.evidence} columns={[{ key: "statement", label: "Statement" }, { key: "source.label", label: "Source label" }, { key: "source.url", label: "Source URL" }, { key: "approved", label: "Approved", type: "checkbox" }]} onChange={(next) => set("evidence", next)} />
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
          <Field label="Phone number (optional)" path="content.phone" type="tel" value={value.phone} onChange={(next) => set("phone", next || undefined)} placeholder="+971 4 123 4567" />
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
      {kind === "site-configuration" && value.page && <>
        <section className="space-y-4" aria-label="Hero film configuration">
          <div><h3 className="font-semibold">Hero film</h3><p className="text-sm text-muted-foreground">The poster and each video source are immutable approved-media pins. Choose one MP4 and one WebM; the same asset cannot fill two slots.</p></div>
          <Choice label="Hero film page" required path="content.page" value={value.page} options={["homepage", "industries"]} onChange={(page) => set("page", page)} />
          <MediaField
            label="Hero film poster"
            role="background"
            required
            fieldPath="content.hero.posterMediaId"
            value={value.hero?.posterMediaId && value.hero?.posterMediaVersionId
              ? { mediaId: value.hero.posterMediaId, mediaVersionId: value.hero.posterMediaVersionId, role: "background" }
              : undefined}
            onChange={(selection) => set("hero", selection
              ? { ...value.hero, posterMediaId: selection.mediaId, posterMediaVersionId: selection.mediaVersionId }
              : { ...value.hero, posterMediaId: undefined, posterMediaVersionId: undefined })}
          />
          {(["video/mp4", "video/webm"] as const).map((mimeType) => {
            const sourceIndex = (Array.isArray(value.hero?.sources) ? value.hero.sources : []).findIndex((source: Content) => source.mimeType === mimeType);
            const source = sourceIndex >= 0 ? value.hero.sources[sourceIndex] : undefined;
            const updateSource = (selection: MediaSelection | undefined) => {
              const prior = Array.isArray(value.hero?.sources) ? value.hero.sources : [];
              const next = prior.filter((candidate: Content) => candidate.mimeType !== mimeType);
              if (selection) next.push({ mediaId: selection.mediaId, mediaVersionId: selection.mediaVersionId, mimeType });
              set("hero", { ...value.hero, sources: next });
            };
            return <MediaField
              key={mimeType}
              label={mimeType === "video/mp4" ? "Hero MP4 source" : "Hero WebM source"}
              accept="video"
              role="background"
              required
              fieldPath={`content.hero.sources.${sourceIndex >= 0 ? sourceIndex : mimeType === "video/mp4" ? 0 : 1}`}
              value={source ? { mediaId: source.mediaId, mediaVersionId: source.mediaVersionId, role: "background" } : undefined}
              onChange={updateSource}
            />;
          })}
        </section>
      </>}

      {kind === "platform" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required error={fieldErrors.category} path="content.category" value={value.category} onChange={(next) => set("category", next)} />
          <Choice label="Template" path="content.template" value={value.template ?? "standard"} options={["standard", "cognios-specialist", "cognibase-pulse", "cogniagents-pulse"]} onChange={(next) => { if (next === value.template) return; if (hasAuthoredPlatformContent(value)) setPendingTemplate(next as typeof pendingTemplate); else onChange(replacePlatformTemplate(value, next as "standard" | "cognios-specialist" | PulseTemplate)); }} />
        </div>
         <Area label="Summary" required error={fieldErrors.summary} path="content.summary" value={value.summary ?? ""} onChange={(next) => set("summary", next)} />
         {(value.template === "cognibase-pulse" || value.template === "cogniagents-pulse") && value.pulsePage && <PulsePageEditor page={value.pulsePage} onChange={(next) => set("pulsePage", next)} errors={[...errors, ...publicationErrors.map((error) => error.replace(/^content\./, ""))]} />}
         {value.template !== "cognibase-pulse" && value.template !== "cogniagents-pulse" && <>
         <div className="grid gap-4 sm:grid-cols-2">
           <Field label="CTA label" path="content.cta.label" value={value.cta?.label} onChange={(next) => set("cta", next ? { label: next, href: value.cta?.href ?? "/value-scan" } : undefined)} />
           <SafeDestinationField label="CTA destination" path="content.cta.href" value={value.cta?.href} onChange={(next) => set("cta", next ? { label: value.cta?.label ?? "Learn more", href: next } : undefined)} />
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
        <StringList label="Capabilities" path="content.capabilities" value={value.capabilities} onChange={(next) => set("capabilities", next)} />
        <StringList label="Differentiators" path="content.differentiators" value={value.differentiators} onChange={(next) => set("differentiators", next)} />
         <section className="space-y-4">
          <Label>Standard page sections</Label>
          {(Array.isArray(value.sections) ? value.sections : []).map((section: any, index: number) => (
            <fieldset key={index} className="space-y-3 rounded-md border p-3">
              <legend className="px-1 text-xs font-medium">Section {index + 1}</legend>
              <Field label={`Section ${index + 1} heading`} path={`content.sections.${index}.heading`} value={section.heading} onChange={(heading) => set("sections", value.sections.map((current: any, currentIndex: number) => currentIndex === index ? { ...current, heading } : current))} />
              <RichBlockEditor
                label={`Section ${index + 1} body`}
                path={`content.sections.${index}.body`}
                value={section.body}
                onChange={(body) => set("sections", value.sections.map((current: any, currentIndex: number) => currentIndex === index ? { ...current, body } : current))}
              />
            </fieldset>
          ))}
          <Button type="button" variant="outline" onClick={() => set("sections", [...(Array.isArray(value.sections) ? value.sections : []), { heading: "", body: [{ type: "paragraph", text: "" }] }])}>Add section</Button>
         </section></>}
      </>}

      {kind === "publication" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Publication variant" required error={fieldErrors.variant} path="content.variant" value={value.variant ?? "article"} options={["article", "pov"]} onChange={(next) => set("variant", next)} />
          <Field label="Author" required error={fieldErrors.author} path="content.author" value={value.author} onChange={(next) => set("author", next)} />
          <Field label="Publication date" required error={fieldErrors.publicationDate} path="content.publicationDate" type="date" value={value.publicationDate} onChange={(next) => set("publicationDate", next)} />
          <Field label="Updated date" path="content.updatedDate" type="date" value={value.updatedDate} onChange={(next) => set("updatedDate", next || undefined)} />
          <Field label="Reading time (minutes)" path="content.readingTimeMinutes" type="number" value={value.readingTimeMinutes} onChange={(next) => set("readingTimeMinutes", next ? Number(next) : undefined)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><MediaField label="Hero image" value={value.heroMedia} overridePath="content.heroMedia" onChange={(next) => set("heroMedia", next)} /><MediaField label="POV PDF" role="document" accept="pdf" required={value.variant === "pov"} value={value.pdfMedia} overridePath="content.pdfMedia" onChange={(next) => set("pdfMedia", next)} /></div>
        <MediaField label="Social sharing image" role="og-image" value={value.social?.imageMedia} overridePath="content.social.imageMedia" onChange={(next) => set("social", { ...value.social, imageMedia: next })} />
        <Area label="Teaser" required error={fieldErrors.teaser} path="content.teaser" value={value.teaser ?? ""} onChange={(next) => set("teaser", next)} />
        <RichBlockEditor label="Structured body" path="content.body" value={value.body} onChange={(next) => set("body", next)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Area label="Topics" path="content.topics" value={lines(value.topics)} onChange={(next) => set("topics", stringLines(next))} />
          <Area label="Sectors" path="content.sectors" value={lines(value.sectors)} onChange={(next) => set("sectors", stringLines(next))} />
        </div>
        <RecordPicker label="Related platforms" path="content.platformIds" kind="platform" value={value.platformIds} onChange={(next) => set("platformIds", next)} />
      </>}

      {kind === "case-study" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Case variant" path="content.variant" value={value.variant ?? "summary"} options={["summary", "full"]} onChange={(next) => set("variant", next)} />
          <Choice label="Disclosure" path="content.disclosure" value={value.disclosure ?? "restricted"} options={["named", "anonymized", "restricted"]} onChange={(next) => set("disclosure", next)} />
          <Choice label="Sector" path="content.sector" value={value.sector ?? ""} options={["Financial Services", "Telecoms", "Travel & Hospitality", "Public Sector", "Manufacturing & Industrial", "Life Sciences", "Retail & Consumer", "Professional Services", "Security & AI Infrastructure"]} onChange={(next) => set("sector", next)} />
          <Choice label="Internal engagement type" path="content.engagementType" value={value.engagementType ?? ""} options={["client-delivery", "product-demonstration", "concept", "proposal-prototype"]} onChange={(next) => set("engagementType", next)} />
          <Choice label="Internal delivery stage" path="content.deliveryStage" value={value.deliveryStage ?? ""} options={["production", "pilot", "proof-of-concept", "mvp", "demo", "concept", "proposal"]} onChange={(next) => set("deliveryStage", next)} />
          <Choice label="Internal impact classification" path="content.impactClassification" value={value.impactClassification ?? ""} options={["observed", "pilot-demo", "simulated", "projected", "unavailable"]} onChange={(next) => set("impactClassification", next)} />
          <Choice label="Internal evidence approval" path="content.publicEvidenceStatus" value={value.publicEvidenceStatus ?? "needs-review"} options={["approved", "needs-review", "restricted"]} onChange={(next) => set("publicEvidenceStatus", next)} />
          <Field label="Organization descriptor" required error={fieldErrors.organizationDescriptor} path="content.organizationDescriptor" value={value.organizationDescriptor} onChange={(next) => set("organizationDescriptor", next)} />
          <Choice label="Reconstruction template" path="content.visual.template" value={value.visual?.template ?? ""} options={["knowledge-assistant", "analytics-dashboard", "workflow-console", "commerce-experience", "governance-console", "operations-console"]} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", template: next })} />
        </div>
        <MediaField label="Case-study hero image" value={value.heroMedia} overridePath="content.heroMedia" onChange={(next) => set("heroMedia", next)} />
        <Area label="Public capability statement" required error={fieldErrors.impactStatement} path="content.impactStatement" value={value.impactStatement ?? ""} onChange={(next) => set("impactStatement", next)} />
        <Area label="Disclosure note" required error={fieldErrors.disclosureNote} path="content.disclosureNote" value={value.disclosureNote ?? ""} onChange={(next) => set("disclosureNote", next)} />
        <EnumMultiSelect
          label="Related website industries"
          path="content.relatedIndustries"
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
        <Area label="Visual caption" path="content.visual.caption" value={value.visual?.caption ?? ""} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", caption: next })} />
        <Area label="Visual alternative text" path="content.visual.altText" value={value.visual?.altText ?? ""} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", altText: next })} />
        <Area label="Visual text equivalent" path="content.visual.textEquivalent" value={value.visual?.textEquivalent ?? ""} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", textEquivalent: next })} />
        <Area label="Anonymized fixture labels" path="content.visual.fixtureLabels" value={lines(value.visual?.fixtureLabels)} onChange={(next) => set("visual", { ...value.visual, kind: "illustrative-interface-reconstruction", fixtureLabels: stringLines(next) })} placeholder="One public-safe interface label per line" />
        <Area label="Mandate" path="content.mandate" value={value.mandate ?? ""} onChange={(next) => set("mandate", next)} />
        <Area label="Context" path="content.context" value={value.context ?? ""} onChange={(next) => set("context", next)} />
        <StringList label="Constraints" path="content.constraints" value={value.constraints} onChange={(next) => set("constraints", next)} />
        <RichBlockEditor label="Work delivered" path="content.work" value={value.work} onChange={(next) => set("work", next)} />
        <StringList label="Controls" path="content.controls" value={value.controls} onChange={(next) => set("controls", next)} />
        <StringList label="Outcomes" path="content.outcomes" value={value.outcomes} onChange={(next) => set("outcomes", next)} />
        <RecordList label="Approved evidence and claims" path="content.evidence" value={value.evidence} columns={[{ key: "statement", label: "Claim" }, { key: "source.label", label: "Source label" }, { key: "source.url", label: "Source URL" }, { key: "approved", label: "Approved", type: "checkbox" }]} onChange={(next) => set("evidence", next)} />
        <div className="grid gap-4 sm:grid-cols-2"><Area label="Quote" path="content.quote.text" value={value.quote?.text ?? ""} onChange={(text) => set("quote", text ? { ...value.quote, text } : undefined)} /><Field label="Quote attribution" path="content.quote.attribution" value={value.quote?.attribution} onChange={(attribution) => set("quote", value.quote?.text ? { ...value.quote, attribution: attribution || undefined } : undefined)} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="CTA label" path="content.cta.label" value={value.cta?.label} onChange={(label) => set("cta", label ? { label, href: value.cta?.href ?? "/contact" } : undefined)} /><SafeDestinationField label="CTA destination" path="content.cta.href" value={value.cta?.href} onChange={(href) => set("cta", href ? { label: value.cta?.label ?? "Contact us", href } : undefined)} /></div>
      </>}

      {kind === "industry" && !editingIndustryGovernance && <>
        {showIndustryPath("legacyPath") && <section className="space-y-4" aria-labelledby="industry-hero-fields">
          <div><h3 id="industry-hero-fields" className="font-semibold">Hero and industry proposition</h3><p className="text-sm text-muted-foreground">The approved split-hero treatment uses these proposition and media fields.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legacy path" path="content.legacyPath" value={value.legacyPath} onChange={(next) => set("legacyPath", next)} placeholder="/industries/legacy-slug" />
          <Field label="Public name" path="content.name" value={value.name} onChange={(next) => set("name", next)} />
          <Field label="Short name" path="content.shortName" value={value.shortName} onChange={(next) => set("shortName", next)} />
          <Field label="Thesis accent" path="content.accent" value={value.accent} onChange={(next) => set("accent", next)} />
          <Field label="Fallback image path" path="content.image" value={value.image} onChange={(next) => set("image", next)} placeholder="/images/industry.jpg" />
          <Field label="Image alternative text" path="content.imageAlt" value={value.imageAlt} onChange={(next) => set("imageAlt", next)} />
          <Choice label="Editorial variant" path="content.variant" value={value.variant ?? ""} options={["ledger", "network", "journey", "field", "factory"]} onChange={(next) => set("variant", next)} />
        </div>
        <MediaField label="Industry hero image" value={value.heroMedia} overridePath="content.heroMedia" onChange={(next) => set("heroMedia", next ? { ...(value.heroMedia ?? {}), ...next } : undefined)} />
        <MediaReferenceList label="Supporting industry media" path="content.supportingMedia" value={value.supportingMedia} onChange={(supportingMedia) => set("supportingMedia", supportingMedia.length ? supportingMedia : undefined)} />
        <Area label="Opening thesis" path="content.thesis" value={value.thesis ?? ""} onChange={(next) => set("thesis", next)} />
        <Area label="Editorial summary" path="content.dek" value={value.dek ?? ""} onChange={(next) => set("dek", next)} />
        </section>}
        {showIndustryPath("opportunity") && <section className="space-y-4">
          <div><h3 className="font-semibold">Opportunity and strategic shift</h3><p className="text-sm text-muted-foreground">This statement remains visible in the contrasting editorial panel.</p></div>
        <Area label="Value-led opportunity" path="content.opportunity" value={value.opportunity ?? ""} onChange={(next) => set("opportunity", next)} placeholder="The client opportunity and value at stake" />
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
                      data-field-path={`content.capabilities.${index}.title`}
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
                      data-field-path={`content.capabilities.${index}.body`}
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
        <IndustryUsesEditor path="content.uses" value={value.uses} onChange={(uses) => set("uses", uses)} />
        </section>}
        {showIndustryPath("pressures") && <section className="space-y-4">
        <PairList label="Operating pressures" path="content.pressures" value={value.pressures} left="title" right="body" onChange={(next) => set("pressures", next)} />
        </section>}
        {showIndustryPath("reversal") && <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Documented reversal title" required path="content.reversal.title" value={value.reversal?.title} onChange={(title) => set("reversal", { ...value.reversal, title })} /><Area label="Documented reversal explanation" required path="content.reversal.body" value={value.reversal?.body ?? ""} onChange={(body) => set("reversal", { ...value.reversal, body })} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Myth claim" required path="content.myth.claim" value={value.myth?.claim} onChange={(claim) => set("myth", { ...value.myth, claim })} /><Area label="Myth verdict" required path="content.myth.verdict" value={value.myth?.verdict ?? ""} onChange={(verdict) => set("myth", { ...value.myth, verdict })} /></div>
        </section>}
        {showIndustryPath("gcc") && <section className="space-y-4">
        <Area label="GCC context" path="content.gcc" value={value.gcc ?? ""} onChange={(next) => set("gcc", next)} />
        </section>}
        {showIndustryPath("selectedWork") && <section className="space-y-4">
        <Area label="Selected work section description" path="content.selectedWork.description" value={value.selectedWork?.description ?? ""} onChange={(next) => set("selectedWork", { ...value.selectedWork, description: next })} placeholder="What evidence and disclosure this section should contain" />
         <RecordList label="Relevant service and first move" path="content.service" singleRecord value={value.service ? [value.service] : []} minimum={1} columns={[{ key: "label", label: "Service label" }, { key: "href", label: "Internal path" }, { key: "firstMove", label: "First move" }]} onChange={(next) => set("service", next[0] ?? {})} />
        </section>}
        {showIndustryPath("sources") && <section className="space-y-4">
        <RecordList label="Industry source trail" path="content.sources" value={value.sources} minimum={1} columns={[{ key: "label", label: "Label" }, { key: "publisher", label: "Publisher" }, { key: "kind", label: "Evidence kind" }, { key: "url", label: "URL" }, { key: "accessedAt", label: "Accessed date", type: "date" }, { key: "market", label: "Market", type: "market" }, { key: "supports", label: "Supports", type: "textarea" }, { key: "limitation", label: "Limitation", type: "textarea" }]} onChange={(next) => set("sources", next)} />
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
            <Area label="Introduction" required path="content.educationPov.introduction" value={educationPov.introduction ?? ""} onChange={(introduction) => set("educationPov", updateEducationPov(educationPov, { introduction }))} />
          </>}
          {showIndustryPath("educationPov.strategicShift") && educationV2 && <>
            <Area label="Strategic shift" required path="content.educationPov.strategicShift" value={educationPov.strategicShift ?? ""} onChange={(strategicShift) => set("educationPov", updateEducationPov(educationPov, { strategicShift }))} />
          </>}
          {showIndustryPath("educationPov.patternQuote") && educationV2 && <>
            <Area label="Pattern quote" required path="content.educationPov.patternQuote" value={educationPov.patternQuote ?? ""} onChange={(patternQuote) => set("educationPov", updateEducationPov(educationPov, { patternQuote }))} />
            <Area label="Global direction" required path="content.educationPov.globalDirection" value={educationPov.globalDirection ?? ""} onChange={(globalDirection) => set("educationPov", updateEducationPov(educationPov, { globalDirection }))} />
          </>}
          {showIndustryPath("educationPov.convictions") && <RecordList label="Five convictions" path="content.educationPov.convictions" value={educationPov.convictions} minimum={5} columns={[{ key: "title", label: "Title" }, { key: "body", label: "Description" }, ...(educationV2 ? [{ key: "market", label: "Market", type: "market" as const }] : [])]} onChange={(next) => set("educationPov", { ...educationPov, convictions: next })} />}
          {showIndustryPath("educationPov.valueDomains") && <>{educationV2 && <EducationImageryEditor value={educationPov.imagery} onChange={(imagery) => set("educationPov", { ...educationPov, imagery })} />}
          <EducationDomains path="content.educationPov.valueDomains" version={educationV2 ? 2 : undefined} value={educationPov.valueDomains} onChange={(valueDomains) => set("educationPov", { ...educationPov, valueDomains })} />
          <PairList label={educationV2 ? "Seven target-state capabilities" : "Six target-state capabilities"} path="content.educationPov.targetState" value={educationPov.targetState} left="title" right="body" onChange={(next) => set("educationPov", { ...educationPov, targetState: next })} /></>}
          {showIndustryPath("educationPov.applications") && <><EducationApplications path="content.educationPov.applications" value={educationPov.applications} onChange={(applications) => set("educationPov", { ...educationPov, applications })} />
          <EducationSignals path="content.educationPov.signals" version={educationV2 ? 2 : undefined} value={educationPov.signals} onChange={(signals) => set("educationPov", { ...educationPov, signals })} /></>}
          {showIndustryPath("educationPov.roadmap") && <RecordList label="Roadmap" path="content.educationPov.roadmap" value={educationPov.roadmap} minimum={3} columns={[{ key: "horizon", label: "Horizon" }, { key: "title", label: "Title" }, { key: "body", label: "Description" }]} onChange={(next) => set("educationPov", { ...educationPov, roadmap: next })} />}
          {showIndustryPath("educationPov.leadershipTest") && <Area label="Leadership test" path="content.educationPov.leadershipTest" value={educationPov.leadershipTest} onChange={(next) => set("educationPov", { ...educationPov, leadershipTest: next })} />}
        </section>}
        {value.legacyPath === "/industries/telecoms" && value.telecomPov && <TelecomPovEditor value={value.telecomPov} onChange={(telecomPov) => set("telecomPov", telecomPov)} section={industrySection} />}
        {(value.bankingPov || value.legacyPath === "/industries/banking") && <BankingPovEditor
          value={value.bankingPov}
          onChange={(bankingPov) => set("bankingPov", bankingPov)}
          section={industrySection}
        />}
        {value.publicSectorNative && <PublicSectorNativeEditor value={value.publicSectorNative} onChange={(next) => set("publicSectorNative", next)} section={industrySection} />}
        {!value.publicSectorNative && (value.name === "Public Sector" || value.legacyPath === "/industries/public-sector") && <PublicSectorPovEditor
          value={value.publicSectorPov}
          onChange={(publicSectorPov) => set("publicSectorPov", publicSectorPov)}
          section={industrySection}
        />}
      </>}

      {kind === "framework" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice
            label="Framework template"
            path="content.template"
            value={value.template ?? ""}
            options={["agent-authority", "guardrails", "idao", "ai-use-case-prioritization", "ai-value-to-scale", "agentic-operations-readiness", "human-agent-operating-model"]}
            onChange={(next) => {
              if (next === "guardrails" && value.template !== "guardrails") {
                onChange({ ...guardrailsDraft(), visibility: value.visibility ?? "hidden", order: value.order ?? 0, sources: value.sources ?? [], relatedIds: value.relatedIds ?? [] });
                return;
              }
              if (["idao", "ai-use-case-prioritization", "ai-value-to-scale", "agentic-operations-readiness", "human-agent-operating-model"].includes(next) && value.template !== next) {
                onChange({ ...methodologyFrameworkDraft(next), visibility: value.visibility ?? "hidden", order: value.order ?? 0, sources: value.sources ?? [], relatedIds: value.relatedIds ?? [] });
                return;
              }
              set("template", next);
            }}
          />
        </div>
        {value.template === "guardrails" ? <GuardrailsFrameworkEditor value={value} onChange={onChange} /> : ["idao", "ai-use-case-prioritization", "ai-value-to-scale", "agentic-operations-readiness", "human-agent-operating-model"].includes(value.template) ? <MethodologyFrameworkEditor value={value} onChange={onChange} /> : <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CTA label" path="content.cta.label" value={value.cta?.label} onChange={(next) => set("cta", next ? { label: next, href: value.cta?.href ?? "/value-scan" } : undefined)} />
            <SafeDestinationField label="CTA destination" path="content.cta.href" value={value.cta?.href} onChange={(next) => set("cta", next ? { label: value.cta?.label ?? "Start a Value Scan", href: next } : undefined)} />
          </div>
          <MediaField label="Framework hero image" required value={value.heroMedia} overridePath="content.heroMedia" onChange={(next) => set("heroMedia", next)} />
          <Area label="Teaser" path="content.teaser" value={value.teaser ?? ""} onChange={(next) => set("teaser", next)} />
          <Area label="Handover explanation" path="content.handoverExplanation" value={value.handoverExplanation ?? ""} onChange={(next) => set("handoverExplanation", next)} rows={6} />
          <RichBlockEditor label="Methodology narrative" path="content.methodology" value={value.methodology} onChange={(next) => set("methodology", next)} required />
          <GuardrailsAuthorityEditor path="content.guardrails" value={value.guardrails} onChange={(next) => set("guardrails", next)} />
          <RecordList label="Worked example" path="content.workedExample" singleRecord value={value.workedExample ? [value.workedExample] : []} minimum={1} columns={[{ key: "sector", label: "Sector" }, { key: "title", label: "Title" }, { key: "handover", label: "Handover type" }, { key: "reversibility", label: "Reversibility (R1–R4)" }, { key: "reach", label: "Reach (H1–H5)" }, { key: "exposureBand", label: "Exposure band" }, { key: "oversight", label: "Oversight" }, { key: "detail", label: "Explanation" }]} onChange={(next) => set("workedExample", { ...value.workedExample, ...(next[0] ?? {})})} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Choice label="Worked example requested authority" path="content.workedExample.requestedAuthority" value={value.workedExample?.requestedAuthority ?? "out-of-loop"} options={["out-of-loop", "on-loop", "in-loop", "in-loop-second", "in-loop-external"]} onChange={(next) => set("workedExample", { ...value.workedExample, requestedAuthority: next })} />
            <Field label="Intervention window" path="content.workedExample.interventionWindow" value={value.workedExample?.interventionWindow} onChange={(next) => set("workedExample", { ...value.workedExample, interventionWindow: next || undefined })} />
            <Field label="Accountable operating role" path="content.workedExample.accountableRole" value={value.workedExample?.accountableRole} onChange={(next) => set("workedExample", { ...value.workedExample, accountableRole: next })} />
            <Field label="Approved authority artefact (if above ceiling)" path="content.workedExample.authorityArtefact" value={value.workedExample?.authorityArtefact} onChange={(next) => set("workedExample", { ...value.workedExample, authorityArtefact: next || undefined })} />
          </div>
          <Area label="Promotion evidence" path="content.workedExample.promotionEvidence" value={value.workedExample?.promotionEvidence ?? ""} onChange={(next) => set("workedExample", { ...value.workedExample, promotionEvidence: next })} rows={4} />
          <Area label="Automatic-demotion condition" path="content.workedExample.automaticDemotion" value={value.workedExample?.automaticDemotion ?? ""} onChange={(next) => set("workedExample", { ...value.workedExample, automaticDemotion: next })} rows={4} />
          <RecordList label="Sector examples" path="content.sectorExamples" value={value.sectorExamples} columns={[{ key: "sector", label: "Sector" }, { key: "title", label: "Title" }, { key: "handover", label: "Handover type" }, { key: "reversibility", label: "Reversibility" }, { key: "reach", label: "Reach" }, { key: "exposureBand", label: "Exposure band" }, { key: "oversight", label: "Oversight" }, { key: "detail", label: "Explanation" }]} onChange={(next) => set("sectorExamples", next)} />
        </>}
      </>}

      {kind === "landing-page" && <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice label="Governed template" required error={fieldErrors.template} path="content.template" value={value.template ?? ""} options={["landing", "collection", "campaign", "legal", "methodologies"]} onChange={(next) => set("template", next)} />
          <Field label="Public page path" required error={fieldErrors.pagePath} path="content.pagePath" value={value.pagePath} onChange={(next) => set("pagePath", next)} placeholder="/about" />
        </div>
        <Area label="Opening narrative" required error={fieldErrors.narrative} path="content.narrative" value={value.narrative ?? ""} onChange={(next) => set("narrative", next)} rows={5} />
        <LandingSections path="content.sections" pagePath={value.pagePath} value={value.sections} onChange={(sections) => set("sections", sections)} />
        <div className="grid gap-4 sm:grid-cols-2">
         <Field label="CTA label" path="content.cta.label" value={value.cta?.label} onChange={(next) => set("cta", next ? { label: next, href: value.cta?.href ?? "/value-scan", style: value.cta?.style ?? "primary" } : undefined)} />
          <SafeDestinationField label="CTA destination" path="content.cta.href" value={value.cta?.href} onChange={(next) => set("cta", next ? { label: value.cta?.label ?? "Learn more", href: next, style: value.cta?.style ?? "primary" } : undefined)} />
        </div>
        <Area label="SEO title" path="content.seo.title" value={value.seo?.title ?? ""} onChange={(next) => set("seo", { ...value.seo, title: next || undefined })} />
        <Area label="SEO description" path="content.seo.description" value={value.seo?.description ?? ""} onChange={(next) => set("seo", { ...value.seo, description: next || undefined })} rows={3} />
        <Area label="Legal disclaimer" path="content.legal.disclaimer" value={value.legal?.disclaimer ?? ""} onChange={(next) => set("legal", { ...value.legal, disclaimer: next || undefined })} rows={3} />
        <MediaReferenceList label="Governed visual references" path="content.visualReferences" value={value.visualReferences} onChange={(visualReferences) => set("visualReferences", visualReferences)} />
      </>}</>}

      {showSettings && kind !== "site-configuration" && (kind !== "industry" || editingIndustryGovernance) && common}
    </div>
  );
}

const methodologyCanonicalIds: Record<string, Record<string, string[]>> = {
  idao: { stages: ["innovate", "demonstrate", "activate", "operate"], layers: ["01", "02", "03", "04", "05"] },
  "ai-use-case-prioritization": { dimensions: ["value", "feasibility", "timeToEvidence", "adoptionFriction", "controlBurden", "reusePotential"], decisionRules: ["stop", "innovate", "demonstrate", "activate"] },
  "ai-value-to-scale": { dimensions: ["value", "portfolio", "platform", "operating", "workforce", "governance", "outcomes"], stages: ["1", "2", "3", "4", "5"] },
  "agentic-operations-readiness": { conditions: ["stability", "access", "observability", "fallback", "exceptions", "economics"], decisions: ["proceed", "prepare", "stop"] },
  "human-agent-operating-model": { designSteps: ["01", "02", "03", "04", "05"], decisionRights: ["frame", "recommend", "approve", "act", "intervene"], measures: ["use", "control", "capability", "outcome"] },
};
/**
 * New standalone Guardrails records always start on the replacement contract.
 * Historical revisions select their own legacy arm by contentVersion and are
 * never migrated by opening them in the editor.
 */
export function guardrailsDraft(): Content {
  const text = "";
  const actionMap = [
    ["set-name", "set"], ["set-build", "set"], ["set-choose", "set"], ["set-assign", "set"],
    ["prove-attack", "prove"], ["prove-red-team", "prove"], ["prove-count", "prove"], ["prove-record", "prove"],
    ["hold-watch", "hold"], ["hold-retest", "hold"], ["hold-revisit", "hold"], ["hold-report", "hold"],
  ] as const;
  const layers = ["policy", "prompt", "runtime", "architecture"] as const;
  const phaseMap = [
    ["set", "sequential", ["set-name", "set-build", "set-choose", "set-assign"]],
    ["prove", "pre-launch-tests", ["prove-attack", "prove-red-team", "prove-count", "prove-record"]],
    ["hold", "concurrent", ["hold-watch", "hold-retest", "hold-revisit", "hold-report"]],
  ] as const;
  return {
    schemaVersion: 1,
    template: "guardrails",
    contentVersion: "set-prove-hold-v1",
    hero: {
      eyebrow: text, headline: text, subheadline: text, strapline: text,
      primaryAction: { label: text, href: "/contact" },
      secondaryAction: { label: text, href: "/methodologies/agent-authority-model" },
    },
    overview: {
      heading: text, intro: text,
      phases: phaseMap.map(([id, mode, actionIds]) => ({ id, mode, actionIds, title: text, caption: text })),
    },
    layers: {
      heading: text, intro: text, exampleRule: text, tableHeaders: [text, text, text, text, text],
      rows: layers.map((id, index) => ({ id, title: text, whatItIs: text, customerDataExample: text, limitation: text, strength: index + 1 })),
      callout: text,
    },
    lifecycleMatrix: {
      heading: text, intro: text, columnHeaders: [text, text, text, text],
      rows: layers.map((layerId) => ({ layerId, layer: text, set: text, prove: text, hold: text })),
      callout: text, measure: text,
    },
    actions: actionMap.map(([id, phase], index) => ({
      id, phase, order: (index % 4) + 1, title: text, statement: text,
      explanation: [text], owner: text,
      outputOrCadence: { label: phase === "hold" ? "Cadence" : "Output", value: text },
      failureCondition: text, callout: text,
    })),
    references: {
      heading: text, intro: text,
      items: ["owasp-llm-top-10", "owasp-agent-control-standard", "mitre-atlas", "nist-ai-rmf", "nist-ai-600-1", "iso-42001"].map((id) => ({
        id, title: text, version: text, url: "https://example.invalid", note: text,
      })),
      disclaimer: text,
    },
    moves: {
      heading: text, intro: text,
      items: ["one", "two", "three"].map((id, index) => ({ id, number: index + 1, title: text, body: text })),
      cta: { heading: text, body: text, button: { label: text, href: "/contact" } },
    },
    relatedLink: { title: text, body: text, href: "/methodologies/agent-authority-model" },
    visibility: "hidden", order: 0, sources: [], relatedIds: [],
  };
}

export function authoritySummaryDraft(): Content {
  const text = "";
  return {
    lead: text,
    handover: text,
    rules: [1, 2, 3, 4].map(() => ({ title: text, body: text })),
    caveat: text,
    disclosureLabel: text,
    firstFigure: {
      asset: "aam-guardrails-vs-authority.svg",
      altText: text,
      captionLabel: text,
      captionLead: text,
      captionBody: text,
    },
  };
}
function GuardrailsAuthorityEditor({ value, onChange, path }: { value: Content | undefined; onChange: (value: Content | undefined) => void; path?: string }) {
  const section = value ?? {};
  const set = (key: string, next: unknown) => onChange({ ...section, [key]: next });
  const interaction = section.interaction ?? {};
  const requiredControls = interaction.requiredControls ?? {};
  const compensatingControls = interaction.compensatingControls ?? {};
  const summary = section.summary ?? {};
  const at = (suffix: string) => path ? `${path}.${suffix}` : undefined;
  const figure = (key: "firstFigure" | "secondFigure", asset: string, label: string) => {
    const current = section[key] ?? { asset, altText: "", captionLabel: "", captionLead: "", captionBody: "" };
    return <section className="space-y-3 border-t pt-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">Fixed local asset: {asset}. Its alternative text and caption segments are editable.</p>
      <Area label={`${label} alternative text`} path={at(`${key}.altText`)} value={current.altText ?? ""} onChange={(altText) => set(key, { ...current, asset, altText })} rows={3} />
      <Field label={`${label} caption label`} path={at(`${key}.captionLabel`)} value={current.captionLabel} onChange={(captionLabel) => set(key, { ...current, asset, captionLabel })} />
      <Area label={`${label} italic caption opening`} path={at(`${key}.captionLead`)} value={current.captionLead ?? ""} onChange={(captionLead) => set(key, { ...current, asset, captionLead })} rows={3} />
      <Area label={`${label} caption remainder`} path={at(`${key}.captionBody`)} value={current.captionBody ?? ""} onChange={(captionBody) => set(key, { ...current, asset, captionBody })} rows={3} />
    </section>;
  };
  const summaryFigure = summary.firstFigure ?? authoritySummaryDraft().firstFigure;
  const setSummary = (patch: Content) => set("summary", { ...summary, ...patch });
  return (
    <section id={path ? contentFieldId(path) : undefined} data-field-path={path} tabIndex={path ? -1 : undefined} className="space-y-4 border-t pt-6">
      <div className="flex items-center justify-between gap-4">
        <div><h3 className="font-semibold">Guardrails and authority subsection</h3><p className="mt-1 text-xs text-muted-foreground">Optional structured content. It is omitted from the page until a complete valid subsection is saved.</p></div>
        {value ? <Button type="button" variant="outline" onClick={() => onChange(undefined)}>Remove subsection</Button> : <Button type="button" variant="outline" onClick={() => onChange({})}>Add subsection</Button>}
      </div>
      {value && <>
        <Field label="Subsection heading" path={at("heading")} value={section.heading} onChange={(heading) => set("heading", heading)} />
        <Area label="Opening paragraph" path={at("opening")} value={section.opening ?? ""} onChange={(opening) => set("opening", opening)} />
        <Area label="Definition paragraph" path={at("definition")} value={section.definition ?? ""} onChange={(definition) => set("definition", definition)} rows={6} />
        <Area label="Bank example before italic quote" path={at("bankExample.beforeQuote")} value={section.bankExample?.beforeQuote ?? ""} onChange={(beforeQuote) => set("bankExample", { ...section.bankExample, beforeQuote })} rows={6} />
        <Field label="Bank example italic quote" path={at("bankExample.quote")} value={section.bankExample?.quote} onChange={(quote) => set("bankExample", { ...section.bankExample, quote })} />
        <Area label="Bank example after italic quote" path={at("bankExample.afterQuote")} value={section.bankExample?.afterQuote ?? ""} onChange={(afterQuote) => set("bankExample", { ...section.bankExample, afterQuote })} rows={4} />
        <Field label="Comparison heading" path={at("comparisonHeading")} value={section.comparisonHeading} onChange={(comparisonHeading) => set("comparisonHeading", comparisonHeading)} />
        <Field label="Comparison column: Guardrails" path={at("comparisonColumns.guardrails")} value={section.comparisonColumns?.guardrails} onChange={(guardrails) => set("comparisonColumns", { ...section.comparisonColumns, guardrails })} />
        <Field label="Comparison column: The Agent Authority Model" path={at("comparisonColumns.authorityModel")} value={section.comparisonColumns?.authorityModel} onChange={(authorityModel) => set("comparisonColumns", { ...section.comparisonColumns, authorityModel })} />
        <RecordList label="Three comparison rows" path={at("comparisonRows")} value={section.comparisonRows} minimum={3} maximum={3} columns={[{ key: "label", label: "Row label" }, { key: "guardrails", label: "Guardrails" }, { key: "guardrailsEmphasis", label: "Guardrails emphasis", type: "emphasis" }, { key: "authorityModel", label: "The Agent Authority Model" }, { key: "authorityModelEmphasis", label: "Authority-model emphasis", type: "emphasis" }]} onChange={(comparisonRows) => set("comparisonRows", comparisonRows)} />
        <Field label="Unit heading" path={at("unit.heading")} value={section.unit?.heading} onChange={(heading) => set("unit", { ...section.unit, heading })} />
        <Area label="Unit paragraph 1" path={at("unit.paragraphs.0")} value={section.unit?.paragraphs?.[0] ?? ""} onChange={(paragraph) => set("unit", { ...section.unit, paragraphs: [paragraph, section.unit?.paragraphs?.[1] ?? ""] })} rows={6} />
        <Area label="Unit paragraph 2" path={at("unit.paragraphs.1")} value={section.unit?.paragraphs?.[1] ?? ""} onChange={(paragraph) => set("unit", { ...section.unit, paragraphs: [section.unit?.paragraphs?.[0] ?? "", paragraph] })} rows={6} />
        <Field label="Unit closing emphasis" path={at("unit.emphasis")} value={section.unit?.emphasis} onChange={(emphasis) => set("unit", { ...section.unit, emphasis })} />
        <section className="space-y-4 rounded-md border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div><h4 className="font-semibold">Summary-first narrative</h4><p className="mt-1 text-xs text-muted-foreground">Optional governed copy for the compact summary. When present, all fields and exactly four rules are required.</p></div>
            {section.summary
              ? <Button type="button" variant="outline" onClick={() => set("summary", undefined)}>Remove summary</Button>
              : <Button type="button" variant="outline" onClick={() => set("summary", authoritySummaryDraft())}>Add summary</Button>}
          </div>
          {section.summary && <>
              <Area label="Summary lead" path={at("summary.lead")} required value={summary.lead ?? ""} onChange={(lead) => setSummary({ lead })} rows={3} />
              <Area label="Handover explanation" path={at("summary.handover")} required value={summary.handover ?? ""} onChange={(handover) => setSummary({ handover })} rows={3} />
            <RecordList
              label="Four summary rules"
                path={at("summary.rules")}
                value={summary.rules}
              minimum={4}
              maximum={4}
              columns={[{ key: "title", label: "Rule title" }, { key: "body", label: "Rule body", type: "textarea" }]}
              onChange={(rules) => setSummary({ rules })}
            />
              <Area label="Essential compensating-control caveat" path={at("summary.caveat")} required value={summary.caveat ?? ""} onChange={(caveat) => setSummary({ caveat })} rows={3} />
              <Field label="Full explanation disclosure label" path={at("summary.disclosureLabel")} required value={summary.disclosureLabel} onChange={(disclosureLabel) => setSummary({ disclosureLabel })} />
            <section className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Summary first figure</p>
              <p className="text-xs text-muted-foreground">Fixed local asset: aam-guardrails-vs-authority.svg. Its alternative text and caption segments are governed separately from the detailed figure.</p>
              <Area label="Summary first figure alternative text" path={at("summary.firstFigure.altText")} required value={summaryFigure.altText ?? ""} onChange={(altText) => setSummary({ firstFigure: { ...summaryFigure, asset: "aam-guardrails-vs-authority.svg", altText } })} rows={3} />
              <Field label="Summary first figure caption label" path={at("summary.firstFigure.captionLabel")} required value={summaryFigure.captionLabel} onChange={(captionLabel) => setSummary({ firstFigure: { ...summaryFigure, asset: "aam-guardrails-vs-authority.svg", captionLabel } })} />
              <Area label="Summary first figure caption opening" path={at("summary.firstFigure.captionLead")} required value={summaryFigure.captionLead ?? ""} onChange={(captionLead) => setSummary({ firstFigure: { ...summaryFigure, asset: "aam-guardrails-vs-authority.svg", captionLead } })} rows={3} />
              <Area label="Summary first figure caption remainder" path={at("summary.firstFigure.captionBody")} required value={summaryFigure.captionBody ?? ""} onChange={(captionBody) => setSummary({ firstFigure: { ...summaryFigure, asset: "aam-guardrails-vs-authority.svg", captionBody } })} rows={3} />
            </section>
          </>}
        </section>
        {figure("firstFigure", "aam-guardrails-vs-authority.svg", "Illustration 1")}
        <Field label="Interaction heading" path={at("interaction.heading")} value={interaction.heading} onChange={(heading) => set("interaction", { ...interaction, heading })} />
        <Area label="Interaction introduction" path={at("interaction.introduction")} value={interaction.introduction ?? ""} onChange={(introduction) => set("interaction", { ...interaction, introduction })} />
        <Field label="Exposure rule emphasis" path={at("interaction.exposure.lead")} value={interaction.exposure?.lead} onChange={(lead) => set("interaction", { ...interaction, exposure: { ...interaction.exposure, lead } })} />
        <Area label="Exposure rule body" path={at("interaction.exposure.body")} value={interaction.exposure?.body ?? ""} onChange={(body) => set("interaction", { ...interaction, exposure: { ...interaction.exposure, body } })} />
        <Field label="Evidence rule emphasis" path={at("interaction.evidence.lead")} value={interaction.evidence?.lead} onChange={(lead) => set("interaction", { ...interaction, evidence: { ...interaction.evidence, lead } })} />
        <Area label="Evidence rule body" path={at("interaction.evidence.body")} value={interaction.evidence?.body ?? ""} onChange={(body) => set("interaction", { ...interaction, evidence: { ...interaction.evidence, body } })} />
        <Area label="Controls introduction" path={at("interaction.controlsIntroduction")} value={interaction.controlsIntroduction ?? ""} onChange={(controlsIntroduction) => set("interaction", { ...interaction, controlsIntroduction })} />
        <Field label="Required controls emphasis" path={at("interaction.requiredControls.lead")} value={requiredControls.lead} onChange={(lead) => set("interaction", { ...interaction, requiredControls: { ...requiredControls, lead } })} />
        <Area label="Required controls before examples" path={at("interaction.requiredControls.bodyBeforeExamples")} value={requiredControls.bodyBeforeExamples ?? ""} onChange={(bodyBeforeExamples) => set("interaction", { ...interaction, requiredControls: { ...requiredControls, bodyBeforeExamples } })} rows={6} />
        <Area label="Required-controls assurance example" path={at("interaction.requiredControls.assuranceExample")} value={requiredControls.assuranceExample ?? ""} onChange={(assuranceExample) => set("interaction", { ...interaction, requiredControls: { ...requiredControls, assuranceExample } })} />
        <Field label="Text between required-controls examples" path={at("interaction.requiredControls.betweenExamples")} value={requiredControls.betweenExamples} onChange={(betweenExamples) => set("interaction", { ...interaction, requiredControls: { ...requiredControls, betweenExamples } })} />
        <Area label="Required-controls testable example" path={at("interaction.requiredControls.controlExample")} value={requiredControls.controlExample ?? ""} onChange={(controlExample) => set("interaction", { ...interaction, requiredControls: { ...requiredControls, controlExample } })} />
        <Field label="Required-controls conclusion" path={at("interaction.requiredControls.conclusion")} value={requiredControls.conclusion} onChange={(conclusion) => set("interaction", { ...interaction, requiredControls: { ...requiredControls, conclusion } })} />
        <Field label="Compensating-controls emphasis" path={at("interaction.compensatingControls.lead")} value={compensatingControls.lead} onChange={(lead) => set("interaction", { ...interaction, compensatingControls: { ...compensatingControls, lead } })} />
        <Area label="Compensating controls before emphasis" path={at("interaction.compensatingControls.bodyBeforeContent")} value={compensatingControls.bodyBeforeContent ?? ""} onChange={(bodyBeforeContent) => set("interaction", { ...interaction, compensatingControls: { ...compensatingControls, bodyBeforeContent } })} rows={6} />
        <Field label="Compensating-controls content emphasis" path={at("interaction.compensatingControls.content")} value={compensatingControls.content} onChange={(content) => set("interaction", { ...interaction, compensatingControls: { ...compensatingControls, content } })} />
        <Area label="Compensating controls after emphasis" path={at("interaction.compensatingControls.bodyAfterContent")} value={compensatingControls.bodyAfterContent ?? ""} onChange={(bodyAfterContent) => set("interaction", { ...interaction, compensatingControls: { ...compensatingControls, bodyAfterContent } })} rows={6} />
        {figure("secondFigure", "aam-how-they-interact.svg", "Illustration 2")}
        <Field label="Design-rule heading" path={at("designRule.heading")} value={section.designRule?.heading} onChange={(heading) => set("designRule", { ...section.designRule, heading })} />
        <Area label="Design-rule pull quote" path={at("designRule.quote")} value={section.designRule?.quote ?? ""} onChange={(quote) => set("designRule", { ...section.designRule, quote })} rows={5} />
        <Area label="Design-rule conclusion" path={at("designRule.conclusion")} value={section.designRule?.conclusion ?? ""} onChange={(conclusion) => set("designRule", { ...section.designRule, conclusion })} rows={6} />
        <Area label="Design-rule failure paragraph" path={at("designRule.failure")} value={section.designRule?.failure ?? ""} onChange={(failure) => set("designRule", { ...section.designRule, failure })} rows={5} />
        <Field label="Closing emphasis" path={at("designRule.closingEmphasis")} value={section.designRule?.closingEmphasis} onChange={(closingEmphasis) => set("designRule", { ...section.designRule, closingEmphasis })} />
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

function EducationSignals({ value, onChange, version, path }: { value: unknown; onChange: (value: any[]) => void; version?: 2; path?: string }) {
  const items = Array.isArray(value) ? value : [];
  const update = (index: number, patch: Record<string, unknown>) => onChange(items.map((current, i) => i === index ? { ...current, ...patch } : current));
  return <section id={path ? contentFieldId(path) : undefined} data-field-path={path} tabIndex={path ? -1 : undefined} className="space-y-3"><div className="flex justify-between"><Label>Institutional signals <Requirement required /></Label><Button type="button" size="sm" variant="outline" disabled={items.length >= 10} onClick={() => onChange([...items, { institution: "", signal: "", implication: "", sourceUrls: [] }])}>Add signal</Button></div>{items.map((item, index) => <fieldset key={index} className="space-y-3 rounded-md border p-3"><legend>Signal {index + 1}</legend><Field label={`Signal ${index + 1} institution`} path={path ? `${path}.${index}.institution` : undefined} required value={item.institution} onChange={(institution) => update(index, { institution })} /><Area label={`Signal ${index + 1} statement`} path={path ? `${path}.${index}.signal` : undefined} required value={item.signal ?? ""} onChange={(signal) => update(index, { signal })} /><Area label={`Signal ${index + 1} implication`} path={path ? `${path}.${index}.implication` : undefined} required value={item.implication ?? ""} onChange={(implication) => update(index, { implication })} />{version === 2 && <Choice label={`Signal ${index + 1} market`} path={path ? `${path}.${index}.market` : undefined} value={item.market ?? "all-markets"} options={educationMarkets} onChange={(market) => update(index, { market: market === "all-markets" ? undefined : market })} />}<StringList label={`Signal ${index + 1} source URLs`} path={path ? `${path}.${index}.sourceUrls` : undefined} required value={item.sourceUrls} onChange={(sourceUrls) => update(index, { sourceUrls })} /><Button type="button" variant="ghost" aria-label={`Remove signal ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove signal</Button></fieldset>)}</section>;
}

function EducationApplications({ value, onChange, path }: { value: unknown; onChange: (value: any[]) => void; path?: string }) {
  const groups = Array.isArray(value) ? value : [];
  const replaceGroup = (index: number, next: Record<string, unknown>) =>
    onChange(groups.map((group, current) => current === index ? { ...group, ...next } : group));
  return <section id={path ? contentFieldId(path) : undefined} data-field-path={path} tabIndex={path ? -1 : undefined} className="space-y-3">
    <div className="flex justify-between"><Label>Application groups <Requirement required /></Label><Button type="button" size="sm" variant="outline" disabled={groups.length >= 6} onClick={() => onChange([...groups, { title: "", items: [] }])}>Add application group</Button></div>
    {groups.map((group, groupIndex) => {
      const items = Array.isArray(group.items) ? group.items : [];
      const updateItem = (itemIndex: number, patch: Record<string, unknown>) =>
        replaceGroup(groupIndex, { items: items.map((item: Record<string, unknown>, current: number) => current === itemIndex ? { ...item, ...patch } : item) });
      return <fieldset key={groupIndex} className="space-y-3 rounded-md border p-3">
        <legend>Application group {groupIndex + 1}</legend>
        <Field label={`Application group ${groupIndex + 1} title`} path={path ? `${path}.${groupIndex}.title` : undefined} required value={group.title} onChange={(title) => replaceGroup(groupIndex, { title })} />
        <Button type="button" size="sm" variant="outline" disabled={items.length >= 12} onClick={() => replaceGroup(groupIndex, { items: [...items, { title: "", body: "", sourceUrls: [] }] })}>Add application</Button>
        {items.map((item: Record<string, any>, itemIndex: number) => <fieldset key={itemIndex} className="space-y-3 rounded-md border p-3">
          <legend>Application {itemIndex + 1}</legend>
          <Field label={`Application ${groupIndex + 1}.${itemIndex + 1} title`} path={path ? `${path}.${groupIndex}.items.${itemIndex}.title` : undefined} required value={item.title} onChange={(title) => updateItem(itemIndex, { title })} />
          <Area label={`Application ${groupIndex + 1}.${itemIndex + 1} description`} path={path ? `${path}.${groupIndex}.items.${itemIndex}.body` : undefined} required value={item.body ?? ""} onChange={(body) => updateItem(itemIndex, { body })} />
          <Choice label={`Application ${groupIndex + 1}.${itemIndex + 1} market`} path={path ? `${path}.${groupIndex}.items.${itemIndex}.market` : undefined} value={item.market ?? "all-markets"} options={educationMarkets} onChange={(market) => updateItem(itemIndex, { market: market === "all-markets" ? undefined : market })} />
          <StringList label={`Application ${groupIndex + 1}.${itemIndex + 1} source URLs`} path={path ? `${path}.${groupIndex}.items.${itemIndex}.sourceUrls` : undefined} required maximum={4} value={item.sourceUrls} onChange={(sourceUrls) => updateItem(itemIndex, { sourceUrls })} />
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
        <Field label={`${label} source path`} path={`content.educationPov.imagery.${key}.src`} required value={scene.src} onChange={(src) => updateScene(key, { src })} placeholder="/images/industries/education.jpg" />
        <Area label={`${label} alternative text`} path={`content.educationPov.imagery.${key}.altText`} required value={scene.altText ?? ""} onChange={(altText) => updateScene(key, { altText })} rows={2} />
        <MediaField
          label={`${label} approved image`}
          role="supporting"
          overridePath={`content.educationPov.imagery.${key}.media`}
          value={scene.media?.mediaId && scene.media?.mediaVersionId ? scene.media as MediaSelection : undefined}
          onChange={(media) => updateScene(key, { media: media ? { ...(scene.media ?? {}), ...media } : undefined })}
        />
      </fieldset>;
    })}
  </section>;
}

function LandingSections({ value, onChange, path = "content.sections", pagePath }: {
  value: unknown;
  onChange: (value: Array<Record<string, any>>) => void;
  path?: string;
  pagePath?: unknown;
}) {
  const sections = Array.isArray(value) ? value as Array<Record<string, any>> : [];
  const isHomepage = pagePath === "/";
  const update = (index: number, patch: Record<string, unknown>) =>
    onChange(updateLandingSection(sections, index, patch));
  const replace = (index: number, section: Record<string, unknown>) =>
    onChange(sections.map((currentSection, current) => current === index ? section : currentSection));
  const add = () => onChange([...sections, newLandingNarrativeSection(sections.length)]);
  return <section id={contentFieldId(path)} data-field-path={path} tabIndex={-1} className="space-y-4">
    <div className="flex items-center justify-between">
      <div><Label>Governed page sections <Requirement required /></Label><p className="text-xs text-muted-foreground">Sections render in numeric order; IDs and order values must be unique.</p></div>
      <div className="flex gap-2">
        {isHomepage && !sections.some((section) => section.id === "home-industries") && <Button type="button" size="sm" variant="outline" onClick={() => onChange([...sections, { ...newLandingNarrativeSection(sections.length), id: "home-industries", order: sections.length }])}>Add Industries section</Button>}
        <Button type="button" size="sm" variant="outline" onClick={add}>Add section</Button>
      </div>
    </div>
    {sections.map((section, index) => {
       const governedType = governedLandingSlotType(pagePath, section.id);
      return <fieldset key={`${section.id}-${index}`} className="space-y-4 rounded-md border p-4">
       <legend className="px-1 text-sm font-medium">Section {index + 1}{governedType ? ` · governed ${governedType} slot` : ""}</legend>
      <div className="grid gap-4 sm:grid-cols-3">
          <Choice label="Type" required path={`content.sections.${index}.type`} value={section.type ?? "narrative"} options={governedType ? [governedType] : ["narrative", "cta", "legal", "media"]} onChange={(type) => {
          const common = { id: section.id, order: section.order };
          replace(index, type === "narrative" ? { ...common, type, body: [{ type: "paragraph", text: "" }] }
            : type === "cta" ? { ...common, type, label: "", href: "/", style: "primary" }
            : type === "legal" ? { ...common, type, text: "", required: false }
            : { ...common, type, references: [] });
        }} />
         <Field label="Stable section ID" required path={`content.sections.${index}.id`} value={section.id} onChange={(id) => update(index, { id })} />
         <Field label="Order" required path={`content.sections.${index}.order`} type="number" value={section.order ?? index} onChange={(order) => update(index, { order: Number(order) || 0 })} />
      </div>
      {section.type === "narrative" && <>
          <Field label={section.id === "home-industries" ? "Industries heading" : "Heading"} path={`content.sections.${index}.heading`} value={section.heading} onChange={(heading) => update(index, { heading: heading || undefined })} />
          {section.id === "home-industries" && <>
            <div className="space-y-3 rounded-md border p-3">
              <div><Label>Published industries</Label><p className="text-xs text-muted-foreground">Choose up to six canonical Industry records. Their published titles and images remain authoritative; order here controls card order. Leave empty to retain the legacy default selection.</p></div>
              {(Array.isArray(section.industryIds) ? section.industryIds : []).map((industryId: string, industryIndex: number) => (
                <div key={`${industryId}-${industryIndex}`} className="flex items-center gap-2">
                  <Select value={industryId} onValueChange={(next) => update(index, { industryIds: section.industryIds.map((id: string, current: number) => current === industryIndex ? next : id) })}>
                    <SelectTrigger aria-label={`Homepage industry ${industryIndex + 1}`} data-field-path={`content.sections.${index}.industryIds.${industryIndex}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{HOMEPAGE_INDUSTRY_IDS.filter((id) => id === industryId || !section.industryIds.includes(id)).map((id) => <SelectItem value={id} key={id}>{id.replaceAll("-", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="outline" disabled={industryIndex === 0} aria-label={`Move ${industryId} up`} onClick={() => update(index, { industryIds: section.industryIds.map((id: string, current: number, ids: string[]) => current === industryIndex ? ids[current - 1] : current === industryIndex - 1 ? ids[current + 1] : id) })}>↑</Button>
                  <Button type="button" size="sm" variant="outline" disabled={industryIndex === section.industryIds.length - 1} aria-label={`Move ${industryId} down`} onClick={() => update(index, { industryIds: section.industryIds.map((id: string, current: number, ids: string[]) => current === industryIndex ? ids[current + 1] : current === industryIndex + 1 ? ids[current - 1] : id) })}>↓</Button>
                  <Button type="button" variant="ghost" aria-label={`Remove ${industryId}`} onClick={() => update(index, { industryIds: section.industryIds.filter((_: string, current: number) => current !== industryIndex).length ? section.industryIds.filter((_: string, current: number) => current !== industryIndex) : undefined })}>Remove</Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" disabled={(section.industryIds?.length ?? 0) >= HOMEPAGE_INDUSTRY_IDS.length} onClick={() => update(index, { industryIds: [...(section.industryIds ?? []), HOMEPAGE_INDUSTRY_IDS.find((id) => !(section.industryIds ?? []).includes(id))] })}>Add industry</Button>
            </div>
            <RichBlockEditor label="Industries subtitle" path={`content.sections.${index}.body`} required value={section.body} onChange={(body) => update(index, { body })} />
          </>}
          {section.id !== "home-industries" && <RichBlockEditor label="Structured narrative" path={`content.sections.${index}.body`} required value={section.body} onChange={(body) => update(index, { body })} />}
      </>}
      {section.type === "cta" && <div className="grid gap-4 sm:grid-cols-3">
         <Field label="Label" required path={`content.sections.${index}.label`} value={section.label} onChange={(label) => update(index, { label })} />
         <SafeDestinationField label="Destination" required path={`content.sections.${index}.href`} value={section.href} onChange={(href) => update(index, { href })} />
         <Choice label="Style" path={`content.sections.${index}.style`} value={section.style ?? "primary"} options={["primary", "secondary", "text"]} onChange={(style) => update(index, { style })} />
      </div>}
       {section.type === "legal" && <Area label="Legal text" required path={`content.sections.${index}.text`} value={section.text ?? ""} onChange={(text) => update(index, { text })} />}
      {section.type === "media" && <div className="space-y-3">
        {(Array.isArray(section.references) ? section.references : []).map((reference: Record<string, any>, referenceIndex: number) =>
          <div key={referenceIndex} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
            <MediaField label={`Media ${referenceIndex + 1}`} role={reference.role ?? "supporting"} required overridePath={`content.sections.${index}.references.${referenceIndex}`} value={reference.mediaId && reference.mediaVersionId ? reference as MediaSelection : undefined} onChange={(selection) => update(index, { references: section.references.map((item: any, current: number) => current === referenceIndex ? { ...item, ...selection } : item) })} />
            <Choice label="Role" path={`content.sections.${index}.references.${referenceIndex}.role`} value={reference.role ?? "supporting"} options={["hero", "supporting", "background", "icon", "og-image"]} onChange={(role) => update(index, { references: section.references.map((item: any, current: number) => current === referenceIndex ? { ...item, role } : item) })} />
            <Field label="Alternative text" path={`content.sections.${index}.references.${referenceIndex}.altText`} value={reference.altText} onChange={(altText) => update(index, { references: section.references.map((item: any, current: number) => current === referenceIndex ? { ...item, altText: altText || undefined } : item) })} />
            <Button type="button" variant="ghost" onClick={() => update(index, { references: section.references.filter((_: unknown, current: number) => current !== referenceIndex) })}>Remove media</Button>
          </div>)}
        <Button type="button" size="sm" variant="outline" onClick={() => update(index, { references: [...(section.references ?? []), { mediaId: "", role: "supporting" }] })}>Add media</Button>
      </div>}
      <Button type="button" variant="ghost" onClick={() => onChange(sections.filter((_, current) => current !== index))}>Remove section</Button>
      </fieldset>;
    })}
  </section>;
}

type RecordColumn = { key: string; label: string; type?: "text" | "date" | "checkbox" | "market" | "textarea" | "emphasis" };

function RecordList({ label, value, columns, onChange, minimum = 0, maximum, path, singleRecord = false }: {
  label: string; value: unknown; columns: RecordColumn[]; onChange: (value: Array<Record<string, any>>) => void; minimum?: number; maximum?: number; path?: string; singleRecord?: boolean;
}) {
  const items = Array.isArray(value) ? value as Array<Record<string, any>> : [];
  const get = (item: Record<string, any>, path: string) => path.split(".").reduce((current, key) => current?.[key], item);
  const setPath = (item: Record<string, any>, path: string, next: unknown) => {
    const [head, tail] = path.split(".");
    return tail ? { ...item, [head]: { ...(item[head] ?? {}), [tail]: next } } : { ...item, [head]: next };
  };
  return <section id={path ? contentFieldId(path) : undefined} data-field-path={path} tabIndex={path ? -1 : undefined} className="space-y-3">
    <div className="flex items-center justify-between"><Label>{label} <Requirement required={minimum > 0} /></Label><Button type="button" size="sm" variant="outline" disabled={maximum !== undefined && items.length >= maximum} onClick={() => onChange([...items, {}])}>Add row</Button></div>
    {items.map((item, index) => {
      const rowPath = path ? (singleRecord ? path : `${path}.${index}`) : undefined;
      return <fieldset key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
      <legend className="px-1 text-xs font-medium">{label} {index + 1}</legend>
      {columns.map((column) => <div key={column.key} className={column.key.includes("body") || column.key.includes("statement") ? "sm:col-span-2" : ""}>
        <Label className="text-xs">{column.label}</Label>
        {column.type === "checkbox"
          ? <input id={rowPath ? contentFieldId(`${rowPath}.${column.key}`) : undefined} data-field-path={rowPath ? `${rowPath}.${column.key}` : undefined} type="checkbox" className="ml-2" checked={Boolean(get(item, column.key))} onChange={(event) => onChange(items.map((current, currentIndex) => currentIndex === index ? setPath(current, column.key, event.target.checked) : current))} />
          : column.type === "market"
            ? <Choice label={`${label} ${index + 1} ${column.label}`} path={rowPath ? `${rowPath}.${column.key}` : undefined} value={get(item, column.key) ?? "all-markets"} options={educationMarkets} onChange={(next) => onChange(items.map((current, currentIndex) => currentIndex === index ? setPath(current, column.key, next === "all-markets" ? undefined : next) : current))} />
            : column.type === "emphasis"
              ? <Choice label={`${label} ${index + 1} ${column.label}`} path={rowPath ? `${rowPath}.${column.key}` : undefined} value={get(item, column.key) ?? "plain"} options={["plain", "italic"]} onChange={(next) => onChange(items.map((current, currentIndex) => currentIndex === index ? setPath(current, column.key, next) : current))} />
            : column.type === "textarea"
              ? <Textarea id={rowPath ? contentFieldId(`${rowPath}.${column.key}`) : undefined} data-field-path={rowPath ? `${rowPath}.${column.key}` : undefined} aria-label={`${label} ${index + 1} ${column.label}`} rows={3} value={get(item, column.key) ?? ""} onChange={(event) => onChange(items.map((current, currentIndex) => currentIndex === index ? setPath(current, column.key, event.target.value) : current))} />
            : <Input id={rowPath ? contentFieldId(`${rowPath}.${column.key}`) : undefined} data-field-path={rowPath ? `${rowPath}.${column.key}` : undefined} aria-label={`${label} ${index + 1} ${column.label}`} type={column.type ?? "text"} value={get(item, column.key) ?? ""} onChange={(event) => onChange(items.map((current, currentIndex) => currentIndex === index ? setPath(current, column.key, event.target.value) : current))} />}
      </div>)}
      <Button type="button" variant="ghost" className="sm:col-span-2" disabled={items.length <= minimum} onClick={() => onChange(items.filter((_, currentIndex) => currentIndex !== index))}>Remove row</Button>
    </fieldset>;
    })}
  </section>;
}

function PairList({ label, value, left, right, onChange, path }: {
  label: string; value: unknown; left: string; right: string; onChange: (value: Array<Record<string, string>>) => void; path?: string;
}) {
  const items = Array.isArray(value) ? value as Array<Record<string, string>> : [];
  const update = (index: number, key: string, next: string) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: next } : item));
  return <section id={path ? contentFieldId(path) : undefined} data-field-path={path} tabIndex={path ? -1 : undefined} className="space-y-3"><div className="flex items-center justify-between"><Label>{label} <Requirement /></Label><Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, { [left]: "", [right]: "" }])}>Add row</Button></div>{items.map((item, index) => <fieldset key={index} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"><legend className="px-1 text-xs font-medium">{label} {index + 1}</legend><div><Label className="text-xs">{left.replaceAll(/([A-Z])/g, " $1")}</Label><Input id={path ? contentFieldId(`${path}.${index}.${left}`) : undefined} data-field-path={path ? `${path}.${index}.${left}` : undefined} value={item[left] ?? ""} onChange={(event) => update(index, left, event.target.value)} /></div><div><Label className="text-xs">{right.replaceAll(/([A-Z])/g, " $1")}</Label><Input id={path ? contentFieldId(`${path}.${index}.${right}`) : undefined} data-field-path={path ? `${path}.${index}.${right}` : undefined} value={item[right] ?? ""} onChange={(event) => update(index, right, event.target.value)} /></div><Button type="button" variant="ghost" className="sm:col-span-2" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>Remove row</Button></fieldset>)}</section>;
}

function MediaReferenceList({ label, value, onChange, path, maximum = 30 }: {
  label: string;
  value: unknown;
  onChange: (value: MediaSelection[]) => void;
  path: string;
  maximum?: number;
}) {
  const references = Array.isArray(value) ? value as MediaSelection[] : [];
  const update = (index: number, selection: MediaSelection | undefined) => {
    if (!selection) {
      onChange(references.filter((_, current) => current !== index));
      return;
    }
    onChange(references.map((current, currentIndex) => currentIndex === index
      ? { ...current, ...selection, role: current.role ?? "supporting" }
      : current));
  };
  return <section id={contentFieldId(path)} data-field-path={path} tabIndex={-1} className="space-y-3">
    <div className="flex items-center justify-between">
      <div><Label>{label} <Requirement /></Label><p className="text-xs text-muted-foreground">Each reference is stored with its immutable media version and editorial role.</p></div>
      <Button type="button" size="sm" variant="outline" disabled={references.length >= maximum} onClick={() => onChange([...references, { mediaId: "", mediaVersionId: "", role: "supporting" }])}>Add media</Button>
    </div>
    {references.map((reference, index) => <fieldset key={`${reference.mediaId}-${index}`} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
      <legend className="px-1 text-xs font-medium">{label} {index + 1}</legend>
      <MediaField
        label={`${label} ${index + 1}`}
        role={reference.role ?? "supporting"}
        required
        overridePath={`${path}.${index}`}
        value={reference.mediaId && reference.mediaVersionId ? reference : undefined}
        onChange={(selection) => update(index, selection)}
      />
      <Choice label={`${label} ${index + 1} role`} path={`${path}.${index}.role`} value={reference.role ?? "supporting"} options={["hero", "supporting", "background", "icon", "og-image"]} onChange={(role) => onChange(references.map((current, currentIndex) => currentIndex === index ? { ...current, role: role as MediaSelection["role"] } : current))} />
      <Field label={`${label} ${index + 1} alternative text`} path={`${path}.${index}.altText`} value={reference.altText} onChange={(altText) => onChange(references.map((current, currentIndex) => currentIndex === index ? { ...current, altText: altText || undefined } : current))} />
      <Button type="button" variant="ghost" className="sm:col-span-2" onClick={() => onChange(references.filter((_, current) => current !== index))}>Remove media</Button>
    </fieldset>)}
  </section>;
}

function IndustryUsesEditor({ value, onChange, path }: {
  value: unknown;
  onChange: (value: Array<Record<string, any>>) => void;
  path: string;
}) {
  const items = Array.isArray(value) ? value as Array<Record<string, any>> : [];
  const update = (index: number, patch: Record<string, unknown>) =>
    onChange(items.map((item, current) => current === index ? { ...item, ...patch } : item));
  return <section id={contentFieldId(path)} data-field-path={path} tabIndex={-1} className="space-y-3">
    <div className="flex items-center justify-between">
      <div><Label>Use-case evidence <Requirement required /></Label><p className="text-xs text-muted-foreground">Use source URLs from the industry source trail to keep each claim attributable.</p></div>
      <Button type="button" size="sm" variant="outline" disabled={items.length >= 12} onClick={() => onChange([...items, { use: "", description: "", evidence: "", boundary: "", sourceUrls: [] }])}>Add use case</Button>
    </div>
    {items.map((item, index) => <fieldset key={index} className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium">Use case {index + 1}</legend>
      <Field label={`Use case ${index + 1}`} path={`${path}.${index}.use`} required value={item.use} onChange={(use) => update(index, { use })} />
      <Area label={`Use case ${index + 1} description`} path={`${path}.${index}.description`} value={item.description ?? ""} onChange={(description) => update(index, { description: description || undefined })} rows={4} />
      <Area label={`Use case ${index + 1} evidence`} path={`${path}.${index}.evidence`} required value={item.evidence ?? ""} onChange={(evidence) => update(index, { evidence })} rows={5} />
      <Area label={`Use case ${index + 1} required boundary`} path={`${path}.${index}.boundary`} required value={item.boundary ?? ""} onChange={(boundary) => update(index, { boundary })} rows={3} />
      <StringList label={`Use case ${index + 1} source URLs`} path={`${path}.${index}.sourceUrls`} required maximum={12} value={item.sourceUrls} onChange={(sourceUrls) => update(index, { sourceUrls })} />
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

function PublicSectorRichBlockEditor({ label, value, onChange, required, path }: {
  label: string;
  value: unknown;
  onChange: (value: unknown[]) => void;
  required?: boolean;
  path?: string;
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
  return <section id={path ? contentFieldId(path) : undefined} data-field-path={path} tabIndex={path ? -1 : undefined} className="space-y-3">
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
        <Choice label={`${label} ${index + 1} type`} path={path ? `${path}.${index}.type` : undefined} value={block.type} options={["paragraph", "heading", "list"]} onChange={(type) => changeType(index, type as PublicSectorRichBlock["type"])} />
        {block.type === "heading" && <Choice label={`${label} ${index + 1} level`} path={path ? `${path}.${index}.level` : undefined} value={String(block.level)} options={["2", "3"]} onChange={(level) => update(index, { ...block, level: Number(level) as 2 | 3 })} />}
        {block.type === "list" && <Choice label={`${label} ${index + 1} style`} path={path ? `${path}.${index}.style` : undefined} value={block.style} options={["bullet", "numbered"]} onChange={(style) => update(index, { ...block, style: style as "bullet" | "numbered" })} />}
      </div>
      {block.type === "list"
        ? <RichListItems label={`${label} ${index + 1} items`} path={path ? `${path}.${index}.items` : undefined} value={block.items} onChange={(items) => update(index, { ...block, items })} />
        : <Area label={`${label} ${index + 1} text`} path={path ? `${path}.${index}.text` : undefined} required value={block.text} onChange={(text) => update(index, { ...block, text })} rows={5} />}
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
      <Choice label="Public Sector market" required path="content.publicSectorPov.market" value={value.market ?? "uae"} options={publicSectorMarkets} onChange={(market) => update({ market })} />
      <Field label="Market label" required path="content.publicSectorPov.marketLabel" value={value.marketLabel} onChange={(marketLabel) => update({ marketLabel })} />
    </div>}
    {show("publicSectorPov.opportunity") && <PublicSectorRichBlockEditor label="Public Sector opportunity blocks" path="content.publicSectorPov.opportunity" required value={value.opportunity} onChange={(opportunity) => update({ opportunity })} />}
    {show("publicSectorPov.pressuresHeading") && <Field label="Operating pressures heading" required path="content.publicSectorPov.pressuresHeading" value={value.pressuresHeading} onChange={(pressuresHeading) => update({ pressuresHeading })} />}
    {show("publicSectorPov.capabilitiesIntroduction") && <Area label="Capabilities introduction" required path="content.publicSectorPov.capabilitiesIntroduction" value={value.capabilitiesIntroduction ?? ""} onChange={(capabilitiesIntroduction) => update({ capabilitiesIntroduction })} rows={5} />}
    {show("publicSectorPov.applicationsDisclaimer") && <Area label="Applications disclaimer" required path="content.publicSectorPov.applicationsDisclaimer" value={value.applicationsDisclaimer ?? ""} onChange={(applicationsDisclaimer) => update({ applicationsDisclaimer })} rows={5} />}
    {show("publicSectorPov.marketHeading") && <Field label="Market context heading" required path="content.publicSectorPov.marketHeading" value={value.marketHeading} onChange={(marketHeading) => update({ marketHeading })} />}
    {show("publicSectorPov.marketContext") && <PublicSectorRichBlockEditor label="Market context blocks" path="content.publicSectorPov.marketContext" required value={value.marketContext} onChange={(marketContext) => update({ marketContext })} />}
    {show("publicSectorPov.sourcesIntroduction") && <Area label="Sources introduction" required path="content.publicSectorPov.sourcesIntroduction" value={value.sourcesIntroduction ?? ""} onChange={(sourcesIntroduction) => update({ sourcesIntroduction })} rows={5} />}
      {show("publicSectorPov.reviewBlockers") && <StringList label="Review blockers (publish gate)" path="content.publicSectorPov.reviewBlockers" maximum={30} value={value.reviewBlockers} onChange={(reviewBlockers) => update({ reviewBlockers: reviewBlockers.length ? reviewBlockers : undefined })} />}
    {show("publicSectorPov.nextAction") && <PublicSectorRichBlockEditor label="Next action blocks" path="content.publicSectorPov.nextAction" required value={value.nextAction} onChange={(nextAction) => update({ nextAction })} />}
  </section>;
}

function EducationDomains({ value, onChange, version, path }: { value: unknown; onChange: (value: any[]) => void; version?: 2; path?: string }) {
  const items = Array.isArray(value) ? value : [];
  const maximum = version === 2 ? 5 : 3;
  return <section id={path ? contentFieldId(path) : undefined} data-field-path={path} tabIndex={path ? -1 : undefined} className="space-y-3"><div className="flex justify-between"><Label>{version === 2 ? "Five value domains" : "Three value domains"} <Requirement required /></Label><Button type="button" size="sm" variant="outline" disabled={items.length >= maximum} onClick={() => onChange([...items, { title: "", body: "", examples: [] }])}>Add domain</Button></div>{items.map((item, index) => <fieldset key={index} className="space-y-3 rounded-md border p-3"><legend>Domain {index + 1}</legend><Field label={`Domain ${index + 1} title`} path={path ? `${path}.${index}.title` : undefined} required value={item.title} onChange={(title) => onChange(items.map((current, i) => i === index ? { ...current, title } : current))} /><Area label={`Domain ${index + 1} description`} path={path ? `${path}.${index}.body` : undefined} required value={item.body ?? ""} onChange={(body) => onChange(items.map((current, i) => i === index ? { ...current, body } : current))} /><StringList label={`Domain ${index + 1} examples`} path={path ? `${path}.${index}.examples` : undefined} required={version !== 2} value={item.examples} onChange={(examples) => onChange(items.map((current, i) => i === index ? { ...current, examples } : current))} /><Button type="button" variant="ghost" aria-label={`Remove domain ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove domain</Button></fieldset>)}</section>;
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

function BankingProductionEditor({ value, onChange, path }: { value: Content; onChange: (value: Content) => void; path: string }) {
  const production = value ?? {};
  return <fieldset id={contentFieldId(path)} data-field-path={path} className="space-y-3 rounded-md border p-3"><legend>Production readiness — From permission to action</legend><Field label="Readiness eyebrow" path={`${path}.eyebrow`} required value={production.eyebrow} onChange={(eyebrow) => onChange({ ...production, eyebrow })} /><Field label="Readiness heading" path={`${path}.heading`} required value={production.heading} onChange={(heading) => onChange({ ...production, heading })} /><Area label="Readiness narrative" path={`${path}.body`} required value={production.body ?? ""} onChange={(body) => onChange({ ...production, body })} /><StringList label="Production practices" path={`${path}.practices`} required value={production.practices} onChange={(practices) => onChange({ ...production, practices })} /><MediaField label="Permission-to-action artwork" role="supporting" required overridePath={`${path}.image`} value={production.image?.mediaId && production.image?.mediaVersionId ? production.image as MediaSelection : undefined} onChange={(image) => onChange({ ...production, image: image ? { ...(production.image ?? {}), ...image } : undefined })} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Artwork focal X (0–100)" path={`${path}.focalPoint.x`} required type="number" value={production.focalPoint?.x} onChange={(x) => onChange({ ...production, focalPoint: { ...production.focalPoint, x: Number(x) } })} /><Field label="Artwork focal Y (0–100)" path={`${path}.focalPoint.y`} required type="number" value={production.focalPoint?.y} onChange={(y) => onChange({ ...production, focalPoint: { ...production.focalPoint, y: Number(y) } })} /></div><Area label="Artwork annotation" path={`${path}.annotation`} required value={production.annotation ?? ""} onChange={(annotation) => onChange({ ...production, annotation })} /></fieldset>;
}

function BankingStartingPointEditor({ value, onChange, path }: { value: Content[]; onChange: (value: Content[]) => void; path: string }) {
  const points = Array.isArray(value) ? value : [];
  const update = (index: number, patch: Content) => onChange(points.map((item, current) => current === index ? { ...item, ...patch } : item));
  return <section id={contentFieldId(path)} data-field-path={path} className="space-y-3"><Label>Four image-led starting points <Requirement required /></Label>{points.map((item, index) => <fieldset key={item.id ?? index} className="space-y-3 rounded-md border p-3"><legend>{item.title || `Starting point ${index + 1}`}</legend><Field label={`${item.title || "Starting point"} value proposition`} path={`${path}.${index}.valueProposition`} required value={item.valueProposition} onChange={(valueProposition) => update(index, { valueProposition })} /><Area label={`${item.title || "Starting point"} problem`} path={`${path}.${index}.problem`} required value={item.problem ?? ""} onChange={(problem) => update(index, { problem })} /><Area label={`${item.title || "Starting point"} Cognirise role`} path={`${path}.${index}.cogniriseRole`} required value={item.cogniriseRole ?? ""} onChange={(cogniriseRole) => update(index, { cogniriseRole })} /><StringList label={`${item.title || "Starting point"} required inputs`} path={`${path}.${index}.requiredInputs`} required value={item.requiredInputs} onChange={(requiredInputs) => update(index, { requiredInputs })} /><Area label={`${item.title || "Starting point"} first deliverable`} path={`${path}.${index}.firstDeliverable`} required value={item.firstDeliverable ?? ""} onChange={(firstDeliverable) => update(index, { firstDeliverable })} /><StringList label={`${item.title || "Starting point"} measures`} path={`${path}.${index}.measures`} required value={item.measures} onChange={(measures) => update(index, { measures })} /><Area label={`${item.title || "Starting point"} decision boundary`} path={`${path}.${index}.decisionBoundary`} required value={item.decisionBoundary ?? ""} onChange={(decisionBoundary) => update(index, { decisionBoundary })} /><div className="grid gap-4 sm:grid-cols-2"><Field label={`${item.title || "Starting point"} CTA label`} path={`${path}.${index}.action.label`} required value={item.action?.label} onChange={(label) => update(index, { action: { ...item.action, label } })} /><Field label={`${item.title || "Starting point"} CTA link`} path={`${path}.${index}.action.href`} required value={item.action?.href} onChange={(href) => update(index, { action: { ...item.action, href } })} /></div><MediaField label={`${item.title || "Starting point"} card image`} role="supporting" required overridePath={`${path}.${index}.image`} value={item.image?.mediaId && item.image?.mediaVersionId ? item.image as MediaSelection : undefined} onChange={(image) => update(index, { image: image ? { ...(item.image ?? {}), ...image } : undefined })} /><div className="grid gap-4 sm:grid-cols-2"><Field label={`${item.title || "Starting point"} image focal X (0–100)`} path={`${path}.${index}.focalPoint.x`} required type="number" value={item.focalPoint?.x} onChange={(x) => update(index, { focalPoint: { ...item.focalPoint, x: Number(x) } })} /><Field label={`${item.title || "Starting point"} image focal Y (0–100)`} path={`${path}.${index}.focalPoint.y`} required type="number" value={item.focalPoint?.y} onChange={(y) => update(index, { focalPoint: { ...item.focalPoint, y: Number(y) } })} /></div></fieldset>)}</section>;
}

function BankingValueOutcomes({ value, onChange, path }: { value: Content[]; onChange: (value: Content[]) => void; path: string }) {
  const values = Array.isArray(value) ? value : [];
  return <section id={contentFieldId(path)} data-field-path={path} className="space-y-3"><Label>Three business value outcomes <Requirement required /></Label>{values.map((item, index) => <fieldset key={index} className="space-y-3 rounded-md border p-3"><legend>Outcome {index + 1}</legend><Field label={`Outcome ${index + 1} title`} path={`${path}.${index}.title`} required value={item.title} onChange={(title) => onChange(values.map((current, i) => i === index ? { ...current, title } : current))} /><Area label={`Outcome ${index + 1} explanation`} path={`${path}.${index}.body`} required value={item.body ?? ""} onChange={(body) => onChange(values.map((current, i) => i === index ? { ...current, body } : current))} /><StringList label={`Outcome ${index + 1} measures`} path={`${path}.${index}.measures`} required value={item.measures} onChange={(measures) => onChange(values.map((current, i) => i === index ? { ...current, measures } : current))} /></fieldset>)}</section>;
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
      <Field label="Banking descriptor" required path="content.bankingPov.descriptor" value={value.descriptor} onChange={(descriptor) => update({ descriptor })} />
    </div>
    <fieldset className="space-y-3 rounded-md border p-3"><legend>Hero</legend>
      <Field label="Hero eyebrow" required path="content.bankingPov.hero.eyebrow" value={value.hero?.eyebrow} onChange={(eyebrow) => update({ hero: { ...value.hero, eyebrow } })} />
      <Field label="Hero heading" required path="content.bankingPov.hero.heading" value={value.hero?.heading} onChange={(heading) => update({ hero: { ...value.hero, heading } })} />
      <Area label="Hero body" required path="content.bankingPov.hero.body" value={value.hero?.body ?? ""} onChange={(body) => update({ hero: { ...value.hero, body } })} />
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Starting-points anchor label" required path="content.bankingPov.hero.startingPointsAnchorLabel" value={value.hero?.startingPointsAnchorLabel} onChange={(startingPointsAnchorLabel) => update({ hero: { ...value.hero, startingPointsAnchorLabel } })} /><Field label="Selected-work anchor label" required path="content.bankingPov.hero.selectedWorkAnchorLabel" value={value.hero?.selectedWorkAnchorLabel} onChange={(selectedWorkAnchorLabel) => update({ hero: { ...value.hero, selectedWorkAnchorLabel } })} /></div>
    </fieldset></>}
    {show("bankingPov.evidenceSignals") && <RecordList label="Attributed evidence signals" path="content.bankingPov.evidenceSignals" value={value.evidenceSignals} minimum={1} columns={[{ key: "statement", label: "Claim supported" }, { key: "qualification", label: "Qualification" }, { key: "label", label: "Source title" }, { key: "publisher", label: "Publisher" }, { key: "publicationPeriod", label: "Publication period" }, { key: "accessedAt", label: "Accessed", type: "date" }, { key: "jurisdiction", label: "Jurisdiction" }, { key: "kind", label: "Evidence category" }, { key: "url", label: "Source URL" }]} onChange={(evidenceSignals) => update({ evidenceSignals })} />}
    {show("bankingPov.valueOutcomes") && <BankingValueOutcomes path="content.bankingPov.valueOutcomes" value={value.valueOutcomes} onChange={(valueOutcomes) => update({ valueOutcomes })} />}
    {show("bankingPov.adoptionLevels") && <BankingLevels path="content.bankingPov.adoptionLevels" value={value.adoptionLevels} onChange={(adoptionLevels) => update({ adoptionLevels })} />}
    {show("bankingPov.valueDomains") && <BankingDomains path="content.bankingPov.valueDomains" value={value.valueDomains} onChange={(valueDomains) => update({ valueDomains })} />}
    {show("bankingPov.startingPoints") && <BankingStartingPointEditor path="content.bankingPov.startingPoints" value={value.startingPoints} onChange={(startingPoints) => update({ startingPoints })} />}
    {show("bankingPov.voiceBanking") && <BankingVoiceEditor path="content.bankingPov.voiceBanking" value={value.voiceBanking} onChange={(voiceBanking) => update({ voiceBanking })} />}
    {show("bankingPov.productionReadiness") && <BankingProductionEditor path="content.bankingPov.productionReadiness" value={value.productionReadiness} onChange={(productionReadiness) => update({ productionReadiness })} />}
    {show("bankingPov.deliveryPath") && <fieldset id={contentFieldId("content.bankingPov.deliveryPath")} data-field-path="content.bankingPov.deliveryPath" className="space-y-3 rounded-md border p-3"><legend>Delivery path</legend><RecordList label="Named delivery stages" path="content.bankingPov.deliveryPath.stages" value={value.deliveryPath?.stages} minimum={4} columns={[{ key: "stage", label: "Stage" }, { key: "owner", label: "Owner" }, { key: "outcome", label: "Outcome" }]} onChange={(stages) => update({ deliveryPath: { ...value.deliveryPath, stages } })} /><StringList label="Delivery-path practices" path="content.bankingPov.deliveryPath.practices" required value={value.deliveryPath?.practices} onChange={(practices) => update({ deliveryPath: { ...value.deliveryPath, practices } })} /></fieldset>}
    {show("bankingPov.market") && <Choice label="Banking market" required path="content.bankingPov.market" value={value.market ?? "uae"} options={["uae", "ksa", "turkiye", "europe"]} onChange={(market) => update({ market })} />}
    {show("bankingPov.partners") && <RecordList label="Partner roles" path="content.bankingPov.partners" value={value.partners} minimum={2} columns={[{ key: "name", label: "Partner" }, { key: "contribution", label: "Contribution" }, { key: "qualification", label: "Qualification" }, { key: "href", label: "External link" }]} onChange={(partners) => update({ partners })} />}
    {show("bankingPov.caseMembershipSnapshot") && <RecordList label="Protected published case receipt" path="content.bankingPov.caseMembershipSnapshot" value={value.caseMembershipSnapshot} minimum={1} columns={[{ key: "slug", label: "Case slug" }, { key: "title", label: "Published title" }, { key: "order", label: "Published order" }, { key: "digest", label: "Payload digest" }]} onChange={(caseMembershipSnapshot) => update({ caseMembershipSnapshot })} />}
    {show("bankingPov.cta") && <fieldset id={contentFieldId("content.bankingPov.cta")} data-field-path="content.bankingPov.cta" className="space-y-3 rounded-md border p-3"><legend>Existing Value Scan CTA</legend><Field label="CTA heading" path="content.bankingPov.cta.heading" required value={value.cta?.heading} onChange={(heading) => update({ cta: { ...value.cta, heading } })} /><Area label="CTA body" path="content.bankingPov.cta.body" required value={value.cta?.body ?? ""} onChange={(body) => update({ cta: { ...value.cta, body }})} /><div className="grid gap-4 sm:grid-cols-2"><Field label="CTA label" path="content.bankingPov.cta.label" required value={value.cta?.label} onChange={(label) => update({ cta: { ...value.cta, label } })} /><Field label="CTA destination" path="content.bankingPov.cta.href" required value={value.cta?.href} onChange={(href) => update({ cta: { ...value.cta, href } })} /></div></fieldset>}
  </section>;
}

function BankingDomains({ value, onChange, path }: { value: Content[]; onChange: (value: Content[]) => void; path: string }) {
  const domains = Array.isArray(value) ? value : [];
  const update = (index: number, patch: Content) => onChange(domains.map((item, current) => current === index ? { ...item, ...patch } : item));
  return <section id={contentFieldId(path)} data-field-path={path} className="space-y-3"><Label>Six banking value domains <Requirement required /></Label>{domains.map((item, index) => <fieldset key={item.id ?? index} className="space-y-3 rounded-md border p-3"><legend>{item.title || `Domain ${index + 1}`}</legend><Area label={`${item.title || "Domain"} purpose`} path={`${path}.${index}.purpose`} required value={item.purpose ?? ""} onChange={(purpose) => update(index, { purpose })} /><StringList label={`${item.title || "Domain"} examples`} path={`${path}.${index}.examples`} required value={item.examples} onChange={(examples) => update(index, { examples })} /><StringList label={`${item.title || "Domain"} observable measures`} path={`${path}.${index}.measures`} required value={item.measures} onChange={(measures) => update(index, { measures })} /></fieldset>)}</section>;
}

function BankingVoiceEditor({ value, onChange, path }: { value: Content; onChange: (value: Content) => void; path: string }) {
  const voice = value ?? {};
  const journeys = Array.isArray(voice.journeys) ? voice.journeys : [];
  const updateJourney = (index: number, patch: Content) => onChange({ ...voice, journeys: journeys.map((item, current) => current === index ? { ...item, ...patch } : item) });
  return <section id={contentFieldId(path)} data-field-path={path} className="space-y-3"><Label>Voice banking explorer <Requirement required /></Label><fieldset className="space-y-3 rounded-md border p-3"><legend>Lupitor platform contribution</legend><Area label="Platform contribution" path={`${path}.platform.contribution`} required value={voice.platform?.contribution ?? ""} onChange={(contribution) => onChange({ ...voice, platform: { ...voice.platform, name: "Lupitor", contribution } })} /><Field label="Platform link" path={`${path}.platform.href`} required value={voice.platform?.href} onChange={(href) => onChange({ ...voice, platform: { ...voice.platform, name: "Lupitor", href } })} /><Area label="Platform claim qualification" path={`${path}.platform.qualification`} required value={voice.platform?.qualification ?? ""} onChange={(qualification) => onChange({ ...voice, platform: { ...voice.platform, name: "Lupitor", qualification } })} /><Area label="Cognirise integration and operating role" path={`${path}.cogniriseContribution`} required value={voice.cogniriseContribution ?? ""} onChange={(cogniriseContribution) => onChange({ ...voice, cogniriseContribution })} /></fieldset>{journeys.map((item, index) => <fieldset key={item.id ?? index} className="space-y-3 rounded-md border p-3"><legend>{item.title || `Voice journey ${index + 1}`}</legend><Area label={`${item.title || "Voice journey"} scope`} path={`${path}.journeys.${index}.scope`} required value={item.scope ?? ""} onChange={(scope) => updateJourney(index, { scope })} /><StringList label={`${item.title || "Voice journey"} measures`} path={`${path}.journeys.${index}.measures`} required value={item.measures} onChange={(measures) => updateJourney(index, { measures })} /><Area label={`${item.title || "Voice journey"} control boundary`} path={`${path}.journeys.${index}.controlBoundary`} required value={item.controlBoundary ?? ""} onChange={(controlBoundary) => updateJourney(index, { controlBoundary })} /></fieldset>)}</section>;
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

function BankingLevels({ value, onChange, path }: { value: Content[]; onChange: (value: Content[]) => void; path: string }) {
  const levels = Array.isArray(value) ? value : [];
  const update = (index: number, patch: Content) => onChange(levels.map((item, current) => current === index ? { ...item, ...patch } : item));
  return <section id={contentFieldId(path)} data-field-path={path} className="space-y-3"><Label>Three accountable adoption levels <Requirement required /></Label>{levels.map((item, index) => <fieldset key={item.level ?? index} className="space-y-3 rounded-md border p-3"><legend>Level {item.level ?? index + 1}</legend><Field label={`Level ${index + 1} title`} path={`${path}.${index}.title`} required value={item.title} onChange={(title) => update(index, { title })} /><Area label={`Level ${index + 1} value`} path={`${path}.${index}.value`} required value={item.value ?? ""} onChange={(value) => update(index, { value })} /><Field label={`Level ${index + 1} accountable owner`} path={`${path}.${index}.owner`} required value={item.owner} onChange={(owner) => update(index, { owner })} /><StringList label={`Level ${index + 1} illustrative work`} path={`${path}.${index}.illustrativeWork`} required value={item.illustrativeWork} onChange={(illustrativeWork) => update(index, { illustrativeWork })} /><StringList label={`Level ${index + 1} readiness conditions`} path={`${path}.${index}.readiness`} required value={item.readiness} onChange={(readiness) => update(index, { readiness })} /><StringList label={`Level ${index + 1} measures`} path={`${path}.${index}.measures`} required value={item.measures} onChange={(measures) => update(index, { measures })} /><Area label={`Level ${index + 1} decision boundary`} path={`${path}.${index}.decisionBoundary`} required value={item.decisionBoundary ?? ""} onChange={(decisionBoundary) => update(index, { decisionBoundary })} /></fieldset>)}</section>;
}

/** The template deliberately exposes prose only. Fixed card IDs, E1–E5
 * sequence, method step count, and link destinations stay contract-owned. */
function GuardrailsFrameworkEditor({ value, onChange }: { value: Content; onChange: (value: Content) => void }) {
  const update = (path: string[], next: unknown) => {
    const copy = JSON.parse(JSON.stringify(value)) as Content;
    let target = copy;
    path.slice(0, -1).forEach((key) => { target = target[key]; });
    target[path[path.length - 1]] = next;
    onChange({ ...copy, schemaVersion: 1 });
  };
  const area = (label: string, path: string[], rows = 4) => (
    <Area label={label} path={`content.${path.join(".")}`} value={String(path.reduce((item, key) => item?.[key], value) ?? "")} onChange={(next) => update(path, next)} rows={rows} required />
  );
  const section = (title: string, children: ReactNode) => (
    <section className="space-y-4 rounded-md border p-4"><h3 className="font-semibold">{title}</h3>{children}</section>
  );
  const groups = guardrailsEditableTextPaths(value).reduce<Record<string, string[][]>>((all, path) => {
    const key = path[0] ?? "other";
    (all[key] ??= []).push(path);
    return all;
  }, {});
  const isSetProveHold = value.contentVersion === "set-prove-hold-v1";
  return <div className="space-y-5">
    <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      {isSetProveHold
        ? "Set, Prove & Hold is the current standalone Guardrails composition. Its action, layer, lifecycle, and move identifiers are locked; every displayed editorial field below remains editable. This native-diagram edition deliberately has no hero-media requirement."
        : "This is a historical standalone Guardrails revision. Its reviewed structure and destinations are locked; every displayed prose, figure label, accessible text, source list, CTA label, and legal note below is editable."}
    </p>
    {!isSetProveHold && <MediaField label="Guardrails hero image" value={value.heroMedia} overridePath="content.heroMedia" onChange={(heroMedia) => onChange({ ...value, heroMedia })} />}
    {Object.entries(groups).map(([name, paths]) => section(name.replace(/([A-Z])/g, " $1"), <div className="space-y-4">{paths.map((path) => area(path.slice(1).join(" · ") || name, path, 4))}</div>))}
  </div>;
}

function updateEditorialValue(value: unknown, path: readonly (string | number)[], next: unknown): unknown {
  if (!path.length) return next;
  const [key, ...remaining] = path;
  if (Array.isArray(value)) {
    return value.map((item, index) => index === key ? updateEditorialValue(item, remaining, next) : item);
  }
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { ...record, [key]: updateEditorialValue(record[key], remaining, next) };
}

function MethodologyFrameworkEditor({ value, onChange }: { value: Content; onChange: (value: Content) => void }) {
  const set = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  const hero = value.hero ?? {};
  const definition = methodologyEditorialDefinition(String(value.template));
  const immutableGroups = Object.entries(value.canonical ?? {}).map(([label, slots]: [string, any]) =>
    `${label}: ${Array.isArray(slots) ? slots.map((slot) => slot.id).join(" · ") : ""}`,
  );
  return (
    <section className="space-y-6 rounded-md border p-4">
      <div>
        <h3 className="font-semibold">Methodology editorial composition</h3>
        <p className="mt-1 text-sm text-muted-foreground">Edit only the fixed approved fields for this template. Assessment and canon identifiers below are fixed by the reviewed method.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hero breadcrumb" path="content.hero.breadcrumb" value={hero.breadcrumb ?? ""} onChange={(next) => set("hero", { ...hero, breadcrumb: next })} />
        <Field label="Hero title" path="content.hero.title" value={hero.title ?? ""} onChange={(next) => set("hero", { ...hero, title: next })} />
      </div>
      <Area label="Hero description" path="content.hero.description" value={hero.description ?? ""} onChange={(next) => set("hero", { ...hero, description: next })} />
      <Area label="Hero supporting copy" path="content.hero.supportingText" value={hero.supportingText ?? ""} onChange={(next) => set("hero", { ...hero, supportingText: next || undefined })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hero caption label" path="content.hero.imageCaptionSubtitle" value={hero.imageCaptionSubtitle ?? ""} onChange={(next) => set("hero", { ...hero, imageCaptionSubtitle: next || undefined })} />
        <Field label="Hero caption" path="content.hero.imageCaptionTitle" value={hero.imageCaptionTitle ?? ""} onChange={(next) => set("hero", { ...hero, imageCaptionTitle: next || undefined })} />
        <Field label="Hero image position" path="content.hero.imagePosition" value={hero.imagePosition ?? ""} onChange={(next) => set("hero", { ...hero, imagePosition: next || undefined })} placeholder="right center" />
        <MediaField label="Framework hero image" required value={hero.media} overridePath="content.hero.media" onChange={(next) => set("hero", { ...hero, media: next })} />
      </div>
      {definition ? (
        <div className="space-y-5">
          <h4 className="font-semibold">Fixed editorial slots</h4>
          <EditorialSlotEditor
            slot={definition.slots}
            value={value.editorial}
            path={[]}
            onChange={(editorial) => set("editorial", editorial)}
          />
        </div>
      ) : <p role="alert" className="text-sm text-destructive">This methodology template has no registered slot definition.</p>}
      <div className="rounded border bg-muted/30 p-3 text-sm text-muted-foreground">
        <strong className="block text-foreground">Fixed method identifiers</strong>
        {immutableGroups.map((group) => <p key={group} className="mt-1 font-mono text-xs">{group}</p>)}
      </div>
    </section>
  );
}

/** New framework editions always start with their immutable method identity.
 * The labels and prose surrounding these slots are editorial; their IDs and
 * sequence are deliberately not editable controls. */
export function methodologyFrameworkDraft(template: string): Content {
  const canonical = methodologyCanonicalIds[template];
  if (!canonical) throw new Error(`Unsupported methodology template "${template}".`);
  const definition = methodologyEditorialDefinition(template);
  if (!definition) throw new Error(`Methodology template "${template}" has no registered editorial slot definition.`);
  // The descriptor's literal type can be deeply nested; admin form state is
  // intentionally an untyped JSON record at this boundary.
  const editorialSeed = definition.seed as Record<string, unknown>;
  return {
    schemaVersion: 1,
    template,
    hero: { breadcrumb: "", title: "", description: "", supportingText: "", imageCaptionSubtitle: "", imageCaptionTitle: "" },
    editorial: structuredClone(editorialSeed),
    canonical: Object.fromEntries(Object.entries(canonical).map(([key, ids]) => [key, ids.map((id) => ({ id }))])),
    visibility: "hidden",
    order: 0,
    sources: [],
    relatedIds: [],
  };
}

function EditorialSlotEditor({
  slot,
  value,
  path,
  onChange,
}: {
  slot: MethodologySlot;
  value: unknown;
  path: readonly (string | number)[];
  onChange: (next: unknown) => void;
}) {
  const fieldPath = `content.editorial.${path.join(".")}`;
  switch (slot.kind) {
    case "fixed":
      return null;
    case "text":
      return slot.format === "short"
        ? <Field label={slot.label} value={value} path={fieldPath} onChange={onChange} required />
        : <Area label={slot.label} value={typeof value === "string" ? value : ""} path={fieldPath} onChange={onChange} required rows={4} />;
    case "link": {
      const current = value && typeof value === "object" ? value as { label?: string; href?: string } : {};
      return (
        <div className="grid gap-4 rounded border p-4 sm:grid-cols-2">
          <Field label={`${slot.label} label`} value={current.label ?? ""} path={`${fieldPath}.label`} onChange={(label) => onChange({ ...current, label })} required />
          <SafeDestinationField label={`${slot.label} destination`} path={`${fieldPath}.href`} value={current.href ?? ""} onChange={(href) => onChange({ ...current, href })} />
        </div>
      );
    }
    case "media": {
      const current = value && typeof value === "object" ? value as { altText?: string; media?: MediaSelection } : {};
      return (
        <div className="grid gap-4 rounded border p-4 sm:grid-cols-2">
          <Area label={`${slot.label} alternative text`} value={current.altText ?? ""} path={`${fieldPath}.altText`} onChange={(altText) => onChange({ ...current, altText })} required rows={3} />
          <MediaField
            label={slot.label}
            role={slot.role}
            required
            value={current.media}
            overridePath={`${fieldPath}.media`}
            onChange={(media) => onChange({
              ...current,
              // Methodology accessibility copy is owned by the outer revision
              // slot. Persist only its immutable asset pin here.
              media: media && {
                mediaId: media.mediaId,
                mediaVersionId: media.mediaVersionId,
                role: media.role,
              },
            })}
          />
        </div>
      );
    }
    case "group":
      return (
        <div className="space-y-4">
          {Object.entries(slot.fields).map(([key, child]) => (
            <EditorialSlotEditor
              key={key}
              slot={child}
              value={value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined}
              path={[...path, key]}
              onChange={(next) => onChange(updateEditorialValue(value, [key], next))}
            />
          ))}
        </div>
      );
    case "fixed-list":
      return (
        <fieldset className="space-y-4 rounded border p-4">
          <legend className="px-1 text-sm font-semibold">{slot.label}</legend>
          {slot.items.map((child, index) => (
            <EditorialSlotEditor
              key={index}
              slot={child}
              value={Array.isArray(value) ? value[index] : undefined}
              path={[...path, index]}
              onChange={(next) => onChange(updateEditorialValue(value, [index], next))}
            />
          ))}
        </fieldset>
      );
  }
}
