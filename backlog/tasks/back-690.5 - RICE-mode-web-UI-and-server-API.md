---
id: BACK-690.5
title: RICE mode web UI and server API
status: Done
assignee:
  - '@claude'
created_date: '2026-09-26 22:30'
updated_date: '2026-09-26 23:29'
labels:
  - enhancement
dependencies: []
parent_task_id: BACK-690
type: feature
ordinal: 325000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The browser is the main human-facing view; in RICE mode it must show, edit and order by RICE, and the HTTP API must accept RICE inputs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Server create/update endpoints accept RICE inputs and reject priority in RICE mode; priority filters are rejected in RICE mode
- [x] #2 Task cards and task list show the score in place of priority; task list can sort by score
- [x] #3 Task details modal edits the four RICE inputs with the fixed scales
- [x] #4 Priority filters and priority statistics are hidden in RICE mode
- [x] #5 Verified in a browser in both modes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Server: create/update accept rice {reach, impact, confidence, effort} (null clears on update); priority filters on /api/tasks and /api/search return 400 in RICE mode.
2. Web: replace availablePriorities props with one prioritization config prop (App -> BoardPage/Board/TaskColumn/TaskCard, TaskList, TaskDetailsModal, MilestonesPage, DraftsList).
3. Cards/list/milestones/drafts show RICE scores; list sorts by score; priority filters hidden; column sort action reads 'Sort by RICE score'.
4. Modal: RiceInputsFields card replaces the priority select; Save never sends priority in RICE mode.
5. Statistics: RICE distribution (scored/unscored).
6. Server + web tests; browser verification.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Browser verification (built binary against a scratch project in RICE mode): board RICE badges, no priority filter, legacy hidden-priority task shows no badge; 'Sort by RICE score' column action reorders by score with unscored last; modal RICE card shows stored inputs, reach edit persists (PUT 200) and score updates to 30; effort 0 is rejected client-side with the allowed range; All Tasks has a sortable RICE column (ascending: unscored, 10, 30, 266.7) and no priority filter; Statistics shows RICE Distribution 3 scored / 1 unscored; New Task form with RICE inputs created TASK-5 whose frontmatter holds the rice map.
Edit->Save on a task with a hidden legacy priority sends no priority (rename saved, priority preserved in file).
Observed a pre-existing race unrelated to RICE: blurring the Title field inline-saves while Save sends a second PUT, which returns 409 (task lock). Reproduced identically in priority mode.
The web UI has no semantic color tokens, so RICE pills follow the surrounding explicit light/dark Tailwind pairs (violet), shared through web/utils/rank-label.ts.
Full suite: 2947 pass / 8 skip / 1 fail (content-store 'keeps surviving distinct-path branch identities ambiguous...', which also fails in a full run on main).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Web UI and HTTP API follow the prioritization mode: RICE payloads on create/update, 400 for priority filters in RICE mode, RICE scores on cards/list/milestones/drafts, score sorting, hidden priority filters, a RICE editor in the task modal, and a RICE statistics breakdown. Verified with 3 server tests, a web board test, the web/server suites (417 pass), and an end-to-end browser pass in both modes.
<!-- SECTION:FINAL_SUMMARY:END -->
