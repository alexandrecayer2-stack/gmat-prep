import { getLearnBank } from '@/lib/data/learn-bank';

// The full Learn corpus as JSON. Cached by the service worker
// (stale-while-revalidate) so lessons and articles are readable offline once
// fetched online. Small (text only), so caching it is cheap.
export async function GET() {
  const bank = await getLearnBank();
  return Response.json(bank, {
    headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
  });
}
