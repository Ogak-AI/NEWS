"""
pipeline.py — In-memory Veritas AI editorial pipeline (Zephyr Chat)
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
    # Zephyr-7B-Beta is a highly stable chat model for the Inference API
    return InferenceClient(model="HuggingFaceH4/zephyr-7b-beta", token=key)

# ── Step 1: Fact Validation ────────────────────────────────────────────────────
def validate_facts(client, sources: list, category: str) -> dict:
    if not client:
        raise RuntimeError("HUGGINGFACE_API_KEY is required for fact validation.")

    # Truncate content to 1500 chars to avoid memory overflow
    source_texts = [
        f"Publisher: {s.get('publisher')}\nTitle: {s.get('title')}\n\n{str(s.get('content', ''))[:1500].strip()}"
        for s in sources
    ]
    combined = "\n\n---\n\n".join(source_texts)

    messages = [
        {
            "role": "system",
            "content": "You are a senior bureau chief and fact-checking editor. Be rigorous, impartial, and precise. Return findings in JSON only."
        },
        {
            "role": "user",
            "content": (
                f"Analyze these {len(sources)} {category} news sources:\n\n{combined}\n\n"
                "Extract all key factual claims. For each: determine corroboration count, "
                "assign confidence (0.0–1.0), flag contradictions.\n"
                "Return JSON only:\n"
                '{"facts": [{"claim": "...", "confidence": 0.9, "sources_corroborating": 2, "contradiction": false}]}'
            )
        }
    ]

    try:
        response = client.chat_completion(
            messages=messages,
            max_tokens=2000,
            temperature=0.1,
        )
        content = response.choices[0].message.content.strip()
        start = content.find('{')
        end = content.rfind('}') + 1
        if start != -1 and end != -1:
            return json.loads(content[start:end])
        print(f"    [LLM] RAW CHAT RESPONSE (No JSON found): {content[:200]}...")
        raise ValueError("No JSON found in response")
    except Exception as e:
        err_str = str(e)
        if "503" in err_str or "loading" in err_str.lower():
            print("    [LLM] Error: Model is loading on Hugging Face. Please wait 30s.")
        else:
            print(f"    [LLM] Fact validation failed: {repr(e)}")
        raise

# ── Step 2: Article Generation ────────────────────────────────────────────────
def generate_article(client, facts_data: dict, sources: list, category: str, trend_tags: list[str] | None = None) -> dict:
    if not client:
        raise RuntimeError("HUGGINGFACE_API_KEY is required for article generation.")

    facts_str = json.dumps(facts_data, indent=2)
    source_texts = "\n\n---\n\n".join(
        f"Publisher: {s.get('publisher')}\nTitle: {s.get('title')}\n\n{str(s.get('content', ''))[:1200].strip()}"
        for s in sources
    )

    trend_context = ""
    if trend_tags:
        trend_context = "\n\nCurrent trending context: " + ", ".join(trend_tags) + "."

    messages = [
        {
            "role": "system",
            "content": "You are a world-class senior international correspondent. Write rigorous reporting (Reuters/FT style). JSON only."
        },
        {
            "role": "user",
            "content": (
                f"Category: {category}\n\nValidated Facts:\n{facts_str}\n\n"
                f"Factual Source Material:\n{source_texts}{trend_context}\n\n"
                "Construct a full article with a strong inverted-pyramid lede, body, and 2-sentence digest. "
                "Return JSON only: {\"title\": \"...\", \"lede\": \"...\", \"content\": \"...\", \"digest\": \"...\"}"
            )
        }
    ]

    try:
        response = client.chat_completion(
            messages=messages,
            max_tokens=4000,
            temperature=0.3,
        )
        content = response.choices[0].message.content.strip()
        start = content.find('{')
        end = content.rfind('}') + 1
        if start != -1 and end != -1:
            return json.loads(content[start:end])
        print(f"    [LLM] RAW CHAT RESPONSE (No JSON found): {content[:200]}...")
        raise ValueError("No JSON found in response")
    except Exception as e:
        print(f"    [LLM] Article generation failed: {repr(e)}")
        raise

# ── Step 3: Bias & Quality Evaluation ─────────────────────────────────────────
def evaluate_bias(client, article_content: str) -> tuple[float, float]:
    messages = [
        {"role": "system", "content": "You are a media bias analyst. Score objectively. JSON only."},
        {
            "role": "user",
            "content": f"Score bias (0.0=slanted, 1.0=neutral) and readability (0.0-1.0) for this article:\n\n{article_content[:2000]}\n\nReturn JSON: {{\"bias_score\": 0.9, \"readability_score\": 0.9}}"
        }
    ]
    try:
        response = client.chat_completion(messages=messages, max_tokens=500, temperature=0.1)
        content = response.choices[0].message.content.strip()
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

    print("\n[Pipeline] Mode: Zephyr-7B-Beta (Chat API)")

    trend_tags = []
    if os.getenv("VIRLO_API_KEY", "").strip():
        try:
            trend_tags = fetch_trending_hashtags(5)
        except Exception:
            pass

    if not in_memory_sources:
        print("[Pipeline] No sources found. Ensure ingestion has run.")
        return

    # Group by category
    by_category = {}
    for s in in_memory_sources:
        cat = s.get("category", "general")
        by_category.setdefault(cat, []).append(s)

    for category, cat_sources in by_category.items():
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
            print(f"[Pipeline] ERROR: {repr(exc)}")
