export function volatilityFilter(volatility) {
  return volatility.healthy && !volatility.contracting;
}
