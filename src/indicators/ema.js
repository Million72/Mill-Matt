export function ema(prices, period) {
  if (!prices || prices.length < period) return null;
  const k = 2 / (period + 1);
  let v = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) v = prices[i] * k + v * (1 - k);
  return v;
}
export function emaArray(prices, period) {
  if (!prices || prices.length < period) return [];
  const k = 2 / (period + 1);
  const result = [];
  let v = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(v);
  for (let i = period; i < prices.length; i++) {
    v = prices[i] * k + v * (1 - k);
    result.push(v);
  }
  return result;
}
