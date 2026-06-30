import { isBull, isBear, body, range, upWick, dnWick } from "../../utils/helpers.js";

export function candlestickPatterns(candles) {
  if (candles.length < 3) return [];
  const pats = [];
  const c0 = candles[candles.length - 1];
  const c1 = candles[candles.length - 2];
  const c2 = candles[candles.length - 3];

  if (isBear(c1) && isBull(c0) && c0.open <= c1.close && c0.close >= c1.open)
    pats.push({ name: "Bullish Engulfing", side: "bull", strength: 3 });
  if (isBull(c1) && isBear(c0) && c0.open >= c1.close && c0.close <= c1.open)
    pats.push({ name: "Bearish Engulfing", side: "bear", strength: 3 });
  if (dnWick(c0) > body(c0) * 2 && upWick(c0) < body(c0) * 0.5)
    pats.push({ name: "Hammer", side: "bull", strength: 2 });
  if (upWick(c0) > body(c0) * 2 && dnWick(c0) < body(c0) * 0.5)
    pats.push({ name: "Shooting Star", side: "bear", strength: 2 });
  if (isBull(c2) && isBull(c1) && isBull(c0) && c1.close > c2.close && c0.close > c1.close)
    pats.push({ name: "Three White Soldiers", side: "bull", strength: 3 });
  if (isBear(c2) && isBear(c1) && isBear(c0) && c1.close < c2.close && c0.close < c1.close)
    pats.push({ name: "Three Black Crows", side: "bear", strength: 3 });

  return pats;
}
