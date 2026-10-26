// Entry gate: an expired site shows only a plain notice (no scene), so three.js is only loaded
// for live sites. Errors fall through to main.js, which falls back to the default content.
import { loadSiteContent } from "./site.js";

const expired = await loadSiteContent().then((site) => site.expired, () => false);
if (expired) {
  document.title = "Page expired";
  document.body.replaceChildren(); // loader, hint and close button too
  const notice = document.createElement("main");
  notice.style.cssText =
    "min-height:100vh;display:grid;place-content:center;gap:8px;padding:24px;text-align:center;" +
    "background:#0a0a14;color:#e8e6f0;font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif";
  const h = document.createElement("h1");
  h.textContent = "This page has expired";
  h.style.cssText = "margin:0;font-size:24px";
  const p = document.createElement("p");
  p.textContent = "This link is no longer valid.";
  p.style.cssText = "margin:0;color:#8d8aa3";
  notice.append(h, p);
  document.body.append(notice);
} else {
  await import("./main.js");
}
