import { useEffect, useRef } from "react";
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
import { useState } from "react";

export default function Dashboard() {
  const [tab,     setTab]     = useState("forex");
  const [tf,      setTf]      = useState("1h");
  const [filter,  setFilter]  = useState("ALL");
  const [history, setHistory] = useState([]);

  const { fetchMarket } = useMarketData();
  const {
    signals, scanning, lastScan, countdown, setCountdown,
    countRef, stats, errCount, liveCount, scanAll, tfRef,
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

  // Track signal history
  useEffect(() => {
    const newSigs = Object.values(signals).filter(s => s && !s.error && s.signal !== "WAIT");
    if (newSigs.length > 0) {
      setHistory(h => [...h, ...newSigs].slice(-50));
    }
  }, [signals]);

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

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: C.text, maxWidth: 480, margin: "0 auto" }}>
      <Header lastScan={lastScan} countdown={countdown} liveCount={liveCount} errCount={errCount} scanning={scanning} onScan={() => runScan()} />
      <TimeframeSelector tf={tf} onChange={handleTfChange} />
      <StatsBar stats={stats} />
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

      <SignalHistory history={history} />

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.surface, borderTop: `1px solid ${C.border}`, padding: "8px 16px", textAlign: "center", fontSize: 10, color: C.muted }}>
        Educational only · Trading involves risk · Use proper risk management
      </div>
    </div>
  );
    }
