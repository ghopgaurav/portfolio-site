/**
 * Lightweight "who viewed my site" logger — runs as a Vercel Serverless
 * Function (free Hobby tier). It reads the geo/IP data Vercel already attaches
 * to every request (no external IP-lookup API, no database) and forwards a
 * one-line summary to whichever channel you configure via env vars:
 *
 *   - Discord / Slack : set  VISIT_WEBHOOK_URL  to an incoming-webhook URL
 *   - Telegram        : set  TELEGRAM_BOT_TOKEN  and  TELEGRAM_CHAT_ID
 *
 * If none are set it just returns 200 (no-op), so the site still works.
 * The client pings this once per browser session (see VisitTracker.jsx).
 */

const BOT_RE = /bot|crawl|spider|slurp|bing|google|preview|lighthouse|headless|monitor|curl|wget|axios|python-requests/i;

function pick(req, key) {
  const v = req.headers[key];
  return (Array.isArray(v) ? v[0] : v) || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const ua = pick(req, "user-agent");
  // Ignore obvious bots/crawlers so the feed stays about real people.
  if (BOT_RE.test(ua)) return res.status(200).json({ ok: true, skipped: "bot" });

  const dec = (s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };

  const country = pick(req, "x-vercel-ip-country");
  const region = dec(pick(req, "x-vercel-ip-country-region"));
  const city = dec(pick(req, "x-vercel-ip-city"));
  const tz = pick(req, "x-vercel-ip-timezone");
  const ipRaw =
    pick(req, "x-real-ip") || pick(req, "x-forwarded-for").split(",")[0].trim();
  // Only keep a coarse /24-ish prefix — enough to tell repeat visitors apart
  // without storing someone's full address.
  const ipCoarse = ipRaw ? ipRaw.replace(/\.\d+$/, ".x").replace(/:[^:]+$/, ":x") : "unknown";

  const flag = country
    ? String.fromCodePoint(
        ...country
          .toUpperCase()
          .split("")
          .map((c) => 127397 + c.charCodeAt(0))
      )
    : "🌐";

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    body = {};
  }
  const path = (body.path || "/").toString().slice(0, 120);
  const ref = (body.referrer || "direct").toString().slice(0, 200);
  const place = [city, region, country].filter(Boolean).join(", ") || "Unknown location";
  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? "📱 mobile" : "🖥️ desktop";
  const when = new Date().toLocaleString("en-US", { timeZone: tz || "UTC", timeStyle: "short", dateStyle: "medium" });

  const line =
    `${flag} New visit — ${place}\n` +
    `• page: ${path}\n` +
    `• from: ${ref}\n` +
    `• ${device} · ${when}${tz ? ` (${tz})` : ""}\n` +
    `• net: ${ipCoarse}`;

  try {
    const hook = process.env.VISIT_WEBHOOK_URL;
    if (hook) {
      // content -> Discord, text -> Slack. Each ignores the key it doesn't use.
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: line, text: line }),
      });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;
    if (token && chat) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text: line, disable_web_page_preview: true }),
      });
    }
  } catch (err) {
    // Never let logging break the request path.
    return res.status(200).json({ ok: true, delivered: false });
  }

  return res.status(200).json({ ok: true });
}
