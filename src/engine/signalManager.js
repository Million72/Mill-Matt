import { runForexEngine }     from "../forex/forexEngine.js";
import { runSyntheticEngine } from "../synthetic/syntheticEngine.js";
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

  // Run market-specific engine (primary TF full analysis). partnerCandles
  // is only ever non-null for forex symbols with a defined SMT partner
  // (currently EURUSD/GBPUSD) — the synthetic engine doesn't accept or use
  // this parameter at all, since SMT isn't applicable to synthetics.
  const engineResult = isForex
    ? runForexEngine(market, candles, htfCandles, partnerCandles)
    : runSyntheticEngine(market, candles, htfCandles);

  const { bullScore, bearScore, steps } = engineResult;

  // ── 3-Timeframe confirmation ──────────────────────────────────
  const htf1Bias = biasFromCandles(htfCandles);
  const htf2Bias = biasFromCandles(htf2Candles);

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

  // Counter-trend flag (for forex — primary trend vs final signal)
  if (isForex && engineResult.trend?.bias) {
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
    type:        isForex ? "forex" : "synthetic",
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
