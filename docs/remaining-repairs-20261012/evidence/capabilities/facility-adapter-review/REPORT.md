# Independent facility test adapter review

**Accepted for source/test preservation; no findings.** Commit `83874fb2bbc0769a232d9890beccbe764863a1ef` changes only `apps/web/tests/browser/portfolio.spec.ts`. Final file SHA256 is `32d5f42b6207ab3d2752e4623ab40e3ea43531f05b5d45feefa9e8a7247bd730`.

Independent AST inspection confirms all **31 original assertion expressions remain exactly in order**, with two added assertions (33 total). All five test names survive. The four unrelated test statements and the facility endpoint/payload handler are byte-identical to frozen `adbc84b`; its prior test file also equals the7aca86e baseline. No timeout, retry, skip, error, payload or unexpected-request check was weakened.

The old failed lookup scopes Facility name to a removed Add facility dialog. The preserved failure instead shows the approved Facilities: Test Aerospace manager, native state selector, Save facility and Done controls. The adapter selects that exact client manager and TX option, retaining the original TX payload assertion. Explicit lowercase-state normalization remains covered by the unchanged `facility-map.test.ts` case.

The manager intentionally remains open after a confirmed save. Before clicking Done, the revised test independently requires the inline editor to disappear and Test lab to appear in Saved facilities. It then retains both original checks: manager closure and visible Test lab on the profile/map list. Done cannot conceal a failed save without those new assertions failing. Six relevant production facility sources and the normalization unit file exactly match frozen qualification source.

The prospective composition of frozenadbc84b plus this one test blob has **27 changed TS/TSX test/fixture sources**, or **28 changed paths including the HTML harness**, relative to7aca86e. It retains **12 size signals**. The changed Portfolio file is218 nonblank lines and adds no file/function size signal. Its existing smoke-test ownership remains cohesive.

The original failure is preserved here as `original-error-context.md`, SHA256 `76f136d7b766cd09c3702eccb4354d84f746f30f539c8907338c8c08708f8c04`. Raw independent results, before/after source, owner diff and owner packet copies are included. No original evidence was changed.

This is read-only source acceptance, not a candidate runtime pass. No tests, browser, typecheck, build, install, source/index or registry changes occurred. Root owns integration and exact-source successor qualification; the separate copy-case correction is outside this review.
