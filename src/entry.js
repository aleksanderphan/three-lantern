// Entry gate: an expired site renders nothing at all, so the scene (and three.js) is only loaded
// for live sites. Errors fall through to main.js, which falls back to the default content.
import { loadSiteContent } from "./site.js";

const expired = await loadSiteContent().then((site) => site.expired, () => false);
if (expired) {
  document.title = "";
  document.body.replaceChildren(); // loader, hint and close button too
} else {
  await import("./main.js");
}
