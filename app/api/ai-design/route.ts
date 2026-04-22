import OpenAI, { toFile } from "openai";
import type { SelectionState } from "@/lib/types";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "gpt-5.4";
const IMAGE_MODEL = "gpt-image-2-2026-04-21";

const SYSTEM_PROMPT = `당신은 러블리삭스하우스(Lovelysocks House)의 AI 양말 디자이너입니다.
자사 양말 공장에서 실제 생산 가능한 규격 안에서, 고객의 한 줄 설명을 받아
구체적인 양말 디자인 스펙을 설계합니다.

## 핵심 제약
- 양말 형태(length)는 반드시 다음 3종 중 하나만 선택합니다.
  • "ankle" = 덧신 (no-show)
  • "crew"  = 단목 (ankle-height)
  • "mid"   = 중목 (calf-height)
- 그 외 길이·형태는 생산 불가능하므로 절대 제안하지 않습니다.
- 색상은 반드시 HEX 코드(#RRGGBB 대문자 6자리)로 반환합니다.

## 디자인 유형 선택 (가장 중요)
사용자 요청을 읽고 네 가지 중 정확히 맞는 유형을 고르세요. **무조건 pattern
으로 내면 안 됩니다.** 사용자가 언급한 단어·의도에 따라 달라집니다.

- **basic** (무지·단색) — "단색", "무지", "미니멀", "깔끔하게", "장식 없이",
  "솔리드", "한 가지 색", "아무 무늬 없이" 같은 요청. patternStyle 은 null.
  이미지 생성 불필요.
- **pattern** (패턴·프린팅) — "도트", "스트라이프", "줄무늬", "체크", "캐릭터가
  반복", "무늬", "프린팅", 또는 로고·캐릭터·일러스트가 **양말 전체에 반복**되는
  경우. patternStyle 은 dot / stripe / character / custom 중 하나.
- **embroidery** (자수·로고) — "자수", "로고만", "앙증맞은 마크", "한쪽 발목에
  작은 로고", "포인트 자수" 등 로고·마크가 **한 군데만** 들어가는 경우.
  patternStyle 은 null. 이미지는 필요 시 로고용으로 1장 생성.
- **tourism** (관광·테마) — "제주도 기념품", "부산 굿즈", "서울 타워 양말",
  "지역 관광 상품" 같은 지역·관광 테마 요청. patternStyle 은 null.

사용자 발화가 모호하면 가장 가까운 유형을 고르고, basic 으로 시작해 필요 시
이후 대화에서 pattern 으로 업그레이드해도 됩니다. **pattern 을 남발하지
마세요.**

## 발목 포인트(커프 밴드)
- 기본적으로 발목에 포인트 컬러를 넣으면 디자인 대비가 살아나지만, 사용자가
  명시적으로 포인트 없는 디자인을 원하면 발목 포인트를 비워야 합니다.
- "발목색 빼줘", "커프 없이", "단색 양말", "발목까지 패턴 덮어줘" 같은 요청이
  들어오면 accentColor 를 **반드시 null** 로 설정합니다. 이 경우 UI 가 자동으로
  커프 밴드를 지우고 패턴이 발목까지 올라와 덮도록 처리합니다.
- 반대로 사용자가 포인트 컬러를 원하면 HEX 코드로 지정합니다.

## 이미지 생성 기능 (필수 사용)
고객 설명에서 캐릭터·로고·일러스트·풍경 등 **시각적 요소**가 언급되면
image generation 을 사용합니다. customMode 는 아래 규칙에 따라 엄격히
결정하세요.

### 대원칙 — 사용자 의도 최우선
사용자가 말한 그대로 만드는 것이 1순위입니다. "패턴 양말"·"반복"·"무늬"·
"타일링" 같이 **명시적으로 반복을 요구**할 때만 tile 을 쓰고, 그 외에는
거의 모든 시각 요소는 fill(단일 장면)로 취급하세요.

- "한 마리", "하나의", "중앙에", "가운데", "one", "single" → **반드시 fill**
- 풍경·배경 묘사("위는 하늘", "아래는 바다", "초원에서", "구름 배경") → **fill**
- 특정 상황·서사("뛰어놀고 있는", "앉아 있는", "놀고 있는") → **fill**
- 명시적으로 "패턴으로", "반복해서", "여러 개", "타일로", "무늬로" 요청한
  경우 → **tile**

**절대 금지**: 사용자가 "한 마리"·"중앙"·풍경을 명시했는데 tile 로 반환하는
것. tile 은 "패턴이 필요하다"고 사용자가 직접 말했을 때만 허용.

### customMode 옵션
- **"fill"** (기본) — 한 장의 장면이 양말 전체를 덮는 단일 인쇄. 포트레이트
  1024×1536 세로 이미지. **accentColor 는 반드시 null** (커프 색도 이미지에
  포함). 사용자의 서사·풍경·단독 피사체 묘사는 모두 fill.
- **"tile"** — 작은 모티프가 양말 전체에 반복. 사용자가 "패턴"·"반복"·"여러
  개"·"무늬"·"타일"을 명시했을 때만.
- **"logo"** — 발목 한 곳에 작은 로고 1장 (design=embroidery 우선 고려).

patternStyle 기본형(dot/stripe/character)은 **추상 기하·범용 아이콘 전용**
입니다. 사용자가 특정 피사체(웰시코기·러닝하는 사람·요트 등)를 묘사했다면
범용 'character' 가 아니라 **반드시 patternStyle='custom' + image_prompt**
로 이미지를 생성해야 합니다. 'character' 는 "일반 캐릭터 무늬" 같이 추상적
요청일 때만.

### image_prompt 작성 규칙
- fill: "Vertical sock-print illustration, portrait composition. Top
  portion: [upper scene]. Bottom portion: [lower scene]. Center subject:
  [single subject detail]. Edge-to-edge composition, no white border, no
  isolation background."
- tile: "A single centered [motif]. Flat vector illustration, pure white
  background, no shadows, no text, high contrast."

영문으로 자연스럽게 풀어 작성합니다.

## 응답 규칙
- JSON 스키마에 정확히 맞춰 반환하세요.
- message 필드에는 고객에게 보여줄 한국어 해설을 2~4문장으로 작성합니다 (디자인
  선택 이유·분위기·추천 포인트).
- 모든 필드는 고객의 요청과 모순되지 않아야 합니다.
- 이전 대화가 있다면 이어받아 수정(색 바꾸기·크기 조정·패턴 교체 등)을 반영합니다.`;

const SOCK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    message: {
      type: "string",
      description: "고객에게 보여줄 한국어 해설 (2~4문장)",
    },
    length: {
      type: "string",
      enum: ["ankle", "crew", "mid"],
      description: "양말 길이 — 덧신/단목/중목 중 하나",
    },
    gauge: {
      type: "string",
      enum: ["144", "168", "200"],
    },
    yarn: {
      type: "string",
      enum: ["cotton", "tactel", "mesh", "pile", "rib", "blend"],
    },
    design: {
      type: "string",
      enum: ["basic", "pattern", "embroidery", "tourism"],
    },
    patternStyle: {
      type: ["string", "null"],
      enum: ["dot", "stripe", "character", "custom", null],
    },
    customMode: {
      type: ["string", "null"],
      enum: ["tile", "logo", "fill", null],
      description:
        "커스텀 이미지 배치 방식. tile=반복 패턴, fill=양말 전체 단일 장면, logo=발목 한곳. patternStyle이 custom 이 아니면 null.",
    },
    mainColor: {
      type: "string",
      pattern: "^#[0-9A-F]{6}$",
      description: "메인 색 HEX (#RRGGBB 대문자)",
    },
    accentColor: {
      type: ["string", "null"],
      description:
        "포인트 색 HEX (#RRGGBB 대문자). 발목 커프에 쓰이는 포인트 컬러. 사용자가 ‘발목색 빼줘’, ‘커프 없이’, ‘단색으로’ 같이 포인트 컬러를 원치 않으면 반드시 null. 포인트가 null 이면 패턴이 발목까지 올라와 덮습니다.",
    },
    text: {
      type: ["string", "null"],
      description: "양말에 새길 짧은 텍스트 (없으면 null)",
    },
    image_prompt: {
      type: ["string", "null"],
      description:
        "커스텀 패턴 이미지 생성용 영문 프롬프트. 투명 배경·평면·단일 모티프. 없으면 null.",
    },
  },
  required: [
    "message",
    "length",
    "gauge",
    "yarn",
    "design",
    "patternStyle",
    "customMode",
    "mainColor",
    "accentColor",
    "text",
    "image_prompt",
  ],
} as const;

type SockSpec = {
  message: string;
  length: "ankle" | "crew" | "mid";
  gauge: "144" | "168" | "200";
  yarn: SelectionState["yarn"];
  design: SelectionState["design"];
  patternStyle: SelectionState["patternStyle"] | null;
  customMode: "tile" | "logo" | "fill" | null;
  mainColor: string;
  accentColor: string | null;
  text: string | null;
  image_prompt: string | null;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err) {
    // Last-resort guard: any uncaught throw would otherwise bubble up to
    // the Next.js runtime and produce a non-JSON HTML error page, which
    // breaks the client's res.json() parser.
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: `서버 오류: ${msg}` }, 500);
  }
}

async function handle(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(
      {
        error:
          "OPENAI_API_KEY 환경변수가 설정되지 않았습니다. Vercel에 배포한 경우 프로젝트 Settings → Environment Variables 에서 OPENAI_API_KEY 를 추가하고 재배포하세요.",
      },
      500,
    );
  }

  let body: { messages?: ChatMsg[]; currentSelection?: Partial<SelectionState> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "잘못된 요청입니다." }, 400);
  }

  const history = Array.isArray(body.messages) ? body.messages : [];
  if (history.length === 0) return json({ error: "메시지가 비어 있습니다." }, 400);

  const client = new OpenAI({ apiKey });

  const userMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...(body.currentSelection
      ? [
          {
            role: "system" as const,
            content: `현재 적용된 디자인 스펙(이전 대화 결과):\n${JSON.stringify(
              body.currentSelection,
              null,
              2,
            )}\n이 상태를 기반으로 사용자의 수정 요청을 반영해 업데이트된 스펙을 반환하세요.`,
          },
        ]
      : []),
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  let spec: SockSpec;
  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: userMessages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sock_spec",
          strict: true,
          schema: SOCK_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });
    const content = completion.choices[0]?.message?.content ?? "";
    spec = JSON.parse(content) as SockSpec;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI 호출 실패";
    return json({ error: `AI 디자인 생성 실패: ${msg}` }, 502);
  }

  // If the model wants custom imagery, generate with gpt-image-2. Fill mode
  // needs a portrait full-sock scene (1024×1536); tile / logo modes need a
  // centered-motif square (1024×1024) which we later strip-bg client-side.
  let customPattern: string | undefined;
  if (spec.image_prompt && spec.patternStyle === "custom") {
    const mode = spec.customMode ?? "tile";
    const size = mode === "fill" ? "1024x1536" : "1024x1024";
    // Per-length sock geometry measured from the actual mask PNGs. The sock
    // is L-shaped inside the 2:3 canvas; the unused areas are transparent.
    // Coordinates are percentages within the generated image.
    const geometry: Record<
      "ankle" | "crew" | "mid",
      { label: string; regions: string }
    > = {
      ankle: {
        label: "덧신 (no-show)",
        regions: [
          "Visible shape is a short foot silhouette, fairly centered horizontally.",
          "• Y 0-10% = top opening of the no-show, centerX≈42%.",
          "• Y 10-30% = arch/instep, centerX≈38%.",
          "• Y 30-90% = foot body, centerX≈50%.",
          "• Y 90-100% = toe tip, centerX≈50%.",
          "Default subject position (= ankle/instep area): X≈45-55%, Y≈30-45%.",
        ].join(" "),
      },
      crew: {
        label: "단목 (ankle-height crew)",
        regions: [
          "Visible shape is an L: vertical leg on the LEFT half, foot bending right in the lower half.",
          "• Y 0-8% = cuff band (the top stripe), centerX≈34%.",
          "• Y 8-30% = MASK GAP (INVISIBLE — nothing you paint here will show).",
          "• Y 30-50% = leg body (ankle zone), centerX≈33%.",
          "• Y 50-65% = ankle/heel curve, centerX≈40-46%.",
          "• Y 65-80% = instep / foot top, centerX≈57-65%.",
          "• Y 80-100% = foot and toe pointing right, centerX≈70-73%.",
          "Default subject position for '발목' (ankle): X≈28-38%, Y≈32-44%.",
        ].join(" "),
      },
      mid: {
        label: "중목 (tall crew)",
        regions: [
          "Visible shape is an L with a taller leg: cuff on top, long vertical leg on the LEFT, foot bending right in the bottom third.",
          "• Y 0-8% = cuff band, centerX≈34%.",
          "• Y 8-30% = MASK GAP (INVISIBLE).",
          "• Y 30-60% = leg body (ankle to shin), centerX≈33-38%.",
          "• Y 60-75% = ankle/heel curve, centerX≈40-47%.",
          "• Y 75-90% = foot top, centerX≈60-67%.",
          "• Y 90-100% = toe pointing right, centerX≈72%.",
          "Default subject position for '발목' (ankle): X≈30-40%, Y≈30-42%.",
        ].join(" "),
      },
    };
    const geo = geometry[spec.length as keyof typeof geometry];
    const promptSuffix =
      mode === "fill"
        ? [
            " ===== HARD COMPOSITION RULES — obey strictly =====",
            `REFERENCE: the attached image shows a blank ${geo.label} sock silhouette on a beige background at the EXACT size and position the final design must use. Draw your scene ONTO this sock — completely fill every white pixel of the silhouette and keep all beige areas outside the silhouette empty (beige) or continue the sky/ground of the scene.`,
            "SUBJECT PLACEMENT: place the primary subject INSIDE the sock silhouette, centered on the ANKLE — roughly the upper one-third of the white sock shape. The subject's center must fall inside the silhouette, never in the surrounding beige margin.",
            "SUBJECT SIZE: the subject should be roughly 22-35% of canvas width and 15-22% of canvas height. Do NOT fill the whole sock with the character.",
            "SUBJECT COUNT: exactly ONE primary subject. No secondary characters, no duplicate mascots, no floating icons, no small copy of the subject anywhere.",
            "STYLE: flat 2D vector illustration, editorial sticker / flat-design look. Solid fill colors, clean simple linework, minimal shading (one soft flat shadow is fine). **Do NOT use 3D rendering, volumetric lighting, photorealism, Pixar/CGI style, glossy highlights, complex gradients, ray-traced shadows, or depth-of-field blur** — unless the user explicitly requested 3D / photoreal / CGI / rendered style.",
            "BACKGROUND: the scene should fully cover the sock silhouette with a continuous top-to-bottom composition. The area outside the sock must stay the same plain beige as the reference so the sock shape is preserved. No text, no captions, no watermark, no logo.",
            "SUBJECT ORIENTATION: faces the viewer, or three-quarter view.",
          ].join(" ")
        : ` Single centered motif on pure white background (#FFFFFF), flat 2D vector illustration — NO 3D, NO photorealism, NO volumetric shading. Solid colors, simple linework, no text, no shadows, high contrast subject. Exactly ONE motif — no secondary characters or decorations.`;
    try {
      let b64: string | undefined;
      if (mode === "fill") {
        // Send the per-length sock template so gpt-image-2 places the
        // design at the correct size and position rather than guessing.
        const templatePath = path.join(
          process.cwd(),
          "public",
          `template-${spec.length}.png`,
        );
        const templateBytes = await readFile(templatePath);
        const templateFile = await toFile(templateBytes, "template.png", {
          type: "image/png",
        });
        const img = await client.images.edit({
          model: IMAGE_MODEL,
          image: templateFile,
          prompt: `${spec.image_prompt}${promptSuffix}`,
          size,
          n: 1,
        });
        b64 = img.data?.[0]?.b64_json;
      } else {
        const img = await client.images.generate({
          model: IMAGE_MODEL,
          prompt: `${spec.image_prompt}${promptSuffix}`,
          size,
          n: 1,
        });
        b64 = img.data?.[0]?.b64_json;
      }
      if (b64) customPattern = `data:image/png;base64,${b64}`;
    } catch (err) {
      // Non-fatal: fall through without the image.
      console.error("image generation failed", err);
    }
  }

  const selection: Partial<SelectionState> = {
    length: spec.length,
    gauge: spec.gauge,
    yarn: spec.yarn,
    design: spec.design,
    patternStyle: spec.patternStyle ?? undefined,
    mainColor: spec.mainColor,
    accentColor: spec.accentColor ?? undefined,
    text: spec.text ?? undefined,
    customPattern,
    customMode: customPattern ? (spec.customMode ?? "tile") : undefined,
  };

  return json({ message: spec.message, selection });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
