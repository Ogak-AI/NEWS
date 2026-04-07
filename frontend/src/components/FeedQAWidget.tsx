"use client";
import { useState, useRef, useEffect } from 'react';
import { fetchFeedQA } from '../api';

export default function FeedQAWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', msg: string}[]>([
    { role: 'ai', msg: "I'm the Veritas AI Senior Editor. Ask me anything about the global news breaking today." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const query = input.trim();
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', msg: query }]);
    setLoading(true);
    
    try {
      const res = await fetchFeedQA(query);
      setChatHistory(prev => [...prev, { role: 'ai', msg: res.answer }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'ai', msg: `Connection error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`feed-qa-widget ${isOpen ? 'open' : ''}`}>
      <div className="qa-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕ Close Editor Chat' : 'Ask the News Desk 💬'}
      </div>
      
      {isOpen && (
        <div className="qa-chat-window">
          <div className="qa-chat-header">
            <strong>🗞 Veritas AI Desk</strong>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Conversational Layer</span>
          </div>
          
          <div className="qa-chat-history" ref={scrollRef}>
            {chatHistory.map((item, i) => (
              <div key={i} className={`qa-msg-row ${item.role}`}>
                <div className="qa-msg-bubble">{item.msg}</div>
              </div>
            ))}
            {loading && (
              <div className="qa-msg-row ai">
                <div className="qa-msg-bubble typing" style={{ display: 'flex', gap: 4, alignItems:'center', height: 24 }}>
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
          </div>
          
          <form className="qa-chat-input-form" onSubmit={handleSubmit}>
            <input 
              type="text" 
              className="qa-chat-input" 
              placeholder="E.g., What are the main stories in tech?" 
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button type="submit" className="qa-chat-submit" disabled={!input.trim() || loading}>➔</button>
          </form>
        </div>
      )}
    </div>
  );
}
