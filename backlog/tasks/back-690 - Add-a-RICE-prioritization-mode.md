---
id: BACK-690
title: Add a RICE prioritization mode
status: In Progress
assignee:
  - '@claude'
created_date: '2026-09-26 22:29'
labels:
  - enhancement
dependencies: []
type: feature
ordinal: 320000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Some teams rank work by expected value rather than by a coarse level like high/medium/low. RICE (Reach x Impact x Confidence / Effort, popularized by Intercom) is a common way to do that, and no Git- or Markdown-based task tool offers it today. A project should be able to switch into a RICE mode in which RICE inputs replace priority everywhere: a mixed view where both exist would leave two conflicting rankings. This is fork-only work for semistrict/Backlog.md, following the multi-slice rollout pattern of BACK-643 (core, CLI, MCP, TUI, web).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Project config key `prioritization` accepts `priority` (default) or `rice`; `config get` and `config set` support it and reject other values
- [ ] #2 In RICE mode a task stores reach, impact, confidence and effort; the score is never stored and is always computed as reach x impact x confidence% / effort
- [ ] #3 Impact accepts only 3, 2, 1, 0.5, 0.25; confidence only 100, 80, 50 (percent); reach any number >= 0; effort any number > 0; invalid values fail with the allowed values
- [ ] #4 In RICE mode priority cannot be set or filtered and is not shown on any surface; in priority mode the same holds for RICE inputs; inactive values already in task files are preserved
- [ ] #5 Every ordering that uses priority (board default order, `--sort priority`, MCP lists, web and TUI sorting) orders by RICE score descending in RICE mode, with unscored tasks last
- [ ] #6 CLI, TUI, web UI and MCP show and edit RICE inputs and score in RICE mode
- [ ] #7 ADVANCED-CONFIG.md, CLI-INSTRUCTIONS.md and shipped agent guidelines document RICE mode
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
