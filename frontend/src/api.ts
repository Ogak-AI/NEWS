// api.ts — Typed API client for News Gamma Tan Intelligence Wire

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
    virlo_trend_tags?: string[];
    editorial_flags?: string[];
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
  const envBase = import.meta.env.VITE_API_BASE as string | undefined;
  if (!envBase) return '/api';
  const base = envBase.replace(/\/api\/?$/i, '').replace(/\/+$/g, '');
  return `${base}/api`;
})();

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
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
