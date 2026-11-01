# Save and load — Chess Study

## Promise shown to the user

Save starting FEN plus move history, not FEN alone; reconstruct and verify. Never save a running worker.

## Authoritative fields

- initial FEN and complete move history
- current FEN consistency check
- selected difficulty and side
- exercise id and solved set
- undo history policy
- RNG seed for equally rated AI choices

Use the versioned envelope from [SAVE-LOAD.md](../../docs/SAVE-LOAD.md), app id `chess-study`, a content/rules version and any required engine fingerprint. Derived render positions, DOM, texture handles, Rive artboards and in-flight worker jobs are excluded. XR anchors, tracked poses and hardware identities are excluded.

Pause at a committed game boundary, cancel uncommitted input, capture only the documented snapshot/checkpoint and report what was actually written. A visible Save operation must not quietly write an older checkpoint without saying so. On load validate size, app/version, finite values, ids and invariants, prepare a replacement, then commit; failure leaves the current game intact. The game resumes paused with an explicit Resume.

Restart/load invalidates callbacks, held inputs and queued AI results from the previous state.

File integration is unbound until the real host services are inspected. Do not invent host method names, atomic write guarantees or another hidden document store. Use explicit Save As/conflict handling appropriate to the actual provider.
