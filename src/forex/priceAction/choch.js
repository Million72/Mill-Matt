// Change of Character — first sign of trend reversal
export function detectCHoCH(candles, structure) {
  if (!structure || structure.highs.length < 2 || structure.lows.length < 2) return null;
  const last = candles[candles.length - 1];
  const { highs, lows, bias } = structure;

  // In bearish structure, CHoCH = price breaks above most recent lower high
  if (bias === "BEARISH") {
    const recentHigh = highs[highs.length - 1];
    if (last.close > recentHigh.price)
      return { type: "CHoCH", side: "bull", level: recentHigh.price, label: `CHoCH — Bullish reversal signal` };
  }
  // In bullish structure, CHoCH = price breaks below most recent higher low
  if (bias === "BULLISH") {
    const recentLow = lows[lows.length - 1];
    if (last.close < recentLow.price)
      return { type: "CHoCH", side: "bear", level: recentLow.price, label: `CHoCH — Bearish reversal signal` };
  }
  return null;
}
