// Usage: npm run optimize
// Shrinks the lantern photos (full + thumbnail) for the default content (public/)
// and for every site in public/sites/<uuid>/, and updates each data.json.
// Originals are left untouched; outputs go next to them with new names.
import sharp from "sharp";
import { readdir, mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const pub = path.resolve("public");

// Paths starting with "/" or a scheme point outside the content folder (e.g. shared
// default photos); leave those alone.
const isExternal = (p) => /^(\/|[a-z]+:)/i.test(p ?? "");

async function images(root) {
  const dir = path.join(root, "images");
  const dataPath = path.join(root, "data.json");
  await mkdir(path.join(dir, "thumbs"), { recursive: true });
  const files = (await readdir(dir)).filter((f) => /\.jpe?g$/i.test(f));
  for (const f of files) {
    const name = path.parse(f).name;
    const src = path.join(dir, f);
    // popup image
    await sharp(src, { failOn: "none" }).resize({ width: 1024, withoutEnlargement: true })
      .webp({ quality: 78 }).toFile(path.join(dir, `${name}.webp`));
    // banner texture: power-of-two-ish, small, cheap on the GPU
    await sharp(src, { failOn: "none" }).resize({ width: 384, height: 512, fit: "cover" })
      .webp({ quality: 75 }).toFile(path.join(dir, "thumbs", `${name}.webp`));
  }

  const raw = existsSync(dataPath) ? JSON.parse(await readFile(dataPath, "utf8")) : [];
  const data = Array.isArray(raw) ? raw : (raw.lanterns ??= []);
  const known = new Set();
  for (const d of data) {
    if (!d.image || isExternal(d.image)) continue;
    const name = path.parse(d.image).name;
    d.image = `images/${name}.webp`;
    d.thumb = `images/thumbs/${name}.webp`;
    known.add(name);
  }
  // New photos get an entry with the file name as a caption to edit
  let nextId = Math.max(0, ...data.map((d) => d.id ?? 0)) + 1;
  for (const f of files) {
    const name = path.parse(f).name;
    if (known.has(name)) continue;
    data.push({ id: nextId++, image: `images/${name}.webp`, thumb: `images/thumbs/${name}.webp`, text: name });
  }
  await writeFile(dataPath, JSON.stringify(raw, null, 2) + "\n");
  console.log(`${path.relative(pub, root) || "default"}: ${files.length} photos converted, data.json updated`);
}

await images(pub);
const sitesDir = path.join(pub, "sites");
if (existsSync(sitesDir)) {
  for (const entry of await readdir(sitesDir, { withFileTypes: true })) {
    if (entry.isDirectory()) await images(path.join(sitesDir, entry.name));
  }
}
