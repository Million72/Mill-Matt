export function calcRR(entry, tp1, sl) {
  if (!tp1 || !sl) return null;
  const reward = Math.abs(tp1 - entry);
  const risk   = Math.abs(sl - entry);
  if (risk === 0) return null;
  return +(reward / risk).toFixed(2);
}
