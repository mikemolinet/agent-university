export const prerender = false;

import type { APIRoute } from 'astro';
import { getDb, verifyUnsubscribeSignature } from '../../lib/db';

const HTML_HEAD = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent University</title><style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0a0a0a;color:#e5e5e5}.card{text-align:center;max-width:420px;padding:2rem;border:1px solid #333;border-radius:12px;background:#141414}h1{color:#f59e0b;font-size:1.4rem}p{line-height:1.6;color:#aaa}a{color:#f59e0b}</style></head><body><div class="card">`;
const HTML_FOOT = `</div></body></html>`;

function htmlResponse(status: number, body: string) {
  return new Response(`${HTML_HEAD}${body}${HTML_FOOT}`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const emailB64 = url.searchParams.get('email');
  const sig = url.searchParams.get('sig');

  if (!emailB64 || !sig) {
    return htmlResponse(400, `<h1>Invalid Link</h1><p>This unsubscribe link is missing required parameters.</p>`);
  }

  let email: string;
  try {
    email = atob(emailB64);
  } catch {
    return htmlResponse(400, `<h1>Invalid Link</h1><p>Could not decode email from link.</p>`);
  }

  const valid = await verifyUnsubscribeSignature(email, sig);
  if (!valid) {
    return htmlResponse(403, `<h1>Invalid Signature</h1><p>This unsubscribe link is invalid or has been tampered with.</p>`);
  }

  const db = getDb();
  const { data, error } = await db.from('subscribers').delete().eq('email', email).select('email');

  if (error) {
    return htmlResponse(500, `<h1>Something went wrong</h1><p>Please try again later or contact us.</p>`);
  }

  if (!data || data.length === 0) {
    return htmlResponse(200, `<h1>Already Unsubscribed</h1><p>This email is not in our subscriber list. You won't receive any emails from us.</p><p><a href="https://www.agentuniversity.org">Visit Agent University →</a></p>`);
  }

  return htmlResponse(200, `<h1>Unsubscribed</h1><p>You've been unsubscribed from Agent University updates. We're sorry to see you go!</p><p><a href="https://www.agentuniversity.org">Visit Agent University →</a></p>`);
};
