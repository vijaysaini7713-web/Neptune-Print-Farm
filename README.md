# Neptune Print Farm

A read-only, mobile-friendly dashboard for monitoring ELEGOO Neptune 4 Max printers through Moonraker.

**Status:** MVP / local network monitoring. Real printer testing is required. This is not a cloud SaaS deployment.

## Quick start

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`; set a strong `ADMIN_PASSWORD` and unique 32+ character `JWT_SECRET`.
4. Run `npm run dev`, visit `http://localhost:5173`.
5. Log in, then open Settings and enter the printers' real local IPs and Moonraker ports (typically 7125).
6. For a single server: `npm run build && npm start`, open `http://localhost:3080`.

Optional Telegram alerts: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

For remote access use **Tailscale** or another secure private network between your phone and the always-on office computer. Do **not** expose ports 3080/7125 directly to the public internet.

## Implemented

- Add, rename, enable/disable or remove printers
- Read-only Moonraker status: job, progress, print state, nozzle/bed temperatures and filament sensors where present
- History of observed state changes and Telegram alerts
- Responsive dark dashboard and single-admin login
- Five disabled placeholder printers (edit IPs in Settings)

## Limitations

- HTTP polling, not Moonraker WebSocket subscription
- No historical-job import, spool weight measurement, camera integration, web push or cloud relay
- If no filament sensor is exposed, runout is shown as unknown
- Completion/paused statuses are only those returned by Moonraker
- Alerts depend on office monitoring PC, power and network being online
- Local events are file-based; not a production multi-user service
- This project has **not** been tested on the user's actual printers

Never commit credentials, real internal network details, or `.env`.
