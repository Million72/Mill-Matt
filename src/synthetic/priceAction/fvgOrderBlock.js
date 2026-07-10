// Fair Value Gap (FVG) and Order Block detection + retest.
//
// FVG: a 3-candle imbalance where candle 1's high/low doesn't overlap with
// candle 3's low/high, leaving a "gap" in traded price that price often
// returns to fill before continuing its move.
//
// Order Block: the last opposing-direction candle immediately before a
// strong impulsive move — the idea being that block's range marks where
// smart-money orders were placed, and price often retests it before
// continuing.
//
// This module detects BOTH types across recent candles and checks if the
// current price is retesting either zone right now.

function detectFVGs(candles, dec) {
  const zones = [];
  // Need candles[i-1], candles[i], candles[i+1] to form the 3-candle pattern.
  for (let i = 1; i < candles.length - 1; i++) {
    const c1 = candles[i - 1];
    const c3 = candles[i + 1];

    // Bullish FVG: candle1's high is below candle3's low — gap in between.
    if (c1.high < c3.low) {
      zones.push({ type: "FVG", side: "bull", top: c3.low, bottom: c1.high, index: i });
    }
    // Bearish FVG: candle1's low is above candle3's high.
    if (c1.low > c3.high) {
      zones.push({ type: "FVG", side: "bear", top: c1.low, bottom: c3.high, index: i });
    }
  }
  return zones;
}

function detectOrderBlocks(candles, dec) {
  const zones = [];
  const isBull = c => c.close > c.open;
  const isBear = c => c.close < c.open;
  const body   = c => Math.abs(c.close - c.open);

  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];

    // Bullish Order Block: last bearish candle before a strong bullish impulse
    // (impulse candle's body notably larger than the order block candle's body).
    if (isBear(prev) && isBull(curr) && body(curr) > body(prev) * 1.5) {
      zones.push({ type: "OrderBlock", side: "bull", top: prev.high, bottom: prev.low, index: i - 1 });
    }
    // Bearish Order Block: last bullish candle before a strong bearish impulse.
    if (isBull(prev) && isBear(curr) && body(curr) > body(prev) * 1.5) {
      zones.push({ type: "OrderBlock", side: "bear", top: prev.high, bottom: prev.low, index: i - 1 });
    }
  }
  return zones;
}

// detectZoneRetest checks whether current price is trading back inside any
// recently-formed FVG or Order Block zone — treated as a potential
// continuation entry in the zone's implied direction, since price returning
// to "fill" these zones and then continuing is the standard expected behavior.
export function detectZoneRetest(candles, dec = 3) {
  if (candles.length < 15) return null;

  // Only look at zones formed in the recent past (last 30 candles) — an
  // FVG/Order Block from 200 candles ago is stale and not meaningfully
  // "retestable" anymore.
  const recentStart = Math.max(0, candles.length - 30);
  const recentCandles = candles.slice(recentStart);

  const fvgs   = detectFVGs(recentCandles, dec);
  const blocks = detectOrderBlocks(recentCandles, dec);
  const zones  = [...fvgs, ...blocks];

  if (zones.length === 0) return null;

  const last = candles[candles.length - 1];

  // Check the most recent zones first (closer to "now" = more relevant).
  const sorted = zones.sort((a, b) => b.index - a.index);

  for (const zone of sorted) {
    const inZone = last.low <= zone.top && last.high >= zone.bottom;
    if (inZone) {
      const label = zone.type === "FVG"
        ? `${zone.side === "bull" ? "Bullish" : "Bearish"} FVG retest (${zone.bottom.toFixed(dec)}-${zone.top.toFixed(dec)})`
        : `${zone.side === "bull" ? "Bullish" : "Bearish"} Order Block retest (${zone.bottom.toFixed(dec)}-${zone.top.toFixed(dec)})`;
      return { side: zone.side, type: zone.type, label };
    }
  }
  return null;
}
