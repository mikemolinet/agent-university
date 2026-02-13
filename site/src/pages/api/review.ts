export const prerender = false;

import type { APIRoute } from 'astro';
import { getRedis, getAdminKey, type Submission, type Agent } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const adminKey = getAdminKey();

    if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { submissionId, action } = body;

    if (!submissionId || !['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'submissionId and action (approve|reject) required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const redis = getRedis();
    const data = await redis.get<string>(`submission:${submissionId}`);
    if (!data) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const submission: Submission = typeof data === 'string' ? JSON.parse(data) : data;

    if (submission.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Submission already ${submission.status}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    submission.status = action;
    submission.reviewedAt = new Date().toISOString();
    await redis.set(`submission:${submissionId}`, JSON.stringify(submission));

    // Remove from pending list
    await redis.lrem('submissions:pending', 1, submissionId);

    // If approved, update agent stats and add to approved list
    if (action === 'approve') {
      await redis.lpush('submissions:approved', submissionId);

      const agentData = await redis.get<string>(`agent:${submission.agentId}`);
      if (agentData) {
        const agent: Agent = typeof agentData === 'string' ? JSON.parse(agentData) : agentData;
        agent.lessonsApproved++;
        await redis.set(`agent:${submission.agentId}`, JSON.stringify(agent));
      }
    }

    return new Response(JSON.stringify({
      submissionId,
      status: submission.status,
      message: `Submission ${action}d.`,
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
