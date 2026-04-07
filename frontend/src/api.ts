// api.ts — Typed API client for Veritas AI Intelligence Wire

export interface ArticleSummary {
  id: number;
  title: string;
  dateline: string;
  lede: string;
  digest: string;
  pull_quote: string;
  word_count: number;
  aggregate_confidence: number;
  depth_meter: number;
  bias_score: number;
  readability_score: number;
  category: string;
  created_at: string;
}

export interface ArticleDetail extends ArticleSummary {
  content: string;
  status: string;
  provenance_metadata: {
    facts: Array<{
      claim: string;
      confidence: number;
      sources_corroborating: number;
      contradiction?: boolean;
    }>;
    sources: Array<{
      publisher: string;
      url: string | null;
      title: string;
    }>;
    virlo_trend_tags?: { hashtag: string; count: number; total_views: number }[];
    virlo_orbit_id?: string;
    editorial_flags?: string[];
    human_override?: {
      confidence: number;
      note: string;
      timestamp: string;
    };
  };
}

export interface DigestItem {
  id: number;
  title: string;
  digest: string;
  category: string;
  aggregate_confidence: number;
}

export interface PipelineStatus {
  article_count: number;
  source_count: number;
  status: string;
  timestamp: string;
}

const BASE = (() => {
  let envBase: string | undefined;
  if (typeof process !== 'undefined') {
    envBase = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE;
  }
  if (!envBase) envBase = 'http://127.0.0.1:8000';
  const base = envBase.replace(/\/api\/?$/i, '').replace(/\/+$/g, '');
  return `${base}/api`;
})();

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    let errDetail = `${res.statusText}`;
    try {
      const err = await res.json();
      if (err.detail) errDetail = err.detail;
    } catch {}
    throw new Error(errDetail);
  }
  return res.json();
}

export const fetchArticles = (category?: string) =>
  apiFetch<ArticleSummary[]>(
    `/articles${category && category !== 'all' ? `?category=${category}` : ''}`
  );

export const fetchArticle = (id: number) =>
  apiFetch<ArticleDetail>(`/articles/${id}`);

export const fetchDigest = () =>
  apiFetch<DigestItem[]>('/digest');

export const fetchPipelineStatus = () =>
  apiFetch<PipelineStatus>('/pipeline/status');

export const triggerIngest = () =>
  apiFetch<{ status: string }>('/ingest', { method: 'POST' });

export const triggerPipeline = () =>
  apiFetch<{ status: string; message: string }>('/pipeline/run', { method: 'POST' });

export const triggerFullPipeline = () =>
  apiFetch<{ status: string; message: string }>('/pipeline/full', { method: 'POST' });

export const fetchArticleQA = (id: number, question: string) =>
  apiFetch<{ answer: string }>(`/articles/${id}/qa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

export interface OrbitResponse {
  data?: {
    status?: string;
    videos?: { title: string; views: number; creator: string }[];
    intelligence_report?: string;
  };
}

export async function fetchOrbitStatus(orbitId: string): Promise<OrbitResponse | null> {
  try {
    const res = await fetch(`${BASE}/orbit/${orbitId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export const fetchFeedQA = (question: string) =>
  apiFetch<{ answer: string }>('/feed/qa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

export const triggerOverride = (id: number, human_confidence: number, editorial_note: string) =>
  apiFetch<{ status: string; article: ArticleDetail }>(`/articles/${id}/override`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ human_confidence, editorial_note }),
  });
