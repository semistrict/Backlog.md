---
id: BACK-690.1
title: 'RICE mode core: config, persistence, validation, scoring and ordering'
status: Done
assignee:
  - '@claude'
created_date: '2026-09-26 22:30'
updated_date: '2026-09-26 22:36'
labels:
  - enhancement
dependencies: []
parent_task_id: BACK-690
type: feature
ordinal: 321000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Foundation for BACK-690. Every surface needs one shared definition of the prioritization mode, the stored RICE inputs, their validation, the computed score and the ordering, so that CLI, MCP, TUI and web cannot drift.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Config `prioritization: priority|rice` loads, saves, and defaults to priority
- [x] #2 Task frontmatter round-trips a `rice:` map with reach, impact, confidence and effort; partial inputs are allowed
- [x] #3 Core create/update validate RICE inputs against the fixed scales and reject them in priority mode; priority is rejected in RICE mode
- [x] #4 Score is computed only when all four inputs are present
- [x] #5 Shared sorting ranks by score descending in RICE mode, unscored last, falling back to task ID
- [x] #6 Priority filtering is rejected in RICE mode
- [x] #7 Unit tests cover parsing, serialization, validation, scoring and ordering
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add PrioritizationMode, RiceInputs types and config key.
2. New src/utils/prioritization.ts: mode, validation, score, badge, ranking.
3. Parse/serialize rice frontmatter; parse/save prioritization config (fail on unknown).
4. Core create/update: validate RICE, reject inactive model.
5. Shared sorting and statistics take the prioritization config.
6. Unit + core tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Shared module src/utils/prioritization.ts is the single definition every surface uses: getPrioritizationMode, requireRiceInput/applyRiceUpdate (validation), computeRiceScore/formatRiceScore, formatTaskRankBadge, getTaskRank/compareTaskRank, resolveActivePriorityValue (surfaces use it to validate priority set/filter values, which throws in RICE mode).
Sorting helpers (sortTasks/sortByPriority/sortByOrdinalAndPriority) now take a PrioritizationConfig instead of a priority list; 'priority' sort means the project's ranking.
Core rejects any priority input in RICE mode, including clearing with an empty value, and any RICE input in priority mode. Inactive values in files are preserved.
Statistics leave priority counts empty in RICE mode; loadAllTasksForStatistics returns prioritization config instead of the priority list.
Unknown prioritization values in config fail at load like other invalid config values.
Priority filter rejection is enforced per surface through resolveActivePriorityValue (CLI, MCP, server slices).
Validation: bun test src/test/rice-prioritization.test.ts (23 pass) plus statistics, task-sorting, shared-branch-task-loader, web-task-column-sort, priority, server-statistics-endpoint, config-commands (111 pass); bunx tsc --noEmit and bun run check . clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the shared RICE model: prioritization config key (priority|rice), rice frontmatter map, validated inputs on the fixed scales, derived score, mode-aware sorting and statistics, and core rejection of the inactive model. Verified with 23 new unit/core tests and the existing sorting/statistics/loader suites; tsc and biome clean.
<!-- SECTION:FINAL_SUMMARY:END -->
