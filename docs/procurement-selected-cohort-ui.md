# Selected procurement award consumer

This next-cut frontend consumes Core PR382's `defproc-scoped-money-flow/v1` through the existing authenticated fixed-operation gateway. It adds no page, ingestion pipeline, database access, model loop or client-to-award inference.

## User flow

Open Intelligence → Research → Acquisitions. Select up to 25 full USAspending award records using their checkboxes. Notices are not selectable. Search and pagination retain the explicitly selected full keys; review, remove or clear them in the selection panel. Keys with the same PIID but different agencies or parent awards stay distinct. There is no implicit descendant expansion or free-text PIID lookup.

Money Flow below the existing acquisition list reads the selected cohort. It shows exact signed obligations, NULL outlays as “Not reported”, selected action counts, coverage, fiscal year/undated groups, source-reported UEI versus unresolved award-specific identity, actual source and catalog clocks, and qualification provenance. Empty qualified populations show unavailable totals rather than zero. Nonempty output remains partial observed actions, not complete award values or federal spending. No unqualified financial amounts are displayed. Group detail is paged in batches of 20; all admitted groups remain reachable.

“Open this snapshot in Hub” carries the exact full keys, returned knowledge timestamp and optional source cutoff into the separate procurement summary below Hub's existing seven module cards. Its reverse link opens the same Money Flow snapshot. Refresh preserves an explicitly pinned snapshot; “Use latest observations” removes the pin. Client profile selection remains a navigation hint and does not change the public federal award scope. No procurement request runs without a valid explicit cohort.

## Ownership and failure behavior

Core owns identity, qualification and authorization. The versioned public `@capiro/shared` archive provides the canonical DTO; `vendor/procurement-public-package.json` records the Core source and exact additive archive composition. `node scripts/procurement-public-package.mjs` verifies active dependency/lock/integrity, canonical source/declarations and preservation of all prior members. No frontend DTO copy is authored.

The operations module owns strict runtime boundary validation; the existing registry, gateway and `useCapiroQuery` own transport, trusted session scope, request cancellation and response replacement. UI response admission additionally checks exact award membership and pinned knowledge/source clocks. A failure, loading replacement, malformed payload or mismatched scope hides prior totals and provenance. Normal 401/403 access outcomes remain explicit; no operator connection or legacy/global-money fallback exists. Existing preview policy is not widened to permit these POST reads.

The selection hook serializes navigation changes with a transition and immediate guard, preventing rapid clicks from overwriting a prior pending selection. Acquisitions search, detail, paging and its Money Flow panel share the same navigation owner; Hub's client selector and procurement panel also share one owner. Pending navigation disables competing controls. The UI never persists a private authorization context. Public full keys and snapshot clocks travel in URL parameters only.

Shared paths: ModuleHub mounts the separate procurement component and shares its guarded URL navigation with the client selector; all seven-card metric implementation files are unchanged. AcquisitionRecords adds selection and the new result panel; existing search/detail/paging remain. ResearchPages accepts an optional disabled state while navigation is pending; other callers retain their default. Registry adds only two fixed read operations. No replaced old procurement consumer existed, so there is no old path to retire.

## Validation and remaining acceptance

Focused tests cover canonical request/response boundaries, exact large signed fractions, NULL versus zero, unavailable/partial results, full-key separation, scope/snapshot navigation, refresh/loading suppression, access failures, malformed output, original source link safety, and pending selection changes. Separate tests exercise the actual HTTP adapter with synthetic responses and prove late responses are refused after request/session cancellation. React rendering tests use a mocked query hook and synchronous transition adapter; they are not browser navigation or visual acceptance.

The 400-line/80-line rules are review triggers. AcquisitionRecords and ProcurementReadPanel remain cohesive existing-list/result composition; selection, transport, validation, exact formatting and result presentation are separate owners. Independent review must assess responsibility rather than mechanically splitting JSX. Contract fixture tests retain their safety cases.

No browser, product build, DB, provider, migration, population or cloud operation was performed by this frontend source task. Sole FE merger owns main; Release owns required production gates/deployment and visual/keyboard/mobile checks. Genuine Hermes via Root owns native SQL qualification, migration ordering/application and population. Hermes assigned Core382's forward migration identity `20281101170000_defproc_scoped_money_flow`; the separately reviewed rename commit5802927d preserves its SQL payload and canonical frontend contract unchanged.

Before feature acceptance, verify the real serving frontend and Core image, same-cohort qualified population, ordinary authenticated access, General/client navigation, denied/revoked access, stale refresh, source/knowledge clocks, exact group conservation, NULL outlays and provenance. Test browser rapid selection, back/forward, snapshot links, keyboard/table paging and narrow layout. A source or package check cannot establish live financial results or feature completion.
