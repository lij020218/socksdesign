import { toPng } from "html-to-image";
import type { SelectionState } from "./types";

/**
 * Render a DOM element to a PNG and trigger a download. Used to export the
 * sock preview panel so the user can save / share / send to the factory.
 */
export async function exportPreviewPng(
  el: HTMLElement,
  filename = "lovelysocks-design.png",
): Promise<void> {
  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#f1ede2",
  });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/** Download the raw selection as JSON so users can re-import later. */
export function exportSelectionJson(
  sel: SelectionState,
  filename = "lovelysocks-design.json",
): void {
  // Drop the potentially huge base64 customPattern when exporting JSON;
  // it's redundant with the PNG export and would bloat the file.
  const { customPattern, ...rest } = sel;
  const payload = { ...rest, customPatternEmbedded: !!customPattern };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/** Build a timestamped filename slug for consistent naming. */
export function designFilename(ext: string, tag = ""): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const suffix = tag ? `-${tag}` : "";
  return `lovelysocks-${stamp}${suffix}.${ext}`;
}
