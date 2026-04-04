"""
main.py — Veritas AI FastAPI backend (In-Memory, Stateless)
"""
import datetime
import os
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── In-memory stores ───────────────────────────────────────────────────────────
ARTICLES:         list[dict] = []
SOURCES:          list[dict] = []
PIPELINE_RUNNING: bool       = False

def _boot_pipeline():
    """Auto-run ingest + generate on cold start so articles are ready immediately."""
    global PIPELINE_RUNNING
    if PIPELINE_RUNNING or not os.getenv("GROQ_API_KEY", "").strip():
        return
    PIPELINE_RUNNING = True
    try:
        import ingestion, pipeline
        print("[Boot] Auto-warming: RSS ingestion...")
        ingestion.ingest_all(SOURCES)
        print("[Boot] Auto-warming: AI pipeline...")
        pipeline.run_pipeline(SOURCES, ARTICLES)
        print("[Boot] Warm-up complete.")
    except Exception as exc:
        print(f"[Boot] Warm-up error: {repr(exc)}")
    finally:
        PIPELINE_RUNNING = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fire-and-forget: start pipeline in background thread on every cold start
    threading.Thread(target=_boot_pipeline, daemon=True).start()
    yield


app = FastAPI(
    title="Veritas AI — Intelligence Wire API",
    version="2.0.0",
    description="AI-native journalism with radical editorial transparency.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health — handles both GET (browser) and HEAD (UptimeRobot) ────────────────
@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {
        "status": "ok",
        "service": "Veritas AI — Intelligence Wire",
        "version": "2.0.0",
    }

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}


# ── Articles ───────────────────────────────────────────────────────────────────
@app.get("/api/articles")
def get_articles(category: str = None):
    filtered = ARTICLES
    if category and category != "all":
        filtered = [a for a in ARTICLES if a.get("category") == category]

    sorted_articles = sorted(filtered, key=lambda x: x.get("id", 0), reverse=True)

    return [
        {
            "id":                   a["id"],
            "title":                a["title"],
            "dateline":             a.get("dateline", ""),
            "lede":                 a["lede"],
            "digest":               a["digest"],
            "pull_quote":           a.get("pull_quote", ""),
            "word_count":           a.get("word_count", 0),
            "aggregate_confidence": a["aggregate_confidence"],
            "depth_meter":          a["depth_meter"],
            "bias_score":           a["bias_score"],
            "readability_score":    a["readability_score"],
            "category":             a["category"],
            "created_at":           a["created_at"],
        }
        for a in sorted_articles
    ]


@app.get("/api/articles/{article_id}")
def get_article(article_id: int):
    article = next((a for a in ARTICLES if a["id"] == article_id), None)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


# ── Article Q&A ────────────────────────────────────────────────────────────────
class QARequest(BaseModel):
    question: str


@app.post("/api/articles/{article_id}/qa")
def article_qa(article_id: int, body: QARequest):
    """Ask the AI reporter a question about a specific article."""
    article = next((a for a in ARTICLES if a["id"] == article_id), None)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if not os.getenv("GROQ_API_KEY", "").strip():
        raise HTTPException(
            status_code=400,
            detail="GROQ_API_KEY required for Q&A"
        )

    import pipeline as pl
    client = pl._get_llm_client()
    if not client:
        raise HTTPException(status_code=500, detail="LLM client unavailable")

    content_snippet = str(article.get("content", ""))[:3000]
    messages = [
        {
            "role": "system",
            "content": (
                "You are the senior correspondent who reported and wrote this article. "
                "Answer the reader's question concisely, factually, and only based on "
                "what is in the article. Do not speculate or add external information. "
                "If the article does not address the question, say so briefly."
            )
        },
        {
            "role": "user",
            "content": (
                f"Article title: {article.get('title')}\n\n"
                f"Article content:\n{content_snippet}\n\n"
                f"Reader question: {question}\n\n"
                "Answer in 2–4 sentences:"
            )
        }
    ]

    try:
        response = client.chat.completions.create(
            model=pl.MODEL,
            messages=messages,
            max_tokens=400,
            temperature=0.2,
        )
        answer = response.choices[0].message.content.strip()
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)[:120]}")


# ── Virlo Orbit Proxy ────────────────────────────────────────────────────────────
@app.get("/api/orbit/{orbit_id}")
def proxy_orbit_status(orbit_id: str):
    import virlo
    data = virlo.get_orbit_status(orbit_id)
    if not data:
        raise HTTPException(status_code=404, detail="Orbit request not found or not ready.")
    return data


# ── Digest ─────────────────────────────────────────────────────────────────────
@app.get("/api/digest")
def get_digest():
    sorted_articles = sorted(ARTICLES, key=lambda x: x.get("id", 0), reverse=True)
    return [
        {
            "id":                   a["id"],
            "title":                a["title"],
            "digest":               a["digest"],
            "category":             a["category"],
            "aggregate_confidence": a["aggregate_confidence"],
        }
        for a in sorted_articles[:5]
    ]


# ── Pipeline Status ────────────────────────────────────────────────────────────
@app.get("/api/pipeline/status")
def pipeline_status():
    global PIPELINE_RUNNING
    return {
        "article_count": len(ARTICLES),
        "source_count":  len(SOURCES),
        "status":        "running" if PIPELINE_RUNNING else "ready",
        "timestamp":     datetime.datetime.utcnow().isoformat(),
    }


# ── Ingestion ──────────────────────────────────────────────────────────────────
@app.post("/api/ingest")
def trigger_ingest(background_tasks: BackgroundTasks):
    import ingestion
    background_tasks.add_task(ingestion.ingest_all, SOURCES)
    return {"status": "started", "message": "RSS ingestion running in background"}


# ── Pipeline (articles only) ───────────────────────────────────────────────────
def _run_articles_only():
    global PIPELINE_RUNNING
    PIPELINE_RUNNING = True
    try:
        import pipeline
        pipeline.run_pipeline(SOURCES, ARTICLES)
    finally:
        PIPELINE_RUNNING = False

@app.post("/api/pipeline/run")
def trigger_pipeline(background_tasks: BackgroundTasks):
    if not os.getenv("GROQ_API_KEY", "").strip():
        raise HTTPException(
            status_code=400,
            detail="GROQ_API_KEY is required to run the AI editorial pipeline."
        )
    background_tasks.add_task(_run_articles_only)
    return {
        "status": "started",
        "message": "Article generation running — refresh in ~60s"
    }


# ── Full Pipeline (ingest + generate) — single click ──────────────────────────
def _run_full_pipeline():
    global PIPELINE_RUNNING
    PIPELINE_RUNNING = True
    try:
        import ingestion, pipeline
        print("\n[Full Pipeline] Phase 1: RSS ingestion...")
        ingestion.ingest_all(SOURCES)
        print("[Full Pipeline] Phase 2: AI editorial pipeline...")
        pipeline.run_pipeline(SOURCES, ARTICLES)
        print("[Full Pipeline] Complete.")
    finally:
        PIPELINE_RUNNING = False


@app.post("/api/pipeline/full")
def trigger_full_pipeline(background_tasks: BackgroundTasks):
    if not os.getenv("GROQ_API_KEY", "").strip():
        raise HTTPException(
            status_code=400,
            detail="GROQ_API_KEY is required to run the pipeline."
        )
    background_tasks.add_task(_run_full_pipeline)
    return {
        "status": "started",
        "message": "Full pipeline started (ingest → generate) — articles will appear in ~90s"
    }
