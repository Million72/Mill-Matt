import { rsi }  from "../../indicators/rsi.js";
import { macd } from "../../indicators/macd.js";

// Momentum Shift — detects momentum DECELERATING even while price still
// moves in the current direction. This is genuinely different from
// momentumAnalysis.js (which only reports current momentum bias) — this
// module looks for early warning signs that a move is running out of
// steam, which is exactly the kind of thing that should have prevented
// signals from firing right before a reversal.
//
// Two independent checks, either of which counts as a shift warning:
//   1. MACD histogram shrinking over the last 3 candles while price still
//      makes new highs/lows in the trend direction (classic momentum
//      divergence — price extends, momentum doesn't confirm it).
//   2. RSI failing to make a new extreme alongside a new price extreme
//      (price makes a higher high, RSI makes a lower high — bearish
//      divergence; mirrored for bullish).
export function detectMomentumShift(candles) {
  if (candles.length < 30) return { warning: false };

  const closes = candles.map(c => c.close);
  const last3 = closes.slice(-3);

  // MACD histogram trend over last 3 candles
  const histories = [];
  for (let i = candles.length - 3; i < candles.length; i++) {
    const slice = closes.slice(0, i + 1);
    histories.push(macd(slice).histogram);
  }
  const macdShrinking = Math.abs(histories[2]) < Math.abs(histories[1]) && Math.abs(histories[1]) < Math.abs(histories[0]);

  const priceRising = last3[2] > last3[0];
  const priceFalling = last3[2] < last3[0];

  // Bullish move but MACD momentum shrinking = bullish momentum shift warning
  const bullishShiftWarning = priceRising && macdShrinking && histories[2] > 0;
  // Bearish move but MACD momentum shrinking = bearish momentum shift warning
  const bearishShiftWarning = priceFalling && macdShrinking && histories[2] < 0;

  // RSI divergence check over a slightly longer window (last 10 candles)
  const rsiWindow = candles.slice(-10);
  const rsiCloses = rsiWindow.map(c => c.close);
  const priorRSI = rsi(closes.slice(0, closes.length - 5));
  const currentRSI = rsi(closes);

  const priceMadeHigherHigh = Math.max(...rsiWindow.slice(-5).map(c => c.high)) > Math.max(...rsiWindow.slice(0, 5).map(c => c.high));
  const priceMadeLowerLow = Math.min(...rsiWindow.slice(-5).map(c => c.low)) < Math.min(...rsiWindow.slice(0, 5).map(c => c.low));

  const rsiDivergenceBear = priceMadeHigherHigh && currentRSI < priorRSI;
  const rsiDivergenceBull = priceMadeLowerLow && currentRSI > priorRSI;

  if (bullishShiftWarning || rsiDivergenceBear) {
    return {
      warning: true,
      side: "bear", // warns AGAINST the current bullish move
      label: rsiDivergenceBear
        ? "Momentum Shift — RSI divergence, bullish move losing steam"
        : "Momentum Shift — MACD histogram shrinking on bullish move",
    };
  }
  if (bearishShiftWarning || rsiDivergenceBull) {
    return {
      warning: true,
      side: "bull", // warns AGAINST the current bearish move
      label: rsiDivergenceBull
        ? "Momentum Shift — RSI divergence, bearish move losing steam"
        : "Momentum Shift — MACD histogram shrinking on bearish move",
    };
  }

  return { warning: false };
      }
