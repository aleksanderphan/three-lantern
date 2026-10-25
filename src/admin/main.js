// Admin dashboard: manage sites (one per <uuid> subdomain) and their lantern photos.
// Talks to Supabase directly; writes are allowed for signed-in users by the RLS policies in
// supabase/schema.sql, so the secret key never reaches the browser.
import { createClient } from "@supabase/supabase-js";
import { makeVariants } from "./images.js";
import { DEFAULT_ID } from "../site.js";

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "photos";

const app = document.getElementById("app");

// The dashboard lives on its own subdomain (admin.<domain>). Anywhere else (the public site,
// <uuid>.<domain>, *.vercel.app) it refuses to start; vercel.json also redirects /admin.html away.
// `npm run dev` on localhost is allowed so it can be built and tested.
const onAdminHost = location.hostname.split(".")[0] === "admin" || (import.meta.env.DEV && /^(localhost|127\.0\.0\.1)$/.test(location.hostname));
if (!onAdminHost) {
  location.replace("/");
  throw new Error("Admin dashboard is only available on the admin subdomain");
}

const who = document.getElementById("who");
const logoutBtn = document.getElementById("logout");
const toastEl = document.getElementById("toast");

// Tiny DOM builder; text goes through textContent so captions can't inject markup.
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter((k) => k != null && k !== false));
  return el;
}

let toastTimer;
function toast(msg, isErr = false) {
  toastEl.textContent = msg;
  toastEl.className = `show${isErr ? " err" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.className = ""), isErr ? 5000 : 2200);
}

// Runs a Supabase call and throws its error so callers can use try/catch uniformly.
async function ok(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

async function guard(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    toast(err.message || String(err), true);
  }
}

if (!SB_URL || !SB_KEY) {
  app.append(h("p", {}, "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local (see .env.example) and restart."));
  throw new Error("Supabase env vars missing");
}

const sb = createClient(SB_URL, SB_KEY);
const bucket = sb.storage.from(BUCKET);

// image/thumb are storage object paths, /shared paths, or full URLs (same rule as src/site.js)
const isStored = (p) => p && !/^(https?:)?\/\//.test(p) && !p.startsWith("/");
const photoUrl = (p) => (isStored(p) ? bucket.getPublicUrl(p).data.publicUrl : p);

// ---------- login ----------
function renderLogin() {
  who.textContent = "";
  logoutBtn.hidden = true;
  const email = h("input", { type: "email", placeholder: "Email", required: true, autocomplete: "username" });
  const pass = h("input", { type: "password", placeholder: "Password", required: true, autocomplete: "current-password" });
  const form = h(
    "form",
    {
      className: "login",
      onsubmit: (e) => {
        e.preventDefault();
        guard(async () => {
          await ok(sb.auth.signInWithPassword({ email: email.value, password: pass.value }));
        });
      },
    },
    h("h2", {}, "Sign in"),
    email,
    pass,
    h("button", { className: "primary", type: "submit" }, "Sign in"),
  );
  app.replaceChildren(form);
}

// ---------- sites list ----------
async function renderSites() {
  app.replaceChildren(h("p", { className: "muted" }, "Loading…"));
  const sites = await ok(sb.from("sites").select("id,title,lanterns(count)").order("title", { nullsFirst: false }));

  const title = h("input", { type: "text", placeholder: "New site title", className: "grow" });
  const create = async () =>
    guard(async () => {
      const [row] = await ok(sb.from("sites").insert({ title: title.value.trim() || null }).select("id"));
      location.hash = `#/${row.id}`;
    });
  title.addEventListener("keydown", (e) => e.key === "Enter" && create());

  // The default (fallback) site is pinned first; it's what the bare domain and unknown subdomains show.
  sites.sort((a, b) => (b.id === DEFAULT_ID) - (a.id === DEFAULT_ID));
  const hasDefault = sites.some((s) => s.id === DEFAULT_ID);
  const createDefault = h("button", {
    className: "primary",
    onclick: () => guard(async () => {
      await ok(sb.from("sites").insert({ id: DEFAULT_ID, title: "Default" }));
      location.hash = `#/${DEFAULT_ID}`;
    }),
  }, "Create default site");

  const rows = sites.map((s) =>
    h(
      "div",
      { className: "site", style: s.id === DEFAULT_ID ? "border-color: var(--accent)" : "" },
      h("div", { className: "grow" },
        h("a", { className: "name", href: `#/${s.id}` }, s.title || "(untitled)"),
        s.id === DEFAULT_ID && h("span", { className: "muted" }, " · Default / fallback: shown on the bare domain and for unknown sites"),
        h("div", { className: "muted mono" }, s.id),
      ),
      h("span", { className: "muted" }, `${s.lanterns[0]?.count ?? 0} photos`),
      h("a", { className: "btn", href: `/?site=${s.id}`, target: "_blank", rel: "noopener" }, "View"),
      h("a", { className: "btn", href: `#/${s.id}` }, "Edit"),
    ),
  );

  app.replaceChildren(
    h("h2", {}, "Sites"),
    h("p", { className: "muted" }, "Each site is served at https://<uuid>.<your-domain> (or /?site=<uuid> on hosts without wildcard subdomains)."),
    h("div", { className: "row" }, title, h("button", { className: "primary", onclick: create }, "New site")),
    !hasDefault && h("div", { className: "row", style: "margin-top:12px" }, h("span", { className: "muted" }, "No default site yet."), createDefault),
    h("div", { className: "list" }, rows.length ? rows : h("p", { className: "muted" }, "No sites yet.")),
  );
}

// ---------- one site ----------
async function renderSite(id) {
  app.replaceChildren(h("p", { className: "muted" }, "Loading…"));
  const [site] = await ok(sb.from("sites").select("id,title").eq("id", id));
  if (!site) {
    app.replaceChildren(h("p", {}, "Site not found. "), h("a", { href: "#/" }, "Back"));
    return;
  }
  let lanterns = await ok(sb.from("lanterns").select("id,image,thumb,text,sort").eq("site_id", id).order("sort").order("id"));

  const reload = async () => {
    lanterns = await ok(sb.from("lanterns").select("id,image,thumb,text,sort").eq("site_id", id).order("sort").order("id"));
    drawGrid();
  };

  // Title
  const titleInput = h("input", { type: "text", value: site.title ?? "", placeholder: "Page title", className: "grow" });
  const saveTitle = h("button", {
    onclick: () => guard(async () => {
      await ok(sb.from("sites").update({ title: titleInput.value.trim() || null }).eq("id", id));
      toast("Title saved");
    }),
  }, "Save title");

  const del = h("button", {
    className: "danger",
    hidden: id === DEFAULT_ID, // the bare domain always needs its content
    onclick: () => guard(async () => {
      if (!confirm(`Delete this site and its ${lanterns.length} photos? This can't be undone.`)) return;
      await removeObjects(lanterns.flatMap((l) => [l.image, l.thumb]));
      await ok(sb.from("sites").delete().eq("id", id)); // lanterns cascade
      toast("Site deleted");
      location.hash = "#/";
    }),
  }, "Delete site");

  // Upload
  const fileInput = h("input", { type: "file", accept: "image/*", multiple: true, hidden: true, onchange: () => addFiles([...fileInput.files]) });
  const drop = h("div", { className: "drop" }, "Drop photos here or ", h("button", { onclick: () => fileInput.click() }, "choose files"));
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    addFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith("image/")));
  });

  // Uploads a resized pair and returns the object paths. Random names mean a replaced photo
  // never collides with the service worker's 30-day cache of the old one.
  async function uploadPair(file) {
    const { image, thumb } = await makeVariants(file);
    const name = crypto.randomUUID();
    const paths = { image: `${id}/${name}.webp`, thumb: `${id}/thumbs/${name}.webp` };
    const opts = { contentType: "image/webp", cacheControl: "31536000" };
    await ok(bucket.upload(paths.image, image, opts));
    await ok(bucket.upload(paths.thumb, thumb, opts));
    return paths;
  }

  async function addFiles(files) {
    if (!files.length) return;
    await guard(async () => {
      let next = Math.max(-1, ...lanterns.map((l) => l.sort)) + 1;
      for (const [i, file] of files.entries()) {
        drop.textContent = `Uploading ${i + 1}/${files.length}…`;
        const paths = await uploadPair(file);
        await ok(sb.from("lanterns").insert({
          site_id: id,
          ...paths,
          text: file.name.replace(/\.[^.]+$/, ""),
          sort: next++,
        }));
      }
      toast(`${files.length} photo${files.length > 1 ? "s" : ""} added`);
    });
    drop.replaceChildren("Drop photos here or ", h("button", { onclick: () => fileInput.click() }, "choose files"));
    fileInput.value = "";
    await reload();
  }

  async function removeObjects(paths) {
    const stored = paths.filter(isStored);
    if (stored.length) await ok(bucket.remove(stored));
  }

  async function move(index, delta) {
    const j = index + delta;
    if (j < 0 || j >= lanterns.length) return;
    [lanterns[index], lanterns[j]] = [lanterns[j], lanterns[index]];
    // Renumber so duplicate/gappy sort values can't leave the order ambiguous
    await guard(async () => {
      await Promise.all(
        lanterns.map((l, n) => (l.sort === n ? null : sb.from("lanterns").update({ sort: n }).eq("id", l.id).then(({ error }) => { if (error) throw error; }))),
      );
    });
    await reload();
  }

  const grid = h("div", { className: "grid" });
  function drawGrid() {
    grid.replaceChildren(
      ...lanterns.map((l, i) => {
        const caption = h("textarea", { value: l.text ?? "", placeholder: "Caption" });
        caption.addEventListener("change", () =>
          guard(async () => {
            await ok(sb.from("lanterns").update({ text: caption.value }).eq("id", l.id));
            toast("Caption saved");
          }),
        );
        const replaceInput = h("input", {
          type: "file", accept: "image/*", hidden: true,
          onchange: () => guard(async () => {
            const file = replaceInput.files[0];
            if (!file) return;
            const paths = await uploadPair(file);
            await ok(sb.from("lanterns").update(paths).eq("id", l.id));
            await removeObjects([l.image, l.thumb]);
            toast("Photo replaced");
            await reload();
          }),
        });
        return h(
          "div",
          { className: "card" },
          h("img", { src: photoUrl(l.thumb || l.image), alt: "", loading: "lazy" }),
          caption,
          h("div", { className: "row" },
            h("button", { title: "Move earlier", disabled: i === 0, onclick: () => move(i, -1) }, "↑"),
            h("button", { title: "Move later", disabled: i === lanterns.length - 1, onclick: () => move(i, 1) }, "↓"),
            h("button", { onclick: () => replaceInput.click() }, "Replace"),
            replaceInput,
            h("button", {
              className: "danger",
              onclick: () => guard(async () => {
                if (!confirm("Delete this photo?")) return;
                await ok(sb.from("lanterns").delete().eq("id", l.id));
                await removeObjects([l.image, l.thumb]);
                toast("Photo deleted");
                await reload();
              }),
            }, "Delete"),
          ),
        );
      }),
    );
    if (!lanterns.length) grid.replaceChildren(h("p", { className: "muted" }, "No photos yet. The site falls back to the default lanterns until it has some."));
  }
  drawGrid();

  app.replaceChildren(
    h("p", {}, h("a", { href: "#/" }, "← All sites")),
    h("h2", {}, site.title || "(untitled)"),
    h("div", { className: "row" },
      h("span", { className: "muted mono" }, id),
      h("button", { onclick: () => navigator.clipboard.writeText(id).then(() => toast("UUID copied")) }, "Copy UUID"),
      h("a", { className: "btn", href: `/?site=${id}`, target: "_blank", rel: "noopener" }, "View site"),
    ),
    h("div", { className: "row", style: "margin-top:14px" }, titleInput, saveTitle, del),
    drop,
    fileInput,
    grid,
  );
}

// ---------- routing ----------
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let session = null;

async function route() {
  if (!session) return renderLogin();
  who.textContent = session.user.email;
  logoutBtn.hidden = false;
  const id = location.hash.replace(/^#\//, "");
  await guard(() => (UUID.test(id) ? renderSite(id) : renderSites()));
}

logoutBtn.addEventListener("click", () => sb.auth.signOut());
window.addEventListener("hashchange", route);
sb.auth.onAuthStateChange((_event, s) => {
  const changed = (s?.user.id ?? null) !== (session?.user.id ?? null);
  session = s;
  if (changed) route(); // token refreshes shouldn't redraw (and lose unsaved captions)
});
