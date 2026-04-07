"use client";
import { useState } from 'react';
import { triggerOverride, type ArticleDetail } from '../api';

interface Props {
  article: ArticleDetail;
  onUpdate: (updatedArticle: ArticleDetail) => void;
}

export default function EditorialControl({ article, onUpdate }: Props) {
  const [note, setNote] = useState('');
  const [confidence, setConfidence] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Only show if editor=1 is in URL
  const isEditor = typeof window !== 'undefined' && window.location.search.includes('editor=1');
  if (!isEditor) return null;

  const handleOverride = async () => {
    if (!note.trim()) {
      alert('Please provide an editorial note for this override.');
      return;
    }
    setLoading(true);
    try {
      const res = await triggerOverride(article.id, confidence, note);
      onUpdate(res.article);
      setNote('');
      setExpanded(false);
    } catch (err) {
      alert('Failed to apply override. Check console for details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      marginTop: 24, padding: 20, background: 'rgba(245, 158, 11, 0.05)',
      border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-sans)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚖️</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Editorial Oversight Console
          </span>
        </div>
        {!expanded && (
          <button 
            onClick={() => setExpanded(true)}
            style={{ 
              background: 'var(--amber)', color: '#000', border: 'none', padding: '4px 12px',
              borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' 
            }}
          >
            OPEN OVERRIDE
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
              Override Confidence ({Math.round(confidence * 100)}%)
            </label>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={confidence} 
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--amber)' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
              Editorial Verification Note
            </label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain the reason for this manual correction..."
              style={{
                width: '100%', minHeight: 80, background: 'var(--bg-deep)', border: '1px solid var(--border-default)',
                borderRadius: 4, padding: 10, color: 'var(--text-primary)', fontSize: 13, resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button 
              onClick={() => setExpanded(false)}
              style={{ background: 'none', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', padding: '6px 16px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleOverride}
              disabled={loading}
              style={{ background: 'var(--gold)', color: '#000', border: 'none', padding: '6px 20px', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'APPLYING...' : 'COMMIT OVERRIDE'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
