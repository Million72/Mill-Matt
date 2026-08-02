// VWAP (Volume Weighted Average Price) — normally computed using real trade
// volume, but Deriv's synthetic indices don't expose genuine traded volume
// (they're algorithmically generated, not order-book driven). We use the
// standard, widely-accepted proxy for this situation: treat each candle's
// (high+low+close)/3 typical price weighted by its RANGE (high-low) as a
// stand-in for volume — larger-range candles get proportionally more
// influence on the average, which is the closest honest approximation to
// "how much activity happened in this candle" available from OHLC data alone.
//
// This is intentionally documented as an approximation, not a claim that
// it's genuine tick-volume VWAP — being upfront about that distinction
// matters after the trust issues this system has already had.
export function vwap(candles, period = 20) {
  if (!candles || candles.length < period) return null;
  const slice = candles.slice(-period);

  let cumulativeTPV = 0; // typical-price * "volume" (range proxy)
  let cumulativeVol = 0;

  for (const c of slice) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const volProxy = Math.max(c.high - c.low, 0.000001); // avoid zero-range candles nullifying the weight
    cumulativeTPV += typicalPrice * volProxy;
    cumulativeVol += volProxy;
  }

  if (cumulativeVol === 0) return null;
  return cumulativeTPV / cumulativeVol;
}
