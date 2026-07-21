// Entry Models — five specific ICT/SMC combos, ANY ONE of which is
// sufficient (not all five, not a weighted blend) to qualify as a valid
// entry setup. This sits ALONGSIDE the existing bull/bear scoring engine —
// it does not replace score-based validation, RSI blocks, 3-TF confirmation,
// or the 70% confidence floor. A signal must still clear those. This module
// only answers: "is there also a textbook entry-model combo present?" — and
// if none of the 5 combos are present, that's surfaced as a factor so it's
// visible on the card, not silently ignored.
//
// Models (per the requested spec):
//   1. Liquidity Sweep + MSS + FVG
//   2. Liquidity Sweep + BPR
//   3. SMT + MSS + IFVG
//   4. SMT + MSS + BB (Breaker Block)
//   5. Liquidity Sweep + MSS + BB + FVG
//
// Each check requires the component parts to be SIDE-CONSISTENT — e.g. a
// bullish sweep only counts toward a bullish combo if the MSS/FVG/etc. it's
// paired with are also bullish. Mixing a bullish sweep with a bearish FVG
// is not a valid combo under any of these models.

import { detectFVGs, detectIFVGs, detectBreakerBlocks, detectBPRs, isZoneRelevant } from "./zones.js";

function zonesOfSide(zones, side, candles) {
  return zones.filter(z => z.side === side && isZoneRelevant(candles, z));
}

// checkEntryModels evaluates all 5 models against the given inputs and
// returns an array of matched model results (usually 0 or 1, but a strong
// setup could satisfy more than one simultaneously — e.g. model 1 and 5
// overlap by construction).
//
// Inputs:
//   candles   — this instrument's candle history
//   sweep     — result of liquiditySweep.js (or null)
//   mss       — result of detectMSS (or null)
//   smt       — result of detectSMTDivergence (or null, only for EURUSD/GBPUSD)
export function checkEntryModels(candles, sweep, mss, smt) {
  const matches = [];

  const fvgs     = detectFVGs(candles);
  const ifvgs    = detectIFVGs(candles);
  const breakers = detectBreakerBlocks(candles);
  const bprs     = detectBPRs(candles);

  const trySide = (side) => {
    const sweepOk = sweep && sweep.side === side;
    const mssOk   = mss && mss.side === side;
    const smtOk   = smt && smt.side === side;
    const fvgOk   = zonesOfSide(fvgs, side, candles).length > 0;
    const ifvgOk  = zonesOfSide(ifvgs, side, candles).length > 0;
    const bbOk    = zonesOfSide(breakers, side, candles).length > 0;
    // BPR is directionally neutral by construction (see zones.js) — treat
    // its mere presence near price as qualifying for either side, since the
    // reaction direction is determined by the sweep/MSS it's paired with.
    const bprOk   = bprs.some(z => isZoneRelevant(candles, z));

    // Model 1: Liquidity Sweep + MSS + FVG
    if (sweepOk && mssOk && fvgOk) {
      matches.push({ model: 1, side, label: `Entry Model 1: Sweep + MSS + FVG (${side})` });
    }
    // Model 2: Liquidity Sweep + BPR
    if (sweepOk && bprOk) {
      matches.push({ model: 2, side, label: `Entry Model 2: Sweep + BPR (${side})` });
    }
    // Model 3: SMT + MSS + IFVG
    if (smtOk && mssOk && ifvgOk) {
      matches.push({ model: 3, side, label: `Entry Model 3: SMT + MSS + IFVG (${side})` });
    }
    // Model 4: SMT + MSS + BB (Breaker Block)
    if (smtOk && mssOk && bbOk) {
      matches.push({ model: 4, side, label: `Entry Model 4: SMT + MSS + BB (${side})` });
    }
    // Model 5: Liquidity Sweep + MSS + BB + FVG
    if (sweepOk && mssOk && bbOk && fvgOk) {
      matches.push({ model: 5, side, label: `Entry Model 5: Sweep + MSS + BB + FVG (${side})` });
    }
  };

  trySide("bull");
  trySide("bear");

  return matches;
}
