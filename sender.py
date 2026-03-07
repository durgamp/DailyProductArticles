from __future__ import annotations

import smtplib
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import AppConfig


def send_digest_email(config: AppConfig, digest_markdown: str, target_date: date) -> None:
    subject = f"Daily Newsletter Digest - {target_date.isoformat()}"
    plain_text = digest_markdown
    html_body = (
        "<html><body><pre style='font-family:Arial, sans-serif; white-space:pre-wrap;'>"
        + _escape_html(digest_markdown)
        + "</pre></body></html>"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = config.gmail_address
    msg["To"] = config.summary_to_email

    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(config.gmail_address, config.gmail_app_password)
        smtp.sendmail(config.gmail_address, [config.summary_to_email], msg.as_string())


def _escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
