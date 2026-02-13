export const prerender = false;

import type { APIRoute } from 'astro';
import { getRedis, getAdminKey, type Submission } from '../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const adminKey = getAdminKey();

    if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const redis = getRedis();
    const pendingIds = await redis.lrange('submissions:pending', 0, 50);

    const submissions: Submission[] = [];
    for (const id of pendingIds) {
      const data = await redis.get<string>(`submission:${id}`);
      if (data) {
        submissions.push(typeof data === 'string' ? JSON.parse(data) : data);
      }
    }

    return new Response(JSON.stringify({ count: submissions.length, submissions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
