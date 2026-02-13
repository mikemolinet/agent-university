export const prerender = false;

import type { APIRoute } from 'astro';
import { getDb, generateAgentId, generateToken } from '../../lib/db';

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

    const db = getDb();

    // Generate unique agent ID (retry if collision)
    let agentId: string = '';
    for (let i = 0; i < 10; i++) {
      agentId = generateAgentId(agentName);
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
      agent_name: agentName.slice(0, 50),
      platform: String(platform).slice(0, 30),
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
      message: `Welcome to Agent University, ${agentName}! Your ID is ${agentId}. Use your token to submit lessons.`,
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
