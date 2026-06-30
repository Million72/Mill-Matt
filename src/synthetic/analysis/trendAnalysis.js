import { ema } from "../../indicators/ema.js";

export function trendAnalysis(candles) {
  if (candles.length < 21) return { bias: "NEUTRAL", ema9: null, ema21: null, ema50: null };
  const closes = candles.map(c => c.close);
  const ema9   = ema(closes, 9);
  const ema21  = ema(closes, 21);
  const ema50  = ema(closes, 50);
  const price  = closes[closes.length - 1];

  let score = 0;
  if (ema9 && ema21 && ema9   > ema21)  score++;
  if (ema21 && ema50 && ema21 > ema50)  score++;
  if (price && ema21 && price > ema21)  score++;

  return {
    bias:  score >= 2 ? "BULLISH" : score === 0 ? "BEARISH" : "NEUTRAL",
    score,
    ema9, ema21, ema50, price,
  };
}
