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

  // ── STEP 4: Pullback ─────────────────────────────────────────
  const pullback = detectPullback(candles, trend.bias);
  if (pullback) add("Pullback", { side: pullback.side, label: pullback.label, weight: 2 });

  // ── STEP 5: Dynamic S/R ──────────────────────────────────────
  const sr = dynamicSR(candles, dec);
  if (sr.nearSupport)    add("Dynamic Support",    { side: "bull", label: `Near dynamic support`,    weight: 2 });
  if (sr.nearResistance) add("Dynamic Resistance", { side: "bear", label: `Near dynamic resistance`, weight: 2 });

  // ── STEP 6: Breakout ─────────────────────────────────────────
  const breakout = detectBreakout(candles, sr);
  if (breakout) add("Breakout", { side: breakout.side, label: breakout.label, weight: 3 });

  // ── STEP 7: Retest ───────────────────────────────────────────
  const retest = detectRetest(candles, sr);
  if (retest) add("Retest", { side: retest.side, label: retest.label, weight: 2 });

  // ── STEP 8: Momentum Confirmation ───────────────────────────
  const momentum = momentumAnalysis(candles);
  add("Momentum", {
    side:   momentum.bias === "BULL" ? "bull" : momentum.bias === "BEAR" ? "bear" : "neutral",
    label:  `RSI ${momentum.RSI.toFixed(1)} | MACD ${momentum.MACD.histogram > 0 ? "▲" : "▼"}`,
    weight: 2,
  });

  // ── STEP 9: Confirmation Candle ──────────────────────────────
  const cp = candlestickPatterns(candles);
  cp.forEach(p => add("Candlestick", { side: p.side, label: `PA: ${p.name}`, weight: p.strength }));

  // ── STEP 10: Chart Patterns ──────────────────────────────────
  const charts = chartPatterns(candles, dec);
  charts.forEach(p => add("Chart Pattern", { side: p.side, label: `📊 ${p.name}`, weight: p.strength }));

  // ── STEP 11: HTF confirmation ────────────────────────────────
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
    sr,
    breakout,
    retest,
    pullback,
    dec,
    price,
  };
                           }
