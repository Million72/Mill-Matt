import { useState, useCallback } from "react";
import { fetchCandles }          from "../services/deriv.js";
import { TIMEFRAMES }            from "../constants/timeframes.js";

export function useMarketData() {
  const [loading, setLoading]   = useState({});
  const [errors,  setErrors]    = useState({});

  const fetchMarket = useCallback(async (market, tf) => {
    const cfg = TIMEFRAMES[tf];
    setLoading(p => ({ ...p, [market.symbol]: true }));
    try {
      const [primary, htf] = await Promise.all([
        fetchCandles(market.deriv, cfg.granularity, cfg.candles),
        fetchCandles(market.deriv, cfg.htfGran, 100),
      ]);
      setErrors(p => ({ ...p, [market.symbol]: null }));
      return { candles: primary.candles, livePrice: primary.livePrice, htfCandles: htf.candles };
    } catch (e) {
      setErrors(p => ({ ...p, [market.symbol]: e.message }));
      return null;
    } finally {
      setLoading(p => ({ ...p, [market.symbol]: false }));
    }
  }, []);

  return { fetchMarket, loading, errors };
}
