// Break of Structure — continuation signal confirming the existing trend
// direction (price closes beyond the most recent swing high/low in the
// direction structure already implies). Identical logic to the forex
// engine's BOS detector — this is pure swing-price geometry.
export function detectBOS(candles, structure) {
  if (!structure || !structure.lastHigh || !structure.lastLow) return null;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  if (prev.close <= structure.lastHigh.price && last.close > structure.lastHigh.price) {
    return { type: "BOS", side: "bull", level: structure.lastHigh.price, label: `BOS Bullish — broke ${structure.lastHigh.price}` };
  }
  if (prev.close >= structure.lastLow.price && last.close < structure.lastLow.price) {
    return { type: "BOS", side: "bear", level: structure.lastLow.price, label: `BOS Bearish — broke ${structure.lastLow.price}` };
  }
  return null;
}
