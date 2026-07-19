import { useState } from "react";
import C from "../constants/colors.js";
import { fmtTime } from "../utils/formatters.js";

export default function SignalHistory({ history }) {
  const [open, setOpen] = useState(true);
  if (!history || history.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: C.sub, fontSize: 13 }}>
        No locked signals yet — history fills in as BUY/SELL signals fire on closed candles.
      </div>
    );
  }
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 6, padding: "6px 14px", fontSize: 12, width: "100%", marginBottom: 8 }}>
        {open ? "▲ Hide" : "▼ Show"} {history.length} locked signal{history.length === 1 ? "" : "s"}
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {history.map((h) => (
            <div key={`${h.symbol}|${h.timeframe}|${h.candleTime}`} style={{ background: C.card, borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${h.signal === "BUY" ? C.bull : C.bear}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{h.symbol}</span>
                <span style={{ color: h.signal === "BUY" ? C.bull : C.bear, fontWeight: 800, fontSize: 13 }}>{h.signal}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: C.sub }}>
                <span>Entry: {h.price}</span>
                <span>{h.confidence}% confidence</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 10, color: C.muted }}>
                <span>Locked {fmtTime(new Date(h.lockedAt))}</span>
                <span>Candle closed {new Date(h.candleTime).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
