"""
main.py — Veritas AI FastAPI backend
"""
import datetime
import os
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, Base, engine
from models import Article, Source

Base.metadata.create_all(bind=engine)

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
    return {"status": "ok", "service": "Veritas AI backend"}


@app.get("/api/articles")
def get_articles(category: str = None, db: Session = Depends(get_db)):
    q = db.query(Article).filter(Article.status == "published")
    if category and category != "all":
        q = q.filter(Article.category == category)
    articles = q.order_by(Article.id.desc()).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "lede": a.lede,
            "digest": a.digest,
            "aggregate_confidence": a.aggregate_confidence,
            "depth_meter": a.depth_meter,
            "bias_score": a.bias_score,
            "readability_score": a.readability_score,
            "category": a.category,
            "created_at": a.created_at,
        }
        for a in articles
    ]


@app.get("/api/articles/{article_id}")
def get_article(article_id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return {
        "id": article.id,
        "title": article.title,
        "lede": article.lede,
        "content": article.content,
        "digest": article.digest,
        "aggregate_confidence": article.aggregate_confidence,
        "depth_meter": article.depth_meter,
        "bias_score": article.bias_score,
        "readability_score": article.readability_score,
        "category": article.category,
        "status": article.status,
        "created_at": article.created_at,
        "provenance_metadata": article.provenance_metadata,
    }


@app.get("/api/digest")
def get_digest(db: Session = Depends(get_db)):
    articles = (
        db.query(Article)
        .filter(Article.status == "published")
        .order_by(Article.id.desc())
        .limit(5)
        .all()
    )
    return [
        {
            "id": a.id,
            "title": a.title,
            "digest": a.digest,
            "category": a.category,
            "aggregate_confidence": a.aggregate_confidence,
        }
        for a in articles
    ]


@app.get("/api/pipeline/status")
def pipeline_status(db: Session = Depends(get_db)):
    article_count = db.query(Article).filter(Article.status == "published").count()
    source_count = db.query(Source).count()
    return {
        "article_count": article_count,
        "source_count": source_count,
        "status": "ready",
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }


@app.post("/api/ingest")
def trigger_ingest(background_tasks: BackgroundTasks):
    import ingestion
    background_tasks.add_task(ingestion.ingest_all)
    return {"status": "started", "message": "RSS ingestion running in background"}


@app.post("/api/pipeline/run")
def trigger_pipeline(background_tasks: BackgroundTasks):
    if not os.getenv("OPENAI_API_KEY", "").strip():
        raise HTTPException(
            status_code=400,
            detail="OPENAI_API_KEY is required to run the AI editorial pipeline. Set it in backend/.env."
        )
    import pipeline
    background_tasks.add_task(pipeline.run_pipeline)
    return {"status": "started", "message": "Article generation running in background — refresh in ~30s"}
