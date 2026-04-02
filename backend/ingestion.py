"""
ingestion.py — Real RSS feed ingestion for Veritas AI
Fetches live articles from trusted public news feeds.
"""
import datetime
import feedparser
from database import SessionLocal, Base, engine
from models import Source

Base.metadata.create_all(bind=engine)

# Trusted RSS feeds grouped by editorial category
FEEDS: dict[str, list[tuple[str, str]]] = {
    "environment": [
        ("NASA Breaking News", "https://www.nasa.gov/rss/dyn/breaking_news.rss"),
        ("The Guardian — Environment", "https://www.theguardian.com/environment/rss"),
        ("ScienceDaily — Earth & Climate", "https://www.sciencedaily.com/rss/earth_climate.xml"),
    ],
    "finance": [
        ("Reuters — Business", "https://feeds.reuters.com/reuters/businessNews"),
        ("MarketWatch", "https://feeds.marketwatch.com/marketwatch/realtimeheadlines/"),
        ("Yahoo Finance", "https://finance.yahoo.com/news/rssindex"),
    ],
    "science": [
        ("ScienceDaily — Top Science", "https://www.sciencedaily.com/rss/top/science.xml"),
        ("WHO — News", "https://www.who.int/feeds/entity/news/en/rss.xml"),
        ("arXiv — AI", "https://export.arxiv.org/rss/cs.AI"),
    ],
    "geopolitics": [
        ("BBC — World News", "https://feeds.bbci.co.uk/news/world/rss.xml"),
        ("The Guardian — World", "https://www.theguardian.com/world/rss"),
        ("Reuters — World News", "https://feeds.reuters.com/Reuters/worldNews"),
    ],
}


def ingest_feed(feed_url: str, publisher: str, category: str, db, limit: int = 3) -> int:
    """Parse one RSS feed and save new sources. Returns count of new items added."""
    try:
        parsed = feedparser.parse(feed_url)
        if not parsed.entries:
            print(f"    [warn] No entries from {feed_url}")
            return 0

        count = 0
        for entry in parsed.entries[:limit]:
            url = entry.get("link", "").strip() or None

            # Deduplicate by URL
            if url:
                existing = db.query(Source).filter(Source.url == url).first()
                if existing:
                    continue

            title = entry.get("title", "Untitled").strip()
            content = (
                entry.get("summary", "")
                or entry.get("description", "")
                or (entry.content[0].value if hasattr(entry, "content") and entry.content else "")
            ).strip()

            if not content or len(content) < 20:
                continue

            published = str(entry.get("published", datetime.datetime.utcnow().isoformat()))

            db.add(Source(
                title=title,
                url=url,
                publisher=publisher,
                published_date=published,
                content=content,
                category=category,
                ingested_at=datetime.datetime.utcnow().isoformat(),
            ))
            count += 1

        db.commit()
        return count

    except Exception as exc:
        print(f"    [error] {publisher}: {exc}")
        db.rollback()
        return 0


def ingest_all(limit_per_feed: int = 3) -> int:
    """Ingest from all configured RSS feeds. Returns total new sources added."""
    db = SessionLocal()
    total = 0
    for category, feeds in FEEDS.items():
        print(f"\n  [{category.upper()}]")
        for publisher, url in feeds:
            n = ingest_feed(url, publisher, category, db, limit=limit_per_feed)
            label = f"{n} new" if n else "no new (already ingested or unavailable)"
            print(f"    {publisher}: {label}")
            total += n
    db.close()
    print(f"\n  Total new sources ingested: {total}")
    return total


if __name__ == "__main__":
    ingest_all()
