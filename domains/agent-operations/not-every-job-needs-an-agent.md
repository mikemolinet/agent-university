---
id: not-every-job-needs-an-agent
title: "Not Every Job Needs an Agent"
type: anti-pattern
version: 1.0.0

author:
  human_id: "@chapati23"

domain: agent-operations
applies_to: [cost-optimization, cron-jobs, automation, architecture]
confidence: high
evidence_strength: moderate

temporal:
  discovered: 2026-02-23
  last_verified: 2026-02-23
  likely_stable_until: "indefinite — fundamental architecture principle"

tags: [cost, cron, over-engineering, shell-scripts, tokens, architecture]

source:
  url: "https://x.com/chapati23/status/2026007693069324460"
  author: "@chapati23"
---

# Not Every Job Needs an Agent

## The Insight

When you have an AI agent, every problem starts looking like an agent task. Need to check if a file exists? Agent. Need a notification when something changes? Agent. Need to ping an API every 15 minutes? Agent.

But an agent running a cron job isn't free. Every execution loads workspace context — your AGENTS.md, SOUL.md, memory files, tool definitions, conversation history. That's 10,000+ tokens before the agent even thinks about the task. At flagship model pricing, a simple "does this file exist?" check costs 4-5 cents. Run that every 15 minutes and you're spending $3-4/day on a job a shell script does for free.

The rule is simple: if a task can be expressed as "if X then Y" with no judgment involved, it doesn't need an LLM. A shell script, a cron + curl, a simple Python check — these tools existed before agents and they're still the right choice for deterministic tasks. Save your agent for work that actually requires reasoning.

## Evidence

**The specific case (February 2026):**

A user set up an OpenClaw `agentTurn` cron job to check whether a daily output file existed and send a Telegram notification if it was missing. The job:

- Injected ~10,000+ tokens of workspace context per execution
- Cost approximately 4-5 cents per check
- Ran every 15 minutes
- Daily cost: ~$3.84 (96 checks × $0.04)

The replacement:

- A 5-line shell script: check if file exists, curl the Telegram API if not
- Cost: $0
- Same reliability, same outcome
- Runs via system cron, no LLM involved

**The pattern is common.** Once you have an agent infrastructure, the temptation is to route everything through it. Common tasks that get over-agented:

- File existence checks → shell `test -f`
- API health pings → `curl` + status code check
- Log rotation → `logrotate` or shell script
- Simple notifications → webhook + curl
- Scheduled file backups → `rsync` cron
- Process monitoring → `pgrep` + alert script

**Where the agent IS justified for monitoring:**

- "Check my inbox and decide if anything is urgent" — requires judgment
- "Review today's output and flag quality issues" — requires reasoning
- "Look at this error log and figure out what went wrong" — requires analysis

The distinguishing factor: does the task require the LLM to make a decision, or just evaluate a boolean condition?

## Context & Applicability

**This lesson applies when:**
- You're setting up recurring automated checks or notifications
- The task has a deterministic outcome (if X then Y, no judgment needed)
- You're noticing high token costs from routine cron jobs
- You're designing the automation architecture for a new workflow

**This lesson does NOT apply when:**
- The task requires interpreting unstructured data (reading emails, evaluating content quality)
- The decision has nuance ("is this urgent?" vs "does this file exist?")
- You're in a rapid prototyping phase where agent crons are faster to set up than scripts
- The token cost is negligible relative to the value delivered

## Behavioral Recommendation

1. **Apply the judgment test.** Before creating an agent cron job, ask: "Does this task require the LLM to think, or just to check a condition?" If it's just a condition, use a script.

2. **Calculate the real cost.** An `agentTurn` cron injects your full workspace context every run. Multiply your per-run token cost by the number of daily executions. Compare that to $0 for a shell script.

3. **Use `systemEvent` for simple triggers.** If you need to notify your agent about something, use a `systemEvent` cron (injects a message into the existing session) instead of an `agentTurn` (spins up a full isolated session with all context). System events are dramatically cheaper.

4. **Keep a "scripts vs agent" decision log.** When you automate something new, document why you chose an agent task vs a simple script. Review periodically — some agent tasks may have been over-engineered.

5. **Hybrid approach for complex monitoring.** Use a cheap script for the detection layer (is something wrong?) and only invoke the agent for the response layer (what should we do about it?). The script watches; the agent thinks.

## How to Apply This Lesson

**Before creating a new cron job, use this checklist:**

```markdown
## Automation Decision Checklist
- [ ] Does this task require LLM reasoning or judgment?
  - YES → agent cron (agentTurn or systemEvent)
  - NO → shell script / simple cron
- [ ] Is the output deterministic (same input always = same action)?
  - YES → script
  - NO → agent
- [ ] How often does it run?
  - High frequency (every 5-15 min) → strongly prefer scripts for cost
  - Low frequency (daily/weekly) → agent is fine even for simple tasks
- [ ] What's the daily token cost at this frequency?
  - Calculate: runs_per_day × ~10K tokens × model_price_per_token
```

**AGENTS.md addition:**

```markdown
## Automation Architecture
- Simple boolean checks (file exists, API responds, process running) → shell scripts
- Judgment calls (is this email urgent, is this output good enough) → agent tasks
- High-frequency monitoring → always scripts, trigger agent only when action needed
- When in doubt, start with a script. Upgrade to agent only if you need reasoning.
```
