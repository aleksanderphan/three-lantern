// Usage: npm run optimize
// Shrinks the lantern photos (full + thumbnail) and the tree diorama textures.
// Originals are left untouched; outputs go next to them with new names.
import sharp from "sharp";
import { readdir, mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const pub = path.resolve("public");

async function images() {
  const dir = path.join(pub, "images");
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
  const dataPath = path.join(pub, "data.json");
  const data = JSON.parse(await readFile(dataPath, "utf8"));
  for (const d of data) {
    const name = path.parse(d.image).name;
    d.image = `images/${name}.webp`;
    d.thumb = `images/thumbs/${name}.webp`;
  }
  await writeFile(dataPath, JSON.stringify(data, null, 2) + "\n");
  console.log(`images: ${files.length} converted, data.json updated`);
}

async function treeTextures() {
  const dir = path.join(pub, "models", "Sakura Tree Diorama");
  const out = path.join(dir, "opt");
  await mkdir(out, { recursive: true });
  const files = (await readdir(dir)).filter((f) => f.endsWith(".png"));
  for (const f of files) {
    const isColor = /BaseColor|Emissive/.test(f);
    const size = /Metallic/.test(f) ? 256 : 1024;
    const name = path.parse(path.parse(f).name).name; // strip .tga
    await sharp(path.join(dir, f), { failOn: "none" }).resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: isColor ? 82 : 88 }).toFile(path.join(out, `${name}.webp`));
  }
  console.log(`tree: ${files.length} textures converted`);
}

await images();
await treeTextures();
