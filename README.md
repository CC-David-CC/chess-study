# Chess Study — desktop integration

Chess Study is a single-player chess board backed by `chess.js` 1.4.0. The
desktop app supports playing either side against three bounded local search
levels, undo, hints, four promotion choices, eight tactical exercises, keyboard
shortcuts and a touch board.

Each instance owns its board state, Canvas renderer, audio context and AI
worker. AI requests carry a position revision and deadline; undo, pause, load,
new game and disposal invalidate late replies by terminating the owned worker.

Save and Open use the signed-in desktop's `My files` context. Files retain the
initial FEN, complete move history, selected side, difficulty, exercise state,
RNG state and revision, reproduce and verify the current FEN, and reopen paused.
Conflicting or changed files produce an explicit notice.

## Evidence

```sh
npm install --prefix apps/system/chess-study --ignore-scripts
npm run typecheck --prefix apps/system/chess-study
npm test --prefix apps/system/chess-study
```

The source model tests cover legal castling/underpromotion rules, stale AI
replies, complete-pair undo, exercise solutions and save reconstruction.

Save and Open serialize file actions, pause the board, capture the logical
snapshot and destination before storage work, and reject stale operations after
confirmation. A save in progress keeps the desktop close guard active, while
later edits remain unsaved. Moving or closing the desktop window, changing
workspace, browser blur and page visibility loss pause the board and require
Resume. The browser fixture covers desktop and emulated-phone interaction;
`tests/chess-study-safety.test.mjs` covers a delayed save whose destination
field changes while storage is pending.

## Remaining gates

No authored `chess-guide.riv` is present. The visible guide is explicitly a
development fallback, so the Rive acceptance gate remains open. Physical-phone
testing, complete AI strength/performance measurements and a full
cross-device playthrough remain unverified.

While the local opponent is thinking, its pieces cannot be moved by the player.
Undo removes a player move awaiting an AI reply, or the most recent completed
player/AI pair. Resetting an exercise is an unsaved change. Keyboard shortcuts
leave editable fields and controls alone. Local registered-account tests cover
delayed AI replies and undo at desktop and emulated-phone sizes; a separate
test uses the actual browser-local AI worker, syncs the game, and reopens it in
a fresh phone-sized browser session. Physical touch and AI strength remain
unverified.
