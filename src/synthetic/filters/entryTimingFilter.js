// Entry Timing Filter — the two checks that actually target the real
// losses this system has caused, as opposed to indicator selection:
//
//   1. Max dollar-risk cap: reject a signal if its 50-EMA-based stop
//      distance, at a defined minimum lot size, would risk more than a
//      configured dollar amount. This directly targets stops that sat
//      50-2000+ points away and produced -20/-40 USD drawdowns before ever
//      reaching profit.
//   2. Proximity requirement: only allow entry when price is CLOSE to the
//      confirming EMA/VWAP level (not chasing an already-extended move).
//      This targets signals firing on a single overextended candle far
//      from any real reference level.
//
// Both are needed together — a tight dollar cap alone doesn't stop a signal
// from firing mid-chase on a spike candle, and a proximity check alone
// doesn't stop a technically-valid signal from having an unacceptably wide
// stop for a small account.

const DEFAULT_MAX_RISK_USD = 5; // configurable — the user has been explicit that -20+ before profit is unacceptable
const DEFAULT_MIN_LOT = 0.01;
const PROXIMITY_ATR_MULTIPLE = 1.0; // price must be within 1x ATR of the reference EMA/VWAP level

// estimateDollarRisk: rough conversion of a price-distance stop into a
// dollar amount at a given lot size. Synthetic indices on Deriv generally
// use $1 per point per 1.0 lot as a reasonable working approximation for
// this purpose (exact contract specs vary slightly by index) — documented
// here as an approximation, not an exact broker-verified figure, since we
// don't have live contract-spec data to draw from.
function estimateDollarRisk(entryPrice, slPrice, lotSize) {
  const pointDistance = Math.abs(entryPrice - slPrice);
  return pointDistance * lotSize;
}

// checkEntryTiming returns { allowed, reason, estimatedRiskUsd } — the
// engine should treat allowed:false as a hard block, same tier as the RSI
// overbought/oversold blocks already in place.
export function checkEntryTiming(candles, price, slPrice, ema50Value, vwapValue, atrValue, opts = {}) {
  const maxRiskUsd = opts.maxRiskUsd ?? DEFAULT_MAX_RISK_USD;
  const minLot = opts.minLot ?? DEFAULT_MIN_LOT;

  if (slPrice == null) {
    return { allowed: false, reason: "No stop-loss calculated — cannot evaluate risk" };
  }

  // ── Check 1: Dollar risk cap ──────────────────────────────────
  const estimatedRiskUsd = estimateDollarRisk(price, slPrice, minLot);
  if (estimatedRiskUsd > maxRiskUsd) {
    return {
      allowed: false,
      reason: `Stop distance implies ~$${estimatedRiskUsd.toFixed(2)} risk at minimum lot — exceeds $${maxRiskUsd} cap`,
      estimatedRiskUsd,
    };
  }

  // ── Check 2: Proximity to a confirming reference level ────────
  // Price must be reasonably close to EITHER the 50 EMA or VWAP — firing a
  // signal when price has already run far away from both means the "entry"
  // is really a chase, not a timed entry.
  if (!atrValue || atrValue <= 0) {
    return { allowed: false, reason: "ATR unavailable — cannot evaluate entry proximity", estimatedRiskUsd };
  }

  const maxDistance = atrValue * PROXIMITY_ATR_MULTIPLE;
  const distToEMA = ema50Value != null ? Math.abs(price - ema50Value) : Infinity;
  const distToVWAP = vwapValue != null ? Math.abs(price - vwapValue) : Infinity;
  const nearReference = distToEMA <= maxDistance || distToVWAP <= maxDistance;

  if (!nearReference) {
    return {
      allowed: false,
      reason: `Price too far from 50 EMA/VWAP (chasing an extended move) — nearest reference is ${Math.min(distToEMA, distToVWAP).toFixed(2)} away, max allowed ${maxDistance.toFixed(2)}`,
      estimatedRiskUsd,
    };
  }

  return { allowed: true, reason: "Entry timing confirmed — within risk cap and near reference level", estimatedRiskUsd };
}
