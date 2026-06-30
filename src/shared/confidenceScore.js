export function confidenceScore(bullScore, bearScore) {
  const total = bullScore + bearScore;
  if (total === 0) return { bullConf: 0, bearConf: 0 };
  const bullConf = Math.min(100, Math.round((bullScore / (total * 0.6)) * 100));
  const bearConf = Math.min(100, Math.round((bearScore / (total * 0.6)) * 100));
  return { bullConf, bearConf };
}
