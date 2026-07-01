import { runForexEngine }     from "../forex/forexEngine.js";
import { runSyntheticEngine } from "../synthetic/syntheticEngine.js";
import { validateSignal }     from "../shared/signalValidator.js";
import { confidenceScore }    from "../shared/confidenceScore.js";
import { confirmationEngine } from "../shared/confirmationEngine.js";
import { calculateTPSL }      from "../shared/tpSlCalculator.js";
import { calcRR }             from "../shared/riskReward.js";
import { FOREX }              from "../constants/markets.js";
import { getDec }             from "../utils/formatters.js";

export function processSignal(market, candles, htfCandles, livePrice) {
  const isForex = FOREX.some(f => f.symbol === market.symbol);
  const price   = livePrice ?? candles[candles.length - 1].close;
  const dec     = getDec(market.symbol, price);

  // Run market-specific engine
  const engineResult = isForex
    ? runForexEngine(market, candles, htfCandles)
    : runSyntheticEngine(market, candles, htfCandles);

  const { bullScore, bearScore, steps } = engineResult;

  // Validate signal
  const validation = validateSignal(engineResult);

  // Confidence scores
  const { bullConf, bearConf } = confidenceScore(bullScore, bearScore, 20);

  let signal, confidence, levels;

  if (!validation.valid) {
    signal     = "WAIT";
    confidence = Math.max(bullConf, bearConf);
    levels     = {};
  } else {
    const side = validation.side;

    // Confirmation candle check
    const confirmation = confirmationEngine(candles, side);
    if (!confirmation.confirmed) {
      // Reduce confidence if no confirmation candle — don't block, just note it
      signal     = "WAIT";
      confidence = Math.max(bullConf, bearConf);
      levels     = {};
      steps.push({ step: "Confirmation", side: "neutral", label: confirmation.label, weight: 0 });
    } else {
      signal     = side === "bull" ? "BUY" : "SELL";
      confidence = side === "bull" ? bullConf : bearConf;
      levels     = calculateTPSL(candles, side, price, dec);
      steps.push({ step: "Confirmation", side, label: confirmation.label, weight: 0 });
    }
  }

  const rr = levels.tp1 && levels.sl ? calcRR(price, levels.tp1, levels.sl) : null;

  // Build factors list from steps for UI
  const factors = steps
    .filter(s => s.label)
    .map(s => ({ label: s.label, side: s.side || "neutral" }));

  return {
    symbol:     market.symbol,
    name:       market.name,
    price:      +price.toFixed(dec),
    signal,
    confidence,
    ...levels,
    rr,
    factors,
    bullScore,
    bearScore,
    MAX:        20,
    timestamp:  new Date(),
    source:     "live",
    type:       isForex ? "forex" : "synthetic",
    // Quick stats for UI
    rsi:        engineResult.momentum?.RSI?.toFixed(1) ?? "—",
    macdDir:    engineResult.momentum?.MACD?.histogram > 0 ? "▲" : "▼",
    atr:        levels.atr ?? null,
    trend:      engineResult.trend?.bias ?? "NEUTRAL",
    htfBias:    engineResult.htfBias ?? engineResult.trend?.bias ?? "NEUTRAL",
    structure:  engineResult.structure?.bias ?? engineResult.trend?.bias ?? "NEUTRAL",
    sweep:      engineResult.sweep ?? null,
    breakout:   engineResult.breakout ?? null,
    bos:        engineResult.bos ?? null,
    choch:      engineResult.choch ?? null,
  };
}
