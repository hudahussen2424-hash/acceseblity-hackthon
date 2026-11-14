import { readFile, writeFile } from "node:fs/promises";
import { minify } from "terser";

const search = await readFile("module/search.js", "utf8");
const component = await readFile("module/db-assistant.js", "utf8");
const bundledSearch = search
  .replace(/^export\s+default\s+search;\s*$/m, "")
  .replace(/^export\s+/gm, "");
const result = await minify(`${bundledSearch}\n${component}`, {
  compress: true,
  mangle: true,
  format: { comments: false }
});
if (!result.code) throw new Error("Terser did not produce the assistant bundle.");
await writeFile("module/db-assistant.min.js", result.code, "utf8");
console.log("Built module/db-assistant.min.js (search is bundled in the same file).");
