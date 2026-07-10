import { swingHighs, swingLows } from "../../utils/math.js";

// Liquidity Sweep — price wicks beyond a recent swing high/low (grabbing
// resting stop-loss orders there) then closes back inside the prior range,
// signaling the "sweep" was a trap rather than a genuine breakout. Same
// geometric logic as the forex engine's detector.
export function liquiditySweep(candles, dec = 3) {
  if (candles.length < 20) return null;
  const slice = candles.slice(-30);
  const highs = swingHighs(slice.slice(0, -1), 3);
  const lows  = swingLows(slice.slice(0, -1), 3);
  const last  = candles[candles.length - 1];

  if (!highs.length || !lows.length) return null;

  const recentHigh = Math.max(...highs.map(h => h.price));
  const recentLow  = Math.min(...lows.map(l => l.price));

  if (last.low < recentLow && last.close > recentLow)
    return { side: "bull", level: recentLow, label: `Liq. Sweep below ${recentLow.toFixed(dec)} → Bullish reversal` };

  if (last.high > recentHigh && last.close < recentHigh)
    return { side: "bear", level: recentHigh, label: `Liq. Sweep above ${recentHigh.toFixed(dec)} → Bearish reversal` };

  return null;
}
