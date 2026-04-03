// App.tsx — Veritas AI Intelligence Wire
import { useState, useEffect, useCallback } from 'react';
import './App.css';
import {
  fetchArticles, fetchArticle, fetchDigest, fetchPipelineStatus,
  triggerIngest, triggerPipeline,
  type ArticleSummary, type ArticleDetail, type DigestItem, type PipelineStatus,
} from './api';
import ArticleCard from './components/ArticleCard';
import ArticleModal from './components/ArticleModal';
import DigestStrip from './components/DigestStrip';

const CATEGORIES = ['all', 'geopolitics', 'finance', 'environment', 'science'];

type View = 'feed' | 'about';

// ── Skeleton loader ────────────────────────────────────────────────
function SkeletonCard({ featured = false }: { featured?: boolean }) {
  return (
    <div className="skeleton-card" style={{ gridColumn: featured ? 'span 8' : 'span 4' }}>
      <div className="skeleton" style={{ height: 20, width: '40%' }} />
      <div className="skeleton" style={{ height: 28, width: '90%', marginTop: 4 }} />
      <div className="skeleton" style={{ height: 28, width: '75%' }} />
      <div className="skeleton" style={{ height: 14, width: '100%', marginTop: 8 }} />
      <div className="skeleton" style={{ height: 14, width: '80%' }} />
      <div className="skeleton" style={{ height: 14, width: '60%' }} />
      <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton" style={{ height: 12, width: '30%' }} />
        <div className="skeleton" style={{ height: 12, width: '20%' }} />
      </div>
    </div>
  );
}

// ── About page ─────────────────────────────────────────────────────
function AboutPage() {
  return (
    <div className="about-section">
      <h1>Veritas AI</h1>
      <p className="about-subtitle">The Intelligence Wire — AI-native journalism with radical transparency.</p>

      <div className="about-block">
        <h2>Editorial Philosophy</h2>
        <p>
          Veritas AI produces serious, trustworthy reporting generated entirely by AI, applying the rigour and
          depth of world-class newsrooms. Every article exposes its source trail, confidence scores, and
          validation steps — making the editorial process fully transparent to readers.
        </p>
        <p>
          We treat AI-generated news not as a novelty but as a credibility challenge to be solved through
          transparency, multi-source corroboration, and automated bias detection.
        </p>
      </div>

      <div className="about-block">
        <h2>The Editorial Pipeline</h2>
        <p>
          When configured with a Virlo developer key, Veritas AI also pulls live social intelligence signals from the Virlo API to help the editorial pipeline frame stories against trending audience behaviour.
        </p>
        <div className="pipeline-steps">
          {[
            ['Data Ingestion', 'Live RSS feeds from NASA, Reuters, BBC, The Guardian, WHO, ScienceDaily, arXiv, and more are parsed and normalised into structured source records.'],
            ['Fact Validation', 'An LLM extracts key claims from all sources and cross-checks them for corroboration. Each fact receives a confidence score (0–100%) and a contradiction flag.'],
            ['Article Generation', 'A GPT-4o correspondent produces a full-length article with: strong inverted-pyramid lede, balanced perspectives, contextual background, and section structure.'],
            ['Bias & QC Evaluation', 'A second LLM pass evaluates the draft for slanted language, sensationalism, and omissions — producing a bias score and readability score.'],
            ['Publishing', 'The article is published with its full provenance record: source trail, validated facts, confidence scores, depth meter, and bias gauge — all visible to readers.'],
          ].map(([title, desc], i) => (
            <div key={i} className="pipeline-step">
              <span className="step-num">{i + 1}</span>
              <span className="step-text"><strong>{title}:</strong> {desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="about-block">
        <h2>Transparency Metrics</h2>
        <p><strong>Confidence Score</strong> — Average confidence across all validated facts for an article.</p>
        <p><strong>Depth Meter (1–5)</strong> — Maximum number of independent sources corroborating any single claim. A depth of 3+ indicates strong multi-source corroboration.</p>
        <p><strong>Bias Score</strong> — LLM-evaluated neutrality. 85%+ = neutral; 70–84% = mild lean; below 70% = flagged for review.</p>
        <p><strong>Readability Score</strong> — Clarity and journalistic quality of prose.</p>
      </div>

      <div className="about-block">
        <h2>Data Sources</h2>
        <p>
          Veritas AI ingests from public RSS feeds operated by trusted institutions: NASA, the BBC, The Guardian,
          Reuters, WHO, ScienceDaily, arXiv, MarketWatch, and Yahoo Finance. No paywalled or unverified sources
          are used in the default pipeline.
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const loadArticles = useCallback(async (cat = activeCategory) => {
    try {
      const data = await fetchArticles(cat);
      setArticles(data);
    } catch {
      showToast('Could not load articles — is the backend running?');
    }
  }, [activeCategory]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchArticles('all').then(setArticles).catch(() => {}),
      fetchDigest().then(setDigest).catch(() => {}),
      fetchPipelineStatus().then(setStatus).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // Category filter
  useEffect(() => {
    if (!loading) loadArticles(activeCategory);
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

  // Run full pipeline (ingest + generate)
  const handleGenerate = async () => {
    setPipelineRunning(true);
    showToast('⚡ Ingesting live RSS feeds...');
    try {
      await triggerIngest();
      await new Promise(r => setTimeout(r, 2000));
      showToast('✍ AI editorial pipeline running...');
      await triggerPipeline();
      showToast('✓ Pipeline started — new articles will appear in ~30 seconds.');
      // Poll for updates
      setTimeout(async () => {
        await loadArticles('all');
        const d = await fetchDigest().catch(() => digest);
        setDigest(d);
        const s = await fetchPipelineStatus().catch(() => status);
        if (s) setStatus(s);
        setPipelineRunning(false);
        showToast('✓ Feed refreshed with new articles.');
      }, 35000);
    } catch {
      showToast('Pipeline error — check backend logs.');
      setPipelineRunning(false);
    }
  };

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
            <button
              className={`nav-btn ${view === 'feed' ? 'active' : ''}`}
              onClick={() => setView('feed')}
            >
              Feed
            </button>
            <button
              className={`nav-btn ${view === 'about' ? 'active' : ''}`}
              onClick={() => setView('about')}
            >
              About
            </button>
            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={pipelineRunning}
              id="generate-article-btn"
            >
              {pipelineRunning ? '⏳ Generating...' : '⚡ Generate'}
            </button>
          </nav>
        </div>
      </header>

      {/* ── Status bar ── */}
      {status && (
        <div className="status-bar">
          <div className="status-bar-inner">
            <span className="status-item">
              <strong>{status.article_count}</strong> published
            </span>
            <span className="status-item">·</span>
            <span className="status-item">
              <strong>{status.source_count}</strong> sources ingested
            </span>
            <span className="status-item">·</span>
            <span className="status-item" style={{ color: 'var(--green)' }}>
              ● API online
            </span>
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
            {/* Category filter */}
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
                  <h3>No articles yet</h3>
                  <p>
                    Click Generate to trigger the live AI news pipeline and create your first transparent reports.
                  </p>
                  <button className="empty-action-btn" onClick={handleGenerate} disabled={pipelineRunning}>
                    {pipelineRunning ? '⏳ Generating...' : '⚡ Generate First Articles'}
                  </button>
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
            {status ? `${status.source_count} sources · ${status.article_count} articles` : 'Loading...'}
          </span>
        </div>
      </footer>

      {/* ── Article modal ── */}
      {modalLoading && (
        <div className="modal-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>
            Loading article...
          </div>
        </div>
      )}
      {selectedArticle && !modalLoading && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}
