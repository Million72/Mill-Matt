// Synthetic Engine V3 — deliberately minimal, per explicit instruction after
// real trading losses on the previous (more complex) version. This engine
// uses ONLY the 9 confirmed indicators below, with a 50-EMA-based stop-loss
// and a hard entry-timing gate (dollar-risk cap + EMA/VWAP proximity).
//
// Removed entirely from this version: entry models (all 11), liquidity
// sweep, BOS/CHoCH, momentum shift, range analysis, trend consistency. Not
// because those were necessarily wrong, but because the explicit decision
// was to simplify rather than keep layering complexity on a system that had
// already caused real financial losses. If this version also underperforms,
// that will be much easier to diagnose with 9 fixed indicators than with
// the prior ~20-factor scoring engine.
//
// Confirmed indicator set (per user-provided reference table):
//   MACD        — Buy/Sell signal
//   RSI         — Overbought/Oversold
//   Bollinger   — Volatility levels
//   9 EMA       — Short-term trend
//   21 EMA      — Entry/Exit points
//   50 EMA      — Stop-loss placement
//   200 EMA     — Long-term trend
//   VWAP        — Intraday reference/breakout level
//   ADX         — Trend strength

import { ema }            from "../indicators/ema.js";
import { rsi }             from "../indicators/rsi.js";
import { macd }            from "../indicators/macd.js";
import { bollingerBands }  from "../indicators/bollinger.js";
import { adx }             from "../indicators/adx.js";
import { atr }             from "../indicators/atr.js";
import { vwap }            from "../indicators/vwap.js";
import { checkEntryTiming } from "./filters/entryTimingFilter.js";

export function runSyntheticEngineV3(market, candles, htfCandles, opts = {}) {
  const price = candles[candles.length - 1].close;
  const dec = price > 999 ? 2 : 3;
  const closes = candles.map(c => c.close);

  const factors = [];
  let bull = 0, bear = 0;
  const add = (label, side, weight) => {
    if (side === "bull") bull += weight;
    else if (side === "bear") bear += weight;
    factors.push({ label, side, weight });
  };

  // ── Indicators ────────────────────────────────────────────────
  const ema9   = ema(closes, 9);
  const ema21  = ema(closes, 21);
  const ema50  = ema(closes, 50);
  const ema200 = ema(closes, 200);
  const RSI    = rsi(closes);
  const MACD   = macd(closes);
  const BB     = bollingerBands(candles);
  const ADX    = adx(candles);
  const ATR    = atr(candles);
  const VWAP   = vwap(candles);

  // ── 1. MACD — Buy/Sell signal ────────────────────────────────
  if (MACD.histogram > 0) add("MACD bullish crossover", "bull", 3);
  else if (MACD.histogram < 0) add("MACD bearish crossover", "bear", 3);

  // ── 2. RSI — Overbought/Oversold ─────────────────────────────
  if (RSI > 70) add(`RSI ${RSI.toFixed(1)} — overbought`, "bear", 2);
  else if (RSI < 30) add(`RSI ${RSI.toFixed(1)} — oversold`, "bull", 2);
  else if (RSI > 55) add(`RSI ${RSI.toFixed(1)} — bullish momentum`, "bull", 1);
  else if (RSI < 45) add(`RSI ${RSI.toFixed(1)} — bearish momentum`, "bear", 1);

  // ── 3. Bollinger Bands — Volatility levels ────────────────────
  if (BB) {
    if (price >= BB.upper) add("Price at/above upper Bollinger Band", "bear", 2);
    else if (price <= BB.lower) add("Price at/below lower Bollinger Band", "bull", 2);
  }

  // ── 4. 9 EMA — Short-term trend ──────────────────────────────
  if (ema9 != null) {
    if (price > ema9) add("Price above 9 EMA — short-term bullish", "bull", 1);
    else add("Price below 9 EMA — short-term bearish", "bear", 1);
  }

  // ── 5. 21 EMA — Entry/Exit points ────────────────────────────
  if (ema21 != null) {
    if (price > ema21) add("Price above 21 EMA", "bull", 2);
    else add("Price below 21 EMA", "bear", 2);
    if (ema9 != null) {
      if (ema9 > ema21) add("9 EMA above 21 EMA — bullish crossover state", "bull", 1);
      else if (ema9 < ema21) add("9 EMA below 21 EMA — bearish crossover state", "bear", 1);
    }
  }

  // ── 6. 200 EMA — Long-term trend ─────────────────────────────
  if (ema200 != null) {
    if (price > ema200) add("Price above 200 EMA — long-term bullish", "bull", 2);
    else add("Price below 200 EMA — long-term bearish", "bear", 2);
  }

  // ── 7. VWAP — Intraday breakout reference ────────────────────
  if (VWAP != null) {
    if (price > VWAP) add("Price above VWAP", "bull", 1);
    else add("Price below VWAP", "bear", 1);
  }

  // ── 8. ADX — Strength of the trend ───────────────────────────
  // A weak trend (ADX < 20) penalizes whichever side is currently leading —
  // same symmetric-penalty pattern used elsewhere in this codebase, so a
  // choppy market can't produce a confident-looking signal.
  if (ADX.adx >= 25) {
    if (ADX.plusDI > ADX.minusDI) add(`ADX ${ADX.adx.toFixed(1)} — confirmed uptrend`, "bull", 2);
    else add(`ADX ${ADX.adx.toFixed(1)} — confirmed downtrend`, "bear", 2);
  } else if (ADX.adx < 20) {
    const penalty = 2;
    if (bull > bear) bull = Math.max(0, bull - penalty);
    else if (bear > bull) bear = Math.max(0, bear - penalty);
    factors.push({ label: `ADX ${ADX.adx.toFixed(1)} — weak/ranging, confidence reduced`, side: "neutral", weight: -penalty });
  }

  // ── Determine direction ───────────────────────────────────────
  const MAX_SCORE = 17; // sum of all possible positive weights above
  const MIN_SCORE = 8;
  const MIN_MARGIN = 3;
  const MIN_CONFIDENCE_PCT = 70;

  const bullDominant = bull >= MIN_SCORE && bull > bear + MIN_MARGIN;
  const bearDominant = bear >= MIN_SCORE && bear > bull + MIN_MARGIN;

  const bullConf = Math.round((bull / MAX_SCORE) * 100);
  const bearConf = Math.round((bear / MAX_SCORE) * 100);

  let side = null;
  if (bullDominant) side = "bull";
  else if (bearDominant) side = "bear";

  if (!side) {
    return {
      type: "synthetic-v3", signal: "WAIT", confidence: Math.max(bullConf, bearConf),
      bullScore: bull, bearScore: bear, maxScore: MAX_SCORE, factors, price,
      blockReason: `Insufficient confluence (bull:${bull} bear:${bear})`,
    };
  }

  const confidence = side === "bull" ? bullConf : bearConf;
  if (confidence < MIN_CONFIDENCE_PCT) {
    return {
      type: "synthetic-v3", signal: "WAIT", confidence,
      bullScore: bull, bearScore: bear, maxScore: MAX_SCORE, factors, price,
      blockReason: `Confidence ${confidence}% below ${MIN_CONFIDENCE_PCT}% floor`,
    };
  }

  // ── 9. 50 EMA — Stop-loss placement ──────────────────────────
  // Per the confirmed indicator table, 50 EMA is used specifically to PLACE
  // the stop-loss, not just as a trend filter — replacing the previous
  // ATR-multiplier-based SL, which produced 50-2000+ point stops.
  let sl = null, tp1 = null, tp2 = null;
  if (ema50 != null) {
    // SL sits just beyond the 50 EMA on the side that would invalidate the
    // trade — a small ATR-based buffer (0.3x, much tighter than the old
    // 1.2-1.5x) is added so normal noise around the EMA doesn't trigger an
    // immediate stop-out, without reintroducing the old wide-stop problem.
    const buffer = (ATR ?? 0) * 0.3;
    if (side === "bull") {
      sl = +(Math.min(ema50, price) - buffer).toFixed(dec);
      const risk = price - sl;
      tp1 = +(price + risk * 1.5).toFixed(dec);
      tp2 = +(price + risk * 2.5).toFixed(dec);
    } else {
      sl = +(Math.max(ema50, price) + buffer).toFixed(dec);
      const risk = sl - price;
      tp1 = +(price - risk * 1.5).toFixed(dec);
      tp2 = +(price - risk * 2.5).toFixed(dec);
    }
  }

  // ── Entry Timing Filter — hard gate ──────────────────────────
  const timing = checkEntryTiming(candles, price, sl, ema50, VWAP, ATR, opts);
  if (!timing.allowed) {
    return {
      type: "synthetic-v3", signal: "WAIT", confidence,
      bullScore: bull, bearScore: bear, maxScore: MAX_SCORE, factors, price,
      blockReason: timing.reason, estimatedRiskUsd: timing.estimatedRiskUsd,
    };
  }

  const rr = tp1 && sl ? +(Math.abs(tp1 - price) / Math.abs(sl - price)).toFixed(2) : null;

  return {
    type: "synthetic-v3",
    signal: side === "bull" ? "BUY" : "SELL",
    confidence,
    bullScore: bull, bearScore: bear, maxScore: MAX_SCORE,
    factors, price, sl, tp1, tp2, rr,
    estimatedRiskUsd: timing.estimatedRiskUsd,
    rsi: +RSI.toFixed(1),
    macdBull: MACD.histogram > 0,
    ema9: ema9 != null ? +ema9.toFixed(dec) : null,
    ema21: ema21 != null ? +ema21.toFixed(dec) : null,
    ema50: ema50 != null ? +ema50.toFixed(dec) : null,
    ema200: ema200 != null ? +ema200.toFixed(dec) : null,
    vwap: VWAP != null ? +VWAP.toFixed(dec) : null,
    adx: +ADX.adx.toFixed(1),
    atr: ATR != null ? +ATR.toFixed(dec + 1) : null,
  };
      }
