import { adx } from "../../indicators/adx.js";

export function marketRegime(candles) {
  const ADX = adx(candles);
  return {
    ADX,
    regime:    ADX.adx > 25 ? "TREND" : "RANGE",
    trending:  ADX.adx > 25,
    direction: ADX.plusDI > ADX.minusDI ? "BULL" : "BEAR",
  };
}
