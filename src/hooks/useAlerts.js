import { useEffect, useRef } from "react";
import { checkAlerts }       from "../shared/alerts.js";

export function useAlerts(signals) {
  const prevRef = useRef({});

  useEffect(() => {
    const alerts = checkAlerts(signals, prevRef.current);
    alerts.forEach(a => {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`${a.symbol} ${a.signal}`, {
          body: `${a.confidence}% confidence @ ${a.price}`,
          icon: "/icons/icon-192.png",
        });
      }
    });
    prevRef.current = signals;
  }, [signals]);
}
