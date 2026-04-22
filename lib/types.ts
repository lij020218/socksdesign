export type Purpose = "daily" | "sports" | "gift" | "goods";
export type Length = "ankle" | "crew" | "mid";
export type Gauge = "144" | "168" | "200";
export type Yarn = "cotton" | "tactel" | "mesh" | "pile" | "rib" | "blend";
export type Feature =
  | "noPressure"
  | "antibacterial"
  | "nonSlip"
  | "cushion"
  | "odorProof"
  | "none";
export type Design = "basic" | "pattern" | "embroidery" | "tourism";
export type PatternStyle = "dot" | "stripe" | "character" | "custom";
export type ColorFamily =
  | "neutral"
  | "pastel"
  | "vivid"
  | "earth"
  | "jewel"
  | "seasonal";
export type Packaging = "opp" | "gift" | "brandBox";

export interface SelectionState {
  purpose?: Purpose;
  length?: Length;
  gauge?: Gauge;
  yarn?: Yarn;
  features: Feature[];
  design?: Design;
  patternStyle?: PatternStyle;
  customPattern?: string; // data URL of user-uploaded logo/character/pattern
  customPatternName?: string;
  customMode?: "tile" | "logo"; // tile = repeat as pattern; logo = single placement
  logoScale?: number; // 0.5–2.0, applies to embroidery + custom-logo placement
  text?: string;
  textFont?: "serif" | "sans" | "mono" | "script";
  textRotation?: number; // degrees
  textScale?: number; // 0.5–2.5
  colorFamily?: ColorFamily;
  mainColor?: string;
  accentColor?: string;
  packaging?: Packaging;
  quantity: number;
  prompt: string;
}

export interface Quote {
  unitPrice: number;
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  leadTimeDays: string;
  production: string;
}

export interface AIProposal {
  concept: string;
  mainColor: string;
  accentColor: string;
  colorFamily: ColorFamily;
  length: Length;
  design: Design;
  yarn: Yarn;
  rationale: string;
}
