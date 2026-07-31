// Range Analysis — measures WHERE price currently sits within an
// established recent range, and how tight/wide that range is. Distinct
// from marketRegime.js (which only classifies overall TREND-vs-RANGE via
// ADX) and breakOfRange.js (which detects a breakout FROM a range) — this
// module answers "if we're not clearly trending, how meaningful is a
// directional signal right now given where price sits inside its range?"
//
// A signal firing near the MIDDLE of a tight, well-established range is a
// weak setup regardless of what other indicators say — there's no room for
// the move to develop before hitting the opposite range boundary. This is
// directly relevant to reducing "fires then flips" behavior: a signal born
// in the middle of a range has nowhere real to go.
export function analyzeRange(candles, lookback = 20) {
  if (candles.length < lookback) return { inRange: false };

  const slice = candles.slice(-lookback);
  const rangeHigh = Math.max(...slice.map(c => c.high));
  const rangeLow = Math.min(...slice.map(c => c.low));
  const rangeSize = rangeHigh - rangeLow;

  if (rangeSize <= 0) return { inRange: false };

  const price = candles[candles.length - 1].close;
  const positionInRange = (price - rangeLow) / rangeSize; // 0 = at range low, 1 = at range high

  // Check how "tight" the range actually is — average candle range small
  // relative to the total range span suggests genuine consolidation, not
  // just a wide chop that happens to have a high and a low.
  const avgCandleRange = slice.reduce((sum, c) => sum + (c.high - c.low), 0) / slice.length;
  const isTightRange = avgCandleRange < rangeSize * 0.5;

  const nearMiddle = positionInRange > 0.35 && positionInRange < 0.65;
  const nearHigh = positionInRange >= 0.8;
  const nearLow = positionInRange <= 0.2;

  return {
    inRange: isTightRange,
    rangeHigh,
    rangeLow,
    positionInRange: +positionInRange.toFixed(2),
    nearMiddle,
    nearHigh,
    nearLow,
    // A signal is "weak by range position" if the range is genuinely tight
    // AND price sits near the middle — the worst combination for a fresh
    // directional move to actually develop.
    weakByPosition: isTightRange && nearMiddle,
    label: isTightRange && nearMiddle
      ? "Range Analysis — price mid-range in a tight consolidation, weak setup"
      : null,
  };
}
