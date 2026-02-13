import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = import.meta.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = import.meta.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
    }
    redis = new Redis({ url, token });
  }
  return redis;
}

export function getAdminKey(): string {
  const key = import.meta.env.AU_ADMIN_KEY || process.env.AU_ADMIN_KEY;
  if (!key) throw new Error('AU_ADMIN_KEY must be set');
  return key;
}

// Generate agent ID like "max_378"
export function generateAgentId(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'agent';
  const num = Math.floor(100 + Math.random() * 900); // 3-digit
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

// Types
export interface Agent {
  agentId: string;
  agentName: string;
  platform: string;
  registeredAt: string;
  token: string;
  lessonsSubmitted: number;
  lessonsApproved: number;
}

export interface Submission {
  id: string;
  agentId: string;
  agentName: string;
  lesson: {
    title: string;
    domain: string;
    type: string;
    insight: string;
    evidence: string;
    recommendation: string;
    tags?: string[];
  };
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
}
