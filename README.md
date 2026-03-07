# Daily Gmail Newsletter Summarizer (Ollama)

This automation checks your Gmail for emails from selected sender IDs, summarizes them with a local Ollama model, and sends one combined daily digest email.

## What it does

- Logs into Gmail via **App Password** (IMAP + SMTP).
- Monitors multiple sender email IDs.
- At a fixed interval (default every `4` hours in `Asia/Kolkata`), it:
  - Fetches emails from the most recent interval window.
  - Summarizes each sender’s emails via Ollama.
  - Sends a single digest email with separate sender sections.
- Tracks processed message IDs and last run timestamp in `processed_state.json`.

## Project files

- `main.py` - scheduler/service loop and run modes
- `config.py` - `.env` loading + validation
- `email_watcher.py` - Gmail IMAP fetch + body extraction
- `summarizer.py` - Ollama summarization + digest assembly
- `sender.py` - Gmail SMTP send
- `state_store.py` - local state persistence

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
- `OLLAMA_MODEL` (example: `gemma3:4b`)

Optional:

- `POLL_SECONDS` (default `60`)
- `DIGEST_INTERVAL_HOURS` (default `4`)
- `TIMEZONE` (default `Asia/Kolkata`)
- `OLLAMA_BASE_URL` (default `http://localhost:11434`)
- `STATE_FILE` (default `processed_state.json`)

4. Ensure Ollama is running and model is available:

```bash
ollama list
```

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

## Important notes

- Use **Gmail App Password**, not your normal account password.
- Because credentials were shared in chat, regenerate/revoke app password after testing.
- Keep `.env` private; do not commit it.
