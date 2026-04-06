

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
    .slice(0, 5);

  if (trends.length === 0) return null;

  return (
    <div className="virlo-feed-intel">
      <div className="virlo-intel-header">
        <span className="virlo-brand-icon">V</span>
        <span>Virlo Viral Intelligence | Live Global Hashtags</span>
      </div>
      <div className="virlo-trends-row">
        {trends.map((t, i) => (
          <div key={i} className="virlo-trend-card">
            <div className="virlo-trend-info">
              <span className="virlo-trend-name">#{t.hashtag}</span>
              <span className="virlo-trend-pulse">↑ Trending</span>
            </div>
            <div className="virlo-trend-stats">
              <span className="virlo-stat-val">{(t.total_views / 1e6).toFixed(1)}M</span>
              <span className="virlo-stat-label">reach pulse</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
