from __future__ import annotations

import imaplib
import logging
import re
from dataclasses import dataclass
from datetime import date, datetime, timezone
from email import message_from_bytes
from email.header import decode_header
from email.message import Message
from email.policy import default
from email.utils import parseaddr, parsedate_to_datetime
from typing import Dict, List, Set

from bs4 import BeautifulSoup

from config import AppConfig


logger = logging.getLogger(__name__)


@dataclass
class EmailItem:
    message_id: str
    from_email: str
    subject: str
    sent_at: datetime
    body: str


def _decode_mime_header(value: str | None) -> str:
    if not value:
        return "(No Subject)"

    parts = decode_header(value)
    decoded: List[str] = []
    for text, encoding in parts:
        if isinstance(text, bytes):
            decoded.append(text.decode(encoding or "utf-8", errors="replace"))
        else:
            decoded.append(text)
    return "".join(decoded).strip() or "(No Subject)"


def _extract_body(msg: Message) -> str:
    plain_parts: List[str] = []
    html_parts: List[str] = []

    if msg.is_multipart():
        for part in msg.walk():
            content_disposition = part.get("Content-Disposition", "")
            if "attachment" in content_disposition.lower():
                continue

            content_type = part.get_content_type()
            payload = part.get_payload(decode=True)
            if payload is None:
                continue

            charset = part.get_content_charset() or "utf-8"
            content = payload.decode(charset, errors="replace")

            if content_type == "text/plain":
                plain_parts.append(content)
            elif content_type == "text/html":
                html_parts.append(content)
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            content = payload.decode(charset, errors="replace")
            if msg.get_content_type() == "text/html":
                html_parts.append(content)
            else:
                plain_parts.append(content)

    if plain_parts:
        text = "\n".join(plain_parts)
    elif html_parts:
        soup = BeautifulSoup("\n".join(html_parts), "html.parser")
        text = soup.get_text("\n", strip=True)
    else:
        text = ""

    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _message_id(msg: Message, fallback: str) -> str:
    raw = (msg.get("Message-ID") or "").strip()
    if raw:
        return raw
    return fallback


def _safe_msg_datetime(msg: Message, local_tz) -> datetime:
    raw_date = msg.get("Date")
    parsed = None
    if raw_date:
        try:
            parsed = parsedate_to_datetime(raw_date)
        except (TypeError, ValueError):
            parsed = None

    if parsed is None:
        parsed = datetime.now(timezone.utc)
    elif parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(local_tz)


def fetch_emails_for_date(
    config: AppConfig,
    target_date: date,
    local_tz,
    processed_ids: Set[str],
) -> Dict[str, List[EmailItem]]:
    """
    Fetch emails from configured senders for a specific local date.
    Returns a dict keyed by sender email.
    """
    since_str = target_date.strftime("%d-%b-%Y")
    result: Dict[str, List[EmailItem]] = {s: [] for s in config.source_sender_emails}

    mail = imaplib.IMAP4_SSL("imap.gmail.com", 993)
    try:
        mail.login(config.gmail_address, config.gmail_app_password)
        mail.select("INBOX")

        for sender in config.source_sender_emails:
            criterion = f'(FROM "{sender}" SINCE "{since_str}")'
            status, data = mail.search(None, criterion)
            if status != "OK":
                logger.warning("IMAP search failed for sender %s", sender)
                continue

            msg_nums = data[0].split() if data and data[0] else []
            for msg_num in msg_nums:
                status, payload = mail.fetch(msg_num, "(RFC822)")
                if status != "OK" or not payload:
                    continue

                raw_bytes = None
                for part in payload:
                    if isinstance(part, tuple) and len(part) >= 2:
                        raw_bytes = part[1]
                        break
                if not raw_bytes:
                    continue

                msg = message_from_bytes(raw_bytes, policy=default)
                fallback_id = f"{sender}:{msg_num.decode(errors='ignore')}"
                msg_id = _message_id(msg, fallback_id)
                if msg_id in processed_ids:
                    continue

                from_email = parseaddr(msg.get("From", ""))[1].lower()

                sent_at = _safe_msg_datetime(msg, local_tz)
                if sent_at.date() != target_date:
                    continue

                item = EmailItem(
                    message_id=msg_id,
                    from_email=from_email or sender,
                    subject=_decode_mime_header(msg.get("Subject")),
                    sent_at=sent_at,
                    body=_extract_body(msg),
                )
                result[sender].append(item)

        for sender in result:
            result[sender].sort(key=lambda x: x.sent_at)

        return result
    finally:
        try:
            mail.close()
        except Exception:
            pass
        mail.logout()
