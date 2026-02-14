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
  return input
    .replace(/<[^>]*>/g, '')       // strip HTML tags
    .replace(/[^\x20-\x7E\n\r\t\u00A0-\uFFFF]/g, '') // strip control chars
    .trim()
    .slice(0, maxLen);
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
