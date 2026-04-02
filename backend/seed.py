"""
seed.py — Fresh database seed for Veritas AI demo
Fetches real RSS feeds → runs the editorial pipeline → publishes articles
"""
from database import Base, engine
from ingestion import ingest_all
from pipeline import run_pipeline


def seed(fresh: bool = True):
    print("=" * 62)
    print("  VERITAS AI — DATABASE SEEDER")
    print("=" * 62)

    if fresh:
        print("\n[0/2] Clearing existing data for a fresh start...")
        Base.metadata.drop_all(bind=engine)
        print("  Tables dropped.")

    Base.metadata.create_all(bind=engine)
    print("  Tables created.")

    print("\n[1/2] Ingesting live news from trusted RSS feeds...")
    total = ingest_all(limit_per_feed=3)
    print(f"\n  Ingestion complete: {total} sources added.")

    print("\n[2/2] Running Veritas AI editorial pipeline...")
    run_pipeline()

    print("\n" + "=" * 62)
    print("  Seed complete! Start the API server with:")
    print("  uvicorn main:app --reload")
    print("=" * 62)


if __name__ == "__main__":
    seed()
