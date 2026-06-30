import { swingHighs, swingLows } from "../../utils/math.js";

export function dynamicSR(candles, dec = 3) {
  if (candles.length < 20) return { support: null, resistance: null, nearSupport: false, nearResistance: false };
  const slice = candles.slice(-40);
  const highs = swingHighs(slice, 3);
  const lows  = swingLows(slice, 3);
  const price = candles[candles.length - 1].close;

  const resistance = highs.length ? highs.sort((a,b) => Math.abs(a.price-price) - Math.abs(b.price-price))[0]?.price : null;
  const support    = lows.length  ? lows.sort((a,b)  => Math.abs(a.price-price) - Math.abs(b.price-price))[0]?.price : null;
  const rng        = resistance && support ? Math.abs(resistance - support) : price * 0.01;

  return {
    resistance, support,
    nearResistance: resistance ? Math.abs(price - resistance) < rng * 0.05 : false,
    nearSupport:    support    ? Math.abs(price - support)    < rng * 0.05 : false,
  };
}
