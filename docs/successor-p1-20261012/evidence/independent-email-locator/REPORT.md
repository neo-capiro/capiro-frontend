# Email actor-change browser failure diagnosis

Classification: **reproducible test locator/timing defect; no application zero-effect failure demonstrated**.

The full49f6609 gate failed at `apps/web/tests/browser/email-compose.spec.ts:521-522`, before the zero-effect assertions. The global text locator matches two valid error presentations: the mailbox availability guard and the attachment job guard. When both render before the assertion resolves, Playwright raises a strict-mode violation. When only the earlier mailbox message is present, that same global assertion passes before observing attachment refusal.

Original failed trace/context/screenshot and the running log snapshot were copied before replay into `original-failure/` and `original-browser.log`; `original-hashes.json` preserves their SHA-256 binding. `source-binding.json` records reviewed head and file hashes. `original-network-observations.json` shows that the original failure and all three unchanged replays each issued only the synthetic upload-url prepare POST, with no storage, confirmation or send request.

- Unchanged original copied spec: **2 failed / 1 passed** over three repeats, all failures the same strict locator ambiguity (`original-replay.json`, `original-replay.log`, `original-replay-output/`).
- Proposed assertion in copied temporary spec: **3 passed / 0 failed** over three repeats (`scoped-replay.json`, `scoped-replay.log`, `scoped-replay-output/`). Original counter assertions were retained. `scoped-effect-counts.json` records prepares1, uploads0, confirms0, reads0 and sent[] for every repetition.
- Source guards remain coherent: `authority.ts` rechecks the captured actor after awaited transport; `useMailAttachments.ts` transitions the rejected job to Needs review; `AttachmentFields.tsx` presents its own scoped alert. No source change is necessary for this observed failure.

Recommended test-only correction:

```ts
await expect(
  page
    .getByRole("region", { name: "Email attachments" })
    .getByRole("alert"),
).toContainText("mailbox session changed or is unverified");
expect(state.counts()).toMatchObject({ uploads: 0, confirms: 0 });
expect(state.sent).toHaveLength(0);
```

This scopes to the intended completed attachment refusal; `.first()` would merely suppress ambiguity and could still finish before the upload workflow has refused.

Review used existing root-owned5191, no webServer, one browser worker, separate temporary configs/spec copies/output only. No application/test source, shared report or server state was changed. Root still owns the test correction, new source pin and complete final gate replay; these focused passes do not turn the original full gate green.
