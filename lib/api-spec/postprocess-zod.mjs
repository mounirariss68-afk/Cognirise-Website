import { readFile, writeFile } from "node:fs/promises";

/**
 * Orval 8 currently emits Zod 4 convenience APIs although this workspace
 * intentionally pins Zod 3. Keep these compatibility fixes coupled to
 * codegen rather than hand-editing generated output.
 */
const apiPath = new URL("../api-zod/src/generated/api.ts", import.meta.url);
const typeIndexPath = new URL("../api-zod/src/generated/types/index.ts", import.meta.url);

const api = await readFile(apiPath, "utf8");
await writeFile(
  apiPath,
  api
    .replaceAll("zod.uuid()", "zod.string().uuid()")
    .replace(/zod(\s*\n\s*)\.uuid\(\)/g, "zod$1.string().uuid()")
    .replaceAll("zod.int()", "zod.number().int()")
    .replace(/zod(\s*\n\s*)\.int\(\)/g, "zod$1.number().int()")
    .replaceAll("zod.iso.datetime({ offset: true })", "zod.string().datetime({ offset: true })"),
);

// Orval emits parameter Zod schemas and parameter TypeScript interfaces with
// identical names. Do not re-export the redundant interfaces from the types
// barrel; the generated schemas remain the public parameter contract.
const types = await readFile(typeIndexPath, "utf8");
await writeFile(
  typeIndexPath,
  types.split("\n").filter((line) => !/Params";$/.test(line)).join("\n"),
);