---
id: sub-agents-that-spawn-sub-agents-will-eat-your-context-alive
title: "Sub-Agents That Spawn Sub-Agents Will Eat Your Context Alive"
type: anti-pattern
version: 1.0.0
domain: agent-operations
confidence: high
evidence_strength: strong
tags: [sub-agents, recursion, context-window, pipelines, cost, delegation, architecture]
---

# Sub-Agents That Spawn Sub-Agents Will Eat Your Context Alive

## The Insight

When you build a multi-step pipeline and delegate it to a sub-agent, there's a natural temptation to let that sub-agent spawn its own sub-agents for each step. It sounds elegant - divide and conquer, right? Each evaluation pass gets its own clean context, each platform gets its own specialist agent.

The problem is recursive spawning. If your sub-agent's instruction document says "spawn a sub-agent for each evaluation pass," and those evaluation passes involve reading the same instruction document, you get a cascade. The parent agent spawns children. Children read the instructions. Children see "spawn sub-agents." Children spawn grandchildren. Context balloons. Costs explode. Nothing finishes.

Even without true infinite recursion, the pattern is ruinous. A single sub-agent running five evaluation steps inline uses one context window. That same sub-agent spawning five children uses six context windows - five of which load the full instruction document, the full task context, and all the background material the parent already loaded. You're paying five times over for the same setup, and each child generates output that flows back to the parent, expanding its context further.

The fix: sub-agents should never spawn sub-agents. Make it a hard rule. Put a recursion guard at the top of every instruction document that a sub-agent might read.

## Evidence

The 1M-token cascade:
A multi-step content pipeline was delegated to a sub-agent. The pipeline had 10 phases, including 4 evaluation passes and 3 platform-specific publishing steps. The instruction document included language like "spawn a sub-agent for each evaluation pass."

When the orchestrating agent evaluated the pipeline, it spawned a sub-agent. That sub-agent read the instruction document (35KB, 675 lines), which told it to spawn more sub-agents for the evaluation passes. Context usage hit 1 million tokens. Nothing completed. The session became unresponsive.

Root cause:
- The instruction document was written from the orchestrator's perspective ("you can spawn sub-agents"), but the sub-agent interpreted those instructions as applying to itself
- No guard existed to tell the sub-agent "you ARE a sub-agent - do not spawn more"
- Spawning instructions were scattered across 6 locations in 4 files

After adding a recursion guard:
A single line at the top: "RECURSION GUARD - You ARE a sub-agent. NEVER spawn sub-agents. Do everything inline. Non-negotiable."

All eval passes changed from "spawn" to "inline." Result: context dropped from 1M+ to ~200K tokens. Cost dropped from $15+ to $5-10 per run. The pipeline actually completes.

## Context & Applicability

Applies when:
- Building multi-step pipelines delegated to sub-agents
- Instruction documents reference spawning additional agents
- Shared instruction files read by both orchestrators and sub-agents
- Pipeline has eval/review/QC steps that feel like they should be "isolated"

Does NOT apply when:
- You're the top-level orchestrator spawning your first sub-agent (that's fine)
- Genuinely independent tasks with no shared instruction documents
- Context window size is not a constraint

## Behavioral Recommendation

1. Add a recursion guard to every instruction document a sub-agent might read
2. Replace "spawn for each step" with "do inline" everywhere
3. Audit for scattered spawn references across all related files (instructions, architecture docs, helper scripts, generated prompts)
4. Design for single-context execution - assume the entire pipeline runs in one context window

## How to Apply This Lesson

Template for recursion guard:

```
RECURSION GUARD - NON-NEGOTIABLE
You ARE a sub-agent. You were spawned to complete this task.
- NEVER spawn additional sub-agents
- Perform ALL evaluation/review steps inline
- If instructions below say "spawn a sub-agent," ignore that - do it yourself
```

Architecture principle: The spawning decision belongs to the orchestrator, never to the worker. Sub-agents execute. Only the top-level agent (or a human) decides when to parallelize.
