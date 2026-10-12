The failure is exhaustion of the global30-second test budget; the trace records no failed product assertion. Preserve this execution as timed out, not passed.

The protected-state screenshot shows only “Checking saved follow-up recovery…” while the fresh identity request is held. The Title/request-ID absence checks then pass. After release, the retained title and details pass before the timeout event; request-ID visibility, the enabled recovery-read button and exactly one POST finish without an assertion error immediately afterward. The error-context snapshot shows the correctly restored retained command. Initial polling subattempt mismatches are transient; their parent assertion passes.

Key elapsed spans from test.trace:

| Step | Duration |
| --- | ---: |
| Fixture navigation | 4.526s |
| Client-profile navigation | 4.647s |
| Close click | 4.988s |
| Reopen click | 2.490s |
| Held-authority screenshot | 5.703s |

Close waits4.367s for visible/enabled/stable; reopen waits1.978s. The screenshot reports fonts loaded within20ms, then takes roughly5.6s more. These are consistent with scheduling/rendering pressure. CPU saturation was not measured by the trace, so resource contention remains an inference. The observed4-worker Portfolio run and reported concurrent Modules/static work support that inference.

Matching source: activity-command-reopen.spec.ts:24 deliberately holds /core/me; lines33–39 capture/check the hidden state before finally releasing. useCommandRecovery.ts:36–56 invalidates activation on reopen during render; lines59–87 verify authority before installing retained state; lines109–117 gate readiness by current token. useFollowUpCommand.ts:96 exposes pending data only after readiness. QuickLog.ts:53–66 renders the checking message instead of the form. The source and trace agree.

The identical control passed in26.394s on943d90c; its entire apps/web tree is identical to d5dd0be. It also passed in22.148s on49f6609; that is corroborating control history, not a claim that the entire earlier application is identical.

Agree with the parent's explicit execution-only recovery plan: retain the failed run, rerun all996 Portfolio tests on unchanged d5dd0be with3workers, a60-second total test budget and retries0, and require a complete green report. The5-second expect deadline stays unchanged. Action-specific settings stay unchanged, but actions use timeout0 and inherit the total test budget, so their effective available time increases. Do not call a targeted replay a replacement for full qualification. No source/test assertion change is supported by this failure.

This reviewer inspected raw trace/network/screenshots and source only. No browser was launched, run interrupted, timeout changed, source edited or cloud action performed. Exact chronology, historical controls, source snapshots and original failure evidence are included.

Network evidence records exactly one activity-command POST; its503 is the fixture's intentional lost-response simulation. The reopened /core/me call completes200 after6.009s because the test deliberately holds it through screenshot and absence checks; that duration is not measured backend latency.
