# Chess Study

**Single-player chess versus local AI · Phaser · single-player · phone required · flat-screen app**

> Planned design, not implemented or browser-tested. `index.pseudo.mjs` is an explanatory entry point, not a playable game.

## Experience

A calm readable chessboard with a bounded local opponent, move history and optional instructional hints.

## What this demonstrates

- Pointer/touch board UI
- Worker-based bounded search
- Rich rule validation without coupling to rendering

## Rules and complete loop

- Use chess.js as legal-position/rules authority; implement a small worker opponent rather than pretending chess.js includes AI.
- Legal move selection, castling, en passant, four promotion choices and checkmate. A documented casual draw policy uses the library predicates; do not claim tournament adjudication.
- Each AI search carries a position revision and deadline; loading, undoing or closing invalidates late replies.

## Bounded polished release

Play as either side, three explicitly bounded search levels, eight authored tactical exercises and an untimed game.

- Squares labeled and selected moves distinguishable without color
- Board orientation follows side, not device rotation
- AI never blocks touch scrolling or window movement

No multiplayer, accounts, server simulation or generic editor is required. Start, rules/help, play/activity, pause, outcome/goal feedback and retry must all be complete. Settings include volume/mute, reduced motion, contrast and game-specific options where meaningful. State changes occur in the game model; animations illustrate them.

## Rive inside this app

Non-distracting guide portrait and thinking indicator; the board remains conventional. The requested asset is `chess-guide.riv`; it is **not included**. See [RIVE.md](RIVE.md) for the authoring/integration contract. A placeholder or unrelated animated logo does not satisfy this requirement.

## Save behavior

Save starting FEN plus move history, not FEN alone; reconstruct and verify. Never save a running worker. See [SAVE.md](SAVE.md). Loading starts paused; resume is explicit. Restart and load cancel stale callbacks and any owned AI work.

## Build sequence

Implement the rule loop in [gameplay.pseudo.txt](gameplay.pseudo.txt); bind the exact app lifecycle from [index.pseudo.mjs](index.pseudo.mjs); complete [CONTROLS.md](CONTROLS.md); author/integrate [RIVE.md](RIVE.md); then satisfy [ACCEPTANCE.md](ACCEPTANCE.md). Do not add XR or a 3D engine solely to widen the technology list.

Target wave: **2**. Integrator first reads [AGENTS.md](../../AGENTS.md); do not guess host APIs from symbolic helper names.

Dependency: chess.js, BSD-2-Clause; pin and test the chosen version. No network chess service.
