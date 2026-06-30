import { swingHighs, swingLows } from "../../utils/math.js";

export function supportResistance(candles, dec = 5) {
  if (candles.length < 20) return { support: null, resistance: null, nearSupport: false, nearResistance: false };
  const slice = candles.slice(-50);
  const highs = swingHighs(slice, 3);
  const lows  = swingLows(slice, 3);

  const price = candles[candles.length - 1].close;

  // Key levels: most tested highs/lows
  const resistance = highs.length ? Math.max(...highs.map(h => h.price)) : null;
  const support    = lows.length  ? Math.min(...lows.map(l => l.price))  : null;
  const rng        = resistance && support ? resistance - support : 1;

  return {
    resistance,
    support,
    nearResistance: resistance ? Math.abs(price - resistance) / rng < 0.05 : false,
    nearSupport:    support    ? Math.abs(price - support)    / rng < 0.05 : false,
  };
}
