import MainClientApp from '../../../components/MainClientApp';
import { fetchArticles, fetchDigest, fetchPipelineStatus } from '../../../api';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let initialArticles = [];
  let initialDigest = [];
  let initialStatus = null;
  let serverError = false;

  try {
    const [arts, dig, stat] = await Promise.all([
      fetchArticles(slug).catch((e) => {
        if (e.message && e.message.toLowerCase().includes('groq_api_key')) serverError = true;
        return [];
      }),
      fetchDigest().catch(() => []),
      fetchPipelineStatus().catch(() => null),
    ]);

    initialArticles = arts;
    initialDigest = dig;
    initialStatus = stat;
  } catch (err: any) {
    if (err?.message && err.message.toLowerCase().includes('groq_api_key')) {
      serverError = true;
    }
  }

  return (
    <MainClientApp 
      initialArticles={initialArticles}
      initialDigest={initialDigest}
      initialStatus={initialStatus}
      serverError={serverError}
      initialCategory={slug}
    />
  );
}
