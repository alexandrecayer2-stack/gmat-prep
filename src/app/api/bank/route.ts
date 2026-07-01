import { getQuestionBank } from '@/lib/data/content';

// The full question bank as JSON. The service worker caches this response
// (stale-while-revalidate), so once it has been fetched online it stays
// available offline. ~2.3 MB uncompressed; gzipped over the wire.
export async function GET() {
  const bank = await getQuestionBank();
  return Response.json(bank, {
    headers: {
      // Let the client revalidate but keep serving instantly meanwhile.
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
