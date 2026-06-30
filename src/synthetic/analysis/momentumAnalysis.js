import { rsi }  from "../../indicators/rsi.js";
import { macd } from "../../indicators/macd.js";

export function momentumAnalysis(candles) {
  const closes = candles.map(c => c.close);
  const RSI    = rsi(closes);
  const MACD   = macd(closes);

  const bullMomentum = RSI > 55 && MACD.histogram > 0;
  const bearMomentum = RSI < 45 && MACD.histogram < 0;

  return {
    RSI, MACD,
    bias:  bullMomentum ? "BULL" : bearMomentum ? "BEAR" : "NEUTRAL",
    overbought: RSI >= 70,
    oversold:   RSI <= 30,
  };
}
