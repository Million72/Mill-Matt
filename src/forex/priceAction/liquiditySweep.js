import { swingHighs, swingLows } from "../../utils/math.js";

export function liquiditySweep(candles, dec = 5) {
  if (candles.length < 20) return null;
  const slice   = candles.slice(-30);
  const highs   = swingHighs(slice.slice(0, -1), 3);
  const lows    = swingLows(slice.slice(0, -1), 3);
  const last    = candles[candles.length - 1];

  if (!highs.length || !lows.length) return null;

  const recentHigh = Math.max(...highs.map(h => h.price));
  const recentLow  = Math.min(...lows.map(l => l.price));

  // Wick below recent low then closes back above = stop hunt → buy
  if (last.low < recentLow && last.close > recentLow)
    return { side: "bull", level: recentLow, label: `Liq. Sweep below ${recentLow.toFixed(dec)} → Bullish reversal` };

  // Wick above recent high then closes back below = stop hunt → sell
  if (last.high > recentHigh && last.close < recentHigh)
    return { side: "bear", level: recentHigh, label: `Liq. Sweep above ${recentHigh.toFixed(dec)} → Bearish reversal` };

  return null;
}
