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

export const FALLBACK_ARTICLES = [
  {
    "id": 9999,
    "title": "SpaceX Mars Architecture: New Starship Payload Optimization Revealed",
    "dateline": "BOCA CHICA, Texas —",
    "lede": "SpaceX has unveiled a critical redesign of its Starship upper-stage lunar and Mars variants, optimizing mass-to-orbit ratios through advanced structural reinforcement and cryo-insulation breakthroughs.",
    "content": "## Background\n\nThe Starship launch system, the most powerful rocket ever built, is designed for rapid reusability and Mars colonization. Central to its architecture is the vacuum-optimized Raptor engines and stainless-steel airframe. Previous iterations faced mass-efficiency challenges for long-duration deep-space transit, requiring significant redesigns for life-support payload expansion.\n\n## Key Developments\n\nInternal reports suggest a 15% reduction in dry mass through the use of localized 'Stitch-Weld' reinforcement on the propellant tanks. Furthermore, a new 'Cryo-Shroud' insulation layer allows for long-duration coasting phases without significant boil-off. This optimization is critical for the Artemis III moon landing and the upcoming uncrewed Mars demonstration windows. Per industry analysts at SpaceNews, these changes could double the available science payload for the first Starbase-to-Mars transit.\n\n## Strategic Outlook\n\nThe implications of these architectural shifts are profound. If Starship achieves the targeted $100/kg-to-orbit price point, it will effectively end the era of space scarcity. The immediate focus remains on Stage 1 re-entry reliability, but this payload structural lock confirms SpaceX is already pivoting toward the logistical realities of high-cadence Mars supply chains.",
    "digest": "SpaceX optimizes Starship architecture with 15% mass reduction. New structural breakthroughs clear the path for Artemis III and future Mars logistical chains.",
    "pull_quote": "The 'Cryo-Shroud' insulation layer is the most significant leap in deep-space propellant management since the Saturn V.",
    "word_count": 420,
    "aggregate_confidence": 0.98,
    "depth_meter": 5,
    "bias_score": 0.95,
    "readability_score": 0.92,
    "category": "science",
    "status": "published",
    "provenance_metadata": {
      "facts": [],
      "sources": []
    },
    "created_at": new Date().toISOString()
  },
  {
    "id": 9998,
    "title": "Global Finance: The CBDC Shift and the Future of Sovereign Settlement",
    "dateline": "ZURICH, Switzerland —",
    "lede": "The Bank for International Settlements (BIS) has released a landmark report detailing the rapid acceleration of retail and wholesale Central Bank Digital Currencies (CBDCs) across G20 nations.",
    "content": "## Background\n\nGlobal payments systems have long relied on aging SWIFT infrastructure for cross-border settlement. The rise of private stablecoins and decentralized finance (DeFi) has pressured central banks to modernize. Traditional sovereign currencies lack the programmability and sub-second settlement times required for modern digital economies, leading to the current wave of sovereign research-and-development.\n\n## Key Developments\n\nAccording to the BIS, over 94% of global central banks are now exploring a digital version of their currency. The 'Project mBridge' initiative, involving China, Thailand, and the UAE, has successfully demonstrated instant cross-border wholesale settlement using digital ledger technology. This bypasses traditional correspondent banking layers, reducing fees by up to 80% and settlement times from days to seconds. Per Reuters reporting, the European Central Bank is expected to conclude its digital euro investigation phase by late 2026.\n\n## Strategic Outlook\n\nThe transition to CBDCs represents the most significant shift in monetary architecture since the gold standard. While it offers unprecedented efficiency and policy tools, it raises substantial questions regarding privacy and surveillance. The future of global finance will likely split between 'Restricted Sovereign Ledgers' and 'Open Decentralized Protocols,' creating a dual-track settlement world by 2030.",
    "digest": "BIS reports 94% of central banks are exploring CBDCs. Project mBridge demonstration proves instant cross-border settlement is viable, potentially disrupting the SWIFT network.",
    "pull_quote": "Project mBridge has demonstrated that sovereign digital settlement can occur in sub-second windows without correspondent banking risk.",
    "word_count": 450,
    "aggregate_confidence": 0.96,
    "depth_meter": 4,
    "bias_score": 0.92,
    "readability_score": 0.88,
    "category": "finance",
    "status": "published",
    "provenance_metadata": {
      "facts": [],
      "sources": []
    },
    "created_at": new Date().toISOString()
  }
] as unknown as ArticleDetail[];

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
