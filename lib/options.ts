import type {
  Purpose,
  Length,
  Gauge,
  Yarn,
  Feature,
  Design,
  PatternStyle,
  ColorFamily,
  Packaging,
} from "./types";

export const PURPOSE_OPTIONS: { value: Purpose; label: string; desc: string }[] = [
  { value: "daily", label: "일상·출근", desc: "편하게 매일 신는 용도" },
  { value: "sports", label: "운동·스포츠", desc: "기능성과 흡습속건" },
  { value: "gift", label: "선물·기념품", desc: "포장까지 고려한 선물용" },
  { value: "goods", label: "굿즈·B2B", desc: "기업·이벤트 대량 주문" },
];

export const LENGTH_OPTIONS: { value: Length; label: string; desc: string }[] = [
  { value: "ankle", label: "덧신", desc: "발목 이하 / 스니커즈용" },
  { value: "crew", label: "단목", desc: "발목 높이 / 베이직" },
  { value: "mid", label: "중목", desc: "종아리까지 / 캐주얼·부츠" },
];

export const GAUGE_OPTIONS: {
  value: Gauge;
  label: string;
  tier: string;
  desc: string;
}[] = [
  { value: "144", label: "144침", tier: "프리미엄", desc: "가장 촘촘하고 고급" },
  { value: "168", label: "168침", tier: "스탠다드", desc: "가성비 최적의 국민 등급" },
  { value: "200", label: "200침", tier: "심리스·고기능", desc: "이음새 없이 섬세하게" },
];

export const YARN_OPTIONS: { value: Yarn; label: string; desc: string }[] = [
  { value: "cotton", label: "면", desc: "편안한 착용감, 범용" },
  { value: "tactel", label: "탁텔", desc: "부드럽고 광택 있는 프리미엄 원사" },
  { value: "mesh", label: "메쉬·망사", desc: "통풍이 뛰어난 여름용" },
  { value: "pile", label: "파일", desc: "두껍고 따뜻한 겨울용" },
  { value: "rib", label: "골지", desc: "신축성 좋은 탄탄한 골지 조직" },
  { value: "blend", label: "혼방", desc: "면+폴리 혼방 내구성" },
];

export const FEATURE_OPTIONS: { value: Feature; label: string; desc: string }[] = [
  { value: "noPressure", label: "무압박", desc: "임산부·당뇨 환자용" },
  { value: "antibacterial", label: "항균·소취", desc: "위생 기능 강화" },
  { value: "nonSlip", label: "미끄럼방지", desc: "실리콘 그립 프린팅" },
  { value: "cushion", label: "쿠션 밑창", desc: "두툼한 파일 밑창" },
  { value: "odorProof", label: "발냄새 방지", desc: "향균 원사 혼용" },
  { value: "none", label: "없음", desc: "기본 사양으로 제작" },
];

export const DESIGN_OPTIONS: { value: Design; label: string; desc: string }[] = [
  { value: "basic", label: "무지·베이직", desc: "단색 솔리드" },
  { value: "pattern", label: "패턴·프린팅", desc: "도트·스트라이프·캐릭터" },
  { value: "embroidery", label: "자수·로고", desc: "브랜드 로고 자수" },
  { value: "tourism", label: "관광·테마", desc: "서울·부산·제주 등" },
];

export const PATTERN_STYLE_OPTIONS: {
  value: PatternStyle;
  label: string;
  desc: string;
}[] = [
  { value: "dot", label: "도트", desc: "고르게 배치된 원형 프린팅" },
  { value: "stripe", label: "스트라이프", desc: "가로 줄무늬 라인" },
  { value: "character", label: "캐릭터", desc: "심볼·캐릭터 반복" },
  { value: "custom", label: "업로드", desc: "내 로고·이미지 직접 사용" },
];

export interface Swatch {
  hex: string;
  name: string;
}

export const COLOR_FAMILIES: {
  value: ColorFamily;
  label: string;
  desc: string;
  swatches: Swatch[];
}[] = [
  {
    value: "neutral",
    label: "뉴트럴",
    desc: "베이직 무채색·아이보리",
    swatches: [
      { hex: "#ffffff", name: "Pure White" },
      { hex: "#f5f1e8", name: "Ivory" },
      { hex: "#e6dfd1", name: "Bone" },
      { hex: "#c9c3b6", name: "Oat" },
      { hex: "#9a958b", name: "Stone" },
      { hex: "#6f6a60", name: "Taupe" },
      { hex: "#3e3c37", name: "Charcoal" },
      { hex: "#0e0e0e", name: "Ink" },
    ],
  },
  {
    value: "pastel",
    label: "파스텔",
    desc: "부드럽고 달콤한 봄 톤",
    swatches: [
      { hex: "#fbe5eb", name: "Cotton Pink" },
      { hex: "#f9d0c4", name: "Peach Milk" },
      { hex: "#fde9c4", name: "Butter" },
      { hex: "#e7f0c9", name: "Mint Sherbet" },
      { hex: "#c9e4d8", name: "Sea Foam" },
      { hex: "#c7e0e8", name: "Sky Mist" },
      { hex: "#d7cfe8", name: "Lavender" },
      { hex: "#f1d4e4", name: "Rose Quartz" },
      { hex: "#ffe0b5", name: "Apricot" },
      { hex: "#d0f0e0", name: "Pistachio" },
    ],
  },
  {
    value: "vivid",
    label: "비비드",
    desc: "원색 포인트",
    swatches: [
      { hex: "#d7263d", name: "Crimson" },
      { hex: "#f45b69", name: "Watermelon" },
      { hex: "#ff9f1c", name: "Tangerine" },
      { hex: "#ffd60a", name: "Sunflower" },
      { hex: "#2ec4b6", name: "Teal Pop" },
      { hex: "#3a86ff", name: "Electric Blue" },
      { hex: "#8338ec", name: "Violet" },
      { hex: "#ff006e", name: "Magenta" },
      { hex: "#06a77d", name: "Jade" },
      { hex: "#f72585", name: "Hot Pink" },
    ],
  },
  {
    value: "earth",
    label: "어스톤",
    desc: "내추럴·자연 색감",
    swatches: [
      { hex: "#bfa485", name: "Sand" },
      { hex: "#8a6e4c", name: "Camel" },
      { hex: "#5a4a36", name: "Cocoa" },
      { hex: "#8b9f7c", name: "Sage" },
      { hex: "#6b7255", name: "Olive" },
      { hex: "#a4907c", name: "Mushroom" },
      { hex: "#c49b6c", name: "Honey" },
      { hex: "#3a342c", name: "Espresso" },
      { hex: "#7a5c3a", name: "Chestnut" },
      { hex: "#b78b5a", name: "Caramel" },
    ],
  },
  {
    value: "jewel",
    label: "주얼",
    desc: "깊고 고급스러운 보석 톤",
    swatches: [
      { hex: "#0b3d91", name: "Sapphire" },
      { hex: "#6a1b9a", name: "Amethyst" },
      { hex: "#00695c", name: "Emerald" },
      { hex: "#8b1e3f", name: "Ruby" },
      { hex: "#ad6800", name: "Topaz" },
      { hex: "#004d40", name: "Malachite" },
      { hex: "#4a148c", name: "Indigo Deep" },
      { hex: "#880e4f", name: "Garnet" },
      { hex: "#1b5e20", name: "Forest" },
      { hex: "#263238", name: "Obsidian" },
    ],
  },
  {
    value: "seasonal",
    label: "시즌",
    desc: "컬렉션·한정 컬러",
    swatches: [
      { hex: "#ff6b9d", name: "Sakura" },
      { hex: "#ffb4a2", name: "Coral Dust" },
      { hex: "#cddafd", name: "Hydrangea" },
      { hex: "#ffd6a5", name: "Sunset" },
      { hex: "#caffbf", name: "Matcha" },
      { hex: "#9bf6ff", name: "Ice" },
      { hex: "#a0c4ff", name: "Hydrangea Deep" },
      { hex: "#bdb2ff", name: "Wisteria" },
      { hex: "#fdffb6", name: "Champagne" },
      { hex: "#ffc6ff", name: "Bubble Gum" },
    ],
  },
];

// Flat list for easy HEX lookups / validation
export const ALL_SWATCHES: Swatch[] = COLOR_FAMILIES.flatMap((f) => f.swatches);

export function findFamilyForHex(hex: string): ColorFamily | undefined {
  const norm = hex.toLowerCase();
  for (const f of COLOR_FAMILIES) {
    if (f.swatches.some((s) => s.hex.toLowerCase() === norm)) return f.value;
  }
  return undefined;
}

export const FONT_OPTIONS: {
  value: "serif" | "sans" | "mono" | "script";
  label: string;
  family: string;
  italic?: boolean;
}[] = [
  {
    value: "serif",
    label: "Serif",
    family: "'Instrument Serif', Georgia, serif",
  },
  {
    value: "sans",
    label: "Sans",
    family: "'Inter', system-ui, -apple-system, sans-serif",
  },
  {
    value: "mono",
    label: "Mono",
    family: "'JetBrains Mono', ui-monospace, monospace",
  },
  {
    value: "script",
    label: "Script",
    family: "'Instrument Serif', Georgia, serif",
    italic: true,
  },
];

export const PACKAGING_OPTIONS: {
  value: Packaging;
  label: string;
  desc: string;
}[] = [
  { value: "opp", label: "기본 포장", desc: "OPP 투명 봉투" },
  { value: "gift", label: "선물 포장", desc: "리본·포장지" },
  { value: "brandBox", label: "브랜드 박스", desc: "프린트 박스 맞춤 제작" },
];

export const LABELS = {
  purpose: Object.fromEntries(PURPOSE_OPTIONS.map((o) => [o.value, o.label])),
  length: Object.fromEntries(LENGTH_OPTIONS.map((o) => [o.value, o.label])),
  gauge: Object.fromEntries(GAUGE_OPTIONS.map((o) => [o.value, o.label])),
  yarn: Object.fromEntries(YARN_OPTIONS.map((o) => [o.value, o.label])),
  feature: Object.fromEntries(FEATURE_OPTIONS.map((o) => [o.value, o.label])),
  design: Object.fromEntries(DESIGN_OPTIONS.map((o) => [o.value, o.label])),
  patternStyle: Object.fromEntries(
    PATTERN_STYLE_OPTIONS.map((o) => [o.value, o.label]),
  ),
  colorFamily: Object.fromEntries(
    COLOR_FAMILIES.map((o) => [o.value, o.label]),
  ),
  packaging: Object.fromEntries(PACKAGING_OPTIONS.map((o) => [o.value, o.label])),
} as const;
