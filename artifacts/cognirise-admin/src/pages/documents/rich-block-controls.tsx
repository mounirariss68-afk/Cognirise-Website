import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  changeRichBlockType,
  isRichBlock,
  removeRichBlock,
  richBlockValues,
  updateRichBlock,
  type RichBlockType,
  type RichBlockValue,
} from "./rich-block-model";
export { richBlockValues, changeRichBlockType, updateRichBlock, removeRichBlock } from "./rich-block-model";
export type { RichBlock, RichBlockType, RichBlockValue } from "./rich-block-model";

function blockLabel(type: string) {
  return type === "heading" ? "Heading" : type === "list" ? "List" : type === "quote" ? "Quotation" : "Paragraph";
}

export function RichListItems({ label, value, onChange, maximum = 50 }: {
  label: string;
  value: unknown;
  onChange: (value: string[]) => void;
  maximum?: number;
}) {
  const items = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
  return (
    <section className="space-y-3 rounded-md bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button type="button" size="sm" variant="outline" disabled={items.length >= maximum} onClick={() => onChange([...items, ""])}>
          Add list item
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Each item is independent. Line breaks, semicolons, and punctuation are kept as entered.</p>
      {items.map((item, index) => (
        <div key={index} className="space-y-2">
          <Textarea
            aria-label={`${label} ${index + 1}`}
            value={item}
            onChange={(event) => onChange(items.map((current, currentIndex) => currentIndex === index ? event.target.value : current))}
            rows={3}
          />
          <Button type="button" variant="ghost" onClick={() => onChange(items.filter((_, current) => current !== index))}>
            Remove list item
          </Button>
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-muted-foreground">No list items added.</p>}
    </section>
  );
}

export function RichBlockEditor({ label, value, onChange, required, maximum = 200 }: {
  label: string;
  value: unknown;
  onChange: (value: RichBlockValue[]) => void;
  required?: boolean;
  maximum?: number;
}) {
  const blocks = richBlockValues(value);
  const update = (index: number, next: RichBlockValue) => onChange(updateRichBlock(value, index, next));
  const supported = blocks.filter(isRichBlock);
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>{label} {required && <span className="text-destructive">(required)</span>}</Label>
          <p className="text-xs text-muted-foreground">Blocks, list styles, quote attribution, multiline values, and punctuation are saved as structured content.</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={blocks.length >= maximum}
          onClick={() => onChange([...blocks, { type: "paragraph", text: "" }])}
        >
          Add block
        </Button>
      </div>
      {blocks.map((block, index) => {
        if (!isRichBlock(block)) {
          return (
            <fieldset key={index} className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <legend className="px-1 text-xs font-medium">Unsupported legacy block {index + 1}</legend>
              <p role="alert" className="text-sm text-amber-800 dark:text-amber-200">
                This block is not editable by the current contract. It will be preserved unchanged unless you explicitly remove it.
              </p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background p-2 text-xs">{JSON.stringify(block, null, 2)}</pre>
              <Button type="button" variant="ghost" onClick={() => onChange(removeRichBlock(value, index))}>
                Remove unsupported block
              </Button>
            </fieldset>
          );
        }
        const typeOptions = ["paragraph", "heading", "list", "quote"] as const;
        return (
          <fieldset key={index} className="space-y-3 rounded-md border p-3">
            <legend className="px-1 text-xs font-medium">{label} {index + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{label} {index + 1} type</Label>
                <Select value={block.type} onValueChange={(type) => update(index, changeRichBlockType(block, type as RichBlockType))}>
                  <SelectTrigger aria-label={`${label} ${index + 1} type`}><SelectValue /></SelectTrigger>
                  <SelectContent>{typeOptions.map((type) => <SelectItem value={type} key={type}>{blockLabel(type)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {block.type === "heading" && (
                <div className="space-y-2">
                  <Label>{label} {index + 1} level</Label>
                  <Select value={String(block.level ?? 2)} onValueChange={(level) => update(index, { ...block, level: Number(level) as 2 | 3 })}>
                    <SelectTrigger aria-label={`${label} ${index + 1} level`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="2">H2</SelectItem><SelectItem value="3">H3</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              {block.type === "list" && (
                <div className="space-y-2">
                  <Label>{label} {index + 1} style</Label>
                  <Select value={block.style ?? "bullet"} onValueChange={(style) => update(index, { ...block, style: style as "bullet" | "numbered" })}>
                    <SelectTrigger aria-label={`${label} ${index + 1} style`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="bullet">Bulleted</SelectItem><SelectItem value="numbered">Numbered</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {block.type === "list" ? (
              <RichListItems
                label={`${label} ${index + 1} items`}
                value={block.items}
                onChange={(items) => update(index, { ...block, items })}
              />
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{label} {index + 1} text</Label>
                  <Textarea
                    aria-label={`${label} ${index + 1} text`}
                    value={block.text ?? ""}
                    onChange={(event) => update(index, { ...block, text: event.target.value })}
                    rows={5}
                  />
                </div>
                {block.type === "quote" && (
                  <div className="space-y-2">
                    <Label>{label} {index + 1} attribution <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      aria-label={`${label} ${index + 1} attribution`}
                      value={block.attribution ?? ""}
                      onChange={(event) => update(index, { ...block, attribution: event.target.value || undefined })}
                    />
                  </div>
                )}
              </div>
            )}
            <Button type="button" variant="ghost" onClick={() => onChange(removeRichBlock(value, index))}>Remove block</Button>
          </fieldset>
        );
      })}
      {blocks.length === 0 && <p className="text-xs text-muted-foreground">No blocks added.</p>}
      {supported.length > 0 && <p className="sr-only">{supported.length} editable rich blocks</p>}
    </section>
  );
}