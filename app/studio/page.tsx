"use client";

import { useSlickNav } from "@/components/TransitionProvider";

export default function StudioChoicePage() {
  const { navigate } = useSlickNav();

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Nav */}
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
          <div className="text-[11px] tracking-[0.3em] text-paper/70 font-mono uppercase">
            Design Studio · Choose Your Path
          </div>
        </div>
      </header>

      <section className="max-w-[1480px] mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-24">
        <div className="fade-up text-[11px] tracking-[0.3em] uppercase text-crimson-500 font-mono mb-6">
          — 제작 방식을 선택하세요
        </div>
        <h1 className="serif font-normal text-[48px] md:text-[96px] leading-[0.98] tracking-tightest fade-up">
          Two paths to
          <br />
          <span className="serif-it text-crimson-500">your pair</span>
          <span className="text-crimson-500">.</span>
        </h1>
        <p
          className="mt-8 max-w-[680px] text-[15px] md:text-[17px] text-mute-500 font-light leading-[1.65] fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          단계별로 직접 조립하거나, 한 줄 설명으로 AI에게 맡기거나. 어느 쪽이든
          양말의 기본 형태(덧신·단목·중목)는 공장에서 실제 생산되는 규격을
          따릅니다.
        </p>

        {/* Two cards */}
        <div
          className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          <PathCard
            onClick={() => navigate("/studio/manual")}
            kicker="01 — Manual"
            title="Step by step."
            titleIt="하나씩 골라가며"
            body="10단계 로드맵을 따라 용도·길이·침수·원사·색상·디자인을 직접 고릅니다. 모든 옵션을 손끝으로 확인하고 싶은 분을 위한 정석 루트."
            tag="PRECISION"
            cta="단계별 스튜디오"
          />
          <PathCard
            onClick={() => navigate("/studio/ai")}
            kicker="02 — AI Studio"
            title="Describe it."
            titleIt="말로 설명하면"
            body="원하는 양말을 한 문장으로 들려주세요. GPT-5.4가 디자인을 해석하고 이미지를 생성해 바로 미리보기에 반영합니다. 이후 스튜디오에서 세부 조정 가능."
            tag="CONVERSATIONAL"
            cta="AI와 대화 시작"
            accent
          />
        </div>

        <div
          className="mt-16 text-[11px] tracking-[0.3em] uppercase text-mute-400 font-mono fade-up"
          style={{ animationDelay: "0.6s" }}
        >
          Powered by GPT-5.4 · Image Generation · Claude Opus 4.7
        </div>
      </section>
    </div>
  );
}

function PathCard({
  onClick,
  kicker,
  title,
  titleIt,
  body,
  tag,
  cta,
  accent,
}: {
  onClick: () => void;
  kicker: string;
  title: string;
  titleIt: string;
  body: string;
  tag: string;
  cta: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative text-left rounded-3xl border p-8 md:p-10 transition-all duration-500 overflow-hidden ${
        accent
          ? "border-ink bg-ink text-paper hover:bg-crimson-500 hover:border-crimson-500"
          : "border-mute-200 bg-shell text-ink hover:border-ink hover:bg-paper"
      }`}
    >
      <div className="flex items-center justify-between mb-10">
        <span
          className={`text-[10px] tracking-[0.32em] uppercase font-mono ${
            accent ? "text-crimson-300" : "text-crimson-500"
          }`}
        >
          {kicker}
        </span>
        <span
          className={`text-[9px] tracking-[0.3em] uppercase font-mono px-2 py-1 rounded-full border ${
            accent
              ? "border-paper/30 text-paper/70"
              : "border-mute-300 text-mute-400"
          }`}
        >
          {tag}
        </span>
      </div>

      <h2 className="serif font-normal text-[44px] md:text-[64px] leading-[0.98] tracking-tightest">
        {title}
      </h2>
      <div
        className={`serif-it text-[22px] md:text-[28px] mt-2 ${
          accent ? "text-crimson-300" : "text-crimson-500"
        }`}
      >
        {titleIt}
      </div>

      <p
        className={`mt-8 text-[14px] md:text-[15px] leading-[1.7] font-light max-w-[460px] ${
          accent ? "text-paper/80" : "text-mute-500"
        }`}
      >
        {body}
      </p>

      <div
        className={`mt-12 inline-flex items-center gap-3 text-[13px] tracking-[0.2em] uppercase font-medium ${
          accent ? "text-paper" : "text-ink"
        }`}
      >
        <span>{cta}</span>
        <span className="inline-block transition-transform duration-500 group-hover:translate-x-2">
          →
        </span>
      </div>
    </button>
  );
}
