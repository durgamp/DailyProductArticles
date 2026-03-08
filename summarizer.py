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


class ArticleSummary(BaseModel):
    title: str
    summary: str
    key_points: List[str]
    action_items: List[str]
    dates_deadlines: List[str]
    categories: List[str]


@dataclass
class DigestResult:
    markdown: str
    structured: Dict[str, Any]


def _truncate(text: str, limit: int = 8000) -> str:
    text = (text or "").strip()
    return text if len(text) <= limit else text[:limit] + "\n\n...[truncated]"


def _fallback(item: EmailItem) -> ArticleSummary:
    snippet = " ".join(item.body.split())[:300] if item.body else "(no body)"
    return ArticleSummary(
        title=item.subject[:80] if item.subject else "(No Subject)",
        summary=snippet,
        key_points=[snippet[:220]],
        action_items=[],
        dates_deadlines=[],
        categories=["Uncategorized"],
    )


def summarize_single_email(config: AppConfig, sender: str, item: EmailItem) -> ArticleSummary:
    try:
        client = anthropic.Anthropic(api_key=config.anthropic_api_key)
        response = client.messages.parse(
            model="claude-opus-4-6",
            max_tokens=1500,
            system=(
                "You are a newsletter editor creating a daily digest. "
                "Read the full email body thoroughly and produce detailed, specific summaries. "
                "Include concrete facts, numbers, names, and insights — not vague generalities."
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Summarize this newsletter email into a standalone article.\n\n"
                    f"Source: {sender}\n"
                    f"Subject: {item.subject}\n"
                    f"Sent: {item.sent_at.isoformat()}\n\n"
                    f"Full email body:\n{_truncate(item.body)}\n\n"
                    f"Return:\n"
                    f"- title: A crisp, specific headline (max 12 words, based on actual content)\n"
                    f"- summary: A detailed prose summary of 200-300 words. Cover the main story, "
                    f"key insights, data points, examples, and any recommendations. Write as a "
                    f"journalist — specific, informative, no filler.\n"
                    f"- key_points: 4-6 specific bullet points with concrete details (numbers, names, facts)\n"
                    f"- action_items: specific actions the reader should take (empty list if none)\n"
                    f"- dates_deadlines: any dates, deadlines, or time-sensitive info (empty list if none)\n"
                    f"- categories: 1-3 topic tags (e.g. 'AI', 'System Design', 'Finance', 'Productivity')"
                ),
            }],
            output_format=ArticleSummary,
        )
        return response.parsed_output
    except Exception as exc:
        logger.exception("Claude summarization failed for %s / %s: %s", sender, item.subject, exc)
        return _fallback(item)


def build_digest(
    grouped_emails: Dict[str, List[EmailItem]],
    target_date: date,
    config: AppConfig,
) -> DigestResult:
    """Summarize each email individually (one Claude call per email) and return markdown + structured data."""
    articles_data: List[tuple] = []
    for sender in config.source_sender_emails:
        for item in grouped_emails.get(sender, []):
            art = summarize_single_email(config, sender, item)
            articles_data.append((sender, item, art))

    # Build markdown
    intro = [
        f"# Daily Email Digest ({target_date.isoformat()})",
        "",
        "Model: `claude-opus-4-6` via Anthropic Claude API",
        "",
    ]
    sections: List[str] = []
    for sender, item, art in articles_data:
        kp = "\n".join(f"- {p}" for p in art.key_points)
        ai_block = ("\n### Action Items\n" + "\n".join(f"- {a}" for a in art.action_items)) if art.action_items else ""
        dd_block = ("\n### Dates & Deadlines\n" + "\n".join(f"- {d}" for d in art.dates_deadlines)) if art.dates_deadlines else ""
        sections.append(
            f"## {art.title}\n"
            f"*{sender}*\n\n"
            f"{art.summary}\n\n"
            f"### Key Points\n{kp}{ai_block}{dd_block}"
        )

    if not articles_data:
        sections.append("*No emails found in this digest window.*")

    markdown = "\n\n---\n\n".join(intro + sections).strip() + "\n"

    # Build structured data for portal
    structured_articles = [
        {
            "sender": sender,
            "subject": item.subject,
            "title": art.title,
            "summary": art.summary,
            "email_count": 1,
            "categories": art.categories,
            "key_points": art.key_points,
            "action_items": art.action_items,
            "dates_deadlines": art.dates_deadlines,
            "summary_markdown": art.summary,
        }
        for sender, item, art in articles_data
    ]
    structured = {
        "date": target_date.isoformat(),
        "articles": structured_articles,
    }

    return DigestResult(markdown=markdown, structured=structured)
