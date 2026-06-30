import { useState, useCallback, useRef } from "react";
import { processSignal }                 from "../engine/signalManager.js";
import { FOREX, SYNTHETICS }             from "../constants/markets.js";
import { BATCH_SIZE, BATCH_DELAY_MS, REFRESH_SECONDS } from "../constants/timeframes.js";
import { delay }                         from "../utils/helpers.js";

export function useSignalEngine() {
  const [signals,   setSignals]   = useState({});
  const [scanning,  setScanning]  = useState(false);
  const [lastScan,  setLastScan]  = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_SECONDS);
  const [stats,     setStats]     = useState({ total: 0, buys: 0, sells: 0, waits: 0 });
  const [errCount,  setErrCount]  = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const countRef    = useRef(REFRESH_SECONDS);
  const tfRef       = useRef("1h");
  const prevSignals = useRef({});

  const scanAll = useCallback(async (tf, fetchMarket) => {
    tfRef.current    = tf || tfRef.current;
    setScanning(true);
    countRef.current = REFRESH_SECONDS;
    setCountdown(REFRESH_SECONDS);

    const all     = [...FOREX, ...SYNTHETICS];
    const results = {};
    let live = 0, errs = 0;

    for (let i = 0; i < all.length; i += BATCH_SIZE) {
      const batch = all.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map(async (market) => {
        try {
          const data = await fetchMarket(market, tfRef.current);
          if (!data) { results[market.symbol] = { symbol: market.symbol, error: "Fetch failed" }; errs++; return; }
          const sig = processSignal(market, data.candles, data.htfCandles, data.livePrice);
          results[market.symbol] = sig;
          live++;
        } catch (e) {
          results[market.symbol] = { symbol: market.symbol, error: e.message };
          errs++;
        }
      }));
      if (i + BATCH_SIZE < all.length) await delay(BATCH_DELAY_MS);
    }

    prevSignals.current = { ...signals };
    setSignals(results);
    setLiveCount(live);
    setErrCount(errs);
    const valid = Object.values(results).filter(s => !s.error);
    setStats({ total: valid.length, buys: valid.filter(s => s.signal === "BUY").length, sells: valid.filter(s => s.signal === "SELL").length, waits: valid.filter(s => s.signal === "WAIT").length });
    setLastScan(new Date());
    setScanning(false);
  }, [signals]);

  return { signals, scanning, lastScan, countdown, setCountdown, countRef, stats, errCount, liveCount, scanAll, tfRef };
}
