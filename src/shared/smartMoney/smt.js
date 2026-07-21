// SMT (Smart Money Technique) Divergence — compares two historically
// correlated instruments to find moments where they DISAGREE: one makes a
// new swing high/low while the other fails to, suggesting the move isn't
// backed by genuine broad participation and may reverse.
//
// This requires TWO candle series (the instrument and its correlated
// partner) fetched independently — unlike every other detector in this
// codebase, which only ever looks at a single instrument's own history.
//
// Currently only meaningfully supported for EURUSD vs GBPUSD, the one
// standard correlated pair available in our forex market list (see
// constants/markets.js) — both are USD-quoted majors with a long-documented
// tendency to move together, making divergence between them a real,
// established signal rather than a coincidental pattern match.
import { swingHighs, swingLows } from "../../utils/math.js";

const SMT_PAIRS = {
  EURUSD: "GBPUSD",
  GBPUSD: "EURUSD",
};

export function getSMTPartner(symbol) {
  return SMT_PAIRS[symbol] || null;
}

// detectSMTDivergence compares the most recent swing point on `candles`
// against the same-timeframe swing on `partnerCandles`. A bullish SMT
// divergence: this instrument makes a LOWER low while the partner makes a
// HIGHER low (partner shows relative strength) — early sign of exhaustion
// in the downmove. Bearish divergence is the mirror case at swing highs.
export function detectSMTDivergence(candles, partnerCandles) {
  if (!candles || !partnerCandles || candles.length < 20 || partnerCandles.length < 20) return null;

  const lows      = swingLows(candles.slice(-40), 3);
  const partnerLows = swingLows(partnerCandles.slice(-40), 3);
  const highs     = swingHighs(candles.slice(-40), 3);
  const partnerHighs = swingHighs(partnerCandles.slice(-40), 3);

  // Bullish SMT: this instrument's latest swing low is LOWER than its prior
  // low, but the partner's latest swing low is HIGHER than its prior low.
  if (lows.length >= 2 && partnerLows.length >= 2) {
    const [prevLow, lastLow] = [lows[lows.length - 2], lows[lows.length - 1]];
    const [partnerPrevLow, partnerLastLow] = [partnerLows[partnerLows.length - 2], partnerLows[partnerLows.length - 1]];
    if (lastLow.price < prevLow.price && partnerLastLow.price > partnerPrevLow.price) {
      return { side: "bull", label: "SMT Divergence — partner shows relative strength at lows" };
    }
  }

  // Bearish SMT: this instrument's latest swing high is HIGHER than its
  // prior high, but the partner's latest swing high is LOWER than its prior high.
  if (highs.length >= 2 && partnerHighs.length >= 2) {
    const [prevHigh, lastHigh] = [highs[highs.length - 2], highs[highs.length - 1]];
    const [partnerPrevHigh, partnerLastHigh] = [partnerHighs[partnerHighs.length - 2], partnerHighs[partnerHighs.length - 1]];
    if (lastHigh.price > prevHigh.price && partnerLastHigh.price < partnerPrevHigh.price) {
      return { side: "bear", label: "SMT Divergence — partner shows relative weakness at highs" };
    }
  }

  return null;
}
