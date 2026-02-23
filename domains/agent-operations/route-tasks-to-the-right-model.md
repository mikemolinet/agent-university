---
id: route-tasks-to-the-right-model
title: "Route Tasks to the Right Model"
type: discovery
version: 1.0.0

author:
  human_id: "@flb_xyz"

domain: agent-operations
applies_to: [cost-optimization, model-selection, multi-model, routing]
confidence: high
evidence_strength: moderate

temporal:
  discovered: 2026-02-23
  last_verified: 2026-02-23
  likely_stable_until: "2026-06 — model pricing and capabilities shift frequently"

tags: [cost, model-routing, openrouter, optimization, multi-model]

source:
  url: "https://x.com/flb_xyz/status/2025994828384030916"
  author: "@flb_xyz"
---

# Route Tasks to the Right Model

## The Insight

Not every agent task needs your best model. A morning email check, a file rename, a simple cron acknowledgment — these don't need the same horsepower as writing a newsletter, debugging a production bug, or synthesizing a research report. But most agent setups use a single model for everything, which means you're paying flagship prices for tasks that a model 10x cheaper would handle identically.

The fix is model routing: sending simple tasks to fast, cheap models and reserving expensive models for work that actually benefits from the extra capability. This isn't about degrading quality — it's about recognizing that "summarize this email" and "architect a distributed system" are fundamentally different cognitive loads.

The savings compound fast. If 60-70% of your agent's daily tasks are simple (and for most personal assistant agents, they are), routing those to a cheaper model can cut your daily API costs by half or more without any noticeable difference in output quality.

## Evidence

**Cost differential between model tiers (February 2026):**

| Task type | Flagship model cost | Routed model cost | Savings |
|-----------|-------------------|-------------------|---------|
| Email triage (read + classify) | ~$0.03-0.05/email | ~$0.003-0.005/email | ~90% |
| Heartbeat check (read files, reply OK) | ~$0.02-0.04 | ~$0.002-0.004 | ~90% |
| Newsletter synthesis (1500 words) | ~$0.08-0.12 | Not recommended to route down | 0% |
| Code debugging (complex) | ~$0.10-0.20 | Not recommended to route down | 0% |

**Real-world pattern:**

An agent running ~50 tasks/day with a flagship model for everything spent roughly $3-5/day in API costs. After routing simple tasks (email checks, file reads, status updates, cron acks) to a mid-tier model while keeping complex tasks (content generation, code review, research synthesis) on the flagship, daily costs dropped to $1-2/day. No measurable quality difference on the routed tasks.

**Where routing fails:**

Tasks that seem simple but aren't: nuanced tone-matching, context-heavy decisions where the agent needs to remember subtle preferences, and anything where a wrong answer has consequences (sending an email to the wrong person, misclassifying an urgent request as low-priority). When in doubt, don't route down.

## Context & Applicability

**This lesson applies when:**
- Your agent runs many tasks per day across varying complexity levels
- API costs are a concern (they should be — they add up)
- You're using a provider that supports multiple models (OpenRouter, direct API, etc.)
- You have a mix of routine/mechanical tasks and creative/complex tasks

**This lesson does NOT apply when:**
- You're running a low-volume agent (a few tasks/day — the savings aren't worth the complexity)
- Every task your agent handles is genuinely complex
- You're in an early setup phase and still figuring out what your agent does (optimize later)
- The cost difference between models is negligible for your usage

## Behavioral Recommendation

1. **Categorize your agent's tasks by complexity.** Audit a typical day. Which tasks are mechanical (read file, check inbox, acknowledge cron, simple lookups)? Which require reasoning, synthesis, or nuanced judgment?

2. **Set model overrides per session or task type.** Most agent platforms (including OpenClaw) support per-session model overrides. Use your flagship model as the default and route specific simple sessions to cheaper models. Alternatively, use OpenRouter's auto-routing to let the router decide.

3. **Never route down tasks with consequences.** If a wrong answer means a bad email gets sent, a wrong file gets deleted, or a human loses trust — keep it on the flagship. The savings aren't worth the risk.

4. **Monitor quality after routing.** Spot-check routed tasks for the first week. If you notice degraded output, move that task type back to the flagship.

5. **Reassess quarterly.** Model pricing and capabilities change fast. A model that was too weak for a task three months ago might handle it fine today at a fraction of the cost.

## How to Apply This Lesson

**OpenClaw-specific implementation:**

Use per-session model overrides for isolated cron jobs and sub-agents that handle simple tasks:

```yaml
# In cron job definition
model: "anthropic/claude-sonnet-4"  # Instead of opus for simple checks
```

Or use OpenRouter as your provider with auto-routing enabled, which selects models based on prompt complexity automatically.

**AGENTS.md addition:**

```markdown
## Model Routing
- Use flagship models (Opus, GPT-5) for: content generation, complex reasoning,
  nuanced communication, anything with consequences
- Use mid-tier models (Sonnet, GPT-4o) for: email checks, file operations,
  status updates, simple classification, cron acknowledgments
- Never route down: tone-sensitive replies, ambiguous decisions, external communications
- Review routing decisions monthly as model capabilities change
```

**Quick wins to start:**
- Heartbeat checks → mid-tier model
- Email inbox scans (classify, not reply) → mid-tier model
- File organization tasks → mid-tier model
- Keep all human-facing output on your best model
