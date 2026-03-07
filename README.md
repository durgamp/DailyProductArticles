# Daily Gmail Newsletter Summarizer (Claude API + Web Portal)

This automation checks your Gmail for emails from selected sender IDs, summarizes them with the Claude API (Anthropic), sends one combined daily digest email, and publishes a structured digest to a Vercel web portal.

## What it does

- Logs into Gmail via **App Password** (IMAP + SMTP).
- Monitors multiple sender email IDs.
- At a fixed interval (default every `4` hours in `Asia/Kolkata`), it:
  - Fetches emails from the most recent interval window.
  - Summarizes each sender's emails via **Claude API** (`claude-opus-4-6`), extracting key points, action items, dates/deadlines, and topic categories.
  - Sends a single digest email with separate sender sections.
  - Publishes structured digest JSON to a **Vercel web portal** (optional).
- Tracks processed message IDs and last run timestamp in `processed_state.json`.
- Can also run as a **GitHub Actions** scheduled job (daily at 07:00 AM IST).

## Project files

- `main.py` - scheduler/service loop and run modes
- `config.py` - `.env` loading + validation
- `email_watcher.py` - Gmail IMAP fetch + body extraction
- `summarizer.py` - Claude API summarization + digest assembly
- `sender.py` - Gmail SMTP send
- `state_store.py` - local state persistence
- `portal_publisher.py` - POSTs structured digest to the Vercel web portal
- `portal/` - Next.js web portal (Vercel + Upstash Redis)

## Setup

1. Create virtual environment and install dependencies:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

2. Copy env template and fill values:

```bash
copy .env.example .env
```

3. Update `.env` with your values:

- `GMAIL_ADDRESS`
- `GMAIL_APP_PASSWORD`
- `SOURCE_SENDER_EMAILS` (comma/semicolon/newline separated)
- `SUMMARY_TO_EMAIL`
- `ANTHROPIC_API_KEY` — get from [console.anthropic.com](https://console.anthropic.com)

Optional:

- `POLL_SECONDS` (default `60`)
- `DIGEST_INTERVAL_HOURS` (default `4`)
- `TIMEZONE` (default `Asia/Kolkata`)
- `STATE_FILE` (default `processed_state.json`)
- `PORTAL_API_URL` — base URL of your deployed Vercel portal (e.g. `https://your-portal.vercel.app`)
- `PORTAL_API_SECRET` — shared secret to authenticate with the portal's `/api/publish` endpoint

## Usage

### A) Run continuously (recommended)

```bash
python main.py
```

Service checks every `POLL_SECONDS`, and sends one digest every `DIGEST_INTERVAL_HOURS`.

### B) Run once now and send digest

```bash
python main.py --run-once
```

### C) Dry-run (no email sent; prints digest)

```bash
python main.py --dry-run
```

### D) GitHub Actions (scheduled)

The workflow in `.github/workflows/daily-digest.yml` runs `python main.py --run-once` every day at **07:00 AM IST** (01:30 UTC). It can also be triggered manually from the GitHub UI.

Required GitHub secrets: `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD`, `SOURCE_SENDER_EMAILS`, `SUMMARY_TO_EMAIL`, `ANTHROPIC_API_KEY`, and optionally `PORTAL_API_URL`, `PORTAL_API_SECRET`.

## Web portal (optional)

The `portal/` directory contains a Next.js app that displays digests in a browser.

- Backed by **Upstash Redis** for storage.
- Deploy to Vercel; set the following environment variables in Vercel (see `portal/.env.example`):
  - `PORTAL_API_SECRET` — shared secret matching the Python script
  - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (direct Upstash), **or**
  - `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Vercel KV integration) — both are supported
- The Python script POSTs structured digest JSON to `PORTAL_API_URL/api/publish` after each digest run.
- Digest pages are available at `/digest/YYYY-MM-DD`.

## Important notes

- Use **Gmail App Password**, not your normal account password.
- Keep `.env` private; do not commit it.
- The Claude API (`ANTHROPIC_API_KEY`) is required — Ollama is no longer used.
