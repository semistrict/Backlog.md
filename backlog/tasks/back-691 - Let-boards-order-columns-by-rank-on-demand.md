---
id: BACK-691
title: Let boards order columns by rank on demand
status: Done
assignee:
  - '@claude'
created_date: '2026-09-26 23:38'
updated_date: '2026-09-26 23:43'
labels:
  - enhancement
dependencies: []
type: feature
ordinal: 326000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Boards order each column by manual position (ordinal), and every created task gets one, so RICE score (or priority) only breaks ties there. Rewriting ordinals with the column "Sort by" action loses the manual order. Users want to keep manual order as the default and also view a board ordered by score without rewriting anything.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Web board has an Order control with Manual (default) and rank (labeled RICE score in RICE mode, Priority otherwise); the choice persists in the URL and local storage like lanes
- [x] #2 In rank order each column sorts by score/priority descending, unranked last, ties in manual order; no ordinal is written by switching
- [x] #3 In web rank order, dragging within a column changes nothing; dropping into another column moves the task to the end of that column's manual order
- [x] #4 TUI board toggles rank order with a key shown in the footer and help; entering move mode returns to manual order
- [x] #5 Tests cover web and TUI ordering and the drop behavior
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Shared column sort takes an optional rankBy (compareTaskRank first, manual order for ties) in web lanes.ts and TUI prepareBoardColumns.
2. Web: BoardPage order state (URL ?order=rank + localStorage), segmented Manual/RICE score|Priority control in Board; rank-order drops rebuilt into manual order (same-column no-op, cross-column append).
3. TUI: O toggles session rank order, footer shows [O] Order and a 'By <rank>' indicator, help lists O, entering move mode returns to manual order.
4. Tests + browser check.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reorder normalizes ordinals for the whole list it receives (resolveOrdinalConflicts), so rank-order drops must send the column's manual order; otherwise neighbors' positions would be rewritten. Verified the drop test fails with the same-column guard removed.
TUI rank order is session-only (like its filters); web persists like lanes.
Tests: web-board-filters rank-order block (3), board-tui-rank-order (3); board/TUI/lanes suites 300 pass. Browser: toggle reorders by score (266.7, 80, 30, 10, unscored) and sets ?order=rank.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Boards keep manual order by default and can now be ordered by rank (RICE score or priority) without writing ordinals: a Manual/RICE score control on the web board (persisted in URL and local storage) and an O toggle on the TUI board. Rank-order drops keep manual positions intact. Verified with 6 new tests, the board/TUI suites, and a browser check.
<!-- SECTION:FINAL_SUMMARY:END -->
