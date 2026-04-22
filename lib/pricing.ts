import type { SelectionState, Quote } from "./types";

const GAUGE_BASE: Record<string, number> = {
  "144": 3000,
  "168": 2000,
  "200": 3800,
};

const YARN_MULT: Record<string, number> = {
  cotton: 1.0,
  tactel: 1.25,
  mesh: 1.1,
  pile: 1.3,
  rib: 1.1,
  blend: 1.15,
};

const LENGTH_MULT: Record<string, number> = {
  ankle: 0.9,
  crew: 1.0,
  mid: 1.1,
};

const DESIGN_ADD: Record<string, number> = {
  basic: 0,
  pattern: 500,
  embroidery: 1500,
  tourism: 1000,
};

const PACKAGING_ADD: Record<string, number> = {
  opp: 0,
  gift: 500,
  brandBox: 1200,
};

const FEATURE_ADD: Record<string, number> = {
  noPressure: 300,
  antibacterial: 250,
  nonSlip: 200,
  cushion: 350,
  odorProof: 250,
  none: 0,
};

export function calculateQuote(sel: SelectionState): Quote | null {
  if (!sel.gauge || !sel.yarn || !sel.length || !sel.design || !sel.packaging) {
    return null;
  }

  const base = GAUGE_BASE[sel.gauge];
  const yarnMult = YARN_MULT[sel.yarn];
  const lengthMult = LENGTH_MULT[sel.length];
  const designAdd = DESIGN_ADD[sel.design];
  const packagingAdd = PACKAGING_ADD[sel.packaging];
  const featureAdd = sel.features.reduce((sum, f) => sum + (FEATURE_ADD[f] || 0), 0);

  const unitPriceRaw = base * yarnMult * lengthMult + designAdd + packagingAdd + featureAdd;
  const unitPrice = Math.round(unitPriceRaw / 50) * 50;

  const qty = Math.max(1, sel.quantity);
  const subtotal = unitPrice * qty;

  let discountRate = 0;
  const b2b = sel.purpose === "goods";
  if (qty >= 100 && b2b) discountRate = 0.2;
  else if (qty >= 100) discountRate = 0.15;
  else if (qty >= 50) discountRate = 0.1;

  const discountAmount = Math.round(subtotal * discountRate);
  const total = subtotal - discountAmount;

  let leadTimeDays = "7~10일";
  if (sel.design === "embroidery") leadTimeDays = "12~15일";
  if (qty >= 100) leadTimeDays = "14~18일";
  if (qty >= 300) leadTimeDays = "18~25일";

  let production = "경기 광주 자사 양말 공장 위탁 생산";
  if (b2b && qty >= 100) production = "B2B 전담 라인 생산 (자체 QC)";
  if (sel.gauge === "200") production = "심리스 전용 설비 (200침 라인)";

  return {
    unitPrice,
    subtotal,
    discountRate,
    discountAmount,
    total,
    leadTimeDays,
    production,
  };
}

export function formatWon(n: number): string {
  return `₩${n.toLocaleString("ko-KR")}`;
}
