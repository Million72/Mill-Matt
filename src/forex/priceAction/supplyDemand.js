import { isBull, isBear, body, range } from "../../utils/helpers.js";

export function supplyDemand(candles) {
  if (candles.length < 10) return { zone: null };
  const last  = candles[candles.length - 1];
  const prev  = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];

  // Demand zone: strong bullish candle after a down-move (base candle + impulse)
  if (isBear(prev2) && body(prev) < range(prev) * 0.3 && isBull(last) && body(last) > body(prev2)) {
    return { zone: "DEMAND", side: "bull", top: last.close, bottom: prev.low, label: "Demand Zone — Bullish impulse from base" };
  }
  // Supply zone: strong bearish candle after an up-move
  if (isBull(prev2) && body(prev) < range(prev) * 0.3 && isBear(last) && body(last) > body(prev2)) {
    return { zone: "SUPPLY", side: "bear", top: prev.high, bottom: last.close, label: "Supply Zone — Bearish impulse from base" };
  }
  return { zone: null };
}
