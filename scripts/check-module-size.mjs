import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const file = "module/db-assistant.min.js";
const gzipBytes = gzipSync(await readFile(file), { level: 9 }).byteLength;
const gzipKB = gzipBytes / 1024;
console.log(`${file}: ${gzipKB.toFixed(2)} KB gzipped (${gzipBytes} bytes)`);
if (gzipBytes >= 500 * 1024) {
  console.error("Size limit exceeded: expected less than 500 KB gzipped.");
  process.exitCode = 1;
}
