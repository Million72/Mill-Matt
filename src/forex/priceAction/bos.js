// Break of Structure
export function detectBOS(candles, structure) {
  if (!structure || !structure.lastHigh || !structure.lastLow) return null;
  const last  = candles[candles.length - 1];
  const prev  = candles[candles.length - 2];

  // Bullish BOS: candle closes above last swing high
  if (prev.close <= structure.lastHigh.price && last.close > structure.lastHigh.price) {
    return { type: "BOS", side: "bull", level: structure.lastHigh.price, label: `BOS Bullish — broke ${structure.lastHigh.price}` };
  }
  // Bearish BOS: candle closes below last swing low
  if (prev.close >= structure.lastLow.price && last.close < structure.lastLow.price) {
    return { type: "BOS", side: "bear", level: structure.lastLow.price, label: `BOS Bearish — broke ${structure.lastLow.price}` };
  }
  return null;
}
