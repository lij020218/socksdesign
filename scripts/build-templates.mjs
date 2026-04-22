// One-off build script: convert the existing sock masks (transparent
// silhouettes) into 1024x1536 portrait templates that we send to
// gpt-image-2's edit endpoint so the model sees the exact sock shape
// and places its design inside the correct region.
//
// Output: public/template-{ankle,crew,mid}.png
//
// Run: `node scripts/build-templates.mjs`

import sharp from "sharp";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");

// SelectionState.length -> actual mask file (same map used by SockPreview).
const LENGTH_TO_MASK = {
  ankle: "sock-invisible.png", // 덧신 · no-show
  crew: "sock-ankle.png",      // 단목 · ankle-height
  mid: "sock-crew.png",         // 중목 · tall crew
};

const TARGET_W = 1024;
const TARGET_H = 1536;
const BG = { r: 241, g: 237, b: 226 }; // paper tone #f1ede2

for (const [length, maskFile] of Object.entries(LENGTH_TO_MASK)) {
  const maskPath = path.join(PUBLIC, maskFile);
  const outPath = path.join(PUBLIC, `template-${length}.png`);

  const meta = await sharp(maskPath).metadata();
  const mw = meta.width;
  const mh = meta.height;
  const maskAspect = mw / mh;

  // Scale the mask to occupy ~82% of the target height while keeping
  // its natural aspect ratio.
  const sockH = Math.round(TARGET_H * 0.82);
  const sockW = Math.round(sockH * maskAspect);

  const resizedMask = await sharp(maskPath)
    .resize(sockW, sockH, { fit: "fill" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: TARGET_W,
      height: TARGET_H,
      channels: 3,
      background: BG,
    },
  })
    .composite([{ input: resizedMask, gravity: "center", blend: "over" }])
    .png()
    .toFile(outPath);

  const stat = fs.statSync(outPath);
  console.log(
    `✔ ${path.basename(outPath)}  ${TARGET_W}x${TARGET_H}  ${(stat.size / 1024).toFixed(1)} KB`,
  );
}
