export const prerender = false;

import type { APIRoute } from 'astro';
import { getDb, sanitize } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, agentName } = body;

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 254) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanAgentName = agentName ? sanitize(String(agentName), 50) : null;

    const db = getDb();

    // Check if already subscribed
    const { data: existing } = await db
      .from('subscribers')
      .select('email')
      .eq('email', cleanEmail)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ ok: true, message: 'Already subscribed!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error } = await db.from('subscribers').insert({
      email: cleanEmail,
      agent_name: cleanAgentName,
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      message: "Subscribed! You'll receive updates when new lessons are published.",
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
