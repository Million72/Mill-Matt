// Trend Consistency — measures how CONSISTENTLY price has closed in one
// direction over a recent window, independent of ADX (which is already
// used elsewhere in the engine as "Trend Strength" via marketRegime.js).
// Building a second ADX-based check would be redundant, not additive — this
// module instead counts the raw proportion of up-closes vs down-closes,
// which can disagree with ADX (e.g. ADX can read "trending" even when a
// move is one big candle surrounded by choppy, inconsistent smaller ones —
// exactly the situation that produces a signal which fires then flips).
export function analyzeTrendConsistency(candles, window = 10) {
  if (candles.length < window + 1) return { consistent: false };

  const slice = candles.slice(-(window + 1));
  let upCloses = 0, downCloses = 0;

  for (let i = 1; i < slice.length; i++) {
    if (slice[i].close > slice[i - 1].close) upCloses++;
    else if (slice[i].close < slice[i - 1].close) downCloses++;
  }

  const total = upCloses + downCloses;
  if (total === 0) return { consistent: false };

  const bullRatio = upCloses / total;
  const bearRatio = downCloses / total;

  // Require at least 65% of closes agreeing in one direction to call the
  // recent move "consistent" — below that, it's too choppy/mixed to trust
  // even if the net price change over the window looks directional.
  const consistentBull = bullRatio >= 0.65;
  const consistentBear = bearRatio >= 0.65;

  return {
    consistent: consistentBull || consistentBear,
    side: consistentBull ? "bull" : consistentBear ? "bear" : null,
    bullRatio: +bullRatio.toFixed(2),
    bearRatio: +bearRatio.toFixed(2),
    label: consistentBull
      ? `Trend Consistency — ${(bullRatio * 100).toFixed(0)}% of recent candles closed higher`
      : consistentBear
      ? `Trend Consistency — ${(bearRatio * 100).toFixed(0)}% of recent candles closed lower`
      : null,
  };
}
