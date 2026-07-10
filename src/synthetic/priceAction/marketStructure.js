import { swingHighs, swingLows } from "../../utils/math.js";

// Same HH/HL vs LH/LL structure logic used in the forex engine — this is
// pure price-swing geometry, not forex-specific, so it applies identically
// to synthetic indices. Kept as its own file in synthetic/ (rather than
// importing across from forex/) to keep the two engines fully independent,
// per the existing architecture split.
export function marketStructure(candles) {
  if (candles.length < 20) return { bias: "NEUTRAL", highs: [], lows: [] };
  const highs = swingHighs(candles.slice(-60), 3);
  const lows  = swingLows(candles.slice(-60), 3);

  if (highs.length < 2 || lows.length < 2) return { bias: "NEUTRAL", highs, lows };

  const lastTwo = arr => [arr[arr.length - 2], arr[arr.length - 1]];
  const [h1, h2] = lastTwo(highs);
  const [l1, l2] = lastTwo(lows);

  const hhhl = h2.price > h1.price && l2.price > l1.price;
  const lhll = h2.price < h1.price && l2.price < l1.price;

  return {
    bias:     hhhl ? "BULLISH" : lhll ? "BEARISH" : "NEUTRAL",
    highs,
    lows,
    lastHigh: highs[highs.length - 1],
    lastLow:  lows[lows.length - 1],
  };
}
