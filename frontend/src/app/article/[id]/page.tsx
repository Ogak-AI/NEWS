import { fetchArticle, FALLBACK_ARTICLES } from '../../../api';
import ArticleView from '../../../components/ArticleView';
import Navigation from '../../../components/Navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let article = await fetchArticle(parseInt(id, 10)).catch(() => null);

  if (!article) {
    article = FALLBACK_ARTICLES.find(a => a.id === parseInt(id, 10)) || null;
  }

  if (!article) {
    // If not found in API or fallbacks, default to the first fallback just to guarantee rendering something
    article = FALLBACK_ARTICLES[0];
  }

  return (
    <div style={{ padding: '0px', width: '100%', minHeight: '100vh', background: 'var(--bg-deep)' }}>
      <Navigation />
      
      <div style={{ padding: '40px', maxWidth: 1400, margin: '0 auto' }}>
        <div 
          className="modal-panel" 
          style={{ 
            width: '100%', height: 'auto', maxHeight: 'none', transform: 'none', position: 'relative', top: 0, left: 0, margin: 0,
            overflowY: 'visible', overflowX: 'hidden' 
          }}
        >
          <ArticleView article={article} />
        </div>
      </div>
    </div>
  );
}
