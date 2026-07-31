// Volatility Forecast — flags when the CURRENT (most recent) candle's move
// is a statistical outlier relative to recent typical candle sizes, which
// makes it likely to be a spike/overshoot that mean-reverts rather than the
// start of a genuine sustained trend. This is distinct from
// volatilityAnalysis.js (which reports the general volatility regime, not
// whether THIS SPECIFIC candle looks like an outlier).
//
// Directly relevant to the "signal fires then flips" problem: a single
// unusually large candle can pass the confirmation-candle check while
// actually being exactly the kind of outlier this module is built to catch.
export function forecastVolatility(candles) {
  if (candles.length < 21) return { isOutlier: false };

  const last = candles[candles.length - 1];
  const lastRange = last.high - last.low;

  const priorRanges = candles.slice(-21, -1).map(c => c.high - c.low);
  const mean = priorRanges.reduce((a, b) => a + b, 0) / priorRanges.length;
  const variance = priorRanges.reduce((a, r) => a + (r - mean) ** 2, 0) / priorRanges.length;
  const std = Math.sqrt(variance);

  if (std === 0) return { isOutlier: false };

  const zScore = (lastRange - mean) / std;

  // A candle range more than 2.5 standard deviations above the recent
  // typical range is flagged as a likely mean-reversion candidate rather
  // than genuine trend continuation.
  const isOutlier = zScore > 2.5;

  return {
    isOutlier,
    zScore: +zScore.toFixed(2),
    label: isOutlier
      ? `Volatility Forecast — current candle is a ${zScore.toFixed(1)}σ outlier, likely to mean-revert`
      : null,
  };
}
