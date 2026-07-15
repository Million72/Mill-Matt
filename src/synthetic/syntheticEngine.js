import { trendAnalysis }      from "./analysis/trendAnalysis.js";
import { momentumAnalysis }   from "./analysis/momentumAnalysis.js";
import { volatilityAnalysis } from "./analysis/volatilityAnalysis.js";
import { marketRegime }       from "./analysis/marketRegime.js";
import { trendDirection }     from "./priceAction/trendDirection.js";
import { dynamicSR }          from "./priceAction/dynamicSupportResistance.js";
import { detectPullback }     from "./priceAction/pullback.js";
import { detectBreakout }     from "./priceAction/breakout.js";
import { detectRetest }       from "./priceAction/retest.js";
import { candlestickPatterns } from "./priceAction/candlestickPatterns.js";
import { chartPatterns }      from "./priceAction/chartPatterns.js";
import { trendFilter }        from "./filters/trendFilter.js";
import { momentumFilter }     from "./filters/momentumFilter.js";
import { volatilityFilter }   from "./filters/volatilityFilter.js";
import { marketStructure }    from "./priceAction/marketStructure.js";
import { liquiditySweep }     from "./priceAction/liquiditySweep.js";
import { detectBOS }          from "./priceAction/bos.js";
import { detectCHoCH }        from "./priceAction/choch.js";
import { detectBOR }          from "./priceAction/breakOfRange.js";
import { detectZoneRetest }   from "./priceAction/fvgOrderBlock.js";

// Lightweight ATR estimate used only to decide whether BOS and Breakout are
// reporting the same underlying price event (see STEP 11 below). Not the
// same as the full indicators/atr.js used for TP/SL sizing — this is a
// cheap local proxy, sufficient for a "same level or not" distance check.
function atrEstimate(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const slice = candles.slice(-period - 1);
  let sum = 0;
  for (let i = 1; i < slice.length; i++) {
    const c = slice[i], p = slice[i - 1];
    sum += Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
  }
  return sum / (slice.length - 1);
}

export function runSyntheticEngine(market, candles, htfCandles) {
  const { symbol } = market;
  const price   = candles[candles.length - 1].close;
  const dec     = price > 999 ? 2 : 3;
  const steps   = [];
  const flags   = { bull: 0, bear: 0, blocks: [] };

  const add = (step, result) => {
    steps.push({ step, ...result });
    if (result.side === "bull") flags.bull += result.weight || 1;
    else if (result.side === "bear") flags.bear += result.weight || 1;
    else if (result.block) flags.blocks.push(step);
  };

  // ── STEP 1: Trend Direction ──────────────────────────────────
  const trend   = trendAnalysis(candles);
  const tdDir   = trendDirection(candles);
  add("Trend Direction", {
    side:   trend.bias === "BULLISH" ? "bull" : trend.bias === "BEARISH" ? "bear" : "neutral",
    label:  `Trend: ${trend.bias} | ST: ${tdDir.direction}`,
    weight: 3,
  });

  // ── STEP 2: Trend Strength (ADX) ────────────────────────────
  const regime = marketRegime(candles);
  if (!regime.trending) {
    add("Trend Strength", { side: "neutral", label: `ADX ${regime.ADX.adx.toFixed(1)} — ranging market`, block: true, weight: 0 });
  } else {
    add("Trend Strength", { side: regime.direction === "BULL" ? "bull" : "bear", label: `ADX ${regime.ADX.adx.toFixed(1)} — trending`, weight: 2 });
  }

  // ── STEP 3: Volatility Filter ───────────────────────────────
  const vol = volatilityAnalysis(candles);
  if (!vol.healthy) {
    add("Volatility", { side: "neutral", label: "Low volatility — signal suppressed", block: true, weight: 0 });
  } else {
    add("Volatility", { side: vol.expanding ? (trend.bias === "BULLISH" ? "bull" : "bear") : "neutral", label: `Volatility ${vol.expanding ? "expanding" : "normal"}`, weight: vol.expanding ? 1 : 0 });
  }

  // ── STEP 4: Market Structure ─────────────────────────────────
  const structure = marketStructure(candles);
  add("Market Structure", {
    side: structure.bias === "BULLISH" ? "bull" : structure.bias === "BEARISH" ? "bear" : "neutral",
    label: `Structure: ${structure.bias}`,
    weight: 2,
  });

  // ── STEP 5: Liquidity Sweep ──────────────────────────────────
  const sweep = liquiditySweep(candles, dec);
  if (sweep) add("Liquidity Sweep", { side: sweep.side, label: sweep.label, weight: 3 });

  // ── STEP 6: BOS (continuation) ───────────────────────────────
  const bos = detectBOS(candles, structure);
  if (bos) add("BOS", { side: bos.side, label: bos.label, weight: 3 });

  // ── STEP 7: CHoCH (reversal) ─────────────────────────────────
  const choch = detectCHoCH(candles, structure);
  if (choch) add("CHoCH", { side: choch.side, label: choch.label, weight: 3 });

  // ── STEP 8: BOR — Break of Range ─────────────────────────────
  const bor = detectBOR(candles, dec);
  if (bor) add("BOR", { side: bor.side, label: bor.label, weight: 2 });

  // ── STEP 9: Pullback ─────────────────────────────────────────
  const pullback = detectPullback(candles, trend.bias);
  if (pullback) add("Pullback", { side: pullback.side, label: pullback.label, weight: 2 });

  // ── STEP 10: Dynamic S/R ──────────────────────────────────────
  const sr = dynamicSR(candles, dec);
  if (sr.nearSupport)    add("Dynamic Support",    { side: "bull", label: `Near dynamic support`,    weight: 2 });
  if (sr.nearResistance) add("Dynamic Resistance", { side: "bear", label: `Near dynamic resistance`, weight: 2 });

  // ── STEP 11: Breakout ─────────────────────────────────────────
  const breakout = detectBreakout(candles, sr);
  if (breakout) {
    // BOS and Breakout can fire off effectively the same event — a swing
    // high (structure.lastHigh) and dynamic resistance (sr.resistance) are
    // frequently the same or near-identical price level on a sharp move,
    // meaning both detectors are reporting ONE real observation as if it
    // were two independent confirmations. Without this check, a single
    // spike candle could silently double-count toward the score.
    //
    // We treat them as the same event when their levels are within 1x ATR
    // of each other, and in that case Breakout only adds a small confluence
    // bonus on top of BOS's score rather than its own full weight.
    const breakoutLevel = breakout.side === "bull" ? sr.resistance : sr.support;
    const sameEventAsBOS = bos && bos.side === breakout.side &&
      Math.abs((bos.level ?? 0) - (breakoutLevel ?? 0)) <= (atrEstimate(candles) || Infinity);

    if (sameEventAsBOS) {
      add("Breakout", { side: breakout.side, label: `${breakout.label} (same event as BOS — confluence only)`, weight: 1 });
    } else {
      add("Breakout", { side: breakout.side, label: breakout.label, weight: 3 });
    }
  }

  // ── STEP 12: Retest ───────────────────────────────────────────
  const retest = detectRetest(candles, sr);
  if (retest) add("Retest", { side: retest.side, label: retest.label, weight: 2 });

  // ── STEP 13: FVG / Order Block Retest ────────────────────────
  const zoneRetest = detectZoneRetest(candles, dec);
  if (zoneRetest) add("FVG/OB Retest", { side: zoneRetest.side, label: zoneRetest.label, weight: 3 });

  // ── STEP 14: Momentum Confirmation ───────────────────────────
  const momentum = momentumAnalysis(candles);
  add("Momentum", {
    side:   momentum.bias === "BULL" ? "bull" : momentum.bias === "BEAR" ? "bear" : "neutral",
    label:  `RSI ${momentum.RSI.toFixed(1)} | MACD ${momentum.MACD.histogram > 0 ? "▲" : "▼"}`,
    weight: 2,
  });

  // ── STEP 15: Confirmation Candle ──────────────────────────────
  const cp = candlestickPatterns(candles);
  cp.forEach(p => add("Candlestick", { side: p.side, label: `PA: ${p.name}`, weight: p.strength }));

  // ── STEP 16: Chart Patterns ──────────────────────────────────
  const charts = chartPatterns(candles, dec);
  charts.forEach(p => add("Chart Pattern", { side: p.side, label: `📊 ${p.name}`, weight: p.strength }));

  // ── STEP 17: HTF confirmation ────────────────────────────────
  if (htfCandles && htfCandles.length >= 21) {
    const htfTrend = trendAnalysis(htfCandles);
    if (htfTrend.bias === "BULLISH") add("HTF", { side: "bull", label: "HTF Bullish", weight: 2 });
    else if (htfTrend.bias === "BEARISH") add("HTF", { side: "bear", label: "HTF Bearish", weight: 2 });
  }

  return {
    type:      "synthetic",
    steps,
    bullScore: flags.bull,
    bearScore: flags.bear,
    blocks:    flags.blocks,
    trend,
    momentum,
    vol,
    regime,
    structure,
    sweep,
    bos,
    choch,
    bor,
    zoneRetest,
    sr,
    breakout,
    retest,
    pullback,
    dec,
    price,
  };
}
