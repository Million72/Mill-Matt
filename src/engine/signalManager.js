import { runForexEngine }     from "../forex/forexEngine.js";
import { runSyntheticEngineV3 } from "../synthetic/syntheticEngineV3.js";
import { validateSignal }     from "../shared/signalValidator.js";
import { confidenceScore }    from "../shared/confidenceScore.js";
import { confirmationEngine } from "../shared/confirmationEngine.js";
import { calculateTPSL }      from "../shared/tpSlCalculator.js";
import { calcRR }             from "../shared/riskReward.js";
import { FOREX }              from "../constants/markets.js";
import { getDec }             from "../utils/formatters.js";
import { ema }                from "../indicators/ema.js";

// Determine bias from a set of candles using EMA9/21/50 stack
function biasFromCandles(candles) {
  if (!candles || candles.length < 50) return "NEUTRAL";
  const closes = candles.map(c => c.close);
  const e9  = ema(closes, 9);
  const e21 = ema(closes, 21);
  const e50 = ema(closes, 50);
  if (!e9 || !e21 || !e50) return "NEUTRAL";
  if (e9 > e21 && e21 > e50) return "BULL";
  if (e9 < e21 && e21 < e50) return "BEAR";
  return "NEUTRAL";
}

export function processSignal(market, candles, htfCandles, htf2Candles, livePrice, partnerCandles = null) {
  const isForex = FOREX.some(f => f.symbol === market.symbol);
  const price   = livePrice ?? candles[candles.length - 1].close;
  const dec     = getDec(market.symbol, price);

  // ── SYNTHETIC: routed entirely through the new deliberately minimal V3
  // engine (9 confirmed indicators, 50-EMA stop-loss, hard entry-timing
  // gate) — does NOT go through the shared forex pipeline (entry models,
  // 3-TF confirmation, structure/sweep/BOS-CHoCH) at all, per explicit
  // instruction to simplify rather than keep layering complexity after
  // real trading losses. V3 computes its own validation/confidence/SL-TP
  // internally; here we only reshape its output to match the same final
  // signal object shape the UI already expects.
  if (!isForex) {
    const v3 = runSyntheticEngineV3(market, candles, htfCandles);
    return {
      symbol:      market.symbol,
      name:        market.name,
      price:       +v3.price.toFixed(dec),
      signal:      v3.signal,
      confidence:  v3.confidence,
      tp1:         v3.tp1 ?? null,
      tp2:         v3.tp2 ?? null,
      sl:          v3.sl ?? null,
      rr:          v3.rr ?? null,
      factors:     v3.factors,
      bullScore:   v3.bullScore,
      bearScore:   v3.bearScore,
      MAX:         v3.maxScore,
      timestamp:   new Date(),
      source:      "live",
      type:        "synthetic",
      counterTrend: false,
      rsi:         v3.rsi?.toFixed?.(1) ?? v3.rsi ?? "—",
      macdDir:     v3.macdBull ? "▲" : "▼",
      atr:         v3.atr ?? null,
      trend:       v3.ema9 != null && v3.ema200 != null ? (v3.ema9 > v3.ema200 ? "BULLISH" : "BEARISH") : "NEUTRAL",
      htfBias:     "NEUTRAL", // V3 doesn't use the 3-TF cascade — intentionally simplified
      htf2Bias:    "NEUTRAL",
      structure:   "NEUTRAL",
      sweep: null, breakout: null, bos: null, choch: null, mss: null, smt: null,
      entryModels: [], bor: null, zoneRetest: null,
      blockReason: v3.blockReason ?? null,
      estimatedRiskUsd: v3.estimatedRiskUsd ?? null,
      vwap: v3.vwap ?? null,
      ema50: v3.ema50 ?? null,
    };
  }

  // ── FOREX: unchanged — full pipeline (entry models, 3-TF cascade,
  // structure/sweep/BOS-CHoCH, multi-candle confirmation) stays exactly as
  // it was. Only synthetics were simplified.
  const htf2Bias = biasFromCandles(htf2Candles);

  const engineResult = runForexEngine(market, candles, htfCandles, partnerCandles, htf2Bias);

  const { bullScore, bearScore, steps } = engineResult;

  // ── 3-Timeframe confirmation ──────────────────────────────────
  const htf1Bias = biasFromCandles(htfCandles);

  const mtfAgrees = (side) => {
    // side: "bull" or "bear"
    const want = side === "bull" ? "BULL" : "BEAR";
    // HTF2 (highest) must not oppose; HTF1 must confirm
    const htf2Ok = htf2Bias === "NEUTRAL" || htf2Bias === want;
    const htf1Ok = htf1Bias === want;
    return htf1Ok && htf2Ok;
  };

  // ── RSI extreme block ──────────────────────────────────────────
  const RSI = engineResult.momentum?.RSI ?? 50;
  const rsiBlocksBuy  = RSI > 70;
  const rsiBlocksSell = RSI < 30;

  // Validate signal (score + margin threshold)
  const validation = validateSignal(engineResult);

  // Confidence scores
  const { bullConf, bearConf } = confidenceScore(bullScore, bearScore, 30);

  let signal, confidence, levels, counterTrend = false;
  let blockReason = null;

  if (!validation.valid) {
    signal     = "WAIT";
    confidence = Math.max(bullConf, bearConf);
    levels     = {};
  } else {
    const side = validation.side;

    // RSI extreme check — hard block
    if (side === "bull" && rsiBlocksBuy) {
      signal = "WAIT"; confidence = bullConf; levels = {};
      blockReason = `RSI ${RSI.toFixed(1)} overbought — BUY blocked`;
    } else if (side === "bear" && rsiBlocksSell) {
      signal = "WAIT"; confidence = bearConf; levels = {};
      blockReason = `RSI ${RSI.toFixed(1)} oversold — SELL blocked`;
    }
    // 3-TF confirmation check
    else if (!mtfAgrees(side)) {
      signal = "WAIT"; confidence = side === "bull" ? bullConf : bearConf; levels = {};
      blockReason = `MTF disagreement — HTF1:${htf1Bias} HTF2:${htf2Bias}`;
    }
    else {
      // Confirmation candle check
      const confirmation = confirmationEngine(candles, side);
      if (!confirmation.confirmed) {
        signal = "WAIT";
        confidence = side === "bull" ? bullConf : bearConf;
        levels = {};
        blockReason = confirmation.label;
      } else {
        signal     = side === "bull" ? "BUY" : "SELL";
        confidence = side === "bull" ? bullConf : bearConf;
        levels     = calculateTPSL(candles, side, price, dec);
        steps.push({ step: "Confirmation", side, label: confirmation.label, weight: 0 });
      }
    }
  }

  const rr = levels.tp1 && levels.sl ? calcRR(price, levels.tp1, levels.sl) : null;

  // Counter-trend flag — this entire function body past the early synthetic
  // return only ever executes for forex now, so no isForex check needed here.
  if (engineResult.trend?.bias) {
    counterTrend = (engineResult.trend.bias === "BULLISH" && signal === "SELL") ||
                   (engineResult.trend.bias === "BEARISH" && signal === "BUY");
  }

  if (blockReason) steps.push({ step: "Block", side: "neutral", label: blockReason, weight: 0 });

  const factors = steps
    .filter(s => s.label)
    .map(s => ({ label: s.label, side: s.side || "neutral" }));

  return {
    symbol:      market.symbol,
    name:        market.name,
    price:       +price.toFixed(dec),
    signal,
    confidence,
    ...levels,
    rr,
    factors,
    bullScore,
    bearScore,
    MAX:         30,
    timestamp:   new Date(),
    source:      "live",
    type:        "forex",
    counterTrend,
    rsi:         RSI?.toFixed(1) ?? "—",
    macdDir:     engineResult.momentum?.MACD?.histogram > 0 ? "▲" : "▼",
    atr:         levels.atr ?? null,
    trend:       engineResult.trend?.bias ?? "NEUTRAL",
    htfBias:     htf1Bias,
    htf2Bias:    htf2Bias,
    structure:   engineResult.structure?.bias ?? engineResult.trend?.bias ?? "NEUTRAL",
    sweep:       engineResult.sweep ?? null,
    breakout:    engineResult.breakout ?? null,
    bos:         engineResult.bos ?? null,
    choch:       engineResult.choch ?? null,
    mss:         engineResult.mss ?? null,
    smt:         engineResult.smt ?? null,
    entryModels: engineResult.entryModels ?? [],
    bor:         engineResult.bor ?? null,
    zoneRetest:  engineResult.zoneRetest ?? null,
  };
        }
