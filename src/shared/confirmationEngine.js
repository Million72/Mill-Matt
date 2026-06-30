// Final gate — checks the confirmation candle aligns with signal direction
export function confirmationEngine(candles, side) {
  if (!candles || candles.length < 2) return { confirmed: false };
  const last = candles[candles.length - 1];
  const isBullCandle = last.close > last.open;
  const isBearCandle = last.close < last.open;
  const bodySize = Math.abs(last.close - last.open);
  const candleRange = last.high - last.low || 0.000001;
  const bodyRatio = bodySize / candleRange;

  if (side === "bull" && isBullCandle && bodyRatio > 0.4)
    return { confirmed: true, label: "Bullish confirmation candle" };
  if (side === "bear" && isBearCandle && bodyRatio > 0.4)
    return { confirmed: true, label: "Bearish confirmation candle" };

  return { confirmed: false, label: "No confirmation candle" };
}
