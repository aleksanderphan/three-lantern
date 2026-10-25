// Usage: npm run migrate [-- <site-uuid> | default]
// Copies the default content (public/) and public/sites/<uuid>/ (data.json + photos) into Supabase: photos go to the storage
// bucket under <uuid>/, and the site + lanterns rows are replaced. Re-running is safe.
// Needs SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local (never ship the secret key to the browser).
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const URL_ = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SECRET_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || "photos";
if (!URL_ || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const headers = { apikey: KEY }; // secret keys aren't JWTs, so no Bearer header

async function check(res, what) {
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status} ${await res.text()}`);
  return res;
}

const MIME = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

async function upload(file, objectPath) {
  await check(
    await fetch(`${URL_}/storage/v1/object/${BUCKET}/${objectPath}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream", "x-upsert": "true" },
      body: await readFile(file),
    }),
    `upload ${objectPath}`,
  );
}

// The default content (public/data.json, shown on the bare domain) is stored as this reserved site.
const DEFAULT_ID = "00000000-0000-0000-0000-000000000000";

async function migrate(id) {
  const dir = id === DEFAULT_ID ? path.resolve("public") : path.resolve("public", "sites", id);
  if (!existsSync(path.join(dir, "data.json"))) return console.log(`${id}: no data.json (run npm run optimize first), skipped`);
  const data = JSON.parse(await readFile(path.join(dir, "data.json"), "utf8"));
  const list = Array.isArray(data) ? data : data.lanterns;
  if (!list?.length) return console.log(`${id}: no lanterns, skipped`);

  // Site-relative photos are uploaded; "/shared" paths and full URLs are stored as they are.
  const put = async (p) => {
    if (!p || p.startsWith("/") || /^https?:/.test(p)) return p;
    const objectPath = `${id}/${p.replace(/^\.?\//, "")}`;
    await upload(path.join(dir, p), objectPath);
    return objectPath;
  };

  const isLocal = (p) => p && !p.startsWith("/") && !/^https?:/.test(p);
  const rows = [];
  let skipped = 0;
  for (const d of list) {
    if (rows.length >= 10) { // keep in step with MAX_LANTERNS in src/site.js and the DB trigger
      skipped++;
      continue;
    }
    // Placeholder entries pointing at files that don't exist would only show as broken lanterns
    if ([d.image, d.thumb].some((p) => isLocal(p) && !existsSync(path.join(dir, p)))) {
      skipped++;
      continue;
    }
    rows.push({ site_id: id, image: await put(d.image), thumb: await put(d.thumb), text: d.text ?? "", sort: rows.length });
    process.stdout.write(`\r${id}: ${rows.length} photos`);
  }
  console.log(skipped ? `\n${id}: skipped ${skipped} entries with missing files` : "");
  if (!rows.length) return console.log(`${id}: nothing to migrate`);

  const json = { ...headers, "Content-Type": "application/json" };
  await check(
    await fetch(`${URL_}/rest/v1/sites?on_conflict=id`, {
      method: "POST",
      headers: { ...json, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id, title: Array.isArray(data) ? null : data.title ?? null }),
    }),
    "upsert site",
  );
  await check(await fetch(`${URL_}/rest/v1/lanterns?site_id=eq.${id}`, { method: "DELETE", headers: json }), "clear lanterns");
  await check(await fetch(`${URL_}/rest/v1/lanterns`, { method: "POST", headers: json, body: JSON.stringify(rows) }), "insert lanterns");
  console.log(`${id}: migrated ${rows.length} lanterns`);
}

// No argument: the default content plus every site folder. "default" or a uuid: just that one.
const arg = process.argv[2];
const ids = arg
  ? [arg === "default" ? DEFAULT_ID : arg]
  : [DEFAULT_ID, ...(await readdir("public/sites", { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)];
for (const id of ids) await migrate(id);
