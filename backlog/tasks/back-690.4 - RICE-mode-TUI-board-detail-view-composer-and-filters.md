---
id: BACK-690.4
title: 'RICE mode TUI: board, detail view, composer and filters'
status: To Do
assignee:
  - '@claude'
created_date: '2026-09-26 22:30'
labels:
  - enhancement
dependencies: []
parent_task_id: BACK-690
type: feature
ordinal: 324000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Humans using the terminal UI need to see and edit RICE the same way they see and edit priority today.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Board cards and list rows show the score in place of the priority badge in RICE mode
- [ ] #2 Task detail view shows RICE inputs and score
- [ ] #3 Task composer edits the four RICE inputs instead of priority
- [ ] #4 Priority filter control is absent in RICE mode
- [ ] #5 Tests cover rendering in RICE mode
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
