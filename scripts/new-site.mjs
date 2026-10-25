// Usage: npm run new-site -- "Optional title"
// Creates public/sites/<uuid>/ with an empty images/ folder and a data.json.
// Drop JPEGs into images/, run `npm run optimize`, then edit the captions.
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const id = randomUUID();
const root = path.resolve("public", "sites", id);
await mkdir(path.join(root, "images"), { recursive: true });
const data = { title: process.argv[2] ?? "Three Lantern", lanterns: [] };
await writeFile(path.join(root, "data.json"), JSON.stringify(data, null, 2) + "\n");

console.log(`Created public/sites/${id}/`);
console.log(`  subdomain: https://${id}.<your-domain>`);
console.log(`  local:     http://localhost:5173/?site=${id}`);
