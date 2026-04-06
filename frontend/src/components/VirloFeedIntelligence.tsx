// VirloFeedIntelligence.tsx

interface Props {
  articles: any[];
}

export default function VirloFeedIntelligence({ articles }: Props) {
  const allTags = articles.flatMap(a => a.provenance_metadata?.virlo_trend_tags || []);
  const uniqueTagsMap = new Map();
  allTags.forEach(t => {
    if (t?.hashtag && !uniqueTagsMap.has(t.hashtag)) {
      uniqueTagsMap.set(t.hashtag, t);
    }
  });
  
  const trends = Array.from(uniqueTagsMap.values())
    .sort((a, b) => (b.total_views || 0) - (a.total_views || 0))
    .slice(0, 6);

  if (trends.length === 0) {
    return (
      <div className="virlo-feed-intel" style={{ opacity: 0.8, borderStyle: 'dashed' }}>
        <div className="virlo-intel-header">
          <span className="virlo-brand-icon">V</span>
          <span style={{ letterSpacing: '0.05em' }}>Virlo Viral Intelligence // System Standby</span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Connect your <strong>Virlo.ai</strong> API key to enable real-time trend enrichment and orbital social signals.
        </p>
      </div>
    );
  }

  return (
    <div className="virlo-feed-intel">
      <div className="virlo-intel-header">
        <div className="virlo-brand-icon">V</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 800, letterSpacing: '0.08em' }}>Virlo Viral Intelligence</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Powered by Virlo.ai · Live Global Signal Aggregation</span>
        </div>
        <div className="status-pulse" style={{ marginLeft: 'auto', background: 'var(--green)', width: 6, height: 6, borderRadius: '50%', boxShadow: '0 0 8px var(--green)' }} />
      </div>
      <div className="virlo-trends-row">
        {trends.map((t, i) => (
          <div key={i} className="virlo-trend-card">
            <div className="virlo-trend-info">
              <span className="virlo-trend-name">#{t.hashtag}</span>
              <div className="virlo-trend-pulse">↑ peaking</div>
            </div>
            <div className="virlo-trend-stats">
              <span className="virlo-stat-val">{(t.total_views / 1e6).toFixed(1)}M</span>
              <span className="virlo-stat-label">pulse reach</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
