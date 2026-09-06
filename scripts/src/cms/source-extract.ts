import ts from "typescript";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { websiteRoot } from "./common.js";

type Literal = string | number | boolean | null | Literal[] | { [key: string]: Literal };

function textOfJsx(node: ts.Node): string {
  const parts: string[] = [];
  const visit = (child: ts.Node) => {
    if (ts.isJsxText(child)) parts.push(child.text);
    else if (ts.isJsxExpression(child) && child.expression && ts.isStringLiteral(child.expression)) {
      parts.push(child.expression.text);
    } else child.forEachChild(visit);
  };
  node.forEachChild(visit);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function propertyName(name: ts.PropertyName): string {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  throw new Error(`Unsupported computed property ${name.getText()}.`);
}

function evaluate(node: ts.Expression): Literal {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) {
    return node.operator === ts.SyntaxKind.MinusToken ? -Number(node.operand.text) : Number(node.operand.text);
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((item) => evaluate(item as ts.Expression));
  if (ts.isObjectLiteralExpression(node)) {
    const value: Record<string, Literal> = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) throw new Error(`Unsupported property ${property.getText()}.`);
      value[propertyName(property.name)] = evaluate(property.initializer);
    }
    return value;
  }
  if (ts.isParenthesizedExpression(node)) return evaluate(node.expression);
  if (ts.isJsxElement(node) || ts.isJsxFragment(node) || ts.isJsxSelfClosingElement(node)) {
    return textOfJsx(node);
  }
  if (ts.isElementAccessExpression(node) && node.expression.getText() === "SERVICE_LINE_LABELS") {
    const index = node.argumentExpression && ts.isNumericLiteral(node.argumentExpression)
      ? Number(node.argumentExpression.text)
      : -1;
    const labels = [
      "Agentic Enterprise Transformation",
      "Sovereign AI & Data Foundations",
      "Digital Workforce & Platforms",
    ];
    if (labels[index]) return labels[index];
  }
  throw new Error(`Unsupported source expression: ${node.getText()}`);
}

async function sourceFile(file: string) {
  const contents = await readFile(path.join(websiteRoot, file), "utf8");
  return ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

export async function extractVariable(file: string, variableName: string): Promise<Literal> {
  const parsed = await sourceFile(file);
  let initializer: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variableName) {
      initializer = node.initializer;
    }
    node.forEachChild(visit);
  };
  visit(parsed);
  if (!initializer) throw new Error(`Could not find ${variableName} in ${file}.`);
  return evaluate(initializer);
}

export async function extractArticles(file: string, variableName: string) {
  const parsed = await sourceFile(file);
  let object: ts.ObjectLiteralExpression | undefined;
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === variableName &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) object = node.initializer;
    node.forEachChild(visit);
  };
  visit(parsed);
  if (!object) throw new Error(`Could not find ${variableName} in ${file}.`);
  const articles: Record<string, Record<string, Literal>> = {};
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isObjectLiteralExpression(property.initializer)) continue;
    const article: Record<string, Literal> = {};
    for (const field of property.initializer.properties) {
      if (!ts.isPropertyAssignment(field)) continue;
      if (propertyName(field.name) === "content") {
        const blocks: Literal[] = [];
        const collect = (node: ts.Node) => {
          if (ts.isJsxElement(node)) {
            const tag = node.openingElement.tagName.getText();
            if (tag === "p" || tag === "h3") {
              blocks.push({
                type: tag === "h3" ? "heading" : "paragraph",
                ...(tag === "h3" ? { level: 3 } : {}),
                text: textOfJsx(node),
              });
              return;
            }
          }
          node.forEachChild(collect);
        };
        collect(field.initializer);
        article.body = blocks;
      } else {
        article[propertyName(field.name)] = evaluate(field.initializer);
      }
    }
    articles[propertyName(property.name)] = article;
  }
  return articles;
}