export function adx(candles, period = 14) {
  if (!candles || candles.length < period * 2) return { adx: 0, plusDI: 0, minusDI: 0 };
  const trList = [], plusDM = [], minusDM = [];
  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i], prev = candles[i - 1];
    const tr  = Math.max(curr.high - curr.low, Math.abs(curr.high - prev.close), Math.abs(curr.low - prev.close));
    const pdm = curr.high - prev.high;
    const mdm = prev.low - curr.low;
    trList.push(tr);
    plusDM.push(pdm > mdm && pdm > 0 ? pdm : 0);
    minusDM.push(mdm > pdm && mdm > 0 ? mdm : 0);
  }
  const smooth = (arr) => {
    let s = arr.slice(0, period).reduce((a, b) => a + b, 0);
    const r = [s];
    for (let i = period; i < arr.length; i++) { s = s - s / period + arr[i]; r.push(s); }
    return r;
  };
  const sTR = smooth(trList), sPDM = smooth(plusDM), sMDM = smooth(minusDM);
  const diPlus  = sTR.map((t, i) => t === 0 ? 0 : (sPDM[i] / t) * 100);
  const diMinus = sTR.map((t, i) => t === 0 ? 0 : (sMDM[i] / t) * 100);
  const dx = diPlus.map((p, i) => {
    const sum = p + diMinus[i];
    return sum === 0 ? 0 : Math.abs(p - diMinus[i]) / sum * 100;
  });
  const adxSmooth = smooth(dx);
  const last = adxSmooth.length - 1;
  return {
    adx:     adxSmooth[last] || 0,
    plusDI:  diPlus[diPlus.length - 1] || 0,
    minusDI: diMinus[diMinus.length - 1] || 0,
  };
}
