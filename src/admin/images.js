// Browser-side equivalent of scripts/optimize-assets.mjs: a ~1024px WebP for the popup
// and a 384x512 cover-cropped WebP for the banner texture.
function toWebp(canvas, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("WebP encoding not supported"))), "image/webp", quality),
  );
}

export async function makeVariants(file) {
  const bmp = await createImageBitmap(file); // honours EXIF orientation by default
  try {
    const scale = Math.min(1, 1024 / bmp.width);
    const full = document.createElement("canvas");
    full.width = Math.round(bmp.width * scale);
    full.height = Math.round(bmp.height * scale);
    full.getContext("2d").drawImage(bmp, 0, 0, full.width, full.height);

    const thumb = document.createElement("canvas");
    thumb.width = 384;
    thumb.height = 512;
    const k = Math.max(384 / bmp.width, 512 / bmp.height);
    const w = bmp.width * k;
    const h = bmp.height * k;
    thumb.getContext("2d").drawImage(bmp, (384 - w) / 2, (512 - h) / 2, w, h);

    return { image: await toWebp(full, 0.78), thumb: await toWebp(thumb, 0.75) };
  } finally {
    bmp.close();
  }
}
