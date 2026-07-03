import { atr } from "../indicators/atr.js";

export function calculateTPSL(candles, side, price, dec) {
  // Need at least 15 candles for ATR
  if (!candles || candles.length < 15) return { tp1: null, tp2: null, sl: null, pips: null, atr: null };
  const ATR = atr(candles, 14);
  if (!ATR || ATR === 0) return { tp1: null, tp2: null, sl: null, pips: null, atr: null };

  const isSyn   = dec <= 3 && price > 100;
  const isGold  = dec === 2 && price > 1000 && price < 10000;
  const isJPY   = dec === 3 && price > 50;

  // ATR multipliers — tighter for synthetics (more volatile), wider for forex
  const slMult  = isSyn ? 1.2 : 1.5;
  const tp1Mult = isSyn ? 1.8 : 2.0;
  const tp2Mult = isSyn ? 3.0 : 3.5;

  if (side === "bull") {
    return {
      sl:   +(price - ATR * slMult).toFixed(dec),
      tp1:  +(price + ATR * tp1Mult).toFixed(dec),
      tp2:  +(price + ATR * tp2Mult).toFixed(dec),
      atr:  +ATR.toFixed(dec + 1),
      pips: +(ATR * (isJPY || isGold ? 100 : isSyn ? 1 : 10000)).toFixed(1),
    };
  } else {
    return {
      sl:   +(price + ATR * slMult).toFixed(dec),
      tp1:  +(price - ATR * tp1Mult).toFixed(dec),
      tp2:  +(price - ATR * tp2Mult).toFixed(dec),
      atr:  +ATR.toFixed(dec + 1),
      pips: +(ATR * (isJPY || isGold ? 100 : isSyn ? 1 : 10000)).toFixed(1),
    };
  }
}
