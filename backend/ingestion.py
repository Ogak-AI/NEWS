"""
ingestion.py — In-memory RSS feed ingestion for Veritas AI
6 editorial categories • 3 feeds each • 5 items per feed = up to 90 source records
"""
import datetime
import feedparser

# Trusted RSS feeds grouped by editorial category
FEEDS: dict[str, list[tuple[str, str]]] = {
    "geopolitics": [
        ("BBC World News",          "https://feeds.bbci.co.uk/news/world/rss.xml"),
        ("The Guardian — World",    "https://www.theguardian.com/world/rss"),
        ("Reuters — World",         "https://feeds.reuters.com/Reuters/worldNews"),
    ],
    "finance": [
        ("Reuters — Business",      "https://feeds.reuters.com/reuters/businessNews"),
        ("MarketWatch",             "https://feeds.marketwatch.com/marketwatch/realtimeheadlines/"),
        ("Yahoo Finance",           "https://finance.yahoo.com/news/rssindex"),
    ],
    "science": [
        ("ScienceDaily — Top",      "https://www.sciencedaily.com/rss/top/science.xml"),
        ("WHO News",                "https://www.who.int/feeds/entity/news/en/rss.xml"),
        ("arXiv — AI",              "https://export.arxiv.org/rss/cs.AI"),
    ],
    "environment": [
        ("NASA Breaking News",              "https://www.nasa.gov/rss/dyn/breaking_news.rss"),
        ("The Guardian — Environment",      "https://www.theguardian.com/environment/rss"),
        ("ScienceDaily — Earth & Climate",  "https://www.sciencedaily.com/rss/earth_climate.xml"),
    ],
    "technology": [
        ("The Verge",               "https://www.theverge.com/rss/index.xml"),
        ("Ars Technica",            "https://feeds.arstechnica.com/arstechnica/index"),
        ("MIT Technology Review",   "https://www.technologyreview.com/feed/"),
    ],
    "health": [
        ("Reuters — Health",        "https://feeds.reuters.com/reuters/healthNews"),
        ("WHO — Health Alerts",     "https://www.who.int/feeds/entity/mediacentre/news/en/rss.xml"),
        ("MedlinePlus — Health News", "https://medlineplus.gov/xml/mplus_health_topics.xml"),
    ],
}


def _fetch_feed(publisher: str, url: str, category: str, limit: int) -> list[dict]:
    """Fetch one RSS feed and return a list of source record dicts (no side effects)."""
    try:
        parsed = feedparser.parse(url)
        if not parsed.entries:
            print(f"    [warn] No entries from {publisher}")
            return []

        results = []
        for entry in parsed.entries[:limit]:
            entry_url = entry.get("link", "").strip() or None
            content = (
                entry.get("summary", "")
                or entry.get("description", "")
                or (
                    entry.content[0].value
                    if hasattr(entry, "content") and entry.content
                    else ""
                )
            ).strip()

            if not content or len(content) < 30:
                continue

            results.append({
                "title":          entry.get("title", "Untitled").strip(),
                "url":            entry_url,
                "publisher":      publisher,
                "published_date": str(entry.get("published", datetime.datetime.utcnow().isoformat())),
                "content":        content,
                "category":       category,
                "ingested_at":    datetime.datetime.utcnow().isoformat(),
            })
        return results

    except Exception as exc:
        print(f"    [error] {publisher}: {exc}")
        return []


def ingest_all(in_memory_sources: list, limit_per_feed: int = 5) -> int:
    """Fetch all configured RSS feeds concurrently. Returns total new sources added."""
    import threading
    from concurrent.futures import ThreadPoolExecutor, as_completed

    lock  = threading.Lock()
    total = 0

    # Build flat task list: (publisher, url, category)
    tasks = [
        (publisher, url, category)
        for category, feeds in FEEDS.items()
        for publisher, url in feeds
    ]

    with ThreadPoolExecutor(max_workers=10) as executor:
        future_map = {
            executor.submit(_fetch_feed, publisher, url, category, limit_per_feed): (publisher, category)
            for publisher, url, category in tasks
        }
        for future in as_completed(future_map):
            publisher, category = future_map[future]
            items = future.result()
            if not items:
                continue
            with lock:
                existing_urls = {s.get("url") for s in in_memory_sources}
                new_items = [i for i in items if i.get("url") not in existing_urls]
                in_memory_sources.extend(new_items)
                total += len(new_items)
            label = f"{len(new_items)} new" if new_items else "no new (already ingested or unavailable)"
            print(f"    [{category.upper()}] {publisher}: {label}")

    print(f"\n  Total new sources ingested: {total}")
    return total
