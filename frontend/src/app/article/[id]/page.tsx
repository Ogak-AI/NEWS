import { fetchArticle } from '../../../api';
import ArticleView from '../../../components/ArticleView';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await fetchArticle(parseInt(id, 10)).catch(() => null);

  if (!article) {
    return <div style={{ color: 'white', padding: 40 }}>Article not found</div>;
  }

  return (
    <div style={{ padding: '0px', width: '100%', minHeight: '100vh', background: 'var(--bg-deep)' }}>
      <header className="masthead">
        <div className="masthead-inner">
          <div className="masthead-brand">
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
              <span className="brand-name">VERITAS</span>
              <span className="brand-sub">Neural Newsroom</span>
            </Link>
          </div>
          <div className="masthead-center">
             <Link href="/" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 600, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
               ← Back to Feed
             </Link>
          </div>
        </div>
      </header>
      
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
