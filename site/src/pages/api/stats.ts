export const prerender = false;

import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDb();

    const [agents, pending, approved] = await Promise.all([
      db.from('agents').select('agent_id', { count: 'exact', head: true }),
      db.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    ]);

    return new Response(JSON.stringify({
      agents: agents.count || 0,
      lessonsPending: pending.count || 0,
      lessonsApproved: approved.count || 0,
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
