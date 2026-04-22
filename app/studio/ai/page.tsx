"use client";

import { useEffect, useRef, useState } from "react";
import { SockPreview } from "@/components/SockPreview";
import { useSlickNav } from "@/components/TransitionProvider";
import type { SelectionState } from "@/lib/types";
import { processPatternImage } from "@/lib/imageTools";
import {
  designFilename,
  exportPreviewPng,
  exportSelectionJson,
} from "@/lib/exportDesign";

type ChatMsg = { role: "user" | "assistant"; content: string };

const INITIAL_SELECTION: SelectionState = {
  features: [],
  quantity: 30,
  prompt: "",
};

const EXAMPLES = [
  "겨울용 딸기 캐릭터 단목 양말, 파스텔 핑크",
  "런닝용 블랙 덧신, 형광 옐로우 포인트",
  "선물용 자수 로고 중목, 네이비 × 크림",
];

export default function AIStudioPage() {
  const { navigate } = useSlickNav();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [selection, setSelection] = useState<SelectionState>(INITIAL_SELECTION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || loading) return;
    setError(null);
    const nextMessages: ChatMsg[] = [
      ...messages,
      { role: "user", content: prompt },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          currentSelection: stripBigFields(selection),
        }),
      });

      // Vercel / the Node runtime can return a non-JSON HTML error page
      // when the function times out, crashes, or the env var is missing.
      // Read as text first and only then attempt JSON parse so the UI
      // can show a meaningful message instead of a parser error.
      const raw = await res.text();
      let data: { error?: string; message?: string; selection?: Partial<SelectionState> } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        const hint = res.status === 504 || res.status === 408
          ? "함수 실행 시간이 초과됐어요. Vercel Pro 플랜으로 업그레이드하거나, 이미지 생성이 필요 없는 요청으로 먼저 확인해보세요."
          : res.status === 500
            ? "서버 설정을 확인해주세요 — Vercel 프로젝트에 OPENAI_API_KEY 환경변수가 설정되어 있어야 합니다."
            : "서버 응답이 JSON이 아닙니다.";
        throw new Error(`${hint} (status ${res.status})`);
      }
      if (!res.ok) throw new Error(data?.error ?? `AI 호출 실패 (status ${res.status})`);

      const message: string = data.message ?? "";
      const applied: Partial<SelectionState> = data.selection ?? {};

      // Post-process AI imagery:
      // - tile/logo: strip white bg so the motif tiles cleanly (existing).
      // - fill: gpt-image-2 frequently returns the scene inside a wide
      //   white border despite explicit "no border" instructions, which
      //   makes the sock render as mostly main-color with a tiny
      //   center-bottom strip of scene. 4-corner flood fill trims those
      //   borders without touching white parts inside the scene (clouds,
      //   snow, penguin belly) because those aren't reachable from the
      //   corners. A bigger max dimension keeps the scene detailed.
      if (applied.customPattern) {
        try {
          const max = applied.customMode === "fill" ? 1200 : 512;
          applied.customPattern = await processPatternImage(
            applied.customPattern,
            max,
          );
        } catch {
          /* keep the raw image if canvas processing fails */
        }
      }

      setSelection((prev) => ({ ...prev, ...applied }));
      setMessages((m) => [...m, { role: "assistant", content: message }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(msg);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!previewRef.current || exporting) return;
    setExporting(true);
    try {
      await exportPreviewPng(previewRef.current, designFilename("png", "ai"));
      exportSelectionJson(selection, designFilename("json", "ai"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "내보내기 실패");
    } finally {
      setExporting(false);
    }
  }

  function goToManualStudio() {
    try {
      sessionStorage.setItem("ai-seed", JSON.stringify(selection));
    } catch {
      /* ignore quota errors */
    }
    navigate("/studio/manual");
  }

  const hasDesign =
    !!selection.length || !!selection.mainColor || !!selection.design;

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-crimson-500 text-paper">
        <div className="max-w-[1480px] mx-auto px-6 md:px-10 py-5 flex items-center justify-between border-b border-crimson-600/50">
          <button
            onClick={() => navigate("/studio")}
            className="flex items-center gap-3 text-[13px] text-paper/90 hover:text-paper"
          >
            <span>←</span>
            <span className="tracking-[0.2em] uppercase font-mono text-[11px]">
              Back
            </span>
          </button>
          <div className="text-[11px] tracking-[0.3em] text-paper/80 font-mono uppercase">
            AI Studio · GPT-5.4
          </div>
          <button
            onClick={goToManualStudio}
            disabled={!hasDesign}
            className="text-[12px] tracking-[0.15em] uppercase font-medium text-paper disabled:opacity-40 hover:text-crimson-200 transition-colors"
          >
            세부 조정 →
          </button>
        </div>
      </header>

      <section className="flex-1 max-w-[1480px] w-full mx-auto px-6 md:px-10 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 lg:gap-12 min-h-0">
        {/* LEFT — chat */}
        <div className="flex flex-col min-h-0 rounded-3xl border border-mute-200 bg-shell overflow-hidden">
          <div className="px-6 py-5 border-b border-mute-200 flex items-center justify-between bg-paper/50">
            <div>
              <div className="text-[10px] tracking-[0.32em] uppercase text-crimson-500 font-mono">
                01 — Describe
              </div>
              <div className="serif text-[22px] leading-none mt-2">
                원하는 양말을{" "}
                <span className="serif-it text-crimson-500">말해주세요</span>
              </div>
            </div>
            <span className="text-[9px] tracking-[0.3em] uppercase text-mute-400 font-mono">
              Chat · Iterate
            </span>
          </div>

          <div
            ref={scrollerRef}
            className="flex-1 overflow-y-auto px-6 py-6 space-y-4 min-h-[320px] max-h-[60vh]"
          >
            {messages.length === 0 && (
              <div className="text-[13px] text-mute-400 leading-[1.7] font-light">
                <p>
                  한 문장으로 원하는 양말을 설명해주세요. 캐릭터·로고·일러스트가
                  들어가면 AI가 이미지를 생성해 패턴으로 입힙니다. 이후 색이나
                  크기 조정은 계속 대화하며 수정할 수 있어요.
                </p>
                <div className="mt-5 space-y-1.5">
                  <div className="text-[9px] tracking-[0.3em] uppercase text-crimson-500 font-mono mb-2">
                    예시
                  </div>
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => send(ex)}
                      className="block w-full text-left text-[12px] text-ink hover:text-crimson-500 transition-colors px-3 py-2 rounded-lg hover:bg-paper"
                    >
                      “{ex}”
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] text-[13px] leading-[1.65] px-4 py-3 rounded-2xl ${
                    m.role === "user"
                      ? "bg-ink text-paper rounded-br-md"
                      : "bg-paper text-ink border border-mute-200 rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-paper border border-mute-200 rounded-2xl rounded-bl-md px-4 py-3 text-[12px] text-mute-500">
                  <span className="inline-flex gap-1">
                    <Dot delay={0} />
                    <Dot delay={120} />
                    <Dot delay={240} />
                  </span>
                  <span className="ml-2 font-mono tracking-wider text-[10px] uppercase">
                    GPT-5.4 thinking…
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input — floating composer */}
          <div className="px-4 pt-2 pb-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className={`relative group rounded-2xl bg-paper border transition-all duration-300 ${
                inputFocused
                  ? "border-ink shadow-[0_6px_24px_-8px_rgba(14,14,14,0.18)]"
                  : "border-mute-200 shadow-[0_2px_12px_-6px_rgba(14,14,14,0.08)] hover:border-mute-300"
              }`}
            >
              {/* Subtle crimson accent rail on focus */}
              <span
                aria-hidden
                className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-crimson-500 transition-opacity duration-300 ${
                  inputFocused ? "opacity-100" : "opacity-0"
                }`}
              />

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={
                  messages.length === 0
                    ? "예: 겨울용 딸기 캐릭터 단목 양말, 파스텔 핑크"
                    : "색을 네이비로 바꿔줘 / 패턴 좀 더 크게"
                }
                rows={1}
                className="w-full resize-none bg-transparent text-[14px] leading-[1.55] placeholder:text-mute-400 focus:outline-none pt-4 pb-12 pl-5 pr-5 max-h-40"
                disabled={loading}
              />

              {/* Bottom bar inside the composer */}
              <div className="absolute left-5 right-3 bottom-2.5 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3 text-[9px] tracking-[0.26em] uppercase font-mono text-mute-400">
                  <span className="inline-flex items-center gap-1.5">
                    <kbd className="inline-flex items-center justify-center px-1.5 h-4 rounded border border-mute-300 bg-shell/60 text-[9px] font-mono text-mute-500 leading-none">
                      ↵
                    </kbd>
                    <span>전송</span>
                  </span>
                  <span className="text-mute-300">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <kbd className="inline-flex items-center justify-center px-1.5 h-4 rounded border border-mute-300 bg-shell/60 text-[9px] font-mono text-mute-500 leading-none">
                      ⇧↵
                    </kbd>
                    <span>줄바꿈</span>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  aria-label="전송"
                  className={`pointer-events-auto relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    input.trim() && !loading
                      ? "bg-ink text-paper hover:bg-crimson-500 shadow-[0_4px_14px_-4px_rgba(215,38,61,0.45)] scale-100"
                      : "bg-mute-200 text-mute-400 scale-95 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <span className="w-3 h-3 rounded-full border-2 border-paper/40 border-t-paper animate-spin" />
                  ) : (
                    <span className="text-[16px] leading-none translate-y-[-1px]">
                      →
                    </span>
                  )}
                </button>
              </div>
            </form>

            {/* Status line under composer */}
            <div className="mt-2.5 flex items-center justify-between px-1 text-[9px] tracking-[0.28em] uppercase font-mono">
              <span className="inline-flex items-center gap-1.5 text-mute-400">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    loading ? "bg-crimson-500 animate-pulse" : "bg-emerald-500"
                  }`}
                />
                {loading ? "Generating" : "Ready"}
              </span>
              <span className="text-mute-400">GPT-5.4 · Image Gen</span>
            </div>

            {error && (
              <div className="mt-2 px-3 py-2 rounded-lg text-[11px] text-crimson-600 bg-crimson-50 border border-crimson-200">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — preview */}
        <div className="flex flex-col min-h-0 rounded-3xl border border-mute-200 bg-shell p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[10px] tracking-[0.32em] uppercase text-crimson-500 font-mono">
                02 — Preview
              </div>
              <div className="serif text-[22px] leading-none mt-2">
                실시간{" "}
                <span className="serif-it text-crimson-500">미리보기</span>
              </div>
            </div>
            <span className="text-[9px] tracking-[0.3em] uppercase text-mute-400 font-mono">
              Length · Color · Pattern
            </span>
          </div>

          <div className="flex-1">
            <SockPreview
              sel={selection}
              autoConfirmPattern
              previewRef={previewRef}
            />
          </div>

          <div className="mt-6 pt-5 border-t border-mute-200 grid grid-cols-3 gap-3 text-[11px] text-mute-500 font-mono tabular">
            <Spec label="LENGTH" value={labelLength(selection.length)} />
            <Spec label="GAUGE" value={selection.gauge ?? "—"} />
            <Spec label="YARN" value={labelYarn(selection.yarn)} />
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
            <button
              onClick={goToManualStudio}
              disabled={!hasDesign}
              className="h-12 inline-flex items-center justify-center gap-3 rounded-xl border border-ink text-ink hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink text-[13px] tracking-[0.2em] uppercase font-medium transition-colors"
            >
              <span>세부 조정</span>
              <span>→</span>
            </button>
            <button
              onClick={handleExport}
              disabled={!hasDesign || exporting}
              title="프리뷰 PNG + 스펙 JSON 다운로드"
              className="h-12 w-12 inline-flex items-center justify-center rounded-xl bg-ink text-paper hover:bg-crimson-500 disabled:opacity-30 disabled:hover:bg-ink transition-colors"
              aria-label="디자인 내보내기"
            >
              {exporting ? (
                <span className="w-4 h-4 rounded-full border-2 border-paper/40 border-t-paper animate-spin" />
              ) : (
                <svg
                  width="18"
                  height="18"
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
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8px] tracking-[0.3em] text-mute-400 uppercase">
        {label}
      </div>
      <div className="text-[12px] text-ink mt-1 truncate">{value}</div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-crimson-500 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

function labelLength(l?: SelectionState["length"]): string {
  if (!l) return "—";
  if (l === "ankle") return "덧신";
  if (l === "crew") return "단목";
  return "중목";
}

function labelYarn(y?: SelectionState["yarn"]): string {
  if (!y) return "—";
  const m: Record<NonNullable<SelectionState["yarn"]>, string> = {
    cotton: "면",
    tactel: "탁텔",
    mesh: "메시",
    pile: "파일",
    rib: "리브",
    blend: "혼방",
  };
  return m[y];
}

// Drop data URLs (customPattern base64) from the payload we send back to the
// model — too large, and the model doesn't need the bytes to keep iterating.
function stripBigFields(s: SelectionState): Partial<SelectionState> {
  const { customPattern, ...rest } = s;
  void customPattern;
  return rest;
}
