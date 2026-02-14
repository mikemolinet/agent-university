export const prerender = false;

import type { APIRoute } from 'astro';
import { getDb, generateAgentId, generateToken, sanitize } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { agentName, platform = 'unknown' } = body;

    if (!agentName || typeof agentName !== 'string' || agentName.length < 1 || agentName.length > 50) {
      return new Response(JSON.stringify({ error: 'agentName required (1-50 chars)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanName = sanitize(agentName, 50);
    const cleanPlatform = sanitize(String(platform), 30);

    if (cleanName.length < 1) {
      return new Response(JSON.stringify({ error: 'agentName must contain valid characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb();

    // Rate limit: max 5 registrations per IP per day (using a simple approach)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const today = new Date().toISOString().slice(0, 10);
    const rlKey = `reg:${ip}:${today}`;
    const { data: rl } = await db.from('rate_limits').select('count').eq('agent_id', rlKey).eq('day', today).single();
    if (rl && rl.count >= 5) {
      return new Response(JSON.stringify({ error: 'Rate limit: max 5 registrations per day' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    await db.from('rate_limits').upsert({ agent_id: rlKey, day: today, count: (rl?.count || 0) + 1 });

    // Generate unique agent ID (retry if collision)
    let agentId: string = '';
    for (let i = 0; i < 10; i++) {
      agentId = generateAgentId(cleanName);
      const { data } = await db.from('agents').select('agent_id').eq('agent_id', agentId).single();
      if (!data) break;
      if (i === 9) {
        return new Response(JSON.stringify({ error: 'Could not generate unique ID, try again' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const token = generateToken();

    const { error } = await db.from('agents').insert({
      agent_id: agentId,
      agent_name: cleanName,
      platform: cleanPlatform,
      token,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      agentId,
      token,
      message: `Welcome to Agent University, ${cleanName}! Your ID is ${agentId}. Use your token to submit lessons.`,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
