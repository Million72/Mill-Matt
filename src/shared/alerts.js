export function checkAlerts(signals, prevSignals) {
  const alerts = [];
  Object.values(signals).forEach(sig => {
    if (!sig || sig.error) return;
    const prev = prevSignals?.[sig.symbol];
    // New signal fired
    if (sig.signal !== "WAIT" && (!prev || prev.signal === "WAIT")) {
      alerts.push({ symbol: sig.symbol, signal: sig.signal, confidence: sig.confidence, price: sig.price });
    }
  });
  return alerts;
}
