// Shared smart-money zone detection — used by BOTH forex and synthetic
// entry-model combinators. Kept in shared/ rather than duplicated per-engine
// since this is pure price-geometry, identical regardless of instrument type
// (matches the same reasoning already used for BOS/CHoCH/liquidity sweep
// being ported near-identically between forex and synthetic).

const isBull = c => c.close > c.open;
const isBear = c => c.close < c.open;
const body   = c => Math.abs(c.close - c.open);

// ── Fair Value Gap (FVG) ────────────────────────────────────────
// 3-candle imbalance: candle1's high/low doesn't overlap candle3's low/high.
export function detectFVGs(candles) {
  const zones = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const c1 = candles[i - 1];
    const c3 = candles[i + 1];
    if (c1.high < c3.low) zones.push({ type: "FVG", side: "bull", top: c3.low, bottom: c1.high, index: i, filled: false });
    if (c1.low > c3.high) zones.push({ type: "FVG", side: "bear", top: c1.low, bottom: c3.high, index: i, filled: false });
  }
  return zones;
}

// ── Inverse Fair Value Gap (IFVG) ────────────────────────────────
// An FVG that price has traded THROUGH and closed beyond (violating it),
// which flips its expected role — a bullish FVG that gets violated to the
// downside becomes a bearish IFVG zone (and vice versa), since the
// imbalance it represented has now been invalidated and price is expected
// to react to it from the opposite side.
export function detectIFVGs(candles) {
  const fvgs = detectFVGs(candles);
  const ifvgs = [];

  for (const fvg of fvgs) {
    // Look at candles AFTER the FVG formed to see if it was later violated.
    for (let i = fvg.index + 1; i < candles.length; i++) {
      const c = candles[i];
      if (fvg.side === "bull" && c.close < fvg.bottom) {
        // Bullish FVG violated downward — flips to bearish IFVG.
        ifvgs.push({ type: "IFVG", side: "bear", top: fvg.top, bottom: fvg.bottom, index: i, originalSide: "bull" });
        break;
      }
      if (fvg.side === "bear" && c.close > fvg.top) {
        // Bearish FVG violated upward — flips to bullish IFVG.
        ifvgs.push({ type: "IFVG", side: "bull", top: fvg.top, bottom: fvg.bottom, index: i, originalSide: "bear" });
        break;
      }
    }
  }
  return ifvgs;
}

// ── Order Block ──────────────────────────────────────────────────
// Last opposing-direction candle immediately before a strong impulsive move.
export function detectOrderBlocks(candles) {
  const zones = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    if (isBear(prev) && isBull(curr) && body(curr) > body(prev) * 1.5)
      zones.push({ type: "OrderBlock", side: "bull", top: prev.high, bottom: prev.low, index: i - 1 });
    if (isBull(prev) && isBear(curr) && body(curr) > body(prev) * 1.5)
      zones.push({ type: "OrderBlock", side: "bear", top: prev.high, bottom: prev.low, index: i - 1 });
  }
  return zones;
}

// ── Breaker Block (BB) ───────────────────────────────────────────
// An Order Block that price later breaks THROUGH (invalidating it as
// support/resistance in its original direction), which — like an IFVG —
// flips its expected role. A bullish Order Block that gets broken below
// becomes a bearish Breaker Block, since the last "smart money buy zone"
// failed and is now expected to act as resistance on a retest.
export function detectBreakerBlocks(candles) {
  const obs = detectOrderBlocks(candles);
  const breakers = [];

  for (const ob of obs) {
    for (let i = ob.index + 1; i < candles.length; i++) {
      const c = candles[i];
      if (ob.side === "bull" && c.close < ob.bottom) {
        breakers.push({ type: "BreakerBlock", side: "bear", top: ob.top, bottom: ob.bottom, index: i, originalSide: "bull" });
        break;
      }
      if (ob.side === "bear" && c.close > ob.top) {
        breakers.push({ type: "BreakerBlock", side: "bull", top: ob.top, bottom: ob.bottom, index: i, originalSide: "bear" });
        break;
      }
    }
  }
  return breakers;
}

// ── Balanced Price Range (BPR) ───────────────────────────────────
// Occurs where a bullish FVG and a bearish FVG overlap in price — the two
// opposing imbalances "balance out," and this overlapping zone often acts
// as a strong reaction area since it represents unresolved inefficiency
// from both directions.
export function detectBPRs(candles) {
  const fvgs = detectFVGs(candles);
  const bullFvgs = fvgs.filter(f => f.side === "bull");
  const bearFvgs = fvgs.filter(f => f.side === "bear");
  const bprs = [];

  for (const bull of bullFvgs) {
    for (const bear of bearFvgs) {
      // Only consider FVGs formed reasonably close together in time —
      // a bullish FVG from 200 candles ago overlapping a fresh bearish one
      // isn't a meaningful "balanced range," just coincidental overlap.
      if (Math.abs(bull.index - bear.index) > 15) continue;

      const overlapTop    = Math.min(bull.top, bear.top);
      const overlapBottom = Math.max(bull.bottom, bear.bottom);
      if (overlapTop > overlapBottom) {
        bprs.push({
          type: "BPR",
          side: "neutral", // BPR itself is directionally neutral — direction comes from how price reacts to it
          top: overlapTop,
          bottom: overlapBottom,
          index: Math.max(bull.index, bear.index),
        });
      }
    }
  }
  return bprs;
}

// ── Distance/relevance helper (shared) ───────────────────────────
// Same volatility-scaled relevance check used to fix the earlier FVG
// staleness bug — reused here so every zone type is held to the same
// "is this actually close enough to matter right now" standard.
export function isZoneRelevant(candles, zone, maxAtrMultiple = 3) {
  const atrWindow = candles.slice(-15);
  let atrSum = 0;
  for (let i = 1; i < atrWindow.length; i++) {
    const c = atrWindow[i], p = atrWindow[i - 1];
    atrSum += Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
  }
  const atr = atrSum / Math.max(atrWindow.length - 1, 1);
  const maxDist = atr * maxAtrMultiple;

  const last = candles[candles.length - 1];
  const zoneMid = (zone.top + zone.bottom) / 2;
  const inZone = last.low <= zone.top && last.high >= zone.bottom;
  const distance = Math.abs(last.close - zoneMid);

  return inZone && distance <= maxDist;
    }
