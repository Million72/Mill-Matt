export function detectRetest(candles, sr) {
  if (!sr || !sr.resistance || !sr.support) return null;
  const last = candles[candles.length - 1];
  const rng  = Math.abs(sr.resistance - sr.support) || 1;
  const zone = rng * 0.04;
  if (last.low <= sr.resistance + zone && last.close > sr.resistance - zone)
    return { side: "bull", label: "Retest of resistance as support" };
  if (last.high >= sr.support - zone && last.close < sr.support + zone)
    return { side: "bear", label: "Retest of support as resistance" };
  return null;
}
