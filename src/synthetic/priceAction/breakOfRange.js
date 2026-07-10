// Break of Range (BOR) — detects a period of tight consolidation (a defined
// range) followed by a decisive close outside that range. This is distinct
// from BOS: BOS breaks a swing point implying trend continuation, whereas
// BOR specifically requires the price to have been genuinely RANGING first
// (low volatility, contained within a tight band) before the break, which
// signals a fresh directional move starting from consolidation rather than
// a continuation of an already-trending market.
export function detectBOR(candles, dec = 3) {
  if (candles.length < 25) return null;

  // Define the "range" as the last 15 candles before the most recent one.
  const rangeWindow = candles.slice(-16, -1);
  const last        = candles[candles.length - 1];

  const rangeHigh = Math.max(...rangeWindow.map(c => c.high));
  const rangeLow  = Math.min(...rangeWindow.map(c => c.low));
  const rangeSize = rangeHigh - rangeLow;

  if (rangeSize <= 0) return null;

  // Confirm it was genuinely a tight range: average candle range should be
  // small relative to the overall range span — otherwise this was already
  // trending/volatile, not consolidating, and calling it a "range break"
  // would be misleading.
  const avgCandleRange = rangeWindow.reduce((sum, c) => sum + (c.high - c.low), 0) / rangeWindow.length;
  const isTightRange = avgCandleRange < rangeSize * 0.5;

  if (!isTightRange) return null;

  if (last.close > rangeHigh) {
    return { side: "bull", level: rangeHigh, label: `BOR — Broke range high ${rangeHigh.toFixed(dec)}` };
  }
  if (last.close < rangeLow) {
    return { side: "bear", level: rangeLow, label: `BOR — Broke range low ${rangeLow.toFixed(dec)}` };
  }
  return null;
}
