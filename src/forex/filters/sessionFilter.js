export function sessionFilter() {
  // Deriv forex available Mon-Fri 00:00-23:59 UTC
  const now  = new Date();
  const day  = now.getUTCDay();
  // Block weekends
  if (day === 0 || day === 6) return { active: false, session: "WEEKEND" };
  const hour = now.getUTCHours();
  const session =
    hour >= 0  && hour < 8  ? "ASIAN"    :
    hour >= 8  && hour < 12 ? "LONDON"   :
    hour >= 12 && hour < 17 ? "NEW_YORK" : "OFF_HOURS";
  // Best sessions for trading
  const active = session === "LONDON" || session === "NEW_YORK";
  return { active, session };
}
