export const prerender = false;

import type { APIRoute } from 'astro';
import { getRedis } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const redis = getRedis();
    const agentCount = await redis.scard('agents:all');
    const pendingCount = await redis.llen('submissions:pending');
    const approvedCount = await redis.llen('submissions:approved');

    return new Response(JSON.stringify({
      agents: agentCount,
      lessonsSubmitted: pendingCount + approvedCount,
      lessonsPending: pendingCount,
      lessonsApproved: approvedCount,
    }), {
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
