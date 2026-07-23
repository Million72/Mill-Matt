// Sweep history detection — finds ALL liquidity sweeps in recent candle
// history (not just the most recent one), needed for Turtle Soup and Double
// Liquidity Sweep, both of which reference specific historical sweep
// relationships rather than just "is there a sweep right now."
//
// This is deliberately separate from priceAction/liquiditySweep.js (used by
// the main scoring engine), which only reports the single latest sweep —
// existing code depends on that simple shape, so it's left untouched.
import { swingHighs, swingLows } from "../../utils/math.js";

// detectAllSweeps scans a window of recent candles and returns every
// instance where a candle wicked beyond a PRIOR swing extreme and closed
// back inside it — the same core definition as liquiditySweep.js, just
// applied across a history window instead of only the final candle.
export function detectAllSweeps(candles, lookback = 40) {
  if (candles.length < lookback + 10) return [];
  const start = candles.length - lookback;
  const sweeps = [];

  for (let i = start; i < candles.length; i++) {
    // Swings computed from candles strictly BEFORE this one, so a sweep at
    // index i is judged against what was actually known at that point —
    // not against swings that only exist because of later price action.
    const priorSlice = candles.slice(Math.max(0, i - 30), i);
    if (priorSlice.length < 10) continue;

    const highs = swingHighs(priorSlice, 3);
    const lows  = swingLows(priorSlice, 3);
    if (!highs.length || !lows.length) continue;

    const recentHigh = Math.max(...highs.map(h => h.price));
    const recentLow  = Math.min(...lows.map(l => l.price));
    const c = candles[i];

    if (c.low < recentLow && c.close > recentLow) {
      sweeps.push({ index: i, side: "bull", level: recentLow });
    } else if (c.high > recentHigh && c.close < recentHigh) {
      sweeps.push({ index: i, side: "bear", level: recentHigh });
    }
  }
  return sweeps;
}

// ── Turtle Soup ──────────────────────────────────────────────────
// A specific, stricter variant of a liquidity sweep: price sweeps beyond
// the extreme high/low of a well-established prior range (classically the
// last 20 periods — the origin of "Turtle Soup" as a name, referencing the
// Turtle Trading breakout system this pattern is designed to trap/fade),
// then reverses. The key difference from a generic sweep is the STRENGTH
// of the level being swept — it must be the genuine extreme of a full
// 20-period range, not just any nearby minor swing point.
export function detectTurtleSoup(candles, periods = 20) {
  if (candles.length < periods + 5) return null;
  const last = candles[candles.length - 1];
  const rangeSlice = candles.slice(-(periods + 1), -1); // the 20 periods BEFORE the current candle

  const rangeHigh = Math.max(...rangeSlice.map(c => c.high));
  const rangeLow  = Math.min(...rangeSlice.map(c => c.low));

  if (last.low < rangeLow && last.close > rangeLow) {
    return { side: "bull", level: rangeLow, label: `Turtle Soup — swept ${periods}-period low ${rangeLow.toFixed(3)}, reversed` };
  }
  if (last.high > rangeHigh && last.close < rangeHigh) {
    return { side: "bear", level: rangeHigh, label: `Turtle Soup — swept ${periods}-period high ${rangeHigh.toFixed(3)}, reversed` };
  }
  return null;
}

// ── Double Liquidity Sweep ───────────────────────────────────────
// Two sweeps on the SAME side occurring close together in the recent
// history — e.g. price sweeps a low, retraces, sweeps a slightly lower low
// again shortly after. This is considered a stronger signal than a single
// sweep, since repeated liquidity grabs at the same general level suggest
// more thorough stop-hunting has occurred before the real move.
export function detectDoubleSweep(candles, maxGap = 15) {
  const sweeps = detectAllSweeps(candles, 50);
  if (sweeps.length < 2) return null;

  // Check the two most recent sweeps for same-side + proximity in time.
  const last = sweeps[sweeps.length - 1];
  const prev = sweeps[sweeps.length - 2];

  if (last.side === prev.side && (last.index - prev.index) <= maxGap && (last.index - prev.index) >= 2) {
    return {
      side: last.side,
      label: `Double Liquidity Sweep (${last.side}) — two sweeps ${last.index - prev.index} candles apart`,
    };
  }
  return null;
}
