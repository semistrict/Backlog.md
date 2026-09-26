---
id: BACK-690
title: Add a RICE prioritization mode
status: Done
assignee:
  - '@claude'
created_date: '2026-09-26 22:29'
updated_date: '2026-09-26 23:29'
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
- [x] #1 Project config key `prioritization` accepts `priority` (default) or `rice`; `config get` and `config set` support it and reject other values
- [x] #2 In RICE mode a task stores reach, impact, confidence and effort; the score is never stored and is always computed as reach x impact x confidence% / effort
- [x] #3 Impact accepts only 3, 2, 1, 0.5, 0.25; confidence only 100, 80, 50 (percent); reach any number >= 0; effort any number > 0; invalid values fail with the allowed values
- [x] #4 In RICE mode priority cannot be set or filtered and is not shown on any surface; in priority mode the same holds for RICE inputs; inactive values already in task files are preserved
- [x] #5 Every ordering that uses priority (board default order, `--sort priority`, MCP lists, web and TUI sorting) orders by RICE score descending in RICE mode, with unscored tasks last
- [x] #6 CLI, TUI, web UI and MCP show and edit RICE inputs and score in RICE mode
- [x] #7 ADVANCED-CONFIG.md, CLI-INSTRUCTIONS.md and shipped agent guidelines document RICE mode
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Five slices, each its own subtask and commit: core (690.1), CLI (690.2), MCP (690.3), TUI (690.4), web + HTTP API (690.5).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
All five subtasks done. Ordering note for AC #5: RICE score replaces priority exactly where priority ranked tasks before. task list (default and --sort priority), the web All Tasks RICE column, and the board/web 'sort column' actions order purely by score. Board columns and MCP task_list keep their existing ordinal-first order, so every created task (which gets an ordinal) is ranked by score only as a tie-break, the same way priority behaved. Whether RICE mode should make boards score-first is an open product question for the user.
Pre-existing issues seen but not changed: content-store tests flake under full-suite load (also on main); web modal Title blur + Save sends two PUTs and the second 409s (also in priority mode).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a RICE prioritization mode (config prioritization: priority|rice). In RICE mode tasks store reach, impact, confidence and effort under a rice: frontmatter map, the score (reach x impact x confidence% / effort) is derived on read, and RICE replaces priority on every surface: CLI flags/output/JSON/help/wizard, MCP schemas and handlers, TUI list/details/composer/overview, and the web UI and HTTP API. The inactive model is rejected on input and hidden on output while values already in files are preserved. Verified with ~50 new tests across core, CLI, MCP, TUI, server and web, the full suite (2947 pass; the one failure is a content-store flake that also fails on main), and end-to-end CLI and browser runs.
<!-- SECTION:FINAL_SUMMARY:END -->
