import Link from 'next/link';

export default function AboutPage() {
  return (
    <div style={{ padding: '0px', width: '100%', minHeight: '100vh', background: 'var(--bg-deep)' }}>
      <header className="masthead">
        <div className="masthead-inner">
          <div className="masthead-brand">
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
              <span className="brand-name">VERITAS</span>
              <span className="brand-sub">Neural Newsroom</span>
            </Link>
          </div>
          <div className="masthead-center">
             <Link href="/" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 600, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
               ← Back to Feed
             </Link>
          </div>
        </div>
      </header>

      <div style={{ padding: '40px', maxWidth: 1000, margin: '0 auto' }}>
        <div className="about-section">
          <h1>Veritas AI</h1>
          <p className="about-subtitle">The Intelligence Wire — AI-native journalism with radical editorial transparency.</p>

          <div className="about-block">
            <h2>Editorial Philosophy</h2>
            <p>
              Veritas AI produces serious, trustworthy reporting generated entirely by AI — applying the rigour,
              structure, and depth of world-class newsrooms. Every article is built on multi-source corroboration,
              automated fact-validation, and bias detection. No human editor sits in the chain; the editorial
              standards are baked into the pipeline itself.
            </p>
            <p>
              We treat AI-generated journalism not as a novelty, but as a credibility challenge to be solved through
              radical transparency: every article exposes its source trail, its validated facts, its confidence scores,
              and its editorial flags — so readers can hold the reporting to account.
            </p>
          </div>

          <div className="about-block">
            <h2>The Editorial Pipeline</h2>
            <div className="pipeline-steps">
              {[
                ['RSS Ingestion', 'Live feeds from 18 trusted sources — BBC, Reuters, The Guardian, NASA, WHO, ScienceDaily, arXiv, MIT Technology Review, Ars Technica, and more — are parsed and normalised into structured source records.'],
                ['Fact Validation', 'Llama-3.3-70B extracts up to 8 key claims from the source material. Each fact is scored by corroboration count (1.0 = 3+ independent sources) and flagged if sources contradict.'],
                ['Article Generation', 'A senior-correspondent persona writes a 500–700-word article with dateline, inverted-pyramid lede, three structured sections (Background · Key Developments · What It Means), and a pull quote — all grounded in the validated facts.'],
                ['Bias & QC Evaluation', 'A second LLM pass scores neutrality and readability against Reuters editorial standards, and produces a list of specific editorial flags (e.g. "loaded language in paragraph 2").'],
                ['Publishing', 'The article is published with its full provenance record: source trail, validated facts, confidence scores, depth meter, neutrality gauge, and editorial flags — all visible to readers.'],
              ].map(([title, desc], i) => (
                <div key={i} className="pipeline-step">
                  <span className="step-num" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)', fontSize: 12, fontWeight: 700,
                    marginRight: 16, flexShrink: 0
                  }}>{i + 1}</span>
                  <span className="step-text"><strong>{title}:</strong> {desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="about-block">
            <h2>Transparency Metrics Explained</h2>
            <p><strong>Confidence Score</strong> — Average confidence across all validated facts (1.0 = corroborated by 3+ independent sources; 0.6 = single-source claim).</p>
            <p><strong>Depth Meter (1–5)</strong> — Maximum independent-source corroboration for any single claim. A depth of 3+ indicates strong multi-source verification.</p>
            <p><strong>Neutrality Score</strong> — LLM assessment against Reuters standards. 85%+ = neutral; 70–84% = mild lean; below 70% = flagged for editorial review.</p>
            <p><strong>Readability Score</strong> — Clarity and journalistic quality of the prose: active voice, sentence variety, absence of jargon.</p>
            <p><strong>Editorial Flags</strong> — Specific issues identified by the bias evaluator, such as "loaded language" or "missing official response."</p>
          </div>

          <div className="about-block">
            <h2>Ask the Reporter</h2>
            <p>
              Each article includes an AI Q&A panel where you can interrogate the reporting. The AI answers only
              from the article's content — it will not speculate, hallucinate, or add external information.
              If the article doesn't address your question, it says so.
            </p>
          </div>

          <div className="about-block">
            <h2>Data Sources</h2>
            <p>
              Veritas AI ingests exclusively from public RSS feeds operated by trusted institutions and outlets:
              NASA, BBC, The Guardian, Reuters, WHO, ScienceDaily, arXiv, MarketWatch, Yahoo Finance,
              The Verge, Ars Technica, MIT Technology Review, and MedlinePlus.
              No paywalled, unverified, or social-media sources are used.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
