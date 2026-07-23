// Entry Models — eleven specific ICT/SMC combos. At least ONE must be
// present for a signal to be allowed to fire at all — this is a REQUIRED
// gate (enforced in shared/signalValidator.js), not an optional bonus.
// General indicator agreement (EMA/RSI/MACD/structure) can independently
// satisfy the score/margin/confidence checks, but that alone is NOT
// sufficient without a matching entry model on the same side.
//
// Each matched model contributes weight scaled to how many components it
// requires (2-4), reflecting that a 4-part combo represents a meaningfully
// stronger setup than a 2-part combo — not a flat bonus regardless of rigor.
//
// Models:
//   1.  Liquidity Sweep + MSS + FVG
//   2.  Liquidity Sweep + BPR
//   3.  SMT + MSS + IFVG
//   4.  SMT + MSS + BB (Breaker Block)
//   5.  Liquidity Sweep + MSS + BB + FVG
//   6.  Turtle Soup + MSS + FVG
//   7.  Order Block + MSS + FVG
//   8.  CHoCH + Order Block
//   9.  Mitigation Block + FVG
//   10. CISD + FVG
//   11. Double Liquidity Sweep
//
// NOTE: OTE (Optimal Trade Entry — Fibonacci-based) is intentionally NOT
// included yet; it requires Fibonacci retracement math not currently in
// this codebase and was explicitly deferred.
//
// Each check requires the component parts to be SIDE-CONSISTENT — e.g. a
// bullish sweep only counts toward a bullish combo if the MSS/FVG/etc. it's
// paired with are also bullish. Mixing a bullish sweep with a bearish FVG
// is not a valid combo under any of these models.

import { detectFVGs, detectIFVGs, detectBreakerBlocks, detectBPRs, detectOrderBlocks, detectMitigationBlocks, isZoneRelevant } from "./zones.js";
import { detectTurtleSoup, detectDoubleSweep } from "./sweepHistory.js";
import { detectCISD } from "./cisd.js";

function zonesOfSide(zones, side, candles) {
  return zones.filter(z => z.side === side && isZoneRelevant(candles, z));
}

// checkEntryModels evaluates all 11 models against the given inputs and
// returns an array of matched model results (usually 0-2, but a strong
// setup can satisfy several simultaneously by construction).
//
// Inputs:
//   candles   — this instrument's candle history
//   sweep     — result of liquiditySweep.js (or null)
//   mss       — result of detectMSS (or null)
//   smt       — result of detectSMTDivergence (or null, only for EURUSD/GBPUSD)
//   structure — market structure result (needed for CISD, which requires the
//               same swing-based highs/lows CHoCH/MSS uses internally)
export function checkEntryModels(candles, sweep, mss, smt, structure) {
  const matches = [];

  const fvgs      = detectFVGs(candles);
  const ifvgs     = detectIFVGs(candles);
  const breakers  = detectBreakerBlocks(candles);
  const bprs      = detectBPRs(candles);
  const obs       = detectOrderBlocks(candles);
  const mitigations = detectMitigationBlocks(candles);
  const turtleSoup  = detectTurtleSoup(candles);
  const doubleSweep = detectDoubleSweep(candles);
  // CISD needs `structure` directly (same swing-based highs/lows CHoCH/MSS
  // use internally) — computed once here, outside trySide, since it already
  // returns a single side-specific result rather than needing a side passed in.
  const cisd = structure ? detectCISD(candles, structure) : null;

  const trySide = (side) => {
    const sweepOk = sweep && sweep.side === side;
    const mssOk   = mss && mss.side === side;
    const smtOk   = smt && smt.side === side;
    const fvgOk   = zonesOfSide(fvgs, side, candles).length > 0;
    const ifvgOk  = zonesOfSide(ifvgs, side, candles).length > 0;
    const bbOk    = zonesOfSide(breakers, side, candles).length > 0;
    const obOk    = zonesOfSide(obs, side, candles).length > 0;
    const mitigationOk = zonesOfSide(mitigations, side, candles).length > 0;
    const turtleOk  = turtleSoup && turtleSoup.side === side;
    const doubleOk  = doubleSweep && doubleSweep.side === side;
    const cisdOk    = cisd && cisd.side === side;
    // BPR is directionally neutral by construction (see zones.js) — treat
    // its mere presence near price as qualifying for either side, since the
    // reaction direction is determined by the sweep/MSS it's paired with.
    const bprOk   = bprs.some(z => isZoneRelevant(candles, z));

    // Model 1: Liquidity Sweep + MSS + FVG (3 components)
    if (sweepOk && mssOk && fvgOk) {
      matches.push({ model: 1, side, weight: 3, label: `Entry Model 1: Sweep + MSS + FVG (${side})` });
    }
    // Model 2: Liquidity Sweep + BPR (2 components — the least rigorous combo)
    if (sweepOk && bprOk) {
      matches.push({ model: 2, side, weight: 2, label: `Entry Model 2: Sweep + BPR (${side})` });
    }
    // Model 3: SMT + MSS + IFVG (3 components)
    if (smtOk && mssOk && ifvgOk) {
      matches.push({ model: 3, side, weight: 3, label: `Entry Model 3: SMT + MSS + IFVG (${side})` });
    }
    // Model 4: SMT + MSS + BB (3 components)
    if (smtOk && mssOk && bbOk) {
      matches.push({ model: 4, side, weight: 3, label: `Entry Model 4: SMT + MSS + BB (${side})` });
    }
    // Model 5: Liquidity Sweep + MSS + BB + FVG (4 components — the most rigorous combo)
    if (sweepOk && mssOk && bbOk && fvgOk) {
      matches.push({ model: 5, side, weight: 4, label: `Entry Model 5: Sweep + MSS + BB + FVG (${side})` });
    }
    // Model 6: Turtle Soup + MSS + FVG (3 components)
    if (turtleOk && mssOk && fvgOk) {
      matches.push({ model: 6, side, weight: 3, label: `Entry Model 6: Turtle Soup + MSS + FVG (${side})` });
    }
    // Model 7: Order Block + MSS + FVG (3 components)
    if (obOk && mssOk && fvgOk) {
      matches.push({ model: 7, side, weight: 3, label: `Entry Model 7: Order Block + MSS + FVG (${side})` });
    }
    // Model 8: CHoCH + Order Block (2 components — CHoCH == MSS here, same detector)
    if (mssOk && obOk) {
      matches.push({ model: 8, side, weight: 2, label: `Entry Model 8: CHoCH + Order Block (${side})` });
    }
    // Model 9: Mitigation Block + FVG (2 components)
    if (mitigationOk && fvgOk) {
      matches.push({ model: 9, side, weight: 2, label: `Entry Model 9: Mitigation Block + FVG (${side})` });
    }
    // Model 10: CISD + FVG (2 components — CISD's stricter confirmation
    // means this fires less often than model 1 despite fewer named parts,
    // which is why it's still weighted at 2 rather than boosted higher —
    // weight reflects component COUNT for consistency, not perceived rarity).
    if (cisdOk && fvgOk) {
      matches.push({ model: 10, side, weight: 2, label: `Entry Model 10: CISD + FVG (${side})` });
    }
    // Model 11: Double Liquidity Sweep (1 named component, but represents
    // two actual sweep events — weighted as 2 to reflect that).
    if (doubleOk) {
      matches.push({ model: 11, side, weight: 2, label: `Entry Model 11: Double Liquidity Sweep (${side})` });
    }
  };

  trySide("bull");
  trySide("bear");

  return matches;
}
