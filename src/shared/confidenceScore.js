// Fixed
export function confidenceScore(bullScore, bearScore, MAX = 20) {
  const bullConf = Math.min(100, Math.round((bullScore / MAX) * 100));
  const bearConf = Math.min(100, Math.round((bearScore / MAX) * 100));
  return { bullConf, bearConf };
}
