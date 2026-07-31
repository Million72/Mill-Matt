// Final gate — checks the signal direction is confirmed by SUSTAINED price
// action across the last few closed candles, not just one.
//
// Why this changed: the previous version only checked the single most
// recent candle (bullish/bearish body >40% of its range). That's a very
// weak bar — a single strong-looking candle can easily be a brief overshoot
// or wick-driven anomaly, especially on synthetic indices which are noisy
// by design. This let signals fire the instant one candle looked
// convincing, with zero confirmation the move actually holds — the direct
// mechanism behind signals firing and then immediately reversing.
//
// The fix requires TWO things together:
//   1. The most recent candle still passes the original single-candle check
//      (directional body >40% of range) — kept as a baseline requirement.
//   2. At least 2 of the last 3 closed candles close in the signal's
//      direction relative to the PREVIOUS candle's close (i.e. genuine
//      step-by-step progress in that direction, not just one big candle
//      surrounded by noise).
export function confirmationEngine(candles, side) {
  if (!candles || candles.length < 4) return { confirmed: false, label: "Not enough candles for confirmation" };

  const last = candles[candles.length - 1];
  const isBullCandle = last.close > last.open;
  const isBearCandle = last.close < last.open;
  const bodySize = Math.abs(last.close - last.open);
  const candleRange = last.high - last.low || 0.000001;
  const bodyRatio = bodySize / candleRange;

  const singleCandleOk =
    (side === "bull" && isBullCandle && bodyRatio > 0.4) ||
    (side === "bear" && isBearCandle && bodyRatio > 0.4);

  if (!singleCandleOk) {
    return { confirmed: false, label: "No confirmation candle" };
  }

  // Sustained-direction check across the last 3 candles.
  const recent = candles.slice(-4); // need 4 candles to compare 3 consecutive closes
  let progressCount = 0;
  for (let i = 1; i < recent.length; i++) {
    const movedUp = recent[i].close > recent[i - 1].close;
    const movedDown = recent[i].close < recent[i - 1].close;
    if (side === "bull" && movedUp) progressCount++;
    if (side === "bear" && movedDown) progressCount++;
  }

  const sustained = progressCount >= 2; // at least 2 of the last 3 steps agree

  if (!sustained) {
    return {
      confirmed: false,
      label: `Direction not sustained — only ${progressCount}/3 recent candles agree (single strong candle is not enough)`,
    };
  }

  return {
    confirmed: true,
    label: side === "bull"
      ? `Bullish confirmation — sustained across ${progressCount}/3 recent candles`
      : `Bearish confirmation — sustained across ${progressCount}/3 recent candles`,
  };
}
