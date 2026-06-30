export const fmtTime  = d => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
export const fmtPrice = (v, dec) => v != null ? (+v).toFixed(dec) : "—";
export const getDec   = (symbol, price) => {
  if (symbol === "XAUUSD") return 2;
  if (["USDJPY","EURJPY","GBPJPY"].includes(symbol)) return 3;
  if (price > 999) return 2;
  if (price > 9)   return 3;
  return 5;
};
