"use client";
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
  const [overrideUpdating, setOverrideUpdating] = useState(false);

  useEffect(() => {
    if (!orbitId) return;
    let mounted = true;
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const res = await fetchOrbitStatus(orbitId);
        if (!mounted) return;
        
        if (res?.data) {
          setOrbit(res);
          // Stop polling if completed or failed
          if (res.data.status === 'completed' || res.data.status === 'failed') return;
        }
      } catch (err) {
        console.error('Orbit poll error:', err);
      }

      // Exponential backoff: 30s, 45s, 60s... up to 120s
      const delay = Math.min(15000 + (attempts * 15000), 120000);
      setTimeout(poll, delay);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="prov-section-title" style={{ marginBottom: 0 }}>Editorial Integrity</div>
        </div>

        {meta?.human_override && (
          <div style={{
            background: 'var(--gold-dim)', border: '1px solid var(--gold)', borderRadius: 'var(--radius-md)',
            padding: 12, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4
          }}>
            <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              ✦ Human Verified Override
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
              {meta.human_override.note}
            </div>
          </div>
        )}

        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">{meta?.human_override ? 'Human Confidence' : 'Fact Confidence'}</span>
            <div className="metric-value" style={{ color: meta?.human_override ? 'var(--gold)' : confColor(article.aggregate_confidence ?? 0) }}>
              {Math.round((article.aggregate_confidence ?? 0) * 100)}%
            </div>
            <div className="metric-bar-wrap">
              <div className="metric-bar" style={{ width: `${(article.aggregate_confidence ?? 0) * 100}%`, background: meta?.human_override ? 'var(--gold)' : confColor(article.aggregate_confidence ?? 0) }} />
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
            <span className={`status-dot ${(!orbit || orbit?.data?.status === 'queued' || orbit?.data?.status === 'dispatched') ? 'pulse' : ''}`} data-status={orbit?.data?.status || 'dispatched'} />
            {orbit?.data?.status ? orbit.data.status.toUpperCase() : 'INITIALIZING...'}
            {(!orbit || orbit?.data?.status === 'queued' || orbit?.data?.status === 'dispatched') && (
               <span className="orbit-loading-hint">Searching social signals...</span>
            )}
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

      {/* Verification Nodes Audit Trail */}
      {meta?.verification_nodes && meta.verification_nodes.length > 0 && (
        <div className="prov-section">
          <div className="prov-section-title">Cryptographic Audit Trail</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {meta.verification_nodes.map((node: any, i: number) => (
              <div key={i} style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${node.status === 'verified' ? 'var(--green)' : 'var(--amber)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{node.method}</span>
                  <span style={{ fontSize: 12, color: node.status === 'verified' ? 'var(--green)' : 'var(--amber)', fontWeight: 600, textTransform: 'uppercase' }}>{Math.round(node.confidence * 100)}% {node.status}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{node.detail}</div>
              </div>
            ))}
          </div>
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
