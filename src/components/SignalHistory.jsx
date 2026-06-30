import { useState } from "react";
import C from "../constants/colors.js";
import { fmtTime } from "../utils/formatters.js";

export default function SignalHistory({ history }) {
  const [open, setOpen] = useState(false);
  if (!history || history.length === 0) return null;
  return (
    <div style={{ padding: "0 16px 10px" }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 6, padding: "6px 14px", fontSize: 12, width: "100%" }}>
        {open ? "▲ Hide" : "▼ Show"} signal history ({history.length})
      </button>
      {open && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {history.slice(-10).reverse().map((h, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 6, padding: "6px 10px", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.text }}>{h.symbol}</span>
              <span style={{ color: h.signal === "BUY" ? C.bull : C.bear, fontWeight: 700 }}>{h.signal}</span>
              <span style={{ color: C.sub }}>{fmtTime(new Date(h.timestamp))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
