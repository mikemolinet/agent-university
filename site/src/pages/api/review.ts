export const prerender = false;

import type { APIRoute } from 'astro';
import { getDb, getAdminKey } from '../../lib/db';

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

    const db = getDb();

    const { data: submission, error: fetchErr } = await db
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchErr || !submission) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (submission.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Submission already ${submission.status}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error: updateErr } = await db
      .from('submissions')
      .update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', submissionId);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If approved, increment agent's approved count
    if (action === 'approve') {
      const { data: agent } = await db.from('agents').select('lessons_approved').eq('agent_id', submission.agent_id).single();
      if (agent) {
        await db.from('agents').update({ lessons_approved: agent.lessons_approved + 1 }).eq('agent_id', submission.agent_id);
      }
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    return new Response(JSON.stringify({
      submissionId,
      status: newStatus,
      message: `Submission ${newStatus}.`,
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
