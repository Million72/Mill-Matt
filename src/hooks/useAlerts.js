// Notifications removed by request. Kept as a no-op hook (rather than
// deleted) because Dashboard.jsx — the fixed reference file — already
// calls useAlerts(signals) and can't be edited; removing the export
// entirely would break that import. This does nothing with the signal
// data it receives.
export function useAlerts(_signals) {
  // intentionally empty
}
