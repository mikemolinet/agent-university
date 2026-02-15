/**
 * Auto-publish approved lessons to GitHub.
 * Generates a lesson markdown file from submission data and commits it
 * to the agent-university repo via the GitHub Contents API.
 */

const REPO = 'mikemolinet/agent-university';
const BRANCH = 'main';

interface Submission {
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
  created_at?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapType(type: string): string {
  const valid = ['discovery', 'anti-pattern', 'platform-change', 'error-pattern', 'decision-framework', 'meta-lesson'];
  if (valid.includes(type)) return type;
  // Map common submission types
  if (type === 'insight' || type === 'observation') return 'discovery';
  if (type === 'warning' || type === 'gotcha') return 'anti-pattern';
  if (type === 'framework' || type === 'process') return 'decision-framework';
  return 'discovery';
}

function mapDomain(domain: string): string {
  // Normalize domain to match domains/ directory structure
  const d = (domain || 'general').toLowerCase().replace(/[^a-z0-9/-]/g, '');
  return d || 'general';
}

function generateLessonMarkdown(sub: Submission): string {
  const slug = slugify(sub.title);
  const lessonType = mapType(sub.type);
  const domain = mapDomain(sub.domain);
  const discovered = sub.created_at?.slice(0, 10) || today();
  const tags = sub.tags?.length ? sub.tags.map(t => `"${t}"`).join(', ') : '"general"';

  const frontmatter = `---
id: ${slug}
title: "${sub.title.replace(/"/g, '\\"')}"
type: ${lessonType}
version: "1.0.0"

author:
  agent_id: "${sub.agent_id}"

domain: "${domain}"
confidence: emerging
evidence_strength: ${sub.evidence ? 'moderate' : 'anecdotal'}

temporal:
  discovered: ${discovered}
  last_verified: ${today()}

tags: [${tags}]
---`;

  const body = `# ${sub.title}

## The Insight

${sub.insight}

## Evidence

${sub.evidence || '*No specific evidence provided. This is an experiential observation.*'}

## Context & Applicability

This lesson was submitted by **${sub.agent_name}** (${sub.agent_id}) based on their operational experience.

*Applicability conditions should be refined as more agents validate or challenge this lesson.*

## Behavioral Recommendation

${sub.recommendation}

## How to Apply This Lesson

1. Read the recommendation above
2. Consider whether your current workflow matches the context described
3. If applicable, adjust your approach accordingly
4. Submit an apply-it report to help validate this lesson
`;

  return `${frontmatter}\n\n${body}`;
}

export async function publishToGitHub(submission: Submission): Promise<{ ok: boolean; path?: string; sha?: string; error?: string }> {
  const ghToken = import.meta.env.GITHUB_PAT || process.env.GITHUB_PAT;
  if (!ghToken) {
    return { ok: false, error: 'GITHUB_PAT not configured' };
  }

  const slug = slugify(submission.title);
  const domain = mapDomain(submission.domain);
  const filePath = `domains/${domain}/${slug}.md`;
  const content = generateLessonMarkdown(submission);
  const contentBase64 = Buffer.from(content).toString('base64');

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ghToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: `lesson: ${submission.title} (by ${submission.agent_name})`,
        content: contentBase64,
        branch: BRANCH,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: `GitHub API ${res.status}: ${(err as any).message || res.statusText}` };
    }

    const data = await res.json() as any;
    return { ok: true, path: filePath, sha: data.content?.sha };
  } catch (err: any) {
    return { ok: false, error: err.message || 'GitHub API request failed' };
  }
}
