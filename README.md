# Neptune Print Farm

A read-only, mobile-friendly dashboard for monitoring ELEGOO Neptune 4 Max printers through Moonraker.

**Status:** MVP / local network monitoring. Tested on live Neptune 4 Max farm.

## Local vs Remote Live Architecture

This dashboard is designed to work seamlessly both on the farm's local Wi-Fi and remotely:

### 1. Local Network Mode (Automatic LAN IP Discovery)
- When opened on the same office/farm Wi-Fi (e.g. `http://localhost:5173`, `http://localhost:3080`, or `http://<Farm-PC-IP>:3080`):
  - The dashboard automatically detects **LAN Mode**.
  - Clicking **"Open Printer Web UI"** immediately opens the printer's direct local IP (`http://172.16.20.xxx`) in your browser to access Fluidd/Klipper.

### 2. Remote Live Mode (System Bridge & Relay)
- When opened from outside the office (e.g. mobile data, home PC, or public URL):
  - The dashboard automatically switches to **Remote Relay Mode**.
  - All 5 printers' live statuses, remaining time, finish time, layers, completed quantities, and failure logs are **streamed live through this local host system**, which continuously polls the local printers.
  - Built-in Moonraker Proxy endpoint: `/api/printers/:id/proxy/*` forwards commands and file metadata through the host server without exposing the printer IPs to the open internet.

### Quick Commands:
- **Local Dev Server:** `npm run dev` (Frontend: `http://localhost:5173`, Backend: `http://localhost:3080`)
- **Single Production Server:** `npm start` (Runs on port `3080` serving the built UI and API)
- **Make Live Remotely (Free Public Link):** `npm run live` (Starts server and creates a secure public tunnel URL)

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
5. Log in, then open Settings and enter the printers' real local IPs and Moonraker ports (for Neptune 4 Max, use port 80).
6. For a single server: `npm run build && npm start`, open `http://localhost:3080`.

Optional Telegram alerts: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

For remote access use **Tailscale** or another secure private network between your phone and the always-on office computer. Do **not** expose ports 3080/80 directly to the public internet.

## Implemented

- Add, rename, enable/disable or remove printers
- Read-only Moonraker status: job, progress, print state, nozzle/bed temperatures and filament sensors
- Real-time layer and physical Z-height tracking
- Real-time print timing: Finish Time (ETA), Elapsed, Total Time, and Remaining Time
- Production & Completed Prints tracking: quantity completed per G-code file
- Failed & Cancelled print tracking with failure timestamps and wasted time
- Date & day-wise production breakdown with filter by Today, Yesterday, Last 7 Days, or Custom Date
- History of observed state changes and Telegram alerts
- Responsive dark dashboard and single-admin login

## Limitations

- HTTP polling, not Moonraker WebSocket subscription
- No spool weight measurement, camera integration, web push or cloud relay
- If no filament sensor is exposed, runout is shown as unknown
- Alerts depend on office monitoring PC, power and network being online
- Local events are file-based; not a production multi-user service

Never commit credentials, real internal network details, or `.env`.
