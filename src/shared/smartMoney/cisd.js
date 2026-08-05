// CISD (Change in State of Delivery) — a STRICTER variant of MSS/CHoCH, not
// an alias of it. Where MSS/CHoCH only requires the candle's CLOSE to break
// a prior swing level, CISD requires:
//   1. A full-body close beyond the level (the candle's OPEN must already
//      be on the correct side too — not just a wick-through-then-close-back
//      situation, but genuine directional conviction for the whole candle)
//   2. Confirmation from the very next candle continuing in the same
//      direction (closing further beyond the level, not immediately
//      reversing back)
//
// This deliberately fires less often than MSS/CHoCH alone — that's the
// honest point of giving it a separate name and separate detector, rather
// than silently relabeling the same signal a third time (which would let
// "CISD + FVG" as an entry model be trivially satisfied any time
// "MSS + FVG" already was, adding no real additional filter).
export function detectCISD(candles, structure) {
  if (!structure || structure.highs.length < 2 || structure.lows.length < 2 || candles.length < 3) return null;

  const curr = candles[candles.length - 1];
  const next = null; // CISD confirms on the candle AFTER curr — see below for how this is actually evaluated in practice

  const { highs, lows, bias } = structure;

  // We evaluate CISD one candle "behind" the very latest, so that we can
  // check the following candle for confirmation. This means CISD naturally
  // lags MSS/CHoCH by one candle — an intentional tradeoff for the extra
  // confirmation this concept represents.
  if (candles.length < 4) return null;
  const candidate = candles[candles.length - 2];
  const confirm   = candles[candles.length - 1];

  if (bias === "BEARISH") {
    const recentHigh = highs[highs.length - 1];
    const fullBodyBreak = candidate.open > recentHigh.price && candidate.close > recentHigh.price;
    const confirmed = confirm.close > candidate.close;
    if (fullBodyBreak && confirmed) {
      return { type: "CISD", side: "bull", level: recentHigh.price, label: "CISD — Bullish delivery shift confirmed" };
    }
  }
  if (bias === "BULLISH") {
    const recentLow = lows[lows.length - 1];
    const fullBodyBreak = candidate.open < recentLow.price && candidate.close < recentLow.price;
    const confirmed = confirm.close < candidate.close;
    if (fullBodyBreak && confirmed) {
      return { type: "CISD", side: "bear", level: recentLow.price, label: "CISD — Bearish delivery shift confirmed" };
    }
  }
  return null;
}
