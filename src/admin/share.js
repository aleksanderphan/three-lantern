// Share helpers for the dashboard: a site's public URL, a plain QR code, and a stylized QR card.
// `qrcode` is loaded on demand so it stays out of the dashboard's first paint.
import { DEFAULT_ID } from "../site.js";

// Public URL of a site. On admin.<domain> that is <uuid>.<domain>; on hosts without wildcard
// subdomains (localhost, *.vercel.app previews) it falls back to ?site=<uuid>.
export function siteUrl(id) {
  const { protocol, host, hostname, origin } = location;
  if (hostname.split(".")[0] === "admin") {
    const root = host.slice("admin.".length);
    return id === DEFAULT_ID ? `${protocol}//${root}/` : `${protocol}//${id}.${root}/`;
  }
  return id === DEFAULT_ID ? `${origin}/` : `${origin}/?site=${id}`;
}

const loadQR = () => import("qrcode").then((m) => m.default ?? m);

const toBlob = (canvas) => new Promise((res) => canvas.toBlob(res, "image/png"));

// Plain QR: dark on white with a quiet zone, so it scans anywhere.
export async function qrCanvas(url, size = 512) {
  const QR = await loadQR();
  const canvas = document.createElement("canvas");
  await QR.toCanvas(canvas, url, { width: size, margin: 2, errorCorrectionLevel: "M", color: { dark: "#14142a", light: "#ffffff" } });
  return canvas;
}

export async function qrPng(url) {
  return toBlob(await qrCanvas(url, 1024));
}

// Stylized card: night sky, moon, glowing lantern, the QR on a light plate, title and short URL.
export async function qrCardPng(url, title) {
  const W = 900, H = 1200;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");

  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#070714");
  sky.addColorStop(0.6, "#1a1030");
  sky.addColorStop(1, "#3a1d3f");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // Deterministic stars so the same site always gets the same card.
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 90; i++) {
    g.globalAlpha = 0.3 + rnd() * 0.7;
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(rnd() * W, rnd() * H * 0.6, 0.8 + rnd() * 1.6, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  const glow = (x, y, r, color) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, "transparent");
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // Moon
  glow(740, 150, 140, "rgba(255, 244, 214, 0.35)");
  g.fillStyle = "#fff4d6";
  g.beginPath();
  g.arc(740, 150, 46, 0, Math.PI * 2);
  g.fill();

  // Lantern
  glow(160, 190, 150, "rgba(255, 170, 80, 0.55)");
  g.fillStyle = "#ffb86b";
  g.beginPath();
  g.ellipse(160, 190, 42, 54, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#5a3418";
  g.fillRect(132, 132, 56, 8);
  g.fillRect(132, 240, 56, 8);
  g.strokeStyle = "#ffb86b88";
  g.beginPath();
  g.moveTo(160, 132);
  g.lineTo(160, 70);
  g.stroke();

  // QR plate
  const plate = 560, px = (W - plate) / 2, py = 330;
  g.shadowColor = "rgba(255, 184, 107, 0.45)";
  g.shadowBlur = 50;
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.roundRect(px, py, plate, plate, 28);
  g.fill();
  g.shadowBlur = 0;
  g.drawImage(await qrCanvas(url, 1024), px + 20, py + 20, plate - 40, plate - 40);

  // Text
  g.textAlign = "center";
  g.fillStyle = "#ffe9cf";
  g.font = "600 54px system-ui, sans-serif";
  g.fillText(fit(g, title || "Three Lantern", W - 120), W / 2, 1030);
  g.fillStyle = "#b9b3d4";
  g.font = "28px system-ui, sans-serif";
  g.fillText(fit(g, url.replace(/^https?:\/\//, "").replace(/\/$/, ""), W - 120), W / 2, 1085);
  g.font = "22px system-ui, sans-serif";
  g.fillStyle = "#8d8aa3";
  g.fillText("Scan to open", W / 2, 1140);

  return toBlob(c);
}

// Shrinks the text with an ellipsis until it fits the width.
function fit(g, text, max) {
  if (g.measureText(text).width <= max) return text;
  while (text.length > 1 && g.measureText(text + "…").width > max) text = text.slice(0, -1);
  return text + "…";
}

export function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
