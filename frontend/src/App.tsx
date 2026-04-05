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
import VirloFeedIntelligence from './components/VirloFeedIntelligence';
import FeedQAWidget from './components/FeedQAWidget';

// ── API Key Block Screen ───────────────────────────────────────────────────
function ApiKeyBlockScreen() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'var(--bg-deep)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      textAlign: 'center',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,64,64,0.08) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      {/* 400 badge */}
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 96,
        fontWeight: 900,
        color: 'var(--red)',
        opacity: 0.15,
        lineHeight: 1,
        letterSpacing: '-0.04em',
        userSelect: 'none',
        marginBottom: 8,
      }}>400</div>

      {/* Lock icon */}
      <div style={{ fontSize: 48, marginBottom: 16 }}>&#128274;</div>

      {/* Brand */}
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: '0.18em',
        color: 'var(--gold)',
        textTransform: 'uppercase',
        marginBottom: 24,
      }}>Veritas AI — Intelligence Wire</div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 28,
        fontWeight: 700,
        color: 'var(--text-primary)',
        maxWidth: 520,
        lineHeight: 1.3,
        marginBottom: 16,
      }}>
        API Key Required
      </h1>

      {/* Description */}
      <p style={{
        fontSize: 15,
        color: 'var(--text-secondary)',
        maxWidth: 480,
        lineHeight: 1.7,
        marginBottom: 32,
      }}>
        This platform requires a <strong style={{ color: 'var(--text-primary)' }}>Groq API key</strong> to
        power its AI-native editorial pipeline.&nbsp;
        Add your key to the backend <code style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 4,
          padding: '1px 6px',
          fontSize: 13,
          color: 'var(--amber)',
        }}>.env</code> file and restart the server.
      </p>

      {/* Instructions card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        maxWidth: 480,
        width: '100%',
        marginBottom: 28,
        textAlign: 'left',
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 14,
        }}>Setup instructions</div>

        {[
          ['1', 'Get a free key', 'Visit console.groq.com/keys and sign up'],
          ['2', 'Open .env', 'backend/.env in this project'],
          ['3', 'Add the key', 'GROQ_API_KEY=your_key_here'],
          ['4', 'Restart server', 'uvicorn main:app --reload'],
        ].map(([num, title, desc]) => (
          <div key={num} style={{
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
            marginBottom: 14,
          }}>
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--red-dim)',
              border: '1px solid var(--red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--red)',
              flexShrink: 0,
              marginTop: 1,
            }}>{num}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <a
        href="https://console.groq.com/keys"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--gold)',
          color: '#07080D',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 700,
          padding: '10px 24px',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        Get Free Groq API Key →
      </a>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
        Free tier · 300 req/min · No credit card required
      </p>
    </div>
  );
}

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

      <div className="about-block">
        <h2>Sponsors</h2>
        <p>
          Veritas AI is proudly powered and sponsored by <strong><a href="https://virlo.ai/?ref=awajiogak" target="_blank" rel="noopener noreferrer" style={{color: 'var(--amber)', textDecoration: 'none'}}>Virlo.ai</a></strong>.
          Virlo.ai enables our real-time trend enrichment and orbital intelligence signals, making the news surface as autonomous and context-aware as possible.
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
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

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
    } catch (err: any) {
      // Re-throw missing-key errors so the caller can show the block screen
      if (err?.message && err.message.toLowerCase().includes('groq_api_key')) throw err;
      showToast('Could not reach the backend — is Render awake?');
    }
  }, [activeCategory]);

  // Initial load — also detects missing API key
  useEffect(() => {
    setLoading(true);
    loadAll('all')
      .catch((err: Error) => {
        if (err.message && err.message.toLowerCase().includes('groq_api_key')) {
          setApiKeyMissing(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Autonomous trigger if empty
  useEffect(() => {
    if (!loading && articles.length === 0 && !pipelineRunning) {
      handleGenerate();
    }
  }, [loading, articles.length, pipelineRunning]); // eslint-disable-line

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
      showToast('✍ AI journalist is writing — articles will begin appearing shortly');

      let prevCount = articles.length;
      let attempts = 0;

      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const stat = await fetchPipelineStatus();
          if (stat) setStatus(stat);

          // Stream articles in as they finish:
          if (stat && stat.article_count > prevCount) {
            await loadAll('all');
            prevCount = stat.article_count;
          }

          // Stop ONLY when the backend says it's totally done running, OR it times out heavily
            if ((stat && stat.status === 'ready' && attempts > 2) || attempts >= 40) {
              stopPoll();
              await loadAll('all');
              setPipelineRunning(false);
              showToast('✓ Pipeline complete. All topics generated.');
            }
          } catch { /* backend may be processing */ }
        }, 10000);

    } catch (e: any) {
      showToast(e.message || 'Pipeline error — check Render logs.');
      setPipelineRunning(false);
      stopPoll();
    }
  };

  // Cleanup on unmount
  useEffect(() => () => stopPoll(), []);

  const now = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).toUpperCase();

  // Hard block if key is missing
  if (apiKeyMissing) return <ApiKeyBlockScreen />;

  return (
    <>
      {/* ── Masthead ── */}
      <header className="masthead">
        <div className="masthead-inner">
          <div className="masthead-brand" onClick={() => window.location.href = '/'} style={{ cursor: 'pointer' }}>
            <span className="brand-name">VERITAS</span>
            <span className="brand-sub">AI Intelligence Wire</span>
          </div>

          <div className="masthead-center">
            <span className="masthead-date">{now}</span>
            <div className="masthead-badge">
              <span className="live-dot" />
              Live · AI-Generated · Fully Transparent
            </div>
            <div className="masthead-badge" style={{ marginLeft: 10, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--amber)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              Sponsored by <a href="https://virlo.ai/?ref=awajiogak" target="_blank" rel="noopener noreferrer" style={{color: 'inherit', textDecoration: 'none', fontWeight: 600}}>Virlo.ai</a>
            </div>
          </div>

          <nav className="masthead-nav">
            <button className={`nav-btn ${view === 'feed' ? 'active' : ''}`} onClick={() => setView('feed')}>
              Feed
            </button>
            <button className={`nav-btn ${view === 'about' ? 'active' : ''}`} onClick={() => setView('about')}>
              About
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

            {/* Virlo Feed Intelligence */}
            {articles.length > 0 && <VirloFeedIntelligence articles={articles} />}

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
                  <h3>Autonomous Newsroom Booting...</h3>
                  <p className="empty-mission" style={{ color: 'var(--amber)', fontSize: '1.1rem', marginTop: '1rem' }}>
                    <strong>Live Generation in Progress</strong>
                  </p>
                  <p className="empty-mission">
                    Our AI is currently ingesting live feeds from global sources (Reuters, BBC, NASA) 
                    and actively fact-checking claims to write new articles. 
                  </p>
                  <p className="empty-hint">
                    Articles will automatically stream into this dashboard shortly. 
                    Please leave this page open.
                  </p>
                  <div style={{ marginTop: '2rem' }}>
                    <div className="pulse-loader" style={{ width: 40, height: 40, border: '3px solid var(--amber)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                  </div>
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
            Sponsored proudly by <a href="https://virlo.ai/?ref=awajiogak" target="_blank" rel="noopener noreferrer" style={{color: 'inherit'}}>Virlo.ai</a>
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

      {/* ── Feed Conversational Layer ── */}
      {view === 'feed' && <FeedQAWidget />}

      {/* ── Toast ── */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}
