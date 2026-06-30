import { supertrend } from "../../indicators/supertrend.js";

export function trendDirection(candles) {
  const ST = supertrend(candles, 10, 3);
  const closes = candles.map(c => c.close);
  const price  = closes[closes.length - 1];
  return {
    ST,
    direction: ST.direction === 1 ? "BULL" : ST.direction === -1 ? "BEAR" : "NEUTRAL",
    price,
    supertrendValue: ST.value,
  };
}
