export function detectBreakout(candles, sr) {
  if (!sr || !sr.resistance || !sr.support) return null;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  if (prev.close <= sr.resistance && last.close > sr.resistance)
    return { side: "bull", label: `Breakout above ${sr.resistance}` };
  if (prev.close >= sr.support && last.close < sr.support)
    return { side: "bear", label: `Breakout below ${sr.support}` };
  return null;
}
