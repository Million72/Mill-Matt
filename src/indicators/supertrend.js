import { atrArray } from "./atr.js";
export function supertrend(candles, period = 10, multiplier = 3) {
  if (!candles || candles.length < period + 1) return { direction: 0, value: 0 };
  const atrs = atrArray(candles, period);
  const offset = candles.length - atrs.length;
  let upperBand = 0, lowerBand = 0, prevUpper = 0, prevLower = 0, trend = 1;
  const results = [];
  for (let i = 0; i < atrs.length; i++) {
    const idx  = i + offset;
    const hl2  = (candles[idx].high + candles[idx].low) / 2;
    const atrV = atrs[i];
    upperBand = hl2 + multiplier * atrV;
    lowerBand = hl2 - multiplier * atrV;
    if (i > 0) {
      upperBand = upperBand < prevUpper || candles[idx - 1].close > prevUpper ? upperBand : prevUpper;
      lowerBand = lowerBand > prevLower || candles[idx - 1].close < prevLower ? lowerBand : prevLower;
    }
    if (i === 0) { trend = 1; }
    else if (candles[idx].close > prevUpper) { trend = 1; }
    else if (candles[idx].close < prevLower) { trend = -1; }
    prevUpper = upperBand; prevLower = lowerBand;
    results.push({ direction: trend, value: trend === 1 ? lowerBand : upperBand });
  }
  return results[results.length - 1] || { direction: 0, value: 0 };
}
