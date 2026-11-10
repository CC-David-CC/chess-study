> Original design reference from 2026-10-30. This describes intended behavior, not current implementation or qualification. The current app README is authoritative for status. Pseudocode and template JSON here are documentation, not build entries.

# Acceptance — Chess Study

**All runtime cases are NOT RUN.** This file is a plan; document checks are not gameplay evidence.

Apply all C01–C24 in [common acceptance](../../../../../docs/games/design-reference/ACCEPTANCE-COMMON.md). No immersive support is claimed or required for this flat-screen app.

## Game-specific cases

| ID | Experiment / invariant | Status |
|---|---|---|
| chess-study-G01 | Underpromotion, en passant exposure and castling through check are rejected/handled correctly. | not_run |
| chess-study-G02 | Repetition survives save/load because history is retained. | not_run |
| chess-study-G03 | Worker reply after undo is rejected. | not_run |
| chess-study-G04 | Search finishes or is canceled at its budget. | not_run |
| chess-study-G05 | Promotion is playable entirely by touch. | not_run |
| chess-study-G06 | Exercise completion cannot be granted by a stale search reply. | not_run |

## Release evidence

Record rules/content and dependency versions, actual asset names/hashes, desktop browser, real phone and (where required) Galaxy XR build, commands/logs, complete-playthrough result, save restoration result, multiwindow/late-disposal behavior, frame timing and unresolved defects. Exercise actual Rive properties and texture input rather than substituting an HTML mock.

A pure rules unit test, a visual smoke test and a hardware XR test are different evidence. Preserve that distinction. All promised features must be demonstrated or explicitly left incomplete; do not relabel a generic engine scene as the finished game.
