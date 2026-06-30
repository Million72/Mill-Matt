import { atr } from "../../indicators/atr.js";

export function volatilityAnalysis(candles) {
  const ATR     = atr(candles) ?? 0;
  const avgRng  = candles.slice(-20).reduce((a, c) => a + (c.high - c.low), 0) / 20;
  const healthy = ATR >= avgRng * 0.3;
  const ratio   = avgRng > 0 ? ATR / avgRng : 0;

  return { ATR, healthy, ratio, expanding: ratio > 1.2, contracting: ratio < 0.5 };
}
