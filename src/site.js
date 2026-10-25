// Picks which lantern content to show. Each site is a row in Supabase (sites + lanterns tables)
// or, as a fallback, a folder public/sites/<uuid>/ (data.json + images/), and is selected by the first subdomain label,
// <uuid>.example.com, or by ?site=<uuid> where wildcard subdomains aren't
// available (*.vercel.app previews). Anything else gets the default public/data.json.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function siteId(location = window.location) {
  const param = new URLSearchParams(location.search).get("site");
  const label = location.hostname.split(".")[0];
  const id = [param, label].find((v) => v && UUID.test(v));
  return id ? id.toLowerCase() : null;
}

// data.json is either the plain array of lanterns or { title, lanterns: [...] }.
// Photo paths are relative to the data.json they came from, so a site folder is self-contained.
async function fetchContent(path) {
  const url = new URL(path, window.location.origin);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url.pathname}: HTTP ${res.status}`);
  const data = await res.json(); // throws on the dev server's index.html fallback for missing files
  const list = Array.isArray(data) ? data : data.lanterns;
  if (!list?.length) throw new Error(`${url.pathname}: no lanterns`);
  const resolve = (p) => (p ? new URL(p, url).href : p);
  return {
    title: Array.isArray(data) ? null : data.title,
    lanterns: list.map((d) => ({ ...d, image: resolve(d.image), thumb: resolve(d.thumb) })),
  };
}

// Supabase is optional: without these env vars the static files below are used.
// Plain fetch against the REST API (publishable key + RLS read policy) keeps supabase-js out of the bundle.
const SB_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const SB_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SB_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "photos";

async function sbSelect(table, query) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SB_KEY }, // publishable keys aren't JWTs, so no Bearer header
  });
  if (!res.ok) throw new Error(`supabase ${table}: HTTP ${res.status}`);
  return res.json();
}

// image/thumb are either full URLs, /shared paths, or object paths inside the storage bucket
function storageUrl(p) {
  if (!p || /^(https?:)?\/\//.test(p) || p.startsWith("/")) return p;
  return `${SB_URL}/storage/v1/object/public/${SB_BUCKET}/${p}`;
}

async function fetchSupabase(id) {
  const [sites, rows] = await Promise.all([
    sbSelect("sites", `id=eq.${id}&select=title`),
    sbSelect("lanterns", `site_id=eq.${id}&select=id,image,thumb,text&order=sort.asc,id.asc`),
  ]);
  if (!sites.length || !rows.length) throw new Error(`supabase: no content for ${id}`);
  return {
    title: sites[0].title,
    lanterns: rows.map((d) => ({ ...d, image: storageUrl(d.image), thumb: storageUrl(d.thumb) })),
  };
}

// Hard cap on photos (and so lanterns) per site; also enforced by the dashboard and a DB trigger.
export const MAX_LANTERNS = 10;

// The bare domain shows this reserved site (migrated from public/data.json, editable in the dashboard).
export const DEFAULT_ID = "00000000-0000-0000-0000-000000000000";

export async function loadSiteContent() {
  const id = siteId();
  if (SB_URL && SB_KEY) {
    try {
      return { id, ...(await fetchSupabase(id ?? DEFAULT_ID)) };
    } catch (err) {
      console.warn(`Supabase has no content for ${id ?? "the default"}, trying static files.`, err);
    }
  }
  if (id) {
    try {
      return { id, ...(await fetchContent(`/sites/${id}/data.json`)) };
    } catch (err) {
      console.warn(`Site ${id} not found, showing the default lanterns.`, err);
    }
  }
  return { id: null, ...(await fetchContent("/data.json")) };
}
