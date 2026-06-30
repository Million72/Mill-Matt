import { ema, emaArray } from "./ema.js";
export function macd(closes) {
  const e12 = ema(closes, 12), e26 = ema(closes, 26);
  if (!e12 || !e26) return { macdLine: 0, signal: 0, histogram: 0 };
  const macdLine = e12 - e26;
  const series = [];
  for (let i = 26; i <= closes.length; i++) {
    const a = ema(closes.slice(0, i), 12), b = ema(closes.slice(0, i), 26);
    if (a && b) series.push(a - b);
  }
  const signalLine = ema(series, 9) ?? macdLine;
  return { macdLine, signal: signalLine, histogram: macdLine - signalLine };
}
