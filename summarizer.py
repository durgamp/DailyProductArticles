from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from typing import Any, Dict, List

import anthropic
from pydantic import BaseModel

from config import AppConfig
from email_watcher import EmailItem


logger = logging.getLogger(__name__)


class SenderDigest(BaseModel):
    key_points: List[str]
    action_items: List[str]
    dates_deadlines: List[str]
    categories: List[str]


@dataclass
class DigestResult:
    markdown: str
    structured: Dict[str, Any]


def _truncate(text: str, limit: int = 6000) -> str:
    text = (text or "").strip()
    return text if len(text) <= limit else text[:limit] + "\n\n...[truncated]"


def _to_markdown(digest: SenderDigest) -> str:
    lines = ["### Key Points"]
    lines.extend(f"- {p}" for p in (digest.key_points or ["No key points extracted."]))
    lines.append("")
    lines.append("### Action Items")
    lines.extend(f"- {a}" for a in (digest.action_items or ["No explicit action items."]))
    lines.append("")
    lines.append("### Dates/Deadlines")
    lines.extend(f"- {d}" for d in (digest.dates_deadlines or ["No explicit dates/deadlines found."]))
    return "\n".join(lines)


def _fallback(emails: List[EmailItem]) -> SenderDigest:
    key_points = []
    for item in emails[:5]:
        snippet = " ".join(item.body.split())[:220] if item.body else "(no body)"
        key_points.append(f"{item.subject}: {snippet}")
    return SenderDigest(
        key_points=key_points,
        action_items=["Review full source emails manually (fallback mode)."],
        dates_deadlines=[],
        categories=["Uncategorized"],
    )


def summarize_sender_emails(config: AppConfig, sender: str, emails: List[EmailItem]) -> SenderDigest:
    if not emails:
        return SenderDigest(key_points=[], action_items=[], dates_deadlines=[], categories=[])

    rendered = "\n".join(
        f"Email {i}:\nSubject: {item.subject}\nSent At: {item.sent_at.isoformat()}\n"
        f"Body:\n{_truncate(item.body)}\n---"
        for i, item in enumerate(emails, start=1)
    )

    try:
        client = anthropic.Anthropic(api_key=config.anthropic_api_key)
        response = client.messages.parse(
            model="claude-opus-4-6",
            max_tokens=1024,
            system="You extract structured information from newsletter emails for a daily digest.",
            messages=[{
                "role": "user",
                "content": (
                    f"Extract structured information from these {len(emails)} newsletter email(s) from {sender}.\n\n"
                    f"Fields to extract:\n"
                    f"- key_points: 3-7 concise bullet points of the most important information\n"
                    f"- action_items: specific actions the reader should take (empty list if none)\n"
                    f"- dates_deadlines: any dates, deadlines, or time-sensitive info (empty list if none)\n"
                    f"- categories: 1-4 topic tags (e.g. 'AI', 'System Design', 'Finance', 'Productivity')\n\n"
                    f"Emails:\n{rendered}"
                ),
            }],
            output_format=SenderDigest,
        )
        return response.parsed_output
    except Exception as exc:
        logger.exception("Claude summarization failed for sender %s: %s", sender, exc)
        return _fallback(emails)


def build_digest(
    grouped_emails: Dict[str, List[EmailItem]],
    target_date: date,
    config: AppConfig,
) -> DigestResult:
    """Summarize all senders (one Claude call per sender) and return markdown + structured data."""
    summaries: Dict[str, tuple] = {}
    for sender in config.source_sender_emails:
        emails = grouped_emails.get(sender, [])
        summaries[sender] = (emails, summarize_sender_emails(config, sender, emails))

    # Build markdown
    intro = [
        f"# Daily Email Digest ({target_date.isoformat()})",
        "",
        "Model: `claude-opus-4-6` via Anthropic Claude API",
        "",
    ]
    sections: List[str] = []
    for sender, (emails, digest) in summaries.items():
        if not emails:
            sections.append(f"## {sender}\n\nNo emails found for this sender on this date.")
            continue
        sections.append(
            f"## {sender}\n\n"
            f"Emails processed: **{len(emails)}**\n\n"
            f"{_to_markdown(digest)}"
        )
    markdown = "\n\n".join(intro + sections).strip() + "\n"

    # Build structured data for portal
    articles = [
        {
            "sender": sender,
            "email_count": len(emails),
            "categories": digest.categories,
            "key_points": digest.key_points,
            "action_items": digest.action_items,
            "dates_deadlines": digest.dates_deadlines,
            "summary_markdown": "\n".join(
                ["### Key Points"] + [f"- {p}" for p in (digest.key_points or ["No key points extracted."])]
            ),
        }
        for sender, (emails, digest) in summaries.items()
        if emails
    ]
    structured = {
        "date": target_date.isoformat(),
        "articles": articles,
    }

    return DigestResult(markdown=markdown, structured=structured)
