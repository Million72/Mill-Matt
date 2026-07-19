import { useEffect, useRef, useState } from "react";
import { FOREX, SYNTHETICS } from "../constants/markets.js";
import { REFRESH_SECONDS }   from "../constants/timeframes.js";
import { useMarketData }     from "../hooks/useMarketData.js";
import { useSignalEngine }   from "../hooks/useSignalEngine.js";
import { useAlerts }         from "../hooks/useAlerts.js";
import Header                from "./Header.jsx";
import TimeframeSelector     from "./TimeframeSelector.jsx";
import StatsBar              from "./StatsBar.jsx";
import MarketTabs            from "./MarketTabs.jsx";
import FilterBar             from "./FilterBar.jsx";
import SignalCard            from "./SignalCard.jsx";
import SignalHistory         from "./SignalHistory.jsx";
import C from "../constants/colors.js";

export default function Dashboard() {
  const [tab,      setTab]      = useState("forex");
  const [tf,       setTf]       = useState("1h");
  const [filter,   setFilter]   = useState("ALL");
  const [view,     setView]     = useState("live"); // "live" | "history"

  const { fetchMarket } = useMarketData();
  const {
    signals, scanning, lastScan, countdown, setCountdown,
    countRef, stats, errCount, liveCount, scanAll, tfRef, getLockedHistory,
  } = useSignalEngine();

  useAlerts(signals);

  const runScan = (newTf) => scanAll(newTf || tfRef.current, fetchMarket);

  useEffect(() => { runScan("1h"); }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      countRef.current -= 1;
      setCountdown(countRef.current);
      if (countRef.current <= 0) runScan();
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // NOTE: history is intentionally NOT tracked from raw `signals` here.
  // That would re-introduce repainting into the history log itself — every
  // scan re-evaluating the same still-open trade would push a new duplicate
  // entry. Instead, `getLockedHistory()` returns the engine's own frozen
  // record, keyed by symbol+timeframe+CLOSED-candle-time, so the same
  // candle can only ever produce one permanent entry no matter how many
  // times it gets rescanned. See useSignalEngine.js for the locking logic.

  const handleTfChange = (newTf) => {
    setTf(newTf);
    runScan(newTf);
  };

  const currentList  = tab === "forex" ? FOREX : SYNTHETICS;
  const visibleCards = currentList
    .map(m => signals[m.symbol])
    .filter(Boolean)
    .filter(s => s.error || filter === "ALL" || s.signal === filter)
    .sort((a, b) => {
      if (a.error && !b.error) return 1;
      if (!a.error && b.error) return -1;
      return (b.confidence || 0) - (a.confidence || 0);
    });

  const lockedHistory = getLockedHistory();

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: C.text, maxWidth: 480, margin: "0 auto" }}>
      <Header lastScan={lastScan} countdown={countdown} liveCount={liveCount} errCount={errCount} scanning={scanning} onScan={() => runScan()} />
      <TimeframeSelector tf={tf} onChange={handleTfChange} />
      <StatsBar stats={stats} />

      {/* Live vs History toggle */}
      <div style={{ display: "flex", gap: 6, padding: "10px 16px 0" }}>
        <button
          onClick={() => setView("live")}
          style={{ flex: 1, background: view === "live" ? C.accent : C.card, color: view === "live" ? "#000" : C.sub, border: `1px solid ${view === "live" ? C.accent : C.border}`, borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 700 }}
        >
          Live Signals
        </button>
        <button
          onClick={() => setView("history")}
          style={{ flex: 1, background: view === "history" ? C.accent : C.card, color: view === "history" ? "#000" : C.sub, border: `1px solid ${view === "history" ? C.accent : C.border}`, borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 700 }}
        >
          🔒 Signal History ({lockedHistory.length})
        </button>
      </div>

      {view === "live" && (
        <>
          <MarketTabs tab={tab} onChange={setTab} />
          <FilterBar filter={filter} onChange={setFilter} />

          <div style={{ padding: "0 16px 80px" }}>
            {scanning && (
              <div style={{ textAlign: "center", padding: 50, color: C.sub }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
                <div style={{ fontSize: 14 }}>Running signal engine…</div>
                <div style={{ fontSize: 11, marginTop: 6, color: C.muted }}>Multi-step analysis · {tf} + HTF · Deriv WebSocket</div>
              </div>
            )}
            {!scanning && visibleCards.length === 0 && (
              <div style={{ textAlign: "center", padding: 50, color: C.sub }}>No signals match this filter</div>
            )}
            {!scanning && visibleCards.map(item => (
              <SignalCard key={item.symbol} item={item} />
            ))}
          </div>
        </>
      )}

      {view === "history" && (
        <div style={{ padding: "16px 16px 80px" }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.5, background: C.card, borderRadius: 8, padding: 10 }}>
            🔒 Each entry below is frozen at the moment it fired, on a fully-closed
            candle. Re-scanning never edits or removes what's shown here — this is
            what the engine actually called, not what it currently says.
          </div>
          <SignalHistory history={lockedHistory} />
        </div>
      )}

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.surface, borderTop: `1px solid ${C.border}`, padding: "8px 16px", textAlign: "center", fontSize: 10, color: C.muted }}>
        Educational only · Trading involves risk · Use proper risk management
      </div>
    </div>
  );
}
