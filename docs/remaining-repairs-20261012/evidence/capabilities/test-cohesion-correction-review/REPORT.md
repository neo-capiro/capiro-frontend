# Calendar held-preflight correction review

**TCR-01 is closed** for commit `3195ffab57584054a714ff5bd025063fba363929` and the targeted owner replay.

The test now captures the exact old preflight request, confirms the original actor/meeting/client attempt is pending, replaces the actor, releases the read and observes either completed transport or explicit `ERR_ABORTED`. It then requires that same original attempt to be `refused` before the preserved dialog-absence and zero-write checks. Neither the replacement actor's idle state nor dialog disappearance can satisfy this barrier. No sleeps or production changes were added.

The owner replay passed 1/1 with one worker, zero retries/skips/flakes, and records the actual aborted request, original attempt refused, zero writes. This reviewer independently inspected exact source and recomputed its size signals; no browser rerun was performed.

Final `calendar-sharing.spec.ts` SHA256: `0ee7273f96b8c01cf9af22739d436ab207dcd3dd21f9d69dd8871bd2809f7cae`.

- File: 469 nonblank lines; fingerprint `062206c3277a4a8e3cde4ddef011c7bca486457f523ff3c5fbfccfdbc8b68b29`.
- Existing setup: 81 lines; unchanged fingerprint `fad2e4d85b892511b6f812be3847d67b27affde5c1d7f51f10ecfed57f128125`.
- Harness SHA256: `c677b8570f1fcd4b121fad6047962ed570717ed76dbadb418cda12e06a86df38`; no size trigger.

The extra lines belong to one existing sharing lifetime control. The observer uses the canonical attempt-key helper and reads actual query state; it does not reimplement or mock the authorization algorithm. All other tests and assertions remain. Local cache replacement still does not claim full application-session/native authority acceptance. Root owns integration and combined qualification.
