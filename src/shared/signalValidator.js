// Core signal validation — same rules for both forex and synthetic
const MAX_SCORE = 30;
const MIN_CONFIDENCE_PCT = 70; // hard floor — a signal must be genuinely convincing, not just barely dominant

export function validateSignal(engineResult) {
  const { bullScore, bearScore, blocks } = engineResult;

  // Hard blocks — never fire a signal
  if (blocks && blocks.length > 0) {
    const adxBlock = blocks.includes("Trend Strength");
    if (adxBlock && bullScore < 12 && bearScore < 12)
      return { valid: false, reason: "ADX too weak — ranging market" };
  }

  // Minimum score threshold (keeps the reasoning-quality check)
  const MIN_SCORE  = 10;
  const MIN_MARGIN = 4;

  const bullDominant = bullScore >= MIN_SCORE && bullScore > bearScore + MIN_MARGIN;
  const bearDominant = bearScore >= MIN_SCORE && bearScore > bullScore + MIN_MARGIN;

  if (!bullDominant && !bearDominant)
    return { valid: false, reason: `Insufficient confluence (bull:${bullScore} bear:${bearScore})` };

  const side = bullDominant ? "bull" : "bear";

  // ── Confidence floor — the actual fix ───────────────────────────
  // A signal can clear the score/margin check above while still translating
  // to a mediocre confidence percentage (e.g. 10/30 = 33%). That's not a
  // "quality signal" no matter how clean the margin looks in raw points.
  // This gate refuses to fire ANY signal below MIN_CONFIDENCE_PCT, regardless
  // of how the score/margin math played out.
  const score = side === "bull" ? bullScore : bearScore;
  const confidencePct = Math.round((score / MAX_SCORE) * 100);

  if (confidencePct < MIN_CONFIDENCE_PCT) {
    return {
      valid: false,
      reason: `Confidence ${confidencePct}% below ${MIN_CONFIDENCE_PCT}% floor — signal too weak to act on`,
    };
  }

  // Counter-trend warning — signal fires but note the conflict
  const counterTrend = (engineResult.trend?.bias === "BULLISH" && side === "bear")
    || (engineResult.trend?.bias === "BEARISH" && side === "bull");

  return { valid: true, side, counterTrend };
}
