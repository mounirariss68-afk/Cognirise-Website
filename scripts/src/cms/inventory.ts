import path from "node:path";
import { assetRecords, emitJson, InventoryRecord, outputPath, relative, review, source, stableId, websiteRoot } from "./common.js";

const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const destination = args.find((argument) => argument.startsWith("--out="))?.slice(6);

function recordsFromPeople(content: string, file: string, role: "Founder" | "Advisory Board Member") {
  const entries = [...content.matchAll(/name:\s*"([^"]+)"([\s\S]*?)(?=\n\s*\},|\n\];)/g)];
  if (!entries.length) throw new Error(`Could not locate people in ${file}.`);
  return entries.map((match): InventoryRecord => {
    const name = match[1];
    const block = match[0];
    const title = block.match(/title:\s*"([^"]+)"/)?.[1];
    return {
      externalId: stableId("person", path.join(websiteRoot, file), name),
      type: "person", name, sourceFile: file,
      fields: { role, title, bio: block.match(/(?:bio|background):\s*"([^"]+)"/)?.[1], contribution: block.match(/contribution:\s*"([^"]+)"/)?.[1], source: block.match(/source:\s*"([^"]+)"/)?.[1], marketVisibility: ["uae"] },
      review: review([title ? "Confirm role/title and public market visibility." : "Add role/title and confirm public market visibility.", "Confirm source, verification date, review date, approved headshot or approved fallback."]),
    };
  });
}

async function main() {
  const people = recordsFromPeople(await source("src/pages/AboutPeople.tsx"), "src/pages/AboutPeople.tsx", "Founder");
  const advisors = recordsFromPeople(await source("src/pages/Advisors.tsx"), "src/pages/Advisors.tsx", "Advisory Board Member");
  const partnerFile = "src/pages/Partners.tsx";
  const partnersContent = await source(partnerFile);
  const partners = [...partnersContent.matchAll(/category:\s*"([^"]+)",\s*\n\s*name:\s*"([^"]+)",\s*positioning:\s*"([^"]+)"/g)].map((match): InventoryRecord => ({
    externalId: stableId("partner", path.join(websiteRoot, partnerFile), match[2]),
    type: "partner", name: match[2], sourceFile: partnerFile,
    fields: { category: match[1], positioning: match[3], marketVisibility: ["uae"] },
    review: review(["Confirm alliance status, logo rights, source/verification and review dates, claims, website, and market visibility."]),
  }));
  if (partners.length !== 5) throw new Error(`Expected five partners, found ${partners.length}.`);

  const platformFile = "src/pages/PlatformsOverview.tsx";
  const platformContent = await source(platformFile);
  const platforms = [...platformContent.matchAll(/name:\s*"([^"]+)",\s*description:\s*"([^"]+)",\s*link:\s*"([^"]+)"/g)].map((match): InventoryRecord => ({
    externalId: stableId("platform", path.join(websiteRoot, platformFile), match[1]),
    type: "platform", name: match[1], sourceFile: platformFile, route: match[3],
    fields: { summary: match[2], routeSlug: match[3].split("/").at(-1), marketVisibility: ["uae"] },
    review: review(["Confirm template ownership (CogniOS remains code-owned), CTA, SEO, hero media, capabilities, market visibility, and display order."]),
  }));
  if (platforms.length !== 5) throw new Error(`Expected five platforms, found ${platforms.length}.`);

  const articleFile = "src/pages/InsightArticle.tsx";
  const articleContent = await source(articleFile);
  const articles = [...articleContent.matchAll(/"([^"]+)":\s*\{\s*\n\s*topic:\s*"([^"]+)",\s*\n\s*title:\s*"([^"]+)",\s*\n\s*date:\s*"([^"]+)",\s*\n\s*author:\s*"([^"]+)",\s*\n\s*readingTime:\s*"([^"]+)",\s*\n\s*heroImage:\s*"([^"]+)"/g)].map((match): InventoryRecord => ({
    externalId: stableId("article", path.join(websiteRoot, articleFile), match[1]),
    type: "article", name: match[3], sourceFile: articleFile, route: `/insights/${match[1]}`,
    fields: { slug: match[1], topic: match[2], publishedDate: match[4], author: match[5], readingTime: match[6], heroImage: match[7], marketVisibility: ["uae"] },
    review: review(["Confirm author, publication/updated dates, topic taxonomy, source/review date, hero media rights and SEO metadata."]),
  }));
  if (articles.length !== 3) throw new Error(`Expected three articles, found ${articles.length}.`);

  const records = [...people, ...advisors, ...partners, ...platforms, ...articles, ...await assetRecords()];
  const result = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), dryRun: !shouldWrite,
    source: relative(websiteRoot),
    expectedCounts: { people: people.length + advisors.length, advisors: advisors.length, partners: 5, platforms: 5, articles: 3, assets: records.filter((record) => record.type === "asset").length },
    records,
  };
  await emitJson(result, outputPath(destination, "inventory.json"), shouldWrite);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });