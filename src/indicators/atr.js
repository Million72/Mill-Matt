export function atr(candles, period = 14) {
  if (!candles || candles.length < period + 1) return null;
  const trs = candles.slice(1).map((c, i) =>
    Math.max(c.high - c.low, Math.abs(c.high - candles[i].close), Math.abs(c.low - candles[i].close))
  );
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}
export function atrArray(candles, period = 14) {
  if (!candles || candles.length < period + 1) return [];
  const trs = candles.slice(1).map((c, i) =>
    Math.max(c.high - c.low, Math.abs(c.high - candles[i].close), Math.abs(c.low - candles[i].close))
  );
  const result = [];
  let sum = trs.slice(0, period).reduce((a, b) => a + b, 0);
  result.push(sum / period);
  for (let i = period; i < trs.length; i++) {
    sum = (result[result.length - 1] * (period - 1) + trs[i]);
    result.push(sum / period);
  }
  return result;
}
