export const isBull   = c => c.close > c.open;
export const isBear   = c => c.close < c.open;
export const body     = c => Math.abs(c.close - c.open);
export const range    = c => (c.high - c.low) || 0.000001;
export const upWick   = c => c.high - Math.max(c.open, c.close);
export const dnWick   = c => Math.min(c.open, c.close) - c.low;
export const midpoint = c => (c.high + c.low) / 2;
export const delay    = ms => new Promise(r => setTimeout(r, ms));
