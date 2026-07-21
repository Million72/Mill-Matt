import { useState, useCallback, useRef } from "react";
import { processSignal }                 from "../engine/signalManager.js";
import { FOREX, SYNTHETICS }             from "../constants/markets.js";
import { BATCH_SIZE, BATCH_DELAY_MS, REFRESH_SECONDS } from "../constants/timeframes.js";
import { delay }                         from "../utils/helpers.js";
import { getSMTPartner }                 from "../shared/smartMoney/smt.js";

// Anti-repainting: once a BUY/SELL signal fires on a specific closed candle,
// it is recorded here permanently, keyed by symbol+timeframe+candle time.
// A later scan re-analyzing the (now different, since more candles have
// closed) data can produce a NEW signal, but it can never silently erase or
// alter what was actually shown for that earlier candle. The dashboard can
// therefore always distinguish "what the engine says right now" from
// "what it actually called, historically" — those are no longer the same
// mutable object.
function historyKey(symbol, tf, candleTime) {
  return `${symbol}|${tf}|${candleTime}`;
}

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
  const lockedHistory = useRef({}); // historyKey -> frozen signal, never mutated once written

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

          // SMT Divergence needs a second, correlated instrument's candles.
          // Only EURUSD/GBPUSD currently have a defined partner (see
          // shared/smartMoney/smt.js) — every other market simply gets
          // partnerCandles = null and entry models 3/4 don't apply to it.
          // We reuse fetchMarket for the partner too, so it benefits from
          // the exact same caching/anti-repainting fetch path — no
          // separate, inconsistent data source for this one lookup.
          let partnerCandles = null;
          const partnerSymbol = getSMTPartner(market.symbol);
          if (partnerSymbol) {
            const partnerMarket = FOREX.find(f => f.symbol === partnerSymbol);
            if (partnerMarket) {
              const partnerData = await fetchMarket(partnerMarket, tfRef.current);
              if (partnerData) partnerCandles = partnerData.candles;
            }
          }

          const sig = processSignal(market, data.candles, data.htfCandles, data.htf2Candles, data.livePrice, partnerCandles);

          // The last candle in `data.candles` is now guaranteed CLOSED
          // (deriv.js strips the forming one) — so it's a stable, fixed
          // point in time we can safely key a lock on.
          const lastCandle = data.candles[data.candles.length - 1];
          const candleTime = lastCandle ? lastCandle.time : null;

          if (sig.signal === "BUY" || sig.signal === "SELL") {
            const key = historyKey(market.symbol, tfRef.current, candleTime);
            if (!lockedHistory.current[key]) {
              // First time this exact closed candle produced this signal —
              // lock it in. All fields are frozen at this moment; nothing
              // later can rewrite what was shown here.
              lockedHistory.current[key] = { ...sig, timeframe: tfRef.current, lockedAt: new Date(), candleTime };
            }
          }

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

  // Returns the locked, immutable signal history — safe to display as "what
  // actually fired," independent of whatever the live re-scan currently shows.
  const getLockedHistory = useCallback(() => {
    return Object.values(lockedHistory.current).sort((a, b) => b.candleTime - a.candleTime);
  }, []);

  return { signals, scanning, lastScan, countdown, setCountdown, countRef, stats, errCount, liveCount, scanAll, tfRef, getLockedHistory };
                }
