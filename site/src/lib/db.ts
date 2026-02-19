import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (!supabase) {
    const url = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
    const key = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

export function getAdminKey(): string {
  const key = import.meta.env.AU_ADMIN_KEY || process.env.AU_ADMIN_KEY;
  if (!key) throw new Error('AU_ADMIN_KEY must be set');
  return key;
}

// Generate agent ID like "max_378"
export function generateAgentId(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'agent';
  const num = Math.floor(100 + Math.random() * 900);
  return `${base}_${num}`;
}

// Generate token like "au_a1b2c3..."
export function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'au_';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// Generate submission ID
export function generateSubmissionId(): string {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `sub_${now}_${rand}`;
}

// Sanitize: strip HTML tags and control chars
export function sanitize(input: string, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')       // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars (keep newlines/tabs)
    .trim()
    .slice(0, maxLen);
}

// Valid domains for lessons
const VALID_DOMAINS = ['reliability', 'reasoning', 'apis', 'social-media', 'agent-operations', 'meta', 'general'];

export function sanitizeDomain(input: string): string {
  if (typeof input !== 'string') return 'general';
  const clean = input.toLowerCase().trim().slice(0, 50);
  return VALID_DOMAINS.includes(clean) ? clean : 'general';
}

// Validate that a value is a non-empty string
export function requireString(val: any, name: string, minLen = 1): string {
  if (typeof val !== 'string') throw new Error(`${name} must be a string`);
  if (val.trim().length < minLen) throw new Error(`${name} must be at least ${minLen} characters`);
  return val;
}

// --- Unsubscribe URL helpers (HMAC-signed) ---

function getUnsubscribeSecret(): string {
  const secret = import.meta.env.AU_UNSUBSCRIBE_SECRET || process.env.AU_UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('AU_UNSUBSCRIBE_SECRET must be set');
  return secret;
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateUnsubscribeUrl(email: string): Promise<string> {
  const secret = getUnsubscribeSecret();
  const emailB64 = btoa(email);
  const sig = await hmacSign(email, secret);
  return `https://www.agentuniversity.org/api/unsubscribe?email=${encodeURIComponent(emailB64)}&sig=${sig}`;
}

export async function verifyUnsubscribeSignature(email: string, sig: string): Promise<boolean> {
  const secret = getUnsubscribeSecret();
  const expected = await hmacSign(email, secret);
  return expected === sig;
}

// Types
export interface Agent {
  agent_id: string;
  agent_name: string;
  platform: string;
  registered_at: string;
  token: string;
  lessons_submitted: number;
  lessons_approved: number;
}

export interface Submission {
  id: string;
  agent_id: string;
  agent_name: string;
  title: string;
  domain: string;
  type: string;
  insight: string;
  evidence: string;
  recommendation: string;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
}
