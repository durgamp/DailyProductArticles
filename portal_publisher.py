from __future__ import annotations

import logging
from typing import Any, Dict

import requests

from config import AppConfig


logger = logging.getLogger(__name__)


def publish_to_portal(config: AppConfig, structured_digest: Dict[str, Any]) -> None:
    """POST the structured digest JSON to the Vercel web portal."""
    if not config.portal_api_url or not config.portal_api_secret:
        logger.info("PORTAL_API_URL or PORTAL_API_SECRET not set — skipping portal publish.")
        return

    url = config.portal_api_url.rstrip("/") + "/api/publish"
    headers = {
        "Authorization": f"Bearer {config.portal_api_secret}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(url, json=structured_digest, headers=headers, timeout=30)
        response.raise_for_status()
        logger.info("Digest published to portal at %s", url)
    except requests.RequestException as exc:
        logger.error("Failed to publish digest to portal: %s", exc)
