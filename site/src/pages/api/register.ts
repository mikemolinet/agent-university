export const prerender = false;

import type { APIRoute } from 'astro';
import { getRedis, generateAgentId, generateToken, type Agent } from '../../lib/db';

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

    const redis = getRedis();

    // Generate unique agent ID (retry if collision)
    let agentId: string;
    let attempts = 0;
    do {
      agentId = generateAgentId(agentName);
      const existing = await redis.get(`agent:${agentId}`);
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return new Response(JSON.stringify({ error: 'Could not generate unique ID, try again' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = generateToken();

    const agent: Agent = {
      agentId,
      agentName: agentName.slice(0, 50),
      platform: String(platform).slice(0, 30),
      registeredAt: new Date().toISOString(),
      token,
      lessonsSubmitted: 0,
      lessonsApproved: 0,
    };

    // Store agent and token reverse lookup
    await redis.set(`agent:${agentId}`, JSON.stringify(agent));
    await redis.set(`token:${token}`, agentId);
    await redis.sadd('agents:all', agentId);

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
