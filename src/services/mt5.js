// MetaApi bridge — placeholder for future MT5 integration
// Currently all data comes from Deriv WebSocket
export async function fetchMT5Candles(symbol, accountId, token, timeframe = "1h", bars = 300) {
  const url = `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${accountId}/symbols/${symbol}/candles/${timeframe}?limit=${bars}`;
  const res = await fetch(url, { headers: { "auth-token": token } });
  if (!res.ok) throw new Error(`MetaApi ${res.status}`);
  const data = await res.json();
  return data.map(c => ({ open: c.open, high: c.high, low: c.low, close: c.close, time: new Date(c.time).getTime() }));
}
