import { adx } from "../../indicators/adx.js";

export function marketRegime(candles) {
  const ADX = adx(candles);
  // ADX > 25 = trending, < 20 = ranging
  const trending = ADX.adx > 25;
  const strong   = ADX.adx > 40;
  const regime   = trending ? (strong ? "STRONG_TREND" : "TREND") : "RANGE";
  const direction = ADX.plusDI > ADX.minusDI ? "BULL" : "BEAR";

  return { ADX, regime, trending, strong, direction };
}
