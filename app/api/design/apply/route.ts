import Anthropic from "@anthropic-ai/sdk";
import { ALL_SWATCHES, COLOR_FAMILIES, LABELS } from "@/lib/options";
import type { AIProposal, ColorFamily, Length, Design, Yarn, SelectionState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PALETTE_REFERENCE = COLOR_FAMILIES.map((f) => {
  const list = f.swatches.map((s) => `${s.hex} ${s.name}`).join(", ");
  return `- ${f.label} (${f.value}): ${list}`;
}).join("\n");

const SYSTEM_PROMPT = `당신은 러블리삭스하우스의 AI 디자인 디렉터입니다.
고객의 자유 프롬프트와 부분적으로 선택된 옵션을 바탕으로, 실제 UI 미리보기에 즉시 적용할
구체적인 디자인 제안을 JSON 한 덩어리로 반환합니다. 텍스트 설명·마크다운·코드 블록 없이
오직 JSON 오브젝트만 응답하세요.

필드:
- "concept": 12~18자의 한글 컨셉 한 줄 (예: "봄 벚꽃 산책 단목 양말")
- "mainColor": 메인 HEX 코드 (예: "#fbe5eb"). 소문자 허용.
- "accentColor": 포인트 HEX 코드. 메인과 대비·조화를 고려.
- "colorFamily": "neutral" | "pastel" | "vivid" | "earth" | "jewel" | "seasonal" 중 하나.
- "length": "ankle" | "crew" | "mid" 중 하나.
- "design": "basic" | "pattern" | "embroidery" | "tourism" 중 하나.
- "yarn": "cotton" | "tactel" | "mesh" | "pile" | "rib" | "blend" 중 하나.
- "rationale": 왜 이 조합을 택했는지 2~3문장 한글 설명.

컬러 가이드 (아래 팔레트에서 고르는 것을 우선하되, 고객 프롬프트가 특정 색을 요구하면 가장
가까운 HEX로 자유롭게 제안해도 좋습니다):
${PALETTE_REFERENCE}

규칙:
1. 고객이 이미 선택한 옵션이 있으면 가급적 존중하고, 비어 있는 부분만 채우는 방식으로 제안.
2. main/accent는 서로 식별 가능한 차이(명도·채도·계열)가 있어야 함. 같은 HEX 금지.
3. length·design·yarn은 위 enum 외의 값을 절대 반환하지 말 것.
4. JSON 외 어떤 문자도 출력하지 말 것. 주석, 백틱, 앞뒤 공백 제외한 설명 텍스트 모두 금지.`;

function hexOk(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

const ENUMS = {
  colorFamily: ["neutral", "pastel", "vivid", "earth", "jewel", "seasonal"] as const,
  length: ["ankle", "crew", "mid"] as const,
  design: ["basic", "pattern", "embroidery", "tourism"] as const,
  yarn: ["cotton", "tactel", "mesh", "pile", "rib", "blend"] as const,
};

function inEnum<T extends readonly string[]>(list: T, v: unknown): v is T[number] {
  return typeof v === "string" && (list as readonly string[]).includes(v);
}

function validate(obj: unknown): AIProposal | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.concept !== "string" || !o.concept.trim()) return null;
  if (typeof o.rationale !== "string" || !o.rationale.trim()) return null;
  if (!hexOk(o.mainColor) || !hexOk(o.accentColor)) return null;
  if (o.mainColor.toLowerCase() === (o.accentColor as string).toLowerCase()) return null;
  if (!inEnum(ENUMS.colorFamily, o.colorFamily)) return null;
  if (!inEnum(ENUMS.length, o.length)) return null;
  if (!inEnum(ENUMS.design, o.design)) return null;
  if (!inEnum(ENUMS.yarn, o.yarn)) return null;
  return {
    concept: o.concept.trim(),
    mainColor: (o.mainColor as string).toLowerCase(),
    accentColor: (o.accentColor as string).toLowerCase(),
    colorFamily: o.colorFamily as ColorFamily,
    length: o.length as Length,
    design: o.design as Design,
    yarn: o.yarn as Yarn,
    rationale: o.rationale.trim(),
  };
}

function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("JSON 오브젝트를 찾을 수 없습니다.");
    return JSON.parse(m[0]);
  }
}

function summarizeSelection(s: SelectionState): string {
  const lines: string[] = [];
  if (s.purpose) lines.push(`용도: ${LABELS.purpose[s.purpose]}`);
  if (s.length) lines.push(`길이: ${LABELS.length[s.length]}`);
  if (s.gauge) lines.push(`침수: ${LABELS.gauge[s.gauge]}`);
  if (s.yarn) lines.push(`원사: ${LABELS.yarn[s.yarn]}`);
  if (s.features?.length) {
    lines.push(
      `기능성: ${s.features.map((f) => LABELS.feature[f]).join(", ")}`,
    );
  }
  if (s.design) lines.push(`디자인 유형: ${LABELS.design[s.design]}`);
  if (s.colorFamily) lines.push(`선호 계열: ${LABELS.colorFamily[s.colorFamily]}`);
  if (s.mainColor) lines.push(`지정 메인: ${s.mainColor}`);
  if (s.accentColor) lines.push(`지정 포인트: ${s.accentColor}`);
  if (s.packaging) lines.push(`패키징: ${LABELS.packaging[s.packaging]}`);
  lines.push(`수량: ${s.quantity}켤레`);
  if (s.prompt?.trim()) lines.push(`고객 요청: ${s.prompt.trim()}`);
  return lines.length ? lines.join("\n") : "(선택값 없음 — 고객 취향을 제안해도 좋습니다)";
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  let selection: SelectionState;
  try {
    selection = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const resp = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1200,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `다음 조건으로 디자인 제안 JSON을 반환하세요.\n\n${summarizeSelection(selection)}`,
        },
      ],
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("AI 응답에 텍스트 블록이 없습니다.");
    }
    const parsed = extractJSON(textBlock.text);
    const proposal = validate(parsed);
    if (!proposal) {
      return Response.json(
        {
          error: "AI 응답을 해석할 수 없습니다.",
          raw: textBlock.text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    // Log palette swatch name for UX display (if any)
    const match = ALL_SWATCHES.find(
      (s) => s.hex.toLowerCase() === proposal.mainColor,
    );
    return Response.json({
      proposal,
      mainColorName: match?.name ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 호출 실패";
    return Response.json({ error: message }, { status: 500 });
  }
}
