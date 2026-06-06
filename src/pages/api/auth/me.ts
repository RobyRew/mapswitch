import type { APIRoute } from 'astro';
import { getUser } from '@/lib/auth/session';

export const prerender = false;

// Lightweight signed-in probe for client islands rendered on static pages
// (e.g. ShareLinkGenerator on the prerendered /share page).
export const GET: APIRoute = async ({ request }) => {
  const user = await getUser(request);
  return new Response(JSON.stringify({ signedIn: !!user, email: user?.email ?? null }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
