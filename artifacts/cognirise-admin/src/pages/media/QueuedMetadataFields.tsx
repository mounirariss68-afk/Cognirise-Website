import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CAMPAIGN_FIELDS, MOTION_FIELDS, EMPTY_CAMPAIGN, EMPTY_MOTION, type MotionVariant } from "./MediaLibrary";
import type { QueueItem } from "./upload-queue";

export function QueuedMetadataFields({ item, update }: { item: QueueItem; update: (updates: Partial<QueueItem>) => void }) {
  const locked = Boolean(item.started);
  const motionFlags = item.motionFlags ?? { autoplay: false, loop: false, decorative: false, hasAudio: false };
  return <fieldset disabled={locked} className="space-y-4">
    <legend className="sr-only">Metadata for {item.filename}</legend>
    <p className="text-xs text-muted-foreground">Collection: {item.collection}{item.linkedinAssetKind ? ` · ${item.linkedinAssetKind}` : ""}. Credit and usage rights must be confirmed during editorial review; leave unknown credit blank.</p>
    <div className="space-y-1">
      <Label htmlFor="queued-alt">Alt text</Label>
      <Textarea id="queued-alt" maxLength={300} value={item.altText} onChange={(event) => update({ altText: event.target.value })} />
    </div>
    <div className="space-y-1">
      <Label htmlFor="queued-usage">Caption / intended usage</Label>
      <Textarea id="queued-usage" maxLength={500} value={item.usage} onChange={(event) => update({ usage: event.target.value })} />
    </div>
    <div className="space-y-1">
      <Label htmlFor="queued-credit">Credit (if known)</Label>
      <Input id="queued-credit" maxLength={200} value={item.credit} onChange={(event) => update({ credit: event.target.value })} />
    </div>
    {item.collection === "linkedin" && <div className="space-y-4 border-t pt-4">
      <h4 className="font-medium">LinkedIn campaign</h4>
      {CAMPAIGN_FIELDS.map((field) => {
        const props = {
          id: `queued-campaign-${field.key}`, maxLength: field.maxLength, placeholder: field.placeholder,
          value: item.campaignFields?.[field.key] ?? "",
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update({ campaignFields: { ...EMPTY_CAMPAIGN, ...item.campaignFields, [field.key]: event.target.value } }),
        };
        return <div key={field.key} className="space-y-1">
          <Label htmlFor={props.id}>{field.label}</Label>
          {field.multiline ? <Textarea {...props} /> : <Input {...props} />}
        </div>;
      })}
    </div>}
    {item.collection === "motion" && <div className="space-y-4 border-t pt-4">
      <h4 className="font-medium">Motion metadata</h4>
      <div className="space-y-1">
        <Label htmlFor="queued-variant">Variant</Label>
        <select id="queued-variant" className="block h-10 w-full rounded-md border bg-background px-3 text-sm" value={item.motionVariant ?? "landscape"} onChange={(event) => update({ motionVariant: event.target.value as MotionVariant })}>
          {["landscape", "portrait", "square", "mobile", "desktop"].map((variant) => <option key={variant} value={variant}>{variant}</option>)}
        </select>
      </div>
      {MOTION_FIELDS.map((field) => {
        const props = {
          id: `queued-motion-${field.key}`, maxLength: field.maxLength, placeholder: field.placeholder,
          value: item.motionFields?.[field.key] ?? "",
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update({ motionFields: { ...EMPTY_MOTION, ...item.motionFields, [field.key]: event.target.value } }),
        };
        return <div key={field.key} className="space-y-1">
          <Label htmlFor={props.id}>{field.label}{field.key === "groupId" ? " (required)" : ""}</Label>
          {field.multiline ? <Textarea {...props} /> : <Input {...props} />}
        </div>;
      })}
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ["autoplay", "Autoplay"], ["loop", "Loop"], ["decorative", "Decorative video"], ["hasAudio", "Contains audio"],
        ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={motionFlags[key]} onChange={(event) => update({ motionFlags: { ...motionFlags, [key]: event.target.checked } })} />
          {label}
        </label>)}
      </div>
    </div>}
    {locked && <p className="text-xs text-muted-foreground">Metadata is locked to this upload request.</p>}
  </fieldset>;
}