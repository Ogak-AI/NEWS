"""
pipeline.py — Veritas AI editorial pipeline
Steps: Fact Validation → Article Generation → Bias/QC Evaluation → Publish
"""
import os
import json
import datetime
from huggingface_hub import InferenceClient
from dotenv import load_dotenv
from database import SessionLocal
from models import Source, Article
from virlo import fetch_trending_hashtags

load_dotenv()


def _get_llm_client():
    key = os.getenv("HUGGINGFACE_API_KEY", "").strip()
    if not key:
        return None
    return InferenceClient(model="mistralai/Mistral-7B-Instruct-v0.1", token=key)


# ── Step 1: Fact Validation ────────────────────────────────────────────────────

def validate_facts(client, sources: list, category: str) -> dict:
    if not client:
        raise RuntimeError("HUGGINGFACE_API_KEY is required for fact validation.")

    source_texts = [
        f"Publisher: {s.publisher}\nTitle: {s.title}\n\n{s.content.strip()}"
        for s in sources
    ]
    combined = "\n\n---\n\n".join(source_texts)

    prompt = (
        "You are a senior fact-checking editor. Be rigorous, impartial, precise.\n\n"
        f"You have {len(sources)} {category} news sources below.\n\n{combined}\n\n"
        "Extract all key factual claims. For each: determine corroboration count, "
        "assign confidence (0.0–1.0), flag contradictions.\n"
        "Return JSON only:\n"
        '{"facts": [{"claim": "...", "confidence": 0.9, "sources_corroborating": 2, "contradiction": false}]}'
    )

    try:
        response = client.text_generation(
            prompt,
            max_new_tokens=2000,
            temperature=0.1,
            do_sample=True,
            top_p=0.9,
        )
        # Extract JSON from the response
        content = response.strip()
        # Find JSON in the response (it might have extra text)
        start = content.find('{')
        end = content.rfind('}') + 1
        if start != -1 and end != -1:
            json_str = content[start:end]
            return json.loads(json_str)
        else:
            raise ValueError("No JSON found in response")
    except Exception as e:
        print(f"    [LLM] Fact validation error: {e}")
        raise


# ── Step 2: Article Generation ────────────────────────────────────────────────

def generate_article(client, facts_data: dict, sources: list, category: str, trend_tags: list[str] | None = None) -> dict:
    if not client:
        raise RuntimeError("HUGGINGFACE_API_KEY is required for article generation.")

    facts_str = json.dumps(facts_data, indent=2)
    source_texts = "\n\n---\n\n".join(
        f"Publisher: {s.publisher}\nTitle: {s.title}\n\n{s.content.strip()}"
        for s in sources
    )

    trend_context = ""
    if trend_tags:
        trend_context = (
            "\n\nCurrent Virlo trending topics: "
            + ", ".join(trend_tags)
            + ". Use these signals only to frame why the story matters to a broader audience."
        )

    prompt = (
        "You are a world-class senior international correspondent. "
        "Write rigorous, impartial reporting in the style of Reuters or the FT: "
        "inverted-pyramid lede, factual accuracy, balanced perspectives, zero sensationalism. "
        "Return JSON only.\n\n"
        f"Category: {category}\n\nValidated Facts:\n{facts_str}\n\n"
        f"Source Material:\n{source_texts}{trend_context}\n\n"
        "Write a full article with markdown headers. Include a strong headline, "
        "1–2 sentence lede, full body, and a 2-sentence digest summary.\n\n"
        'Return JSON: {"title": "...", "lede": "...", "content": "...(markdown)...", "digest": "..."}'
    )

    try:
        response = client.text_generation(
            prompt,
            max_new_tokens=4000,
            temperature=0.3,
            do_sample=True,
            top_p=0.9,
        )
        content = response.strip()
        # Find JSON in the response
        start = content.find('{')
        end = content.rfind('}') + 1
        if start != -1 and end != -1:
            json_str = content[start:end]
            return json.loads(json_str)
        else:
            raise ValueError("No JSON found in response")
    except Exception as e:
        print(f"    [LLM] Article generation error: {e}")
        raise


# ── Step 3: Bias & Quality Evaluation ─────────────────────────────────────────

def evaluate_bias(client, article_content: str) -> tuple[float, float]:
    if not client:
        raise RuntimeError("HUGGINGFACE_API_KEY is required for bias evaluation.")

    prompt = (
        "You are a media bias analyst. Score objectively.\n\n"
        f"Evaluate this article for bias and readability.\n\n{article_content[:3000]}\n\n"
        "bias_score: 0.0=highly biased, 1.0=perfectly neutral.\n"
        "readability_score: 0.0=poor, 1.0=excellent.\n"
        'Return JSON: {"bias_score": 0.92, "readability_score": 0.88}'
    )

    try:
        response = client.text_generation(
            prompt,
            max_new_tokens=500,
            temperature=0.1,
            do_sample=True,
            top_p=0.9,
        )
        content = response.strip()
        # Find JSON in the response
        start = content.find('{')
        end = content.rfind('}') + 1
        if start != -1 and end != -1:
            json_str = content[start:end]
            data = json.loads(json_str)
            return float(data.get("bias_score", 0.85)), float(data.get("readability_score", 0.87))
        else:
            raise ValueError("No JSON found in response")
    except Exception as e:
        print(f"    [LLM] Bias evaluation error: {e}")
        raise


# ── Main Pipeline Entry Point ──────────────────────────────────────────────────

def run_pipeline():
    """Run the full editorial pipeline over all ingested sources."""
    client = _get_llm_client()
    if not client:
        print("[Pipeline] ERROR: HUGGINGFACE_API_KEY is not configured. The pipeline requires a real LLM credential.")
        return

    trend_tags: list[str] = []
    if os.getenv("VIRLO_API_KEY", "").strip():
        try:
            trend_tags = fetch_trending_hashtags(5)
            if trend_tags:
                print(f"[Pipeline] Virlo trend signals: {', '.join(trend_tags)}")
            else:
                print("[Pipeline] Virlo key configured but no trend tags retrieved.")
        except Exception as exc:
            print(f"[Pipeline] WARN: Virlo enrichment failed ({exc}). Continuing without trend context.")
    else:
        print("[Pipeline] VIRLO_API_KEY not configured. Skipping optional trend enrichment.")

    print("\n[Pipeline] Mode: Mistral-7B-Instruct-v0.1 (Hugging Face)")

    db = SessionLocal()
    sources = db.query(Source).all()

    if not sources:
        print("[Pipeline] No sources found. Run ingestion first.")
        db.close()
        return

    # Group by category
    by_category: dict[str, list] = {}
    for s in sources:
        by_category.setdefault(s.category or "general", []).append(s)

    articles_created = 0
    for category, cat_sources in by_category.items():
        existing = db.query(Article).filter(Article.category == category).first()
        if existing:
            print(f"  [{category}] Article already exists — skipping.")
            continue

        print(f"\n  [{category.upper()}] {len(cat_sources)} sources")

        try:
            print("    Step 1: Validating facts...")
            fact_data = validate_facts(client, cat_sources, category)

            print("    Step 2: Generating article...")
            article_data = generate_article(client, fact_data, cat_sources, category, trend_tags)

            print("    Step 3: Evaluating bias & readability...")
            bias_score, readability_score = evaluate_bias(client, article_data.get("content", ""))
        except Exception as exc:
            print(f"[Pipeline] ERROR: Pipeline failure: {exc}")
            print("[Pipeline] Check HUGGINGFACE_API_KEY and ensure you have access to the model. Pipeline halted.")
            break

        facts = fact_data.get("facts", [])
        depth = min(max(f.get("sources_corroborating", 1) for f in facts) if facts else 1, 5)
        confidence = (sum(f.get("confidence", 0.5) for f in facts) / len(facts)) if facts else 0.5

        new_article = Article(
            title=article_data.get("title", "Untitled"),
            lede=article_data.get("lede", ""),
            content=article_data.get("content", ""),
            digest=article_data.get("digest", ""),
            aggregate_confidence=round(confidence, 2),
            depth_meter=depth,
            bias_score=round(bias_score, 2),
            readability_score=round(readability_score, 2),
            category=category,
            status="published",
            provenance_metadata={
                "facts": facts,
                "sources": [
                    {"publisher": s.publisher, "url": s.url, "title": s.title}
                    for s in cat_sources
                ],
                "virlo_trend_tags": trend_tags or [],
            },
            created_at=datetime.datetime.utcnow().isoformat(),
        )
        db.add(new_article)
        db.commit()
        articles_created += 1
        print(f"    Published: {article_data.get('title', '')[:70]}...")

    db.close()
    print(f"\n[Pipeline] Complete — {articles_created} article(s) created.\n")


if __name__ == "__main__":
    run_pipeline()
