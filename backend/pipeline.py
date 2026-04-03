"""
pipeline.py — In-memory Veritas AI editorial pipeline
"""
import os
import json
import datetime
from huggingface_hub import InferenceClient
from dotenv import load_dotenv
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
        f"Publisher: {s.get('publisher')}\nTitle: {s.get('title')}\n\n{s.get('content', '').strip()}"
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
        content = response.strip()
        start = content.find('{')
        end = content.rfind('}') + 1
        if start != -1 and end != -1:
            return json.loads(content[start:end])
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
        f"Publisher: {s.get('publisher')}\nTitle: {s.get('title')}\n\n{s.get('content', '').strip()}"
        for s in sources
    )

    trend_context = ""
    if trend_tags:
        trend_context = "\n\nCurrent Virlo trending topics: " + ", ".join(trend_tags) + ". Use these signals only to frame why the story matters."

    prompt = (
        "You are a world-class senior international correspondent. Write rigorous reporting (Reuters style). JSON only.\n\n"
        f"Category: {category}\n\nValidated Facts:\n{facts_str}\n\n"
        f"Source Material:\n{source_texts}{trend_context}\n\n"
        "Return JSON: {\"title\": \"...\", \"lede\": \"...\", \"content\": \"...\", \"digest\": \"...\"}"
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
        start = content.find('{')
        end = content.rfind('}') + 1
        if start != -1 and end != -1:
            return json.loads(content[start:end])
        raise ValueError("No JSON found in response")
    except Exception as e:
        print(f"    [LLM] Article generation error: {e}")
        raise

# ── Step 3: Bias & Quality Evaluation ─────────────────────────────────────────
def evaluate_bias(client, article_content: str) -> tuple[float, float]:
    prompt = f"Score bias (0.0-1.0) and readability (0.0-1.0). JSON: {{\"bias_score\": 0.9, \"readability_score\": 0.9}}\n\n{article_content[:2000]}"
    try:
        response = client.text_generation(prompt, max_new_tokens=500, temperature=0.1)
        content = response.strip()
        start = content.find('{')
        end = content.rfind('}') + 1
        if start != -1 and end != -1:
            data = json.loads(content[start:end])
            return float(data.get("bias_score", 0.85)), float(data.get("readability_score", 0.87))
        raise ValueError("No JSON found")
    except Exception:
        return 0.85, 0.87

def run_pipeline(in_memory_sources: list, in_memory_articles: list):
    """Run the editorial pipeline over in-memory sources."""
    client = _get_llm_client()
    if not client:
        print("[Pipeline] ERROR: HUGGINGFACE_API_KEY not configured.")
        return

    trend_tags = []
    if os.getenv("VIRLO_API_KEY", "").strip():
        try:
            trend_tags = fetch_trending_hashtags(5)
        except Exception:
            pass

    if not in_memory_sources:
        print("[Pipeline] No sources found.")
        return

    # Group by category
    by_category = {}
    for s in in_memory_sources:
        cat = s.get("category", "general")
        by_category.setdefault(cat, []).append(s)

    for category, cat_sources in by_category.items():
        # Check if an article for this category already exists in this run
        if any(a.get("category") == category for a in in_memory_articles):
            continue

        print(f"\n  [{category.upper()}] Processing {len(cat_sources)} sources")

        try:
            fact_data = validate_facts(client, cat_sources, category)
            article_data = generate_article(client, fact_data, cat_sources, category, trend_tags)
            bias_score, readability_score = evaluate_bias(client, article_data.get("content", ""))
            
            facts = fact_data.get("facts", [])
            depth = min(max(f.get("sources_corroborating", 1) for f in facts) if facts else 1, 5)
            confidence = (sum(f.get("confidence", 0.5) for f in facts) / len(facts)) if facts else 0.5

            new_id = len(in_memory_articles) + 1
            new_article = {
                "id": new_id,
                "title": article_data.get("title", "Untitled"),
                "lede": article_data.get("lede", ""),
                "content": article_data.get("content", ""),
                "digest": article_data.get("digest", ""),
                "aggregate_confidence": round(confidence, 2),
                "depth_meter": depth,
                "bias_score": round(bias_score, 2),
                "readability_score": round(readability_score, 2),
                "category": category,
                "status": "published",
                "provenance_metadata": {
                    "facts": facts,
                    "sources": [
                        {"publisher": s.get("publisher"), "url": s.get("url"), "title": s.get("title")}
                        for s in cat_sources
                    ],
                    "virlo_trend_tags": trend_tags,
                },
                "created_at": datetime.datetime.utcnow().isoformat(),
            }
            in_memory_articles.append(new_article)
            print(f"    Published: {new_article['title'][:70]}...")
        except Exception as exc:
            print(f"[Pipeline] ERROR: {exc}")
