"use client";
import type { ArticleDetail } from '../api';
import DepthMeter from './DepthMeter';
import ProvenancePanel from './ProvenancePanel';
import QAPanel from './QAPanel';
import EditorialControl from './EditorialControl';
import { useState } from 'react';

const CAT_STYLES: Record<string, { color: string; bg: string }> = {
  environment: { color: 'var(--cat-environment)', bg: 'rgba(62,207,142,0.08)' },
  finance:     { color: 'var(--cat-finance)',     bg: 'rgba(245,166,35,0.08)' },
  science:     { color: 'var(--cat-science)',     bg: 'rgba(167,139,250,0.08)' },
  geopolitics: { color: 'var(--cat-geopolitics)', bg: 'rgba(248,113,113,0.08)' },
  technology:  { color: 'var(--cat-technology)',  bg: 'rgba(56,189,248,0.08)' },
  health:      { color: 'var(--cat-health)',      bg: 'rgba(52,211,153,0.08)' },
  general:     { color: 'var(--cat-general)',     bg: 'rgba(91,142,255,0.08)' },
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

/** Markdown → HTML: headers, bold, italic, lists, paragraphs */
function renderMarkdown(md: string): string {
  if (!md) return '';
  return md
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<ul')) return trimmed;
      if (trimmed.startsWith('## Strategic Outlook')) return `<h2>Strategic Outlook</h2>`;
      return `<p>${trimmed}</p>`;
    })
    .join('\n');
}

function readingTime(wordCount: number, content: string): string {
  const words = wordCount > 0 ? wordCount : content.split(' ').length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

export default function ArticleView({ article: initialArticle }: { article: ArticleDetail }) {
  const [article, setArticle] = useState(initialArticle);
  const cat = (article.category || 'general').toLowerCase();
  const catStyle = CAT_STYLES[cat] || CAT_STYLES.general;
  const rt = readingTime(article.word_count ?? 0, article.content ?? '');

  return (
    <>
      {article.hero_image && (
        <div style={{
          height: 320,
          margin: '-32px -32px 24px -32px',
          backgroundImage: `url(${article.hero_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative'
        }}>
           <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-card) 0%, transparent 50%)' }} />
        </div>
      )}
      <div className="modal-header">
        <div className="modal-header-top">
          <div className="modal-badges">
            <span
              className="cat-badge"
              style={{ color: catStyle.color, background: catStyle.bg, borderColor: catStyle.color }}
            >
              {article.category || 'General'}
            </span>
            <span className="modal-reading-time">{rt}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {formatTime(article.created_at)}
            </span>
            <span style={{ fontSize: '12px', color: article.provenance_metadata?.human_override ? 'var(--gold)' : 'var(--green)', fontWeight: 600 }}>
              {article.provenance_metadata?.human_override ? `✦ Human Verified` : `✓ ${Math.round((article.aggregate_confidence ?? 0) * 100)}% verified`}
            </span>
          </div>
        </div>

        <h1 id="modal-title" className="modal-title">{article.title}</h1>

        {article.dateline && (
          <div className="modal-dateline" style={{ marginBottom: 4 }}>{article.dateline}</div>
        )}
        
        {article.author_byline && (
          <div style={{ fontSize: 15, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 24 }}>
            {article.author_byline}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
          <button style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', padding: '6px 12px', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            🔗 Copy Link
          </button>
          <button style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', padding: '6px 12px', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            🔖 Save
          </button>
          <button style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', padding: '6px 12px', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            💬 Comments ({(article.id % 45) + 12})
          </button>
        </div>

        <blockquote className="modal-lede">{article.lede}</blockquote>

        {article.pull_quote && (
          <div className="modal-pull-quote">
            <span className="pull-quote-mark">"</span>
            {article.pull_quote}
          </div>
        )}
      </div>

      <div className="modal-body">
        <div
          className="article-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content || '') }}
        />

        {article.provenance_metadata?.sources && article.provenance_metadata.sources.length > 0 && (
          <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border-default)' }}>
            <h3 style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 16, fontFamily: 'var(--font-serif)' }}>Original Sources</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {article.provenance_metadata.sources.map((s, i) => (
                <div key={i} style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
                    {s.publisher}
                  </div>
                  <a href={s.url || '#'} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
                    {s.title} <span style={{ color: 'var(--gold)', marginLeft: 4 }}>↗</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <EditorialControl article={article} onUpdate={setArticle} />

        <div className="provenance-sidebar">
          <div>
            <div className="prov-section-title">Corroboration Depth</div>
            <DepthMeter depth={article.depth_meter ?? 1} />
          </div>

          <ProvenancePanel article={article} />

          <QAPanel articleId={article.id} />
        </div>
      </div>
    </>
  );
}
