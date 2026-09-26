---
id: BACK-690.2
title: 'RICE mode CLI: flags, output, help, wizard and docs'
status: To Do
assignee:
  - '@claude'
created_date: '2026-09-26 22:30'
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
- [ ] #1 `task create`, `task edit` and `draft create` accept --reach, --impact, --confidence, --effort; passing "" clears an input
- [ ] #2 Plain list/search output shows the score in place of the priority badge; `task view --plain` shows inputs and score
- [ ] #3 `--json` output includes the RICE inputs and score
- [ ] #4 Interactive task wizard prompts for RICE inputs instead of priority in RICE mode
- [ ] #5 Help text, input schema and completions reflect the active mode
- [ ] #6 ADVANCED-CONFIG.md, CLI-INSTRUCTIONS.md and src/guidelines document RICE mode
- [ ] #7 CLI tests cover create, edit, clear, list ordering, view, JSON, and mode rejection
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
