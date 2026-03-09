from __future__ import annotations

import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Tuple
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup


logger = logging.getLogger(__name__)

# Domains / patterns to skip — not article content
_SKIP_PATTERNS = [
    "unsubscribe", "optout", "opt-out", "manage_preference",
    "twitter.com", "x.com", "facebook.com", "instagram.com",
    "linkedin.com", "youtube.com", "youtu.be", "tiktok.com",
    "reddit.com", "mailto:", "tel:", "pinterest.com",
    "account/", "/login", "/signup", "/register",
    "pixel.", "/track/", "/open/", "/click/",
    "cdn.", "static.", "assets.", "fonts.",
]

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def _is_article_url(url: str) -> bool:
    if not url.startswith("http"):
        return False
    lower = url.lower()
    return not any(p in lower for p in _SKIP_PATTERNS)


def _extract_main_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    # Strip noise
    for tag in soup(["script", "style", "nav", "header", "footer",
                     "aside", "noscript", "form", "button", "iframe",
                     "figure", "figcaption"]):
        tag.decompose()

    # Prefer semantic article containers
    content = (
        soup.find("article")
        or soup.find(attrs={"role": "main"})
        or soup.find("main")
        or soup.find(class_=re.compile(
            r"(post|article|entry|content|story)[-_]?(body|text|content)?", re.I))
        or soup.find("body")
        or soup
    )

    text = content.get_text("\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _fetch_one(url: str, timeout: int = 15) -> Tuple[str, str]:
    """Fetch a URL (following redirects) and return (final_url, clean_text)."""
    try:
        resp = requests.get(
            url, headers=_HEADERS, timeout=timeout,
            allow_redirects=True, stream=False,
        )
        final_url = resp.url

        if resp.status_code != 200:
            return final_url, ""

        ct = resp.headers.get("content-type", "")
        if "html" not in ct:
            return final_url, ""

        text = _extract_main_text(resp.text)
        # 5 000 chars per linked article — enough for a thorough summary
        return final_url, text[:5000]

    except Exception as exc:
        logger.debug("Fetch failed for %s: %s", url, exc)
        return url, ""


def fetch_linked_content(
    link_urls: List[str],
    max_articles: int = 5,
    timeout_total: int = 25,
) -> List[Tuple[str, str]]:
    """
    Fetch up to max_articles article URLs in parallel.
    Returns list of (final_url, text) for URLs that returned content.
    """
    candidates = [u for u in link_urls if _is_article_url(u)]
    # Deduplicate preserving order
    seen: set = set()
    unique: List[str] = []
    for u in candidates:
        domain = urlparse(u).netloc
        if domain not in seen:
            seen.add(domain)
            unique.append(u)
        if len(unique) >= max_articles:
            break

    if not unique:
        return []

    results: List[Tuple[str, str]] = []
    with ThreadPoolExecutor(max_workers=len(unique)) as pool:
        futures = {pool.submit(_fetch_one, u): u for u in unique}
        try:
            for future in as_completed(futures, timeout=timeout_total):
                final_url, text = future.result()
                if text.strip():
                    results.append((final_url, text))
        except Exception:
            pass

    return results
