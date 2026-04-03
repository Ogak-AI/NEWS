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


def ingest_feed(
    feed_url: str, publisher: str, category: str,
    in_memory_sources: list, limit: int = 5
) -> int:
    """Parse one RSS feed and append new source records. Returns count added."""
    try:
        parsed = feedparser.parse(feed_url)
        if not parsed.entries:
            print(f"    [warn] No entries from {publisher}")
            return 0

        count = 0
        for entry in parsed.entries[:limit]:
            url = entry.get("link", "").strip() or None

            # Deduplicate by URL
            if url and any(s.get("url") == url for s in in_memory_sources):
                continue

            title = entry.get("title", "Untitled").strip()

            # Try multiple content fields in order of richness
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

            published = str(
                entry.get("published", datetime.datetime.utcnow().isoformat())
            )

            in_memory_sources.append({
                "title":        title,
                "url":          url,
                "publisher":    publisher,
                "published_date": published,
                "content":      content,
                "category":     category,
                "ingested_at":  datetime.datetime.utcnow().isoformat(),
            })
            count += 1

        return count

    except Exception as exc:
        print(f"    [error] {publisher}: {exc}")
        return 0


def ingest_all(in_memory_sources: list, limit_per_feed: int = 5) -> int:
    """Ingest from all configured RSS feeds. Returns total new sources added."""
    total = 0
    for category, feeds in FEEDS.items():
        print(f"\n  [{category.upper()}]")
        for publisher, url in feeds:
            n = ingest_feed(url, publisher, category, in_memory_sources, limit=limit_per_feed)
            label = f"{n} new" if n else "no new (already ingested or unavailable)"
            print(f"    {publisher}: {label}")
            total += n
    print(f"\n  Total new sources ingested: {total}")
    return total
