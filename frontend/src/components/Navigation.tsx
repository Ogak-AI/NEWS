"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navigation({ activeCategory }: { activeCategory?: string }) {
  const [now, setNow] = useState('');

  useEffect(() => {
    setNow(new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).toUpperCase());
  }, []);

  return (
    <header className="masthead">
      <div className="masthead-inner">
        <div className="masthead-brand">
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <span className="brand-name">VERITAS</span>
            <span className="brand-sub">Neural Newsroom</span>
          </Link>
        </div>

        <div className="masthead-center">
          <span className="masthead-date">{now}</span>
          <div className="masthead-badge">
            <span className="live-dot" />
            Live · AI-Generated · Fully Transparent
          </div>
        </div>

        <nav className="masthead-nav">
          <Link href="/" className={`nav-btn ${!activeCategory ? 'active' : ''}`}>
            Feed
          </Link>
          <Link href="/about" className="nav-btn">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
