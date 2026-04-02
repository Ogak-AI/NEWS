// ArticleModal.tsx — Full article detail with provenance sidebar and depth meter
import { useEffect } from 'react';
import type { ArticleDetail } from '../api';
import DepthMeter from './DepthMeter';
import ProvenancePanel from './ProvenancePanel';

const CAT_STYLES: Record<string, { color: string; bg: string }> = {
  environment: { color: 'var(--cat-environment)', bg: 'rgba(62,207,142,0.1)' },
  finance:     { color: 'var(--cat-finance)',     bg: 'rgba(245,166,35,0.1)' },
  science:     { color: 'var(--cat-science)',     bg: 'rgba(167,139,250,0.1)' },
  geopolitics: { color: 'var(--cat-geopolitics)', bg: 'rgba(248,113,113,0.1)' },
  general:     { color: 'var(--cat-general)',     bg: 'rgba(91,142,255,0.1)' },
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso || '—';
  }
}

/** Very simple markdown → HTML (handles ##, **, em, lists) */
function renderMarkdown(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .split('\n\n')
    .map(block => {
      if (block.startsWith('<h') || block.startsWith('<ul')) return block;
      const trimmed = block.trim();
      return trimmed ? `<p>${trimmed}</p>` : '';
    })
    .join('\n');
}

interface Props {
  article: ArticleDetail;
  onClose: () => void;
}

export default function ArticleModal({ article, onClose }: Props) {
  const cat = (article.category || 'general').toLowerCase();
  const catStyle = CAT_STYLES[cat] || CAT_STYLES.general;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-panel">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-top">
            <div className="modal-badges">
              <span
                className="cat-badge"
                style={{ color: catStyle.color, background: catStyle.bg, borderColor: catStyle.color }}
              >
                {article.category || 'General'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {formatTime(article.created_at)}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600 }}>
                ✓ {Math.round((article.aggregate_confidence ?? 0) * 100)}% verified
              </span>
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Close article">✕</button>
          </div>

          <h1 id="modal-title" className="modal-title">{article.title}</h1>
          <blockquote className="modal-lede">{article.lede}</blockquote>
        </div>

        {/* Body: article content + provenance sidebar */}
        <div className="modal-body">
          {/* Left: article content */}
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content || '') }}
          />

          {/* Right: provenance + depth meter */}
          <div className="provenance-sidebar">
            {/* Depth meter at top */}
            <div>
              <div className="prov-section-title">Depth Meter</div>
              <DepthMeter depth={article.depth_meter ?? 1} />
            </div>

            {/* Provenance metrics, sources, facts */}
            <ProvenancePanel article={article} />
          </div>
        </div>
      </div>
    </div>
  );
}
