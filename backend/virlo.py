"""
virlo.py — Optional Virlo signal enrichment for Veritas AI.
Uses Virlo trending analytics and Orbit Social Listening to provide social signal context.
"""
import os
import httpx

VIRLO_BASE_URL = "https://api.virlo.ai/v1"


def _get_api_key() -> str | None:
    key = os.getenv("VIRLO_API_KEY", "").strip()
    return key or None


def fetch_trending_hashtags(limit: int = 5) -> list[dict]:
    """Fetches trending hashtags and returns full analytic dicts (hashtag, count, total_views)."""
    key = _get_api_key()
    if not key:
        return []

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                f"{VIRLO_BASE_URL}/hashtags",
                headers={"Authorization": f"Bearer {key}"},
                params={"limit": limit, "order_by": "views", "sort": "desc"},
            )
        response.raise_for_status()
        payload = response.json()
        hashtags = payload.get("data", {}).get("hashtags", [])
        return [h for h in hashtags if isinstance(h, dict)][:limit]
    except Exception as exc:
        print(f"    [Virlo] Trending signal fetch failed: {exc}")
        return []


def dispatch_orbit_search(name: str, keywords: list[str]) -> str | None:
    """Dispatches a background Orbit search. Returns the orbit_id."""
    key = _get_api_key()
    if not key:
        return None

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{VIRLO_BASE_URL}/orbit",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json"
                },
                json={
                    "name": name,
                    "keywords": keywords[:3],  # max 3 keywords
                    "platforms": ["tiktok", "youtube"],
                    "min_views": 10000,
                    "run_analysis": True
                }
            )
        response.raise_for_status()
        payload = response.json()
        return payload.get("data", {}).get("id")
    except Exception as exc:
        print(f"    [Virlo] Orbit dispatch failed: {exc}")
        return None


def get_orbit_status(orbit_id: str) -> dict | None:
    """Gets the status (and potentially videos) of an orbit search."""
    key = _get_api_key()
    if not key:
        return None

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                f"{VIRLO_BASE_URL}/orbit/{orbit_id}",
                headers={"Authorization": f"Bearer {key}"}
            )
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        print(f"    [Virlo] Orbit status check failed: {exc}")
        return None
