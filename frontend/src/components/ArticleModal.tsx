// ArticleModal.tsx — Wrapper for ArticleView as an overlay modal
import { useEffect } from 'react';
import type { ArticleDetail } from '../api';
import ArticleView from './ArticleView';

interface Props {
  article: ArticleDetail;
  onClose: () => void;
}

export default function ArticleModal({ article, onClose }: Props) {
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
        <div className="modal-header-top" style={{ position: 'absolute', top: 24, right: 36, zIndex: 10 }}>
          <button className="modal-close" onClick={onClose} aria-label="Close article">✕</button>
        </div>
        <ArticleView article={article} />
      </div>
    </div>
  );
}
