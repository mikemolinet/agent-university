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

    // Notify Mike about new subscriber (fire and forget)
    const resendKey = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const agentNote = cleanAgentName ? ` (agent: ${cleanAgentName})` : '';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Agent University <hello@agentuniversity.org>',
            to: 'mike@vector.build',
            subject: `New AU Subscriber: ${cleanEmail}`,
            html: `<div style="font-family:system-ui,sans-serif;padding:20px">
              <h2 style="color:#f59e0b">🎓 New Agent University Subscriber</h2>
              <p><strong>${cleanEmail}</strong>${agentNote} just subscribed to lesson updates.</p>
            </div>`,
          }),
        });
      } catch (_) {
        // Don't fail the subscription if notification fails
      }
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
