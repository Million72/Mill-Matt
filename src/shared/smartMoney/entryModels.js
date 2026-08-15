// Entry Models — eleven specific ICT/SMC combos. At least ONE must be
// present for a signal to be allowed to fire at all — this is a REQUIRED
// gate (enforced in shared/signalValidator.js), not an optional bonus.
//
// ── HTF → MTF → LTF cascade ────────────────────────────────────────
// Per the specified architecture:
//   HTF (highest timeframe, our htf2)  — sets BIAS only. Entry models are
//     only ever scanned for the side that matches this bias. If HTF is
//     NEUTRAL, both sides remain eligible (no bias to filter by yet).
//   MTF (middle timeframe, our htf1)   — BOS/MSS/CHoCH/sweep/institutional
//     zone. Scored elsewhere in the engine (not this file) — contributes to
//     confidence but is not a hard gate on its own, per instruction.
//   LTF (selected/primary timeframe)   — THIS is where entry models are
//     actually scanned. `candles` passed into this file is always the LTF's
//     own candle history — HTF/MTF only ever influence the bias filter
//     below, never their own candles being scanned for zones.
//
// This directly fixes an earlier bug where the same instrument could show
// e.g. "Model 9: Mitigation Block + FVG (bull)" AND "...( bear)"
// simultaneously — two contradictory setups "detected" at once. That
// happened because both sides were evaluated completely independently with
// no bias filter and no requirement that the component zones be part of one
// coherent, recent setup. Both issues are fixed below.
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

import { detectFVGs, detectIFVGs, detectBreakerBlocks, detectBPRs, detectOrderBlocks, detectMitigationBlocks, isZoneRelevant } from "./zones.js";
import { detectTurtleSoup, detectDoubleSweep } from "./sweepHistory.js";
import { detectCISD } from "./cisd.js";

// Only zones that are BOTH the right side AND currently relevant (close to
// price, per isZoneRelevant's ATR-scaled distance check) qualify — this
// alone was already true before, but is now combined with the coherence
// window check below so components can't be stitched together from
// unrelated moments in history.
function zonesOfSide(zones, side, candles) {
  return zones.filter(z => z.side === side && isZoneRelevant(candles, z));
}

// coherenceWindow: how many candles apart the LATEST qualifying instance of
// each component is allowed to be from the most recent candle, so a match
// reflects one recent, coherent setup rather than components scavenged from
// anywhere in the whole lookback window.
const COHERENCE_WINDOW = 12;

function mostRecentIndex(zones, candlesLength) {
  if (!zones.length) return -1;
  return Math.max(...zones.map(z => z.index));
}

function isRecent(index, candlesLength) {
  if (index < 0) return false;
  return (candlesLength - 1 - index) <= COHERENCE_WINDOW;
}

// checkEntryModels evaluates all 11 models against the given inputs.
//
// Inputs:
//   candles      — LTF (selected timeframe) candle history — entry models
//                  are ONLY ever scanned here, never on HTF/MTF candles.
//   sweep, mss, smt — as before, computed from the LTF candles.
//   structure    — LTF market structure (needed for CISD).
//   htfBias      — "BULL" | "BEAR" | "NEUTRAL", the HIGHEST timeframe's
//                  bias (our htf2). Entry models are only scanned for the
//                  side matching this bias; NEUTRAL allows both sides to
//                  still be checked (no directional bias established yet
//                  at the highest timeframe, so we don't have grounds to
//                  exclude either side outright).
export function checkEntryModels(candles, sweep, mss, smt, structure, htfBias = "NEUTRAL") {
  const matches = [];
  const n = candles.length;

  const fvgs      = detectFVGs(candles);
  const ifvgs     = detectIFVGs(candles);
  const breakers  = detectBreakerBlocks(candles);
  const bprs      = detectBPRs(candles);
  const obs       = detectOrderBlocks(candles);
  const mitigations = detectMitigationBlocks(candles);
  const turtleSoup  = detectTurtleSoup(candles);
  const doubleSweep = detectDoubleSweep(candles);
  const cisd = structure ? detectCISD(candles, structure) : null;

  // Determine which side(s) are even eligible, per the HTF bias gate.
  const sidesToCheck = [];
  if (htfBias === "BULL") sidesToCheck.push("bull");
  else if (htfBias === "BEAR") sidesToCheck.push("bear");
  else sidesToCheck.push("bull", "bear"); // NEUTRAL — no bias to filter by

  const trySide = (side) => {
    const sweepOk = sweep && sweep.side === side;
    const mssOk   = mss && mss.side === side;
    const smtOk   = smt && smt.side === side;

    const fvgZones      = zonesOfSide(fvgs, side, candles);
    const ifvgZones     = zonesOfSide(ifvgs, side, candles);
    const bbZones       = zonesOfSide(breakers, side, candles);
    const obZones       = zonesOfSide(obs, side, candles);
    const mitigationZones = zonesOfSide(mitigations, side, candles);

    const fvgOk   = fvgZones.length > 0 && isRecent(mostRecentIndex(fvgZones, n), n);
    const ifvgOk  = ifvgZones.length > 0 && isRecent(mostRecentIndex(ifvgZones, n), n);
    const bbOk    = bbZones.length > 0 && isRecent(mostRecentIndex(bbZones, n), n);
    const obOk    = obZones.length > 0 && isRecent(mostRecentIndex(obZones, n), n);
    const mitigationOk = mitigationZones.length > 0 && isRecent(mostRecentIndex(mitigationZones, n), n);

    const turtleOk  = turtleSoup && turtleSoup.side === side;
    const doubleOk  = doubleSweep && doubleSweep.side === side;
    const cisdOk    = cisd && cisd.side === side;
    const bprOk     = bprs.some(z => isZoneRelevant(candles, z) && isRecent(z.index, n));

    if (sweepOk && mssOk && fvgOk) {
      matches.push({ model: 1, side, weight: 3, label: `Entry Model 1: Sweep + MSS + FVG (${side})` });
    }
    if (sweepOk && bprOk) {
      matches.push({ model: 2, side, weight: 2, label: `Entry Model 2: Sweep + BPR (${side})` });
    }
    if (smtOk && mssOk && ifvgOk) {
      matches.push({ model: 3, side, weight: 3, label: `Entry Model 3: SMT + MSS + IFVG (${side})` });
    }
    if (smtOk && mssOk && bbOk) {
      matches.push({ model: 4, side, weight: 3, label: `Entry Model 4: SMT + MSS + BB (${side})` });
    }
    if (sweepOk && mssOk && bbOk && fvgOk) {
      matches.push({ model: 5, side, weight: 4, label: `Entry Model 5: Sweep + MSS + BB + FVG (${side})` });
    }
    if (turtleOk && mssOk && fvgOk) {
      matches.push({ model: 6, side, weight: 3, label: `Entry Model 6: Turtle Soup + MSS + FVG (${side})` });
    }
    if (obOk && mssOk && fvgOk) {
      matches.push({ model: 7, side, weight: 3, label: `Entry Model 7: Order Block + MSS + FVG (${side})` });
    }
    if (mssOk && obOk) {
      matches.push({ model: 8, side, weight: 2, label: `Entry Model 8: CHoCH + Order Block (${side})` });
    }
    if (mitigationOk && fvgOk) {
      matches.push({ model: 9, side, weight: 2, label: `Entry Model 9: Mitigation Block + FVG (${side})` });
    }
    if (cisdOk && fvgOk) {
      matches.push({ model: 10, side, weight: 2, label: `Entry Model 10: CISD + FVG (${side})` });
    }
    if (doubleOk) {
      matches.push({ model: 11, side, weight: 2, label: `Entry Model 11: Double Liquidity Sweep (${side})` });
    }
  };

  sidesToCheck.forEach(trySide);

  return matches;
}
