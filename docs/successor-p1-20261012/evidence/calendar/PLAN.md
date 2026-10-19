# Bounded meeting artifact mutation repair

- Calendar owns artifact receipt adapters and actor/meeting/client/kind-scoped attempt state; MeetingArtifacts owns editable draft and controls.
- Reuse existing API client, identity/dispatch guard, meeting schema and React Query cache. No new endpoint or idempotency assumption.
- Validate create/edit/approve metadata separately from share/unshare decorated meeting metadata; validate parent, selected artifact, author where supplied by operation and expected lifecycle state.
- Preflight current meeting/client before dispatch, fence synchronous duplicate submissions, retain unknown completion without replay, discard late former-scope publication. Cache attempts within the current app session so tab/remount cannot erase uncertainty.
- New uniquely named browser regressions cover both notes and debriefs, foreign receipts, failed/duplicate submissions, share/unshare success and wrong states, and client replacement. Pure adapter unit checks cover action-specific receipts.
- Relevant old integration fixture responses may need root-owned correction if they falsely return id-only acknowledgements for native metadata operations. No unrelated presentation fixes.
