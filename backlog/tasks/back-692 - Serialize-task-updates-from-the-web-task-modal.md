---
id: BACK-692
title: Serialize task updates from the web task modal
status: Done
assignee:
  - '@claude'
created_date: '2026-09-26 23:56'
updated_date: '2026-09-26 23:58'
labels:
  - bug
dependencies: []
type: bug
ordinal: 326000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In the web task modal, editing the sidebar Title and clicking Save sends two PUT /api/tasks/<id> at once: the Title field saves on blur (it is an inline sidebar field in every mode) and handleSave sends the full form. The server holds a per-task write lock and fails fast, so the second request returns 409 "is being modified by another process" and the save reports an error although the rename landed. Any modal field that commits on blur (e.g. RICE reach/effort) races the same way. Reproduced in both prioritization modes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Clicking Save while a blur-saving field has focus sends its updates one after another and reports success, never a lock error
- [x] #2 Every task update the modal sends (inline fields, checklists, type, comments, Save) goes through one ordered queue per modal
- [x] #3 A jsdom test reproduces blur-then-Save and asserts the requests never overlap
- [x] #4 Verified in a browser against a scratch project
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Route every apiClient.updateTask call in TaskDetailsModal through one per-modal promise chain (updateTask helper).
2. jsdom test: focus title, edit, blur+Save in one act; assert one request in flight at a time and a clean save.
3. Browser check against the scratch project.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Cause: the sidebar Title input is an inline field that saves on blur in every mode (onBlur -> handleInlineMetaUpdate). Clicking Save blurs it first, so its un-awaited PUT and handleSave's PUT hit the server together; the core's per-task write lock fails fast and the second returns 409. Other blur-committed fields (RICE reach/effort) had the same race.
Fix: serialize all modal updates (inline metadata, criteria/DoD toggles, type, comments, Save) on one chain; a failed request does not block the next. Kept both requests rather than dropping the inline save, since the inline title save is also how preview mode renames.
Test fails without the chain (both requests in flight) and passes with it. Web suite 282 pass. Browser: edit title + Save sends two PUTs, both 200, title persisted, no error.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Web task modal now sends its task updates one at a time, so a blur-saving field followed by Save no longer produces a 409 lock error. Verified with a new jsdom test that fails without the fix, the web suite, and a browser run.
<!-- SECTION:FINAL_SUMMARY:END -->
