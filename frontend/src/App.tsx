// App.tsx — Veritas AI Intelligence Wire
import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import {
  fetchArticles, fetchArticle, fetchDigest, fetchPipelineStatus,
  triggerFullPipeline,
  type ArticleSummary, type ArticleDetail, type DigestItem, type PipelineStatus,
} from './api';
import ArticleCard from './components/ArticleCard';
import ArticleModal from './components/ArticleModal';
import DigestStrip from './components/DigestStrip';

const CATEGORIES = ['all', 'geopolitics', 'finance', 'environment', 'science', 'technology', 'health'];

type View = 'feed' | 'about';

// ── Skeleton loader ────────────────────────────────────────────────
function SkeletonCard({ featured = false }: { featured?: boolean }) {
  return (
    <div className="skeleton-card" style={{ gridColumn: featured ? 'span 8' : 'span 4' }}>
      <div className="skeleton" style={{ height: 16, width: '35%' }} />
      <div className="skeleton" style={{ height: 10, width: '55%', marginTop: 2 }} />
      <div className="skeleton" style={{ height: 26, width: '90%', marginTop: 6 }} />
      <div className="skeleton" style={{ height: 26, width: '70%' }} />
      <div className="skeleton" style={{ height: 13, width: '100%', marginTop: 8 }} />
      <div className="skeleton" style={{ height: 13, width: '85%' }} />
      <div className="skeleton" style={{ height: 13, width: '65%' }} />
      <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton" style={{ height: 11, width: '30%' }} />
        <div className="skeleton" style={{ height: 11, width: '22%' }} />
      </div>
    </div>
  );
}

// ── About page ─────────────────────────────────────────────────────
function AboutPage() {
  return (
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
              <span className="step-num">{i + 1}</span>
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
  );
}

// ── Main App ───────────────────────────────────────────────────────
export default function App() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [digest, setDigest] = useState<DigestItem[]>([]);
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleDetail | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [view, setView] = useState<View>('feed');
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 6000);
  };

  const loadAll = useCallback(async (cat = activeCategory) => {
    try {
      const [arts, dig, stat] = await Promise.all([
        fetchArticles(cat),
        fetchDigest().catch(() => [] as DigestItem[]),
        fetchPipelineStatus().catch(() => null),
      ]);
      setArticles(arts);
      setDigest(dig);
      if (stat) setStatus(stat);
    } catch {
      showToast('Could not reach the backend — is Render awake?');
    }
  }, [activeCategory]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadAll('all').finally(() => setLoading(false));
  }, []);

  // Category filter
  useEffect(() => {
    if (!loading) {
      fetchArticles(activeCategory).then(setArticles).catch(() => {});
    }
  }, [activeCategory]); // eslint-disable-line

  // Open article modal
  const openArticle = async (id: number) => {
    setModalLoading(true);
    try {
      const detail = await fetchArticle(id);
      setSelectedArticle(detail);
    } catch {
      showToast('Failed to load article.');
    } finally {
      setModalLoading(false);
    }
  };

  // Stop any running poll
  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Run full pipeline with smart polling
  const handleGenerate = async () => {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    showToast('⚡ Editorial pipeline starting — ingesting 90 live sources…');
    stopPoll();

    try {
      await triggerFullPipeline();
      showToast('✍ AI journalist is writing — articles appear in ~90s');

      let prevCount = articles.length;
      let attempts = 0;

      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const stat = await fetchPipelineStatus();
          if (stat) setStatus(stat);

          if (stat.article_count > prevCount || attempts >= 12) {
            stopPoll();
            await loadAll('all');
            setPipelineRunning(false);
            if (stat.article_count > prevCount) {
              showToast(`✓ ${stat.article_count - prevCount} new article(s) published.`);
            } else {
              showToast('✓ Pipeline complete. Refresh the feed.');
            }
          }
        } catch { /* backend may be processing */ }
      }, 10000);

    } catch {
      showToast('Pipeline error — check Render logs.');
      setPipelineRunning(false);
      stopPoll();
    }
  };

  // Cleanup on unmount
  useEffect(() => () => stopPoll(), []);

  const now = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).toUpperCase();

  return (
    <>
      {/* ── Masthead ── */}
      <header className="masthead">
        <div className="masthead-inner">
          <div className="masthead-brand">
            <span className="brand-name">VERITAS</span>
            <span className="brand-sub">AI Intelligence Wire</span>
          </div>

          <div className="masthead-center">
            <span className="masthead-date">{now}</span>
            <div className="masthead-badge">
              <span className="live-dot" />
              Live · AI-Generated · Fully Transparent
            </div>
          </div>

          <nav className="masthead-nav">
            <button className={`nav-btn ${view === 'feed' ? 'active' : ''}`} onClick={() => setView('feed')}>
              Feed
            </button>
            <button className={`nav-btn ${view === 'about' ? 'active' : ''}`} onClick={() => setView('about')}>
              About
            </button>
            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={pipelineRunning}
              id="generate-article-btn"
            >
              {pipelineRunning ? '⏳ Running…' : '⚡ Run Pipeline'}
            </button>
          </nav>
        </div>
      </header>

      {/* ── Status bar ── */}
      {status && (
        <div className="status-bar">
          <div className="status-bar-inner">
            <span className="status-item">
              <strong>{status.article_count}</strong> articles published
            </span>
            <span className="status-item">·</span>
            <span className="status-item">
              <strong>{status.source_count}</strong> sources ingested
            </span>
            <span className="status-item">·</span>
            <span className="status-item" style={{ color: 'var(--green)' }}>
              ● API online
            </span>
            {pipelineRunning && (
              <>
                <span className="status-item">·</span>
                <span className="status-item" style={{ color: 'var(--amber)' }}>
                  ⏳ Pipeline running
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Digest ticker ── */}
      {digest.length > 0 && (
        <DigestStrip items={digest} onItemClick={openArticle} />
      )}

      {/* ── Main content ── */}
      <main className="main-layout">
        {view === 'about' ? (
          <AboutPage />
        ) : (
          <>
            {/* Category tabs */}
            <div className="category-bar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                  id={`cat-${cat}`}
                >
                  {cat === 'all' ? 'All Topics' : cat}
                </button>
              ))}
            </div>

            {/* Article grid */}
            <div className="article-grid">
              {loading ? (
                <>
                  <SkeletonCard featured />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : articles.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-masthead">VERITAS AI</div>
                  <h3>The Intelligence Wire</h3>
                  <p className="empty-mission">
                    Serious, AI-generated reporting built on live RSS ingestion, automated
                    fact-checking, and editorial standards that rival the world's best newsrooms —
                    with full source transparency on every article.
                  </p>
                  <p className="empty-hint">
                    Click <strong>Run Pipeline</strong> to ingest live sources and generate
                    your first articles. The full pipeline takes about 90 seconds.
                  </p>
                  <button className="empty-action-btn" onClick={handleGenerate} disabled={pipelineRunning}>
                    {pipelineRunning ? '⏳ Pipeline Running…' : '⚡ Run Editorial Pipeline'}
                  </button>
                  <p className="empty-sources">
                    Sources: BBC · Reuters · The Guardian · NASA · WHO · ScienceDaily ·
                    arXiv · Ars Technica · MIT Tech Review · MarketWatch · and more
                  </p>
                </div>
              ) : (
                articles.map((a, i) => (
                  <ArticleCard
                    key={a.id}
                    article={a}
                    featured={i === 0}
                    onClick={() => openArticle(a.id)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-brand">VERITAS AI</span>
          <span className="footer-copy">
            Every article is AI-generated with full source transparency · {new Date().getFullYear()}
          </span>
          <span className="footer-copy">
            {status ? `${status.source_count} sources · ${status.article_count} articles` : 'Connecting…'}
          </span>
        </div>
      </footer>

      {/* ── Article modal (loading state) ── */}
      {modalLoading && (
        <div className="modal-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>
            Loading article…
          </div>
        </div>
      )}

      {selectedArticle && !modalLoading && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}
