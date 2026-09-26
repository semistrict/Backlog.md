---
id: BACK-690.5
title: RICE mode web UI and server API
status: To Do
assignee:
  - '@claude'
created_date: '2026-09-26 22:30'
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
- [ ] #1 Server create/update endpoints accept RICE inputs and reject priority in RICE mode; priority filters are rejected in RICE mode
- [ ] #2 Task cards and task list show the score in place of priority; task list can sort by score
- [ ] #3 Task details modal edits the four RICE inputs with the fixed scales
- [ ] #4 Priority filters and priority statistics are hidden in RICE mode
- [ ] #5 Verified in a browser in both modes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
