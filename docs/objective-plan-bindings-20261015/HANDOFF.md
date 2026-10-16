# Objective operations and manual Engagement plans

This is a separate frontend candidate from ready shipment `9da3616a4c700b658770897c827f517997b69a5e`. It adds an Objective operational read page, current-resource receiving links and the bounded manual Plan workspace. It does not change Meri/Fable or admit a backend deployment. Exact contract custody is in `CONTRACT-PINS.json` and the unchanged `ENGAGEMENT-WIRE.md`.

## Resulting behavior

Objective lists offer **View linked work** without changing the existing editor entry. The full page presents independently authorized Strategies, human cycle annotations, Planner projects, typed decisions and linked meetings. Current owner actions open existing Strategy, Planner and Meeting receivers, which read and verify the exact resource and client again. Only an admitted current-version edit action enables the existing Objective editor. Missing, partial, loading and failed data remain distinct; complete authorized task unions alone produce exact counts.

The read binds the saved Objective's client, ID, version and status. Four flat named cursors retain request and prior-page scope, snapshot, association-set, identity and progress witnesses. Reload resets all sections to the first page, including after a cursor409. Human association write descriptors and original-command/receipt digest validation are prepared and tested, but there is no complete human link/unlink authoring workflow in this candidate.

The Engagement Plan view reads only returned authorized aggregates. An explicitly selected client can create a manual draft, rename it, change its lifecycle, create/edit/archive/restore/reorder waves and record an explicit review version/deadline. Raw history remains separate from current projections. Every ordinary write checks the exact expected aggregate version and requested field echoes. Creation reconciliation preserves the original UUID/payload and original immutable receipt while separately receiving the current aggregate.

When the selected URL client is absent from the returned catalog, the scope selector retains that exact ID and displays **Selected client (name unavailable)**. It does not silently display the all-client option, invent a client name or broaden any query. This presentation correction has three focused rendered regressions; the existing first Plan browser flow also asserts the actual native selection value and label.

Pending or uncertain writes prevent switching to another plan. An uncertain ordinary edit can be dismissed for a fresh read of that exact plan; reading another plan cannot clear it. Unknown creation permits explicit same-command reconciliation while its scoped owner remains mounted. This is not a durable journal across route, client, identity or browser closure; the UI states that limitation.

## Contract and availability limits

- Objective read source: backend `622905839c7a510ab01a512ef8012926b2e1b4ce`, reviewed contract `6ce5cacd261e4e4541fea482beea160a3f6c3702`, exact schema SHA256 `6314da43305d37140c8dfeedb9b042c7e41f1354fd60f06da371e918d209ab93`. Automation, questions, generated-current pins and frozen saved-version receiving remain unavailable. Ordinary current navigation does not establish generated/applied lineage.
- Plan receiving wire: backend PR27 successor `016e79b585c14f20d13669e13c987c01e3dd29dd`, exact WIRE SHA256 `64181558d22ccd71bf1b09f5644a2431e591567cd2b77913f9a6471b7004e8e2`. This migration-only successor corrects inherited TRUNCATE privileges on four new tables. Its wire is byte-identical to the independently reviewed receiving pin9a151; owner evidence retains the matched failing/passing ACL regression. Full application and production posture remain separately unqualified. This pin establishes source custody, not live API adoption.
- No wall-scoped office discovery endpoint exists. New plans omit office references; recorded references display current server availability. No ranking, recommendation, scheduling availability or wave execution is invented.
- Review freshness means the explicitly reviewed aggregate version and explicit deadline. It does not describe external business freshness. Lifecycle changes can make a review stale.
- The existing read-only preview boundary is preserved: all nine Plan operations remain held503 under `CAPIRO_PREVIEW_READ_ONLY`. No preview allowlist, legacy generated map, HTTP error projection, session owner, lockfile, gateway/origin, Docker or AWS change is included. Generic409 requires a current read.
- Desktop fixture checks do not qualify native SQL/RLS/grants/concurrency, real Clerk, live APIs, Linux, images, scans or deployment. Mobile and Meri/Fable remain outside this increment.

## Design and source review

Actual Figma context and screenshots were read for file `Zc2dEN5aLU47dVdsewDmiJ`, Objective `411:61442` and Plan `411:95121`. Existing shell/components remain canonical. The new15×15 Objective back asset is an unchanged Figma export; prototype policy values are replaced with authorized facts or explicit gaps. The desktop target is1440×1040.

Independent scoped source reviews found and closed six Plan receiving/recovery defects before qualification: exact CAS acknowledgements, wave field echoes, cursor restart, modal read-back recovery, review consistency and selected-plan command ownership. Objective review accepted exact contract/page/navigation boundaries. `STRUCTURE-REVIEW.md` records function-specific cohesion decisions; scanner policy and transferred baselines are unchanged.

## Verification status

At checkpointbd13 the complete affected receiving/render suite passed50/50 in five files, including18 Plan receiving cases,24 Objective contract/receipt/type cases and8 current-navigation rendered cases. After the bounded React lint correction, the18 affected Plan cases passed again. The complete canonical browser inventory passed18/18 atbd13:6 Objective page,6 current-resource receiving and6 manual Plan scenarios, with one worker and zero retries/skips/flaky/errors. Actual runtime was Windows/Node24.19.0/Chrome155.0.8059.40. All38 authored app inputs were unchanged through that run and owned local harness cleanup was confirmed.

The later scope-label source correction adds three distinct rendered cases, all passed, bringing the affected unit/render inventory to53 unique cases. Its three changed source/test paths passed lint and formatting, and independent source review accepted the unchanged query/permission boundary. The six affected Plan browser cases, including the new native selector assertions, remain pending adequate capacity and the serialized Shipping slot. The earlier18-case raw receipt remains bound tobd13; it is not a whole-source browser qualification of this successor.

Default build/full final typing remains held: fresh available virtual commitment after browser cleanup was5,602,320,384bytes, below the proposed6144MiB heap before native/parent margin. Shipping has not released a separate build slot. No default build was attempted at that capacity. Exact local receipts are recorded with the external source handoff. Earlier development failures remain retained: the first typecheck found receiving import/narrowing issues that were corrected; one loading test had a wrong label/setup; subsequent cold-bundle controls and an initial combined harness startup met host resource pressure. A pre-case allocator failure establishes zero executed cases, not product success or failure. No incomplete report is carried as a complete qualification result.
