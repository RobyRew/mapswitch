import type { APIRoute } from 'astro';
import { getAuth } from '@/lib/auth/auth';

export const prerender = false;

// Handles every better-auth endpoint (sign-in/up, OAuth callbacks, verification,
// passkey, session). `ALL` covers the GET callbacks and POST actions.
export const ALL: APIRoute = ({ request }) => getAuth().handler(request);
