import { useEffect } from "react";

/**
 * Pings the /api/visit function exactly once per browser session so you get a
 * near-realtime "someone from <city> just viewed your site" notification. The
 * geo/IP work happens server-side from Vercel's request headers — this is just
 * a fire-and-forget beacon, so it never blocks rendering and fails silently.
 */
export default function VisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("visit-logged")) return;
      sessionStorage.setItem("visit-logged", "1");
    } catch {
      /* private mode — just skip the dedup */
    }

    const payload = JSON.stringify({
      path: location.pathname + location.search,
      referrer: document.referrer || "direct",
    });

    // Prefer sendBeacon (survives tab close); fall back to fetch.
    const sent =
      "sendBeacon" in navigator &&
      navigator.sendBeacon("/api/visit", new Blob([payload], { type: "application/json" }));

    if (!sent) {
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  return null;
}
