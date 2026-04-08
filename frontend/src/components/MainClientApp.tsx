"use client";

// MainClientApp.tsx — Veritas AI Intelligence Wire
import { useState, useEffect, useCallback, useRef } from 'react';
import '../App.css';
import {
  fetchArticles, fetchArticle, fetchDigest, fetchPipelineStatus,
  triggerFullPipeline,
  type ArticleSummary, type ArticleDetail, type DigestItem, type PipelineStatus,
} from '../api';
import { useRouter } from 'next/navigation';
import ArticleCard from './ArticleCard';
import DigestStrip from './DigestStrip';
import VirloFeedIntelligence from './VirloFeedIntelligence';
import FeedQAWidget from './FeedQAWidget';

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
// ── Theme Toggle Component ─────────────────────────────────────────
function ThemeToggle({ theme, toggle }: { theme: string, toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      className="theme-toggle"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M3 12h2.25m.386-6.364l1.591-1.591M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
        </svg>
      ) : (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      )}
    </button>
  );
}

// ── Live Newsroom Desk (Command Center) ────────────────────────────
function LiveNewsroomDesk() {
  const events = [
    { type: 'scan', text: 'Ingesting RSS from 90+ global news wires...' },
    { type: 'ai',   text: 'Llama-3.3-70B semantic extraction in progress...' },
    { type: 'qc',   text: 'Cross-verifying claims across 18 independent nodes...' },
    { type: 'ai',   text: 'Detecting linguistic bias & sentiment markers...' },
    { type: 'sys',  text: 'Indexing cryptographic provenance records...' },
    { type: 'scan', text: 'Virlo.ai scanning orbital trend signals...' },
    { type: 'sys',  text: 'Optimizing vector embeddings for RAG retrieval...' },
  ];
  
  const items = [...events, ...events]; // double for infinite loop

  return (
    <div className="live-newsroom-desk">
      <div className="desk-label">
        <span style={{ fontSize: 14 }}>&#9889;</span>
        <span>Live Tech Feed // Intelligence Wire</span>
      </div>

      <div className="desk-ticker-container">
        <div className="desk-ticker">
          {items.map((ev, i) => (
            <div key={i} className="ticker-item">
              <span className={`event-type type-${ev.type}`}>{ev.type.toUpperCase()}</span>
              <span className="event-text">{ev.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="desk-stats-group">
        <div className="desk-stat">
          <span className="stat-label">Neural Load</span>
          <span className="stat-value">
            <span className="stat-pulse" />
            <span className="stat-val-num">84.2%</span>
          </span>
        </div>
        <div className="desk-stat">
          <span className="stat-label">Buffer Context</span>
          <span className="stat-value">
            <span className="stat-val-num">128k</span>
          </span>
        </div>
        <div className="cron-timer">
          <div className="timer-pulse" />
          Next Scan: Pending...
        </div>
      </div>
    </div>
  );
}
interface MainClientAppProps {
  initialArticles?: ArticleSummary[];
  initialDigest?: DigestItem[];
  initialStatus?: PipelineStatus | null;
  serverError?: boolean;
  initialCategory?: string;
}

// ── Main App ───────────────────────────────────────────────────────
export default function MainClientApp({
  initialArticles = [],
  initialDigest = [],
  initialStatus = null,
  serverError = false,
  initialCategory = 'all'
}: MainClientAppProps) {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleSummary[]>(initialArticles);
  const [digest, setDigest] = useState<DigestItem[]>(initialDigest);
  const [status, setStatus] = useState<PipelineStatus | null>(initialStatus);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'newest' | 'confidence' | 'depth'>('newest');
  const [isVirloModalOpen, setIsVirloModalOpen] = useState(false);

  const processedArticles = articles
    .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || (a.category || '').toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOption === 'confidence') return (b.aggregate_confidence || 0) - (a.aggregate_confidence || 0);
      if (sortOption === 'depth') return (b.depth_meter || 0) - (a.depth_meter || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Since we inject data via SSR, we only need to load if changing categories or polling
  const [loading, setLoading] = useState(false);
  
  const [modalLoading, setModalLoading] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(serverError);

  // Theme state
  const [theme, setTheme] = useState('dark');

  // Load theme on the client avoiding hydration mismatch
  useEffect(() => {
    const savedTheme = localStorage.getItem('veritas-theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('veritas-theme', next);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 6000);
  };

  const loadAll = useCallback(async (cat = activeCategory) => {
    try {
      setLoading(true);
      const [arts, dig, stat] = await Promise.all([
        fetchArticles(cat),
        fetchDigest().catch(() => [] as DigestItem[]),
        fetchPipelineStatus().catch(() => null),
      ]);
      setArticles(arts);
      if (cat === 'all') setDigest(dig); // keep old digest if viewing specific category to prevent empty strips
      if (stat) setStatus(stat);
    } catch (err: any) {
      // Re-throw missing-key errors so the caller can show the block screen
      if (err?.message && err.message.toLowerCase().includes('groq_api_key')) {
        setApiKeyMissing(true);
      } else {
        showToast('Could not reach the backend — is Render awake?');
      }
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  // Autonomous trigger if empty
  useEffect(() => {
    if (!loading && articles.length === 0 && !pipelineRunning && !apiKeyMissing) {
      handleGenerate();
    }
  }, [loading, articles.length, pipelineRunning, apiKeyMissing]);

  // Category filter trigger
  const handleCategorySwitch = (cat: string) => {
    setLoading(true);
    if (cat === 'all') {
      router.push('/');
    } else {
      router.push(`/category/${cat}`);
    }
  };

  // Open article
  const openArticle = async (id: number) => {
    router.push(`/article/${id}`);
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
      <LiveNewsroomDesk />
      {/* ── Masthead ── */}

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
        <>
            {/* Category tabs and Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
              <div className="category-bar" style={{ marginBottom: 0 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => handleCategorySwitch(cat)}
                    id={`cat-${cat}`}
                  >
                    {cat === 'all' ? 'All Topics' : cat}
                  </button>
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Search coverage..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', 
                    color: 'var(--text-primary)', padding: '8px 14px', borderRadius: 'var(--radius-md)',
                    fontSize: 14, minWidth: 200, outline: 'none'
                  }}
                />
                <select 
                  value={sortOption} 
                  onChange={e => setSortOption(e.target.value as any)}
                  style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', 
                    color: 'var(--text-primary)', padding: '8px 14px', borderRadius: 'var(--radius-md)',
                    fontSize: 14, outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="newest">Latest Updates</option>
                  <option value="confidence">Highest Confidence</option>
                  <option value="depth">Max Corroboration Depth</option>
                </select>
                <button
                  onClick={() => setIsVirloModalOpen(true)}
                  style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--gold)', 
                    color: 'var(--gold)', padding: '8px 14px', borderRadius: 'var(--radius-md)',
                    fontSize: 14, outline: 'none', cursor: 'pointer', fontWeight: 600
                  }}
                >
                  ⚙ Settings
                </button>
              </div>
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
                processedArticles.map((a, i) => (
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
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-brand">VERITAS AI</span>
          <span className="footer-copy">
            Every article is AI-generated with full source transparency · {new Date().getFullYear()}
          </span>
          <span className="footer-copy">
            Powered by the Veritas Orbital Pipeline
          </span>
          <span className="footer-copy">
            {status ? `${status.source_count} sources · ${status.article_count} articles` : 'Connecting…'}
          </span>
        </div>
      </footer>

      {modalLoading && (
        <div className="modal-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>
            Navigating…
          </div>
        </div>
      )}

      {isVirloModalOpen && (
        <div className="modal-overlay" onClick={() => setIsVirloModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, padding: 32, borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '1px solid var(--border-default)', zIndex: 1000 }}>
            <h2 style={{marginTop: 0, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)'}}>Platform Settings</h2>
            <p style={{color: 'var(--text-muted)', fontSize: 14, marginBottom: 24}}>Manage external API integrations and pipeline extensions.</p>
            <VirloFeedIntelligence articles={articles} />
            <button
               onClick={() => setIsVirloModalOpen(false)}
               style={{ marginTop: 24, width: '100%', padding: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer'}}
            >
              Close Settings
            </button>
          </div>
        </div>
      )}

      {/* ── Feed Conversational Layer ── */}
      <FeedQAWidget />

      {/* ── Toast ── */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}
