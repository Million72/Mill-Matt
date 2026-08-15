// Market Structure Shift (MSS) — the ICT/SMC term for what this codebase's
// existing price-action modules call "CHoCH" (Change of Character): the
// first break against prevailing structure, signaling a potential reversal.
//
// This is the SAME underlying concept and math as forex/priceAction/choch.js
// and synthetic/priceAction/choch.js — this file exists purely so entry-model
// code (which uses standard ICT terminology per the requested entry models)
// reads naturally as "MSS" rather than silently reusing a CHoCH detector
// under a different name with no documented equivalence.
//
// detectCHoCH is passed in by the caller (forex or synthetic version) so
// this file has no engine-specific dependency of its own.
export function detectMSS(candles, structure, detectCHoCHFn) {
  const result = detectCHoCHFn(candles, structure);
  if (!result) return null;
  return { ...result, type: "MSS", label: result.label.replace("CHoCH", "MSS") };
}
