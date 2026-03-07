from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import List, Optional

from dotenv import load_dotenv


@dataclass
class AppConfig:
    gmail_address: str
    gmail_app_password: str
    source_sender_emails: List[str]
    summary_to_email: str
    poll_seconds: int
    digest_interval_hours: int
    timezone: str
    anthropic_api_key: str
    state_file: str
    portal_api_url: Optional[str] = field(default=None)
    portal_api_secret: Optional[str] = field(default=None)


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def _parse_senders(raw: str) -> List[str]:
    # supports comma, semicolon, or newline separated values
    parts = re.split(r"[,;\n]+", raw)
    senders = [p.strip().lower() for p in parts if p.strip()]
    if not senders:
        raise ValueError("At least one sender email is required.")
    return sorted(set(senders))


def _validate_positive_int(name: str, value: str, default: int) -> int:
    raw = (value or "").strip()
    if not raw:
        return default
    try:
        parsed = int(raw)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer.") from exc
    if parsed <= 0:
        raise ValueError(f"{name} must be greater than 0.")
    return parsed


def load_config() -> AppConfig:
    load_dotenv()

    gmail_address = _require_env("GMAIL_ADDRESS")
    gmail_app_password = _require_env("GMAIL_APP_PASSWORD")

    sender_raw = os.getenv("SOURCE_SENDER_EMAILS", "").strip() or os.getenv(
        "SOURCE_SENDER_EMAIL", ""
    ).strip()
    if not sender_raw:
        raise ValueError(
            "Missing SOURCE_SENDER_EMAILS (or SOURCE_SENDER_EMAIL) in environment."
        )
    source_sender_emails = _parse_senders(sender_raw)

    summary_to_email = os.getenv("SUMMARY_TO_EMAIL", gmail_address).strip() or gmail_address

    poll_seconds = _validate_positive_int("POLL_SECONDS", os.getenv("POLL_SECONDS", "60"), 60)
    digest_interval_hours = _validate_positive_int(
        "DIGEST_INTERVAL_HOURS", os.getenv("DIGEST_INTERVAL_HOURS", "4"), 4
    )
    timezone = os.getenv("TIMEZONE", "Asia/Kolkata").strip() or "Asia/Kolkata"

    anthropic_api_key = _require_env("ANTHROPIC_API_KEY")

    state_file = os.getenv("STATE_FILE", "processed_state.json").strip() or "processed_state.json"

    portal_api_url = os.getenv("PORTAL_API_URL", "").strip() or None
    portal_api_secret = os.getenv("PORTAL_API_SECRET", "").strip() or None

    return AppConfig(
        gmail_address=gmail_address,
        gmail_app_password=gmail_app_password,
        source_sender_emails=source_sender_emails,
        summary_to_email=summary_to_email,
        poll_seconds=poll_seconds,
        digest_interval_hours=digest_interval_hours,
        timezone=timezone,
        anthropic_api_key=anthropic_api_key,
        state_file=state_file,
        portal_api_url=portal_api_url,
        portal_api_secret=portal_api_secret,
    )
