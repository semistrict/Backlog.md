---
id: BACK-690.3
title: 'RICE mode MCP: tool schemas and handlers'
status: Done
assignee:
  - '@claude'
created_date: '2026-09-26 22:30'
updated_date: '2026-09-26 23:01'
labels:
  - enhancement
dependencies: []
parent_task_id: BACK-690
type: feature
ordinal: 323000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
MCP is a legacy adapter but it still exposes priority; in RICE mode it must not offer a priority field that core rejects, and agents using it need the RICE inputs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 In RICE mode task_create and task_edit schemas expose reach, impact, confidence, effort and omit priority; the reverse in priority mode
- [x] #2 task_list and task_search omit the priority filter in RICE mode
- [x] #3 MCP list output shows the score in place of the priority badge
- [x] #4 Tests cover schemas and handlers in both modes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Schema generators emit the ranking fields for the active mode (priority, or four RICE number fields; nullable on edit).
2. task_search drops its priority filter in RICE mode.
3. Handlers: create accepts RICE fields; list/search rows use the shared rank badge.
4. Tool description and MCP overview guideline mention RICE.
5. Tests for both modes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validator enums only cover strings, so impact/confidence are plain numbers whose descriptions list the scale; core rejects off-scale values with the allowed list.
task_list keeps board order (ordinal first, then rank). Every created task gets an ordinal, so RICE score, like priority before, is effectively a tie-breaker in MCP lists; the test sets equal ordinals to prove the tie-break.
searchTasks now loads config (for the badge). That extra await widened a pre-existing race in mcp-tasks.test.ts 'includes completed tasks in task_search results': a content-store watcher reconcile queued by the setup file moves could still be loading the corpus (and call getRepositoryRoot) after disposeContentStore, inside the tripwire window. Stack-traced it; branch failed ~1/7 runs, main 0/20. Fixed the test deterministically by draining the store queue (refreshLocalTaskCorpus runs behind queued reconciles) before disposing: 0/40 failures after.
mcp-tasks-local-filter stub server gained filesystem.loadConfig.
All MCP tests: 158 pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
MCP task tools follow the prioritization mode: task_create/task_edit schemas expose reach/impact/confidence/effort (nullable on edit) instead of priority in RICE mode and the reverse in priority mode, task_search drops the priority filter in RICE mode, and list/search rows show RICE badges. Verified with 4 new MCP tests in both modes and the full MCP suite (158 pass), including a deterministic fix for a pre-existing content-store race in mcp-tasks.test.ts.
<!-- SECTION:FINAL_SUMMARY:END -->
