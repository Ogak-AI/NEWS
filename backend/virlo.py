"""
virlo.py — Optional Virlo signal enrichment for Veritas AI.
Uses Virlo trending analytics to provide social signal context for article generation.
"""
import os

import httpx

VIRLO_BASE_URL = "https://api.virlo.ai/v1"


def _get_api_key() -> str | None:
    key = os.getenv("VIRLO_API_KEY", "").strip()
    return key or None


def fetch_trending_hashtags(limit: int = 5) -> list[str]:
    key = _get_api_key()
    if not key:
        raise RuntimeError("VIRLO_API_KEY is required for Virlo enrichment.")

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(
                f"{VIRLO_BASE_URL}/hashtags",
                headers={"Authorization": f"Bearer {key}"},
                params={"limit": limit, "order_by": "views", "sort": "desc"},
            )
        response.raise_for_status()
        payload = response.json()
        hashtags = payload.get("data", {}).get("hashtags", [])
        return [h.get("hashtag") for h in hashtags if isinstance(h, dict) and h.get("hashtag")][:limit]
    except Exception as exc:
        print(f"    [Virlo] Trending signal fetch failed: {exc}")
        return []
