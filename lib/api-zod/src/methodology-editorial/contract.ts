import { z } from "zod";

/**
 * A methodology page owns its composition. These descriptors describe only
 * the fixed editorial values a page elects to expose; they never describe
 * layout or permit an editor to add, remove, or reorder page regions.
 */
export type MethodologyTextFormat = "short" | "long";
export type MethodologyMediaRole = "hero" | "supporting" | "background" | "icon";

type BaseSlot = { label: string };
export type TextSlot<Value extends string = string> = BaseSlot & {
  kind: "text";
  value: Value;
  format: MethodologyTextFormat;
};
export type LinkSlot<Label extends string = string, Href extends string = string> = BaseSlot & {
  kind: "link";
  labelValue: Label;
  href: Href;
};
export type MediaSlot<Src extends string = string, Alt extends string = string> = BaseSlot & {
  kind: "media";
  src: Src;
  altText: Alt;
  role: MethodologyMediaRole;
};
export interface FixedSlot<Value = unknown> { kind: "fixed"; value: Value }
export interface GroupSlot<Fields extends Record<string, MethodologySlot> = Record<string, MethodologySlot>> {
  kind: "group";
  fields: Fields;
}
export interface FixedListSlot<Items extends readonly MethodologySlot[] = readonly MethodologySlot[]> extends BaseSlot {
  kind: "fixed-list";
  items: Items;
}
export type MethodologySlot =
  | TextSlot
  | LinkSlot
  | MediaSlot
  | FixedSlot
  | GroupSlot
  | FixedListSlot;

export type ImmutableMediaPin = {
  mediaId: string;
  mediaVersionId: string;
  role: MethodologyMediaRole;
};

type MaterializeSlot<T extends MethodologySlot> =
  T extends TextSlot<infer Value> ? Value
    : T extends LinkSlot<infer Label, infer Href> ? { label: Label; href: Href }
      : T extends MediaSlot<infer Src, infer Alt> ? {
        src: Src;
        altText: Alt;
        media?: ImmutableMediaPin;
      }
        : T extends FixedSlot<infer Value> ? Value
          : T extends GroupSlot<infer Fields> ? { [K in keyof Fields]: MaterializeSlot<Fields[K]> }
            : T extends FixedListSlot<infer Items> ? { [K in keyof Items]: Items[K] extends MethodologySlot ? MaterializeSlot<Items[K]> : never }
              : never;

export type MethodologyEditorialValue<T extends GroupSlot> = MaterializeSlot<T>;

export type MethodologyEditorialDefinition<
  Template extends string = string,
  Editorial extends GroupSlot = GroupSlot,
> = {
  template: Template;
  slots: Editorial;
  seed: MethodologyEditorialValue<Editorial>;
  editorialSchema: z.ZodType<MethodologyEditorialValue<Editorial>>;
};

const safeExternalUrl = z.string().url().regex(/^https?:\/\//i, "Only HTTP(S) links are allowed.");
const safeInternalPath = z.string().regex(/^\/(?!\/)[a-z0-9/_-]*(?:\?[a-z0-9&=_-]+)?(?:#[a-z0-9_-]+)?$/i);
const safeAnchor = z.string().regex(/^#[a-z][a-z0-9_-]*$/i);
const safeLink = z.union([safeExternalUrl, safeInternalPath, safeAnchor]);
const immutableMediaPinSchema = z.object({
  mediaId: z.string().uuid(),
  mediaVersionId: z.string().uuid(),
  role: z.enum(["hero", "supporting", "background", "icon"]),
}).strict();

export function text<Value extends string>(
  value: Value,
  label: string,
  options: { format?: MethodologyTextFormat } = {},
): TextSlot<Value> {
  return { kind: "text", value, label, format: options.format ?? "short" };
}

export function link<Label extends string, Href extends string>(
  labelValue: Label,
  href: Href,
  label: string,
): LinkSlot<Label, Href> {
  return { kind: "link", labelValue, href, label };
}

export function media<Src extends string, Alt extends string>({
  src,
  altText,
  role,
  label,
}: {
  src: Src;
  altText: Alt;
  role: MethodologyMediaRole;
  label: string;
}): MediaSlot<Src, Alt> {
  return { kind: "media", src, altText, role, label };
}

export function fixed<Value>(value: Value): FixedSlot<Value> {
  return { kind: "fixed", value };
}

export function group<Fields extends Record<string, MethodologySlot>>(fields: Fields): GroupSlot<Fields> {
  return { kind: "group", fields };
}

export function fixedList<Items extends readonly MethodologySlot[]>(label: string, items: Items): FixedListSlot<Items> {
  return { kind: "fixed-list", label, items };
}

function materialize(slot: MethodologySlot): unknown {
  switch (slot.kind) {
    case "text":
      return slot.value;
    case "link":
      return { label: slot.labelValue, href: slot.href };
    case "media":
      return { src: slot.src, altText: slot.altText };
    case "fixed":
      return slot.value;
    case "group": {
      return Object.fromEntries(Object.entries(slot.fields).map(([key, child]) => [
        key,
        materialize(child),
      ]));
    }
    case "fixed-list":
      return slot.items.map((child) => materialize(child));
    default:
      throw new Error(`Unsupported methodology slot ${(slot as { kind: string }).kind}.`);
  }
}

function schemaFor(slot: MethodologySlot): z.ZodTypeAny {
  switch (slot.kind) {
    case "text":
      return z.string().trim().min(1).max(slot.format === "short" ? 1_000 : 8_000);
    case "link":
      return z.object({
        label: z.string().trim().min(1).max(240),
        href: safeLink,
      }).strict();
    case "media":
      return z.object({
        src: z.literal(slot.src),
        altText: z.string().trim().min(1).max(500),
        media: immutableMediaPinSchema.optional(),
      }).strict().superRefine((value, context) => {
        if (value.media && (value.media as ImmutableMediaPin).role !== slot.role) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["media", "role"], message: `Media role must remain ${slot.role}.` });
        }
      });
    case "fixed":
      return z.literal(slot.value as string | number | boolean | null);
    case "group":
      return z.object(Object.fromEntries(Object.entries(slot.fields).map(([key, child]) => [key, schemaFor(child)]))).strict();
    case "fixed-list":
      return z.tuple(slot.items.map((child) => schemaFor(child)) as [z.ZodTypeAny, ...z.ZodTypeAny[]]);
    default:
      throw new Error(`Unsupported methodology slot ${(slot as { kind: string }).kind}.`);
  }
}

export function defineMethodologyEditorialTemplate<
  Template extends string,
  Editorial extends GroupSlot,
>({ template, editorial }: { template: Template; editorial: Editorial }): MethodologyEditorialDefinition<Template, Editorial> {
  return {
    template,
    slots: editorial,
    seed: materialize(editorial) as MethodologyEditorialValue<Editorial>,
    editorialSchema: schemaFor(editorial) as z.ZodType<MethodologyEditorialValue<Editorial>>,
  };
}

/** Publish-time guard: draft seed media has a source path but publication can
 * only use a reconciled immutable asset/version pair. */
export function missingMethodologyMediaPins(
  slots: MethodologySlot,
  value: unknown,
  path = "editorial",
): string[] {
  if (!value || typeof value !== "object") return [`${path} is missing.`];
  switch (slots.kind) {
    case "media": {
      const mediaValue = value as { media?: ImmutableMediaPin };
      return !mediaValue.media
        ? [`${path}.media requires an immutable mediaId and mediaVersionId before publication.`]
        : [];
    }
    case "group":
      return Object.entries(slots.fields).flatMap(([key, slot]) =>
        missingMethodologyMediaPins(slot, (value as Record<string, unknown>)[key], `${path}.${key}`),
      );
    case "fixed-list":
      return slots.items.flatMap((slot, index) =>
        missingMethodologyMediaPins(slot, (value as unknown[])[index], `${path}.${index}`),
      );
    default:
      return [];
  }
}

export function methodologyEditorialMediaValues(
  slots: MethodologySlot,
  value: unknown,
  path = "editorial",
): Array<{ path: string; media: ImmutableMediaPin; altText: string }> {
  if (!value || typeof value !== "object") return [];
  switch (slots.kind) {
    case "media": {
      const mediaValue = value as { media?: ImmutableMediaPin; altText?: string };
      return mediaValue.media && typeof mediaValue.altText === "string"
        ? [{ path, media: mediaValue.media, altText: mediaValue.altText }]
        : [];
    }
    case "group":
      return Object.entries(slots.fields).flatMap(([key, slot]) =>
        methodologyEditorialMediaValues(slot, (value as Record<string, unknown>)[key], `${path}.${key}`),
      );
    case "fixed-list":
      return slots.items.flatMap((slot, index) =>
        methodologyEditorialMediaValues(slot, (value as unknown[])[index], `${path}.${index}`),
      );
    default:
      return [];
  }
}