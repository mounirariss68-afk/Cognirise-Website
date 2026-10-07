import { z } from "zod";

/** A bounded manuscript grammar for the AI-native government edition, not HTML
 * or a general page builder. Presentation names describe its approved modules. */
export const PUBLIC_SECTOR_NATIVE_SECTION_IDS = [
  "distinction", "elements", "position", "change-1", "change-2", "change-3",
  "change-4", "change-5", "change-6", "tracks", "priorities", "impact", "closing", "research",
] as const;
export const publicSectorRunSchema = z.object({
  text: z.string().max(12000),
  strong: z.boolean().optional(),
  emphasis: z.boolean().optional(),
  href: z.string().regex(/^(https:\/\/|\/contact$|#ps-start$)/).max(2000).optional(),
}).strict();
export type PublicSectorRun = z.infer<typeof publicSectorRunSchema>;
const runs = z.array(publicSectorRunSchema).max(200);
export const PUBLIC_SECTOR_LAYOUTS = [
  "head", "rich", "sub", "cards", "cards-four", "cards-two", "card", "requirement",
  "two", "stats", "stat", "bands", "band", "formats", "format", "mocks",
  "mock-legend", "check", "research-list", "plain",
] as const;
export type PublicSectorNode =
  | { type: "copy"; style: "body" | "kicker" | "note" | "callout" | "legend" | "footnote" | "source" | "candidates"; runs: PublicSectorRun[] }
  | { type: "heading"; level: 2 | 3 | 4; runs: PublicSectorRun[] }
  | { type: "list"; numbered: boolean; items: PublicSectorNode[][] }
  | { type: "table"; caption: string; headers: PublicSectorNode[][]; rows: PublicSectorNode[][][] }
  | { type: "panel"; layout: typeof PUBLIC_SECTOR_LAYOUTS[number]; blocks: PublicSectorNode[] }
  | { type: "action-card"; tone: "violet" | "pink" | "coral"; kicker: string; title: string; issuer: string;
      fields: { label: string; value: string; status: string; editableExample: boolean }[];
      consequence: string; declaration: string; actionLabel: string };

export const publicSectorNodeSchema: z.ZodType<PublicSectorNode> = z.lazy(() => z.discriminatedUnion("type", [
  z.object({ type: z.literal("copy"), style: z.enum(["body", "kicker", "note", "callout", "legend", "footnote", "source", "candidates"]), runs }).strict(),
  z.object({ type: z.literal("heading"), level: z.union([z.literal(2), z.literal(3), z.literal(4)]), runs }).strict(),
  z.object({ type: z.literal("list"), numbered: z.boolean(), items: z.array(z.array(publicSectorNodeSchema).max(80)).max(80) }).strict(),
  z.object({ type: z.literal("table"), caption: z.string().min(1).max(300), headers: z.array(z.array(publicSectorNodeSchema).max(80)).min(2).max(8), rows: z.array(z.array(z.array(publicSectorNodeSchema).max(80)).min(2).max(8)).max(80) }).strict(),
  z.object({ type: z.literal("panel"), layout: z.enum(PUBLIC_SECTOR_LAYOUTS), blocks: z.array(publicSectorNodeSchema).max(100) }).strict(),
  z.object({
    type: z.literal("action-card"), tone: z.enum(["violet", "pink", "coral"]),
    kicker: z.string().min(1).max(300), title: z.string().min(1).max(300), issuer: z.string().min(1).max(600),
    fields: z.array(z.object({ label: z.string().min(1).max(300), value: z.string().min(1).max(1000), status: z.string().max(80), editableExample: z.boolean() }).strict()).min(1).max(20),
    consequence: z.string().min(1).max(2000), declaration: z.string().min(1).max(2000), actionLabel: z.string().min(1).max(300),
  }).strict(),
]));

export const publicSectorNativeSchema = z.object({
  version: z.literal(2),
  market: z.enum(["uae", "ksa", "turkiye", "europe"]),
  marketLabel: z.string().min(1).max(160),
  sourceDate: z.literal("2026-10-07"),
  researchDateQualification: z.string().min(1).max(1000),
  reviewBlockers: z.array(z.string().min(1).max(1000)).max(30),
  sections: z.array(z.object({
    id: z.enum(PUBLIC_SECTOR_NATIVE_SECTION_IDS),
    title: z.string().min(1).max(300),
    surface: z.enum(["paper", "ivory", "lilac"]),
    blocks: z.array(publicSectorNodeSchema).min(1).max(100),
  }).strict()).length(14),
}).strict().superRefine((value, ctx) => {
  if (value.sections.some((section, index) => section.id !== PUBLIC_SECTOR_NATIVE_SECTION_IDS[index])) {
    ctx.addIssue({ code: "custom", path: ["sections"], message: "Preserve the complete AI-native government section sequence." });
  }
  let cards = 0;
  const visit = (node: PublicSectorNode, path: (string | number)[]) => {
    if (node.type === "action-card") cards++;
    if (node.type === "panel") node.blocks.forEach((child, index) => visit(child, [...path, "blocks", index]));
    if (node.type === "list") node.items.forEach((item, i) => item.forEach((child, j) => visit(child, [...path, "items", i, j])));
    if (node.type === "table") {
      if (node.rows.some(row => row.length !== node.headers.length)) {
        ctx.addIssue({ code: "custom", path: [...path, "rows"], message: "Each table row must retain the same number of semantic columns as its headers." });
      }
      node.headers.forEach((cell, i) => cell.forEach((child, j) => visit(child, [...path, "headers", i, j])));
      node.rows.forEach((row, i) => row.forEach((cell, j) => cell.forEach((child, k) => visit(child, [...path, "rows", i, j, k]))));
    }
  };
  value.sections.forEach((section, i) => section.blocks.forEach((node, j) => visit(node, ["sections", i, "blocks", j])));
  if (cards !== 3) ctx.addIssue({ code: "custom", path: ["sections", 4, "blocks"], message: "Retain all three explicitly illustrative action-card examples." });
});
export type PublicSectorNative = z.infer<typeof publicSectorNativeSchema>;
