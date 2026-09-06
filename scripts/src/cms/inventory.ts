import path from "node:path";
import { createHash } from "node:crypto";
import {
  assetRecords,
  emitJson,
  type InventoryRecord,
  outputPath,
  relative,
  review,
  stableId,
  websiteRoot,
} from "./common.js";
import { extractArticles, extractVariable } from "./source-extract.js";
import { validateCmsContent } from "@workspace/api-zod";

const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const destination = args.find((argument) => argument.startsWith("--out="))?.slice(6);
const SOURCE_DATE = "2026-09-06";

type SourceObject = Record<string, any>;

function source(file: string, label = "Compiled Cognirise public website") {
  return [{ label: `${label} (${file})`, accessedAt: SOURCE_DATE }];
}

function personRecords(items: SourceObject[], file: string, role: "founder" | "advisor") {
  return items.map((item, order): InventoryRecord => {
    const content = {
      schemaVersion: 1,
      role,
      title: role === "founder" ? "Founding Partner" : String(item.title),
      biography: String(item.bio ?? item.background ?? ""),
      contribution: item.contribution ? String(item.contribution) : undefined,
      focusAreas: Array.isArray(item.focus)
        ? item.focus.map(([title, detail]: string[]) => ({ title, detail }))
        : [],
      profileLinks: [],
      visibility: "public",
      order,
      sources: item.source ? [{ label: String(item.source), accessedAt: SOURCE_DATE }] : source(file),
      relatedIds: [],
    };
    const validation = validateCmsContent("person", content, "draft");
    if (!validation.success) throw new Error(`${item.name}: ${validation.errors.join("; ")}`);
    return {
      externalId: stableId("person", path.join(websiteRoot, file), String(item.name)),
      type: "person",
      name: String(item.name),
      sourceFile: file,
      route: role === "founder" ? "/about" : "/advisors",
      fields: {
        slug: String(item.name).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        summary: String(item.bio ?? item.background ?? ""),
        content,
        mediaPaths: [],
      },
      review: review([
        "Confirm title, profile source, verification date, review date, market visibility, and approved identity media or fallback.",
      ]),
    };
  });
}

function partnerRecords(items: SourceObject[], file: string) {
  return items.map((item, order): InventoryRecord => {
    const evidenceSource = { label: String(item.source), accessedAt: SOURCE_DATE };
    const content = {
      schemaVersion: 1,
      allianceCategory: String(item.category),
      positioning: String(item.positioning),
      facts: (item.facts as string[][]).map(([value, label]) => ({ value, label })),
      evidence: [{ statement: String(item.evidence), source: evidenceSource, approved: false }],
      coverage: item.coverage as string[],
      contribution: String(item.contribution),
      relationshipStatus: "active",
      visibility: "public",
      order,
      sources: [evidenceSource],
      relatedIds: [],
    };
    const validation = validateCmsContent("partner", content, "draft");
    if (!validation.success) throw new Error(`${item.name}: ${validation.errors.join("; ")}`);
    return {
      externalId: stableId("partner", path.join(websiteRoot, file), String(item.name)),
      type: "partner",
      name: String(item.name),
      sourceFile: file,
      route: "/partners",
      fields: {
        slug: String(item.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        summary: String(item.positioning),
        content,
        mediaPaths: [],
      },
      review: review([
        "Confirm alliance status, website, logo rights, claim approval, verification date, and review date before publication.",
      ]),
    };
  });
}

function platformRecords(items: SourceObject[], file: string) {
  return items.map((item, order): InventoryRecord => {
    const slug = String(item.link).split("/").at(-1)!;
    const content = {
      schemaVersion: 1,
      category: String(item.category),
      summary: String(item.description),
      template: slug === "cognios" ? "cognios-specialist" : "standard",
      sections: [],
      capabilities: [],
      differentiators: [],
      visibility: "public",
      order,
      sources: source(file),
      relatedIds: [],
    };
    const validation = validateCmsContent("platform", content, "draft");
    if (!validation.success) throw new Error(`${item.name}: ${validation.errors.join("; ")}`);
    return {
      externalId: stableId("platform", path.join(websiteRoot, file), String(item.name)),
      type: "platform",
      name: String(item.name),
      sourceFile: file,
      route: String(item.link),
      fields: {
        slug,
        summary: String(item.description),
        content,
        mediaPaths: slug === "cognios" ? ["/images/cognirise/site-cognios.jpg"] : [],
      },
      review: review([
        "Confirm CTA, SEO, media rights, verification date, review date, and whether a standard detail is editorially ready.",
      ]),
    };
  });
}

function isoDate(value: string) {
  const parsed = new Date(`${value} UTC`);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`Invalid publication date ${value}.`);
  return parsed.toISOString().slice(0, 10);
}

function articleRecords(items: Record<string, SourceObject>, file: string) {
  return Object.entries(items).map(([slug, item], order): InventoryRecord => {
    const body = item.body as Array<{ type: string; text: string; level?: number }>;
    const teaser = body.find((block) => block.type === "paragraph")?.text;
    const content = {
      schemaVersion: 1,
      variant: "article",
      teaser,
      body,
      author: String(item.author),
      publicationDate: isoDate(String(item.date)),
      readingTimeMinutes: Number.parseInt(String(item.readingTime), 10),
      topics: [String(item.topic)],
      sectors: [],
      platformIds: [],
      social: {},
      visibility: "public",
      order,
      sources: source(file),
      relatedIds: [],
    };
    const validation = validateCmsContent("publication", content, "draft");
    if (!validation.success) throw new Error(`${item.title}: ${validation.errors.join("; ")}`);
    return {
      externalId: stableId("article", path.join(websiteRoot, file), slug),
      type: "article",
      name: String(item.title),
      sourceFile: file,
      route: `/insights/${slug}`,
      fields: {
        slug,
        summary: teaser,
        content,
        mediaPaths: [String(item.heroImage)],
      },
      review: review([
        "Confirm author, publication date, source, verification date, review date, hero rights, SEO, and social metadata.",
      ]),
    };
  });
}

function industryRecords(items: SourceObject[], file: string) {
  return items.map((item): InventoryRecord => {
    const { slug, ...content } = item;
    const validation = validateCmsContent("industry", content, "draft");
    if (!validation.success) throw new Error(`${item.name}: ${validation.errors.join("; ")}`);
    return {
      externalId: stableId("industry", path.join(websiteRoot, file), String(slug)),
      type: "industry",
      name: String(item.name),
      sourceFile: file,
      route: `/industries/${slug}`,
      fields: {
        slug: String(slug),
        summary: String(item.dek),
        content,
        mediaPaths: [String(item.image)],
      },
      review: review([
        "Confirm hero-media rights, alt text, verification date, review date, source classifications, and source URLs before publication.",
      ]),
    };
  });
}

async function main() {
  const peopleFile = "src/pages/AboutPeople.tsx";
  const advisorsFile = "src/pages/Advisors.tsx";
  const partnerFile = "src/pages/Partners.tsx";
  const platformFile = "src/pages/PlatformsOverview.tsx";
  const articleFile = "src/pages/InsightArticle.tsx";
  const industryFile = "src/content/industries.ts";
  const people = personRecords(await extractVariable(peopleFile, "foundersFallback") as SourceObject[], peopleFile, "founder");
  const advisors = personRecords(await extractVariable(advisorsFile, "advisorsFallback") as SourceObject[], advisorsFile, "advisor");
  const partners = partnerRecords(await extractVariable(partnerFile, "partnersFallback") as SourceObject[], partnerFile);
  const platforms = platformRecords(await extractVariable(platformFile, "platformFallback") as SourceObject[], platformFile);
  const articles = articleRecords(await extractArticles(articleFile, "articles"), articleFile);
  const industries = industryRecords(await extractVariable(industryFile, "INDUSTRIES") as SourceObject[], industryFile);
  const assets = await assetRecords();
  const records = [...people, ...advisors, ...partners, ...platforms, ...articles, ...industries, ...assets];

  if (people.length !== 2 || advisors.length !== 3 || partners.length !== 5 || platforms.length !== 5 || articles.length !== 3 || industries.length !== 5) {
    throw new Error("The public website no longer matches the governed 2 founder / 3 advisor / 5 partner / 5 platform / 3 article / 5 industry manifest.");
  }
  if (assets.length !== 25) throw new Error(`Expected 25 governed website assets, found ${assets.length}.`);

  const stable = {
    schemaVersion: 2,
    source: relative(websiteRoot),
    expectedCounts: { people: 5, founders: 2, advisors: 3, partners: 5, platforms: 5, articles: 3, industries: 5, assets: 25 },
    explicitOmissions: {
      caseStudies: "No genuine public case-study records are present in the current website.",
      povDocuments: "No genuine public POV documents are present in the current website.",
      employees: "No additional public employee profiles are present in the current website.",
      nonUaeEditions: "No approved non-UAE editions or translations are present.",
      codeOwnedAsset: "blueprint-annotated.png remains code-owned with the specialist CogniOS experience.",
    },
    records,
  };
  const manifestDigest = createHash("sha256").update(JSON.stringify(stable)).digest("hex");
  await emitJson(
    { ...stable, manifestDigest, generatedAt: new Date().toISOString(), dryRun: !shouldWrite },
    outputPath(destination, "inventory.json"),
    shouldWrite,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});