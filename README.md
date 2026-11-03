# Neptune Print Farm

A read-only, mobile-friendly dashboard for monitoring ELEGOO Neptune 4 Max printers through Moonraker.

**Status:** MVP / local network monitoring. Real printer testing is required. This is not a cloud SaaS deployment.

## Windows quick start (recommended)

1. Install [Node.js LTS](https://nodejs.org/).
2. Download the repository ZIP from GitHub and extract it.
3. Open PowerShell in the extracted folder and run:

   `powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1`

4. The script asks you to set a password on first use, generates a random login secret, installs dependencies and starts the local frontend/backend.
5. Open **http://localhost:5173** on the same computer, then log in.
6. Edit the five printer IPs in Settings (typically Moonraker port 7125), enable printers and save.

**Important:** GitHub hosts the code, not a running dashboard. A hosted website and remote mobile access still need separate deployment/VPN setup. If the page is blank, check the PowerShell console and browser Developer Tools console.

## Manual quick start

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
