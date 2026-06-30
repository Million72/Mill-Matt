export function trendFilter(trend, htfTrend) {
  // Signal must align with at least one timeframe trend
  if (trend.bias === "NEUTRAL" && htfTrend === "NEUTRAL") return false;
  return true;
}
