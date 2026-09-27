---
id: BACK-693
title: Make content-store watcher tests deterministic under full-suite load
status: Done
assignee:
  - '@claude'
created_date: '2026-09-27 00:01'
updated_date: '2026-09-27 02:33'
labels:
  - testing
dependencies: []
type: bug
ordinal: 326000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Under the full bun run test load, ContentStore tests in src/test/content-store.test.ts fail intermittently while passing in isolation (also on main). Two symptoms: 3s waitUntil timeouts for watcher events ("refreshes completed identity state when the completed corpus changes", "promotes the surviving same-path branch version before watched deletion publication"), and ~13ms failures of "keeps surviving distinct-path branch identities ambiguous before watched deletion publication" that are really unhandled errors from web App code (fetch() URL is invalid, dispatchEvent not of type Event) leaking from an earlier test file. A flaky suite hides real regressions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Root cause of each observed failure is identified with evidence
- [x] #2 Fixes synchronize on observable events; no sleeps or timeout increases are added
- [x] #3 The previously failing tests pass across repeated full-suite runs
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Pin down each failure mode with evidence.
2. Watcher timeouts: add waitForFileWatchersLive (test-utils) and call it before each file change a content-store test waits to observe.
3. Leaked App refresh: find the test whose refresh outlives it and make its failure path finish against the mocks.
4. Repeated full-suite runs.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Two unrelated causes.

(1) 3s watcher timeouts. Bun (src/runtime/node/fs_events.rs) serves every fs.watch in a process from one FSEvents stream and rebuilds it on the CF thread whenever any watcher is added or closed; the new stream starts at kFSEventStreamEventIdSinceNow, so a change made before it is live is never delivered. Proven by a preload that churns unrelated watchers: content-store then failed 7-8 tests per run (vs 0 without). In the full suite the window is the test writing right after its store starts (or rebinds) watchers while the process is loaded. Fix: a probe watcher added after the store's watchers must see its own write before the test mutates files; probes stay open until teardown since closing one rebuilds the stream again.

(2) Fast failures in whichever test ran ~7s after web-dependency-cleanup-notice ('fetch() URL is invalid' at api.ts fetchStatuses, then dispatchEvent 'not of type Event' at App.tsx refreshData). Its 'warns that an archive moved' test failed the refresh search with a network error; ApiClient.fetchWithRetry retries network/5xx errors with 1s+2s+4s backoff, so the chain outlived the test, fell back to loadAllData against the restored real fetch, and threw inside a later test (seen in core-move-tasks-to-status and content-store in every baseline full run; it also preceded the TUI board mover cascades). Reproduced on demand by running that file before content-store, core-move-tasks-to-status and cli-rice-prioritization (1 ContentStore failure); after the fix the same sequence passes 106/106. Fix: the mock fails the search with a 400, which the client does not retry. A speculative request-drain helper for the App-rendering tests was tried and removed: without it those files ran 5/5 clean after the real leak was fixed.

Product note (not changed here): ContentStore can itself miss a change made right after it binds or rebinds watchers on macOS, for the same Bun reason.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made the full suite deterministic. (1) content-store watcher tests now wait, via waitForFileWatchersLive, until Bun's shared FSEvents stream is live before making the change they observe, instead of racing its rebuild. (2) web-dependency-cleanup-notice no longer leaves a ~7s ApiClient retry chain running after its test (its failing refresh now returns a non-retried 400), which had been throwing inside whichever later test was running. Verified: the leak repro sequence passes 106/106 after the fix (1 failure before); bunx tsc --noEmit and bun run check . clean; three consecutive full bun run test runs 2948 pass / 0 fail (baseline runs failed ContentStore every time).
<!-- SECTION:FINAL_SUMMARY:END -->
