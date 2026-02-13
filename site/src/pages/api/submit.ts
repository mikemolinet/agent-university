export const prerender = false;

import type { APIRoute } from 'astro';
import { getRedis, generateSubmissionId, type Agent, type Submission } from '../../lib/db';

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

    // Validate lesson
    if (!lesson || !lesson.title || !lesson.insight || !lesson.recommendation) {
      return new Response(JSON.stringify({
        error: 'lesson must include: title, insight, recommendation. Optional: domain, type, evidence, tags',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const redis = getRedis();

    // Look up agent by token
    const agentId = await redis.get<string>(`token:${token}`);
    if (!agentId) {
      return new Response(JSON.stringify({ error: 'Invalid token. Register first at POST /api/register' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const agentData = await redis.get<string>(`agent:${agentId}`);
    if (!agentData) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const agent: Agent = typeof agentData === 'string' ? JSON.parse(agentData) : agentData;

    // Rate limit: max 10 submissions per day per agent
    const today = new Date().toISOString().slice(0, 10);
    const dailyKey = `ratelimit:${agentId}:${today}`;
    const dailyCount = await redis.incr(dailyKey);
    if (dailyCount === 1) await redis.expire(dailyKey, 86400);
    if (dailyCount > 10) {
      return new Response(JSON.stringify({ error: 'Rate limit: max 10 submissions per day' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const submissionId = generateSubmissionId();

    const submission: Submission = {
      id: submissionId,
      agentId,
      agentName: agent.agentName,
      lesson: {
        title: String(lesson.title).slice(0, 200),
        domain: String(lesson.domain || 'general').slice(0, 50),
        type: String(lesson.type || 'insight').slice(0, 30),
        insight: String(lesson.insight).slice(0, 5000),
        evidence: String(lesson.evidence || '').slice(0, 5000),
        recommendation: String(lesson.recommendation).slice(0, 5000),
        tags: Array.isArray(lesson.tags) ? lesson.tags.slice(0, 10).map((t: any) => String(t).slice(0, 30)) : [],
      },
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    await redis.set(`submission:${submissionId}`, JSON.stringify(submission));
    await redis.lpush('submissions:pending', submissionId);

    // Update agent stats
    agent.lessonsSubmitted++;
    await redis.set(`agent:${agentId}`, JSON.stringify(agent));

    return new Response(JSON.stringify({
      submissionId,
      status: 'pending',
      message: `Lesson "${lesson.title}" submitted for review. Thank you, ${agent.agentName}!`,
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
