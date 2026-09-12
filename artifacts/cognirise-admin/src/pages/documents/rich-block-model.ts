export type RichBlockType = "paragraph" | "heading" | "list" | "quote";
export type RichBlock = {
  type: RichBlockType;
  level?: 2 | 3;
  text?: string;
  style?: "bullet" | "numbered";
  items?: string[];
  attribution?: string;
  [key: string]: unknown;
};

export type RichBlockValue = RichBlock | unknown;

export function richBlockValues(value: unknown): RichBlockValue[] {
  return Array.isArray(value) ? [...value] : [];
}

export function isRichBlock(value: unknown): value is RichBlock {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && ["paragraph", "heading", "list", "quote"].includes((value as Record<string, unknown>).type as string);
}

export function richBlockText(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const block = value as Record<string, unknown>;
  if (typeof block.text === "string") return block.text;
  return Array.isArray(block.items)
    ? block.items.filter((item): item is string => typeof item === "string").join("\n")
    : "";
}

export function changeRichBlockType(value: unknown, type: RichBlockType): RichBlock {
  const current: RichBlock = isRichBlock(value) ? value : { type: "paragraph", text: "" };
  const text = richBlockText(current);
  if (type === "heading") {
    return {
      type,
      level: current.type === "heading" ? current.level ?? 2 : 2,
      text,
    };
  }
  if (type === "list") {
    return {
      type,
      style: current.type === "list" ? current.style ?? "bullet" : "bullet",
      items: current.type === "list"
        ? [...(current.items ?? [])]
        : [text],
    };
  }
  if (type === "quote") {
    return {
      type,
      text,
      ...(current.type === "quote" && current.attribution
        ? { attribution: current.attribution }
        : {}),
    };
  }
  return { type, text };
}

export function updateRichBlock(
  value: unknown,
  index: number,
  next: RichBlockValue,
): RichBlockValue[] {
  const blocks = richBlockValues(value);
  return blocks.map((block, current) => current === index ? next : block);
}

export function removeRichBlock(value: unknown, index: number): RichBlockValue[] {
  return richBlockValues(value).filter((_, current) => current !== index);
}