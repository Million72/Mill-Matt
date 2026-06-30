export const FOREX = [
  { symbol: "XAUUSD", name: "Gold",    deriv: "frxXAUUSD", isJPY: false, isGold: true  },
  { symbol: "EURUSD", name: "EUR/USD", deriv: "frxEURUSD", isJPY: false, isGold: false },
  { symbol: "GBPUSD", name: "GBP/USD", deriv: "frxGBPUSD", isJPY: false, isGold: false },
  { symbol: "USDJPY", name: "USD/JPY", deriv: "frxUSDJPY", isJPY: true,  isGold: false },
  { symbol: "AUDUSD", name: "AUD/USD", deriv: "frxAUDUSD", isJPY: false, isGold: false },
  { symbol: "USDCAD", name: "USD/CAD", deriv: "frxUSDCAD", isJPY: false, isGold: false },
  { symbol: "USDCHF", name: "USD/CHF", deriv: "frxUSDCHF", isJPY: false, isGold: false },
  { symbol: "EURJPY", name: "EUR/JPY", deriv: "frxEURJPY", isJPY: true,  isGold: false },
  { symbol: "GBPJPY", name: "GBP/JPY", deriv: "frxGBPJPY", isJPY: true,  isGold: false },
  { symbol: "EURGBP", name: "EUR/GBP", deriv: "frxEURGBP", isJPY: false, isGold: false },
];

export const SYNTHETICS = [
  { symbol: "Volatility 10",  name: "V10",   deriv: "R_10"      },
  { symbol: "Volatility 25",  name: "V25",   deriv: "R_25"      },
  { symbol: "Volatility 50",  name: "V50",   deriv: "R_50"      },
  { symbol: "Volatility 75",  name: "V75",   deriv: "R_75"      },
  { symbol: "Volatility 100", name: "V100",  deriv: "R_100"     },
  { symbol: "1HZ10V",         name: "1Hz10", deriv: "1HZ10V"    },
  { symbol: "Step Index",     name: "Step",  deriv: "stpRNG"    },
  { symbol: "Jump 10",        name: "Jmp10", deriv: "JD10"      },
  { symbol: "Boom 300",       name: "B300",  deriv: "BOOM300N"  },
  { symbol: "Boom 500",       name: "B500",  deriv: "BOOM500"   },
  { symbol: "Crash 300",      name: "C300",  deriv: "CRASH300N" },
  { symbol: "Crash 500",      name: "C500",  deriv: "CRASH500"  },
];
