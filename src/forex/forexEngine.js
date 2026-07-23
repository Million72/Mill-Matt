import { trendAnalysis }        from "./analysis/trendAnalysis.js";
import { momentumAnalysis }     from "./analysis/momentumAnalysis.js";
import { volatilityAnalysis }   from "./analysis/volatilityAnalysis.js";
import { marketRegime }         from "./analysis/marketRegime.js";
import { marketStructure }      from "./priceAction/marketStructure.js";
import { detectBOS }            from "./priceAction/bos.js";
import { detectCHoCH }          from "./priceAction/choch.js";
import { supportResistance }    from "./priceAction/supportResistance.js";
import { supplyDemand }         from "./priceAction/supplyDemand.js";
import { liquiditySweep }       from "./priceAction/liquiditySweep.js";
import { detectBreakout }       from "./priceAction/breakout.js";
import { detectRetest }         from "./priceAction/retest.js";
import { candlestickPatterns }  from "./priceAction/candlestickPatterns.js";
import { chartPatterns }        from "./priceAction/chartPatterns.js";
import { trendFilter }          from "./filters/trendFilter.js";
import { momentumFilter }       from "./filters/momentumFilter.js";
import { volatilityFilter }     from "./filters/volatilityFilter.js";
import { sessionFilter }        from "./filters/sessionFilter.js";
import { supertrend }           from "../indicators/supertrend.js";
import { adx }                  from "../indicators/adx.js";
import { detectMSS }            from "../shared/smartMoney/mss.js";
import { checkEntryModels }     from "../shared/smartMoney/entryModels.js";
import { detectSMTDivergence }  from "../shared/smartMoney/smt.js";

export function runForexEngine(market, candles, htfCandles, partnerCandles = null) {
  const { symbol, isJPY, isGold } = market;
  const dec   = isGold ? 2 : isJPY ? 3 : 5;
  const price = candles[candles.length - 1].close;
  const steps = [];
  const flags = { bull: 0, bear: 0, blocks: [] };

  const add = (step, result) => {
    steps.push({ step, ...result });
    if (result.side === "bull") flags.bull += result.weight || 1;
    else if (result.side === "bear") flags.bear += result.weight || 1;
    else if (result.block) flags.blocks.push(step);
  };

  // ── STEP 1: Market Structure ────────────────────────────────
  const ms  = marketStructure(candles);
  const htfCloses = (htfCandles || []).map(c => c.close);
  const htfEma9   = htfCloses.length >= 9  ? htfCloses[htfCloses.length-1] > htfCloses[htfCloses.length-5] : null;
  const htfBias   = htfEma9 === true ? "BULL" : htfEma9 === false ? "BEAR" : "NEUTRAL";

  add("Market Structure", {
    side:   ms.bias === "BULLISH" ? "bull" : ms.bias === "BEARISH" ? "bear" : "neutral",
    label:  `Structure: ${ms.bias}`,
    weight: 2,
  });

  // ── STEP 2: BOS / CHoCH ─────────────────────────────────────
  const bos   = detectBOS(candles, ms);
  const choch = detectCHoCH(candles, ms);
  if (bos)   add("BOS",   { side: bos.side,   label: bos.label,   weight: 3 });
  if (choch) add("CHoCH", { side: choch.side, label: choch.label, weight: 3 });

  // Liquidity Sweep — computed here (ahead of its original STEP 3 position)
  // because entry-model checking below needs it. The `add()` call for it
  // stays where it conceptually belongs (STEP 3, further down) so scoring
  // order/weights are unaffected — only the raw detection moved earlier.
  const sweep = liquiditySweep(candles, dec);

  // MSS is the ICT/SMC name for the same reversal signal CHoCH already
  // detects (see shared/smartMoney/mss.js) — computed here so entry models
  // below can reference it under its standard terminology.
  const mss = detectMSS(candles, ms, detectCHoCH);

  // SMT Divergence — only meaningful when a correlated partner instrument's
  // candles were actually supplied (currently EURUSD/GBPUSD only; every
  // other forex pair gets partnerCandles = null and simply skips this).
  const smt = partnerCandles ? detectSMTDivergence(candles, partnerCandles) : null;
  if (smt) add("SMT Divergence", { side: smt.side, label: smt.label, weight: 3 });

  // ── Entry Models — any ONE of 5 specific ICT combos qualifies ────
  // This sits alongside the scoring above, not instead of it: matching a
  // model adds meaningful weight (since it represents multiple confirming
  // concepts firing together), and is also surfaced as its own labeled
  // factor so it's visible on the signal card, distinct from the raw
  // component pieces (sweep/MSS/FVG etc.) that are already scored individually.
  const entryModelMatches = checkEntryModels(candles, sweep, mss, smt, ms);
  entryModelMatches.forEach(m => add("Entry Model", { side: m.side, label: m.label, weight: m.weight }));

  // ── STEP 3: Liquidity Sweep ──────────────────────────────────
  if (sweep) add("Liquidity Sweep", { side: sweep.side, label: sweep.label, weight: 3 });

  // ── STEP 4: Support / Resistance ─────────────────────────────
  const sr = supportResistance(candles, dec);
  if (sr.nearSupport)    add("Support",    { side: "bull", label: `Near support ${sr.support?.toFixed(dec)}`,    weight: 2 });
  if (sr.nearResistance) add("Resistance", { side: "bear", label: `Near resistance ${sr.resistance?.toFixed(dec)}`, weight: 2 });

  // ── STEP 5: Supply / Demand ──────────────────────────────────
  const sd = supplyDemand(candles);
  if (sd.zone) add("Supply/Demand", { side: sd.side, label: sd.label, weight: 2 });

  // ── STEP 6: Breakout ────────────────────────────────────────
  const breakout = detectBreakout(candles, sr);
  if (breakout) add("Breakout", { side: breakout.side, label: breakout.label, weight: 3 });

  // ── STEP 7: Retest ──────────────────────────────────────────
  const retest = detectRetest(candles, sr);
  if (retest) add("Retest", { side: retest.side, label: retest.label, weight: 2 });

  // ── STEP 8: Confirmation Candle (candlestick patterns) ───────
  const candles_ = candlestickPatterns(candles);
  candles_.forEach(p => add("Candlestick", { side: p.side, label: `PA: ${p.name}`, weight: p.strength }));

  // ── STEP 9: Chart Patterns ───────────────────────────────────
  const cp = chartPatterns(candles, dec);
  cp.forEach(p => add("Chart Pattern", { side: p.side, label: `📊 ${p.name}`, weight: p.strength }));

  // ── STEP 10: Indicator Confirmation ─────────────────────────
  const trend      = trendAnalysis(candles);
  const momentum   = momentumAnalysis(candles);
  const volatility = volatilityAnalysis(candles);
  const regime     = marketRegime(candles);
  const ST         = supertrend(candles);
  const ADX        = adx(candles);

  // EMA stack
  if (trend.bias === "BULLISH") add("EMA Stack", { side: "bull", label: "EMA Stack Bullish", weight: 2 });
  else if (trend.bias === "BEARISH") add("EMA Stack", { side: "bear", label: "EMA Stack Bearish", weight: 2 });

  // SuperTrend
  if (ST.direction === 1)  add("SuperTrend", { side: "bull", label: "SuperTrend Bullish", weight: 2 });
  else if (ST.direction === -1) add("SuperTrend", { side: "bear", label: "SuperTrend Bearish", weight: 2 });

  // ADX strength filter
  if (ADX.adx < 20) add("ADX Filter", { side: "neutral", label: `ADX ${ADX.adx.toFixed(1)} — weak trend, caution`, block: true, weight: 0 });

  // RSI
  if (momentum.RSI > 55 && momentum.RSI < 70)       add("RSI", { side: "bull", label: `RSI ${momentum.RSI.toFixed(1)} bullish`, weight: 1 });
  else if (momentum.RSI < 45 && momentum.RSI > 30)  add("RSI", { side: "bear", label: `RSI ${momentum.RSI.toFixed(1)} bearish`, weight: 1 });
  else if (momentum.RSI >= 70)                        add("RSI", { side: "bear", label: `RSI ${momentum.RSI.toFixed(1)} overbought`, weight: 1 });
  else if (momentum.RSI <= 30)                        add("RSI", { side: "bull", label: `RSI ${momentum.RSI.toFixed(1)} oversold`, weight: 1 });

  // MACD
  if (momentum.MACD.histogram > 0) add("MACD", { side: "bull", label: "MACD histogram positive", weight: 1 });
  else                               add("MACD", { side: "bear", label: "MACD histogram negative", weight: 1 });

  // HTF bias
  if (htfBias === "BULL") add("HTF Trend", { side: "bull", label: "HTF bias: Bullish", weight: 2 });
  else if (htfBias === "BEAR") add("HTF Trend", { side: "bear", label: "HTF bias: Bearish", weight: 2 });

  // ATR volatility
  if (!volatility.healthy) add("Volatility", { side: "neutral", label: "Low volatility — reduced quality", block: false, weight: 0 });

  // Session
  const session = sessionFilter();

  return {
    type:      "forex",
    steps,
    bullScore: flags.bull,
    bearScore: flags.bear,
    blocks:    flags.blocks,
    trend,
    momentum,
    volatility,
    regime,
    structure: ms,
    sr,
    sweep,
    bos,
    choch,
    mss,
    smt,
    entryModels: entryModelMatches,
    breakout,
    retest,
    ST,
    ADX,
    session,
    htfBias,
    dec,
    price,
  };
    }
