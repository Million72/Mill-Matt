import { ema } from "../../indicators/ema.js";

export function trendAnalysis(candles) {
  if (candles.length < 50) return { bias: "NEUTRAL", strength: 0, ema9: null, ema21: null, ema50: null, ema200: null };
  const closes = candles.map(c => c.close);
  const ema9   = ema(closes, 9);
  const ema21  = ema(closes, 21);
  const ema50  = ema(closes, 50);
  const ema200 = ema(closes, 200);
  const price  = closes[closes.length - 1];

  // Score trend alignment
  let score = 0;
  if (ema9  && ema21  && ema9  > ema21)  score++;
  if (ema21 && ema50  && ema21 > ema50)  score++;
  if (ema50 && ema200 && ema50 > ema200) score++;
  if (price && ema9   && price > ema9)   score++;

  const bias = score >= 3 ? "BULLISH" : score <= 1 ? "BEARISH" : "NEUTRAL";

  return { bias, strength: score, ema9, ema21, ema50, ema200, price };
}
