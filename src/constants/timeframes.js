export const TIMEFRAMES = {
  "1m":  { granularity: 60,    htfGran: 300,   htf2Gran: 900,   candles: 300, label: "1m"  },
  "5m":  { granularity: 300,   htfGran: 900,   htf2Gran: 3600,  candles: 300, label: "5m"  },
  "15m": { granularity: 900,   htfGran: 1800,  htf2Gran: 3600,  candles: 300, label: "15m" },
  "30m": { granularity: 1800,  htfGran: 3600,  htf2Gran: 14400, candles: 300, label: "30m" },
  "1h":  { granularity: 3600,  htfGran: 14400, htf2Gran: 86400, candles: 300, label: "1h"  },
  "4h":  { granularity: 14400, htfGran: 86400, htf2Gran: 604800,candles: 300, label: "4h"  },
};
export const REFRESH_SECONDS = 600;
export const BATCH_SIZE      = 3;
export const BATCH_DELAY_MS  = 700;
