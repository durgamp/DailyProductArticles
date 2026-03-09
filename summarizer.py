from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from typing import Any, Dict, List

import anthropic
from pydantic import BaseModel

from config import AppConfig
from content_fetcher import fetch_linked_content
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


def _build_content_block(item: EmailItem) -> str:
    """Assemble email body + fetched linked article text into one content block."""
    parts: List[str] = []

    # 1. Full email body (up to 10 000 chars)
    body = _truncate(item.body, 10000)
    if body:
        parts.append(f"=== EMAIL BODY ===\n{body}")

    # 2. Fetch and append full text from linked articles
    if item.link_urls:
        logger.info("Fetching linked content for '%s' (%d links)", item.subject, len(item.link_urls))
        linked = fetch_linked_content(item.link_urls, max_articles=5)
        for url, text in linked:
            if text:
                parts.append(f"=== LINKED ARTICLE: {url} ===\n{_truncate(text, 5000)}")
        if linked:
            logger.info("Fetched %d linked article(s) for '%s'", len(linked), item.subject)

    return "\n\n".join(parts)


def summarize_single_email(config: AppConfig, sender: str, item: EmailItem) -> ArticleSummary:
    try:
        content_block = _build_content_block(item)
        if not content_block.strip():
            return _fallback(item)

        client = anthropic.Anthropic(api_key=config.anthropic_api_key)
        response = client.messages.parse(
            model="claude-opus-4-6",
            max_tokens=2000,
            system=(
                "You are a senior newsletter editor producing a daily digest. "
                "You are given the full email body AND the full text of every article "
                "linked inside that email. Read ALL provided content exhaustively before writing. "
                "Your summaries must be deeply informed — cite specific facts, numbers, names, "
                "examples, and insights from the actual content. Never be vague or superficial."
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Source newsletter: {sender}\n"
                    f"Subject: {item.subject}\n"
                    f"Sent: {item.sent_at.isoformat()}\n\n"
                    f"FULL CONTENT (email body + all linked articles):\n\n"
                    f"{content_block}\n\n"
                    f"---\n"
                    f"Now produce a richly detailed article summary covering ALL content above.\n\n"
                    f"Return:\n"
                    f"- title: A sharp, specific headline (max 12 words)\n"
                    f"- summary: 250-350 word prose summary. Cover every major point, insight, "
                    f"data point, example, and recommendation found across the email AND linked "
                    f"articles. Write like a journalist — concrete, specific, no filler. "
                    f"Integrate content from linked articles naturally into the narrative.\n"
                    f"- key_points: 5-8 crisp bullets each with a specific fact, number, or "
                    f"takeaway (not vague — e.g. 'GPT-4 costs $30/M tokens' not 'AI costs are rising')\n"
                    f"- action_items: concrete steps the reader should take (empty list if none)\n"
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
            "image_url": item.image_urls[0] if item.image_urls else None,
            "image_urls": item.image_urls,
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
