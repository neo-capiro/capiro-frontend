# Local Duplicate task candidate

Base: local locator correction `1ec306131bbc57699f66593893f95983d815cbd7`, preserving published test candidate4ac87e75 and exact PR52. Branch: `feat/planner-duplicate-draft`. Local only: no push, PR, AWS or live mutations.

Duplicate task opens a fresh editable New task draft named Copy of the saved task. It copies description bytes, priority, clientId and currently available nonarchived admin/editor project memberships, preserving valid section IDs with new position0. It does not pass the source task into update mode. Name is bounded to500characters for user review. Assignee and dates start empty and remain explicit editable fields. Status/approval/subtype use canonical todo/pending/task defaults; time estimate0 and no dependencies/collaborators/tags/recurrence/parent are copied. Service defaults own new identity/version/timestamps/customValues/meetingId and history. No subtasks, attachments or comments are copied.

The existing useTaskEditor owns draft/memberships/create and pending fences. TaskDetail composes a separate create model, disables source actions/dismissal while duplicate is open and fences synchronous source handlers. Cancel does not write; submission calls only canonical planner.task.create. Current id/version/access replacement and canonical mutation disposal retire stale completions. Existing edit/comment/archive/subtask/time workflows remain canonical.

## Executed validation

- Two seed unit controls PASS, including maximum-length title/schema validity, source preservation and writable project/section filtering.
- Five focused Duplicate browser controls PASS: reviewed exact create-only payload; no writes on open/cancel; three same-tick submissions admit one create; pending field/dismissal fences and visible409retention; viewer/commenter restrictions; held create retired after source receipt replacement with settled response and zero stale callbacks.
- Ten existing desktop-closeout browser controls PASS: direct edit/readback light/dark, pending success/refusal fences, nested/breakpoint draft continuity, source/receipt replacement and comment/archive versus inline submission. Existing keyboard/axe and screenshots remain in those controls. These are local synthetic tests, not mobile parity or live acceptance.
- Architecture PASS: zero errors/blocking,480reviewed and19unchanged inherited unreviewed findings. Initial unit placement crossed the source scanner boundary; moved to the established tests directory without weakening the guard, then reran successfully.
- Owned-source lint PASS. Formatting/whitespace checked separately before commit.
- Full frontend TypeScript checking remains BLOCKED at bounded768MB and1536MB heaps (heap exhaustion). No typecheck pass claimed; no full build or full suite attempted. Cloud type qualification remains required.

Browser execution used a local Planner-only entry composing actual ApplicationBoundary, CapiroBoundary, ModuleShell, PlannerScreen and TaskDetailRefreshProbe. The full local dev entry was blocked before Planner by unrelated stale Meri package export resolution; no package/Meri/source aliases were changed to fake those exports. Inactive full-entry dependency-scan warnings remain diagnostic; the focused cases have no unhandled page exceptions. Earlier discovery/import and local entry-resolution failures are not accepted results. The owner must run the repository default harness in a correctly installed cloud checkout before integration.

## Cloud continuation

With adopted Node24/npm11, root lock installed and a supported Chromium path:

```sh
export NODE_OPTIONS='--max-old-space-size=4096'
export RAYON_NUM_THREADS=1
export CAPIRO_QA_CHROMIUM_EXECUTABLE=/usr/bin/chromium
npm run test:browser:modules --workspace @capiro/web -- planner-duplicate.spec.ts desktop-closeout.spec.ts --workers=1 --retries=0
npm test --workspace @capiro/web -- tests/planner-duplicate-data.test.ts --maxWorkers=1
npm run typecheck --workspace @capiro/web
npm run architecture
```

Source review and exact fingerprints are recorded beside this handoff. This candidate changes three owned production files plus tests and review metadata. Auth, gateway/origin/Dockerfile, APIs, package/lock, Meri and mobile implementation are unchanged. Description toolbar remains unimplemented; its separate audit establishes Markdown+GFM legacy semantics and raw-HTML suppression rather than introducing an HTML format.
