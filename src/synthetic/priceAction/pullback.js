import { ema } from "../../indicators/ema.js";

export function detectPullback(candles, trendBias) {
  if (candles.length < 21) return null;
  const closes = candles.map(c => c.close);
  const ema21  = ema(closes, 21);
  const last   = candles[candles.length - 1];
  const price  = last.close;

  if (!ema21) return null;
  const dist = Math.abs(price - ema21) / ema21;

  // Pullback to EMA21 in direction of trend
  if (trendBias === "BULL" && price <= ema21 * 1.002 && price >= ema21 * 0.998)
    return { side: "bull", label: "Pullback to EMA21 in bullish trend" };
  if (trendBias === "BEAR" && price >= ema21 * 0.998 && price <= ema21 * 1.002)
    return { side: "bear", label: "Pullback to EMA21 in bearish trend" };
  return null;
}
