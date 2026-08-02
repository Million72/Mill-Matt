// Bollinger Bands — standard 20-period SMA with 2 standard deviation bands.
export function bollingerBands(candles, period = 20, stdDevMultiplier = 2) {
  if (!candles || candles.length < period) return null;
  const closes = candles.slice(-period).map(c => c.close);

  const mean = closes.reduce((a, b) => a + b, 0) / period;
  const variance = closes.reduce((a, c) => a + (c - mean) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    middle: mean,
    upper: mean + stdDevMultiplier * stdDev,
    lower: mean - stdDevMultiplier * stdDev,
    bandwidth: (2 * stdDevMultiplier * stdDev) / mean, // normalized width, useful for volatility-level reads
  };
}
