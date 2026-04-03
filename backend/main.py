"""
main.py — Veritas AI FastAPI backend (In-Memory Version)
"""
import datetime
import os
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

# In-memory stores
ARTICLES: list[dict] = []
SOURCES: list[dict] = []

app = FastAPI(title="Veritas AI — Intelligence Wire API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "service": "Veritas AI backend (stateless)"}

@app.get("/api/articles")
def get_articles(category: str = None):
    # Filter by category if provided
    filtered = ARTICLES
    if category and category != "all":
        filtered = [a for a in ARTICLES if a.get("category") == category]
    
    # Sort by ID desc (highest ID is latest)
    sorted_articles = sorted(filtered, key=lambda x: x.get("id", 0), reverse=True)
    
    return [
        {
            "id": a["id"],
            "title": a["title"],
            "lede": a["lede"],
            "digest": a["digest"],
            "aggregate_confidence": a["aggregate_confidence"],
            "depth_meter": a["depth_meter"],
            "bias_score": a["bias_score"],
            "readability_score": a["readability_score"],
            "category": a["category"],
            "created_at": a["created_at"],
        }
        for a in sorted_articles
    ]

@app.get("/api/articles/{article_id}")
def get_article(article_id: int):
    article = next((a for a in ARTICLES if a["id"] == article_id), None)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@app.get("/api/digest")
def get_digest():
    sorted_articles = sorted(ARTICLES, key=lambda x: x.get("id", 0), reverse=True)
    return [
        {
            "id": a["id"],
            "title": a["title"],
            "digest": a["digest"],
            "category": a["category"],
            "aggregate_confidence": a["aggregate_confidence"],
        }
        for a in sorted_articles[:5]
    ]

@app.get("/api/pipeline/status")
def pipeline_status():
    return {
        "article_count": len(ARTICLES),
        "source_count": len(SOURCES),
        "status": "ready",
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }

@app.post("/api/ingest")
def trigger_ingest(background_tasks: BackgroundTasks):
    import ingestion
    background_tasks.add_task(ingestion.ingest_all, SOURCES)
    return {"status": "started", "message": "RSS ingestion running in background"}

@app.post("/api/pipeline/run")
def trigger_pipeline(background_tasks: BackgroundTasks):
    if not os.getenv("HUGGINGFACE_API_KEY", "").strip():
        raise HTTPException(
            status_code=400,
            detail="HUGGINGFACE_API_KEY is required to run the AI editorial pipeline."
        )
    import pipeline
    background_tasks.add_task(pipeline.run_pipeline, SOURCES, ARTICLES)
    return {"status": "started", "message": "Article generation running in background — refresh in ~30s"}
