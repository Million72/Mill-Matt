export function volumeProfile(candles, lookback = 20) {
  if (!candles || candles.length < lookback) return { trend: "NEUTRAL", surge: false };
  const recent = candles.slice(-lookback);
  // Use candle body size as volume proxy (Deriv doesn't provide real volume)
  const bodies = recent.map(c => Math.abs(c.close - c.open));
  const avgBody = bodies.reduce((a, b) => a + b, 0) / bodies.length;
  const lastBody = bodies[bodies.length - 1];
  const surge = lastBody > avgBody * 1.5;
  const bullBodies = recent.filter(c => c.close > c.open).reduce((a, c) => a + Math.abs(c.close - c.open), 0);
  const bearBodies = recent.filter(c => c.close < c.open).reduce((a, c) => a + Math.abs(c.close - c.open), 0);
  const trend = bullBodies > bearBodies * 1.2 ? "BULL" : bearBodies > bullBodies * 1.2 ? "BEAR" : "NEUTRAL";
  return { trend, surge, avgBody, lastBody };
}
