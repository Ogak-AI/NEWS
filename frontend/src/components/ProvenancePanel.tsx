import { useState, useEffect } from 'react';
import type { ArticleDetail, OrbitResponse } from '../api';
import { fetchOrbitStatus } from '../api';

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
  const orbitId   = meta?.virlo_orbit_id ?? null;

  const [orbit, setOrbit] = useState<OrbitResponse | null>(null);

  useEffect(() => {
    if (!orbitId) return;
    let mounted = true;
    const poll = async () => {
      const res = await fetchOrbitStatus(orbitId);
      if (!mounted) return;
      if (res?.data) {
        setOrbit(res);
        if (res.data.status === 'completed' || res.data.status === 'failed') return;
      }
      setTimeout(poll, 15000);
    };
    poll();
    return () => { mounted = false; };
  }, [orbitId]);

  const biasColor =
    (article.bias_score ?? 0.85) >= 0.85 ? 'var(--green)' :
    (article.bias_score ?? 0.85) >= 0.70 ? 'var(--amber)' :
    'var(--red)';

  const getIcon = (creator: string) => {
    const c = (creator || '').toLowerCase();
    if (c.includes('tiktok')) return '🎵';
    if (c.includes('youtube')) return '📺';
    return '📱';
  };

  return (
    <div className="prov-panel-upgraded">
      {/* Editorial Scores */}
      <div className="prov-section">
        <div className="prov-section-title">Editorial Integrity</div>
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Fact Confidence</span>
            <div className="metric-value" style={{ color: confColor(article.aggregate_confidence ?? 0) }}>
              {Math.round((article.aggregate_confidence ?? 0) * 100)}%
            </div>
            <div className="metric-bar-wrap">
              <div className="metric-bar" style={{ width: `${(article.aggregate_confidence ?? 0) * 100}%`, background: confColor(article.aggregate_confidence ?? 0) }} />
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-label">Neutrality Score</span>
            <div className="metric-value" style={{ color: biasColor }}>
              {Math.round((article.bias_score ?? 0.88) * 100)}%
            </div>
            <div className="metric-bar-wrap">
              <div className="metric-bar" style={{ width: `${(article.bias_score ?? 0.88) * 100}%`, background: biasColor }} />
            </div>
          </div>
        </div>
      </div>

      {/* Virlo trend signals details */}
      {trendTags.length > 0 && (
        <div className="prov-section virlo-intel-section">
          <div className="prov-section-title v-brand">Viral Momentum Signals</div>
          <div className="trend-radar-list">
            {trendTags.map((tag: any, i: number) => (
              <div key={i} className="trend-radar-item">
                <span className="trend-tag">#{tag.hashtag}</span>
                <span className="trend-views">{(tag.total_views / 1e6).toFixed(1)}M pulse</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Virlo Orbit Analysis */}
      {orbitId && (
        <div className="prov-section virlo-orbit-section">
          <div className="prov-section-title v-brand">Orbit AI Discovery</div>
          <div className="orbit-status-line">
            <span className="status-dot" data-status={orbit?.data?.status || 'dispatched'} />
            {orbit?.data?.status ? orbit.data.status.toUpperCase() : 'QUEUED'}
          </div>
          
          {orbit?.data?.intelligence_report && (
            <div className="orbit-intel-blob">
              {orbit.data.intelligence_report}
            </div>
          )}

          {orbit?.data?.videos && orbit.data.videos.length > 0 && (
            <div className="orbit-creator-list">
              {orbit.data.videos.slice(0, 3).map((vid: any, i) => (
                <div key={i} className="orbit-creator-item">
                  <div className="creator-icon">{getIcon(vid.creator)}</div>
                  <div className="creator-info">
                    <div className="creator-title">{vid.title}</div>
                    <div className="creator-meta">{vid.creator} • {(vid.views / 1e6).toFixed(1)}M views</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Source Trail */}
      {sources.length > 0 && (
        <div className="prov-section">
          <div className="prov-section-title">Source Corroboration</div>
          <div className="source-trail-stack">
            {sources.map((src, i) => (
              <div key={i} className="source-trail-item">
                <span className="source-p">{src.publisher}</span>
                <span className="source-t">{src.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validated facts */}
      {facts.length > 0 && (
        <div className="prov-section">
          <div className="prov-section-title">Validated Facts ({facts.length})</div>
          <div className="fact-list">
            {facts.map((fact: any, i: number) => (
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

      {/* Editorial flags (if any) */}
      {flags.length > 0 && (
        <div className="prov-section">
          <div className="prov-section-title">Editorial Flags</div>
          <div className="editorial-flags-list">
            {flags.map((flag: string, i: number) => (
              <div key={i} className="editorial-flag">⚑ {flag}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
