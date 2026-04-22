"use client";

import { useEffect, useState } from "react";
import { useSlickNav } from "@/components/TransitionProvider";

export default function LandingPage() {
  const { navigate } = useSlickNav();
  const [time, setTime] = useState("");

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

  function goStudio() {
    navigate("/studio");
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ════════════════ NAV ════════════════ */}
      <header className="sticky top-0 z-40 bg-crimson-500 text-paper">
        <div className="max-w-[1480px] mx-auto px-6 md:px-10 py-5 flex items-center justify-between border-b border-crimson-600/50">
          <a className="flex items-baseline gap-2">
            <span className="serif-it text-[24px] text-paper leading-none translate-y-[1px]">
              Lovelysocks
            </span>
            <span className="text-[11px] tracking-[0.3em] text-paper/60 font-mono uppercase">
              House
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-10 text-[13px] text-paper/80">
            <a className="uline hover:text-paper">Studio</a>
            <a className="uline hover:text-paper">Archive</a>
            <a className="uline hover:text-paper">Process</a>
            <a className="uline hover:text-paper">Contact</a>
            <span className="w-px h-4 bg-paper/30 mx-2" />
            <button onClick={goStudio} className="uline text-paper">
              AI Studio <span className="serif-it">→</span>
            </button>
          </nav>
          <div className="md:hidden text-[11px] tracking-widest text-paper/70 font-mono tabular">
            {time}
          </div>
        </div>
      </header>

      {/* ════════════════ HERO ════════════════ */}
      <section className="relative max-w-[1480px] mx-auto px-6 md:px-10 pt-10 md:pt-16 pb-16 md:pb-24 overflow-x-clip">
        <div className="hidden md:flex items-center justify-between text-[11px] tracking-[0.3em] uppercase text-mute-400 font-mono pb-24 fade-up">
          <span>A Studio Record, Vol. 01</span>
          <span className="text-ink">Gwangju · Atelier</span>
          <span className="tabular">{time} KST</span>
        </div>

        <div className="relative flex flex-col items-center text-center">
          {/* Small kicker */}
          <div className="text-[11px] tracking-[0.3em] uppercase text-crimson-500 font-mono mb-10 md:mb-14 relative z-10 fade-up">
            — AI Consultation, Live
          </div>

          {/* Falling hero text */}
          <h1 className="serif font-normal text-[64px] md:text-[180px] leading-[0.94] tracking-tightest text-ink relative z-10">
            <span className="block overflow-hidden">
              <span className="drop drop-d1 block">make</span>
            </span>
            <span className="block overflow-hidden">
              <span className="drop drop-d2 block">
                <span className="serif-it text-crimson-500">your</span>{" "}
                <span className="serif-it">own</span>
              </span>
            </span>
            <span className="block">
              <span className="inline-block relative align-baseline">
                {/* Drop-animated word clipped by its own overflow wrapper */}
                <span className="block overflow-hidden">
                  <span className="drop drop-d3 block">
                    socks<span className="text-crimson-500">.</span>
                  </span>
                </span>
                {/* Sock lives OUTSIDE the overflow-hidden wrapper */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-[-0.06em] left-full ml-[0.12em] drop-sock"
                >
                  <span className="inline-block sock-idle">
                    <CrimsonSockMark className="h-[0.56em] w-auto" />
                  </span>
                </span>
              </span>
            </span>
          </h1>

          {/* Korean subtitle — fades in after all drops */}
          <p
            className="font-sans font-light text-[20px] md:text-[28px] leading-[1.5] tracking-tighter text-mute-500 mt-14 md:mt-20 max-w-[740px] fade-up"
            style={{ animationDelay: "1.2s" }}
          >
            당신의 빛나는 디자인을 AI와 함께 펼쳐보세요.
          </p>

          {/* ── Refined CTA ── */}
          <div
            className="mt-16 md:mt-20 flex flex-col items-center gap-5 fade-up"
            style={{ animationDelay: "1.6s" }}
          >
            <CTAButton onClick={goStudio} />
            <div className="text-[11px] tracking-[0.3em] uppercase text-mute-400 font-mono">
              10-step composition · powered by Claude
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ FEATURE STRIP ════════════════ */}
      <section className="max-w-[1480px] mx-auto px-6 md:px-10 pb-32">
        <div className="border-t border-mute-200 pt-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-[13px] text-mute-500 font-light leading-[1.8]">
          <div>
            <div className="text-[10px] tracking-[0.32em] uppercase text-crimson-500 font-mono mb-3">
              01 — Design
            </div>
            <p>
              10단계 옵션으로 용도·길이·침수·원사·디자인·색상을 세밀하게 구성.
            </p>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.32em] uppercase text-crimson-500 font-mono mb-3">
              02 — AI Director
            </div>
            <p>
              Claude Opus 4.7이 디자인 컨셉·색상 조합·원사·제작 포인트를 실시간
              제안.
            </p>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.32em] uppercase text-crimson-500 font-mono mb-3">
              03 — Atelier
            </div>
            <p>경기 광주 자사 공장에서 한 켤레씩 — 1 – 500켤레 주문 가능.</p>
          </div>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer className="bg-ink text-paper">
        <div className="max-w-[1480px] mx-auto px-6 md:px-10 py-24 md:py-32">
          <h2 className="serif font-normal text-[56px] md:text-[140px] leading-[0.95] tracking-tightest">
            Thread your
            <br />
            <span className="serif-it text-crimson-400">next pair</span>
            <span className="text-crimson-400">.</span>
          </h2>

          <div className="mt-20 md:mt-28 pt-8 border-t border-mute-500/30 grid md:grid-cols-12 gap-8 text-[13px] text-mute-300 font-light">
            <div className="md:col-span-4">
              <div className="text-[10px] tracking-[0.3em] uppercase text-crimson-400 font-mono mb-3">
                Studio
              </div>
              경기도 광주시 · 자사 양말 공장
              <br />
              144 · 168 · 200 침 라인
              <br />
              B2B · 소량 주문 가능
            </div>
            <div className="md:col-span-3">
              <div className="text-[10px] tracking-[0.3em] uppercase text-crimson-400 font-mono mb-3">
                Contact
              </div>
              hello@lovelysocks.house
              <br />
              010-0000-0000
            </div>
            <div className="md:col-span-3">
              <div className="text-[10px] tracking-[0.3em] uppercase text-crimson-400 font-mono mb-3">
                Technology
              </div>
              Built with Next.js 15
              <br />
              Powered by Claude Opus 4.7
            </div>
            <div className="md:col-span-2 md:text-right font-mono text-[11px] tracking-[0.24em] uppercase text-mute-400">
              © 2026
              <br />
              LovelySocks.House
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ══════════════════════════════════════════
   Crimson sock SVG mark
   ══════════════════════════════════════════ */
function CrimsonSockMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 130 150"
      className={className}
      style={{
        filter: "drop-shadow(0 8px 14px rgba(168,13,34,0.28))",
      }}
    >
      {/* Single sock — leg vertical, foot angled forward ≈ 120° interior */}
      <g transform="rotate(-6 65 70)" fill="#a80d22">
        {/*
          Path walks clockwise from top-left of cuff.
          Sole is diagonal — toe sits lower than heel, giving an obtuse
          ankle→sole angle around 120° rather than a 90° L-bend.
        */}
        <path
          d="
            M 22 8
            L 58 8
            Q 64 8 64 14
            L 64 64
            C 64 74 68 80 76 84
            L 100 96
            C 110 100 116 106 116 116
            L 116 124
            C 116 132 112 136 106 136
            L 22 108
            C 14 106 8 102 8 94
            L 8 80
            C 8 72 12 68 14 64
            L 14 14
            Q 14 8 22 8
            Z
          "
        />

        {/* Subtle cuff fold line */}
        <line
          x1="14"
          y1="22"
          x2="64"
          y2="22"
          stroke="#fbeaec"
          strokeWidth="0.6"
          opacity="0.22"
        />
      </g>
    </svg>
  );
}

/* ══════════════════════════════════════════
   CTA Button — dual-label slide + crimson wash
   ══════════════════════════════════════════ */
function CTAButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative inline-flex items-stretch overflow-hidden rounded-full bg-ink transition-colors duration-[650ms] ease-out hover:bg-crimson-500 shadow-lift"
    >
      {/* Label ─ dual-state sliding */}
      <div className="pl-11 pr-5 md:pl-14 md:pr-7 py-5 md:py-6 flex items-center gap-5">
        <span className="relative inline-block h-[18px] md:h-[20px] overflow-hidden text-[14px] md:text-[15px] tracking-[0.22em] uppercase font-medium text-paper">
          <span className="block transition-transform duration-[650ms] ease-[cubic-bezier(0.2,0.6,0.2,1)] group-hover:-translate-y-full">
            제작하기
          </span>
          <span className="absolute inset-x-0 top-full block transition-transform duration-[650ms] ease-[cubic-bezier(0.2,0.6,0.2,1)] group-hover:-translate-y-full">
            Let&apos;s go
          </span>
        </span>
        <span className="serif-it text-crimson-300 group-hover:text-paper transition-colors duration-[650ms] text-[14px] md:text-[15px] leading-none translate-y-[-1px]">
          Studio
        </span>
      </div>

      {/* Arrow ─ two-arrow scroll through circle */}
      <div className="pr-2 py-2 flex items-center">
        <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-full bg-crimson-500 group-hover:bg-paper flex items-center justify-center overflow-hidden transition-colors duration-[650ms]">
          <span className="relative flex items-center justify-center w-6 h-4">
            <span className="absolute text-paper group-hover:text-crimson-500 text-[18px] md:text-[20px] leading-none translate-y-[-1px] group-hover:translate-x-[42px] transition-all duration-[650ms] ease-[cubic-bezier(0.65,0,0.35,1)]">
              →
            </span>
            <span className="absolute text-paper group-hover:text-crimson-500 text-[18px] md:text-[20px] leading-none translate-y-[-1px] -translate-x-[42px] group-hover:translate-x-0 transition-all duration-[650ms] ease-[cubic-bezier(0.65,0,0.35,1)]">
              →
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}
