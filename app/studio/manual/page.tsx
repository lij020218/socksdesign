"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PURPOSE_OPTIONS,
  LENGTH_OPTIONS,
  GAUGE_OPTIONS,
  YARN_OPTIONS,
  FEATURE_OPTIONS,
  DESIGN_OPTIONS,
  PATTERN_STYLE_OPTIONS,
  FONT_OPTIONS,
  COLOR_FAMILIES,
  ALL_SWATCHES,
  findFamilyForHex,
  PACKAGING_OPTIONS,
  LABELS,
} from "@/lib/options";
import { calculateQuote, formatWon } from "@/lib/pricing";
import type {
  AIProposal,
  ColorFamily,
  Feature,
  SelectionState,
} from "@/lib/types";
import { SockPreview } from "@/components/SockPreview";
import { useSlickNav } from "@/components/TransitionProvider";
import {
  designFilename,
  exportPreviewPng,
  exportSelectionJson,
} from "@/lib/exportDesign";

const INITIAL: SelectionState = {
  features: [],
  quantity: 30,
  prompt: "",
};

const STEPS = [
  {
    n: "01",
    title: "용도",
    sub: "Purpose",
    question: "이 양말은 어떤 순간을 위한 것인가요?",
    hint: "일상·운동·선물·굿즈 — 선택에 따라 추천 옵션과 기본 단가가 달라집니다.",
  },
  {
    n: "02",
    title: "길이",
    sub: "Length",
    question: "양말이 어디까지 올라가길 원하세요?",
    hint: "덧신은 발목 이하, 단목은 발목 높이, 중목은 종아리까지 — 스타일링에 맞는 길이를 골라주세요.",
  },
  {
    n: "03",
    title: "침수",
    sub: "Gauge",
    question: "얼마나 촘촘한 원단이 좋으세요?",
    hint: "침수가 높을수록 실이 촘촘하게 짜여 고급스러운 질감이 나옵니다. 144침이 프리미엄, 168침이 스탠다드, 200침은 심리스 고기능 라인입니다.",
  },
  {
    n: "04",
    title: "원사",
    sub: "Yarn",
    question: "어떤 원사로 짜시겠어요?",
    hint: "면은 편안하고, 탁텔은 부드럽고 광택이 있으며, 파일은 두껍고 따뜻합니다. 용도에 맞는 원사를 선택하세요.",
  },
  {
    n: "05",
    title: "기능성",
    sub: "Features",
    question: "어떤 기능을 더해볼까요?",
    hint: "복수 선택 가능합니다. 무압박·항균·미끄럼방지·쿠션·발냄새 방지 등 필요한 기능을 자유롭게 조합하세요. ‘없음’을 누르면 초기화됩니다.",
  },
  {
    n: "06",
    title: "디자인",
    sub: "Design",
    question: "어떤 디자인으로 꾸밀까요?",
    hint: "무지부터 패턴, 자수·로고, 관광 테마까지. 디자인 유형에 따라 단가와 납기가 달라집니다.",
  },
  {
    n: "07",
    title: "색상",
    sub: "Colorway",
    question: "어떤 색상으로 염색할까요?",
    hint: "뉴트럴·파스텔·비비드·어스·주얼·시즌 6개 팔레트에서 메인과 포인트 색을 고르거나, 직접 HEX 코드를 입력할 수 있습니다. 오른쪽 미리보기가 실시간 반영됩니다.",
  },
  {
    n: "08",
    title: "패키징",
    sub: "Packaging",
    question: "어떻게 포장해 드릴까요?",
    hint: "기본 OPP 봉투부터 선물용 리본 포장, 브랜드 박스 맞춤 제작까지. 목적에 맞게 골라주세요.",
  },
  {
    n: "09",
    title: "수량",
    sub: "Quantity",
    question: "몇 켤레가 필요하세요?",
    hint: "1에서 500켤레까지 조절 가능합니다. 50켤레 이상 10%, 100켤레 이상 15%, B2B 100+ 20% 할인이 자동 적용됩니다.",
  },
  {
    n: "10",
    title: "AI 상담",
    sub: "Consult",
    question: "AI에게 무엇을 부탁하시겠어요?",
    hint: "원하는 분위기·캐릭터·착용 상황을 구체적으로 설명해주실수록 Claude Opus 4.7이 더 정교한 디자인 제안을 작성해드립니다.",
  },
] as const;

function hydrateInitial(): SelectionState {
  if (typeof window === "undefined") return INITIAL;
  try {
    const raw = sessionStorage.getItem("ai-seed");
    if (!raw) return INITIAL;
    sessionStorage.removeItem("ai-seed");
    const parsed = JSON.parse(raw) as Partial<SelectionState>;
    return {
      ...INITIAL,
      ...parsed,
      features: parsed.features ?? [],
      quantity: parsed.quantity ?? INITIAL.quantity,
      prompt: parsed.prompt ?? "",
    };
  } catch {
    return INITIAL;
  }
}

export default function StudioPage() {
  const { navigate } = useSlickNav();
  const [sel, setSel] = useState<SelectionState>(INITIAL);
  useEffect(() => {
    const seeded = hydrateInitial();
    if (seeded !== INITIAL) setSel(seeded);
  }, []);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const [aiText, setAiText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiProposal, setAiProposal] = useState<AIProposal | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [activeColorFamily, setActiveColorFamily] = useState<ColorFamily>(
    "neutral",
  );
  const [colorPickerTarget, setColorPickerTarget] = useState<
    "main" | "accent"
  >("main");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const embroideryUploadRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!previewRef.current || exporting) return;
    setExporting(true);
    try {
      await exportPreviewPng(previewRef.current, designFilename("png"));
      exportSelectionJson(sel, designFilename("json"));
    } catch {
      /* silently fail */
    } finally {
      setExporting(false);
    }
  }

  function readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  // Background removal via 4-corner flood fill. Only pixels CONNECTED to the
  // corners (and within the color threshold) are made transparent — so white
  // highlights INSIDE the subject (eyes, belly, etc.) stay opaque and the
  // sock color cannot bleed through them.
  function removeBackground(canvas: HTMLCanvasElement, threshold = 36): void {
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

    // Flood fill bg from each corner — iterative stack to avoid recursion limits.
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

    // Hard-clear visited bg pixels and softly feather the 1-px boundary so
    // the cutout edge is not jagged.
    for (let idx = 0; idx < w * h; idx++) {
      const i = idx * 4;
      if (visited[idx]) {
        d[i + 3] = 0;
        continue;
      }
      // Neighbour test for boundary pixels
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

  // After bg removal, trim the transparent margin so tiles are tight to the
  // visible subject. Without this, tiles inherit the source image's empty
  // padding and look far apart when repeated.
  function autoCropTransparent(canvas: HTMLCanvasElement, padding = 2): void {
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

  function resizeDataUrl(src: string, max: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
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

  async function processUpload(file: File | undefined): Promise<string | null> {
    setUploadError(null);
    if (!file) return null;
    if (!file.type.startsWith("image/")) {
      setUploadError("이미지 파일만 업로드할 수 있습니다.");
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("5MB 이하 이미지를 사용해주세요.");
      return null;
    }
    try {
      const raw = await readAsDataURL(file);
      return await resizeDataUrl(raw, 400);
    } catch {
      setUploadError("이미지를 불러올 수 없습니다.");
      return null;
    }
  }

  async function handlePatternUpload(file: File | undefined) {
    const url = await processUpload(file);
    if (!url || !file) return;
    setSel((s) => ({
      ...s,
      customPattern: url,
      customPatternName: file.name,
      patternStyle: "custom",
      customMode: s.customMode ?? "tile",
      design: s.design ?? "pattern",
    }));
  }

  async function handleLogoUpload(file: File | undefined) {
    const url = await processUpload(file);
    if (!url || !file) return;
    setSel((s) => ({
      ...s,
      customPattern: url,
      customPatternName: file.name,
    }));
  }

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      setTime(`${h}:${m}`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const quote = useMemo(() => calculateQuote(sel), [sel]);

  function patch<K extends keyof SelectionState>(k: K, v: SelectionState[K]) {
    setSel((s) => ({ ...s, [k]: v }));
  }

  function toggleFeature(f: Feature) {
    setSel((s) => {
      if (f === "none") return { ...s, features: ["none"] };
      const exists = s.features.includes(f);
      const without = s.features.filter((x) => x !== f && x !== "none");
      return { ...s, features: exists ? without : [...without, f] };
    });
  }

  function goNext() {
    if (step < STEPS.length - 1) {
      setDir("forward");
      setStep((s) => s + 1);
    }
  }
  function goPrev() {
    if (step > 0) {
      setDir("back");
      setStep((s) => s - 1);
    }
  }
  function goTo(i: number) {
    if (i === step) return;
    setDir(i > step ? "forward" : "back");
    setStep(i);
  }

  async function requestAI() {
    setAiError(null);
    setAiLoading(true);
    setAiText("");
    try {
      const res = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sel),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "AI 호출 실패" }));
        throw new Error(err.error ?? "AI 호출 실패");
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("스트림을 읽을 수 없습니다.");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAiText((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setAiLoading(false);
    }
  }

  async function requestAIApply() {
    setApplyError(null);
    setApplyLoading(true);
    setAiProposal(null);
    try {
      const res = await fetch("/api/design/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sel),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.proposal) {
        throw new Error(data?.error ?? "AI 자동 적용 실패");
      }
      const p = data.proposal as AIProposal;
      setAiProposal(p);
      setSel((s) => ({
        ...s,
        mainColor: p.mainColor,
        accentColor: p.accentColor,
        colorFamily: p.colorFamily,
        length: s.length ?? p.length,
        design: s.design ?? p.design,
        yarn: s.yarn ?? p.yarn,
      }));
      setActiveColorFamily(p.colorFamily);
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setApplyLoading(false);
    }
  }

  const selectionTags = useMemo(() => {
    const tags: string[] = [];
    if (sel.purpose) tags.push(LABELS.purpose[sel.purpose]);
    if (sel.length) tags.push(LABELS.length[sel.length]);
    if (sel.gauge) tags.push(LABELS.gauge[sel.gauge]);
    if (sel.yarn) tags.push(LABELS.yarn[sel.yarn]);
    sel.features.forEach((f) => tags.push(LABELS.feature[f]));
    if (sel.design) tags.push(LABELS.design[sel.design]);
    if (sel.design === "pattern" && sel.patternStyle) {
      tags.push(LABELS.patternStyle[sel.patternStyle]);
    }
    if (sel.colorFamily) tags.push(LABELS.colorFamily[sel.colorFamily]);
    if (sel.mainColor) {
      const name = ALL_SWATCHES.find(
        (s) => s.hex.toLowerCase() === sel.mainColor!.toLowerCase(),
      )?.name;
      tags.push(name ?? sel.mainColor.toUpperCase());
    }
    if (sel.packaging) tags.push(LABELS.packaging[sel.packaging]);
    tags.push(`${sel.quantity}켤레`);
    return tags;
  }, [sel]);

  const styleNumber = useMemo(() => {
    const seed = [
      sel.purpose,
      sel.length,
      sel.gauge,
      sel.yarn,
      sel.design,
      sel.colorFamily,
      sel.mainColor,
      sel.accentColor,
      sel.packaging,
    ]
      .filter(Boolean)
      .join("");
    let hash = 0;
    for (let i = 0; i < seed.length; i++)
      hash = (hash * 31 + seed.charCodeAt(i)) % 9999;
    return String(hash).padStart(4, "0");
  }, [sel]);

  const quantityPct = (sel.quantity / 500) * 100;
  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  // Per-step completion to enable "Next"
  const stepComplete = (() => {
    switch (step) {
      case 0: return !!sel.purpose;
      case 1: return !!sel.length;
      case 2: return !!sel.gauge;
      case 3: return !!sel.yarn;
      case 4: return sel.features.length > 0;
      case 5: return !!sel.design;
      case 6: return !!sel.mainColor;
      case 7: return !!sel.packaging;
      case 8: return sel.quantity > 0;
      default: return true;
    }
  })();

  function renderStepBody() {
    switch (step) {
      case 0:
        return (
          <OptionGrid>
            {PURPOSE_OPTIONS.map((o) => (
              <SelectCard
                key={o.value}
                label={o.label}
                desc={o.desc}
                active={sel.purpose === o.value}
                onClick={() => patch("purpose", o.value)}
              />
            ))}
          </OptionGrid>
        );
      case 1:
        return (
          <OptionGrid cols={3}>
            {LENGTH_OPTIONS.map((o) => (
              <SelectCard
                key={o.value}
                label={o.label}
                desc={o.desc}
                active={sel.length === o.value}
                onClick={() => patch("length", o.value)}
              />
            ))}
          </OptionGrid>
        );
      case 2:
        return (
          <OptionGrid cols={3}>
            {GAUGE_OPTIONS.map((o) => (
              <SelectCard
                key={o.value}
                label={o.label}
                desc={o.desc}
                meta={o.tier}
                active={sel.gauge === o.value}
                onClick={() => patch("gauge", o.value)}
              />
            ))}
          </OptionGrid>
        );
      case 3:
        return (
          <OptionGrid cols={3}>
            {YARN_OPTIONS.map((o) => (
              <SelectCard
                key={o.value}
                label={o.label}
                desc={o.desc}
                active={sel.yarn === o.value}
                onClick={() => patch("yarn", o.value)}
              />
            ))}
          </OptionGrid>
        );
      case 4:
        return (
          <OptionGrid cols={3}>
            {FEATURE_OPTIONS.map((o) => (
              <SelectCard
                key={o.value}
                label={o.label}
                desc={o.desc}
                active={sel.features.includes(o.value)}
                onClick={() => toggleFeature(o.value)}
                multi
              />
            ))}
          </OptionGrid>
        );
      case 5:
        return (
          <div>
            <OptionGrid>
              {DESIGN_OPTIONS.map((o) => (
                <SelectCard
                  key={o.value}
                  label={o.label}
                  desc={o.desc}
                  active={sel.design === o.value}
                  onClick={() => {
                    patch("design", o.value);
                    if (o.value === "pattern" && !sel.patternStyle) {
                      patch("patternStyle", "dot");
                    }
                  }}
                />
              ))}
            </OptionGrid>
            {sel.design === "pattern" && (
              <div className="mt-6 pt-6 border-t border-mute-200">
                <div className="flex items-baseline justify-between mb-4">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-crimson-500 font-mono">
                    Pattern Style
                  </div>
                  <div className="text-[11px] text-mute-400 font-light">
                    프린팅 종류를 골라주세요
                  </div>
                </div>
                <OptionGrid cols={3}>
                  {PATTERN_STYLE_OPTIONS.map((o) => (
                    <SelectCard
                      key={o.value}
                      label={o.label}
                      desc={o.desc}
                      active={sel.patternStyle === o.value}
                      onClick={() => {
                        if (o.value === "custom" && !sel.customPattern) {
                          uploadInputRef.current?.click();
                        } else {
                          patch("patternStyle", o.value);
                        }
                      }}
                    />
                  ))}
                </OptionGrid>

                {sel.patternStyle === "custom" && (
                  <div className="mt-4 space-y-3">
                    <div className="p-4 rounded-2xl border border-mute-200 bg-paper flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-xl border border-mute-200 bg-shell flex items-center justify-center overflow-hidden shrink-0"
                        style={{
                          backgroundImage: sel.customPattern
                            ? `url("${sel.customPattern}")`
                            : undefined,
                          backgroundSize: "contain",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                        }}
                      >
                        {!sel.customPattern && (
                          <span className="text-[10px] tracking-[0.2em] uppercase text-mute-400 font-mono">
                            NONE
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-ink truncate font-medium">
                          {sel.customPattern
                            ? sel.customPatternName ?? "uploaded.png"
                            : "내 로고·캐릭터·패턴 업로드"}
                        </div>
                        <div className="text-[11px] text-mute-400 font-light mt-1">
                          PNG/JPG/SVG · 최대 5MB · 자동 리사이즈
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => uploadInputRef.current?.click()}
                        className="text-[12px] tracking-wide px-3 py-1.5 rounded-full border border-ink hover:bg-ink hover:text-paper transition-colors"
                      >
                        {sel.customPattern ? "변경" : "업로드"}
                      </button>
                      {sel.customPattern && (
                        <button
                          type="button"
                          onClick={() => {
                            setSel((s) => ({
                              ...s,
                              customPattern: undefined,
                              customPatternName: undefined,
                            }));
                          }}
                          className="text-[12px] tracking-wide px-3 py-1.5 rounded-full border border-mute-300 text-mute-500 hover:border-crimson-500 hover:text-crimson-500 transition-colors"
                        >
                          제거
                        </button>
                      )}
                    </div>

                    {sel.customPattern && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] tracking-[0.3em] uppercase text-mute-400 font-mono mr-2">
                          Placement
                        </span>
                        {(["tile", "logo"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => patch("customMode", m)}
                            className={`text-[12px] tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
                              (sel.customMode ?? "tile") === m
                                ? "bg-ink text-paper border-ink"
                                : "border-mute-300 text-mute-500 hover:border-ink hover:text-ink"
                            }`}
                          >
                            {m === "tile" ? "타일 패턴" : "로고 (발목 중앙)"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {uploadError && (
                  <div className="mt-3 text-[12px] text-crimson-600">
                    {uploadError}
                  </div>
                )}

                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handlePatternUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
            )}

            {sel.design === "embroidery" && (
              <div className="mt-6 pt-6 border-t border-mute-200">
                <div className="flex items-baseline justify-between mb-4">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-crimson-500 font-mono">
                    My Logo
                  </div>
                  <div className="text-[11px] text-mute-400 font-light">
                    내 로고 이미지를 업로드하면 발목 중앙 자수에 그대로 반영됩니다
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-mute-200 bg-paper flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-xl border border-mute-200 bg-shell flex items-center justify-center overflow-hidden shrink-0"
                    style={{
                      backgroundImage: sel.customPattern
                        ? `url("${sel.customPattern}")`
                        : undefined,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                  >
                    {!sel.customPattern && (
                      <span className="serif-it text-[22px] text-ink">L</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-ink truncate font-medium">
                      {sel.customPattern
                        ? sel.customPatternName ?? "uploaded.png"
                        : "기본 자수 마크 (L) 사용 중"}
                    </div>
                    <div className="text-[11px] text-mute-400 font-light mt-1">
                      PNG/JPG/SVG · 최대 5MB · 자동 리사이즈
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => embroideryUploadRef.current?.click()}
                    className="text-[12px] tracking-wide px-3 py-1.5 rounded-full border border-ink hover:bg-ink hover:text-paper transition-colors"
                  >
                    {sel.customPattern ? "변경" : "업로드"}
                  </button>
                  {sel.customPattern && (
                    <button
                      type="button"
                      onClick={() => {
                        setSel((s) => ({
                          ...s,
                          customPattern: undefined,
                          customPatternName: undefined,
                        }));
                      }}
                      className="text-[12px] tracking-wide px-3 py-1.5 rounded-full border border-mute-300 text-mute-500 hover:border-crimson-500 hover:text-crimson-500 transition-colors"
                    >
                      제거
                    </button>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <Dial
                    value={sel.logoScale ?? 1}
                    min={0.5}
                    max={2.5}
                    step={0.1}
                    onChange={(v) => patch("logoScale", v)}
                  />
                  <div className="flex flex-col gap-1">
                    <div className="text-[9px] uppercase tracking-[0.3em] font-mono text-mute-400">
                      Logo Size
                    </div>
                    <div className="font-mono text-[20px] text-ink tabular leading-none">
                      {(sel.logoScale ?? 1).toFixed(1)}
                      <span className="text-mute-400 text-[14px] ml-0.5">×</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => patch("logoScale", 1)}
                      disabled={(sel.logoScale ?? 1) === 1}
                      className="text-[10px] tracking-[0.2em] uppercase text-mute-500 hover:text-ink disabled:opacity-40 mt-1 self-start"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {uploadError && (
                  <div className="mt-3 text-[12px] text-crimson-600">
                    {uploadError}
                  </div>
                )}

                <input
                  ref={embroideryUploadRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleLogoUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
            )}

            {/* Text overlay — available for any design type */}
            <div className="mt-6 pt-6 border-t border-mute-200">
              <div className="flex items-baseline justify-between mb-4">
                <div className="text-[10px] tracking-[0.3em] uppercase text-crimson-500 font-mono">
                  Add Text
                </div>
                <div className="text-[11px] text-mute-400 font-light">
                  문구를 입력하면 미리보기에서 드래그·회전·크기 조절이 가능해요
                </div>
              </div>

              <input
                type="text"
                value={sel.text ?? ""}
                onChange={(e) => patch("text", e.target.value)}
                maxLength={32}
                placeholder="Love, 2026 · HELLO · 이름 등 (최대 32자)"
                className="w-full px-4 py-3 rounded-2xl border border-mute-200 bg-paper text-[15px] focus:outline-none focus:border-ink placeholder:text-mute-300"
              />

              {sel.text && sel.text.trim() && (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] uppercase tracking-[0.25em] font-mono text-mute-400 self-center mr-1">
                      Font
                    </span>
                    {FONT_OPTIONS.map((f) => {
                      const active = (sel.textFont ?? "serif") === f.value;
                      return (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => patch("textFont", f.value)}
                          className={`px-4 py-2 rounded-xl border transition-colors text-[15px] ${
                            active
                              ? "border-ink bg-paper text-ink"
                              : "border-mute-200 bg-paper/70 text-mute-500 hover:border-ink/60"
                          }`}
                          style={{
                            fontFamily: f.family,
                            fontStyle: f.italic ? "italic" : "normal",
                          }}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4">
                    <Dial
                      value={sel.textScale ?? 1}
                      min={0.5}
                      max={2.5}
                      step={0.1}
                      onChange={(v) => patch("textScale", v)}
                    />
                    <div className="flex flex-col gap-1">
                      <div className="text-[9px] uppercase tracking-[0.3em] font-mono text-mute-400">
                        Text Size
                      </div>
                      <div className="font-mono text-[20px] text-ink tabular leading-none">
                        {(sel.textScale ?? 1).toFixed(1)}
                        <span className="text-mute-400 text-[14px] ml-0.5">
                          ×
                        </span>
                      </div>
                      <div className="text-[11px] text-mute-400 font-light">
                        미리보기에서 텍스트 상단의 빨간 점을 잡고 드래그하면
                        각도를 조절할 수 있어요.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 6:
        return (
          <ColorPicker
            sel={sel}
            activeFamily={activeColorFamily}
            setActiveFamily={setActiveColorFamily}
            target={colorPickerTarget}
            setTarget={setColorPickerTarget}
            onPick={(hex) => {
              if (colorPickerTarget === "main") {
                patch("mainColor", hex);
                const fam = findFamilyForHex(hex);
                if (fam) {
                  patch("colorFamily", fam);
                  setActiveColorFamily(fam);
                }
              } else {
                patch("accentColor", hex);
              }
            }}
          />
        );
      case 7:
        return (
          <OptionGrid cols={3}>
            {PACKAGING_OPTIONS.map((o) => (
              <SelectCard
                key={o.value}
                label={o.label}
                desc={o.desc}
                active={sel.packaging === o.value}
                onClick={() => patch("packaging", o.value)}
              />
            ))}
          </OptionGrid>
        );
      case 8:
        return (
          <div>
            <div className="flex items-baseline justify-between mb-10">
              <div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-mute-400 font-mono mb-3">
                  Current
                </div>
                <div className="flex items-baseline">
                  <span className="serif font-normal text-[84px] md:text-[96px] leading-[0.9] tabular tracking-tightest">
                    {sel.quantity}
                  </span>
                  <span className="serif-it text-crimson-500 text-4xl leading-none ml-1">
                    .
                  </span>
                  <span className="ml-3 text-sm text-mute-400">켤레</span>
                </div>
              </div>
              <div className="text-right text-[11px] tracking-[0.22em] uppercase text-mute-400 font-mono leading-[1.9]">
                <div>50 · 10% off</div>
                <div>100 · 15% off</div>
                <div className="text-crimson-500">B2B · 20% off</div>
              </div>
            </div>

            <input
              type="range"
              min={1}
              max={500}
              value={sel.quantity}
              onChange={(e) => patch("quantity", Number(e.target.value))}
              className="crimson-range"
              style={{ ["--pct" as string]: `${quantityPct}%` }}
            />

            <div className="flex justify-between text-[10px] tracking-[0.25em] uppercase font-mono text-mute-400 mt-3 tabular">
              <span>1</span>
              <span>100</span>
              <span>250</span>
              <span>500</span>
            </div>

            <div className="mt-8 flex gap-2 flex-wrap">
              {[10, 30, 50, 100, 300].map((q) => (
                <button
                  key={q}
                  onClick={() => patch("quantity", q)}
                  className={`px-4 py-1.5 text-[12px] tracking-wide rounded-full border transition-colors tabular ${
                    sel.quantity === q
                      ? "bg-ink text-paper border-ink"
                      : "border-mute-200 text-mute-500 hover:border-ink hover:text-ink"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        );
      case 9:
        return (
          <div className="rounded-2xl bg-ink text-paper overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="text-[10px] tracking-[0.3em] uppercase text-crimson-400 font-mono mb-5">
                — Claude Opus 4.7
              </div>
              <textarea
                rows={4}
                value={sel.prompt}
                maxLength={500}
                onChange={(e) => patch("prompt", e.target.value)}
                placeholder="원하는 양말을 자유롭게 설명해주세요.  예) 귀여운 고양이 얼굴이 들어간 핑크색 중목 양말."
                className="w-full text-[16px] leading-[1.7] bg-transparent outline-none resize-none placeholder:text-mute-400/70 text-paper font-light"
              />
            </div>
            <div className="border-t border-mute-500/30 px-6 md:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-[11px] tracking-wider text-mute-400 font-mono tabular">
                {sel.prompt.length} · 500
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={requestAIApply}
                  disabled={applyLoading || aiLoading}
                  className="group inline-flex items-center gap-3 text-[13px] tracking-wide bg-crimson-500 text-paper rounded-full pl-4 pr-2 py-1.5 hover:bg-crimson-600 disabled:opacity-50 disabled:cursor-wait transition-colors"
                >
                  <span>
                    {applyLoading ? "Applying…" : "AI 자동 디자인"}
                  </span>
                  <span className="w-6 h-6 rounded-full bg-paper/20 flex items-center justify-center">
                    <span className="serif-it not-italic leading-none translate-y-[-1px]">
                      ✦
                    </span>
                  </span>
                </button>
                <button
                  onClick={requestAI}
                  disabled={aiLoading || applyLoading}
                  className="group inline-flex items-center gap-3 text-[14px] text-paper transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <span>
                    {aiLoading ? "Composing…" : "Request AI proposal"}
                  </span>
                  <span className="w-8 h-8 rounded-full border border-paper/70 flex items-center justify-center group-hover:bg-crimson-500 group-hover:border-crimson-500 transition-colors">
                    <span className="serif-it not-italic leading-none translate-y-[-1px]">
                      →
                    </span>
                  </span>
                </button>
              </div>
            </div>
            {(aiProposal || applyError) && (
              <div className="border-t border-mute-500/30 px-6 md:px-8 py-4 text-[13px] text-paper/80 leading-[1.75]">
                {applyError ? (
                  <span className="text-crimson-400">
                    [자동 적용 오류] {applyError}
                  </span>
                ) : aiProposal ? (
                  <>
                    <div className="text-[10px] tracking-[0.3em] uppercase text-crimson-400 font-mono mb-2">
                      Applied · {aiProposal.concept}
                    </div>
                    <div className="font-light">{aiProposal.rationale}</div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ════════════════ NAV ════════════════ */}
      <header className="sticky top-0 z-40 bg-crimson-500 text-paper">
        <div className="max-w-[1480px] mx-auto px-6 md:px-10 py-5 flex items-center justify-between border-b border-crimson-600/50">
          <button
            onClick={() => navigate("/")}
            className="flex items-baseline gap-2"
          >
            <span className="serif-it text-[24px] text-paper leading-none translate-y-[1px]">
              Lovelysocks
            </span>
            <span className="text-[11px] tracking-[0.3em] text-paper/60 font-mono uppercase">
              House
            </span>
          </button>
          <nav className="hidden md:flex items-center gap-10 text-[13px] text-paper/80">
            <a className="uline hover:text-paper">Studio</a>
            <a className="uline hover:text-paper">Archive</a>
            <a className="uline hover:text-paper">Process</a>
            <a className="uline hover:text-paper">Contact</a>
            <span className="w-px h-4 bg-paper/30 mx-2" />
            <button onClick={() => navigate("/")} className="uline text-paper">
              ← Back
            </button>
          </nav>
          <div className="md:hidden text-[11px] tracking-widest text-paper/70 font-mono tabular">
            {time}
          </div>
        </div>
      </header>

      {/* ════════════════ STUDIO INTRO ════════════════ */}
      <section className="max-w-[1480px] mx-auto px-6 md:px-10 pt-10 md:pt-14 pb-8 md:pb-10 enter">
        <div className="hidden md:flex items-center justify-between text-[11px] tracking-[0.3em] uppercase text-mute-400 font-mono pb-8">
          <span>Design Studio</span>
          <span className="text-ink">10 Step Composition</span>
          <span className="tabular">{time} KST</span>
        </div>
        <div className="grid grid-cols-12 gap-6 md:gap-12 items-end">
          <div className="col-span-12 md:col-span-8">
            <h1 className="serif font-normal text-[40px] md:text-[72px] leading-[0.96] tracking-tightest text-ink">
              Design your{" "}
              <span className="serif-it text-crimson-500">pair</span>
              <span className="text-crimson-500">.</span>
            </h1>
          </div>
          <div className="col-span-12 md:col-span-4 text-[13.5px] leading-[1.75] text-mute-500 font-light">
            단계별로 옵션을 선택하세요. 오른쪽 스펙 카드와 견적이 실시간으로
            반영됩니다.
          </div>
        </div>
      </section>

      {/* ════════════════ WORKSPACE ════════════════ */}
      <main className="relative max-w-[1480px] mx-auto px-6 md:px-10 pb-32 grid grid-cols-12 gap-6 md:gap-10 enter enter-d1">
        {/* ── LEFT: Wizard card with pagination ── */}
        <section className="col-span-12 md:col-span-7">
          <div className="rounded-[28px] bg-shell border border-mute-200 shadow-card overflow-hidden">
            {/* Top meta + progress */}
            <div className="px-7 md:px-10 pt-7 md:pt-9">
              <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.3em] uppercase">
                <div className="flex items-center gap-3">
                  <span className="text-crimson-500 tabular">Step {current.n}</span>
                  <span className="text-mute-300">/</span>
                  <span className="text-mute-400">10</span>
                  <span className="inline-block w-6 h-px bg-mute-200" />
                  <span className="text-ink">{current.sub}</span>
                </div>
                <span className="text-mute-400">{current.title}</span>
              </div>

              {/* Progress bar */}
              <div className="mt-5 h-[2px] bg-mute-200 overflow-hidden">
                <div
                  className="h-full bg-crimson-500 transition-[width] duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Step body — animated on step change */}
            <div
              key={step}
              className={`px-7 md:px-10 pt-9 md:pt-12 pb-9 md:pb-10 ${
                dir === "forward" ? "step-forward" : "step-back"
              }`}
            >
              <div className="mb-8">
                <h2 className="font-sans font-light text-[26px] md:text-[36px] leading-[1.15] tracking-tightest text-ink max-w-[600px]">
                  {current.question}
                </h2>
                <p className="text-[13.5px] md:text-[14.5px] text-mute-400 mt-4 font-light leading-[1.75] max-w-[580px]">
                  {current.hint}
                </p>
              </div>

              {renderStepBody()}
            </div>

            {/* Pagination footer */}
            <div className="border-t border-mute-200 bg-paper/60 px-7 md:px-10 py-5 flex items-center justify-between gap-6">
              <button
                onClick={goPrev}
                disabled={step === 0}
                className="group flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="w-9 h-9 rounded-full border border-mute-300 group-hover:border-ink flex items-center justify-center transition-colors">
                  <span className="text-[15px] leading-none translate-y-[-1px]">
                    ←
                  </span>
                </span>
                <span className="text-[12px] tracking-[0.22em] uppercase text-mute-500 group-hover:text-ink transition-colors font-mono">
                  Previous
                </span>
              </button>

              {/* Step dots */}
              <div className="hidden md:flex items-center gap-2">
                {STEPS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Go to step ${s.n}`}
                    className={`h-[3px] rounded-full transition-all duration-500 ${
                      i === step
                        ? "w-10 bg-crimson-500"
                        : i < step
                          ? "w-5 bg-ink/60 hover:bg-ink"
                          : "w-2.5 bg-mute-300 hover:bg-mute-400"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={goNext}
                disabled={step === STEPS.length - 1 || !stepComplete}
                className="group flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="text-[12px] tracking-[0.22em] uppercase text-mute-500 group-hover:text-ink transition-colors font-mono">
                  {step === STEPS.length - 1 ? "Final" : "Next"}
                </span>
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    step === STEPS.length - 1 || !stepComplete
                      ? "bg-mute-200 text-mute-400"
                      : "bg-ink text-paper group-hover:bg-crimson-500"
                  }`}
                >
                  <span className="text-[15px] leading-none translate-y-[-1px]">
                    →
                  </span>
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ── RIGHT: sticky spec + quote + AI ── */}
        <aside className="col-span-12 md:col-span-5">
          <div className="md:sticky md:top-24 space-y-6">
            {/* Tech Pack */}
            <div className="rounded-[28px] bg-shell border border-mute-200 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-6 md:px-8 pt-6 pb-4 border-b border-mute-200">
                <div className="text-[10px] tracking-[0.3em] uppercase text-mute-400 font-mono">
                  Spec Sheet · A
                </div>
                <div className="text-[11px] tracking-[0.22em] uppercase text-ink font-mono tabular">
                  No. {styleNumber}
                </div>
              </div>
              <div className="px-4 md:px-6 pt-2 pb-4">
                <SockPreview sel={sel} previewRef={previewRef} />
              </div>
              <div className="grid grid-cols-3 border-t border-mute-200">
                <SpecCell
                  label="Length"
                  value={sel.length ? LABELS.length[sel.length] : "—"}
                />
                <SpecCell
                  label="Gauge"
                  value={sel.gauge ? `${sel.gauge} N` : "—"}
                />
                <SpecCell
                  label="Yarn"
                  value={sel.yarn ? LABELS.yarn[sel.yarn] : "—"}
                  last
                />
              </div>
              <div className="border-t border-mute-200 px-6 md:px-8 py-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-mute-400 font-mono mb-3">
                    Composition
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-[13px] text-mute-500">
                    {selectionTags.length === 0 ? (
                      <span className="text-mute-300">옵션을 선택해주세요</span>
                    ) : (
                      selectionTags.map((t, i) => (
                        <span key={i} className="inline-flex items-baseline">
                          {i > 0 && <span className="text-mute-300 mr-2">·</span>}
                          <span>{t}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  title="프리뷰 PNG + 스펙 JSON 다운로드"
                  className="mt-4 shrink-0 h-9 inline-flex items-center gap-2 px-3 rounded-lg border border-ink text-ink hover:bg-ink hover:text-paper disabled:opacity-40 text-[11px] tracking-[0.22em] uppercase font-medium transition-colors"
                >
                  {exporting ? (
                    <span className="w-3 h-3 rounded-full border-2 border-ink/30 border-t-ink animate-spin" />
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Quote */}
            <div className="rounded-[28px] bg-ink text-paper overflow-hidden">
              <div className="px-7 md:px-8 pt-7 md:pt-8 pb-9">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-crimson-400 font-mono">
                    Estimate
                  </div>
                  <div className="text-[10px] tracking-[0.22em] uppercase text-mute-300 font-mono">
                    Auto
                  </div>
                </div>

                {quote ? (
                  <>
                    <div className="serif font-normal text-[56px] md:text-[72px] leading-[0.9] tabular tracking-tightest">
                      {formatWon(quote.total)}
                    </div>
                    <div className="text-[12px] text-mute-300 mt-3 font-mono tracking-wide tabular">
                      {formatWon(quote.unitPrice)} × {sel.quantity}
                      {quote.discountRate > 0 && (
                        <span className="ml-2 serif-it text-crimson-400">
                          − {Math.round(quote.discountRate * 100)}%
                        </span>
                      )}
                    </div>

                    <dl className="mt-8 space-y-3 text-[13px]">
                      <Row label="Unit" value={formatWon(quote.unitPrice)} />
                      <Row
                        label="Subtotal"
                        value={formatWon(quote.subtotal)}
                      />
                      {quote.discountAmount > 0 && (
                        <Row
                          label={`Discount ${Math.round(quote.discountRate * 100)}%`}
                          value={`− ${formatWon(quote.discountAmount)}`}
                          accent
                        />
                      )}
                      <div className="h-px bg-mute-500/40 my-2" />
                      <Row label="Total" value={formatWon(quote.total)} bold />
                      <Row label="Lead time" value={quote.leadTimeDays} />
                      <Row label="Production" value={quote.production} small />
                    </dl>
                  </>
                ) : (
                  <div className="text-[14px] text-mute-300 py-6 leading-[1.75] font-light">
                    길이 · 침수 · 원사 · 디자인 · 패키징을 모두 고르면 실시간
                    견적이 여기에 표시됩니다.
                  </div>
                )}

                <button
                  disabled={!quote}
                  className="group w-full mt-8 py-4 border-t border-mute-500/30 flex items-center justify-between text-[13.5px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="tracking-wide">주문 상담 신청</span>
                  <span className="inline-flex items-center gap-2">
                    <span className="serif-it text-crimson-400">Continue</span>
                    <span className="w-6 h-6 rounded-full border border-mute-500/50 flex items-center justify-center group-hover:bg-crimson-500 group-hover:border-crimson-500 transition-colors">
                      →
                    </span>
                  </span>
                </button>
              </div>
            </div>

            {/* Director's Note */}
            <div className="rounded-[28px] bg-shell border border-mute-200 shadow-card">
              <div className="p-7 md:p-8">
                <div className="flex items-start justify-between mb-5">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-crimson-500 font-mono">
                    Director’s Note
                  </div>
                  {aiLoading && (
                    <div className="text-[11px] tracking-wide text-mute-400 font-mono animate-pulse">
                      streaming
                    </div>
                  )}
                </div>

                {aiError && (
                  <div className="text-[13px] text-crimson-600 bg-crimson-50 border border-crimson-100 px-4 py-3 rounded-lg">
                    {aiError}
                  </div>
                )}

                {!aiText && !aiLoading && !aiError && (
                  <div className="text-[14px] text-mute-500 leading-[1.85] font-light">
                    <span className="serif-it text-crimson-500 text-xl leading-none pr-1">
                      “
                    </span>
                    옵션을 모두 고른 뒤 10단계에서{" "}
                    <span className="text-ink">AI 제안 받기</span>를 누르면,
                    Claude Opus 4.7이 디자인 컨셉 · 색상 조합 · 원사 추천 ·
                    제작 포인트를 실시간으로 작성해드립니다.
                    <span className="serif-it text-crimson-500 text-xl leading-none pl-1">
                      ”
                    </span>
                  </div>
                )}

                {(aiText || aiLoading) && (
                  <div
                    className={`text-[14px] leading-[1.9] text-mute-500 whitespace-pre-wrap font-light ${
                      aiLoading ? "cursor-blink" : ""
                    }`}
                  >
                    {renderMarkdownish(aiText)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Subcomponents
   ═══════════════════════════════════════════ */

function OptionGrid({
  children,
  cols = 2,
}: {
  children: React.ReactNode;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={`grid gap-3 ${
        cols === 3
          ? "grid-cols-1 sm:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2"
      }`}
    >
      {children}
    </div>
  );
}

function SelectCard({
  label,
  desc,
  meta,
  active,
  onClick,
  multi,
  swatch,
}: {
  label: string;
  desc: string;
  meta?: string;
  active?: boolean;
  onClick: () => void;
  multi?: boolean;
  swatch?: string[];
}) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left p-5 rounded-2xl border transition-all duration-300 lift ${
        active
          ? "border-ink bg-paper"
          : "border-mute-200 bg-paper hover:border-ink/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          {meta && (
            <div className="text-[10px] tracking-[0.3em] uppercase text-crimson-500 font-mono mb-2">
              {meta}
            </div>
          )}
          <div className="font-sans font-medium text-[16px] leading-none tracking-tighter text-ink">
            {label}
          </div>
        </div>
        <div
          className={`shrink-0 w-4 h-4 rounded-full border transition-all duration-300 ${
            active
              ? "border-crimson-500 bg-crimson-500"
              : "border-mute-300"
          }`}
        />
      </div>
      <div className="text-[12px] text-mute-400 leading-[1.55] font-light">
        {desc}
      </div>
      {swatch && (
        <div className="flex gap-1.5 mt-4 pt-3 border-t border-mute-100">
          {swatch.map((c, i) => (
            <span
              key={i}
              className="w-5 h-5 rounded-full"
              style={{
                backgroundColor: c,
                outline: "1px solid rgba(0,0,0,0.04)",
              }}
            />
          ))}
        </div>
      )}
    </button>
  );
}

function SpecCell({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className={`px-6 py-5 ${last ? "" : "border-r border-mute-200"}`}>
      <div className="text-[9px] tracking-[0.3em] uppercase text-mute-400 font-mono mb-2">
        {label}
      </div>
      <div className="font-sans font-medium text-[16px] tracking-tighter text-ink">
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
  small,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt
        className={`${
          small ? "text-[10px]" : "text-[11px]"
        } tracking-[0.24em] uppercase text-mute-300 font-mono`}
      >
        {label}
      </dt>
      <dd
        className={`text-right tabular ${
          bold
            ? "serif font-normal text-[20px] tracking-tightest text-paper"
            : "text-[13px] text-paper font-light"
        } ${accent ? "text-crimson-400 serif-it" : ""} ${
          small ? "text-[11px] text-mute-300" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Dial({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{ startAngle: number; startValue: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);

  const range = max - min;
  // Map value → visual rotation. Sweep covers ~280° (from −140° to +140°),
  // with min at 7-o'clock and max at 5-o'clock.
  const sweep = 280;
  const rotation = -sweep / 2 + ((value - min) / range) * sweep;

  function angleAt(clientX: number, clientY: number): number {
    const rect = ref.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  }

  function startDrag(e: React.MouseEvent | React.TouchEvent) {
    const pt = "touches" in e ? e.touches[0] : (e as React.MouseEvent);
    stateRef.current = {
      startAngle: angleAt(pt.clientX, pt.clientY),
      startValue: value,
    };
    setDragging(true);
    if ("preventDefault" in e) e.preventDefault();
  }

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!stateRef.current) return;
      const pt = "touches" in e ? e.touches[0] : (e as MouseEvent);
      let a = angleAt(pt.clientX, pt.clientY);
      let delta = a - stateRef.current.startAngle;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      let next = stateRef.current.startValue + (delta / sweep) * range;
      next = Math.max(min, Math.min(max, next));
      next = Math.round(next / step) * step;
      next = +next.toFixed(2);
      onChange(next);
      if (e.cancelable) e.preventDefault();
    };
    const onUp = () => {
      stateRef.current = null;
      setDragging(false);
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
  }, [dragging, min, max, range, step, onChange]);

  return (
    <div
      ref={ref}
      onMouseDown={startDrag}
      onTouchStart={startDrag}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      className="relative w-16 h-16 rounded-full select-none"
      style={{
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
        background:
          "radial-gradient(circle at 30% 30%, #ffffff, #e6dfd1 70%, #c9c3b6)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.6) inset, 0 -1px 2px rgba(0,0,0,0.06) inset, 0 2px 6px rgba(0,0,0,0.12)",
      }}
    >
      {/* Tick marks around the dial */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 64 64"
      >
        {Array.from({ length: 11 }).map((_, i) => {
          const a = -sweep / 2 + (i / 10) * sweep;
          const rad = ((a - 90) * Math.PI) / 180;
          const r1 = 30;
          const r2 = i % 5 === 0 ? 26 : 28;
          const x1 = 32 + Math.cos(rad) * r1;
          const y1 = 32 + Math.sin(rad) * r1;
          const x2 = 32 + Math.cos(rad) * r2;
          const y2 = 32 + Math.sin(rad) * r2;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#9a958b"
              strokeWidth={i === 5 ? 1.2 : 0.7}
              opacity={i === 5 ? 0.85 : 0.55}
            />
          );
        })}
      </svg>

      {/* Indicator notch */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: 0,
          height: 0,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          transition: dragging ? undefined : "transform 0.18s ease-out",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -1.5,
            top: -22,
            width: 3,
            height: 12,
            borderRadius: 2,
            background: "#d7263d",
            boxShadow: "0 0 4px rgba(215,38,61,0.4)",
          }}
        />
      </div>

      {/* Center cap */}
      <div
        className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full"
        style={{
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle at 30% 30%, #545454, #1a1a1a)",
        }}
      />
    </div>
  );
}

function ColorPicker({
  sel,
  activeFamily,
  setActiveFamily,
  target,
  setTarget,
  onPick,
}: {
  sel: SelectionState;
  activeFamily: ColorFamily;
  setActiveFamily: (f: ColorFamily) => void;
  target: "main" | "accent";
  setTarget: (t: "main" | "accent") => void;
  onPick: (hex: string) => void;
}) {
  const family = COLOR_FAMILIES.find((f) => f.value === activeFamily)!;
  const current = target === "main" ? sel.mainColor : sel.accentColor;

  return (
    <div>
      {/* Main / Accent toggle */}
      <div className="flex items-center gap-2 mb-5">
        {(["main", "accent"] as const).map((t) => {
          const val = t === "main" ? sel.mainColor : sel.accentColor;
          const active = target === t;
          return (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                active
                  ? "border-ink bg-paper"
                  : "border-mute-200 bg-paper/50 hover:border-ink/60"
              }`}
            >
              <span
                className="w-7 h-7 rounded-full border border-mute-200 shrink-0"
                style={{
                  backgroundColor: val ?? "#ffffff",
                  backgroundImage: val
                    ? undefined
                    : "repeating-linear-gradient(45deg, #eee 0 4px, #fff 4px 8px)",
                }}
              />
              <div className="text-left min-w-0">
                <div className="text-[10px] tracking-[0.3em] uppercase text-mute-400 font-mono">
                  {t === "main" ? "Main" : "Accent"}
                </div>
                <div className="font-mono text-[12px] text-ink tabular truncate">
                  {val ? val.toUpperCase() : "미지정"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Family tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {COLOR_FAMILIES.map((f) => {
          const active = activeFamily === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setActiveFamily(f.value)}
              className={`px-3 py-1.5 rounded-full text-[11px] tracking-[0.18em] uppercase font-mono transition-colors border ${
                active
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper text-mute-500 border-mute-200 hover:border-ink"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="text-[12px] text-mute-400 mb-3 font-light">
        {family.desc}
      </div>

      {/* Swatch grid */}
      <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 mb-5">
        {family.swatches.map((s) => {
          const isCurrent = current?.toLowerCase() === s.hex.toLowerCase();
          return (
            <button
              key={s.hex}
              onClick={() => onPick(s.hex)}
              title={`${s.name} · ${s.hex}`}
              className={`group relative aspect-square rounded-xl border transition-all ${
                isCurrent
                  ? "border-ink scale-[1.06] shadow-card"
                  : "border-mute-200 hover:border-ink/60"
              }`}
              style={{
                backgroundColor: s.hex,
                outline: "1px solid rgba(0,0,0,0.04)",
              }}
            >
              <span className="sr-only">{s.name}</span>
              {isCurrent && (
                <span className="absolute inset-0 flex items-center justify-center text-[14px] leading-none">
                  <span
                    className="inline-block w-4 h-4 rounded-full border-2 border-paper"
                    style={{
                      background:
                        "rgba(14,14,14,0.92)",
                    }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* HEX input */}
      <div className="flex items-center gap-3 pt-4 border-t border-mute-200">
        <div className="text-[10px] tracking-[0.3em] uppercase text-mute-400 font-mono">
          HEX
        </div>
        <input
          type="text"
          value={current ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onPick(v);
            else if (v === "") onPick("");
          }}
          placeholder="#000000"
          className="flex-1 font-mono text-[13px] tabular px-3 py-2 rounded-lg border border-mute-200 focus:outline-none focus:border-ink"
        />
        <input
          type="color"
          value={current ?? "#ffffff"}
          onChange={(e) => onPick(e.target.value)}
          className="w-9 h-9 rounded-lg border border-mute-200 cursor-pointer bg-paper p-0"
        />
      </div>
    </div>
  );
}

function renderMarkdownish(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong
          key={i}
          className="font-sans font-medium text-ink text-[15px] tracking-tighter block mt-6 mb-2 first:mt-0"
        >
          <span className="serif-it text-crimson-500 mr-2">—</span>
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}
