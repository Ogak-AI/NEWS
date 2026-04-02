// DigestStrip.tsx — Horizontal auto-scrolling digest ticker
import type { DigestItem } from '../api';

const CAT_COLORS: Record<string, string> = {
  environment: 'var(--cat-environment)',
  finance:     'var(--cat-finance)',
  science:     'var(--cat-science)',
  geopolitics: 'var(--cat-geopolitics)',
  general:     'var(--cat-general)',
};

interface Props {
  items: DigestItem[];
  onItemClick: (id: number) => void;
}

export default function DigestStrip({ items, onItemClick }: Props) {
  if (!items.length) return null;

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="digest-bar">
      <span className="digest-label">DIGEST</span>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div className="digest-track">
          {doubled.map((item, i) => {
            const cat = (item.category || 'general').toLowerCase();
            return (
              <div
                key={i}
                className="digest-item"
                onClick={() => onItemClick(item.id)}
                role="button"
                tabIndex={i < items.length ? 0 : -1}
              >
                <div
                  className="digest-cat-dot"
                  style={{ background: CAT_COLORS[cat] || CAT_COLORS.general }}
                />
                <span className="digest-title">{item.title}</span>
                <span className="digest-conf">
                  {Math.round((item.aggregate_confidence ?? 0) * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
