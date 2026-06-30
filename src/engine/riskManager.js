// Risk management helpers
export function positionSize(accountBalance, riskPercent, entry, sl) {
  if (!entry || !sl) return null;
  const riskAmount = accountBalance * (riskPercent / 100);
  const pipsAtRisk = Math.abs(entry - sl);
  if (pipsAtRisk === 0) return null;
  return +(riskAmount / pipsAtRisk).toFixed(2);
}

export function maxDrawdown(signals) {
  const active = Object.values(signals).filter(s => s.signal !== "WAIT" && !s.error);
  return { activeSignals: active.length, overExposed: active.length > 3 };
}
