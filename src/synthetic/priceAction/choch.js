// Change of Character — the FIRST break against prevailing structure,
// signaling a potential trend reversal (as opposed to BOS, which confirms
// continuation). Same logic as the forex engine's CHoCH detector.
export function detectCHoCH(candles, structure) {
  if (!structure || structure.highs.length < 2 || structure.lows.length < 2) return null;
  const last = candles[candles.length - 1];
  const { highs, lows, bias } = structure;

  if (bias === "BEARISH") {
    const recentHigh = highs[highs.length - 1];
    if (last.close > recentHigh.price)
      return { type: "CHoCH", side: "bull", level: recentHigh.price, label: "CHoCH — Bullish reversal signal" };
  }
  if (bias === "BULLISH") {
    const recentLow = lows[lows.length - 1];
    if (last.close < recentLow.price)
      return { type: "CHoCH", side: "bear", level: recentLow.price, label: "CHoCH — Bearish reversal signal" };
  }
  return null;
}
