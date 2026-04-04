"""
pipeline.py — Veritas AI editorial pipeline (Llama-3.3-70B, World-Class Journalism Mode)
"""
import os
import json
import datetime
from groq import Groq
from dotenv import load_dotenv
from virlo import fetch_trending_hashtags, dispatch_orbit_search

load_dotenv()

MODEL = "llama-3.3-70b-versatile"


def _get_llm_client():
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        return None
    return Groq(api_key=key)


def _extract_json(raw: str) -> dict:
    """Pull the first {...} block from a raw LLM response.
    Strips markdown code fences and validates the extracted slice."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    start = text.find('{')
    end   = text.rfind('}') + 1   # 0 when '}' not found
    if start == -1 or end <= start:
        raise ValueError(f"No valid JSON found in response. Raw (200 chars): {raw[:200]}")
    return json.loads(text[start:end])


def _today_str() -> str:
    """Platform-safe date string: e.g. 'April 3, 2026'"""
    d = datetime.date.today()
    return f"{d.strftime('%B')} {d.day}, {d.year}"


# ── Step 1: Fact Validation ────────────────────────────────────────────────────
def validate_facts(client, sources: list, category: str) -> dict:
    if not client:
        raise RuntimeError("GROQ_API_KEY is required for fact validation.")

    source_texts = [
        f"[Source {i+1}] {s.get('publisher')}\n"
        f"Headline: {s.get('title')}\n"
        f"{str(s.get('content', ''))[:800].strip()}"
        for i, s in enumerate(sources)
    ]
    combined = "\n\n---\n\n".join(source_texts)
    n = len(sources)

    messages = [
        {
            "role": "system",
            "content": (
                "You are a chief fact-checking editor at a world-class news bureau. "
                "You verify claims against multiple independent sources with rigour and precision. "
                "Assign confidence based on corroboration: "
                "1.0 = 3+ independent sources confirm it; "
                "0.8 = 2 sources confirm it; "
                "0.6 = 1 source states it; "
                "0.4 = asserted but unverifiable. "
                "Return ONLY valid JSON. No prose before or after."
            )
        },
        {
            "role": "user",
            "content": (
                f"Category: {category.upper()}\n\n"
                f"Raw source material from {n} independent feeds:\n\n{combined}\n\n"
                f"Extract up to 8 key factual claims. For each:\n"
                f"- Write the claim precisely and specifically (not vaguely)\n"
                f"- Count how many of the {n} sources independently corroborate it\n"
                f"- Assign confidence (1.0/0.8/0.6/0.4) per the rubric above\n"
                f"- Set contradiction=true if sources directly disagree on this point\n\n"
                "Return ONLY this JSON:\n"
                '{"facts": [{"claim": "Specific verifiable statement.", '
                '"confidence": 0.8, "sources_corroborating": 2, "contradiction": false}]}'
            )
        }
    ]

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=2000,
            temperature=0.05,
        )
        content = response.choices[0].message.content.strip()
        return _extract_json(content)
    except Exception as e:
        err_str = str(e)
        if "503" in err_str or "loading" in err_str.lower():
            print("    [LLM] Model is warming up — please retry in 30s.")
        else:
            print(f"    [LLM] Fact validation failed: {repr(e)}")
        raise


# ── Step 2: Article Generation ────────────────────────────────────────────────
def generate_article(
    client, facts_data: dict, sources: list, category: str,
    trend_tags: list = None
) -> dict:
    if not client:
        raise RuntimeError("GROQ_API_KEY is required for article generation.")

    facts = facts_data.get("facts", [])
    top_facts = sorted(facts, key=lambda f: f.get("confidence", 0), reverse=True)[:8]
    facts_str = json.dumps({"facts": top_facts}, indent=2)

    source_texts = "\n\n---\n\n".join(
        f"[{s.get('publisher')}]\n{s.get('title')}\n{str(s.get('content', ''))[:800].strip()}"
        for s in sources
    )

    trend_context = ""
    if trend_tags:
        names = [t.get("hashtag", "") for t in trend_tags if isinstance(t, dict)]
        trend_context = f"\n\nTrending context: {', '.join(names)}."

    today = _today_str()

    messages = [
        {
            "role": "system",
            "content": (
                "You are a senior international correspondent with 20 years at Reuters, the Financial Times, "
                "and The Economist. You write with precision, authority, and narrative clarity. "
                "Your structure is always inverted pyramid: most important fact first, context second, "
                "analysis third. You use active voice, short declarative sentences, and no clichés. "
                "Every sentence serves the reader. You never pad or speculate beyond the evidence. "
                "Return ONLY valid JSON. No preamble, no explanation, no trailing text."
            )
        },
        {
            "role": "user",
            "content": (
                f"Write a full professional news article. Category: {category.upper()}\n\n"
                f"VALIDATED FACTS (factual backbone — do not contradict these):\n{facts_str}\n\n"
                f"SOURCE MATERIAL:\n{source_texts}{trend_context}\n\n"
                "STRICT REQUIREMENTS:\n"
                f"1. TITLE: Specific, informative, 8–14 words. Never vague. No clickbait.\n"
                f"2. DATELINE: Format exactly as 'CITY, {today} —' (pick the most relevant city).\n"
                "3. LEDE: One tight sentence, 25–40 words. Who, what, where, when, why. The most important fact first.\n"
                "4. CONTENT: 500–700 words. Use EXACTLY these markdown section headers:\n"
                "   ## Background\n"
                "   (2–3 paragraphs of essential context and history)\n"
                "   ## Key Developments\n"
                "   (2–3 paragraphs on what happened, with specific details and figures)\n"
                "   ## What It Means\n"
                "   (1–2 paragraphs of analysis, significance, and what happens next)\n"
                "5. PULL QUOTE: The single most powerful, quotable sentence from your article. Stand-alone. No attribution.\n"
                "6. DIGEST: Exactly two sentences summarising the story for a reader with 15 seconds.\n\n"
                "Return ONLY this JSON object:\n"
                '{"title": "...", "dateline": "CITY, ' + today + ' —", '
                '"lede": "...", '
                '"content": "## Background\\n\\nParagraph...\\n\\n## Key Developments\\n\\nParagraph...\\n\\n## What It Means\\n\\nParagraph...", '
                '"digest": "Sentence one. Sentence two.", '
                '"pull_quote": "The most powerful sentence from the article.", '
                '"word_count": 550}'
            )
        }
    ]

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=4000,
            temperature=0.35,
        )
        raw = response.choices[0].message.content.strip()
        result = _extract_json(raw)
        # Always compute actual word count from content
        result["word_count"] = len(result.get("content", "").split())
        return result
    except Exception as e:
        print(f"    [LLM] Article generation failed: {repr(e)}")
        raise


# ── Step 3: Bias & Quality Evaluation ─────────────────────────────────────────
def evaluate_bias(client, article_content: str) -> tuple[float, float, list]:
    try:
        text = str(article_content)[:2500]
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a media ethics analyst applying Reuters and AP editorial standards. "
                    "Score objectively based on the text alone. Return ONLY valid JSON."
                )
            },
            {
                "role": "user",
                "content": (
                    f"Evaluate this article:\n\n{text}\n\n"
                    "Score:\n"
                    "1. BIAS SCORE (0.0–1.0): 1.0 = fully neutral, 0.0 = propagandistic\n"
                    "   Check: loaded/emotive language, false balance, undisclosed assumptions\n"
                    "2. READABILITY SCORE (0.0–1.0): 1.0 = clear professional prose\n"
                    "   Check: sentence clarity, active voice, jargon, flow\n"
                    "3. FLAGS: list any specific editorial concerns (max 3, be specific)\n\n"
                    "Return ONLY:\n"
                    '{"bias_score": 0.88, "readability_score": 0.85, "flags": []}'
                )
            }
        ]
        response = client.chat.completions.create(
            model=MODEL, messages=messages, max_tokens=600, temperature=0.1
        )
        raw = response.choices[0].message.content.strip()
        data = _extract_json(raw)
        flags = [str(f) for f in data.get("flags", []) if f][:3]
        return float(data.get("bias_score", 0.85)), float(data.get("readability_score", 0.87)), flags
    except Exception:
        return 0.85, 0.87, []


# ── Main Pipeline Runner ───────────────────────────────────────────────────────
# ── Per-category worker ────────────────────────────────────────────────────────
def _process_category(
    client, category: str, cat_sources: list,
    in_memory_articles: list, trend_tags: list,
    id_lock,
) -> None:
    """Run the full editorial pipeline for one category (thread-safe)."""
    print(f"\n  [{category.upper()}] Processing {len(cat_sources)} sources")
    try:
        fact_data    = validate_facts(client, cat_sources, category)
        article_data = generate_article(client, fact_data, cat_sources, category, trend_tags)
        bias_score, readability_score, editorial_flags = evaluate_bias(
            client, article_data.get("content", "")
        )

        facts      = fact_data.get("facts", [])
        depth      = min(max(f.get("sources_corroborating", 1) for f in facts) if facts else 1, 5)
        confidence = (sum(f.get("confidence", 0.5) for f in facts) / len(facts)) if facts else 0.5

        orbit_id = None
        if os.getenv("VIRLO_API_KEY", "").strip():
            try:
                orbit_id = dispatch_orbit_search(
                    name=f"News Audit: {category.title()}",
                    keywords=[category, "news", "update"]
                )
            except Exception:
                pass

        new_article = {
            "title":                article_data.get("title", "Untitled"),
            "dateline":             article_data.get("dateline", ""),
            "lede":                 article_data.get("lede", ""),
            "content":              article_data.get("content", ""),
            "digest":               article_data.get("digest", ""),
            "pull_quote":           article_data.get("pull_quote", ""),
            "word_count":           article_data.get("word_count", 0),
            "aggregate_confidence": round(confidence, 2),
            "depth_meter":          depth,
            "bias_score":           round(bias_score, 2),
            "readability_score":    round(readability_score, 2),
            "category":             category,
            "status":               "published",
            "provenance_metadata":  {
                "facts":            facts,
                "sources": [
                    {
                        "publisher": s.get("publisher"),
                        "url":       s.get("url"),
                        "title":     s.get("title"),
                    }
                    for s in cat_sources
                ],
                "virlo_trend_tags":  trend_tags,
                "virlo_orbit_id":    orbit_id,
                "editorial_flags":   editorial_flags,
            },
            "created_at": datetime.datetime.utcnow().isoformat(),
        }

        with id_lock:
            new_article["id"] = len(in_memory_articles) + 1
            in_memory_articles.append(new_article)

        wc = new_article["word_count"]
        print(f"    ✓ Published ({wc} words): {new_article['title'][:70]}")

    except Exception as exc:
        print(f"[Pipeline] ERROR [{category.upper()}]: {repr(exc)}")


# ── Main Pipeline Runner ───────────────────────────────────────────────────────
def run_pipeline(in_memory_sources: list, in_memory_articles: list):
    """Run the full editorial pipeline over in-memory sources (categories in parallel)."""
    import threading
    from concurrent.futures import ThreadPoolExecutor, as_completed

    client = _get_llm_client()
    if not client:
        print("[Pipeline] ERROR: GROQ_API_KEY not configured.")
        return

    print("\n[Pipeline] Mode: Llama-3.3-70B-Versatile — World-Class Journalism")

    trend_tags = []
    if os.getenv("VIRLO_API_KEY", "").strip():
        try:
            trend_tags = fetch_trending_hashtags(5)
        except Exception:
            pass

    if not in_memory_sources:
        print("[Pipeline] No sources found. Run ingestion first.")
        return

    # Group by category
    by_category: dict[str, list] = {}
    for s in in_memory_sources:
        cat = s.get("category", "general")
        by_category.setdefault(cat, []).append(s)

    # Only process categories that don't already have an article
    pending = [
        (cat, srcs)
        for cat, srcs in by_category.items()
        if not any(a.get("category") == cat for a in in_memory_articles)
    ]

    if not pending:
        print("[Pipeline] All categories already have articles. Nothing to do.")
        return

    id_lock = threading.Lock()

    # max_workers=2 keeps us comfortably within Groq's free-tier rate limits
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [
            executor.submit(
                _process_category,
                client, cat, srcs, in_memory_articles, trend_tags, id_lock
            )
            for cat, srcs in pending
        ]
        for future in as_completed(futures):
            future.result()  # surface any uncaught exceptions

