import { swingHighs, swingLows } from "../../utils/math.js";

export function chartPatterns(candles, dec = 3) {
  if (candles.length < 30) return [];
  const pats  = [];
  const slice = candles.slice(-60);
  const n     = slice.length;
  const tol   = 0.012;
  const sH    = swingHighs(slice, 3);
  const sL    = swingLows(slice, 3);
  const curr  = slice[n-1].close;

  // BOS
  if (sH.length && sL.length) {
    const lastH = sH[sH.length - 1];
    const lastL = sL[sL.length - 1];
    if (curr > lastH.price) pats.push({ name: `BOS Bullish — broke ${lastH.price.toFixed(dec)}`, side: "bull", strength: 3 });
    else if (curr < lastL.price) pats.push({ name: `BOS Bearish — broke ${lastL.price.toFixed(dec)}`, side: "bear", strength: 3 });
  }

  // Double Bottom
  for (let a = 0; a < sL.length - 1; a++) {
    for (let b = a + 1; b < sL.length; b++) {
      if (sL[b].i - sL[a].i < 5) continue;
      if (Math.abs(sL[a].price - sL[b].price) / sL[a].price < tol) {
        pats.push({ name: "Double Bottom", side: "bull", strength: 3 });
        break;
      }
    }
    if (pats.some(p => p.name === "Double Bottom")) break;
  }

  // Double Top
  for (let a = 0; a < sH.length - 1; a++) {
    for (let b = a + 1; b < sH.length; b++) {
      if (sH[b].i - sH[a].i < 5) continue;
      if (Math.abs(sH[a].price - sH[b].price) / sH[a].price < tol) {
        pats.push({ name: "Double Top", side: "bear", strength: 3 });
        break;
      }
    }
    if (pats.some(p => p.name === "Double Top")) break;
  }

  return pats;
}
