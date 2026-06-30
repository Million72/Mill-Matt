import { rsi } from "../../indicators/rsi.js";
import { macd } from "../../indicators/macd.js";

export function momentumAnalysis(candles) {
  const closes = candles.map(c => c.close);
  const RSI    = rsi(closes);
  const MACD   = macd(closes);

  let bias = "NEUTRAL";
  if (RSI > 55 && MACD.histogram > 0)      bias = "BULLISH";
  else if (RSI < 45 && MACD.histogram < 0) bias = "BEARISH";
  else if (RSI > 55 || MACD.histogram > 0) bias = "LEANING_BULL";
  else if (RSI < 45 || MACD.histogram < 0) bias = "LEANING_BEAR";

  return { RSI, MACD, bias, overbought: RSI >= 70, oversold: RSI <= 30 };
}
