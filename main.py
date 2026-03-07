from __future__ import annotations

import argparse
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List
from zoneinfo import ZoneInfo

from config import load_config
from email_watcher import EmailItem, fetch_emails_for_date
from portal_publisher import publish_to_portal
from sender import send_digest_email
from state_store import add_processed_ids, get_processed_ids, load_state, save_state
from summarizer import build_digest


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("newsletter-automation")


def _parse_last_run_at(last_run_at_raw: str, local_tz: ZoneInfo) -> datetime | None:
    if not last_run_at_raw:
        return None
    try:
        parsed = datetime.fromisoformat(last_run_at_raw)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=local_tz)
    else:
        parsed = parsed.astimezone(local_tz)
    return parsed


def _is_digest_due(
    now_local: datetime,
    digest_interval_hours: int,
    last_run_at_raw: str,
    local_tz: ZoneInfo,
) -> bool:
    last_run_at = _parse_last_run_at(last_run_at_raw, local_tz)
    if last_run_at is None:
        return True
    return now_local >= (last_run_at + timedelta(hours=digest_interval_hours))


def _window_start(
    now_local: datetime,
    digest_interval_hours: int,
    last_run_at_raw: str,
    local_tz: ZoneInfo,
) -> datetime:
    last_run_at = _parse_last_run_at(last_run_at_raw, local_tz)
    if last_run_at is None:
        return now_local - timedelta(hours=digest_interval_hours)
    return last_run_at


def _fetch_grouped_for_window(
    *,
    target_dates: List,
    now_local: datetime,
    window_start: datetime,
    config,
    local_tz,
    processed_ids,
) -> Dict[str, List[EmailItem]]:
    grouped: Dict[str, List[EmailItem]] = {s: [] for s in config.source_sender_emails}
    for target_date in target_dates:
        by_date = fetch_emails_for_date(
            config=config,
            target_date=target_date,
            local_tz=local_tz,
            processed_ids=processed_ids,
        )
        for sender, items in by_date.items():
            grouped[sender].extend(
                item for item in items if window_start <= item.sent_at <= now_local
            )

    for sender in grouped:
        grouped[sender].sort(key=lambda x: x.sent_at)
    return grouped


def run_digest_once() -> None:
    config = load_config()
    local_tz = ZoneInfo(config.timezone)
    now_local = datetime.now(local_tz)

    state = load_state(config.state_file)
    processed_ids = get_processed_ids(state)
    window_start = _window_start(
        now_local,
        config.digest_interval_hours,
        state.get("last_digest_run_at", ""),
        local_tz,
    )

    target_dates = sorted({window_start.date(), now_local.date()})
    logger.info(
        "Fetching emails from %s to %s across %d sender(s)",
        window_start.isoformat(),
        now_local.isoformat(),
        len(config.source_sender_emails),
    )
    grouped = _fetch_grouped_for_window(
        config=config,
        local_tz=local_tz,
        target_dates=target_dates,
        now_local=now_local,
        window_start=window_start,
        processed_ids=processed_ids,
    )

    result = build_digest(
        grouped_emails=grouped,
        target_date=now_local.date(),
        config=config,
    )

    send_digest_email(config, result.markdown, now_local.date())
    logger.info("Digest email sent to %s", config.summary_to_email)

    publish_to_portal(config, result.structured)

    new_ids = {item.message_id for items in grouped.values() for item in items}
    add_processed_ids(state, new_ids)
    state["last_digest_run_at"] = now_local.isoformat()
    state["last_digest_run_date"] = now_local.date().isoformat()
    save_state(config.state_file, state)
    logger.info("State updated (%d new processed IDs)", len(new_ids))


def run_service() -> None:
    config = load_config()
    local_tz = ZoneInfo(config.timezone)
    logger.info(
        "Service started. Checking every %s seconds; digest every %s hour(s) in %s",
        config.poll_seconds,
        config.digest_interval_hours,
        config.timezone,
    )

    while True:
        try:
            now_local = datetime.now(local_tz)
            state = load_state(config.state_file)
            if _is_digest_due(
                now_local,
                config.digest_interval_hours,
                state.get("last_digest_run_at", ""),
                local_tz,
            ):
                logger.info("Digest window reached. Running daily digest...")
                run_digest_once()
            else:
                logger.debug("Digest not due yet.")
        except Exception as exc:
            logger.exception("Service loop error: %s", exc)

        time.sleep(config.poll_seconds)


def run_digest_once_dry() -> None:
    config = load_config()
    local_tz = ZoneInfo(config.timezone)
    now_local = datetime.now(local_tz)
    state = load_state(config.state_file)
    processed_ids = get_processed_ids(state)
    window_start = _window_start(
        now_local,
        config.digest_interval_hours,
        state.get("last_digest_run_at", ""),
        local_tz,
    )

    target_dates = sorted({window_start.date(), now_local.date()})
    grouped = _fetch_grouped_for_window(
        config=config,
        local_tz=local_tz,
        target_dates=target_dates,
        now_local=now_local,
        window_start=window_start,
        processed_ids=processed_ids,
    )
    result = build_digest(
        grouped_emails=grouped,
        target_date=now_local.date(),
        config=config,
    )
    print(result.markdown)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Daily newsletter summarization service")
    parser.add_argument(
        "--run-once",
        action="store_true",
        help="Run digest once immediately for the configured interval and send email.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run once for the configured interval and print digest without sending email.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.dry_run:
        run_digest_once_dry()
    elif args.run_once:
        run_digest_once()
    else:
        run_service()
