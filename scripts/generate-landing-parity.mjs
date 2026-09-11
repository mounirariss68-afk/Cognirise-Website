#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const inventoryPath = path.join(root, "lib/db/landing-page-inventory.json");
const migrationPath = path.join(root, "lib/db/migrations/0019_cms_landing_page_contract.sql");
const contractPath = path.join(root, "lib/api-zod/src/landing-page-slots.generated.ts");
const check = process.argv.includes("--check");
const selectedPage = process.argv.find((argument) => argument.startsWith("--page="))?.slice("--page=".length);

const pages = [
  ["homepage", "/", "Homepage", "Home.tsx", "landing"],
  ["about", "/about", "About", "AboutPeople.tsx", "landing"],
  ["partners", "/partners", "Partners", "Partners.tsx", "landing"],
  ["platforms", "/platforms", "Platforms", "PlatformsOverview.tsx", "landing"],
  ["insights", "/insights", "Insights", "InsightsEditorial.tsx", "landing"],
  ["work", "/work", "Work", "WorkProof.tsx", "landing"],
  ["methodologies", "/methodologies", "Methodologies", "MethodologiesPortfolio.tsx", "methodologies", {
    heroHeadingTestId: "portfolio-title",
    heroBodyTestId: "portfolio-description",
  }],
];
const marketSource = fs.readFileSync(path.join(root, "artifacts/cognirise-website/src/store/market.ts"), "utf8");
const uaeLocation = marketSource.match(/\{\s*id:\s*"uae"[^}]*locationLabel:\s*"([^"]+)"/)?.[1];
if (!uaeLocation) throw new Error("Could not resolve the seeded UAE market location label");

function fail(message, node) {
  const where = node?.getSourceFile
    ? `${path.relative(root, node.getSourceFile().fileName)}:${node.getSourceFile().getLineAndCharacterOfPosition(node.pos).line + 1}`
    : "";
  throw new Error(`${message}${where ? ` (${where})` : ""}`);
}

function propertyName(node) {
  return ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : fail("Unsupported property name", node);
}

function evaluate(node, env, required = true) {
  if (!node) return required ? fail("Missing fallback expression", node) : undefined;
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return evaluate(node.expression, env, required);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isIdentifier(node)) {
    if (Object.hasOwn(env, node.text)) return env[node.text];
    if (!required) return undefined;
    return fail(`Unsupported identifier "${node.text}"`, node);
  }
  if (ts.isTemplateExpression(node)) {
    let result = node.head.text;
    for (const span of node.templateSpans) result += String(evaluate(span.expression, env)) + span.literal.text;
    return result;
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((element) => evaluate(element, env));
  if (ts.isObjectLiteralExpression(node)) {
    const result = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) fail("Unsupported object fallback property", property);
      result[propertyName(property.name)] = evaluate(property.initializer, env);
    }
    return result;
  }
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "toUpperCase") {
    return String(evaluate(node.expression.expression, env)).toUpperCase();
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "assetUrl") {
    return evaluate(node.arguments[0], env);
  }
  if (ts.isPropertyAccessExpression(node)) {
    const object = evaluate(node.expression, env);
    if (object && typeof object === "object" && Object.hasOwn(object, node.name.text)) {
      return object[node.name.text];
    }
    return fail(`Unsupported fallback property "${node.getText()}"`, node);
  }
  if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
    return evaluate(node.right, env);
  }
  if (!required) return undefined;
  return fail(`Unsupported fallback expression: ${node.getText()}`, node);
}

function jsxText(node) {
  let text = "";
  function visit(child) {
    if (ts.isJsxText(child)) text += child.text;
    else if (ts.isJsxElement(child)) child.children.forEach(visit);
    else if (ts.isJsxFragment(child)) child.children.forEach(visit);
    else if (ts.isJsxExpression(child) && child.expression) {
      if (ts.isStringLiteral(child.expression)) text += child.expression.text;
      else if (ts.isBinaryExpression(child.expression) && child.expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
        text += String(evaluate(child.expression.right, {}));
      }
      else fail("Unsupported dynamic JSX hero fallback", child.expression);
    }
  }
  visit(node);
  return text.replace(/\s+/g, " ").trim();
}

function jsxElementByTestId(source, testId) {
  const matches = [];
  function visit(node) {
    if (ts.isJsxElement(node)) {
      const attribute = node.openingElement.attributes.properties.find((property) =>
        ts.isJsxAttribute(property)
          && property.name.text === "data-testid"
          && property.initializer
          && ts.isStringLiteral(property.initializer)
          && property.initializer.text === testId
      );
      if (attribute) matches.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (matches.length !== 1) fail(`Expected exactly one JSX element with data-testid="${testId}"`, source);
  return matches[0];
}

function staticArrays(source, env) {
  const arrays = new Map();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      try {
        arrays.set(node.name.text, evaluate(node.initializer, env));
      } catch {
        // Only helper-bound arrays are required to be static.
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return arrays;
}

function dynamicEnvironments(call, arrays, baseEnv) {
  let child = call;
  for (let parent = call.parent; parent; child = parent, parent = parent.parent) {
    if (!ts.isArrowFunction(parent) && !ts.isFunctionExpression(parent)) continue;
    const mapCall = parent.parent;
    if (!ts.isCallExpression(mapCall) || mapCall.arguments[0] !== parent ||
        !ts.isPropertyAccessExpression(mapCall.expression) || mapCall.expression.name.text !== "map" ||
        !ts.isIdentifier(mapCall.expression.expression)) break;
    const rows = arrays.get(mapCall.expression.expression.text);
    const parameter = parent.parameters[0]?.name;
    if (!rows || !parameter) {
      fail("Helper-bound map data must be static", call);
    }
    if (ts.isIdentifier(parameter)) {
      return rows.map((row) => ({ ...baseEnv, [parameter.text]: row }));
    }
    if (!ts.isArrayBindingPattern(parameter)) {
      fail("Helper-bound map data must use an identifier or tuple binding", call);
    }
    return rows.map((row) => {
      const next = { ...baseEnv };
      parameter.elements.forEach((element, index) => {
        if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) next[element.name.text] = row[index];
      });
      return next;
    });
  }
  return [baseEnv];
}

function extractPage([slug, pagePath, title, filename, template, jsxFallbacks = {}]) {
  const filenameAbsolute = path.join(root, "artifacts/cognirise-website/src/pages", filename);
  const source = ts.createSourceFile(filenameAbsolute, fs.readFileSync(filenameAbsolute, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const baseEnv = { market: "uae", marketLocation: uaeLocation };
  const arrays = staticArrays(source, baseEnv);
  const sections = [];
  const boundIds = new Set();
  let heroHeading;
  let heroBody;
  let seoTitle;
  let seoDescription;

  function add(section, node) {
    if (!section.id || typeof section.id !== "string") fail("Every governed slot requires a static ID", node);
    if (sections.some((item) => item.id === section.id)) fail(`Duplicate governed slot ID "${section.id}"`, node);
    sections.push(section);
  }

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const helper = node.expression.text;
      if (helper === "landingText" || helper === "landingCta" || helper === "landingMedia") {
        for (const env of dynamicEnvironments(node, arrays, baseEnv)) {
          const id = evaluate(node.arguments[1], env);
          boundIds.add(id);
          const fallback = evaluate(node.arguments[2], env);
          if (helper === "landingText") {
            if (typeof fallback !== "string" || !fallback.trim()) fail(`Missing text fallback for "${id}"`, node);
            add({ type: "narrative", id, body: [{ type: "paragraph", text: fallback }] }, node);
          } else if (helper === "landingCta") {
            if (!fallback?.label?.trim() || !fallback?.href?.trim()) fail(`Missing CTA fallback for "${id}"`, node);
            add({ type: "cta", id, label: fallback.label, href: fallback.href, style: fallback.style || "primary" }, node);
          } else {
            if (!fallback?.src?.trim()) fail(`Missing media source fallback for "${id}"`, node);
            if (!fallback?.alt?.trim()) fail(`Editorial media "${id}" requires alt text (use an explicit decorative contract instead)`, node);
            add({ type: "migration-media", id, sourcePath: fallback.src, altText: fallback.alt, ownership: "compiled-landing", resolution: "unresolved" }, node);
          }
        }
      }
      if (helper === "landingNarrative") boundIds.add(evaluate(node.arguments[1], baseEnv));
      if (helper === "useDynamicMetadata" && ts.isObjectLiteralExpression(node.arguments[0])) {
        for (const property of node.arguments[0].properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          if (propertyName(property.name) === "title") seoTitle = evaluate(property.initializer, baseEnv);
          if (propertyName(property.name) === "description") seoDescription = evaluate(property.initializer, baseEnv);
        }
      }
      if (helper === "useDynamicMetadata") {
        function metadataFallback(child) {
          if (ts.isPropertyAssignment(child)) {
            const name = propertyName(child.name);
            if (name === "title" || name === "description") {
              const value = evaluate(child.initializer, baseEnv, false);
              if (typeof value === "string") {
                if (name === "title") seoTitle = value;
                else seoDescription = value;
              }
            }
          }
          ts.forEachChild(child, metadataFallback);
        }
        metadataFallback(node.arguments[0]);
      }
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
      const left = node.left.getText(source);
      if (/(?:governedHero|heroNarrative)\?\.heading/.test(left)) heroHeading = ts.isJsxFragment(node.right) || ts.isJsxElement(node.right) ? jsxText(node.right) : evaluate(node.right, baseEnv);
      if (/(?:governedHero|heroNarrative)\?\.text/.test(left)) heroBody = ts.isJsxFragment(node.right) || ts.isJsxElement(node.right) ? jsxText(node.right) : evaluate(node.right, baseEnv);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);

  if (jsxFallbacks.heroHeadingTestId) {
    heroHeading = jsxText(jsxElementByTestId(source, jsxFallbacks.heroHeadingTestId));
  }
  if (jsxFallbacks.heroBodyTestId) {
    heroBody = jsxText(jsxElementByTestId(source, jsxFallbacks.heroBodyTestId));
  }
  if (slug === "homepage") {
    const html = fs.readFileSync(path.join(root, "artifacts/cognirise-website/index.html"), "utf8");
    seoTitle = html.match(/<title>([^<]+)<\/title>/)?.[1];
    seoDescription = html.match(/<meta\s+name="description"\s+content="([^"]+)"/)?.[1];
    add({ type: "cta", id: "primary-action", label: "Explore our practice", href: "/#service-lines", style: "primary" }, source);
  }
  if (!seoTitle || !seoDescription) {
    const shell = fs.readFileSync(path.join(root, "artifacts/cognirise-website/src/components/layout/Shell.tsx"), "utf8");
    const escaped = pagePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const routeMetadata = shell.match(new RegExp(`"${escaped}"\\s*:\\s*\\{\\s*title:\\s*"([^"]+)",\\s*description:\\s*"([^"]+)"`));
    seoTitle ||= routeMetadata?.[1];
    seoDescription ||= routeMetadata?.[2];
  }
  const routePrefix = slug === "homepage" ? "home" : slug;
  const textForSlot = (id) =>
    sections.find((section) => section.type === "narrative" && section.id === id)
      ?.body?.find((block) => block.type === "paragraph")
      ?.text;
  heroHeading ||= textForSlot(`${routePrefix}-hero-heading`);
  heroBody ||= textForSlot(`${routePrefix}-hero-body`);
  if (!heroHeading?.trim() || !heroBody?.trim()) fail(`Could not resolve hero narrative fallback for ${filename}`);
  if (!seoTitle?.trim() || !seoDescription?.trim()) fail(`Could not resolve SEO fallback for ${filename}`);
  add({ type: "narrative", id: "hero", heading: heroHeading, body: [{ type: "paragraph", text: heroBody }] }, source);
  for (const id of boundIds) {
    if (!sections.some((section) => section.id === id)) fail(`Bound slot "${id}" is absent from generated inventory`, source);
  }
  sections.sort((a, b) => a.id === "hero" ? -1 : b.id === "hero" ? 1 : a.id.localeCompare(b.id));
  sections.forEach((section, order) => section.order = order);
  const primaryCta = sections.find((section) => section.type === "cta");
  const content = {
    schemaVersion: 1,
    pagePath,
    template,
    narrative: heroHeading,
    sections,
    ...(primaryCta ? { cta: { label: primaryCta.label, href: primaryCta.href, style: primaryCta.style } } : {}),
    seo: { title: seoTitle, description: seoDescription },
    legal: {},
    visualReferences: [],
    visibility: "public",
    order: 0,
    sources: [{ label: `Compiled ${title} page`, url: `https://www.cognirise.com${pagePath}` }],
    verificationDate: "2026-09-09",
    reviewDate: "2027-03-09",
    relatedIds: [],
  };
  return {
    slug, path: pagePath, title, sourceKey: `compiled:${pagePath}`,
    snapshot: { slug, title, summary: heroBody, markets: ["uae"], mediaIds: [], content },
  };
}

const selectedDefinitions = selectedPage
  ? pages.filter(([, pagePath]) => pagePath === selectedPage)
  : pages;
if (selectedPage && selectedDefinitions.length !== 1) {
  throw new Error(`Unknown targeted landing page "${selectedPage}"`);
}
const generatedInventory = selectedDefinitions.map(extractPage);
let inventory = generatedInventory;
if (selectedPage) {
  const [generatedPage] = generatedInventory;
  const existingInventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const existingIndex = existingInventory.findIndex((route) => route.path === selectedPage);
  if (existingIndex === -1) existingInventory.push(generatedPage);
  else existingInventory[existingIndex] = generatedPage;
  inventory = existingInventory;
}
const json = `${JSON.stringify(inventory, null, 2)}\n`;
const contract = `// Generated by scripts/generate-landing-parity.mjs. Do not edit by hand.
export const landingPageSlotContract = ${JSON.stringify(Object.fromEntries(
  inventory.map((route) => [
    route.path,
    Object.fromEntries(route.snapshot.content.sections.map((section) => [
      section.id,
      section.type,
    ])),
  ]),
), null, 2)} as const;

export type GovernedLandingPagePath = keyof typeof landingPageSlotContract;
export type GovernedLandingSlotType = "narrative" | "cta" | "legal" | "media" | "migration-media";
`;
const q = (value) => `'${value.replaceAll("'", "''")}'`;
const values = inventory.map((route) =>
  `  (${q(route.sourceKey)}, ${q(route.slug)}, ${q(route.title)}, ${q(route.path)}, ${q(JSON.stringify(route.snapshot))}::jsonb)`
).join(",\n");
const sql = `-- Generated by scripts/generate-landing-parity.mjs. Do not edit by hand.
-- The temporary inventory is the single payload source for every operation.
CREATE TABLE IF NOT EXISTS "cms_landing_page_reconciliation" (
  "document_id" uuid NOT NULL REFERENCES "cms_documents"("id") ON DELETE CASCADE,
  "source_key" text NOT NULL,
  "compiled_digest" text NOT NULL,
  "compiled_payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "compiled_visual_sources" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "reconciled_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("document_id", "source_key")
);
CREATE INDEX IF NOT EXISTS "cms_landing_page_reconciliation_digest_idx"
  ON "cms_landing_page_reconciliation" ("source_key", "compiled_digest");

CREATE TEMP TABLE IF NOT EXISTS cms_generated_landing_inventory (
  source_key text PRIMARY KEY, slug text UNIQUE NOT NULL, title text NOT NULL,
  path text UNIQUE NOT NULL, payload jsonb NOT NULL
) ON COMMIT DROP;
TRUNCATE cms_generated_landing_inventory;
INSERT INTO cms_generated_landing_inventory(source_key, slug, title, path, payload) VALUES
${values};

INSERT INTO cms_documents(kind, canonical_slug, title, status)
SELECT 'landing-page', seed.slug, seed.title, 'active'
FROM cms_generated_landing_inventory seed
WHERE NOT EXISTS (
  SELECT 1 FROM cms_documents document
  WHERE document.kind='landing-page' AND document.canonical_slug=seed.slug
);

INSERT INTO cms_users(email, display_name, role, status, email_verified_at)
VALUES ('cms-reconciliation@system.invalid', 'CMS reconciliation', 'editor', 'active', now())
ON CONFLICT (email) DO NOTHING;

INSERT INTO cms_market_editions(document_id, market, locale, localized_slug, publication_state, fallback_mode, parity_complete)
SELECT document.id, 'uae', 'en', seed.slug, 'draft', 'none', false
FROM cms_generated_landing_inventory seed
JOIN cms_documents document ON document.kind='landing-page' AND document.canonical_slug=seed.slug
WHERE NOT EXISTS (
  SELECT 1 FROM cms_market_editions edition
  WHERE edition.document_id=document.id AND edition.market='uae' AND edition.locale='en'
) AND NOT EXISTS (
  SELECT 1 FROM cms_market_editions edition
  WHERE edition.market='uae' AND edition.locale='en' AND edition.localized_slug=seed.slug
);

INSERT INTO cms_landing_page_reconciliation(
  document_id, source_key, compiled_digest, compiled_payload, compiled_visual_sources
)
SELECT document.id, seed.source_key, md5(seed.payload::text), seed.payload,
  COALESCE((
    SELECT jsonb_agg(section ORDER BY (section->>'order')::integer)
    FROM jsonb_array_elements(seed.payload->'content'->'sections') section
    WHERE section->>'type'='migration-media'
  ), '[]'::jsonb)
FROM cms_generated_landing_inventory seed
JOIN cms_documents document ON document.kind='landing-page' AND document.canonical_slug=seed.slug
ON CONFLICT (document_id, source_key) DO UPDATE SET
  compiled_digest=EXCLUDED.compiled_digest,
  compiled_payload=EXCLUDED.compiled_payload,
  compiled_visual_sources=EXCLUDED.compiled_visual_sources,
  reconciled_at=now();

INSERT INTO cms_revisions(
  edition_id, revision_number, payload_version, payload, content_digest,
  workflow_state, created_by_user_id, reason
)
SELECT edition.id, 1, 1, seed.payload, md5(seed.payload::text), 'draft', author.id,
  'Seed compiled landing parity draft'
FROM cms_generated_landing_inventory seed
JOIN cms_documents document ON document.kind='landing-page' AND document.canonical_slug=seed.slug
JOIN cms_market_editions edition ON edition.document_id=document.id AND edition.market='uae' AND edition.locale='en'
CROSS JOIN cms_users author
WHERE author.email='cms-reconciliation@system.invalid'
  AND NOT EXISTS (SELECT 1 FROM cms_revisions revision WHERE revision.edition_id=edition.id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cms_generated_landing_inventory seed
    JOIN cms_documents document ON document.kind='landing-page' AND document.canonical_slug=seed.slug
    LEFT JOIN cms_market_editions edition ON edition.document_id=document.id AND edition.market='uae' AND edition.locale='en'
    LEFT JOIN cms_landing_page_reconciliation reconciliation
      ON reconciliation.document_id=document.id AND reconciliation.source_key=seed.source_key
    WHERE edition.id IS NULL OR reconciliation.document_id IS NULL
      OR reconciliation.compiled_payload IS DISTINCT FROM seed.payload
      OR jsonb_array_length(seed.payload->'content'->'sections')=0
  ) THEN
    RAISE EXCEPTION 'Generated landing-page parity inventory did not reconcile';
  END IF;
END
$$;
`;

function commitOrCheck(filename, expected) {
  if (check) {
    if (!fs.existsSync(filename) || fs.readFileSync(filename, "utf8") !== expected) {
      console.error(`Landing parity drift: ${path.relative(root, filename)}; run pnpm generate:landing-parity`);
      process.exitCode = 1;
    }
  } else {
    fs.writeFileSync(filename, expected);
  }
}
commitOrCheck(inventoryPath, json);
commitOrCheck(migrationPath, sql);
commitOrCheck(contractPath, contract);
if (!process.exitCode) {
  console.log(inventory.map((route) => `${route.path}: ${route.snapshot.content.sections.length}`).join("\n"));
}