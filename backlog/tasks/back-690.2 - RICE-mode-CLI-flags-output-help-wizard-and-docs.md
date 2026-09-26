---
id: BACK-690.2
title: 'RICE mode CLI: flags, output, help, wizard and docs'
status: Done
assignee:
  - '@claude'
created_date: '2026-09-26 22:30'
updated_date: '2026-09-26 22:52'
labels:
  - enhancement
dependencies: []
parent_task_id: BACK-690
type: feature
ordinal: 322000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The CLI is the canonical surface (MANIFESTO). RICE mode must be fully usable there before other surfaces adopt it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Plain list/search output shows the score in place of the priority badge; `task view --plain` shows inputs and score
- [x] #2 `--json` output includes the RICE inputs and score
- [x] #3 Interactive task wizard prompts for RICE inputs instead of priority in RICE mode
- [x] #4 Help text, input schema and completions reflect the active mode
- [x] #5 ADVANCED-CONFIG.md, CLI-INSTRUCTIONS.md and src/guidelines document RICE mode
- [x] #6 CLI tests cover create, edit, clear, list ordering, view, JSON, and mode rejection
- [x] #7 `task create`, `task edit` and `draft edit` accept --reach, --impact, --confidence, --effort; passing "" on edit clears an input (`draft create` has no ranking flags, matching --priority)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Plain/JSON formatters take the prioritization config (required option/param) so no caller can forget it.
2. Shared helpers: parseRiceInputs, formatTaskRankBadge, describeTaskRank, formatRiceSummary.
3. CLI create/edit flags, help schema, config get/set/list, list/search/draft rows, filters.
4. Wizard RICE questions; completions.
5. Docs; CLI + wizard tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
formatTaskPlainText now requires a prioritization option; CLI uses a local formatTaskDetailPlain helper and MCP's formatTaskCallResult now takes (core, task) and loads the detail and config itself.
JSON: priority is null in RICE mode; rice is null in priority mode and otherwise {reach, impact, confidence, effort, score}.
--sort priority keeps its name and orders by RICE score in RICE mode (header reads 'sorted by RICE score').
Board order stays ordinal-first as before; RICE (like priority before) is the tie-breaker, and the explicit sort-by-priority column actions use it.
Full suite: 2928 pass / 8 skip / 4 fail. cli-json-output envelope needed the new rice: null field (fixed, 16 pass). board-tui-move and content-store failures pass in isolation (87 pass) — timing flakes under full-suite load, unrelated to ranking.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
CLI supports RICE mode end to end: --reach/--impact/--confidence/--effort on task create/edit and draft edit, config get/set/list prioritization, score badges in list/search/draft rows, RICE line in plain view, rice object in JSON, mode-aware help/completions, RICE questions in the wizard, and docs. Verified with 12 CLI/wizard tests, a manual scratch-repo run, and the full suite.
<!-- SECTION:FINAL_SUMMARY:END -->
