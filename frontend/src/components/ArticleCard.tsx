// ArticleCard.tsx — Feed card with reading time, dateline, and pull quote on featured
import type { ArticleSummary } from '../api';

const CAT_STYLES: Record<string, { color: string; bg: string }> = {
  environment: { color: 'var(--cat-environment)', bg: 'rgba(62,207,142,0.08)' },
  finance:     { color: 'var(--cat-finance)',     bg: 'rgba(245,166,35,0.08)' },
  science:     { color: 'var(--cat-science)',     bg: 'rgba(167,139,250,0.08)' },
  geopolitics: { color: 'var(--cat-geopolitics)', bg: 'rgba(248,113,113,0.08)' },
  technology:  { color: 'var(--cat-technology)',  bg: 'rgba(56,189,248,0.08)' },
  health:      { color: 'var(--cat-health)',      bg: 'rgba(52,211,153,0.08)' },
  general:     { color: 'var(--cat-general)',     bg: 'rgba(91,142,255,0.08)' },
};

function getConfColor(score: number) {
  if (score >= 0.80) return 'var(--green)';
  if (score >= 0.60) return 'var(--amber)';
  return 'var(--red)';
}

function getBiasLabel(score: number) {
  if (score >= 0.85) return { label: 'Neutral',    color: 'var(--green)', bg: 'var(--green-dim)' };
  if (score >= 0.70) return { label: 'Mild lean',  color: 'var(--amber)', bg: 'var(--amber-dim)' };
  return               { label: 'Biased',      color: 'var(--red)',   bg: 'var(--red-dim)' };
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso?.slice(0, 16).replace('T', ' ') || '—';
  }
}

function readingTime(wordCount: number, lede: string): string {
  const words = wordCount > 0 ? wordCount : lede.split(' ').length * 8;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

interface Props {
  article: ArticleSummary;
  featured?: boolean;
  onClick: () => void;
}

export default function ArticleCard({ article, featured = false, onClick }: Props) {
  const cat = (article.category || 'general').toLowerCase();
  const catStyle = CAT_STYLES[cat] || CAT_STYLES.general;
  const confColor = getConfColor(article.aggregate_confidence);
  const bias = getBiasLabel(article.bias_score ?? 0.88);
  const rt = readingTime(article.word_count ?? 0, article.lede ?? '');

  return (
    <article
      className={`article-card ${featured ? 'featured' : 'regular'}`}
      style={{ '--cat-color': catStyle.color, '--cat-bg': catStyle.bg } as React.CSSProperties}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-label={`Read article: ${article.title}`}
    >
      {article.hero_image && (
        <div style={{
          height: featured ? 280 : 160,
          margin: '-24px -24px 16px -24px',
          backgroundImage: `url(${article.hero_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          position: 'relative',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
           <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-card) 0%, transparent 40%)' }} />
        </div>
      )}

      {/* Top meta row */}
      <div className="card-meta-top">
        <span className="cat-badge" style={{ color: catStyle.color, background: catStyle.bg, borderColor: catStyle.color }}>
          {article.category || 'General'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="reading-time-badge">{rt}</span>
          <span className="confidence-badge" style={{ color: confColor }}>
            ✓ {Math.round((article.aggregate_confidence ?? 0) * 100)}%
          </span>
        </div>
      </div>

      {/* Dateline & Byline */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 12 }}>
        {article.dateline && (
          <div className="card-dateline" style={{ marginBottom: 0 }}>{article.dateline}</div>
        )}
        {article.author_byline && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {article.author_byline}
          </div>
        )}
      </div>

      {/* Headline */}
      <h2 className="card-headline">{article.title}</h2>

      {/* Lede */}
      <p className="card-lede">{article.lede}</p>

      {/* Pull quote — only on featured card */}
      {featured && article.pull_quote && (
        <p className="card-pull-quote">"{article.pull_quote}"</p>
      )}

      {/* Footer */}
      <div className="card-footer">
        <span className="card-time">{formatTime(article.created_at)}</span>
        <div className="card-metrics">
          {/* Depth pips */}
          <div className="mini-depth" title={`Corroboration depth: ${article.depth_meter}/5`}>
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className={`depth-pip ${n <= (article.depth_meter ?? 1) ? 'filled' : ''}`} />
            ))}
          </div>
          {/* Bias chip */}
          <span className="bias-chip" style={{ color: bias.color, background: bias.bg }}>
            {bias.label}
          </span>
        </div>
      </div>
    </article>
  );
}
