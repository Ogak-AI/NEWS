// ProvenancePanel.tsx — Source trail, fact assertions, and editorial flags
import type { ArticleDetail } from '../api';

interface Props {
  article: ArticleDetail;
}

function confColor(score: number) {
  if (score >= 0.80) return 'var(--green)';
  if (score >= 0.60) return 'var(--amber)';
  return 'var(--red)';
}

function confBg(score: number) {
  if (score >= 0.80) return 'var(--green-dim)';
  if (score >= 0.60) return 'var(--amber-dim)';
  return 'var(--red-dim)';
}

export default function ProvenancePanel({ article }: Props) {
  const meta      = article.provenance_metadata;
  const sources   = meta?.sources ?? [];
  const facts     = meta?.facts ?? [];
  const trendTags = meta?.virlo_trend_tags ?? [];
  const flags     = meta?.editorial_flags ?? [];

  const biasColor =
    (article.bias_score ?? 0.85) >= 0.85 ? 'var(--green)' :
    (article.bias_score ?? 0.85) >= 0.70 ? 'var(--amber)' :
    'var(--red)';

  const readColor =
    (article.readability_score ?? 0.85) >= 0.80 ? 'var(--green)' :
    (article.readability_score ?? 0.85) >= 0.60 ? 'var(--amber)' :
    'var(--red)';

  return (
    <>
      {/* Quality Metrics */}
      <div>
        <div className="prov-section-title">Editorial Scores</div>
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Confidence</span>
            <span className="metric-value" style={{ color: confColor(article.aggregate_confidence ?? 0) }}>
              {Math.round((article.aggregate_confidence ?? 0) * 100)}%
            </span>
            <div className="metric-bar-wrap">
              <div className="metric-bar" style={{
                width: `${(article.aggregate_confidence ?? 0) * 100}%`,
                background: confColor(article.aggregate_confidence ?? 0),
              }} />
            </div>
          </div>

          <div className="metric-card">
            <span className="metric-label">Neutrality</span>
            <span className="metric-value" style={{ color: biasColor }}>
              {Math.round((article.bias_score ?? 0.88) * 100)}%
            </span>
            <div className="metric-bar-wrap">
              <div className="metric-bar" style={{
                width: `${(article.bias_score ?? 0.88) * 100}%`,
                background: biasColor,
              }} />
            </div>
          </div>

          <div className="metric-card">
            <span className="metric-label">Readability</span>
            <span className="metric-value" style={{ color: readColor }}>
              {Math.round((article.readability_score ?? 0.85) * 100)}%
            </span>
            <div className="metric-bar-wrap">
              <div className="metric-bar" style={{
                width: `${(article.readability_score ?? 0.85) * 100}%`,
                background: readColor,
              }} />
            </div>
          </div>

          <div className="metric-card">
            <span className="metric-label">Sources</span>
            <span className="metric-value" style={{ color: 'var(--gold)' }}>
              {sources.length}
            </span>
            <div className="metric-bar-wrap">
              <div className="metric-bar" style={{
                width: `${Math.min(sources.length / 5, 1) * 100}%`,
                background: 'var(--gold)',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Editorial flags (if any) */}
      {flags.length > 0 && (
        <div>
          <div className="prov-section-title">Editorial Flags</div>
          <div className="editorial-flags-list">
            {flags.map((flag, i) => (
              <div key={i} className="editorial-flag">⚑ {flag}</div>
            ))}
          </div>
        </div>
      )}

      {/* Source Trail */}
      {sources.length > 0 && (
        <div>
          <div className="prov-section-title">Source Trail</div>
          <div className="source-list">
            {sources.map((src, i) => (
              <div key={i} className="source-item">
                <span className="source-publisher">{src.publisher}</span>
                <span className="source-title-text">{src.title}</span>
                {src.url && (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                    onClick={e => e.stopPropagation()}
                  >
                    ↗ {src.url.replace(/^https?:\/\//, '').slice(0, 50)}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Virlo trend signals */}
      {trendTags.length > 0 && (
        <div>
          <div className="prov-section-title">Virlo Trend Signals</div>
          <div className="trend-chip-list">
            {trendTags.map((tag, i) => (
              <span key={i} className="trend-chip">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* Validated facts */}
      {facts.length > 0 && (
        <div>
          <div className="prov-section-title">Validated Facts ({facts.length})</div>
          <div className="fact-list">
            {facts.map((fact, i) => (
              <div key={i} className="fact-item">
                <div className="fact-header">
                  <span className="fact-conf" style={{
                    color: confColor(fact.confidence),
                    background: confBg(fact.confidence),
                  }}>
                    {Math.round(fact.confidence * 100)}%
                  </span>
                  <span className="fact-corr">
                    {fact.sources_corroborating} source{fact.sources_corroborating !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="fact-text">{fact.claim}</p>
                {fact.contradiction && (
                  <div className="contradiction-flag">⚠ Contradiction flagged</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
