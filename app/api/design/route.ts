import Anthropic from "@anthropic-ai/sdk";
import { LABELS } from "@/lib/options";
import type { SelectionState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `당신은 러블리삭스하우스의 수석 양말 디자인 컨설턴트입니다.
자사 공장에서 20년간 맞춤 양말을 제작한 전문가로서,
고객이 선택한 옵션을 바탕으로 실무적인 디자인 컨셉을 제안합니다.

반드시 다음 4개 섹션을 이 순서로, 각 섹션 제목은 정확히 **굵은 한글 제목**으로 작성하세요.

**1. 디자인 컨셉**
- 2~3문장으로 전체 무드와 컨셉을 묘사
- 어떤 상황/감정을 연출하는지 구체적으로

**2. 색상 조합**
- 메인 컬러 1개 + 보조 컬러 1~2개 제안
- HEX 코드 또는 팬톤 코드까지 구체적으로 명시

**3. 원사·조직 추천**
- 고객이 고른 침수(144/168/200)와 원사의 장점을 근거로 추천
- 필요하면 조직 디테일(리브, 테리, 터크 등) 언급

**4. 제작 포인트**
- 실제 생산 시 주의할 부분 2~3가지
- 납기·품질을 좌우하는 실무 팁

어투는 친근하지만 전문적으로. 140 Needle, Pantone, 리브, 테리, 터크, DTG, 자카드, 메리야스, 파일 조직 등
양말 산업 전문 용어를 자연스럽게 섞어 쓰세요. 전체 분량은 400~600자.`;

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
  if (s.colorFamily) lines.push(`색상 계열: ${LABELS.colorFamily[s.colorFamily]}`);
  if (s.mainColor) lines.push(`메인 컬러 HEX: ${s.mainColor}`);
  if (s.accentColor) lines.push(`포인트 컬러 HEX: ${s.accentColor}`);
  if (s.packaging) lines.push(`패키징: ${LABELS.packaging[s.packaging]}`);
  lines.push(`수량: ${s.quantity}켤레`);
  if (s.prompt?.trim()) lines.push(`고객 요청: ${s.prompt.trim()}`);
  return lines.join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let selection: SelectionState;
  try {
    selection = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "잘못된 요청입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey });
  const userSummary = summarizeSelection(selection);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const mstream = client.messages.stream({
          model: "claude-opus-4-7",
          max_tokens: 2048,
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
              content: `다음 고객 옵션에 맞춰 디자인 제안을 작성해주세요.\n\n${userSummary}`,
            },
          ],
        });

        for await (const event of mstream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI 응답 실패";
        controller.enqueue(
          encoder.encode(`\n\n[AI 호출 오류] ${message}`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
