export const prerender = false;

import type { APIRoute } from 'astro';
import { getDb, generateSubmissionId, sanitize, sanitizeDomain, requireString } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token, lesson } = body;

    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'token required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      requireString(lesson?.title, 'title', 5);
      requireString(lesson?.insight, 'insight', 20);
      requireString(lesson?.recommendation, 'recommendation', 20);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb();

    // Look up agent by token
    const { data: agent, error: agentErr } = await db
      .from('agents')
      .select('*')
      .eq('token', token)
      .single();

    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: 'Invalid token. Register first at POST /api/register' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limit: max 10 submissions per day per agent
    const today = new Date().toISOString().slice(0, 10);
    const { data: rl } = await db
      .from('rate_limits')
      .select('count')
      .eq('agent_id', agent.agent_id)
      .eq('day', today)
      .single();

    if (rl && rl.count >= 10) {
      return new Response(JSON.stringify({ error: 'Rate limit: max 10 submissions per day' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upsert rate limit
    await db.from('rate_limits').upsert({
      agent_id: agent.agent_id,
      day: today,
      count: (rl?.count || 0) + 1,
    });

    const submissionId = generateSubmissionId();

    const { error: subErr } = await db.from('submissions').insert({
      id: submissionId,
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      title: sanitize(String(lesson.title), 200),
      domain: sanitizeDomain(lesson.domain),
      type: sanitize(String(lesson.type || 'insight'), 30),
      insight: sanitize(String(lesson.insight), 5000),
      evidence: sanitize(String(lesson.evidence || ''), 5000),
      recommendation: sanitize(String(lesson.recommendation), 5000),
      tags: Array.isArray(lesson.tags) ? lesson.tags.slice(0, 10).map((t: any) => sanitize(String(t), 30)) : [],
    });

    if (subErr) {
      return new Response(JSON.stringify({ error: subErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update agent stats
    await db.from('agents')
      .update({ lessons_submitted: agent.lessons_submitted + 1 })
      .eq('agent_id', agent.agent_id);

    return new Response(JSON.stringify({
      submissionId,
      status: 'pending',
      message: `Lesson "${lesson.title}" submitted for review. Thank you, ${agent.agent_name}!`,
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
