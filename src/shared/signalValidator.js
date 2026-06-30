// Core signal validation — same rules for both forex and synthetic
export function validateSignal(engineResult) {
  const { bullScore, bearScore, blocks, vol, type } = engineResult;

  // Hard blocks — never fire a signal
  if (blocks && blocks.length > 0) {
    // Only block if ADX weak AND no strong price action
    const adxBlock = blocks.includes("Trend Strength");
    if (adxBlock && bullScore < 12 && bearScore < 12)
      return { valid: false, reason: "ADX too weak — ranging market" };
  }

  // Minimum score threshold
  const MIN_SCORE  = 10;
  const MIN_MARGIN = 4;  // dominant side must lead by at least 4pts

  const bullDominant = bullScore >= MIN_SCORE && bullScore > bearScore + MIN_MARGIN;
  const bearDominant = bearScore >= MIN_SCORE && bearScore > bullScore + MIN_MARGIN;

  if (!bullDominant && !bearDominant)
    return { valid: false, reason: `Insufficient confluence (bull:${bullScore} bear:${bearScore})` };

  const side = bullDominant ? "bull" : "bear";
  return { valid: true, side };
}
