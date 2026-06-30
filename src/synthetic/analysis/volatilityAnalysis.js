import { atr } from "../../indicators/atr.js";

export function volatilityAnalysis(candles) {
  const ATR    = atr(candles) ?? 0;
  const rng20  = candles.slice(-20).reduce((a, c) => a + (c.high - c.low), 0) / 20;
  const recent = candles.slice(-5).reduce((a, c) => a + (c.high - c.low), 0) / 5;
  return {
    ATR,
    healthy:    ATR >= rng20 * 0.3,
    expanding:  recent > rng20 * 1.3,
    contracting:recent < rng20 * 0.6,
  };
}
