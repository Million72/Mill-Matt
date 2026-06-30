export const avg   = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
export const max   = arr => Math.max(...arr);
export const min   = arr => Math.min(...arr);
export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
export const round = (v, dp) => +v.toFixed(dp);

export function swingHighs(candles, window = 3) {
  const result = [];
  for (let i = window; i < candles.length - window; i++) {
    const slice = candles.slice(i - window, i + window + 1);
    if (candles[i].high === Math.max(...slice.map(c => c.high)))
      result.push({ i, price: candles[i].high, candle: candles[i] });
  }
  return result;
}

export function swingLows(candles, window = 3) {
  const result = [];
  for (let i = window; i < candles.length - window; i++) {
    const slice = candles.slice(i - window, i + window + 1);
    if (candles[i].low === Math.min(...slice.map(c => c.low)))
      result.push({ i, price: candles[i].low, candle: candles[i] });
  }
  return result;
}
