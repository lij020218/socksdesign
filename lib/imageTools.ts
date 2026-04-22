// Client-only helpers for processing uploaded / AI-generated raster images
// so they can be used as sock pattern tiles or logos. All functions are
// thin wrappers over Canvas 2D.

/**
 * Background removal via 4-corner flood fill. Only pixels CONNECTED to the
 * corners (and within the color threshold) are made transparent — so white
 * highlights INSIDE the subject (eyes, belly, etc.) stay opaque and the
 * sock color cannot bleed through them.
 */
export function removeBackground(
  canvas: HTMLCanvasElement,
  threshold = 36,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const inset = Math.max(2, Math.floor(Math.min(w, h) * 0.02));
  const samples: [number, number][] = [
    [inset, inset],
    [w - 1 - inset, inset],
    [inset, h - 1 - inset],
    [w - 1 - inset, h - 1 - inset],
  ];

  let alreadyTransparent = true;
  for (const [x, y] of samples) {
    if (d[(y * w + x) * 4 + 3] > 200) {
      alreadyTransparent = false;
      break;
    }
  }
  if (alreadyTransparent) return;

  const corners = samples.map(([x, y]) => {
    const i = (y * w + x) * 4;
    return [d[i], d[i + 1], d[i + 2]] as [number, number, number];
  });
  let r = 0, g = 0, b = 0;
  for (const [cr, cg, cb] of corners) {
    r += cr;
    g += cg;
    b += cb;
  }
  r /= 4; g /= 4; b /= 4;

  let maxVar = 0;
  for (const [cr, cg, cb] of corners) {
    const dist = Math.hypot(cr - r, cg - g, cb - b);
    if (dist > maxVar) maxVar = dist;
  }
  if (maxVar > 45) return;

  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  for (const [x, y] of samples) stack.push(y * w + x);

  while (stack.length) {
    const idx = stack.pop()!;
    if (visited[idx]) continue;
    const i = idx * 4;
    const dist = Math.hypot(d[i] - r, d[i + 1] - g, d[i + 2] - b);
    if (dist >= threshold) continue;
    visited[idx] = 1;
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) stack.push(idx - 1);
    if (x < w - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - w);
    if (y < h - 1) stack.push(idx + w);
  }

  for (let idx = 0; idx < w * h; idx++) {
    const i = idx * 4;
    if (visited[idx]) {
      d[i + 3] = 0;
      continue;
    }
    const x = idx % w;
    const y = (idx - x) / w;
    let hasBgNeighbour = false;
    if (x > 0 && visited[idx - 1]) hasBgNeighbour = true;
    else if (x < w - 1 && visited[idx + 1]) hasBgNeighbour = true;
    else if (y > 0 && visited[idx - w]) hasBgNeighbour = true;
    else if (y < h - 1 && visited[idx + w]) hasBgNeighbour = true;
    if (hasBgNeighbour) {
      const dist = Math.hypot(d[i] - r, d[i + 1] - g, d[i + 2] - b);
      if (dist < threshold * 1.4) {
        const f = (dist - threshold) / (threshold * 0.4);
        d[i + 3] = Math.round(d[i + 3] * Math.min(1, Math.max(0.5, f)));
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Trim transparent margin so tiles sit tight to the visible subject. */
export function autoCropTransparent(
  canvas: HTMLCanvasElement,
  padding = 2,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(w - 1, maxX + padding);
  maxY = Math.min(h - 1, maxY + padding);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  if (cw === w && ch === h) return;
  const cropped = ctx.getImageData(minX, minY, cw, ch);
  canvas.width = cw;
  canvas.height = ch;
  ctx.putImageData(cropped, 0, 0);
}

/**
 * Load `src` as an Image, downscale to `max` px on the longest axis, strip
 * the background via flood fill from the corners, auto-crop transparent
 * margin, and return the result as a PNG data URL.
 */
export function processPatternImage(src: string, max = 512): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(src);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ratio = Math.min(max / img.width, max / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      removeBackground(c);
      autoCropTransparent(c);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
