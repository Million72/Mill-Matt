// WebSocket connection pool — reuse connections where possible
const pool = new Map();

export function getConnection(url) {
  if (pool.has(url) && pool.get(url).readyState === WebSocket.OPEN) {
    return pool.get(url);
  }
  const ws = new WebSocket(url);
  pool.set(url, ws);
  ws.onclose = () => pool.delete(url);
  return ws;
}
