---
id: BACK-690.3
title: 'RICE mode MCP: tool schemas and handlers'
status: To Do
assignee:
  - '@claude'
created_date: '2026-09-26 22:30'
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
- [ ] #1 In RICE mode task_create and task_edit schemas expose reach, impact, confidence, effort and omit priority; the reverse in priority mode
- [ ] #2 task_list and task_search omit the priority filter in RICE mode
- [ ] #3 MCP list output shows the score in place of the priority badge
- [ ] #4 Tests cover schemas and handlers in both modes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
