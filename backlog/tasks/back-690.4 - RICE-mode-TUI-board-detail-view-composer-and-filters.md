---
id: BACK-690.4
title: 'RICE mode TUI: board, detail view, composer and filters'
status: Done
assignee:
  - '@claude'
created_date: '2026-09-26 22:30'
updated_date: '2026-09-26 23:13'
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
- [x] #1 Task detail view shows RICE inputs and score
- [x] #2 Task composer edits the four RICE inputs instead of priority
- [x] #3 Priority filter control is absent in RICE mode
- [x] #4 Tests cover rendering in RICE mode
- [x] #5 Task list rows show the RICE score in place of the priority dot in RICE mode (board cards show no priority today and stay unchanged)
- [x] #6 Overview shows a RICE breakdown (scored/unscored) in place of the priority breakdown in RICE mode
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Viewer: mode-aware list marker, RICE line in details, no priority filter/shortcut in RICE mode.
2. Board: hide priority filter, P key and footer/help hints in RICE mode; popup gets prioritization via a TaskDetailContentOptions object.
3. Composer: ranking slot becomes a RICE field that asks for reach, impact, confidence and effort (new reusable text-input popup).
4. Statistics carry prioritization + scored/unscored counts; overview renders a RICE breakdown.
5. Tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
createTaskPopup now takes (screen, task, TaskDetailContentOptions) instead of positional milestone/date/projects args.
Footer/help take FilterShortcutOptions { hasProjects, hasPriority } (hasPriority defaults to true).
Composer keeps the internal field id 'priority' for the ranking slot to leave its layout/navigation logic untouched; in RICE mode it renders 'RICE: <score|unscored|None> ▼' and opens promptRiceInputs. Cancelling any prompt keeps the previous inputs.
TUI editing of existing tasks stays the external-editor flow (as for priority), so the composer is the only structured RICE input in the TUI.
Tests: tui-rice-prioritization (5) and 3 composer RICE tests including an end-to-end create; all TUI/board suites pass (full run: 2943 pass / 8 skip / 1 fail — content-store 'refreshes completed identity state', which passes 6/6 in isolation on both branch and main).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TUI follows the prioritization mode: list rows show RICE scores, task details show the RICE line, the priority filter/shortcut/hints disappear in RICE mode, the composer collects the four RICE inputs through its ranking slot, and the overview shows a scored/unscored RICE breakdown. Verified with 8 new TUI tests (including an end-to-end composer create) and the TUI/board suites.
<!-- SECTION:FINAL_SUMMARY:END -->
