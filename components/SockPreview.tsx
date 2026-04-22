"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PatternStyle, SelectionState } from "@/lib/types";
import { FONT_OPTIONS } from "@/lib/options";

function buildPatternImage(
  style: PatternStyle,
  color: string,
  scale: number,
  customUrl?: string,
): string {
  if (style === "custom" && customUrl) {
    return `url("${customUrl}")`;
  }
  if (style === "dot") {
    const dotR = 2 * scale;
    return `radial-gradient(circle at 50% 50%, ${color} ${dotR}px, transparent ${dotR + 0.3 * scale}px)`;
  }
  if (style === "stripe") {
    const gap = 14 * scale;
    const total = 22 * scale;
    return `repeating-linear-gradient(180deg, transparent 0 ${gap}px, ${color} ${gap}px ${total}px)`;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='44' viewBox='0 0 30 44'>
    <g fill='${color}'>
      <path d='M15 10 l2 5 5 .5 -4 3.5 1 5 -4-3 -4 3 1-5 -4-3.5 5-.5z'/>
      <circle cx='5' cy='34' r='2.5'/>
      <circle cx='25' cy='34' r='2.5'/>
    </g>
  </svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// Hand-placed scatter points covering the panel with deliberate jitter,
// inspired by Sanrio-style character socks — roughly 4 rows × 4–5 cols,
// each with its own tilt and scale variation so the pattern reads as
// "sprinkled" rather than "tiled".
const SCATTER_POINTS: { x: number; y: number; rot: number; sc: number }[] = [
  { x: 14, y: 6, rot: -8, sc: 1.0 },
  { x: 42, y: 10, rot: 7, sc: 0.92 },
  { x: 72, y: 4, rot: -14, sc: 1.05 },
  { x: 94, y: 18, rot: 10, sc: 0.95 },

  { x: 6, y: 28, rot: 12, sc: 0.95 },
  { x: 30, y: 30, rot: -18, sc: 1.0 },
  { x: 58, y: 24, rot: 4, sc: 1.08 },
  { x: 86, y: 38, rot: -6, sc: 0.95 },

  { x: 20, y: 50, rot: 16, sc: 1.05 },
  { x: 48, y: 46, rot: -9, sc: 0.98 },
  { x: 74, y: 54, rot: 11, sc: 0.92 },
  { x: 98, y: 58, rot: -14, sc: 1.0 },

  { x: 10, y: 70, rot: -6, sc: 1.02 },
  { x: 36, y: 66, rot: 14, sc: 0.95 },
  { x: 62, y: 72, rot: -12, sc: 1.05 },
  { x: 88, y: 78, rot: 8, sc: 0.98 },

  { x: 22, y: 90, rot: -18, sc: 1.0 },
  { x: 50, y: 88, rot: 5, sc: 0.95 },
  { x: 76, y: 94, rot: -8, sc: 1.05 },
];

function isScatterStyle(style: PatternStyle): boolean {
  return style === "character" || style === "custom";
}

function patternSize(style: PatternStyle, scale: number): string {
  if (style === "stripe") return "auto";
  if (style === "character") {
    // Narrow horizontal spacing while keeping comfortable vertical rhythm.
    return `${Math.round(22 * scale)}px ${Math.round(32 * scale)}px`;
  }
  // `auto` for one axis lets the browser preserve the image's natural
  // aspect ratio so uploaded logos/characters don't get squashed.
  // Default 72px ≈ realistic novelty-sock motif (~4–5 columns across the
  // sock body, comfortable spacing — based on real character-sock samples).
  if (style === "custom") return `auto ${Math.round(72 * scale)}px`;
  const s = Math.round(18 * scale);
  return `${s}px ${s}px`;
}

const MASK_BY_LENGTH: Record<string, string> = {
  ankle: "/sock-invisible.png", // 덧신 · no-show
  crew: "/sock-ankle.png",      // 단목 · ankle-height
  mid: "/sock-crew.png",        // 중목 · tall crew
};

// Placeholder: unpainted white silhouette outlined by a thin ink stroke
// (via drop-shadow filter) to read as a "blank template ready for color".
const DEFAULT_MAIN = "#ffffff";
const DEFAULT_ACCENT = "#0e0e0e";

export function SockPreview({
  sel,
  autoConfirmPattern = false,
  previewRef,
}: {
  sel: SelectionState;
  autoConfirmPattern?: boolean;
  previewRef?: React.Ref<HTMLDivElement>;
}) {
  const length = sel.length ?? "crew";
  const maskUrl = MASK_BY_LENGTH[length];
  const hasMain = !!sel.mainColor;
  const main = sel.mainColor ?? DEFAULT_MAIN;
  const accent = sel.accentColor ?? DEFAULT_ACCENT;
  const yarn = sel.yarn ?? "cotton";

  const isEmbroidery = sel.design === "embroidery";
  const isPattern = sel.design === "pattern";
  const isTourism = sel.design === "tourism";
  const patternStyle = sel.patternStyle ?? "dot";
  const customMode = sel.customMode ?? "tile";
  // Logo placement bypasses the tiled-pattern flow entirely.
  const isCustomLogo =
    isPattern && patternStyle === "custom" && customMode === "logo" && !!sel.customPattern;
  // Full-fill: single scenic illustration covers the whole sock silhouette,
  // no tiling, no cuff band (colors are baked into the image itself).
  const isCustomFill =
    isPattern && patternStyle === "custom" && customMode === "fill" && !!sel.customPattern;
  const isTiledPattern = isPattern && !isCustomLogo && !isCustomFill;

  // Logo position (% within sock wrapper). The silhouettes are asymmetric —
  // the ankle/leg sits left of the geometric center because the foot extends
  // right. Values were measured from the actual mask centroids.
  const logoY =
    length === "ankle" ? 22 : length === "crew" ? 28 : 22;
  const logoX =
    length === "ankle" ? 44 : length === "crew" ? 37 : 40;
  const logoScale = Math.min(2.5, Math.max(0.4, sel.logoScale ?? 1));
  const logoSizePct = 22 * logoScale; // % of wrapper height

  // Translate the silhouette right so the ANKLE horizontal midline lands on
  // the panel's vertical axis. Computed from each PNG's leg-edge analysis:
  // shift_panel% × (100 / wrapper_width%) → translate-X% on the wrapper.
  const silhouetteShiftPct =
    length === "ankle" ? 6.4 : length === "crew" ? 12.9 : 10.2;

  // Drag / rotation / scale state for the pattern sheet.
  const [patternOffset, setPatternOffset] = useState({ x: 0, y: 0 });
  const [patternRotation, setPatternRotation] = useState(0);
  const [patternScale, setPatternScale] = useState(1);
  const [patternConfirmed, setPatternConfirmed] = useState(autoConfirmPattern);

  // Logo drag offset (px) applied as transform on top of the base placement.
  const [logoOffset, setLogoOffset] = useState({ x: 0, y: 0 });
  const logoDragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [logoDragging, setLogoDragging] = useState(false);
  const [logoSnap, setLogoSnap] = useState({ x: false, y: false });
  const SNAP_THRESHOLD = 8;

  // Text overlay drag / rotation state (offset & angle are transient UX —
  // size persists via sel.textScale, controlled by the Dial in the studio).
  const [textOffset, setTextOffset] = useState({ x: 0, y: 0 });
  const [textRotation, setTextRotation] = useState(0);
  const textDragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const textRotateRef = useRef<boolean>(false);
  const textCenterRef = useRef<{ x: number; y: number } | null>(null);
  const [textDragging, setTextDragging] = useState(false);
  const [textRotating, setTextRotating] = useState(false);

  const textScale = Math.min(2.5, Math.max(0.3, sel.textScale ?? 1));
  const fontFamily =
    FONT_OPTIONS.find((f) => f.value === (sel.textFont ?? "serif"))?.family ??
    "serif";
  const fontItalic =
    FONT_OPTIONS.find((f) => f.value === (sel.textFont ?? "serif"))?.italic ??
    false;

  // Reset text state when length/design changes significantly
  useEffect(() => {
    setTextOffset({ x: 0, y: 0 });
    setTextRotation(0);
  }, [length]);

  function startTextDrag(e: React.MouseEvent | React.TouchEvent) {
    const pt = "touches" in e ? e.touches[0] : e;
    textDragRef.current = {
      startX: pt.clientX,
      startY: pt.clientY,
      origX: textOffset.x,
      origY: textOffset.y,
    };
    setTextDragging(true);
    if ("preventDefault" in e) e.preventDefault();
    if ("stopPropagation" in e) e.stopPropagation();
  }

  function startTextRotate(
    e: React.MouseEvent | React.TouchEvent,
    center: { x: number; y: number },
  ) {
    textRotateRef.current = true;
    textCenterRef.current = center;
    setTextRotating(true);
    if ("preventDefault" in e) e.preventDefault();
    if ("stopPropagation" in e) e.stopPropagation();
  }

  function onTextRotate(rot: number) {
    setTextRotation(rot);
  }

  const SCALE_MIN = 0.4;
  const SCALE_MAX = 3.0;
  const SCALE_STEP = 0.2;
  function bumpScale(delta: number) {
    setPatternScale((s) =>
      Math.min(SCALE_MAX, Math.max(SCALE_MIN, +(s + delta).toFixed(2))),
    );
  }
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  // panelRef retained for future measurement needs; applied-mode pattern
  // now renders at panel scale with matching mask sizing, so no wrapper
  // offset math is required.
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getPoint = (e: MouseEvent | TouchEvent) => {
      if ("touches" in e && e.touches.length) return e.touches[0];
      return e as MouseEvent;
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      const pt = getPoint(e);
      if (dragRef.current) {
        setPatternOffset({
          x: dragRef.current.origX + (pt.clientX - dragRef.current.startX),
          y: dragRef.current.origY + (pt.clientY - dragRef.current.startY),
        });
        if (e.cancelable) e.preventDefault();
      } else if (textDragRef.current) {
        setTextOffset({
          x: textDragRef.current.origX + (pt.clientX - textDragRef.current.startX),
          y: textDragRef.current.origY + (pt.clientY - textDragRef.current.startY),
        });
        if (e.cancelable) e.preventDefault();
      } else if (textRotateRef.current && textCenterRef.current) {
        const angle =
          (Math.atan2(
            pt.clientY - textCenterRef.current.y,
            pt.clientX - textCenterRef.current.x,
          ) *
            180) /
          Math.PI;
        // Handle sits above text at −90° → text rotation = angle + 90
        const rot = angle + 90;
        // Snap to 15° when within 4°
        const snapped = Math.round(rot / 15) * 15;
        const finalRot = Math.abs(rot - snapped) < 4 ? snapped : rot;
        setTextRotation(finalRot);
        if (e.cancelable) e.preventDefault();
      } else if (logoDragRef.current) {
        let nx =
          logoDragRef.current.origX + (pt.clientX - logoDragRef.current.startX);
        let ny =
          logoDragRef.current.origY + (pt.clientY - logoDragRef.current.startY);

        // Snap to panel center: nudge offset so the logo's visual center lands
        // on the panel's vertical / horizontal axis when within threshold.
        const panel = panelRef.current?.getBoundingClientRect();
        const wrapper = wrapperRef.current?.getBoundingClientRect();
        let snapX = false;
        let snapY = false;
        if (panel && wrapper) {
          const panelCx = panel.left + panel.width / 2;
          const panelCy = panel.top + panel.height / 2;
          const baseLogoCx = wrapper.left + (logoX / 100) * wrapper.width;
          const baseLogoCy = wrapper.top + (logoY / 100) * wrapper.height;
          const diffX = panelCx - (baseLogoCx + nx);
          const diffY = panelCy - (baseLogoCy + ny);
          if (Math.abs(diffX) < SNAP_THRESHOLD) {
            nx += diffX;
            snapX = true;
          }
          if (Math.abs(diffY) < SNAP_THRESHOLD) {
            ny += diffY;
            snapY = true;
          }
        }
        setLogoOffset({ x: nx, y: ny });
        setLogoSnap({ x: snapX, y: snapY });
        if (e.cancelable) e.preventDefault();
      }
    };
    const onUp = () => {
      dragRef.current = null;
      logoDragRef.current = null;
      textDragRef.current = null;
      textRotateRef.current = false;
      textCenterRef.current = null;
      setDragging(false);
      setLogoDragging(false);
      setLogoSnap({ x: false, y: false });
      setTextDragging(false);
      setTextRotating(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  // Reset logo offset when length or design context changes (base position shifts).
  useEffect(() => {
    setLogoOffset({ x: 0, y: 0 });
  }, [length, isEmbroidery, isCustomLogo]);

  function startLogoDrag(e: React.MouseEvent | React.TouchEvent) {
    const pt = "touches" in e ? e.touches[0] : e;
    logoDragRef.current = {
      startX: pt.clientX,
      startY: pt.clientY,
      origX: logoOffset.x,
      origY: logoOffset.y,
    };
    setLogoDragging(true);
    if ("preventDefault" in e) e.preventDefault();
  }

  // Reset offset, rotation, scale & unconfirm when pattern style / design changes.
  useEffect(() => {
    setPatternOffset({ x: 0, y: 0 });
    setPatternRotation(0);
    setPatternScale(1);
    setPatternConfirmed(autoConfirmPattern);
  }, [patternStyle, isPattern, autoConfirmPattern]);

  function startDrag(e: React.MouseEvent | React.TouchEvent) {
    const pt = "touches" in e ? e.touches[0] : e;
    dragRef.current = {
      startX: pt.clientX,
      startY: pt.clientY,
      origX: patternOffset.x,
      origY: patternOffset.y,
    };
    setDragging(true);
  }

  // Cuff band height as % of sock height depends on length
  const cuffPct =
    length === "ankle" ? 0.045 : length === "crew" ? 0.08 : 0.12;

  return (
    <div className="w-full">
      <div
        ref={(el) => {
          panelRef.current = el;
          if (typeof previewRef === "function") previewRef(el);
          else if (previewRef)
            (previewRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className="relative w-full aspect-[4/3.5] rounded-2xl overflow-hidden"
        style={{
          backgroundColor:
            isTiledPattern && !patternConfirmed && hasMain
              ? main
              : "#f1ede2",
        }}
      >
        {/* Full-panel draggable pattern sheet (pattern edit mode only).
            Layer is oversized so that any rotation still fully covers
            the panel area; overflow:hidden on the panel clips the excess. */}
        {isTiledPattern && !patternConfirmed && !isScatterStyle(patternStyle) && (
          <div
            role="presentation"
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            className="absolute select-none"
            style={{
              left: "-50%",
              top: "-50%",
              width: "200%",
              height: "200%",
              backgroundImage: buildPatternImage(
                patternStyle,
                accent,
                patternScale,
                sel.customPattern,
              ),
              backgroundSize: patternSize(patternStyle, patternScale),
              backgroundRepeat: "repeat",
              backgroundPosition: `${Math.round(patternOffset.x)}px ${Math.round(
                patternOffset.y,
              )}px`,
              transform: `rotate(${patternRotation}deg)`,
              transformOrigin: "center",
              cursor: dragging ? "grabbing" : "grab",
              touchAction: "none",
            }}
          />
        )}

        {/* Scatter-style layer for character / custom patterns — mounted
            inside a wrapper matching the silhouette's size & shift so item
            density matches the applied-mode preview exactly. */}
        {isTiledPattern && !patternConfirmed && isScatterStyle(patternStyle) && (
          <div className="absolute inset-0 flex items-center justify-center select-none">
            <div
              role="presentation"
              onMouseDown={startDrag}
              onTouchStart={startDrag}
              className="relative"
              style={{
                width: length === "ankle" ? "50%" : "62%",
                height: length === "ankle" ? "62%" : "82%",
                transform: `translateX(${silhouetteShiftPct}%) translate(${patternOffset.x}px, ${patternOffset.y}px) rotate(${patternRotation}deg)`,
                transformOrigin: "center",
                cursor: dragging ? "grabbing" : "grab",
                touchAction: "none",
              }}
            >
              <ScatterLayer
                style={patternStyle}
                color={accent}
                customUrl={sel.customPattern}
                scale={patternScale}
              />
            </div>
          </div>
        )}

        {/* Grid guides — hidden while the user is positioning the pattern */}
        {(!isTiledPattern || patternConfirmed) && (
          <svg
            viewBox="0 0 300 300"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <g stroke="#c9c2b5" strokeWidth="0.4" opacity="0.55">
              <line x1="0" y1="150" x2="300" y2="150" strokeDasharray="2 4" />
              <line x1="150" y1="0" x2="150" y2="300" strokeDasharray="2 4" />
            </g>
            <g stroke="#0e0e0e" strokeWidth="0.7" fill="none" opacity="0.7">
              <path d="M 4 14 L 4 4 L 14 4" />
              <path d="M 286 4 L 296 4 L 296 14" />
              <path d="M 296 286 L 296 296 L 286 296" />
              <path d="M 14 296 L 4 296 L 4 286" />
            </g>
          </svg>
        )}

        {/* Sock silhouette — tinted via CSS mask. In pattern mode the base is
            a thin ink outline so the pattern sheet below shows through cleanly. */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <div
            ref={wrapperRef}
            className="relative"
            style={{
              width: length === "ankle" ? "50%" : "62%",
              height: length === "ankle" ? "62%" : "82%",
              transform: `translateX(${silhouetteShiftPct}%)`,
            }}
          >
            {/* Base body — solid main color. In tiled-pattern editing mode the
                body is translucent + outlined so the draggable pattern shows
                through. */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor:
                  isTiledPattern && !patternConfirmed ? "#0e0e0e" : main,
                opacity: isTiledPattern && !patternConfirmed ? 0.18 : 1,
                WebkitMaskImage: `url(${maskUrl})`,
                maskImage: `url(${maskUrl})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                filter:
                  !hasMain || (isTiledPattern && !patternConfirmed)
                    ? "drop-shadow(0 0 0.6px #0e0e0e) drop-shadow(0 0 0.6px #0e0e0e)"
                    : undefined,
              }}
            />

            {/* Logo placement — single image at ankle center */}
            {isCustomLogo && (
              <img
                src={sel.customPattern}
                alt="logo"
                onMouseDown={startLogoDrag}
                onTouchStart={startLogoDrag}
                draggable={false}
                style={{
                  position: "absolute",
                  left: `${logoX}%`,
                  top: `${logoY}%`,
                  transform: `translate(calc(-50% + ${logoOffset.x}px), calc(-50% + ${logoOffset.y}px))`,
                  height: `${logoSizePct}%`,
                  width: "auto",
                  maxWidth: "60%",
                  objectFit: "contain",
                  pointerEvents: "auto",
                  cursor: logoDragging ? "grabbing" : "grab",
                  touchAction: "none",
                  filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))",
                  userSelect: "none",
                }}
              />
            )}


            {/* Cuff band — accent color at top, clipped to top fraction */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: accent,
                opacity: sel.accentColor ? 1 : 0,
                WebkitMaskImage: `url(${maskUrl})`,
                maskImage: `url(${maskUrl})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                clipPath: `inset(0 0 ${(1 - cuffPct) * 100}% 0)`,
              }}
            />

            {/* Tourism overlay — horizontal stripes */}
            {isTourism && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `repeating-linear-gradient(180deg, transparent 0 10px, ${accent}55 10px 14px)`,
                  WebkitMaskImage: `url(${maskUrl})`,
                  maskImage: `url(${maskUrl})`,
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                }}
              />
            )}

            {/* Embroidery mark — uploaded logo (if any) replaces the default
                "L" placeholder. Positioned at ankle, draggable for fine-tune. */}
            {isEmbroidery && sel.customPattern && (
              <img
                src={sel.customPattern}
                alt="logo"
                onMouseDown={startLogoDrag}
                onTouchStart={startLogoDrag}
                draggable={false}
                style={{
                  position: "absolute",
                  left: `${logoX}%`,
                  top: `${logoY}%`,
                  transform: `translate(calc(-50% + ${logoOffset.x}px), calc(-50% + ${logoOffset.y}px))`,
                  height: `${logoSizePct}%`,
                  width: "auto",
                  maxWidth: "55%",
                  objectFit: "contain",
                  pointerEvents: "auto",
                  cursor: logoDragging ? "grabbing" : "grab",
                  touchAction: "none",
                  filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))",
                  userSelect: "none",
                }}
              />
            )}
            {isEmbroidery && !sel.customPattern && (
              <div
                onMouseDown={startLogoDrag}
                onTouchStart={startLogoDrag}
                style={{
                  position: "absolute",
                  left: `${logoX}%`,
                  top: `${logoY}%`,
                  transform: `translate(calc(-50% + ${logoOffset.x}px), calc(-50% + ${logoOffset.y}px))`,
                  width: 32 * logoScale,
                  height: 32 * logoScale,
                  borderRadius: 999,
                  background: accent,
                  color: main,
                  fontFamily: "'Instrument Serif', serif",
                  fontStyle: "italic",
                  fontSize: 20 * logoScale,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                  pointerEvents: "auto",
                  cursor: logoDragging ? "grabbing" : "grab",
                  touchAction: "none",
                  userSelect: "none",
                }}
              >
                L
              </div>
            )}

            {/* Text overlay — draggable; a rotation handle above the text
                lets the user drag to rotate freely (snaps every 15°). */}
            {sel.text && sel.text.trim() && (
              <TextOverlay
                text={sel.text}
                fontFamily={fontFamily}
                fontItalic={fontItalic}
                color={sel.accentColor ?? "#0e0e0e"}
                baseSize={18 * textScale}
                rotation={textRotation}
                offset={textOffset}
                baseX={logoX}
                baseY={logoY + 30}
                dragging={textDragging}
                rotating={textRotating}
                onStartDrag={startTextDrag}
                onStartRotate={startTextRotate}
              />
            )}
          </div>
        </div>

        {/* Applied-mode pattern — mounted inside a wrapper that matches the
            silhouette's size & translateX so the sock-shape mask clips the
            pattern exactly along the rendered sock outline. */}
        {isTiledPattern && patternConfirmed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="relative"
              style={{
                width: length === "ankle" ? "50%" : "62%",
                height: length === "ankle" ? "62%" : "82%",
                transform: `translateX(${silhouetteShiftPct}%)`,
              }}
            >
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  WebkitMaskImage: `url(${maskUrl})`,
                  maskImage: `url(${maskUrl})`,
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  // When a cuff accent is painted, exclude the top cuff band
                  // from the pattern area so the pattern doesn't bleed over it.
                  clipPath: sel.accentColor
                    ? `inset(${cuffPct * 100}% 0 0 0)`
                    : undefined,
                }}
              >
                {isScatterStyle(patternStyle) ? (
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `translate(${patternOffset.x}px, ${patternOffset.y}px) rotate(${patternRotation}deg)`,
                      transformOrigin: "center",
                    }}
                  >
                    <ScatterLayer
                      style={patternStyle}
                      color={accent}
                      customUrl={sel.customPattern}
                      scale={patternScale}
                    />
                  </div>
                ) : (
                  <div
                    className="absolute"
                    style={{
                      left: "-50%",
                      top: "-50%",
                      width: "200%",
                      height: "200%",
                      backgroundImage: buildPatternImage(
                        patternStyle,
                        accent,
                        patternScale,
                        sel.customPattern,
                      ),
                      backgroundSize: patternSize(patternStyle, patternScale),
                      backgroundRepeat: "repeat",
                      backgroundPosition: `${Math.round(
                        patternOffset.x,
                      )}px ${Math.round(patternOffset.y)}px`,
                      transform: `rotate(${patternRotation}deg)`,
                      transformOrigin: "center",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Full-fill scenic image — single non-repeating illustration that
            covers the entire sock silhouette edge-to-edge (customMode "fill").
            Uses the same silhouette-matched wrapper as the applied pattern
            so the sock-shape mask clips the image along the real outline. */}
        {isCustomFill && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="relative"
              style={{
                width: length === "ankle" ? "50%" : "62%",
                height: length === "ankle" ? "62%" : "82%",
                transform: `translateX(${silhouetteShiftPct}%)`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${sel.customPattern})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  WebkitMaskImage: `url(${maskUrl})`,
                  maskImage: `url(${maskUrl})`,
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                }}
              />
            </div>
          </div>
        )}

        {/* Yarn label */}
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] tracking-[0.3em] uppercase text-crimson-500/80 font-mono origin-center"
          style={{ writingMode: "vertical-rl" }}
        >
          YARN · {yarn.toUpperCase()}
        </div>

        {/* Source badge */}
        <div className="absolute left-3 bottom-3 text-[9px] tracking-[0.3em] uppercase text-ink/50 font-mono">
          Template · 양말-1.psd
        </div>

        {/* Snap guide lines while dragging the logo through the panel center */}
        {logoDragging && (logoSnap.x || logoSnap.y) && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
          >
            {logoSnap.x && (
              <line
                x1="50%"
                y1="0"
                x2="50%"
                y2="100%"
                stroke="#d7263d"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}
            {logoSnap.y && (
              <line
                x1="0"
                y1="50%"
                x2="100%"
                y2="50%"
                stroke="#d7263d"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}
          </svg>
        )}

        {/* Subtle in-panel drag hint while editing */}
        {isTiledPattern && !patternConfirmed && (
          <div className="absolute left-1/2 -translate-x-1/2 top-3 text-[9px] tracking-[0.3em] uppercase font-mono pointer-events-none text-ink/45 px-2 py-1 rounded-full bg-paper/70 backdrop-blur-sm">
            Drag pattern ⇄
          </div>
        )}
      </div>

      {/* Pattern control toolbar — visible only in pattern mode */}
      {isTiledPattern && (
        <div className="mt-3 flex items-center gap-0.5 p-1 rounded-2xl bg-shell border border-mute-200 max-w-full overflow-hidden">
          {!patternConfirmed ? (
            <>
              <div className="flex items-center gap-0.5 px-1.5 py-1">
                <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-mute-400 mr-1 hidden md:inline">
                  Rotate
                </span>
                <button
                  type="button"
                  onClick={() => setPatternRotation((r) => r - 15)}
                  className="w-6 h-6 rounded-md border border-mute-200 hover:border-ink hover:bg-paper flex items-center justify-center text-ink text-[12px] transition-colors"
                  title="−15°"
                  aria-label="Rotate counter-clockwise"
                >
                  ↺
                </button>
                <span className="tabular text-[11px] text-ink min-w-[30px] text-center font-mono">
                  {(((patternRotation % 360) + 360) % 360)
                    .toString()
                    .padStart(3, "0")}
                  °
                </span>
                <button
                  type="button"
                  onClick={() => setPatternRotation((r) => r + 15)}
                  className="w-6 h-6 rounded-md border border-mute-200 hover:border-ink hover:bg-paper flex items-center justify-center text-ink text-[12px] transition-colors"
                  title="+15°"
                  aria-label="Rotate clockwise"
                >
                  ↻
                </button>
              </div>

              <div className="w-px bg-mute-200 my-1.5" />

              <div className="flex items-center gap-0.5 px-1.5 py-1">
                <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-mute-400 mr-1 hidden md:inline">
                  Scale
                </span>
                <button
                  type="button"
                  onClick={() => bumpScale(-SCALE_STEP)}
                  disabled={patternScale <= SCALE_MIN}
                  className="w-6 h-6 rounded-md border border-mute-200 hover:border-ink hover:bg-paper flex items-center justify-center text-ink text-[12px] transition-colors disabled:opacity-30 disabled:hover:border-mute-200"
                  title="Smaller"
                  aria-label="Decrease scale"
                >
                  −
                </button>
                <span className="tabular text-[11px] text-ink min-w-[28px] text-center font-mono">
                  {patternScale.toFixed(1)}×
                </span>
                <button
                  type="button"
                  onClick={() => bumpScale(SCALE_STEP)}
                  disabled={patternScale >= SCALE_MAX}
                  className="w-6 h-6 rounded-md border border-mute-200 hover:border-ink hover:bg-paper flex items-center justify-center text-ink text-[12px] transition-colors disabled:opacity-30 disabled:hover:border-mute-200"
                  title="Larger"
                  aria-label="Increase scale"
                >
                  +
                </button>
              </div>

              <div className="w-px bg-mute-200 my-1.5" />

              <button
                type="button"
                onClick={() => {
                  setPatternOffset({ x: 0, y: 0 });
                  setPatternRotation(0);
                  setPatternScale(1);
                }}
                className="px-2 text-[11px] text-mute-500 hover:text-ink transition-colors"
                title="Reset position, rotation and scale"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() => setPatternConfirmed(true)}
                className="ml-auto h-7 inline-flex items-center gap-1 px-2.5 rounded-lg bg-ink text-paper hover:bg-crimson-500 text-[11px] leading-none tracking-wide font-medium transition-colors shrink-0"
              >
                <span>Apply</span>
                <span className="not-italic leading-none translate-y-[-0.5px]">
                  →
                </span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 px-3 py-1.5 flex-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] uppercase tracking-[0.3em] font-mono text-emerald-700">
                  Applied
                </span>
                <span className="text-[12px] text-mute-500 hidden sm:inline">
                  패턴이 양말에 적용되었습니다
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPatternConfirmed(false)}
                className="h-9 inline-flex items-center px-4 rounded-xl border border-ink text-ink hover:bg-ink hover:text-paper text-[13px] leading-none tracking-wide transition-colors"
              >
                Edit
              </button>
            </>
          )}
        </div>
      )}

      {/* Swatch strip */}
      <div className="mt-3 flex gap-2 items-center">
        <span
          className="inline-block w-6 h-6 rounded-full border border-mute-200"
          style={{ backgroundColor: main }}
          title={`Main ${main}`}
        />
        <span
          className="inline-block w-6 h-6 rounded-full border border-mute-200"
          style={{ backgroundColor: accent }}
          title={`Accent ${accent}`}
        />
        <span className="ml-1 font-mono text-[11px] text-mute-400 tabular">
          {main.toUpperCase()} · {accent.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

function TextOverlay({
  text,
  fontFamily,
  fontItalic,
  color,
  baseSize,
  rotation,
  offset,
  baseX,
  baseY,
  dragging,
  rotating,
  onStartDrag,
  onStartRotate,
}: {
  text: string;
  fontFamily: string;
  fontItalic: boolean;
  color: string;
  baseSize: number;
  rotation: number;
  offset: { x: number; y: number };
  baseX: number;
  baseY: number;
  dragging: boolean;
  rotating: boolean;
  onStartDrag: (e: React.MouseEvent | React.TouchEvent) => void;
  onStartRotate: (
    e: React.MouseEvent | React.TouchEvent,
    center: { x: number; y: number },
  ) => void;
}) {
  const elementRef = useRef<HTMLDivElement>(null);

  function handleStartRotate(e: React.MouseEvent | React.TouchEvent) {
    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;
    onStartRotate(e, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }

  return (
    <div
      ref={elementRef}
      style={{
        position: "absolute",
        left: `${baseX}%`,
        top: `${baseY}%`,
        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg)`,
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      <div
        onMouseDown={onStartDrag}
        onTouchStart={onStartDrag}
        style={{
          position: "relative",
          padding: "4px 8px",
          fontFamily,
          fontStyle: fontItalic ? "italic" : "normal",
          fontSize: baseSize,
          lineHeight: 1.1,
          color,
          whiteSpace: "nowrap",
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))",
        }}
      >
        {text}
        {/* Rotation handle — small dot extending from the text top */}
        <span
          onMouseDown={handleStartRotate}
          onTouchStart={handleStartRotate}
          aria-label="Rotate text"
          style={{
            position: "absolute",
            left: "50%",
            top: -16,
            width: 10,
            height: 10,
            marginLeft: -5,
            borderRadius: 999,
            background: "#d7263d",
            border: "2px solid #fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            cursor: rotating ? "grabbing" : "crosshair",
            touchAction: "none",
          }}
        />
        {/* connector line */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: -8,
            width: 1,
            height: 8,
            marginLeft: -0.5,
            background: "rgba(215,38,61,0.6)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

function ScatterLayer({
  style,
  color,
  customUrl,
  scale,
}: {
  style: PatternStyle;
  color: string;
  customUrl?: string;
  scale: number;
}) {
  // Base tile height at scale=1; scatter uses a slightly larger base than the
  // tiled version because there are fewer items overall.
  const baseHeight = style === "character" ? 34 : 56;
  const h = Math.round(baseHeight * scale);

  return (
    <>
      {SCATTER_POINTS.map((p, i) => {
        const commonStyle: React.CSSProperties = {
          position: "absolute",
          left: `${p.x}%`,
          top: `${p.y}%`,
          transform: `translate(-50%, -50%) rotate(${p.rot}deg) scale(${p.sc})`,
          height: `${h}px`,
          width: "auto",
          pointerEvents: "none",
          userSelect: "none",
        };
        if (style === "custom" && customUrl) {
          return (
            <img
              key={i}
              src={customUrl}
              alt=""
              draggable={false}
              style={commonStyle}
            />
          );
        }
        // character SVG
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='44' viewBox='0 0 30 44'>
          <g fill='${color}'>
            <path d='M15 10 l2 5 5 .5 -4 3.5 1 5 -4-3 -4 3 1-5 -4-3.5 5-.5z'/>
            <circle cx='5' cy='34' r='2.5'/>
            <circle cx='25' cy='34' r='2.5'/>
          </g>
        </svg>`;
        const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
        return (
          <img
            key={i}
            src={url}
            alt=""
            draggable={false}
            style={commonStyle}
          />
        );
      })}
    </>
  );
}
