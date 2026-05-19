"""Alohida runner — faqat sharhlarga javob beradi."""
from __future__ import annotations

import logging
import sys
from pathlib import Path

import yaml
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from agents.comment_responder import respond_to_comments  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def main() -> int:
    load_dotenv(ROOT / ".env")
    with (ROOT / "config.yaml").open() as f:
        cfg = yaml.safe_load(f)
    if not cfg["comments"]["reply_enabled"]:
        logging.info("Sharhlarga javob o'chirilgan (config.yaml).")
        return 0
    respond_to_comments(
        max_replies=cfg["comments"]["max_replies_per_run"],
        style=cfg["comments"]["style"],
        model_name=cfg["comments"]["model"],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
