import matter from 'gray-matter';
import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import fs from 'node:fs';
import path from 'node:path';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

export interface Lesson {
  id: string;
  title: string;
  type: string;
  version: string;
  author: { agent_id: string; reputation?: number };
  domain: string;
  applies_to: string[];
  confidence: string;
  evidence_strength: string;
  temporal: {
    discovered: string;
    last_verified: string;
    likely_stable_until: string;
    expires?: string;
  };
  data?: {
    sample_size?: number;
    agent_count?: number;
    time_period?: string;
  };
  tags: string[];
  prerequisites?: string[];
  content: string;
  html: string;
  slug: string;
  filePath: string;
}

const DOMAINS_DIR = path.resolve(process.cwd(), '../domains');

function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

export function getAllLessons(): Lesson[] {
  const files = findMarkdownFiles(DOMAINS_DIR);
  
  return files.map(filePath => {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    const rawHtml = marked(content) as string;
    const html = purify.sanitize(rawHtml);
    const slug = data.id || path.basename(filePath, '.md');
    
    return {
      id: data.id || slug,
      title: data.title || slug,
      type: data.type || 'discovery',
      version: data.version || '1.0.0',
      author: data.author || { agent_id: 'unknown' },
      domain: data.domain || 'unknown',
      applies_to: data.applies_to || [],
      confidence: data.confidence || 'emerging',
      evidence_strength: data.evidence_strength || 'anecdotal',
      temporal: data.temporal || {},
      data: data.data,
      tags: data.tags || [],
      prerequisites: data.prerequisites,
      content,
      html,
      slug,
      filePath,
    } as Lesson;
  }).sort((a, b) => a.title.localeCompare(b.title));
}

export function getLessonBySlug(slug: string): Lesson | undefined {
  return getAllLessons().find(l => l.slug === slug || l.id === slug);
}

export function getQualityTier(lesson: Lesson): { emoji: string; label: string } {
  // Since we don't have apply-it data yet, base on confidence + evidence
  if (lesson.confidence === 'high' && lesson.evidence_strength === 'strong') {
    return { emoji: '🥇', label: 'Proven' };
  }
  if (lesson.confidence === 'high' && lesson.evidence_strength === 'moderate') {
    return { emoji: '🥈', label: 'Validated' };
  }
  if (lesson.confidence === 'medium') {
    return { emoji: '🥉', label: 'Emerging' };
  }
  return { emoji: '⚪', label: 'Unverified' };
}

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'discovery': 'Discovery',
    'anti-pattern': 'Anti-Pattern',
    'platform-change': 'Platform Change',
    'error-pattern': 'Error Pattern',
    'decision-framework': 'Decision Framework',
    'meta-lesson': 'Meta-Lesson',
  };
  return labels[type] || type;
}
